-- ============================================
-- AI BRAINSTORM PLATFORM - COMPLETE DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
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
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  agent_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- References table
CREATE TABLE IF NOT EXISTS references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
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
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document folders table
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table (separate from references)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_references_project_id ON references(project_id);
CREATE INDEX IF NOT EXISTS idx_references_user_id ON references(user_id);
CREATE INDEX IF NOT EXISTS idx_references_type ON references(type);
CREATE INDEX IF NOT EXISTS idx_references_status ON references(analysis_status);

CREATE INDEX IF NOT EXISTS idx_agent_activity_project_id ON agent_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created_at ON agent_activity(created_at);

CREATE INDEX IF NOT EXISTS idx_document_folders_project_id ON document_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_user_id ON document_folders(user_id);

CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage bucket for references
INSERT INTO storage.buckets (id, name, public)
VALUES ('references', 'references', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for documents (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE references ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Projects policies (simplified for development - adjust for production)
DROP POLICY IF EXISTS "Allow all on projects" ON projects;
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true);

-- Messages policies
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true);

-- References policies
DROP POLICY IF EXISTS "Allow all on references" ON references;
CREATE POLICY "Allow all on references" ON references FOR ALL USING (true);

-- Agent activity policies
DROP POLICY IF EXISTS "Allow all on agent_activity" ON agent_activity;
CREATE POLICY "Allow all on agent_activity" ON agent_activity FOR ALL USING (true);

-- Document folders policies
DROP POLICY IF EXISTS "Allow all on document_folders" ON document_folders;
CREATE POLICY "Allow all on document_folders" ON document_folders FOR ALL USING (true);

-- Documents policies
DROP POLICY IF EXISTS "Allow all on documents" ON documents;
CREATE POLICY "Allow all on documents" ON documents FOR ALL USING (true);

-- Storage policies
DROP POLICY IF EXISTS "Allow uploads to references" ON storage.objects;
CREATE POLICY "Allow uploads to references" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'references');

DROP POLICY IF EXISTS "Allow public read from references" ON storage.objects;
CREATE POLICY "Allow public read from references" ON storage.objects
  FOR SELECT USING (bucket_id = 'references');

DROP POLICY IF EXISTS "Allow delete from references" ON storage.objects;
CREATE POLICY "Allow delete from references" ON storage.objects
  FOR DELETE USING (bucket_id = 'references');

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

-- Trigger for document_folders table
DROP TRIGGER IF EXISTS update_document_folders_updated_at ON document_folders;
CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON document_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SESSION MANAGEMENT TABLES
-- ============================================
-- Added: 2025-10-21
-- Purpose: Track user sessions, analytics, and provide session summaries
-- Migration: database/migrations/004_user_sessions.sql

-- User Sessions table - tracks individual user sessions with snapshots
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,

  -- Snapshot of state at session start
  snapshot_at_start JSONB DEFAULT '{
    "decided": [],
    "exploring": [],
    "parked": []
  }'::jsonb,

  -- Session metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Analytics table - pre-computed analytics for quick retrieval
CREATE TABLE IF NOT EXISTS session_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Time tracking
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL,
  previous_activity TIMESTAMP WITH TIME ZONE,

  -- Activity metrics
  items_decided_since_last INTEGER DEFAULT 0,
  items_exploring INTEGER DEFAULT 0,
  items_parked INTEGER DEFAULT 0,
  pending_questions INTEGER DEFAULT 0,

  -- Session insights
  suggested_next_steps JSONB DEFAULT '[]'::jsonb,
  active_blockers JSONB DEFAULT '[]'::jsonb,

  -- Computed data
  analytics_data JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one analytics record per user-project
  UNIQUE(user_id, project_id)
);

-- Session table indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_project_id ON user_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_start ON user_sessions(session_start DESC);

CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_project_id ON session_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_last_activity ON session_analytics(last_activity DESC);

-- Enable RLS for session tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;

-- Session RLS policies (allow all for development - adjust for production)
DROP POLICY IF EXISTS "Allow all on user_sessions" ON user_sessions;
CREATE POLICY "Allow all on user_sessions" ON user_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all on session_analytics" ON session_analytics;
CREATE POLICY "Allow all on session_analytics" ON session_analytics FOR ALL USING (true);

-- Triggers for session tables
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_analytics_updated_at ON session_analytics;
CREATE TRIGGER update_session_analytics_updated_at
  BEFORE UPDATE ON session_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SESSION MANAGEMENT FUNCTIONS
-- ============================================

-- Function: get_time_since_last_session
-- Returns human-readable time since last session
CREATE OR REPLACE FUNCTION get_time_since_last_session(p_user_id TEXT, p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  last_session TIMESTAMP WITH TIME ZONE;
  time_diff INTERVAL;
  result TEXT;
BEGIN
  -- Get last completed session
  SELECT session_end INTO last_session
  FROM user_sessions
  WHERE user_id = p_user_id
    AND project_id = p_project_id
    AND is_active = false
  ORDER BY session_end DESC
  LIMIT 1;

  IF last_session IS NULL THEN
    RETURN 'first session';
  END IF;

  time_diff := NOW() - last_session;

  -- Format human-readable time
  IF time_diff < INTERVAL '1 hour' THEN
    result := EXTRACT(MINUTE FROM time_diff)::INTEGER || ' minutes ago';
  ELSIF time_diff < INTERVAL '1 day' THEN
    result := EXTRACT(HOUR FROM time_diff)::INTEGER || ' hours ago';
  ELSIF time_diff < INTERVAL '7 days' THEN
    result := EXTRACT(DAY FROM time_diff)::INTEGER || ' days ago';
  ELSIF time_diff < INTERVAL '30 days' THEN
    result := (EXTRACT(DAY FROM time_diff) / 7)::INTEGER || ' weeks ago';
  ELSE
    result := (EXTRACT(DAY FROM time_diff) / 30)::INTEGER || ' months ago';
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: get_session_summary
-- Returns comprehensive session summary with item counts
CREATE OR REPLACE FUNCTION get_session_summary(p_user_id TEXT, p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  last_session_record RECORD;
  current_items JSONB;
  items_decided_count INTEGER;
  items_exploring_count INTEGER;
  items_parked_count INTEGER;
  new_decided_count INTEGER;
BEGIN
  -- Get current project items
  SELECT items INTO current_items
  FROM projects
  WHERE id = p_project_id;

  IF current_items IS NULL THEN
    current_items := '[]'::jsonb;
  END IF;

  -- Count current items by state
  SELECT
    COUNT(*) FILTER (WHERE item->>'state' = 'decided'),
    COUNT(*) FILTER (WHERE item->>'state' = 'exploring'),
    COUNT(*) FILTER (WHERE item->>'state' = 'parked')
  INTO items_decided_count, items_exploring_count, items_parked_count
  FROM jsonb_array_elements(current_items) AS item;

  -- Get last session data
  SELECT * INTO last_session_record
  FROM user_sessions
  WHERE user_id = p_user_id
    AND project_id = p_project_id
    AND is_active = false
  ORDER BY session_end DESC
  LIMIT 1;

  -- Calculate new decided items since last session
  IF last_session_record IS NULL THEN
    new_decided_count := items_decided_count;
  ELSE
    -- Count decided items from last session snapshot
    SELECT COUNT(*) INTO new_decided_count
    FROM jsonb_array_elements(last_session_record.snapshot_at_start->'decided') AS old_item;

    new_decided_count := items_decided_count - COALESCE(new_decided_count, 0);
  END IF;

  -- Build result
  result := jsonb_build_object(
    'lastSession', get_time_since_last_session(p_user_id, p_project_id),
    'itemsDecided', new_decided_count,
    'itemsExploring', items_exploring_count,
    'itemsParked', items_parked_count,
    'totalDecided', items_decided_count
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Table comments
COMMENT ON TABLE user_sessions IS 'Tracks individual user sessions for analytics and session summaries';
COMMENT ON TABLE session_analytics IS 'Pre-computed analytics for quick session summary retrieval';
COMMENT ON FUNCTION get_time_since_last_session IS 'Returns human-readable time since last session';
COMMENT ON FUNCTION get_session_summary IS 'Returns comprehensive session summary with item counts';

-- ============================================
-- SAMPLE DATA (optional - for testing)
-- ============================================

-- Uncomment to insert sample data
/*
INSERT INTO projects (user_id, title, description, status) VALUES
  ('demo-user-123', 'AI Product Launch', 'Planning the launch of our new AI product', 'exploring'),
  ('demo-user-123', 'Website Redesign', 'Complete redesign of company website', 'decided');
*/
