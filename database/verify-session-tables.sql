-- ============================================
-- SESSION TABLES VERIFICATION SCRIPT
-- ============================================
-- This script verifies that the session management
-- tables and functions have been properly created.
--
-- HOW TO USE:
-- 1. Copy this entire script
-- 2. Paste into Supabase SQL Editor
-- 3. Click "Run"
-- 4. Check the results in each section

-- ============================================
-- SECTION 1: Check if Tables Exist
-- ============================================
SELECT
  'user_sessions' as table_name,
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'user_sessions'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run migration 004_user_sessions.sql'
  END as status;

SELECT
  'session_analytics' as table_name,
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'session_analytics'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run migration 004_user_sessions.sql'
  END as status;

-- ============================================
-- SECTION 2: Check Table Columns
-- ============================================
-- Check user_sessions columns
SELECT
  'user_sessions columns' as check_name,
  COUNT(*) as column_count,
  CASE
    WHEN COUNT(*) >= 8 THEN '✅ All required columns present'
    ELSE '❌ Missing columns - Re-run migration'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_sessions'
  AND column_name IN (
    'id', 'user_id', 'project_id', 'session_start',
    'session_end', 'is_active', 'snapshot_at_start', 'metadata'
  );

-- Check session_analytics columns
SELECT
  'session_analytics columns' as check_name,
  COUNT(*) as column_count,
  CASE
    WHEN COUNT(*) >= 10 THEN '✅ All required columns present'
    ELSE '❌ Missing columns - Re-run migration'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'session_analytics'
  AND column_name IN (
    'id', 'user_id', 'project_id', 'last_activity',
    'previous_activity', 'items_decided_since_last',
    'items_exploring', 'items_parked', 'pending_questions',
    'suggested_next_steps'
  );

-- ============================================
-- SECTION 3: Check Database Functions
-- ============================================
SELECT
  'get_time_since_last_session' as function_name,
  CASE
    WHEN EXISTS (
      SELECT FROM pg_proc
      WHERE proname = 'get_time_since_last_session'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run migration 004_user_sessions.sql'
  END as status;

SELECT
  'get_session_summary' as function_name,
  CASE
    WHEN EXISTS (
      SELECT FROM pg_proc
      WHERE proname = 'get_session_summary'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING - Run migration 004_user_sessions.sql'
  END as status;

-- ============================================
-- SECTION 4: Check Indexes
-- ============================================
SELECT
  'Session table indexes' as check_name,
  COUNT(*) as index_count,
  CASE
    WHEN COUNT(*) >= 7 THEN '✅ All indexes created'
    ELSE '⚠️ Some indexes missing - Performance may be affected'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename = 'user_sessions' OR
    tablename = 'session_analytics'
  );

-- ============================================
-- SECTION 5: Check RLS (Row Level Security)
-- ============================================
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled - Security risk!'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_sessions', 'session_analytics');

-- ============================================
-- SECTION 6: Sample Data Check
-- ============================================
-- Check if any sessions exist
SELECT
  'user_sessions data' as check_name,
  COUNT(*) as record_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Has session data'
    ELSE 'ℹ️ No sessions yet (this is OK for new installations)'
  END as status
FROM user_sessions;

SELECT
  'session_analytics data' as check_name,
  COUNT(*) as record_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Has analytics data'
    ELSE 'ℹ️ No analytics yet (this is OK for new installations)'
  END as status
FROM session_analytics;

-- ============================================
-- SECTION 7: Detailed Column Information
-- ============================================
-- Show all columns in user_sessions
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_sessions'
ORDER BY ordinal_position;

-- Show all columns in session_analytics
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'session_analytics'
ORDER BY ordinal_position;

-- ============================================
-- SECTION 8: Test Functions
-- ============================================
-- Note: These tests will fail if tables don't exist
-- or if there's no data. That's expected for new installations.

-- Test get_time_since_last_session function
-- (Replace 'test-user-id' and '00000000-0000-0000-0000-000000000000' with real values to test)
SELECT get_time_since_last_session(
  'test-user-id'::text,
  '00000000-0000-0000-0000-000000000000'::uuid
) as time_since_last_session;

-- Test get_session_summary function
-- (Replace with real user_id and project_id to test with actual data)
SELECT get_session_summary(
  'test-user-id'::text,
  '00000000-0000-0000-0000-000000000000'::uuid
) as session_summary;

-- ============================================
-- VERIFICATION SUMMARY
-- ============================================
-- If all checks show ✅, your session management system is ready!
-- If any checks show ❌, follow the instructions in the status message.
--
-- Common Issues:
-- 1. Tables missing → Run database/migrations/004_user_sessions.sql
-- 2. Columns missing → Re-run migration (might have been partial)
-- 3. Functions missing → Re-run migration
-- 4. No data → This is OK! Data will appear after first session
--
-- Next Steps After Successful Verification:
-- 1. Restart your backend server
-- 2. Open the application
-- 3. Click "Start Session" button
-- 4. Re-run this verification script
-- 5. You should now see data in SECTION 6
