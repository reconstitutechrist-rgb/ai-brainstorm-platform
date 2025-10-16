-- ============================================
-- AI BRAINSTORM PLATFORM - PRODUCTION DATABASE SCHEMA
-- ============================================
-- Version: 2.0 (Production-Ready)
-- Based on Supabase feedback and security best practices
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- Changed to UUID to match auth.users
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'exploring' CHECK (status IN ('decided', 'exploring', 'parked')),
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE, -- Added NOT NULL
  user_id UUID, -- Nullable for system messages
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  agent_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- References table
CREATE TABLE IF NOT EXISTS references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Changed to UUID
  file_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'document', 'product')),
  filename TEXT,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent activity log
CREATE TABLE IF NOT EXISTS agent_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES - Optimized for common queries
-- ============================================

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at_desc ON projects(updated_at DESC); -- Fixed: Added DESC
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status); -- Compound index

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_created ON messages(project_id, created_at DESC); -- Compound for sorting
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- References indexes
CREATE INDEX IF NOT EXISTS idx_references_project_id ON references(project_id);
CREATE INDEX IF NOT EXISTS idx_references_user_id ON references(user_id);
CREATE INDEX IF NOT EXISTS idx_references_type ON references(type);
CREATE INDEX IF NOT EXISTS idx_references_status ON references(analysis_status);
CREATE INDEX IF NOT EXISTS idx_references_project_status ON references(project_id, analysis_status); -- Compound

-- Agent activity indexes
CREATE INDEX IF NOT EXISTS idx_agent_activity_project_id ON agent_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created_at_desc ON agent_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_type ON agent_activity(agent_type);

-- JSONB indexes for faster searches
CREATE INDEX IF NOT EXISTS idx_projects_items_gin ON projects USING GIN (items);
CREATE INDEX IF NOT EXISTS idx_messages_metadata_gin ON messages USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_references_metadata_gin ON references USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_agent_activity_details_gin ON agent_activity USING GIN (details);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for references
INSERT INTO storage.buckets (id, name, public)
VALUES ('references', 'references', false) -- Changed to private, use signed URLs
ON CONFLICT (id) DO UPDATE SET public = false;

-- ============================================
-- ROW LEVEL SECURITY (RLS) - PRODUCTION POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE references ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow all on projects" ON projects;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
DROP POLICY IF EXISTS "Allow all on references" ON references;
DROP POLICY IF EXISTS "Allow all on agent_activity" ON agent_activity;

-- ============================================
-- PROJECTS POLICIES
-- ============================================

-- Users can view their own projects
CREATE POLICY "Users can view own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own projects
CREATE POLICY "Users can create own projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own projects
CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role has full access (for backend operations)
CREATE POLICY "Service role full access to projects"
  ON projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- MESSAGES POLICIES
-- ============================================

-- Users can view messages from their own projects
CREATE POLICY "Users can view messages from own projects"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can create messages in their own projects
CREATE POLICY "Users can create messages in own projects"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Service role can create agent messages
CREATE POLICY "Service role can manage all messages"
  ON messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users cannot update or delete messages (append-only log)
-- (No UPDATE/DELETE policies = operation denied)

-- ============================================
-- REFERENCES POLICIES
-- ============================================

-- Users can view references from their own projects
CREATE POLICY "Users can view references from own projects"
  ON references
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can upload references to their own projects
CREATE POLICY "Users can upload references to own projects"
  ON references
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can update analysis status of their own references
CREATE POLICY "Users can update own references"
  ON references
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own references
CREATE POLICY "Users can delete own references"
  ON references
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role full access for AI analysis updates
CREATE POLICY "Service role can manage all references"
  ON references
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- AGENT ACTIVITY POLICIES
-- ============================================

-- Users can view agent activity from their own projects
CREATE POLICY "Users can view agent activity from own projects"
  ON agent_activity
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Only service role can create agent activity logs
CREATE POLICY "Service role can manage agent activity"
  ON agent_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STORAGE POLICIES (Secure file access)
-- ============================================

-- Drop old permissive storage policies
DROP POLICY IF EXISTS "Allow uploads to references" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from references" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from references" ON storage.objects;

-- Users can upload files to their own user folder
CREATE POLICY "Users can upload own files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own files
CREATE POLICY "Users can view own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own files
CREATE POLICY "Users can update own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role full access for backend operations
CREATE POLICY "Service role can manage all files"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'references');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate user owns project (helper for policies)
CREATE OR REPLACE FUNCTION user_owns_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = project_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get project owner
CREATE OR REPLACE FUNCTION get_project_owner(project_uuid UUID)
RETURNS UUID AS $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT user_id INTO owner_id FROM projects WHERE id = project_uuid;
  RETURN owner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for projects table
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for references table
DROP TRIGGER IF EXISTS update_references_updated_at ON references;
CREATE TRIGGER update_references_updated_at
  BEFORE UPDATE ON references
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS (Optional - for easier querying)
-- ============================================

-- View for project with message count
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

-- RLS on view (inherits from base tables)
ALTER VIEW project_stats SET (security_invoker = true);

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE projects IS 'User projects with brainstorming state';
COMMENT ON TABLE messages IS 'Conversation messages between users and AI agents';
COMMENT ON TABLE references IS 'Uploaded files and external references';
COMMENT ON TABLE agent_activity IS 'Log of AI agent actions and decisions';

COMMENT ON COLUMN projects.user_id IS 'Owner user UUID from auth.users';
COMMENT ON COLUMN projects.items IS 'JSONB array of project items in different states';
COMMENT ON COLUMN messages.agent_type IS 'Name of AI agent that generated this message';
COMMENT ON COLUMN references.analysis_status IS 'Status of AI analysis: pending, processing, completed, failed';

-- ============================================
-- GRANTS (Optional - for specific roles)
-- ============================================

-- Grant necessary permissions to authenticated users
-- (RLS policies handle actual access control)
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;
GRANT SELECT, INSERT ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON references TO authenticated;
GRANT SELECT ON agent_activity TO authenticated;

-- Service role gets full access (already has via policies)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================
-- SAMPLE DATA (optional - for testing)
-- ============================================

-- Uncomment to insert sample data
-- NOTE: Replace 'demo-user-uuid' with actual UUID from auth.users
/*
INSERT INTO projects (user_id, title, description, status) VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'AI Product Launch', 'Planning the launch of our new AI product', 'exploring'),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Website Redesign', 'Complete redesign of company website', 'decided');
*/

-- ============================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ============================================

/*
IMPORTANT: Before deploying to production:

1. RLS VERIFICATION:
   - Test all policies with different user roles
   - Ensure users can only access their own data
   - Verify service_role bypasses for backend operations

2. PERFORMANCE:
   - Monitor query performance with pg_stat_statements
   - Add indexes for custom queries specific to your app
   - Consider partitioning for large tables (>10M rows)

3. BACKUP & RECOVERY:
   - Enable Point-in-Time Recovery in Supabase
   - Test backup restoration process
   - Document recovery procedures

4. MONITORING:
   - Set up alerts for slow queries
   - Monitor RLS policy performance
   - Track storage bucket usage

5. SECURITY:
   - Rotate service_role key regularly
   - Use environment variables for all secrets
   - Enable audit logging for sensitive operations

6. STORAGE:
   - Implement file size limits in application code
   - Set up lifecycle policies for old files
   - Consider CDN for frequently accessed files

7. RATE LIMITING:
   - Implement rate limiting in backend API
   - Use Supabase Auth rate limiting
   - Monitor API usage patterns

8. USER MANAGEMENT:
   - Set up proper auth.users integration
   - Implement user deletion cascade
   - Handle orphaned data from deleted users
*/
