-- ============================================
-- SANDBOX CONVERSATIONS MIGRATION
-- ============================================

-- Conversations table for storing chat-based brainstorming sessions
CREATE TABLE IF NOT EXISTS sandbox_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sandbox_id UUID REFERENCES sandbox_sessions(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  extracted_ideas JSONB DEFAULT '[]'::jsonb,
  conversation_context JSONB DEFAULT '{}'::jsonb,
  current_mode TEXT DEFAULT 'exploration' CHECK (current_mode IN ('exploration', 'clarification', 'generation', 'refinement', 'comparison', 'validation', 'implementation')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add conversation_id to sandbox_sessions
ALTER TABLE sandbox_sessions
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES sandbox_conversations(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sandbox_conversations_sandbox_id ON sandbox_conversations(sandbox_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_conversations_created_at ON sandbox_conversations(created_at DESC);

-- RLS policies
ALTER TABLE sandbox_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on sandbox_conversations" ON sandbox_conversations;
CREATE POLICY "Allow all on sandbox_conversations" ON sandbox_conversations FOR ALL USING (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sandbox_conversations_updated_at ON sandbox_conversations;
CREATE TRIGGER update_sandbox_conversations_updated_at
  BEFORE UPDATE ON sandbox_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE sandbox_conversations IS 'Stores conversational brainstorming sessions between user and AI';
COMMENT ON COLUMN sandbox_conversations.messages IS 'Array of message objects with role, content, timestamp, and metadata';
COMMENT ON COLUMN sandbox_conversations.extracted_ideas IS 'Ideas automatically extracted from conversation';
COMMENT ON COLUMN sandbox_conversations.conversation_context IS 'Current conversation state, user intent, and contextual information';
COMMENT ON COLUMN sandbox_conversations.current_mode IS 'Current conversation mode determining AI behavior';
