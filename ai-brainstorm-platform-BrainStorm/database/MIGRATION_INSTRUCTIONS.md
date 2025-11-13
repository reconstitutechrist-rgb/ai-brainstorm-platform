# Database Migration Instructions

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard/project/qzeozxwgbuazbinbqcxn
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of the migration file from `database/migrations/`
5. Paste into the SQL editor
6. Click **Run** button

### Option 2: Command Line (Advanced)
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref qzeozxwgbuazbinbqcxn

# Run migration
supabase db push
```

## Pending Migrations

### 010_add_reference_tags.sql
**Status**: ⏳ Pending
**Purpose**: Adds `tags` array and `is_favorite` boolean to references table
**Required for**: Phase 1 - Tags & Organization features

**Instructions**:
1. Open `database/migrations/010_add_reference_tags.sql`
2. Copy entire file content
3. Run in Supabase SQL Editor
4. Verify by running: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'references' AND column_name IN ('tags', 'is_favorite');`

### 011_research_queries.sql
**Status**: ⏳ Pending
**Purpose**: Creates `research_queries` table for tracking AI-driven web research
**Required for**: Phase 2 - Live Web Research Agent

**Instructions**:
1. Open `database/migrations/011_research_queries.sql`
2. Copy entire file content
3. Run in Supabase SQL Editor
4. Verify by running: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'research_queries';`

## Migration History

- ✅ 002_documents_system.sql
- ✅ 003_add_agent_type_column.sql
- ✅ 004_user_sessions.sql
- ✅ 005_sandbox_sessions.sql
- ✅ 006_sandbox_conversations.sql
- ✅ 007_generated_documents.sql
- ✅ 008_document_versions.sql
- ✅ 009_message_embeddings.sql
- ⏳ **010_add_reference_tags.sql** ← **RUN THIS NOW**
- ⏳ **011_research_queries.sql** ← **RUN THIS NOW**
