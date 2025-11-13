-- ============================================
-- USER SESSIONS TRACKING MIGRATION
-- ============================================
-- This migration adds session tracking functionality
-- to track user activity and provide session summaries

-- Create user_sessions table
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

-- Create session_analytics table for pre-computed analytics
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_project_id ON user_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_start ON user_sessions(session_start DESC);

CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_project_id ON session_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_last_activity ON session_analytics(last_activity DESC);

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for development - adjust for production)
DROP POLICY IF EXISTS "Allow all on user_sessions" ON user_sessions;
CREATE POLICY "Allow all on user_sessions" ON user_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all on session_analytics" ON session_analytics;
CREATE POLICY "Allow all on session_analytics" ON session_analytics FOR ALL USING (true);

-- Trigger for updated_at on user_sessions
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on session_analytics
DROP TRIGGER IF EXISTS update_session_analytics_updated_at ON session_analytics;
CREATE TRIGGER update_session_analytics_updated_at
  BEFORE UPDATE ON session_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate time since last session
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

-- Function to get session summary
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
    -- Extract the 'decided' array from the snapshot_at_start object
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

-- Add comments for documentation
COMMENT ON TABLE user_sessions IS 'Tracks individual user sessions for analytics and session summaries';
COMMENT ON TABLE session_analytics IS 'Pre-computed analytics for quick session summary retrieval';
COMMENT ON FUNCTION get_time_since_last_session IS 'Returns human-readable time since last session';
COMMENT ON FUNCTION get_session_summary IS 'Returns comprehensive session summary with item counts';
