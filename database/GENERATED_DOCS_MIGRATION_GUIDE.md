# Generated Documents Migration Guide

## Overview
This guide helps you successfully migrate the generated_documents table and resolve any RLS policy issues.

## Files in This Migration

1. **`migrations/007_generated_documents.sql`** - Main migration (creates table, indexes, RLS)
2. **`migrations/007b_fix_user_id_type_COMPLETE.sql`** - Complete TEXT→UUID conversion (if needed)
3. **`GENERATED_DOCS_MIGRATION_GUIDE.md`** - This guide

## Quick Start: Do I Need the Type Fix Migration?

### Test Query
Run this in Supabase SQL Editor:

```sql
-- Check current user_id type
SELECT data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'user_id';
```

**Result:**
- Returns `uuid` → ✅ **Skip to Step 1** (you're good!)
- Returns `text` or `character varying` → ⚠️ **You MUST run both migrations**

---

## Migration Path A: UUID Already Correct (Simple)

If your `projects.user_id` is already `uuid` type:

### Step 1: Run Main Migration

In Supabase SQL Editor:
```sql
-- Copy/paste entire contents of:
-- migrations/007_generated_documents.sql
```

### Step 2: Verify

```sql
SELECT * FROM generated_documents LIMIT 1;
```

**Success:** No errors → You're done! ✅

**Error:** See Troubleshooting section below

---

## Migration Path B: TEXT→UUID Conversion Required (Complex)

If your `projects.user_id` is `text` type, follow this **8-step process** carefully:

### ⚠️ CRITICAL PRE-REQUISITES

1. **Create full database backup** (Supabase Dashboard → Database → Backup)
2. **Schedule maintenance window** (5-10 minutes downtime)
3. **Save all work** and test in a staging environment first
4. **Have rollback plan ready**

### Step 1: Pre-flight Validation

Run the validation query from `007b_fix_user_id_type_COMPLETE.sql` (Step 1):

```sql
SELECT 'projects' as table_name, user_id, 'INVALID UUID' as issue
FROM projects
WHERE user_id IS NOT NULL
  AND user_id !~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
-- ... (full query in migration file)
LIMIT 10;
```

**Expected:** 0 rows (empty)

**If you see rows:** ❌ STOP! You have invalid UUID strings. Fix them first:

```sql
-- Example fix for invalid user_id
UPDATE projects
SET user_id = gen_random_uuid()::text
WHERE user_id !~* '^[0-9a-fA-F]{8}-...';  -- Replace with valid UUID
```

### Step 2: Export Existing Policies (BACKUP!)

Run the policy export query from `007b` (Step 2) and **SAVE THE OUTPUT** to a file:

```sql
SELECT
  'CREATE POLICY ' || quote_ident(pol.polname) || ...
-- ... (full query in migration file)
```

**CRITICAL:** Save this output to `policies_backup.sql` on your local machine!

### Step 3: Run Complete Migration

Copy the **entire** `007b_fix_user_id_type_COMPLETE.sql` file into Supabase SQL Editor.

**Execute Steps 3-7** (the migration will):
1. Drop all existing policies
2. Disable RLS
3. Convert columns TEXT → UUID
4. Recreate policies with UUID support
5. Re-enable RLS

### Step 4: Verify Conversion

Run the verification query (Step 8 in migration file):

```sql
SELECT
  table_name,
  data_type,
  CASE WHEN data_type = 'uuid' THEN '✓ SUCCESS' ELSE '✗ FAILED' END as status
-- ... (full query in migration file)
```

**Expected:** All show `uuid` type and `✓ SUCCESS`

### Step 5: Verify Policies

```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('projects','messages','references','document_folders','documents','agent_activity')
GROUP BY tablename;
```

**Expected:**
- projects: 4 policies
- messages: 2 policies
- references: 4 policies
- document_folders: 4 policies
- documents: 4 policies
- agent_activity: 1 policy

### Step 6: Test User Access

```sql
-- As authenticated user
SELECT * FROM projects WHERE user_id = auth.uid();
```

**Expected:** Returns your projects (no permission errors)

### Step 7: Run Main Migration

Now run `007_generated_documents.sql`:

```sql
-- Copy/paste entire contents of:
-- migrations/007_generated_documents.sql
```

### Step 8: Final Verification

```sql
-- Test generated_documents table
SELECT * FROM generated_documents LIMIT 1;

-- Verify RLS on generated_documents
SELECT policyname FROM pg_policies WHERE tablename = 'generated_documents';
-- Should show 2 policies
```

**Success:** All queries work → Migration complete! 🎉

---

## Backend API Configuration

### Environment Variables

Ensure your backend uses the **service_role** key (not anon key):

```env
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Service role key (full access)
```

### Backend Usage Example

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← Service role for backend
);

// Backend can generate documents (bypasses RLS)
const { data, error } = await supabase
  .from('generated_documents')
  .insert({
    project_id: 'uuid-here',
    document_type: 'project_brief',
    title: 'Project Brief',
    content: '# My Project\n\nContent here...'
  });
```

### Frontend Usage Example

```typescript
import { supabase } from './supabase';  // Uses anon key + user auth

// Frontend can only SELECT from their own projects
const { data, error } = await supabase
  .from('generated_documents')
  .select('*')
  .eq('project_id', projectId);  // RLS ensures user owns this project

// INSERT/UPDATE/DELETE will fail (only service_role can do this)
```

---

## Troubleshooting

### Error: "operator does not exist: text = uuid"

**Cause:** Your `user_id` columns are TEXT but policies expect UUID

**Solution:** Run migration `007b_fix_user_id_type_COMPLETE.sql` (see Path B above)

### Error: "permission denied for table generated_documents"

**Cause:** Not using service_role key in backend

**Solution:**
```typescript
// Wrong (uses anon key):
const supabase = createClient(url, anonKey);

// Correct (uses service role):
const supabase = createClient(url, serviceRoleKey);
```

### Error: "duplicate key value violates unique constraint"

**Cause:** Each project can only have ONE document per type

**Solution:** Use UPSERT instead of INSERT:

```typescript
const { data, error } = await supabase
  .from('generated_documents')
  .upsert({
    project_id,
    document_type: 'project_brief',
    title: 'Updated Brief',
    content: 'New content...'
  }, {
    onConflict: 'project_id,document_type'  // Key for UPSERT
  });
```

### Error: "relation 'generated_documents' does not exist"

**Cause:** Haven't run migration `007_generated_documents.sql` yet

**Solution:** Run the main migration first

### Migration Failed Mid-Way

**Recovery Steps:**

1. **Check what failed:**
```sql
-- See current state
SELECT data_type FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'user_id';
```

2. **Restore policies from backup:**
```sql
-- Use the policies_backup.sql you saved in Step 2
-- Run those CREATE POLICY statements
```

3. **Restore from database backup:**
```
Supabase Dashboard → Database → Backups → Restore
```

---

## Testing Locally

### Create Test Data

```sql
-- Create a test project
INSERT INTO projects (user_id, title, description)
VALUES (
  auth.uid(),  -- Current user
  'Test Project',
  'Testing generated documents'
);

-- Generate a test document (run in backend with service_role)
INSERT INTO generated_documents (
  project_id,
  document_type,
  title,
  content
) VALUES (
  (SELECT id FROM projects WHERE title = 'Test Project' LIMIT 1),
  'project_brief',
  'Test Project - Brief',
  '# Test Project\n\nThis is a test document.'
);
```

### Verify RLS Works

```sql
-- As authenticated user (should work)
SELECT * FROM generated_documents
WHERE project_id IN (SELECT id FROM projects WHERE user_id = auth.uid());

-- Try to SELECT from another user's project (should return 0 rows)
SELECT * FROM generated_documents
WHERE project_id = '00000000-0000-0000-0000-000000000001';  -- Not your project
```

---

## Schema Verification

### Check All Tables Consistency

```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE column_name = 'user_id'
  AND table_schema = 'public'
ORDER BY table_name;
```

**Recommended Result:** All `user_id` columns should be `uuid` type

### Check RLS Status

```sql
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'projects', 'messages', 'references',
    'document_folders', 'documents',
    'agent_activity', 'generated_documents'
  )
ORDER BY tablename;
```

**Expected:** All tables show `rls_enabled = true`

---

## Rollback Plan

### If Migration Needs to be Undone

**Option A: Restore from Backup (Safest)**
```
Supabase Dashboard → Database → Backups → Restore to point before migration
```

**Option B: Manual Rollback**

1. **Drop generated_documents table:**
```sql
DROP TABLE IF EXISTS generated_documents CASCADE;
```

2. **Restore original policies:**
```sql
-- Run your saved policies_backup.sql file
```

3. **Convert UUID back to TEXT (if needed):**
```sql
-- ONLY if you ran 007b and need to revert
ALTER TABLE projects ALTER COLUMN user_id TYPE text USING user_id::text;
-- Repeat for other tables...
```

**Option C: Keep UUID, Just Drop New Table**
```sql
-- If 007b worked fine but you want to remove generated_documents
DROP TABLE IF EXISTS generated_documents CASCADE;
```

---

## Next Steps After Successful Migration

1. ✅ **Test document generation:**
```bash
# In your backend
curl -X POST http://localhost:3001/api/generated-documents/generate \
  -H "Content-Type: application/json" \
  -d '{"projectId": "your-project-uuid"}'
```

2. ✅ **Test frontend viewing:**
```typescript
// Navigate to Intelligence Hub → Generated Docs tab
// Should load without errors
```

3. ✅ **Verify performance:**
```sql
-- Check query plan for policy checks
EXPLAIN ANALYZE
SELECT * FROM generated_documents
WHERE project_id = 'uuid-here';
```

4. ✅ **Monitor logs:**
```
Supabase Dashboard → Database → Logs
Look for any policy violations or errors
```

5. ✅ **Update application code:**
```typescript
// Ensure all code uses UUID, not TEXT
const userId: string = user.id;  // ✅ UUID string
```

---

## Production Checklist

Before deploying to production:

- [ ] Tested migration in staging environment
- [ ] Created full database backup
- [ ] Exported all existing policies (Step 2)
- [ ] Verified all user_id values are valid UUIDs
- [ ] Scheduled maintenance window
- [ ] Tested rollback procedure
- [ ] Updated backend to use service_role key
- [ ] Verified RLS policies work correctly
- [ ] Load tested with realistic data volumes
- [ ] Monitored for 24 hours post-migration

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **UUID Type:** https://www.postgresql.org/docs/current/datatype-uuid.html

## Questions?

If you encounter issues:
1. Check Supabase Dashboard → Database → Logs
2. Review saved policy backup
3. Test queries in SQL Editor with `EXPLAIN ANALYZE`
4. Verify backend is using correct API key

---

**Migration Guide Version:** 2.0
**Last Updated:** 2025
**Compatibility:** Supabase PostgreSQL 15+
