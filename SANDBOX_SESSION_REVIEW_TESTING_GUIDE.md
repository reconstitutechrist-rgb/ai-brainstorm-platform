# Sandbox Session Review System - Testing Guide

## Overview

This guide helps you test the **Enhanced Sandbox Session Review System** that we've implemented. The system allows users to have natural conversations in the sandbox, review ideas, make decisions, and automatically generate documents that integrate with the Intelligence Hub.

---

## What's Been Implemented

### ✅ Backend Complete (9/17 tasks)

**Database:**
- `brainstorm_sessions` table
- Enhanced `sandbox_conversations` table (session_status, final_decisions, completed_at)
- Enhanced `generated_documents` table (source_type, source_id)

**Services:**
- `ContextGroupingService` - AI-powered topic identification
- `SessionReviewAgent` - Natural language decision parsing
- `BrainstormDocumentService` - Document generation
- `SessionCompletionService` - Workflow orchestration

**API Endpoints:**
- 6 session review endpoints
- 5 brainstorm sessions endpoints

**Frontend API Client:**
- `sessionReviewApi` (6 methods)
- `brainstormSessionsApi` (5 methods)

### ⏳ Frontend Pending (8/17 tasks)

- React components for UI (LiveIdeasPanel, SessionReviewModal, etc.)
- Integration with ConversationalSandbox page
- Intelligence Hub session history display

---

## Prerequisites

Before testing, ensure:

1. **Database Migration Applied**
   ```bash
   # Run the migration in Supabase SQL Editor or via CLI
   psql -h your-supabase-host -U postgres -d postgres -f database/migrations/007_brainstorm_sessions.sql
   ```

2. **Backend Running**
   ```bash
   cd backend
   npm run dev
   ```

3. **Environment Variables Set**
   - `ANTHROPIC_API_KEY` - Required for AI agents
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` - Required for database

---

## Testing Strategy

Since frontend components aren't built yet, we'll test using:
1. **Direct API calls** (via Postman, curl, or browser)
2. **Database verification** (checking data in Supabase)
3. **Backend logs** (monitoring console output)

---

## Test 1: Database Migration Verification

### Verify Tables Exist

```sql
-- Check brainstorm_sessions table
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'brainstorm_sessions'
ORDER BY ordinal_position;

-- Check new columns in sandbox_conversations
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sandbox_conversations'
AND column_name IN ('session_status', 'final_decisions', 'completed_at');

-- Check new columns in generated_documents
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'generated_documents'
AND column_name IN ('source_type', 'source_id');
```

### Expected Results

**brainstorm_sessions columns:**
- id (UUID)
- sandbox_id (UUID)
- conversation_id (UUID)
- project_id (UUID)
- session_name (TEXT)
- accepted_ideas (JSONB)
- rejected_ideas (JSONB)
- unmarked_ideas (JSONB)
- generated_document_ids (JSONB)
- updated_document_ids (JSONB)
- metadata (JSONB)
- created_at (TIMESTAMP)

**sandbox_conversations new columns:**
- session_status (TEXT, default 'active')
- final_decisions (JSONB)
- completed_at (TIMESTAMP)

**generated_documents new columns:**
- source_type (TEXT, default 'manual')
- source_id (UUID)

### Verify Indexes

```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('brainstorm_sessions', 'generated_documents')
AND indexname LIKE 'idx_%';
```

**Expected indexes:**
- idx_brainstorm_sessions_project_id
- idx_brainstorm_sessions_sandbox_id
- idx_brainstorm_sessions_conversation_id
- idx_brainstorm_sessions_created_at
- idx_generated_documents_source_type
- idx_generated_documents_source_id

---

## Test 2: Detect End Session Intent (API)

### Setup Test Data

First, you need an active sandbox conversation. If you don't have one:

```sql
-- Get an existing conversation ID, or note one from your app
SELECT id, sandbox_id, session_status
FROM sandbox_conversations
WHERE session_status = 'active'
LIMIT 1;
```

### Test Endpoint

```bash
curl -X POST http://localhost:3001/api/session-review/detect-end-intent \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "I think we are done brainstorming"
  }'
```

### Expected Response

```json
{
  "success": true,
  "isEndIntent": true,
  "confidence": 90
}
```

### Test Variations

```bash
# Should detect as END intent
curl -X POST http://localhost:3001/api/session-review/detect-end-intent \
  -H "Content-Type: application/json" \
  -d '{"userMessage": "Let'\''s wrap this up"}'

# Should NOT detect as END intent
curl -X POST http://localhost:3001/api/session-review/detect-end-intent \
  -H "Content-Type: application/json" \
  -d '{"userMessage": "I want dark mode"}'
```

### Backend Logs to Monitor

```
[SessionReviewAgent] Detecting end intent for message: "I think we are done..."
```

---

## Test 3: Generate Review Summary (API)

### Prerequisites

You need a conversation with extracted ideas. Create test data:

```sql
-- Update a conversation with sample extracted ideas
UPDATE sandbox_conversations
SET extracted_ideas = '[
  {
    "id": "idea-1",
    "source": "user_mention",
    "conversationContext": {
      "messageId": "msg-1",
      "timestamp": "2025-10-23T12:00:00Z",
      "leadingQuestions": []
    },
    "idea": {
      "title": "Dark Mode Toggle",
      "description": "Add dark mode to settings",
      "reasoning": "Better UX for night users",
      "userIntent": "Improve accessibility"
    },
    "status": "refined",
    "evolution": [],
    "tags": ["ui", "accessibility"],
    "innovationLevel": "practical"
  },
  {
    "id": "idea-2",
    "source": "ai_suggestion",
    "conversationContext": {
      "messageId": "msg-2",
      "timestamp": "2025-10-23T12:05:00Z",
      "leadingQuestions": []
    },
    "idea": {
      "title": "OAuth Authentication",
      "description": "Add Google and GitHub login",
      "reasoning": "Faster user onboarding",
      "userIntent": "Simplify login process"
    },
    "status": "exploring",
    "evolution": [],
    "tags": ["auth", "security"],
    "innovationLevel": "moderate"
  }
]'::jsonb
WHERE id = 'YOUR_CONVERSATION_ID';
```

### Test Endpoint

```bash
curl -X POST http://localhost:3001/api/session-review/generate-summary \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_CONVERSATION_ID"
  }'
```

### Expected Response

```json
{
  "success": true,
  "summary": {
    "totalIdeas": 2,
    "topicGroups": [
      {
        "topic": "User Interface Enhancements",
        "icon": "🎨",
        "ideas": [...],
        "messageRange": {...}
      },
      {
        "topic": "Authentication Strategy",
        "icon": "🔐",
        "ideas": [...],
        "messageRange": {...}
      }
    ],
    "summaryText": "Great! Let's review what we discussed. I've identified 2 ideas grouped into 2 topics:..."
  },
  "topicGroups": [...]
}
```

### Verify in Database

```sql
-- Conversation status should be updated to 'reviewing'
SELECT id, session_status, updated_at
FROM sandbox_conversations
WHERE id = 'YOUR_CONVERSATION_ID';
```

**Expected:** `session_status = 'reviewing'`

### Backend Logs to Monitor

```
[ContextGrouping] Grouping 2 ideas from X messages
[ContextGrouping] Identified 2 topics: [...]
[ContextGrouping] Created 2 topic groups
```

---

## Test 4: Parse Decisions (API)

### Test Endpoint

```bash
curl -X POST http://localhost:3001/api/session-review/parse-decisions \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_CONVERSATION_ID",
    "userDecisions": "I want the dark mode and OAuth. I don'\''t want the mobile app."
  }'
```

### Expected Response

```json
{
  "success": true,
  "parsedDecisions": {
    "accepted": [
      {
        "id": "idea-1",
        "idea": {
          "title": "Dark Mode Toggle",
          ...
        }
      },
      {
        "id": "idea-2",
        "idea": {
          "title": "OAuth Authentication",
          ...
        }
      }
    ],
    "rejected": [],
    "unmarked": [],
    "confidence": 95,
    "needsClarification": false,
    "clarificationQuestion": null
  }
}
```

### Test Ambiguous Input

```bash
curl -X POST http://localhost:3001/api/session-review/parse-decisions \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_CONVERSATION_ID",
    "userDecisions": "I want the UI stuff"
  }'
```

**Expected:** `needsClarification: true` with `clarificationQuestion` asking which specific UI ideas.

### Backend Logs to Monitor

```
[SessionReviewAgent] Parsing decisions from user statement: "I want the dark mode..."
[SessionReviewAgent] Total ideas to review: 2
[SessionReviewAgent] Parsed decisions: 2 accepted, 0 rejected, 0 unmarked
```

---

## Test 5: Finalize Session (Full Workflow)

This is the **complete end-to-end test** that creates documents and updates the project.

### Prerequisites

1. Active conversation with extracted ideas
2. Existing `decision_log` and `rejection_log` documents (or test will skip appending)
3. Valid project with items

### Test Endpoint

```bash
curl -X POST http://localhost:3001/api/session-review/finalize \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_CONVERSATION_ID",
    "finalDecisions": {
      "accepted": [
        {
          "id": "idea-1",
          "source": "user_mention",
          "conversationContext": {
            "messageId": "msg-1",
            "timestamp": "2025-10-23T12:00:00Z"
          },
          "idea": {
            "title": "Dark Mode Toggle",
            "description": "Add dark mode to settings",
            "reasoning": "Better UX",
            "userIntent": "Improve accessibility"
          },
          "status": "refined",
          "tags": ["ui"],
          "innovationLevel": "practical"
        }
      ],
      "rejected": [],
      "unmarked": []
    }
  }'
```

### Expected Response

```json
{
  "success": true,
  "sessionSummary": {
    "success": true,
    "sessionId": "uuid-of-new-session",
    "sessionName": "Completed Session - 10/23/2025",
    "documentsCreated": [
      {
        "id": "doc-1",
        "title": "Completed Session - 10/23/2025 - Accepted Ideas",
        "type": "accepted_ideas"
      },
      {
        "id": "doc-2",
        "title": "Completed Session - 10/23/2025 - Rejected Ideas",
        "type": "rejected_ideas"
      }
    ],
    "documentsUpdated": [
      {
        "id": "doc-3",
        "title": "Project Brief",
        "type": "project_brief",
        "previousVersion": 1,
        "newVersion": 2
      },
      {
        "id": "doc-4",
        "title": "Technical Specifications",
        "type": "technical_specs",
        "previousVersion": 1,
        "newVersion": 2
      }
    ],
    "projectItemsAdded": 1,
    "itemsDetails": {
      "decided": 1,
      "exploring": 0
    },
    "sandboxStatus": "completed"
  }
}
```

### Verify in Database

#### 1. Check brainstorm_sessions table

```sql
SELECT
  id,
  session_name,
  jsonb_array_length(accepted_ideas) as accepted_count,
  jsonb_array_length(rejected_ideas) as rejected_count,
  jsonb_array_length(generated_document_ids) as docs_created,
  jsonb_array_length(updated_document_ids) as docs_updated,
  created_at
FROM brainstorm_sessions
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- session_name: "Completed Session - [Today's Date]"
- accepted_count: 1
- rejected_count: 0
- docs_created: 2 (accepted + rejected documents)
- docs_updated: 2+ (project_brief, technical_specs, possibly more)

#### 2. Check generated documents

```sql
SELECT
  id,
  title,
  document_type,
  source_type,
  source_id,
  version,
  created_at
FROM generated_documents
WHERE source_type = 'brainstorm_session'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- 2 new documents with source_type = 'brainstorm_session'
- source_id should match the brainstorm_sessions.id
- One with "Accepted Ideas" in title
- One with "Rejected Ideas" in title

#### 3. Check updated documents

```sql
SELECT
  id,
  title,
  document_type,
  version,
  metadata
FROM generated_documents
WHERE document_type IN ('project_brief', 'technical_specs')
AND metadata @> '{"regeneratedWithBrainstorm": true}'::jsonb
ORDER BY updated_at DESC;
```

**Expected:**
- Version incremented (e.g., 1 → 2)
- metadata.regeneratedWithBrainstorm = true
- metadata.brainstormIdeasIncluded = 1

#### 4. Check project items

```sql
SELECT
  items
FROM projects
WHERE id = 'YOUR_PROJECT_ID';
```

**Expected:**
- New item added to items array
- item.text = "Dark Mode Toggle: Add dark mode to settings"
- item.state = "decided"
- item.metadata.fromBrainstorm = true
- item.metadata.sessionId exists

#### 5. Check conversation status

```sql
SELECT
  id,
  session_status,
  final_decisions,
  completed_at
FROM sandbox_conversations
WHERE id = 'YOUR_CONVERSATION_ID';
```

**Expected:**
- session_status = 'completed'
- final_decisions contains accepted/rejected/unmarked arrays
- completed_at has timestamp

#### 6. Check sandbox status

```sql
SELECT
  id,
  name,
  status,
  updated_at
FROM sandbox_sessions
WHERE id = (
  SELECT sandbox_id
  FROM sandbox_conversations
  WHERE id = 'YOUR_CONVERSATION_ID'
);
```

**Expected:**
- name = "Completed Session - [Date]"
- status = 'saved_as_alternative'
- updated_at = recent timestamp

### Backend Logs to Monitor

```
[SessionCompletion] Starting completion for conversation abc-123
[SessionCompletion] 1 accepted, 0 rejected
[SessionCompletion] Created session record: xyz-789
[BrainstormDocs] Generating documents for session xyz-789
[BrainstormDocs] 1 accepted, 0 rejected
[BrainstormDocs] Created 2 new docs, updated 2 existing docs
[BrainstormDocs] Appended 1 entries to Decision Log
[BrainstormDocs] Regenerating live documents...
[BrainstormDocs] Will regenerate: project_brief, technical_specs
[BrainstormDocs] Regenerating project_brief...
[BrainstormDocs] Regenerating technical_specs...
[SessionCompletion] Added 1 items to project
[SessionCompletion] Session completion successful
```

---

## Test 6: Get Brainstorm Sessions (API)

### Test Endpoint

```bash
curl http://localhost:3001/api/brainstorm-sessions/project/YOUR_PROJECT_ID
```

### Expected Response

```json
{
  "success": true,
  "sessions": [
    {
      "id": "session-uuid",
      "sandbox_id": "sandbox-uuid",
      "conversation_id": "conv-uuid",
      "project_id": "project-uuid",
      "session_name": "Completed Session - 10/23/2025",
      "accepted_ideas": [...],
      "rejected_ideas": [...],
      "unmarked_ideas": [],
      "generated_document_ids": [...],
      "updated_document_ids": [...],
      "metadata": {...},
      "created_at": "2025-10-23T..."
    }
  ]
}
```

---

## Test 7: Get Session Documents (API)

### Test Endpoint

```bash
curl http://localhost:3001/api/brainstorm-sessions/SESSION_ID/documents
```

### Expected Response

```json
{
  "success": true,
  "documents": {
    "generated": [
      {
        "id": "doc-1",
        "title": "Completed Session - 10/23/2025 - Accepted Ideas",
        "document_type": "decision_log",
        "content": "# Completed Session...",
        "version": 1,
        "source_type": "brainstorm_session",
        "source_id": "session-uuid"
      },
      {
        "id": "doc-2",
        "title": "Completed Session - 10/23/2025 - Rejected Ideas",
        "document_type": "rejection_log",
        "content": "# Completed Session...",
        "version": 1,
        "source_type": "brainstorm_session",
        "source_id": "session-uuid"
      }
    ],
    "updated": [
      {
        "id": "doc-3",
        "title": "Project Brief",
        "document_type": "project_brief",
        "version": 2,
        ...
      }
    ]
  }
}
```

---

## Test 8: Get Session Stats (API)

### Test Endpoint

```bash
curl http://localhost:3001/api/brainstorm-sessions/stats/YOUR_PROJECT_ID
```

### Expected Response

```json
{
  "success": true,
  "stats": {
    "totalSessions": 3,
    "totalAcceptedIdeas": 12,
    "totalRejectedIdeas": 5,
    "totalUnmarkedIdeas": 2,
    "mostRecentSession": {
      "id": "session-uuid",
      "session_name": "Completed Session - 10/23/2025",
      ...
    }
  }
}
```

---

## Common Issues & Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution:** Some columns may have been added in previous migrations. Safe to ignore or use `ADD COLUMN IF NOT EXISTS`.

### Issue: "Conversation not found" error

**Solution:** Ensure you're using a valid conversation_id from sandbox_conversations table.

```sql
SELECT id FROM sandbox_conversations WHERE session_status = 'active' LIMIT 1;
```

### Issue: "Document generation failed"

**Possible Causes:**
1. Missing `ANTHROPIC_API_KEY` in environment
2. API rate limiting
3. Invalid project context

**Check logs for:**
```
[BrainstormDocs] Error generating project_brief: ...
```

### Issue: No ideas in conversation

**Solution:** Manually add test ideas to conversation:

```sql
UPDATE sandbox_conversations
SET extracted_ideas = '[...]'::jsonb
WHERE id = 'YOUR_CONVERSATION_ID';
```

### Issue: Documents not appending to Decision/Rejection logs

**Cause:** No existing decision_log or rejection_log documents exist.

**Solution:** Create them first via the "Generate Documents" feature in Intelligence Hub, or the service will skip appending (by design).

---

## Next Steps

After backend testing is complete:

1. **Frontend Components** - Build React UI components
2. **Integration Testing** - Test full user workflow with UI
3. **End-to-End Testing** - Complete session from chat → review → finalization
4. **Intelligence Hub Integration** - Verify session history display

---

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] All tables and columns created
- [ ] All indexes created
- [ ] Backend server starts without errors
- [ ] Test 1: Detect end intent API works
- [ ] Test 2: Generate summary API works
- [ ] Test 3: Parse decisions API works
- [ ] Test 4: Generate confirmation API works
- [ ] Test 5: Finalize session creates all expected data
- [ ] Test 6: Get sessions API returns session list
- [ ] Test 7: Get session documents returns created/updated docs
- [ ] Test 8: Get stats API returns correct counts
- [ ] Database verification: brainstorm_sessions records created
- [ ] Database verification: generated_documents created with correct source_type
- [ ] Database verification: project items updated with accepted ideas
- [ ] Database verification: conversation status updated to 'completed'
- [ ] Database verification: sandbox status updated to 'saved_as_alternative'
- [ ] Backend logs show successful workflow execution

---

## Support

If you encounter issues:

1. Check backend console logs for detailed error messages
2. Verify database state with SQL queries above
3. Ensure all environment variables are set
4. Check Supabase RLS policies if permission errors occur
5. Verify ANTHROPIC_API_KEY is valid and has quota

---

**Testing Status:** Backend fully implemented and ready for testing
**Last Updated:** October 25, 2025
**Version:** 1.0
