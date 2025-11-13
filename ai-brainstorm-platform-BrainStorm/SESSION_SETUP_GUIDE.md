# Session Management Setup Guide

## Quick Start (5 Minutes)

### Step 1: Apply Database Migration (2 minutes)

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Copy and paste the contents of `database/migrations/004_user_sessions.sql`
5. Click "Run" to execute the migration

**What this does:**
- Creates `user_sessions` table
- Creates `session_analytics` table
- Adds database functions for session calculations
- Sets up indexes and triggers

### Step 2: Restart Backend (1 minute)

The backend code is already integrated. Just restart it:

```bash
cd backend
npm run dev
```

**What's already done:**
- Session routes registered in `index.ts`
- Session service created
- API endpoints ready to use

### Step 3: Restart Frontend (1 minute)

The frontend code is already integrated. Just restart it:

```bash
cd frontend
npm run dev
```

**What's already done:**
- SessionManager component created
- Session store configured
- API client updated
- ChatPage integrated

### Step 4: Test (1 minute)

1. Open the application in your browser
2. Log in to your account
3. Create a new project or open an existing one
4. Navigate to the Chat page
5. You should see the **SessionManager** component at the top showing:
   - "Last active: first session" (or time since last session)
   - Item counts (decided, exploring, parked)
   - Suggested next steps
   - Active blockers

## Verification Checklist

✅ Database migration applied successfully (no errors in Supabase SQL editor)
✅ Backend running on http://localhost:3001
✅ Frontend running on http://localhost:5173
✅ Can log in to the application
✅ Can create/open a project
✅ SessionManager visible on Chat page
✅ Session stats showing (even if all zeros for new project)

## What You'll See

### On First Visit to a Project
```
Session Summary
Last active: first session

Items: 0 decided since last | 0 exploring | 0 parked | 0 pending questions
```

### After Using the Project
```
Session Summary
Last active: 2 hours ago

Items: 5 decided since last | 3 exploring | 1 parked | 2 pending questions

Suggested Next Steps:
🔴 HIGH: Answer: What is the target audience for this feature?
🟡 MEDIUM: Decide on: User authentication method
```

### With Active Blockers
```
Active Blockers:
⚠️ Information Gap: Missing database schema details
⚠️ Clarification Needed: Which cloud provider should we use?
```

## API Endpoints Now Available

```
POST   /api/sessions/start
POST   /api/sessions/end
GET    /api/sessions/summary/:userId/:projectId
GET    /api/sessions/analytics/:userId/:projectId
POST   /api/sessions/track-activity
GET    /api/sessions/suggested-steps/:projectId
GET    /api/sessions/blockers/:projectId
```

## How It Works

1. **When you open a project:**
   - A new session starts automatically
   - Current project state is captured as a snapshot
   - Session data loads in the background

2. **When you send a message:**
   - Your activity is tracked
   - Analytics are updated
   - Suggested steps and blockers are recalculated

3. **SessionManager updates automatically:**
   - Shows time since last session
   - Displays items decided since last time
   - Lists suggested next steps
   - Shows active blockers

## Troubleshooting

### "SessionManager not showing"
**Problem:** Component doesn't appear on Chat page
**Solution:**
- Verify you're on the Chat page (not Dashboard)
- Check that a project is selected
- Open browser console for errors

### "No session data"
**Problem:** All stats show 0 or loading spinner
**Solution:**
- Verify database migration was applied
- Check backend is running and accessible
- Look for errors in browser Network tab

### "Backend errors"
**Problem:** Errors in backend console
**Solution:**
- Verify Supabase connection in backend/.env
- Check that all dependencies are installed (`npm install`)
- Verify database tables exist in Supabase

### "Frontend errors"
**Problem:** Errors in browser console
**Solution:**
- Clear browser cache
- Verify frontend dependencies installed (`npm install`)
- Check that API_URL is correct in frontend/.env

## Testing Tips

### Test Session Tracking
1. Open a project
2. Send a message
3. Check browser Network tab for `POST /api/sessions/track-activity`
4. Should return `200 OK`

### Test Session Summary
1. Open a project
2. Check Network tab for `GET /api/sessions/summary`
3. Should return session data with metrics

### Test Suggested Steps
1. Create items in "exploring" state
2. Refresh the page
3. SessionManager should show suggestions to decide on those items

### Test Blockers
1. Interact with clarification or gap detection agents
2. Blockers should appear in SessionManager

## What's Next?

Now that session management is set up, you can:

1. **Monitor user progress** - See how many decisions are made per session
2. **Improve AI agents** - Agents can now provide better suggestions based on session data
3. **Add notifications** - Notify users about blockers or pending questions
4. **Export reports** - Create session summary reports
5. **Team analytics** - Track team-wide productivity metrics

## Database Schema Overview

```
user_sessions
├── id (UUID, primary key)
├── user_id (text)
├── project_id (UUID, foreign key → projects)
├── session_start (timestamp)
├── session_end (timestamp, nullable)
├── is_active (boolean)
├── snapshot_at_start (jsonb) - Project state when session started
└── metadata (jsonb) - Additional session data

session_analytics
├── id (UUID, primary key)
├── user_id (text)
├── project_id (UUID, foreign key → projects)
├── last_activity (timestamp)
├── previous_activity (timestamp)
├── items_decided_since_last (integer)
├── items_exploring (integer)
├── items_parked (integer)
├── pending_questions (integer)
├── suggested_next_steps (jsonb)
└── active_blockers (jsonb)
```

## Support

If you encounter any issues:

1. Check the `SESSION_MANAGEMENT_COMPLETE.md` for detailed documentation
2. Review the troubleshooting section above
3. Check backend and frontend logs
4. Verify all files are in place (see File Structure in main doc)

---

**Congratulations!** 🎉 Your session management system is ready to use!

The system will now track all user sessions, provide intelligent suggestions, and help users stay productive by showing them what needs attention.