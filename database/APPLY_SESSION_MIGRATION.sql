-- ============================================
-- 🚀 SESSION MANAGEMENT MIGRATION - EASY APPLY
-- ============================================
-- This is a consolidated, ready-to-use version of the
-- session management migration. Simply copy-paste this
-- entire file into Supabase SQL Editor and click "Run".
--
-- ⏱️ Estimated time: 30 seconds
-- 📊 Creates: 2 tables, 2 functions, 8 indexes, RLS policies
--
-- ============================================
-- INSTRUCTIONS:
-- ============================================
-- 1. Open your Supabase project dashboard
-- 2. Navigate to: SQL Editor (left sidebar)
-- 3. Click: "New Query"
-- 4. Copy this ENTIRE file
-- 5. Paste into the SQL Editor
-- 6. Click: "Run" (or press Ctrl+Enter)
-- 7. Wait for "Success" message
-- 8. Done! ✅
--
-- To verify it worked:
-- Run database/verify-session-tables.sql
--
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE 1: user_sessions
-- ============================================
-- Tracks individual user sessions with project state snapshots

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

-- ============================================
-- TABLE 2: session_analytics
-- ============================================
-- Pre-computed analytics for fast session summary retrieval

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

-- ============================================
-- INDEXES for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_project_id ON user_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_start ON user_sessions(session_start DESC);

CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_project_id ON session_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_last_activity ON session_analytics(last_activity DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;

-- Allow all access (adjust for production security needs)
DROP POLICY IF EXISTS "Allow all on user_sessions" ON user_sessions;
CREATE POLICY "Allow all on user_sessions" ON user_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all on session_analytics" ON session_analytics;
CREATE POLICY "Allow all on session_analytics" ON session_analytics FOR ALL USING (true);

-- ============================================
-- TRIGGERS for Auto-updating Timestamps
-- ============================================

-- Trigger for user_sessions.updated_at
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for session_analytics.updated_at
DROP TRIGGER IF EXISTS update_session_analytics_updated_at ON session_analytics;
CREATE TRIGGER update_session_analytics_updated_at
  BEFORE UPDATE ON session_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION 1: get_time_since_last_session
-- ============================================
-- Returns human-readable time since last session
-- Example: "2 hours ago", "3 days ago", "first session"

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

-- ============================================
-- FUNCTION 2: get_session_summary
-- ============================================
-- Returns comprehensive session summary with item counts
-- Used by the SessionManager component

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

-- ============================================
-- TABLE COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE user_sessions IS 'Tracks individual user sessions for analytics and session summaries';
COMMENT ON TABLE session_analytics IS 'Pre-computed analytics for quick session summary retrieval';
COMMENT ON FUNCTION get_time_since_last_session IS 'Returns human-readable time since last session';
COMMENT ON FUNCTION get_session_summary IS 'Returns comprehensive session summary with item counts';

-- ============================================
-- 🎉 MIGRATION COMPLETE!
-- ============================================
-- If you see "Success. No rows returned" - that's PERFECT!
-- It means everything was created successfully.
--
-- What was created:
-- ✅ user_sessions table
-- ✅ session_analytics table
-- ✅ 7 performance indexes
-- ✅ 2 RLS policies
-- ✅ 2 update triggers
-- ✅ 2 database functions
--
-- Next Steps:
-- 1. Run database/verify-session-tables.sql to verify
-- 2. Restart your backend server
-- 3. Test the session management feature!
--
-- Troubleshooting:
-- - If you see errors, check that:
--   1. The projects table exists
--   2. The update_updated_at_column() function exists
--   3. You have proper permissions in Supabase
--
-- Need help? Check SESSION_SETUP_GUIDE.md
-- ============================================
