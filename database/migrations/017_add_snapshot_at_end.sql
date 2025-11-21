-- Migration 017: Add snapshot_at_end column to user_sessions
-- This enables tracking what changed during each session

-- Add snapshot_at_end column
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS snapshot_at_end JSONB;

-- Add comment for documentation
COMMENT ON COLUMN user_sessions.snapshot_at_end IS 'Snapshot of project state when session ended - used to calculate session deltas';
