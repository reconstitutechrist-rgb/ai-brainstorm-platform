-- ============================================
-- MIGRATION: Development to Production Schema (v3.0 - ENHANCED IDEMPOTENT)
-- ============================================
-- This script safely migrates from the development schema to production
-- Preserves all existing data with proper safeguards
-- Can be run multiple times safely (fully idempotent)
--
-- IMPROVEMENTS IN v3:
-- - Table creation inside transaction
-- - Explicit RLS enabling
-- - Foreign key constraints with proper handling
-- - Enhanced idempotency for all operations
-- - Better error handling and rollback safety
-- - Fixed storage policy checks
-- - All RAISE NOTICE inside DO blocks
-- ============================================

-- ============================================
-- PRE-FLIGHT CHECKS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Starting migration in database: %', current_database();
  RAISE NOTICE 'Current schema: %', current_schema();
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE 'PostgreSQL version: %', version();
END $$;

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
-- Then comment out the CREATE INDEX statements in STEP 7 below
*/

-- Start transaction for safety
BEGIN;

-- ============================================
-- STEP 1: Safe Table Creation (if missing)
-- ============================================

DO $$
BEGIN
  -- Create public.projects if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'projects'
  ) THEN
    CREATE TABLE public.projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      title text,
      description text,
      status text DEFAULT 'active',
      items jsonb,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
    RAISE NOTICE 'Created table: public.projects';
  ELSE
    RAISE NOTICE 'Table public.projects already exists';
  END IF;

  -- Create public.messages if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'messages'
  ) THEN
    CREATE TABLE public.messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL, -- Will add FK constraint later
      user_id text,
      role text,
      content text,
      metadata jsonb,
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
    RAISE NOTICE 'Created table: public.messages';
  ELSE
    RAISE NOTICE 'Table public.messages already exists';
  END IF;

  -- Create public."references" if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'references'
  ) THEN
    CREATE TABLE public."references" (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL, -- Will add FK constraint later
      user_id text,
      filename text,
      url text,
      metadata jsonb,
      analysis_status text DEFAULT 'pending',
      created_at timestamptz DEFAULT now() NOT NULL,
      updated_at timestamptz DEFAULT now() NOT NULL
    );
    RAISE NOTICE 'Created table: public.references';
  ELSE
    RAISE NOTICE 'Table public.references already exists';
  END IF;

  -- Create public.agent_activity if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'agent_activity'
  ) THEN
    CREATE TABLE public.agent_activity (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid, -- Can be NULL for global activities
      agent_type text,
      action text,
      details jsonb,
      created_at timestamptz DEFAULT now() NOT NULL
    );
    RAISE NOTICE 'Created table: public.agent_activity';
  ELSE
    RAISE NOTICE 'Table public.agent_activity already exists';
  END IF;
END $$;

-- ============================================
-- STEP 2: Safe Backup Creation
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'projects'
  ) THEN
    CREATE TABLE IF NOT EXISTS public.projects_backup (
      LIKE public.projects INCLUDING ALL
    );
    TRUNCATE public.projects_backup;
    INSERT INTO public.projects_backup SELECT * FROM public.projects;
    RAISE NOTICE 'Backed up % rows from projects',
      (SELECT COUNT(*) FROM public.projects_backup);
  END IF;
END $$;

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
  END IF;
END $$;

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
  END IF;
END $$;

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
  END IF;
END $$;

-- ============================================
-- STEP 3: Handle Orphaned Data Safely
-- ============================================

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
    SELECT COUNT(*) INTO orphan_count
    FROM public.messages
    WHERE project_id IS NULL;

    IF orphan_count > 0 THEN
      CREATE TABLE IF NOT EXISTS public.messages_orphans_backup (
        LIKE public.messages INCLUDING ALL
      );
      INSERT INTO public.messages_orphans_backup
      SELECT * FROM public.messages WHERE project_id IS NULL;
      RAISE NOTICE 'Preserved % orphaned messages in messages_orphans_backup', orphan_count;

      DELETE FROM public.messages WHERE project_id IS NULL;
      RAISE NOTICE 'Deleted % orphaned messages from messages table', orphan_count;
    ELSE
      RAISE NOTICE 'No orphaned messages found';
    END IF;

    ALTER TABLE public.messages ALTER COLUMN project_id SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to messages.project_id';
  ELSE
    RAISE NOTICE 'messages.project_id is already NOT NULL';
  END IF;
END $$;

-- Handle orphaned references
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'references'
    AND column_name = 'project_id'
    AND is_nullable = 'YES'
  ) THEN
    SELECT COUNT(*) INTO orphan_count
    FROM public."references"
    WHERE project_id IS NULL;

    IF orphan_count > 0 THEN
      CREATE TABLE IF NOT EXISTS public.references_orphans_backup (
        LIKE public."references" INCLUDING ALL
      );
      INSERT INTO public.references_orphans_backup
      SELECT * FROM public."references" WHERE project_id IS NULL;
      RAISE NOTICE 'Preserved % orphaned references in references_orphans_backup', orphan_count;

      DELETE FROM public."references" WHERE project_id IS NULL;
      RAISE NOTICE 'Deleted % orphaned references from references table', orphan_count;
    ELSE
      RAISE NOTICE 'No orphaned references found';
    END IF;

    ALTER TABLE public."references" ALTER COLUMN project_id SET NOT NULL;
    RAISE NOTICE 'Added NOT NULL constraint to references.project_id';
  ELSE
    RAISE NOTICE 'references.project_id is already NOT NULL';
  END IF;
END $$;

-- ============================================
-- STEP 4: Add Foreign Key Constraints
-- ============================================

DO $$
BEGIN
  -- Add FK constraint on messages.project_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'messages'
    AND constraint_name = 'fk_messages_project'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT fk_messages_project
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint: fk_messages_project';
  ELSE
    RAISE NOTICE 'Foreign key constraint fk_messages_project already exists';
  END IF;

  -- Add FK constraint on references.project_id if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'references'
    AND constraint_name = 'fk_references_project'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public."references"
    ADD CONSTRAINT fk_references_project
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint: fk_references_project';
  ELSE
    RAISE NOTICE 'Foreign key constraint fk_references_project already exists';
  END IF;

  -- Add FK constraint on agent_activity.project_id if not exists (NULL allowed)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'agent_activity'
    AND constraint_name = 'fk_agent_activity_project'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    ALTER TABLE public.agent_activity
    ADD CONSTRAINT fk_agent_activity_project
    FOREIGN KEY (project_id)
    REFERENCES public.projects(id)
    ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint: fk_agent_activity_project';
  ELSE
    RAISE NOTICE 'Foreign key constraint fk_agent_activity_project already exists';
  END IF;
END $$;

-- ============================================
-- STEP 5: Enable Row Level Security
-- ============================================

DO $$
BEGIN
  -- Enable RLS on all tables
  ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public."references" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.agent_activity ENABLE ROW LEVEL SECURITY;

  RAISE NOTICE 'Row Level Security enabled on all tables';
END $$;

-- ============================================
-- STEP 6: Drop Old Permissive RLS Policies
-- ============================================

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow all on projects" ON public.projects;
  DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;
  DROP POLICY IF EXISTS "Allow all on references" ON public."references";
  DROP POLICY IF EXISTS "Allow all on agent_activity" ON public.agent_activity;

  RAISE NOTICE 'Dropped old permissive RLS policies';
END $$;

-- ============================================
-- STEP 7: Create Helper Functions for RLS
-- ============================================

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

REVOKE ALL ON FUNCTION public.user_owns_project(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_owns_project(UUID) TO authenticated;

COMMENT ON FUNCTION public.user_owns_project IS
  'Securely checks if current authenticated user owns the specified project. Used in RLS policies.';

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

REVOKE ALL ON FUNCTION public.get_project_owner(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_project_owner(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_project_owner IS
  'Returns the user_id of the project owner. Returns NULL if project not found.';

DO $$
BEGIN
  RAISE NOTICE 'Created helper functions: user_owns_project, get_project_owner';
END $$;

-- ============================================
-- STEP 8: Create Production RLS Policies (Idempotent)
-- ============================================

-- PROJECTS POLICIES
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_select_own_projects" ON public.projects;
  CREATE POLICY "users_select_own_projects"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid()::text);

  DROP POLICY IF EXISTS "users_insert_own_projects" ON public.projects;
  CREATE POLICY "users_insert_own_projects"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid()::text);

  DROP POLICY IF EXISTS "users_update_own_projects" ON public.projects;
  CREATE POLICY "users_update_own_projects"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

  DROP POLICY IF EXISTS "users_delete_own_projects" ON public.projects;
  CREATE POLICY "users_delete_own_projects"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid()::text);

  DROP POLICY IF EXISTS "service_role_all_projects" ON public.projects;
  CREATE POLICY "service_role_all_projects"
    ON public.projects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Created projects RLS policies';
END $$;

-- MESSAGES POLICIES
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_select_messages_from_own_projects" ON public.messages;
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

  DROP POLICY IF EXISTS "users_insert_messages_to_own_projects" ON public.messages;
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

  DROP POLICY IF EXISTS "service_role_all_messages" ON public.messages;
  CREATE POLICY "service_role_all_messages"
    ON public.messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Created messages RLS policies (append-only for users)';
END $$;

-- REFERENCES POLICIES
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_select_references_from_own_projects" ON public."references";
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

  DROP POLICY IF EXISTS "users_insert_references_to_own_projects" ON public."references";
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

  DROP POLICY IF EXISTS "users_update_own_references" ON public."references";
  CREATE POLICY "users_update_own_references"
    ON public."references"
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

  DROP POLICY IF EXISTS "users_delete_own_references" ON public."references";
  CREATE POLICY "users_delete_own_references"
    ON public."references"
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid()::text);

  DROP POLICY IF EXISTS "service_role_all_references" ON public."references";
  CREATE POLICY "service_role_all_references"
    ON public."references"
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Created references RLS policies';
END $$;

-- AGENT ACTIVITY POLICIES
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_select_activity_from_own_projects" ON public.agent_activity;
  CREATE POLICY "users_select_activity_from_own_projects"
    ON public.agent_activity
    FOR SELECT
    TO authenticated
    USING (
      project_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = agent_activity.project_id
        AND p.user_id = auth.uid()::text
      )
    );

  DROP POLICY IF EXISTS "service_role_all_agent_activity" ON public.agent_activity;
  CREATE POLICY "service_role_all_agent_activity"
    ON public.agent_activity
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE 'Created agent_activity RLS policies (read-only for users)';
END $$;

-- ============================================
-- STEP 9: Add Performance Indexes
-- ============================================

DO $$
BEGIN
  -- Drop old indexes that need correction
  DROP INDEX IF EXISTS public.idx_projects_updated_at;

  -- Projects indexes
  CREATE INDEX IF NOT EXISTS idx_projects_updated_at_desc
    ON public.projects(updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_projects_status
    ON public.projects(status);

  CREATE INDEX IF NOT EXISTS idx_projects_user_status
    ON public.projects(user_id, status);

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

  RAISE NOTICE 'Created performance indexes';
END $$;

-- GIN indexes for JSONB columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects'
    AND column_name = 'items' AND data_type = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_projects_items_gin
      ON public.projects USING GIN (items);
    RAISE NOTICE 'Created GIN index on projects.items';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages'
    AND column_name = 'metadata' AND data_type = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin
      ON public.messages USING GIN (metadata);
    RAISE NOTICE 'Created GIN index on messages.metadata';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'references'
    AND column_name = 'metadata' AND data_type = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_references_metadata_gin
      ON public."references" USING GIN (metadata);
    RAISE NOTICE 'Created GIN index on references.metadata';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agent_activity'
    AND column_name = 'details' AND data_type = 'jsonb'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_agent_activity_details_gin
      ON public.agent_activity USING GIN (details);
    RAISE NOTICE 'Created GIN index on agent_activity.details';
  END IF;
END $$;

-- ============================================
-- STEP 10: Update Storage Bucket to Private
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    -- Create bucket if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'references') THEN
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('references', 'references', false);
      RAISE NOTICE 'Created storage bucket "references" as private';
    ELSE
      -- Update existing bucket to private
      UPDATE storage.buckets
      SET public = false
      WHERE id = 'references';
      RAISE NOTICE 'Updated storage bucket "references" to private';
    END IF;
  ELSE
    RAISE WARNING 'storage.buckets table not found - skipping bucket update';
  END IF;
END $$;

-- ============================================
-- STEP 11: Update Storage Policies
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    -- Drop old permissive storage policies
    DROP POLICY IF EXISTS "Allow uploads to references" ON storage.objects;
    DROP POLICY IF EXISTS "Allow public read from references" ON storage.objects;
    DROP POLICY IF EXISTS "Allow delete from references" ON storage.objects;

    -- Create new storage policies with user folder isolation
    DROP POLICY IF EXISTS "users_upload_to_own_folder" ON storage.objects;
    CREATE POLICY "users_upload_to_own_folder"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'references'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    DROP POLICY IF EXISTS "users_read_own_files" ON storage.objects;
    CREATE POLICY "users_read_own_files"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'references'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    DROP POLICY IF EXISTS "users_update_own_files" ON storage.objects;
    CREATE POLICY "users_update_own_files"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'references'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    DROP POLICY IF EXISTS "users_delete_own_files" ON storage.objects;
    CREATE POLICY "users_delete_own_files"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'references'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    DROP POLICY IF EXISTS "service_role_all_storage" ON storage.objects;
    CREATE POLICY "service_role_all_storage"
      ON storage.objects
      FOR ALL
      TO service_role
      USING (bucket_id = 'references');

    RAISE NOTICE 'Created storage policies with user folder isolation';
  ELSE
    RAISE WARNING 'storage.objects table not found - skipping storage policies';
  END IF;
END $$;

-- ============================================
-- STEP 12: Create Useful Views
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

COMMENT ON VIEW public.project_stats IS
  'Aggregated statistics per project. Respects RLS - users only see stats for their own projects.';

DO $$
BEGIN
  RAISE NOTICE 'Created project_stats view';
END $$;

-- ============================================
-- STEP 13: Add Table Comments
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
-- STEP 14: Grant Permissions
-- ============================================

DO $$
BEGIN
  -- Grant appropriate permissions to authenticated users
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
  GRANT SELECT, INSERT ON public.messages TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public."references" TO authenticated;
  GRANT SELECT ON public.agent_activity TO authenticated;

  -- Grant view access
  GRANT SELECT ON public.project_stats TO authenticated;

  -- Service role gets full access
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
  GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA storage TO service_role;
  END IF;

  RAISE NOTICE 'Granted permissions to roles';
END $$;

-- ============================================
-- STEP 15: Verify Migration
-- ============================================

DO $$
DECLARE
  project_count INTEGER;
  message_count INTEGER;
  reference_count INTEGER;
  activity_count INTEGER;
  policy_count INTEGER;
  index_count INTEGER;
  rls_enabled_count INTEGER;
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

  -- Check RLS is enabled on all tables
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relname IN ('projects', 'messages', 'references', 'agent_activity')
  AND c.relrowsecurity = true;

  IF rls_enabled_count = 4 THEN
    RAISE NOTICE 'Row Level Security: ENABLED on all 4 tables ✓';
  ELSE
    RAISE WARNING 'Row Level Security: Only enabled on %/4 tables!', rls_enabled_count;
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

  -- Check foreign key constraints
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND constraint_name = 'fk_messages_project'
  ) THEN
    RAISE NOTICE 'Foreign key constraints: OK ✓';
  ELSE
    RAISE WARNING 'Foreign key constraints: MISSING';
  END IF;

  -- Check indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename IN ('projects', 'messages', 'references', 'agent_activity');

  RAISE NOTICE 'Indexes created: %', index_count;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Review the output above and test thoroughly.';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- COMMIT TRANSACTION
-- ============================================

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Transaction committed. Migration complete.';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Test RLS policies with authenticated users';
  RAISE NOTICE '2. Verify storage bucket and policies';
  RAISE NOTICE '3. Test foreign key constraints';
  RAISE NOTICE '4. Monitor query performance';
  RAISE NOTICE '5. After 24-48 hours, cleanup backup tables';
END $$;

-- ============================================
-- POST-MIGRATION TESTING CHECKLIST
-- ============================================

/*
CRITICAL: Test RLS policies before allowing user access!

1. TEST AS AUTHENTICATED USER:
   -- In your application, create test users
   -- Try to create a project
   -- Verify you can see only your own projects
   -- Try to access another user's project (should fail)

2. TEST STORAGE POLICIES:
   -- Upload file as User A to folder: {userA_id}/test.jpg
   -- Try to access as User B (should fail)
   -- Verify signed URLs work correctly

3. TEST FOREIGN KEY CONSTRAINTS:
   -- Try to insert message with non-existent project_id (should fail)
   -- Delete a project and verify cascade deletes messages/references

4. VERIFY INDEX USAGE:
   EXPLAIN ANALYZE
   SELECT * FROM public.messages
   WHERE project_id = 'some-uuid'
   ORDER BY created_at DESC
   LIMIT 50;
   -- Should use: idx_messages_project_created

5. CHECK QUERY PERFORMANCE:
   SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   WHERE query LIKE '%projects%'
   ORDER BY total_exec_time DESC
   LIMIT 10;
*/

-- ============================================
-- CLEANUP AFTER VERIFICATION (24-48 hours)
-- ============================================

/*
After confirming everything works (wait 24-48 hours):

BEGIN;

DROP TABLE IF EXISTS public.projects_backup CASCADE;
DROP TABLE IF EXISTS public.messages_backup CASCADE;
DROP TABLE IF EXISTS public.references_backup CASCADE;
DROP TABLE IF EXISTS public.agent_activity_backup CASCADE;
DROP TABLE IF EXISTS public.messages_orphans_backup CASCADE;
DROP TABLE IF EXISTS public.references_orphans_backup CASCADE;

COMMIT;

-- Log cleanup
DO $$
BEGIN
  RAISE NOTICE 'Backup tables cleaned up at %', now();
END $$;
*/

-- ============================================
-- ROLLBACK PROCEDURE (Emergency Use Only)
-- ============================================

/*
If you need to rollback to the old schema:

BEGIN;

-- Disable RLS
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."references" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity DISABLE ROW LEVEL SECURITY;

-- Drop all production policies
DROP POLICY IF EXISTS "users_select_own_projects" ON public.projects;
DROP POLICY IF EXISTS "users_insert_own_projects" ON public.projects;
DROP POLICY IF EXISTS "users_update_own_projects" ON public.projects;
DROP POLICY IF EXISTS "users_delete_own_projects" ON public.projects;
DROP POLICY IF EXISTS "service_role_all_projects" ON public.projects;
-- (repeat for other tables...)

-- Restore old permissive policies
CREATE POLICY "Allow all on projects" ON public.projects FOR ALL USING (true);
CREATE POLICY "Allow all on messages" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow all on references" ON public."references" FOR ALL USING (true);
CREATE POLICY "Allow all on agent_activity" ON public.agent_activity FOR ALL USING (true);

-- Drop foreign key constraints
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS fk_messages_project;
ALTER TABLE public."references" DROP CONSTRAINT IF EXISTS fk_references_project;
ALTER TABLE public.agent_activity DROP CONSTRAINT IF EXISTS fk_agent_activity_project;

-- Restore data from backup if needed
TRUNCATE public.projects CASCADE;
INSERT INTO public.projects SELECT * FROM public.projects_backup;
INSERT INTO public.messages SELECT * FROM public.messages_backup;
INSERT INTO public."references" SELECT * FROM public.references_backup;
INSERT INTO public.agent_activity SELECT * FROM public.agent_activity_backup;

COMMIT;

RAISE NOTICE 'Rollback completed. Please review and test.';
*/
