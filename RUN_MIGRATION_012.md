# Database Migration 012: Document Research Conversations

## ⚠️ ACTION REQUIRED

Before using the new Document Research Agent features, you need to run this database migration.

## What This Migration Does

1. **Adds Conversation Support to Research Queries**
   - `conversation_thread` column: Stores full conversation history
   - `session_type` column: Distinguishes between 'quick' and 'conversational' sessions

2. **Adds Smart File System to Generated Documents**
   - `folder_category` column: Categorizes documents (software_technical, business, development)
   - `completion_percent` column: Tracks how complete a document is (0-100%)
   - `missing_fields` column: Lists fields that need to be filled

3. **Creates Performance Indexes**
   - Speeds up folder queries
   - Speeds up completion status queries
   - Optimizes conversation search

## How to Run

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `database/migrations/012_document_research_conversations.sql`
5. Click **Run**
6. Verify success (should see "Success. No rows returned")

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
cd database/migrations
supabase db push --file 012_document_research_conversations.sql
```

### Option 3: psql (if you have direct database access)

```bash
psql postgresql://[YOUR_CONNECTION_STRING] < database/migrations/012_document_research_conversations.sql
```

## Verification

After running the migration, verify it worked:

```sql
-- Check research_queries columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'research_queries'
  AND column_name IN ('conversation_thread', 'session_type');

-- Check generated_documents columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'generated_documents'
  AND column_name IN ('folder_category', 'completion_percent', 'missing_fields');

-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('research_queries', 'generated_documents')
  AND indexname LIKE 'idx_%';
```

You should see:
- 2 new columns in `research_queries`
- 3 new columns in `generated_documents`
- 5 new indexes

## Rollback (if needed)

If something goes wrong, you can rollback:

```sql
-- Remove columns from research_queries
ALTER TABLE research_queries DROP COLUMN IF EXISTS conversation_thread;
ALTER TABLE research_queries DROP COLUMN IF EXISTS session_type;

-- Remove columns from generated_documents
ALTER TABLE generated_documents DROP COLUMN IF EXISTS folder_category;
ALTER TABLE generated_documents DROP COLUMN IF EXISTS completion_percent;
ALTER TABLE generated_documents DROP COLUMN IF EXISTS missing_fields;

-- Remove indexes
DROP INDEX IF EXISTS idx_generated_documents_folder_category;
DROP INDEX IF EXISTS idx_generated_documents_completion;
DROP INDEX IF EXISTS idx_research_queries_session_type;
DROP INDEX IF EXISTS idx_research_queries_conversation_thread;
```

## Next Steps

After running this migration successfully:
1. ✅ Mark this as complete
2. ✅ The Document Research Agent features will be ready to use
3. ✅ Continue implementation (backend services, agent, frontend)

---

**Status**: ⏳ Pending - Run this migration before testing Phase 3.1 features
