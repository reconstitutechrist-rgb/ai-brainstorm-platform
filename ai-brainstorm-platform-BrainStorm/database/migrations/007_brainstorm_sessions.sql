-- ============================================
-- BRAINSTORM SESSIONS MIGRATION
-- Enhanced Sandbox Session Review System
-- ============================================

-- Brainstorm sessions tracking table
CREATE TABLE IF NOT EXISTS brainstorm_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sandbox_id UUID REFERENCES sandbox_sessions(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES sandbox_conversations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  accepted_ideas JSONB DEFAULT '[]'::jsonb,
  rejected_ideas JSONB DEFAULT '[]'::jsonb,
  unmarked_ideas JSONB DEFAULT '[]'::jsonb,
  generated_document_ids JSONB DEFAULT '[]'::jsonb,
  updated_document_ids JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add session status and final decisions to sandbox_conversations
ALTER TABLE sandbox_conversations
ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'active'
  CHECK (session_status IN ('active', 'reviewing', 'completed'));

ALTER TABLE sandbox_conversations
ADD COLUMN IF NOT EXISTS final_decisions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE sandbox_conversations
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add source tracking to generated_documents
ALTER TABLE generated_documents
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual'
  CHECK (source_type IN ('manual', 'brainstorm_session', 'auto_generated'));

ALTER TABLE generated_documents
ADD COLUMN IF NOT EXISTS source_id UUID;

-- Indexes for brainstorm_sessions
CREATE INDEX IF NOT EXISTS idx_brainstorm_sessions_project_id
  ON brainstorm_sessions(project_id);

CREATE INDEX IF NOT EXISTS idx_brainstorm_sessions_sandbox_id
  ON brainstorm_sessions(sandbox_id);

CREATE INDEX IF NOT EXISTS idx_brainstorm_sessions_conversation_id
  ON brainstorm_sessions(conversation_id);

CREATE INDEX IF NOT EXISTS idx_brainstorm_sessions_created_at
  ON brainstorm_sessions(created_at DESC);

-- Indexes for generated_documents source tracking
CREATE INDEX IF NOT EXISTS idx_generated_documents_source_type
  ON generated_documents(source_type);

CREATE INDEX IF NOT EXISTS idx_generated_documents_source_id
  ON generated_documents(source_id);

-- RLS policies for brainstorm_sessions
ALTER TABLE brainstorm_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on brainstorm_sessions" ON brainstorm_sessions;
CREATE POLICY "Allow all on brainstorm_sessions" ON brainstorm_sessions FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE brainstorm_sessions IS 'Tracks completed brainstorm sessions with accepted/rejected ideas and generated documents';
COMMENT ON COLUMN brainstorm_sessions.accepted_ideas IS 'Ideas user accepted - will be added to main project';
COMMENT ON COLUMN brainstorm_sessions.rejected_ideas IS 'Ideas user rejected - documented for reference';
COMMENT ON COLUMN brainstorm_sessions.unmarked_ideas IS 'Ideas user chose to leave for later consideration';
COMMENT ON COLUMN brainstorm_sessions.generated_document_ids IS 'UUIDs of documents created from this session';
COMMENT ON COLUMN brainstorm_sessions.updated_document_ids IS 'UUIDs of existing documents updated with session data';

COMMENT ON COLUMN sandbox_conversations.session_status IS 'Current status of brainstorm session: active, reviewing, or completed';
COMMENT ON COLUMN sandbox_conversations.final_decisions IS 'Final user decisions on all ideas: {accepted: [], rejected: [], unmarked: []}';
COMMENT ON COLUMN sandbox_conversations.completed_at IS 'Timestamp when session was completed and documents generated';

COMMENT ON COLUMN generated_documents.source_type IS 'How document was created: manual, brainstorm_session, or auto_generated';
COMMENT ON COLUMN generated_documents.source_id IS 'References brainstorm_sessions.id if source_type is brainstorm_session';
