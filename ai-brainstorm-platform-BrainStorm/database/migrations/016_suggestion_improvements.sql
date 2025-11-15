-- Migration 016: Suggestion System Improvements
-- Adds tables for tracking suggestion dismissals, feedback, and caching

-- Table to track dismissed suggestions per user/project
CREATE TABLE IF NOT EXISTS suggestion_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  suggestion_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,
  suggestion_title TEXT NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate dismissals
  UNIQUE(user_id, project_id, suggestion_id)
);

-- Table to track user feedback on suggestions
CREATE TABLE IF NOT EXISTS suggestion_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  suggestion_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('accept', 'dismiss', 'helpful', 'not_helpful')),
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Track additional context
  time_to_action_seconds INTEGER,
  suggestion_priority TEXT,
  suggestion_agent_type TEXT
);

-- Table to cache generated suggestions
CREATE TABLE IF NOT EXISTS suggestion_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  context_hash TEXT NOT NULL,
  suggestions JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Track what triggered generation
  message_count INTEGER,
  decided_count INTEGER,
  exploring_count INTEGER,
  parked_count INTEGER,
  
  -- Only keep most recent cache per project
  UNIQUE(project_id, context_hash)
);

-- Table to track suggestion analytics
CREATE TABLE IF NOT EXISTS suggestion_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  total_generated INTEGER DEFAULT 0,
  total_accepted INTEGER DEFAULT 0,
  total_dismissed INTEGER DEFAULT 0,
  total_helpful INTEGER DEFAULT 0,
  total_not_helpful INTEGER DEFAULT 0,
  avg_time_to_action_seconds FLOAT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One row per project per suggestion type
  UNIQUE(project_id, suggestion_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_suggestion_dismissals_user_project 
  ON suggestion_dismissals(user_id, project_id);
  
CREATE INDEX IF NOT EXISTS idx_suggestion_dismissals_project 
  ON suggestion_dismissals(project_id);

CREATE INDEX IF NOT EXISTS idx_suggestion_feedback_project 
  ON suggestion_feedback(project_id);
  
CREATE INDEX IF NOT EXISTS idx_suggestion_feedback_type 
  ON suggestion_feedback(suggestion_type);

CREATE INDEX IF NOT EXISTS idx_suggestion_cache_project 
  ON suggestion_cache(project_id);
  
CREATE INDEX IF NOT EXISTS idx_suggestion_cache_expires 
  ON suggestion_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_suggestion_analytics_project 
  ON suggestion_analytics(project_id);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_suggestion_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM suggestion_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update suggestion analytics
CREATE OR REPLACE FUNCTION update_suggestion_analytics(
  p_project_id UUID,
  p_suggestion_type TEXT,
  p_feedback_type TEXT,
  p_time_to_action INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO suggestion_analytics (
    project_id,
    suggestion_type,
    total_generated,
    total_accepted,
    total_dismissed,
    total_helpful,
    total_not_helpful,
    avg_time_to_action_seconds
  ) VALUES (
    p_project_id,
    p_suggestion_type,
    CASE WHEN p_feedback_type = 'accept' THEN 1 ELSE 0 END,
    CASE WHEN p_feedback_type = 'accept' THEN 1 ELSE 0 END,
    CASE WHEN p_feedback_type = 'dismiss' THEN 1 ELSE 0 END,
    CASE WHEN p_feedback_type = 'helpful' THEN 1 ELSE 0 END,
    CASE WHEN p_feedback_type = 'not_helpful' THEN 1 ELSE 0 END,
    p_time_to_action
  )
  ON CONFLICT (project_id, suggestion_type) DO UPDATE SET
    total_accepted = suggestion_analytics.total_accepted + CASE WHEN p_feedback_type = 'accept' THEN 1 ELSE 0 END,
    total_dismissed = suggestion_analytics.total_dismissed + CASE WHEN p_feedback_type = 'dismiss' THEN 1 ELSE 0 END,
    total_helpful = suggestion_analytics.total_helpful + CASE WHEN p_feedback_type = 'helpful' THEN 1 ELSE 0 END,
    total_not_helpful = suggestion_analytics.total_not_helpful + CASE WHEN p_feedback_type = 'not_helpful' THEN 1 ELSE 0 END,
    avg_time_to_action_seconds = CASE 
      WHEN p_time_to_action IS NOT NULL THEN 
        COALESCE(
          (suggestion_analytics.avg_time_to_action_seconds * suggestion_analytics.total_accepted + p_time_to_action) / 
          (suggestion_analytics.total_accepted + 1),
          p_time_to_action
        )
      ELSE suggestion_analytics.avg_time_to_action_seconds
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust based on your RLS policies)
-- These will need to be configured based on your existing security setup
