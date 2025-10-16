# Storage Buckets - Quick Start Guide

## ⚡ 3-Minute Setup

### The Issue
Running `setup-storage-buckets.sql` may give **"must be owner of table objects"** error because:
- Storage tables are owned by Supabase admin
- Regular users can't modify storage policies
- **Solution: Use Supabase Dashboard SQL Editor** (runs with admin privileges automatically)

---

## 🚀 Setup Steps (Choose One Method)

### Method 1: Supabase Dashboard (RECOMMENDED ✅)

**This is the easiest and works immediately!**

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in left sidebar

2. **Create New Query**
   - Click "+ New query"
   - Name it: "Storage Buckets Setup"

3. **Copy & Paste Script**
   - Open: `database/setup-storage-buckets.sql`
   - Select all (Ctrl+A / Cmd+A)
   - Copy (Ctrl+C / Cmd+C)
   - Paste into SQL Editor

4. **Run**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait 2-3 seconds
   - ✅ See success messages in output

5. **Verify**
   - Check "STORAGE BUCKETS VERIFICATION" output
   - Should say: "EXISTS ✓" for both buckets
   - Policy count should be ~10

---

### Method 2: Using Existing Buckets

**If you already created buckets manually:**

The script is **idempotent** - safe to run even if buckets exist!

```sql
ON CONFLICT (id) DO UPDATE SET ...
```

This means:
- ✅ Existing buckets → Updates settings
- ✅ New buckets → Creates them
- ✅ Your files → Stay untouched
- ✅ Old policies → Replaced with secure ones

**Just run the script - it won't break anything!**

---

## 🔍 What the Script Does

### Creates 2 Buckets:

#### 1. `references` (Public)
- **For:** AI analysis files (images, videos, PDFs)
- **Access:** Public URLs
- **Used by:** `/api/references/upload`
- **Max size:** 50MB
- **Types:** Images, videos, PDFs

#### 2. `documents` (Private)
- **For:** User project documents
- **Access:** Authenticated only
- **Used by:** `/api/documents/upload`
- **Max size:** 50MB
- **Types:** Office docs, PDFs, images, archives

### Creates 10 Security Policies:

**Per Bucket (8 total):**
- Upload to own folder only
- Read own files only
- Update own files only
- Delete own files only

**Service Role (2 total):**
- Full access to `references`
- Full access to `documents`

---

## ✅ Verification

After running the script, you should see:

```
========================================
STORAGE BUCKETS VERIFICATION
========================================
References bucket: EXISTS ✓
Documents bucket: EXISTS ✓
Storage policies: 10 created
========================================
```

Plus two result tables showing bucket details and policies.

---

## 🧪 Test It Works

### Test 1: Check in Dashboard
```
Supabase Dashboard → Storage → Buckets
Should see:
- references (public)
- documents (private)
```

### Test 2: API Upload Test
```bash
# From your terminal (backend must be running)
curl -X POST http://localhost:3001/api/documents/upload \
  -F "file=@test.pdf" \
  -F "projectId=test-project-123" \
  -F "userId=test-user-456"
```

**Expected:** `{"success": true, "document": {...}}`

### Test 3: Frontend Test
```
1. Open http://localhost:5173
2. Navigate to Intelligence Hub → Documents
3. Click "Upload Document"
4. Select a file
5. Should upload successfully
```

---

## 🐛 Troubleshooting

### Error: "must be owner of table objects"

**Cause:** Not running as admin/service role

**Fix:** Use Supabase Dashboard SQL Editor (Method 1 above)

---

### Error: "bucket already exists"

**Not a problem!** The script handles this:
```sql
ON CONFLICT (id) DO UPDATE SET ...
```

Just run it - will update settings instead of creating new bucket.

---

### Error: "policy already exists"

**Not a problem!** The script drops old policies first:
```sql
DROP POLICY IF EXISTS "policy_name" ON storage.objects;
```

Just run it - will recreate all policies fresh.

---

### Files Missing After Running Script

**This shouldn't happen** - the script doesn't touch `storage.objects` table.

If it does:
1. Check Supabase logs
2. Verify you ran correct script
3. Restore from backup if needed

**Prevention:** The script only modifies:
- `storage.buckets` (settings)
- `pg_policies` (access rules)
- NOT `storage.objects` (your files)

---

## 📊 Current Status

### Backend
- ✅ File upload service configured
- ✅ Document routes use `documents` bucket
- ✅ Reference routes use `references` bucket
- ✅ Server running: http://localhost:3001

### Frontend
- ✅ Intelligence Hub created
- ✅ Documents tab ready
- ✅ Upload UI implemented
- ✅ Server running: http://localhost:5173

### Database
- ⏳ **PENDING:** Run `setup-storage-buckets.sql`
- ⏳ **PENDING:** Verify buckets created
- ✅ Tables ready: `documents`, `document_folders`
- ✅ Migration scripts ready

---

## 🎯 Next Actions

1. **[ ]** Open Supabase Dashboard
2. **[ ]** Go to SQL Editor
3. **[ ]** Run `setup-storage-buckets.sql`
4. **[ ]** Verify success messages
5. **[ ]** Test file upload
6. **[ ]** Use Intelligence Hub Documents tab

**Time needed:** 3 minutes

---

## 📚 Related Files

- **SQL Script:** `database/setup-storage-buckets.sql` (Run this!)
- **Backend Service:** `backend/src/services/fileUpload.ts`
- **Document Routes:** `backend/src/routes/documents.ts`
- **Frontend UI:** `frontend/src/pages/ProjectIntelligenceHub.tsx`
- **Full Guide:** `DOCUMENT_SYSTEM_SETUP.md`

---

## 🎉 After Setup

You'll be able to:
- ✅ Upload documents via API
- ✅ Upload documents via frontend UI
- ✅ Organize in folders
- ✅ Download documents
- ✅ Move between folders
- ✅ Delete documents
- ✅ Secure user isolation
- ✅ 50MB file limit
- ✅ MIME type validation

**Your document management system will be production-ready!** 🚀

---

## Need Help?

1. **Check the script output** - Error messages are descriptive
2. **Verify Supabase project** - Make sure you're in correct project
3. **Check permissions** - SQL Editor should run as admin automatically
4. **Review logs** - Supabase Dashboard → Logs section
5. **Ask for help** - Check documentation or support

---

**TLDR:** Open Supabase Dashboard → SQL Editor → Paste `setup-storage-buckets.sql` → Run → Done! ✨
