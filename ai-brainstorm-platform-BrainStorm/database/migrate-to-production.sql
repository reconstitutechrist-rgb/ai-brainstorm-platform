-- ============================================
-- MIGRATION: Development to Production Schema
-- ============================================
-- This script safely migrates from the development schema to production
-- Preserves all existing data
-- Can be run multiple times (idempotent)
-- ============================================

-- Start transaction for safety
BEGIN;

-- ============================================
-- STEP 1: Backup existing data (optional but recommended)
-- ============================================

-- Create backup tables
CREATE TABLE IF NOT EXISTS projects_backup AS SELECT * FROM projects;
CREATE TABLE IF NOT EXISTS messages_backup AS SELECT * FROM messages;
CREATE TABLE IF NOT EXISTS references_backup AS SELECT * FROM references;
CREATE TABLE IF NOT EXISTS agent_activity_backup AS SELECT * FROM agent_activity;

-- ============================================
-- STEP 2: Add new columns (if needed)
-- ============================================

-- Note: If user_id columns are already TEXT, this migration preserves them
-- In a future migration, you can convert TEXT to UUID if needed

-- ============================================
-- STEP 3: Add missing constraints
-- ============================================

-- Make messages.project_id NOT NULL (if it isn't already)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages'
    AND column_name = 'project_id'
    AND is_nullable = 'YES'
  ) THEN
    -- First, delete any orphaned messages without project_id
    DELETE FROM messages WHERE project_id IS NULL;

    -- Then add NOT NULL constraint
    ALTER TABLE messages ALTER COLUMN project_id SET NOT NULL;

    RAISE NOTICE 'Added NOT NULL constraint to messages.project_id';
  END IF;
END $$;

-- ============================================
-- STEP 4: Drop old permissive RLS policies
-- ============================================

DROP POLICY IF EXISTS "Allow all on projects" ON projects;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
DROP POLICY IF EXISTS "Allow all on references" ON references;
DROP POLICY IF EXISTS "Allow all on agent_activity" ON agent_activity;

RAISE NOTICE 'Dropped old permissive RLS policies';

-- ============================================
-- STEP 5: Create new production RLS policies
-- ============================================

-- PROJECTS POLICIES
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Service role full access to projects"
  ON projects FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- MESSAGES POLICIES
CREATE POLICY "Users can view messages from own projects"
  ON messages FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can create messages in own projects"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Service role can manage all messages"
  ON messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- REFERENCES POLICIES
CREATE POLICY "Users can view references from own projects"
  ON references FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can upload references to own projects"
  ON references FOR INSERT TO authenticated
  WITH CHECK (
    user_id::text = auth.uid()::text AND
    project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own references"
  ON references FOR UPDATE TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete own references"
  ON references FOR DELETE TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Service role can manage all references"
  ON references FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- AGENT ACTIVITY POLICIES
CREATE POLICY "Users can view agent activity from own projects"
  ON agent_activity FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Service role can manage agent activity"
  ON agent_activity FOR ALL TO service_role
  USING (true) WITH CHECK (true);

RAISE NOTICE 'Created new production RLS policies';

-- ============================================
-- STEP 6: Add missing indexes
-- ============================================

-- Drop indexes with incorrect definition
DROP INDEX IF EXISTS idx_projects_updated_at;

-- Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_projects_updated_at_desc ON projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);

CREATE INDEX IF NOT EXISTS idx_messages_project_created ON messages(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

CREATE INDEX IF NOT EXISTS idx_references_project_status ON references(project_id, analysis_status);

CREATE INDEX IF NOT EXISTS idx_agent_activity_created_at_desc ON agent_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_type ON agent_activity(agent_type);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_projects_items_gin ON projects USING GIN (items);
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin ON messages USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_references_metadata_gin ON references USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_agent_activity_details_gin ON agent_activity USING GIN (details);

RAISE NOTICE 'Added performance indexes';

-- ============================================
-- STEP 7: Update storage bucket to private
-- ============================================

UPDATE storage.buckets
SET public = false
WHERE id = 'references';

RAISE NOTICE 'Updated storage bucket to private';

-- ============================================
-- STEP 8: Update storage policies
-- ============================================

-- Drop old permissive storage policies
DROP POLICY IF EXISTS "Allow uploads to references" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from references" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from references" ON storage.objects;

-- For TEXT user_id, we need to handle the folder structure differently
-- Assuming folder structure is: {user_id}/{filename}

CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Service role can manage all files"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'references');

RAISE NOTICE 'Updated storage policies';

-- ============================================
-- STEP 9: Create helper functions
-- ============================================

CREATE OR REPLACE FUNCTION user_owns_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND user_id::text = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_project_owner(project_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  owner_id TEXT;
BEGIN
  SELECT user_id INTO owner_id FROM projects WHERE id = project_uuid;
  RETURN owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE 'Created helper functions';

-- ============================================
-- STEP 10: Create useful views
-- ============================================

CREATE OR REPLACE VIEW project_stats AS
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
FROM projects p
LEFT JOIN messages m ON p.id = m.project_id
LEFT JOIN references r ON p.id = r.project_id
GROUP BY p.id, p.user_id, p.title, p.description, p.status, p.created_at, p.updated_at;

-- Enable security invoker for view
ALTER VIEW project_stats SET (security_invoker = true);

RAISE NOTICE 'Created project_stats view';

-- ============================================
-- STEP 11: Add table comments
-- ============================================

COMMENT ON TABLE projects IS 'User projects with brainstorming state';
COMMENT ON TABLE messages IS 'Conversation messages between users and AI agents';
COMMENT ON TABLE references IS 'Uploaded files and external references';
COMMENT ON TABLE agent_activity IS 'Log of AI agent actions and decisions';

-- ============================================
-- STEP 12: Grant permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT SELECT, INSERT ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON references TO authenticated;
GRANT SELECT ON agent_activity TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

RAISE NOTICE 'Granted permissions';

-- ============================================
-- STEP 13: Verify migration
-- ============================================

DO $$
DECLARE
  project_count INTEGER;
  message_count INTEGER;
  reference_count INTEGER;
  activity_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO project_count FROM projects;
  SELECT COUNT(*) INTO message_count FROM messages;
  SELECT COUNT(*) INTO reference_count FROM references;
  SELECT COUNT(*) INTO activity_count FROM agent_activity;

  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '  Projects: % rows', project_count;
  RAISE NOTICE '  Messages: % rows', message_count;
  RAISE NOTICE '  References: % rows', reference_count;
  RAISE NOTICE '  Agent Activity: % rows', activity_count;

  -- Check RLS is enabled
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'projects'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '  RLS: Enabled ✓';
  ELSE
    RAISE WARNING '  RLS: Not enabled!';
  END IF;

  -- Count policies
  SELECT COUNT(*) INTO project_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE '  Active policies: %', project_count;
END $$;

-- ============================================
-- COMMIT or ROLLBACK
-- ============================================

-- If everything looks good, commit the transaction
COMMIT;

-- If you see errors, you can rollback by running: ROLLBACK;

-- ============================================
-- POST-MIGRATION STEPS
-- ============================================

/*
After running this migration:

1. TEST RLS POLICIES:
   - Log in as different users
   - Verify they can only see their own data
   - Test service_role backend operations

2. VERIFY PERFORMANCE:
   - Run EXPLAIN ANALYZE on common queries
   - Check index usage with pg_stat_user_indexes
   - Monitor query performance

3. UPDATE BACKEND CODE:
   - Ensure backend uses service_role key for AI operations
   - Update file upload paths to include user_id folder
   - Test all API endpoints

4. CLEAN UP BACKUP TABLES:
   After verifying everything works, drop backup tables:
   DROP TABLE IF EXISTS projects_backup;
   DROP TABLE IF EXISTS messages_backup;
   DROP TABLE IF EXISTS references_backup;
   DROP TABLE IF EXISTS agent_activity_backup;

5. MONITOR:
   - Watch logs for RLS policy violations
   - Check for slow queries
   - Monitor storage usage
*/

-- ============================================
-- TROUBLESHOOTING
-- ============================================

/*
If RLS blocks legitimate operations:

1. Check which policy failed:
   SELECT * FROM pg_policies WHERE schemaname = 'public';

2. Test policy with specific user:
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claim.sub = 'user-uuid-here';
   SELECT * FROM projects;
   RESET ROLE;

3. Bypass RLS temporarily (testing only!):
   ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
   -- Run your tests
   ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

4. Check service_role access:
   Ensure backend uses SUPABASE_SERVICE_KEY, not SUPABASE_ANON_KEY
*/
