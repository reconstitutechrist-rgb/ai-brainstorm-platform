-- =====================================================
-- Add agent_type column to messages table
-- Migration: Fix missing agent_type column
-- =====================================================

-- Add agent_type column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS agent_type TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_agent_type ON messages(agent_type);

-- Add comment for documentation
COMMENT ON COLUMN messages.agent_type IS 'Type of AI agent that generated this message (e.g., BrainstormingAgent, VerificationAgent)';
