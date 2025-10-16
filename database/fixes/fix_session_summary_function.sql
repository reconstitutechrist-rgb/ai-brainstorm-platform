-- ============================================
-- FIX: Session Summary Function
-- ============================================
-- This fixes the "cannot extract elements from an object" error
-- in the get_session_summary function.
--
-- PROBLEM: The function was trying to call jsonb_array_elements() on
-- snapshot_at_start which is an object like {"decided": [], "exploring": [], "parked": []}
-- instead of extracting the "decided" array first.
--
-- TO RUN: Execute this SQL in Supabase SQL Editor

-- Drop and recreate the function with the fix
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
    -- FIX: Extract the 'decided' array from the snapshot_at_start object
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

-- Add comment
COMMENT ON FUNCTION get_session_summary IS 'Returns comprehensive session summary with item counts (FIXED: jsonb_array_elements error)';
