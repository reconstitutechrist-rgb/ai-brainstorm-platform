# 📖 Session Management - Complete Setup Guide

## Overview

This guide walks you through setting up the session management system for the AI Brainstorm Platform. The system tracks user sessions, provides analytics, and helps users understand their progress over time.

---

## Prerequisites

- Access to your Supabase project dashboard
- Database connection configured in `.env`
- Backend server installed and ready to run

---

## Quick Setup (Recommended)

**If you're experiencing issues** where sessions aren't being recorded, follow the [Quick Fix Guide](SESSION_FIX_README.md) instead.

---

## Full Setup Instructions

### Step 1: Apply Database Migration (5 minutes)

The session management system requires two database tables and several functions. These are now included in the main schema, but if you have an existing database, you'll need to apply the migration.

#### Option A: New Installation

If you're setting up a fresh database:

1. **Run the complete schema**
   - Open Supabase Dashboard → SQL Editor
   - Click "New Query"
   - Copy the entire contents of `database/schema.sql`
   - Paste and click "Run"

The session tables are included in the schema starting from line 218.

#### Option B: Existing Installation (Migration Required)

If you already have a database running:

1. **Apply the session migration**
   - Open Supabase Dashboard → SQL Editor
   - Click "New Query"
   - Copy the entire contents of `database/APPLY_SESSION_MIGRATION.sql`
   - Paste and click "Run"
   - You should see: "Success. No rows returned"

2. **What gets created:**
   - `user_sessions` table - Individual session records with state snapshots
   - `session_analytics` table - Pre-computed analytics for fast queries
   - 7 indexes - For optimized queries
   - 2 database functions - `get_time_since_last_session()` and `get_session_summary()`
   - 2 triggers - Auto-update timestamps
   - Row Level Security policies

---

### Step 2: Verify Installation (2 minutes)

Run the verification script to ensure everything was created correctly:

1. **Run verification**
   - In Supabase SQL Editor, click "New Query"
   - Copy the entire contents of `database/verify-session-tables.sql`
   - Paste and click "Run"

2. **Check results**

You should see 8 sections of checks, all showing ✅:

```
Section 1: Table Existence
✅ user_sessions EXISTS
✅ session_analytics EXISTS

Section 2: Table Structure
✅ user_sessions has all required columns
✅ session_analytics has all required columns

Section 3: Database Functions
✅ get_time_since_last_session EXISTS
✅ get_session_summary EXISTS

Section 4: Indexes
✅ All 7 indexes created

Section 5: Row Level Security
✅ RLS enabled on both tables

Section 6: RLS Policies
✅ Policies created for both tables

Section 7: Triggers
✅ Triggers configured for both tables

Section 8: Sample Query Test
✅ Tables are queryable
```

**If any checks show ❌:**
- Re-run the migration script (`APPLY_SESSION_MIGRATION.sql`)
- Check for error messages in the SQL output
- See [Troubleshooting](#troubleshooting) section below

---

### Step 3: Start Backend Server (1 minute)

```bash
cd backend
npm run dev
```

**Look for these initialization messages:**

```
✓ Supabase client initialized
✓ Agent System Initialized: 9 active agents (5 core + 4 support)
✓ Session Service initialized
Server running on http://localhost:3001
```

---

### Step 4: Test Session Creation (2 minutes)

1. **Start the frontend** (in a separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open the application** in your browser (usually `http://localhost:5173`)

3. **Create or open a project**

4. **Click "Start Session" button**

5. **Check backend console** - you should see:
   ```
   [SessionService] 🆕 No active session, creating new one
   [SessionService] ✅ Session created successfully: [uuid]
   ```

6. **Check browser console** (F12 → Console tab) - you should see:
   ```
   [SessionStore] ✅ Session started successfully
   ```

7. **Verify in database:**
   - In Supabase SQL Editor, run:
   ```sql
   SELECT * FROM user_sessions ORDER BY session_start DESC LIMIT 5;
   ```
   - You should see your session record!

---

## What You'll See

### Successful Session Start

**Backend Console:**
```
[SessionService] 🆕 No active session, creating new one
[SessionService] ✅ Session created successfully: 123e4567-e89b-12d3-a456-426614174000
```

**Browser Console:**
```
[SessionStore] ✅ Session started successfully
```

**Session History Modal:**
- Session appears in the list
- Shows start time
- Shows "In Progress" status
- Displays project state snapshot

### Common Error Messages

If setup is incomplete, you'll see helpful error messages:

**Backend Console - Missing Tables:**
```
[SessionService] ❌ ERROR: user_sessions table does not exist!
[SessionService] 📋 ACTION REQUIRED: Apply database migration
[SessionService] 📄 Run: database/APPLY_SESSION_MIGRATION.sql in Supabase SQL Editor
[SessionService] 📖 See: SESSION_SETUP_GUIDE.md for instructions
```

**Backend Console - Missing Functions:**
```
[SessionService] ❌ ERROR: get_session_summary function does not exist!
[SessionService] 📋 ACTION REQUIRED: Apply database migration
[SessionService] 📄 Run: database/APPLY_SESSION_MIGRATION.sql
```

**Frontend Error Message:**
```
⚠️ Session data unavailable. Database setup may be required - see SESSION_SETUP_GUIDE.md
```

**Action:** Follow [Step 1](#step-1-apply-database-migration-5-minutes) to apply the migration.

---

## Session Features

Once set up, the session system provides:

### 1. Session Tracking
- Automatic session start/end
- State snapshots at session start
- Duration tracking
- Activity timestamps

### 2. Session Analytics
- Items decided since last session
- Items currently exploring
- Items parked
- Total decided items across all sessions

### 3. Session Summaries
- Time since last session (human-readable)
- Progress metrics
- Suggested next steps
- Active blockers
- Pending questions

### 4. Session History
- View all past sessions
- See what was decided in each session
- Compare project states over time
- Track productivity patterns

---

## Usage

### Starting a Session

Click the "Start Session" button in the UI. The system will:
1. Check for an active session
2. If found, reuse it (no duplicate sessions)
3. If not found, create a new session
4. Capture current project state as snapshot
5. Mark session as active

### Ending a Session

Click the "End Session" button. The system will:
1. Update session_end timestamp
2. Mark session as inactive
3. Update analytics
4. Make session available in history

### Viewing Session History

Click the "Session History" button to see:
- All completed sessions
- Session duration
- Items decided during session
- Project state snapshots

---

## Troubleshooting

### Problem: "Session data unavailable" message

**Cause:** Database tables don't exist yet

**Solution:** Apply the migration script
1. Open [APPLY_SESSION_MIGRATION.sql](APPLY_SESSION_MIGRATION.sql)
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click "Run"

See the [Quick Fix Guide](SESSION_FIX_README.md) for detailed steps.

---

### Problem: Backend shows "user_sessions table does not exist"

**Cause:** Migration not applied

**Solution:**
1. Follow [Step 1](#step-1-apply-database-migration-5-minutes)
2. Run verification script to confirm
3. Restart backend server

---

### Problem: Backend shows "get_session_summary function does not exist"

**Cause:** Database functions weren't created

**Solution:**
1. Re-run `database/APPLY_SESSION_MIGRATION.sql`
2. Ensure you see "Success. No rows returned"
3. Run verification script
4. Restart backend

---

### Problem: Tables exist but still no data

**Possible causes:**
1. Old backend process still running
2. Browser cache issues
3. Database permissions issues

**Solution:**
1. Restart backend server (Ctrl+C, then `npm run dev`)
2. Clear browser cache and reload
3. Check Supabase logs for permission errors
4. Run verification script to check RLS policies

---

### Problem: Verification script shows missing indexes

**Cause:** Migration script didn't complete fully

**Solution:**
1. Check Supabase SQL output for errors
2. Re-run the migration script
3. If errors persist, run each section of the migration individually
4. Check database table space and limits

---

### Problem: Multiple active sessions for same project

**Cause:** Session cleanup failed or duplicate creation

**Solution:**
1. Manually end old sessions:
   ```sql
   UPDATE user_sessions
   SET session_end = NOW(), is_active = false
   WHERE user_id = 'your-user-id'
   AND project_id = 'your-project-id'
   AND is_active = true;
   ```
2. Check backend logs for errors in endActiveSession()
3. Restart backend to clear any stuck state

---

## Database Schema Reference

### user_sessions Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | User identifier |
| project_id | UUID | Foreign key to projects |
| session_start | TIMESTAMP | When session started |
| session_end | TIMESTAMP | When session ended (null if active) |
| is_active | BOOLEAN | Is this session currently active? |
| snapshot_at_start | JSONB | Project state at session start |
| metadata | JSONB | Additional session metadata |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

### session_analytics Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | User identifier |
| project_id | UUID | Foreign key to projects |
| last_activity | TIMESTAMP | Most recent user activity |
| previous_activity | TIMESTAMP | Previous activity timestamp |
| items_decided_since_last | INTEGER | Items decided since last session |
| items_exploring | INTEGER | Current exploring items count |
| items_parked | INTEGER | Current parked items count |
| pending_questions | INTEGER | Unanswered questions count |
| suggested_next_steps | JSONB | Array of suggested actions |
| active_blockers | JSONB | Array of current blockers |
| analytics_data | JSONB | Additional computed metrics |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

---

## Related Documentation

- **[SESSION_FIX_README.md](SESSION_FIX_README.md)** - Quick fix for "sessions not recording" issue
- **[verify-session-tables.sql](verify-session-tables.sql)** - Verification script
- **[APPLY_SESSION_MIGRATION.sql](APPLY_SESSION_MIGRATION.sql)** - Migration script
- **[schema.sql](schema.sql)** - Complete database schema (includes session tables)
- **[TROUBLESHOOTING.md](../TROUBLESHOOTING.md)** - General troubleshooting guide

---

## Architecture Notes

### Why Two Tables?

**user_sessions:**
- Immutable session records
- Historical tracking
- State snapshots

**session_analytics:**
- Pre-computed metrics
- Fast summary retrieval
- One record per user-project pair
- Updated frequently

This separation optimizes for:
- Fast reads (analytics pre-computed)
- Clean history (sessions immutable)
- Efficient queries (appropriate indexes)

### Why JSONB?

The system uses JSONB for:
- `snapshot_at_start` - Flexible project state structure
- `suggested_next_steps` - Dynamic suggestion format
- `active_blockers` - Variable blocker data
- `analytics_data` - Extensible metrics

Benefits:
- No schema changes needed for new fields
- Efficient querying with GIN indexes
- Native JSON operations in PostgreSQL

---

## Performance Considerations

### Indexes Created

1. `idx_user_sessions_user_id` - Fast user lookups
2. `idx_user_sessions_project_id` - Fast project lookups
3. `idx_user_sessions_is_active` - Active session checks
4. `idx_user_sessions_session_start` - Recent sessions DESC
5. `idx_session_analytics_user_id` - Analytics by user
6. `idx_session_analytics_project_id` - Analytics by project
7. `idx_session_analytics_last_activity` - Activity tracking

### Query Optimization

- `get_session_summary()` uses single query with aggregations
- Analytics pre-computed on activity updates
- JSONB indexed with GIN for deep queries
- Soft delete not used (sessions are historical records)

---

## Security

### Row Level Security (RLS)

Currently set to permissive for development:
```sql
CREATE POLICY "Allow all on user_sessions" ON user_sessions FOR ALL USING (true);
CREATE POLICY "Allow all on session_analytics" ON session_analytics FOR ALL USING (true);
```

**For production**, update to user-specific policies:
```sql
-- User can only see their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid()::text = user_id);

-- User can only create their own sessions
CREATE POLICY "Users can create own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Similar policies for session_analytics
```

---

## Maintenance

### Cleaning Up Old Sessions

To prevent table bloat, periodically archive old sessions:

```sql
-- Archive sessions older than 1 year
DELETE FROM user_sessions
WHERE session_start < NOW() - INTERVAL '1 year'
AND is_active = false;
```

Consider setting up automatic cleanup:
```sql
-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE session_start < NOW() - INTERVAL '1 year'
  AND is_active = false;
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron (if available)
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * 0', 'SELECT cleanup_old_sessions()');
```

---

## Support

If you encounter issues not covered in this guide:

1. Check [SESSION_FIX_README.md](SESSION_FIX_README.md) for quick fixes
2. Review backend console logs for detailed error messages
3. Run the verification script to diagnose setup issues
4. Check [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) for general issues
5. Review Supabase dashboard logs for database errors

---

## Changelog

**2025-10-21** - Initial setup guide created
- Migration script (APPLY_SESSION_MIGRATION.sql)
- Verification script (verify-session-tables.sql)
- Quick fix guide (SESSION_FIX_README.md)
- Enhanced error handling in backend and frontend
- Session tables added to main schema.sql
