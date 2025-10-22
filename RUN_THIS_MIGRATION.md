# ⚠️ IMPORTANT: Run Database Migration

## Status: ⏳ PENDING - Must be run before testing Live Research

**Backend is ready and running**, but the database table doesn't exist yet.

---

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
Go to: https://supabase.com/dashboard/project/qzeozxwgbuazbinbqcxn

### 2. Open SQL Editor
- Click "SQL Editor" in the left sidebar
- Click "New Query"

### 3. Copy Migration SQL
Open this file: `database/migrations/011_research_queries.sql`

Copy the entire contents (all 33 lines)

### 4. Paste and Execute
- Paste into the SQL Editor
- Click "Run" button (or press Ctrl+Enter / Cmd+Enter)

### 5. Verify Success
You should see: ✅ Success. No rows returned

Run this verification query:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'research_queries'
ORDER BY ordinal_position;
```

You should see these columns:
- id (uuid)
- project_id (uuid)
- user_id (text)
- query (text)
- status (text)
- max_sources (integer)
- results_count (integer)
- metadata (jsonb)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)

---

## What This Migration Does

Creates the `research_queries` table for tracking AI-driven web research:
- **Status tracking**: pending → processing → completed/failed
- **Progress metadata**: synthesis, sources, savedReferences, duration
- **Optimized indexes**: For fast queries by project, user, status, date
- **Foreign key**: Cascades delete when project is deleted

---

## After Running Migration

✅ Navigate to: http://localhost:5173/live-research
✅ Submit a research query
✅ Watch it process in real-time
✅ View synthesis and sources
✅ Export results as markdown

---

**Estimated time**: 2 minutes
**Risk level**: Low (idempotent - safe to run multiple times due to IF NOT EXISTS)

🚀 Once complete, Phase 2 will be fully functional!
