-- ============================================
-- SANDBOX SESSIONS MIGRATION
-- ============================================

-- Sandbox sessions table
CREATE TABLE IF NOT EXISTS sandbox_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  original_project_state JSONB NOT NULL,
  sandbox_state JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'saved_as_alternative', 'discarded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_project_id ON sandbox_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_user_id ON sandbox_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_status ON sandbox_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_created_at ON sandbox_sessions(created_at DESC);

-- RLS
ALTER TABLE sandbox_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on sandbox_sessions" ON sandbox_sessions;
CREATE POLICY "Allow all on sandbox_sessions" ON sandbox_sessions FOR ALL USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sandbox_sessions_updated_at ON sandbox_sessions;
CREATE TRIGGER update_sandbox_sessions_updated_at
  BEFORE UPDATE ON sandbox_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
