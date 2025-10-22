# Database Migration 013: Reference & Document Embeddings

**Status**: Ready to Run
**Purpose**: Enable semantic search across references and generated documents for unified research
**Estimated Time**: 5-10 minutes

---

## What This Migration Does

This migration adds vector embedding capabilities to:
- **References table** (uploaded files, URLs, documents)
- **Generated_documents table** (AI-generated project docs)

This enables the **Unified Research System** to search across ALL your project knowledge using semantic similarity.

---

## Prerequisites

Before running this migration, ensure:

✅ Migration 009 (message_embeddings) has been run
✅ PostgreSQL pgvector extension is installed
✅ You have database admin access
✅ OpenAI API key is configured (for generating embeddings)

---

## Step 1: Run the Database Migration

### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of:
   ```
   database/migrations/013_reference_embeddings.sql
   ```
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for confirmation: "Success. No rows returned"

### Option B: Supabase CLI

```bash
cd database/migrations
supabase db push --file 013_reference_embeddings.sql
```

### Option C: Direct PostgreSQL

```bash
psql your_database_url < database/migrations/013_reference_embeddings.sql
```

---

## Step 2: Verify Migration

Run this query to verify the migration was successful:

```sql
-- Check that embedding columns exist
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('references', 'generated_documents')
    AND column_name LIKE 'embedding%'
ORDER BY table_name, column_name;
```

You should see:
- `references.embedding` (vector)
- `references.embedding_model` (varchar)
- `references.embedding_generated_at` (timestamp)
- `generated_documents.embedding` (vector)
- `generated_documents.embedding_model` (varchar)
- `generated_documents.embedding_generated_at` (timestamp)

---

## Step 3: Verify Functions

Check that the new search functions exist:

```sql
-- List all embedding-related functions
SELECT
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE '%semantic%' OR proname LIKE '%embedding%';
```

You should see:
- `search_semantic_similarity`
- `search_similar_references`
- `search_similar_documents`
- `count_missing_embeddings`

---

## Step 4: Generate Embeddings for Existing Data (Optional)

If you have existing references or generated documents, run the backfill script:

### Backfill All Projects

```bash
npm run backfill-embeddings
```

### Backfill Specific Project

```bash
npx ts-node backend/src/scripts/backfillEmbeddings.ts <projectId>
```

**Note:** This can take time depending on how many references/documents you have. The script processes in batches of 50 and shows progress.

---

## Step 5: Test the Unified Research System

1. Navigate to **Research Hub** → **Unified Research** tab
2. Enter a test query (e.g., "What have we decided about authentication?")
3. Select **Sources**: "Documents" or "Auto"
4. Click **Start Unified Research**
5. Verify results include both:
   - Web sources (if applicable)
   - Project documents with relevance scores

---

## What Happens Automatically After Migration

### For NEW References (Uploaded After Migration)

✅ When a file is uploaded → analyzed → **embedding automatically generated**
✅ Embedding generated from:
   - Extracted content (for documents/images)
   - Analysis text (fallback)

### For NEW Generated Documents

✅ When a document is generated → **embedding automatically generated**
✅ Embedding generated from document content

### For Unified Research

✅ Searches across BOTH web and documents
✅ Uses semantic similarity to find relevant content
✅ Returns results ranked by relevance score

---

## Checking Migration Status

### Count Missing Embeddings

```sql
SELECT * FROM count_missing_embeddings('your-project-id');
```

Returns:
- `references_without_embeddings`: Number of references missing embeddings
- `documents_without_embeddings`: Number of docs missing embeddings
- `total_missing`: Total missing

### Sample Semantic Search

```sql
-- This won't work directly in SQL (needs embedding vector)
-- But you can test via the API or backfill script
```

---

## Troubleshooting

### Issue: "Extension vector does not exist"

**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: "Function search_semantic_similarity does not exist"

**Solution:**
- Re-run the migration file
- Check that all SQL statements executed successfully

### Issue: "OpenAI API key not configured"

**Solution:**
- Add valid `OPENAI_API_KEY` to `.env` file
- Embeddings require OpenAI API access

### Issue: Embeddings not generated for new uploads

**Solution:**
- Check backend logs for errors
- Verify OpenAI API key is valid
- Check that references are being analyzed (analysis_status = 'completed')

### Issue: Backfill script fails

**Solution:**
- Check OpenAI API quota/limits
- Verify database connection
- Run for specific project instead of all projects

---

## Performance Notes

### Index Performance

- **IVFFlat index** with lists=100 is optimal for ~10,000 vectors
- If you have significantly more references, you may want to increase the lists parameter
- Index is created automatically by the migration

### Generation Speed

- **Embedding generation**: ~100ms per item (OpenAI API)
- **Batch processing**: 50 items at a time to respect rate limits
- **Async generation**: Doesn't block uploads/document creation

### Storage Impact

- Each embedding: ~6KB (1536 dimensions × 4 bytes/float)
- 1,000 references = ~6MB additional storage
- Minimal impact for most projects

---

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Remove embedding columns from references
ALTER TABLE references
DROP COLUMN IF EXISTS embedding,
DROP COLUMN IF EXISTS embedding_model,
DROP COLUMN IF EXISTS embedding_generated_at;

-- Remove embedding columns from generated_documents
ALTER TABLE generated_documents
DROP COLUMN IF EXISTS embedding,
DROP COLUMN IF EXISTS embedding_model,
DROP COLUMN IF EXISTS embedding_generated_at;

-- Drop functions
DROP FUNCTION IF EXISTS search_semantic_similarity;
DROP FUNCTION IF EXISTS search_similar_references;
DROP FUNCTION IF EXISTS search_similar_documents;
DROP FUNCTION IF EXISTS count_missing_embeddings;

-- Drop indexes
DROP INDEX IF EXISTS references_embedding_idx;
DROP INDEX IF EXISTS generated_documents_embedding_idx;
```

---

## Success Criteria

✅ Migration runs without errors
✅ New columns visible in database schema
✅ Search functions created successfully
✅ New uploads automatically get embeddings
✅ Unified research returns document results
✅ Backfill script completes (if run)

---

## Next Steps After Migration

1. **Test unified research** with various queries
2. **Run backfill script** for existing data (optional but recommended)
3. **Monitor backend logs** for embedding generation
4. **Check embedding counts** periodically: `count_missing_embeddings()`
5. **Use unified research** as primary research tool

---

## Support

If you encounter issues:

1. Check backend logs: `npm run dev` (look for `[Embedding]` messages)
2. Verify database schema changes
3. Test with simple queries first
4. Check OpenAI API status/quota

---

**🎉 Once complete, your unified research system will search across ALL project knowledge!**

---

*Migration created: 2025-10-21*
*Part of: Phase 3.3 - Unified Research System*
