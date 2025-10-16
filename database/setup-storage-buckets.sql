-- =====================================================
-- STORAGE BUCKETS SETUP
-- Run this script in Supabase SQL Editor
-- =====================================================
-- This script creates and configures the storage buckets
-- for the AI Brainstorm Platform with proper security
-- =====================================================

-- =====================================================
-- STEP 1: Create Storage Buckets
-- =====================================================

-- References bucket (for AI analysis, product images, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'references',
  'references',
  true,  -- Public bucket (images/videos for AI analysis)
  52428800,  -- 50MB limit
  ARRAY[
    -- Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    -- Videos
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    -- Documents (for reference analysis)
    'application/pdf',
    'text/plain',
    'text/markdown'
  ]
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Documents bucket (for project documentation, private files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket (user documents)
  52428800,  -- 50MB limit
  ARRAY[
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'text/markdown',
    -- Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    -- Other
    'application/zip',
    'application/x-rar-compressed'
  ]
) ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STEP 2: Enable RLS on Storage Objects
-- =====================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Drop Old Policies (if they exist)
-- =====================================================

-- References bucket policies
DROP POLICY IF EXISTS "Allow uploads to references" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from references" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete from references" ON storage.objects;
DROP POLICY IF EXISTS "users_upload_to_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "users_read_own_files" ON storage.objects;
DROP POLICY IF EXISTS "users_update_own_files" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_own_files" ON storage.objects;

-- Documents bucket policies
DROP POLICY IF EXISTS "users_upload_documents" ON storage.objects;
DROP POLICY IF EXISTS "users_view_documents" ON storage.objects;
DROP POLICY IF EXISTS "users_update_documents" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_documents" ON storage.objects;

-- Service role policies
DROP POLICY IF EXISTS "service_role_all_storage" ON storage.objects;
DROP POLICY IF EXISTS "service_role_documents" ON storage.objects;
DROP POLICY IF EXISTS "service_role_references" ON storage.objects;

-- =====================================================
-- STEP 4: Create References Bucket Policies
-- =====================================================

-- Allow authenticated users to upload to their own folder
CREATE POLICY "references_upload_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own files
CREATE POLICY "references_read_own_files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own files
CREATE POLICY "references_update_own_files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
CREATE POLICY "references_delete_own_files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'references' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- STEP 5: Create Documents Bucket Policies
-- =====================================================

-- Allow authenticated users to upload documents
CREATE POLICY "documents_upload_own_folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own documents
CREATE POLICY "documents_read_own_files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own documents
CREATE POLICY "documents_update_own_files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own documents
CREATE POLICY "documents_delete_own_files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- STEP 6: Service Role Policies (Full Access)
-- =====================================================

-- Service role can do anything with references bucket
CREATE POLICY "service_role_references_all"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'references')
  WITH CHECK (bucket_id = 'references');

-- Service role can do anything with documents bucket
CREATE POLICY "service_role_documents_all"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify buckets created
DO $$
DECLARE
  ref_bucket_exists BOOLEAN;
  doc_bucket_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check buckets
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'references') INTO ref_bucket_exists;
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'documents') INTO doc_bucket_exists;

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'STORAGE BUCKETS VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'References bucket: %', CASE WHEN ref_bucket_exists THEN 'EXISTS ' ELSE 'MISSING ' END;
  RAISE NOTICE 'Documents bucket: %', CASE WHEN doc_bucket_exists THEN 'EXISTS ' ELSE 'MISSING ' END;
  RAISE NOTICE 'Storage policies: % created', policy_count;
  RAISE NOTICE '========================================';
END $$;

-- Show bucket details
SELECT
  id,
  name,
  CASE WHEN public THEN 'Public' ELSE 'Private' END as access,
  file_size_limit / 1024 / 1024 as max_size_mb,
  array_length(allowed_mime_types, 1) as allowed_types_count
FROM storage.buckets
WHERE id IN ('references', 'documents')
ORDER BY id;

-- Show policies
SELECT
  policyname,
  CASE
    WHEN policyname LIKE '%references%' THEN 'References'
    WHEN policyname LIKE '%documents%' THEN 'Documents'
    ELSE 'Other'
  END as bucket,
  cmd as operation,
  roles::text
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%references%' OR policyname LIKE '%documents%' OR policyname LIKE '%service_role%'
ORDER BY bucket, operation;

-- =====================================================
-- FOLDER STRUCTURE DOCUMENTATION
-- =====================================================

/*
Folder structure in storage buckets:

REFERENCES BUCKET (public):
  {user_id}/
    {project_id}/
      {uuid}.jpg    - Product images
      {uuid}.mp4    - Product videos
      {uuid}.pdf    - Reference documents

DOCUMENTS BUCKET (private):
  {user_id}/
    {project_id}/
      {uuid}.pdf    - Project documents
      {uuid}.docx   - Word documents
      {uuid}.xlsx   - Spreadsheets
      etc.

SECURITY:
- Users can only access files in folders matching their user_id
- Service role has full access for AI processing
- References bucket is public (for sharing)
- Documents bucket is private (requires auth)
*/

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
-- Check what files a user has
SELECT
  name,
  metadata->>'size' as size_bytes,
  created_at
FROM storage.objects
WHERE bucket_id = 'documents'
AND (storage.foldername(name))[1] = '{your-user-id}'
ORDER BY created_at DESC;

-- Get storage usage per bucket
SELECT
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size
FROM storage.objects
WHERE bucket_id IN ('references', 'documents')
GROUP BY bucket_id;

-- Find large files (> 10MB)
SELECT
  bucket_id,
  name,
  pg_size_pretty((metadata->>'size')::bigint) as size,
  created_at
FROM storage.objects
WHERE (metadata->>'size')::bigint > 10485760
ORDER BY (metadata->>'size')::bigint DESC;
*/

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE ' Storage buckets setup complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Verify buckets in Supabase Dashboard ’ Storage';
  RAISE NOTICE '2. Test file upload via API: POST /api/documents/upload';
  RAISE NOTICE '3. Check backend logs for any errors';
  RAISE NOTICE '4. Test from frontend Intelligence Hub ’ Documents tab';
  RAISE NOTICE '';
END $$;
