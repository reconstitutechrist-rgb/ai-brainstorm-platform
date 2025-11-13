-- ============================================
-- OPTIONAL MIGRATION: Fix user_id Type Mismatch
-- ============================================
-- Run this ONLY if you're getting "operator does not exist: text = uuid" errors
-- This migration converts all user_id columns from TEXT to UUID
--
-- IMPORTANT:
-- 1. Back up your database before running this!
-- 2. Only run if all user_id values are valid UUID strings
-- 3. If you have non-UUID user_id values, you'll need to migrate them first
--
-- NOTE: This version properly quotes "references" table name since it's a PostgreSQL reserved keyword
-- ============================================

-- Check if conversion is needed by testing a simple query
-- If this query fails with "operator does not exist: text = uuid", you need this migration
-- Test query: SELECT * FROM projects WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Disable RLS temporarily for migration
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE "references" DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Convert projects.user_id from TEXT to UUID
ALTER TABLE projects
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Convert messages.user_id from TEXT to UUID (nullable)
ALTER TABLE messages
  ALTER COLUMN user_id TYPE UUID USING
    CASE WHEN user_id IS NULL THEN NULL ELSE user_id::uuid END;

-- Convert references.user_id from TEXT to UUID
ALTER TABLE "references"
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Convert document_folders.user_id from TEXT to UUID
ALTER TABLE document_folders
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Convert documents.user_id from TEXT to UUID
ALTER TABLE documents
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE "references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Verify the conversion
SELECT 'projects' as table_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'user_id'
UNION ALL
SELECT 'messages' as table_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages' AND column_name = 'user_id'
UNION ALL
SELECT 'references' as table_name, data_type
FROM information_schema.columns
WHERE table_name = 'references' AND column_name = 'user_id'
UNION ALL
SELECT 'document_folders' as table_name, data_type
FROM information_schema.columns
WHERE table_name = 'document_folders' AND column_name = 'user_id'
UNION ALL
SELECT 'documents' as table_name, data_type
FROM information_schema.columns
WHERE table_name = 'documents' AND column_name = 'user_id';

-- Expected result: All should show data_type = 'uuid'
