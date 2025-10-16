# Research Hub Upload Fix

## Issues Identified

1. **File Upload Failing**: Supabase storage bucket is rejecting document MIME types (Word, Excel, PowerPoint)
2. **Analysis Stuck on Pending**: Files that were uploaded before the fix are stuck in "pending" status

---

## Issue 1: Fix File Upload (Supabase Storage Configuration)

The error: `mime type application/vnd.openxmlformats-officedocument.wordprocessingml.document is not supported`

**Root Cause**: The Supabase storage bucket `references` doesn't have the correct MIME types configured.

### Fix in Supabase Dashboard:

1. Go to **Supabase Dashboard** → **Storage** → **references bucket**
2. Click **"Edit bucket"** or **"Settings"**
3. Find **"Allowed MIME types"** section
4. Make sure these MIME types are added:

```
image/jpeg
image/png
image/gif
image/webp
image/bmp
video/mp4
video/quicktime
video/x-msvideo
video/webm
application/pdf
text/plain
text/markdown
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
application/vnd.ms-excel
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
application/vnd.ms-powerpoint
application/vnd.openxmlformats-officedocument.presentationml.presentation
text/csv
```

5. **OR** set to **"Allow all MIME types"** if that option exists
6. Click **Save**

### Alternative: SQL Fix

If the UI doesn't work, run this SQL in Supabase SQL Editor:

```sql
-- Update the bucket to allow all file types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/csv'
]
WHERE name = 'references';
```

Or allow all:

```sql
-- Allow all MIME types
UPDATE storage.buckets
SET allowed_mime_types = NULL
WHERE name = 'references';
```

---

## Issue 2: Fix Stuck "Analysis Pending" Files

For files that are already uploaded but stuck on "pending", we need to re-trigger the analysis.

### Option A: Manual Retrigger via SQL

```sql
-- Find all pending references
SELECT id, filename, url, metadata->>'type' as type
FROM references
WHERE analysis_status = 'pending';

-- Then for each file, you can manually update to retry
-- Replace {reference_id}, {file_url}, and {file_type} with actual values
```

### Option B: Use Retrigger API Endpoints ✅

Two new endpoints have been added to fix stuck files:

#### 1. Retrigger Single File

```bash
POST http://localhost:3001/api/references/{referenceId}/retrigger-analysis
```

Example using curl:
```bash
curl -X POST http://localhost:3001/api/references/abc-123-def/retrigger-analysis
```

#### 2. Retrigger All Pending Files in a Project

```bash
POST http://localhost:3001/api/references/project/{projectId}/retrigger-all-pending
```

Example using curl:
```bash
curl -X POST http://localhost:3001/api/references/project/77b010bd-2fd1-4d9c-ad85-485d83f8cd6e/retrigger-all-pending
```

This will automatically:
1. Find all references with `analysis_status = 'pending'`
2. Reset their status
3. Retrigger the analysis for each file

**Response:**
```json
{
  "success": true,
  "message": "Retriggered analysis for 3 references",
  "retriggered": 3
}
```

---

## Quick Fix Steps

1. **Fix Supabase Storage** (one-time setup):
   - Go to Supabase Dashboard → Storage → references bucket
   - Set allowed MIME types to include documents, or allow all MIME types

2. **Retrigger Pending Files**:
   - Open browser console on Research Hub page
   - Run this JavaScript:
   ```javascript
   // Get project ID from URL or localStorage
   const projectId = 'your-project-id-here';

   fetch(`http://localhost:3001/api/references/project/${projectId}/retrigger-all-pending`, {
     method: 'POST'
   })
   .then(res => res.json())
   .then(data => console.log(data));
   ```

3. **Try uploading files again** - They should now work!

---

## Testing

After fixing Supabase storage:

1. Try uploading a Word document (.docx)
2. Try uploading an Excel file (.xlsx)
3. Try uploading a PowerPoint file (.pptx)
4. Try uploading a PDF

All should now upload successfully and be analyzed within a few seconds.

---

## Troubleshooting

### Upload still fails with MIME type error
- Double-check Supabase storage bucket settings
- Make sure the bucket is public or has proper RLS policies
- Try the SQL command to update allowed MIME types

### Analysis stays on "pending"
- Check backend logs for errors: `npm run dev` in backend folder
- The analysis happens in background - give it 10-30 seconds
- Use the retrigger endpoint to retry
- Check if ANTHROPIC_API_KEY is set in `.env`

### "Analysis failed" status
- Check backend logs for the specific error
- The ReferenceAnalysisAgent might need to handle that file type differently
- For now, you can manually update the status:
```sql
UPDATE references
SET analysis_status = 'completed',
    metadata = jsonb_set(metadata, '{analysis}', '"Manual analysis"')
WHERE id = 'your-reference-id';
```
