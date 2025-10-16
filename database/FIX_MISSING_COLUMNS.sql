-- =====================================================
-- FIX: Add missing columns to production database
-- Run this in Supabase SQL Editor
-- =====================================================
-- URL: https://qzeozxwgbuazbinbqcxn.supabase.co/project/qzeozxwgbuazbinbqcxn/sql/new
-- =====================================================

-- 1. Add agent_type column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS agent_type TEXT;

-- 2. Add updated_at column to messages table (if missing)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_agent_type ON messages(agent_type);

-- 4. Add trigger for updated_at (if function exists)
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Add comments for documentation
COMMENT ON COLUMN messages.agent_type IS 'Type of AI agent that generated this message (e.g., BrainstormingAgent, VerificationAgent)';

-- 6. Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- You should see agent_type and updated_at columns in the output
