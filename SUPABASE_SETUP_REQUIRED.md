# Supabase Storage Setup Required

## Storage Bucket Creation

The file upload feature requires a Supabase Storage bucket that doesn't exist yet. You need to create it manually in the Supabase dashboard.

### Steps:

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard/project/qzeozxwgbuazbinbqcxn/storage/buckets

2. **Create New Bucket:**
   - Click "New bucket"
   - Bucket name: `references`
   - Make it **Private** (not public)
   - Click "Create bucket"

3. **Verify Policies:**
   The migration script already created the necessary storage policies:
   - `users_upload_to_own_folder` - Users can upload to their own folder
   - `users_read_own_files` - Users can read their own files
   - `users_update_own_files` - Users can update their own files
   - `users_delete_own_files` - Users can delete their own files
   - `service_role_all_storage` - Service role has full access

4. **Test Upload:**
   After creating the bucket, try uploading a file through the chat interface.

### Error You'll See Without the Bucket:

```
StorageApiError: Bucket not found
status: 400
statusCode: '404'
```

## Recent Fixes Applied:

### 1. Database Schema Alignment
Fixed mismatch between database schema and backend code:
- Changed `file_url` column to `url` (to match migration script)
- Moved `type` field into metadata (column doesn't exist in DB)
- Store `analysis` in metadata instead of separate column

### 2. Type Definitions Updated
Both backend and frontend TypeScript types now match the actual database schema:
- `Reference.url` instead of `Reference.file_url`
- `type` and `analysis` moved into `metadata` object

### 3. File Upload Flow
Now properly aligned with database schema:
```typescript
{
  project_id: projectId,
  user_id: userId,
  url: url,                    // Correct column name
  filename: file.originalname,
  analysis_status: 'pending',
  metadata: {
    type: fileCategory,        // Stored in metadata
    description: description,
    mimeType: file.mimetype,
    storagePath: storagePath,
    fileSize: file.size
  }
}
```

## Current Status:

- ✅ Database schema applied (migrate-to-production-v3.sql)
- ✅ Backend code aligned with schema
- ✅ TypeScript types updated
- ✅ Storage policies created by migration
- ❌ Storage bucket needs manual creation
- ⚠️  AI chat responses not appearing (investigating)

## Next Steps:

1. Create the storage bucket in Supabase dashboard (see steps above)
2. Test file upload functionality
3. Investigate AI agent response issue
