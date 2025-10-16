# Generated Documents Migration - Quick Reference

## TL;DR

**Check Your Type:**
```sql
SELECT data_type FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'user_id';
```

- **Returns `uuid`** → Run `007_generated_documents.sql` only ✅
- **Returns `text`** → Run BOTH migrations in order ⚠️

---

## Path A: UUID Already Correct (5 minutes)

```sql
-- 1. Run this in Supabase SQL Editor:
-- Copy/paste: migrations/007_generated_documents.sql

-- 2. Verify:
SELECT * FROM generated_documents LIMIT 1;

-- Done! ✅
```

---

## Path B: Need TYPE→UUID Fix (15-20 minutes)

### ⚠️ PRE-REQUISITES
- [ ] Full database backup created
- [ ] Tested in staging environment
- [ ] Scheduled maintenance window

### Steps

**1. Validate** (2 min)
```sql
-- Run Step 1 from: migrations/007b_fix_user_id_type_COMPLETE.sql
-- Expected: 0 rows (no invalid UUIDs)
```

**2. Backup Policies** (2 min)
```sql
-- Run Step 2 from: migrations/007b_fix_user_id_type_COMPLETE.sql
-- SAVE OUTPUT to policies_backup.sql
```

**3. Run Migration** (5 min)
```sql
-- Copy/paste entire: migrations/007b_fix_user_id_type_COMPLETE.sql
-- Executes Steps 3-7 automatically
```

**4. Verify** (2 min)
```sql
-- Run Step 8 from migration file
-- Expected: All show 'uuid' and '✓ SUCCESS'
```

**5. Run Main Migration** (2 min)
```sql
-- Copy/paste: migrations/007_generated_documents.sql
```

**6. Final Check** (1 min)
```sql
SELECT * FROM generated_documents LIMIT 1;
SELECT policyname FROM pg_policies WHERE tablename = 'generated_documents';
-- Should show 2 policies
```

---

## Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `007_generated_documents.sql` | Creates table + RLS | Always (everyone) |
| `007b_fix_user_id_type_COMPLETE.sql` | Fixes TEXT→UUID | Only if user_id is TEXT |
| `GENERATED_DOCS_MIGRATION_GUIDE.md` | Full documentation | Read for details |
| `MIGRATION_QUICK_REFERENCE.md` | This file | Quick steps |

---

## Common Errors

### "operator does not exist: text = uuid"
→ Your user_id is TEXT. Run migration 007b first.

### "permission denied for table"
→ Backend must use service_role key, not anon key

### "duplicate key value"
→ Use UPSERT, not INSERT (project + type is unique)

---

## Rollback

**Fastest:**
```
Supabase Dashboard → Database → Backups → Restore
```

**Manual:**
```sql
DROP TABLE IF EXISTS generated_documents CASCADE;
-- Then restore from policies_backup.sql if needed
```

---

## Testing

```bash
# Backend API test
curl -X POST localhost:3001/api/generated-documents/generate \
  -H "Content-Type: application/json" \
  -d '{"projectId": "uuid-here"}'

# Should return: 4 generated documents
```

---

## Support

Full guide: `database/GENERATED_DOCS_MIGRATION_GUIDE.md`

Supabase logs: Dashboard → Database → Logs
