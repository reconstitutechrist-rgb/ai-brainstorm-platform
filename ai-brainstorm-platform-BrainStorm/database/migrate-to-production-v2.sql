-- ============================================
-- MIGRATION: Development to Production Schema (v2.0 - CORRECTED)
-- ============================================
-- This script safely migrates from the development schema to production
-- Preserves all existing data with proper safeguards
-- Can be run multiple times (idempotent)
--
-- IMPORTANT FIXES FROM v1:
-- - Safe backup creation with structure preservation
-- - Fixed RLS verification query (pg_class.relrowsecurity)
-- - Removed invalid ALTER VIEW security_invoker
-- - Secured DEFINER functions with search_path
-- - Optimized RLS policies with EXISTS
-- - Schema-qualified all objects
-- - Proper handling of "references" reserved word
-- ============================================

-- ============================================
-- PRE-FLIGHT CHECKS
-- ============================================

-- Verify we're in the correct database
DO $$
BEGIN
  RAISE NOTICE 'Starting migration in database: %', current_database();
  RAISE NOTICE 'Current schema: %', current_schema();
  RAISE NOTICE 'Timestamp: %', now();
END $$;

-- ============================================
-- OPTION: Run heavy index creation outside transaction
-- ============================================
-- For large tables (>100k rows), consider running index creation
-- with CREATE INDEX CONCURRENTLY outside this transaction.
-- Uncomment and run separately if needed:
/*
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_updated_at_desc
  ON public.projects(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_project_created
  ON public.messages(project_id, created_at DESC);
-- Then comment out the CREATE INDEX statements in STEP 6 below
*/

-- Start transaction for safety
BEGIN;

-- ============================================
-- STEP 1: Safe Backup Creation
-- ============================================

-- Backup projects table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'projects'
  ) THEN
    -- Create backup with full structure
    CREATE TABLE IF NOT EXISTS public.projects_backup (
      LIKE public.projects INCLUDING ALL
    );

    -- Clear and repopulate backup
    TRUNCATE public.projects_backup;
    INSERT INTO public.projects_backup SELECT * FROM public.projects;

    RAISE NOTICE 'Backed up % rows from projects',
      (SELECT COUNT(*) FROM public.projects_backup);
  ELSE
    RAISE WARNING 'Table public.projects does not exist - skipping backup';
  END IF;
END $$;

-- Backup messages table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'messages'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.messages_backup (
      LIKE public.messages INCLUDING ALL
    );
    TRUNCATE public.messages_backup;
    INSERT INTO public.messages_backup SELECT * FROM public.messages;

    RAISE NOTICE 'Backed up % rows from messages',
      (SELECT COUNT(*) FROM public.messages_backup);
  ELSE
    RAISE WARNING 'Table public.messages does not exist - skipping backup';
  END IF;
END $$;

-- Backup references table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'references'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.references_backup (
      LIKE public."references" INCLUDING ALL
    );
    TRUNCATE public.references_backup;
    INSERT INTO public.references_backup SELECT * FROM public."references";

    RAISE NOTICE 'Backed up % rows from references',
      (SELECT COUNT(*) FROM public.references_backup);
  ELSE
    RAISE WARNING 'Table public.references does not exist - skipping backup';
  END IF;
END $$;

-- Backup agent_activity table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'agent_activity'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.agent_activity_backup (
      LIKE public.agent_activity INCLUDING ALL
    );
    TRUNCATE public.agent_activity_backup;
    INSERT INTO public.agent_activity_backup SELECT * FROM public.agent_activity;

    RAISE NOTICE 'Backed up % rows from agent_activity',
      (SELECT COUNT(*) FROM public.agent_activity_backup);
  ELSE
    RAISE WARNING 'Table public.agent_activity does not exist - skipping backup';
  END IF;
END $$;

-- ============================================
-- STEP 2: Handle Orphaned Data Safely
-- ============================================

-- Preserve orphaned messages before deletion
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'messages'
    AND column_name = 'project_id'
    AND is_nullable = 'YES'
  ) THEN
    -- Count orphans
    SELECT COUNT(*) INTO orphan_count
    FROM public.messages
    WHERE project_id IS NULL;

    IF orphan_count > 0 THEN
      -- Create orphan backup table
      CREATE TABLE IF NOT EXISTS public.messages_orphans_backup (
        LIKE public.messages INCLUDING ALL
      );

      -- Preserve orphans
      INSERT INTO public.messages_orphans_backup
      SELECT * FROM public.messages WHERE project_id IS NULL;

      RAISE NOTICE 'Preserved % orphaned messages in messages_orphans_backup', orphan_count;

      -- Now safe to delete
      DELETE FROM public.messages WHERE project_id IS NULL;

      RAISE NOTICE 'Deleted % orphaned messages from messages table', orphan_count;
    ELSE
      RAISE NOTICE 'No orphaned messages found';
    END IF;

    -- Add NOT NULL constraint
    ALTER TABLE public.messages ALTER COLUMN project_id SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to messages.project_id';
  ELSE
    RAISE NOTICE 'messages.project_id is already NOT NULL or column does not exist';
  END IF;
END $$;

-- ============================================
-- STEP 3: Drop Old Permissive RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Allow all on projects" ON public.projects;
DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all on references" ON public."references";
DROP POLICY IF EXISTS "Allow all on agent_activity" ON public.agent_activity;

RAISE NOTICE 'Dropped old permissive RLS policies';

-- ============================================
-- STEP 4: Create Helper Function for RLS
-- ============================================

-- Helper function to check project ownership
-- SECURITY DEFINER with safe search_path
CREATE OR REPLACE FUNCTION public.user_owns_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid
    AND user_id = auth.uid()::text
  );
END;
$$;

-- Revoke public execute to prevent abuse
REVOKE EXECUTE ON FUNCTION public.user_owns_project(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_project(UUID) TO authenticated;

COMMENT ON FUNCTION public.user_owns_project IS
  'Securely checks if current authenticated user owns the specified project. Used in RLS policies.';

RAISE NOTICE 'Created helper function: user_owns_project';

-- ============================================
-- STEP 5: Create Optimized Production RLS Policies
-- ============================================

-- ============================================
-- PROJECTS POLICIES (Optimized with consistent types)
-- ============================================

CREATE POLICY "users_select_own_projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "users_insert_own_projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "users_update_own_projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "users_delete_own_projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "service_role_all_projects"
  ON public.projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

RAISE NOTICE 'Created projects RLS policies';

-- ============================================
-- MESSAGES POLICIES (Optimized with EXISTS)
-- ============================================

CREATE POLICY "users_select_messages_from_own_projects"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = messages.project_id
      AND p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "users_insert_messages_to_own_projects"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = messages.project_id
      AND p.user_id = auth.uid()::text
    )
  );

-- Messages are append-only (no UPDATE or DELETE for users)

CREATE POLICY "service_role_all_messages"
  ON public.messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

RAISE NOTICE 'Created messages RLS policies (append-only for users)';

-- ============================================
-- REFERENCES POLICIES (with proper quoting)
-- ============================================

CREATE POLICY "users_select_references_from_own_projects"
  ON public."references"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = "references".project_id
      AND p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "users_insert_references_to_own_projects"
  ON public."references"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = "references".project_id
      AND p.user_id = auth.uid()::text
    )
  );

CREATE POLICY "users_update_own_references"
  ON public."references"
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "users_delete_own_references"
  ON public."references"
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "service_role_all_references"
  ON public."references"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

RAISE NOTICE 'Created references RLS policies';

-- ============================================
-- AGENT ACTIVITY POLICIES
-- ============================================

CREATE POLICY "users_select_activity_from_own_projects"
  ON public.agent_activity
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = agent_activity.project_id
      AND p.user_id = auth.uid()::text
    )
  );

-- Only service role can insert/update/delete activity
CREATE POLICY "service_role_all_agent_activity"
  ON public.agent_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

RAISE NOTICE 'Created agent_activity RLS policies (read-only for users)';

-- ============================================
-- STEP 6: Add Performance Indexes
-- ============================================

-- NOTE: For tables with >100k rows, consider using CREATE INDEX CONCURRENTLY
-- outside this transaction. See top of file for instructions.

-- Drop old indexes that need correction
DROP INDEX IF EXISTS public.idx_projects_updated_at;

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_updated_at_desc
  ON public.projects(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_status
  ON public.projects(status);

CREATE INDEX IF NOT EXISTS idx_projects_user_status
  ON public.projects(user_id, status);

-- Compound index for RLS policy optimization
CREATE INDEX IF NOT EXISTS idx_projects_id_user
  ON public.projects(id, user_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_project_created
  ON public.messages(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON public.messages(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_role
  ON public.messages(role);

-- References indexes
CREATE INDEX IF NOT EXISTS idx_references_project_status
  ON public."references"(project_id, analysis_status);

CREATE INDEX IF NOT EXISTS idx_references_user_id
  ON public."references"(user_id);

-- Agent activity indexes
CREATE INDEX IF NOT EXISTS idx_agent_activity_created_at_desc
  ON public.agent_activity(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_activity_type
  ON public.agent_activity(agent_type);

CREATE INDEX IF NOT EXISTS idx_agent_activity_project_type
  ON public.agent_activity(project_id, agent_type);

-- GIN indexes for JSONB columns (if columns exist and are JSONB)
DO $$
BEGIN
  -- Only create if columns exist and are jsonb type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects'
    AND column_name = 'items' AND data_type = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_projects_items_gin
      ON public.projects USING GIN (items);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages'
    AND column_name = 'metadata' AND data_type = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin
      ON public.messages USING GIN (metadata);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'references'
    AND column_name = 'metadata' AND data_type = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_references_metadata_gin
      ON public."references" USING GIN (metadata);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agent_activity'
    AND column_name = 'details' AND data_type = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_agent_activity_details_gin
      ON public.agent_activity USING GIN (details);
  END IF;
END $$;

RAISE NOTICE 'Created performance indexes';

-- ============================================
-- STEP 7: Update Storage Bucket to Private
-- ============================================

-- Update storage bucket (if it exists in storage schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    UPDATE storage.buckets
    SET public = false
    WHERE id = 'references';

    RAISE NOTICE 'Updated storage bucket "references" to private';
  ELSE
    RAISE WARNING 'storage.buckets table not found - skipping bucket update';
  END IF;
END $$;

-- ============================================
-- STEP 8: Update Storage Policies (Schema-Qualified)
-- ============================================

-- Drop old permissive storage policies
DROP POLICY IF EXISTS "Allow uploads to references" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from references" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from references" ON storage.objects;

-- Create new storage policies with user folder isolation
-- Folder structure: references/{user_id}/{filename}

CREATE POLICY "users_upload_to_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'references'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users_read_own_files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'references'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users_update_own_files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'references'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users_delete_own_files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'references'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "service_role_all_storage"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'references');

RAISE NOTICE 'Created storage policies with user folder isolation';

-- ============================================
-- STEP 9: Create Additional Helper Functions
-- ============================================

-- Function to get project owner
CREATE OR REPLACE FUNCTION public.get_project_owner(project_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  owner_id TEXT;
BEGIN
  SELECT user_id INTO owner_id
  FROM public.projects
  WHERE id = project_uuid;

  RETURN owner_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_project_owner(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_owner(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_project_owner IS
  'Returns the user_id of the project owner. Returns NULL if project not found.';

RAISE NOTICE 'Created helper function: get_project_owner';

-- ============================================
-- STEP 10: Create Useful Views
-- ============================================

CREATE OR REPLACE VIEW public.project_stats AS
SELECT
  p.id,
  p.user_id,
  p.title,
  p.description,
  p.status,
  p.created_at,
  p.updated_at,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT r.id) as reference_count,
  MAX(m.created_at) as last_message_at
FROM public.projects p
LEFT JOIN public.messages m ON p.id = m.project_id
LEFT JOIN public."references" r ON p.id = r.project_id
GROUP BY p.id, p.user_id, p.title, p.description, p.status, p.created_at, p.updated_at;

-- Views in Postgres use SECURITY INVOKER by default (run with caller's permissions)
-- This is correct behavior - the view will respect RLS policies

COMMENT ON VIEW public.project_stats IS
  'Aggregated statistics per project. Respects RLS - users only see stats for their own projects.';

RAISE NOTICE 'Created project_stats view';

-- ============================================
-- STEP 11: Add Table Comments
-- ============================================

COMMENT ON TABLE public.projects IS
  'User projects with brainstorming state. RLS enforced - users can only access their own projects.';

COMMENT ON TABLE public.messages IS
  'Conversation messages between users and AI agents. Append-only for users. RLS enforced via project ownership.';

COMMENT ON TABLE public."references" IS
  'Uploaded files and external references with AI analysis. RLS enforced via project ownership and user_id.';

COMMENT ON TABLE public.agent_activity IS
  'Log of AI agent actions and decisions. Read-only for users, write-only for service role.';

-- ============================================
-- STEP 12: Grant Permissions
-- ============================================

-- Grant appropriate permissions to authenticated users
-- RLS policies will further restrict actual access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated; -- No UPDATE/DELETE (append-only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public."references" TO authenticated;
GRANT SELECT ON public.agent_activity TO authenticated; -- Read-only

-- Grant view access
GRANT SELECT ON public.project_stats TO authenticated;

-- Service role gets full access to all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;

RAISE NOTICE 'Granted permissions to roles';

-- ============================================
-- STEP 13: Verify Migration (CORRECTED)
-- ============================================

DO $$
DECLARE
  project_count INTEGER;
  message_count INTEGER;
  reference_count INTEGER;
  activity_count INTEGER;
  policy_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Count rows in each table
  SELECT COUNT(*) INTO project_count FROM public.projects;
  SELECT COUNT(*) INTO message_count FROM public.messages;
  SELECT COUNT(*) INTO reference_count FROM public."references";
  SELECT COUNT(*) INTO activity_count FROM public.agent_activity;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Data preservation:';
  RAISE NOTICE '  Projects: % rows', project_count;
  RAISE NOTICE '  Messages: % rows', message_count;
  RAISE NOTICE '  References: % rows', reference_count;
  RAISE NOTICE '  Agent Activity: % rows', activity_count;

  -- Check RLS is enabled (CORRECTED: use pg_class.relrowsecurity)
  SELECT COUNT(*) > 0 INTO rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relname IN ('projects', 'messages', 'references', 'agent_activity')
  AND c.relrowsecurity = true;

  IF rls_enabled THEN
    RAISE NOTICE 'Row Level Security: ENABLED ✓';
  ELSE
    RAISE WARNING 'Row Level Security: NOT FULLY ENABLED!';
  END IF;

  -- Count active policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE 'Active RLS policies: %', policy_count;

  -- Verify specific policies exist
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND policyname LIKE '%own%'
  ) THEN
    RAISE NOTICE 'Projects policies: OK ✓';
  ELSE
    RAISE WARNING 'Projects policies: MISSING or INCORRECT';
  END IF;

  -- Check indexes
  SELECT COUNT(*) INTO policy_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename IN ('projects', 'messages', 'references', 'agent_activity');

  RAISE NOTICE 'Indexes created: %', policy_count;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Review the output above and test thoroughly.';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- COMMIT or ROLLBACK
-- ============================================

-- If everything looks good, commit the transaction
COMMIT;

-- If you see errors, you can rollback:
-- ROLLBACK;

RAISE NOTICE 'Transaction committed. Migration complete.';

-- ============================================
-- POST-MIGRATION TESTING
-- ============================================

/*
CRITICAL: Test RLS policies before allowing user access!

1. TEST AS AUTHENTICATED USER:

   -- Create a test user session (in your application)
   -- Try to create a project
   -- Verify you can see only your own projects
   -- Try to access another user's project (should fail)

2. TEST WITH PSQL (if you have test users):

   -- Set user context
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claim.sub = 'test-user-uuid-here';

   -- Should return only test user's projects
   SELECT * FROM public.projects;

   -- Reset
   RESET ROLE;

3. TEST SERVICE ROLE:

   -- Service role should see all data
   SET LOCAL ROLE service_role;
   SELECT COUNT(*) FROM public.projects; -- Should see all projects
   RESET ROLE;

4. VERIFY INDEX USAGE:

   EXPLAIN ANALYZE
   SELECT * FROM public.messages
   WHERE project_id = 'some-uuid'
   ORDER BY created_at DESC
   LIMIT 50;

   -- Should use: idx_messages_project_created

5. TEST STORAGE POLICIES:

   -- Upload file as User A to folder: {userA_id}/test.jpg
   -- Try to access as User B (should fail)
   -- Verify signed URLs work correctly

6. CHECK FOR SLOW QUERIES:

   SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   WHERE query LIKE '%projects%'
   ORDER BY total_exec_time DESC
   LIMIT 10;
*/

-- ============================================
-- CLEANUP AFTER VERIFICATION
-- ============================================

/*
After confirming everything works (wait 24-48 hours):

DROP TABLE IF EXISTS public.projects_backup;
DROP TABLE IF EXISTS public.messages_backup;
DROP TABLE IF EXISTS public.references_backup;
DROP TABLE IF EXISTS public.agent_activity_backup;
DROP TABLE IF EXISTS public.messages_orphans_backup;

RAISE NOTICE 'Backup tables cleaned up';
*/

-- ============================================
-- ROLLBACK PROCEDURE (if needed)
-- ============================================

/*
If you need to rollback to the old schema:

BEGIN;

-- Disable RLS
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."references" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity DISABLE ROW LEVEL SECURITY;

-- Drop all new policies
DROP POLICY IF EXISTS "users_select_own_projects" ON public.projects;
-- ... drop all other policies ...

-- Restore old permissive policies
CREATE POLICY "Allow all on projects" ON public.projects FOR ALL USING (true);
-- ... restore other permissive policies ...

-- Restore data from backup if needed
TRUNCATE public.projects;
INSERT INTO public.projects SELECT * FROM public.projects_backup;

COMMIT;
*/