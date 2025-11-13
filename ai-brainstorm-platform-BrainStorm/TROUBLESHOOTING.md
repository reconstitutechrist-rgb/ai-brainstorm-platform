# Troubleshooting Guide

## Common Issues and Solutions

---

## Backend Issues

### ❌ Error: "Cannot find module '@anthropic-ai/sdk'"

**Cause**: Dependencies not installed

**Solution**:
```bash
cd backend
rm -rf node_modules
npm install
```

---

### ❌ Error: "PORT 3001 is already in use"

**Cause**: Another process is using port 3001

**Solution 1** - Kill the process:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

**Solution 2** - Use different port:
```bash
# Edit backend/.env
PORT=3002
```

---

### ❌ Error: "Supabase connection failed"

**Cause**: Incorrect Supabase credentials

**Solution**:
1. Check `backend/.env` file exists
2. Verify credentials at [Supabase Dashboard](https://supabase.com/dashboard/project/qzeozxwgbuazbinbqcxn/settings/api)
3. Ensure no extra spaces in .env file
4. Restart backend server

**Check credentials**:
```env
SUPABASE_URL=https://qzeozxwgbuazbinbqcxn.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
```

---

### ❌ Error: "Anthropic API error: 401 Unauthorized"

**Cause**: Invalid or missing API key

**Solution**:
1. Check API key in `backend/.env`
2. Verify key at [Anthropic Console](https://console.anthropic.com/settings/keys)
3. Ensure key starts with `sk-ant-api03-`
4. Check API quota and billing

---

### ❌ Error: "Table 'projects' does not exist"

**Cause**: Database schema not created

**Solution**:
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/qzeozxwgbuazbinbqcxn/sql)
2. Copy contents of `database/schema.sql`
3. Paste and click **RUN**
4. Verify tables created in Table Editor

---

### ❌ Error: "Permission denied for table projects"

**Cause**: Row Level Security blocking access

**Solution**:
1. Re-run `database/schema.sql` to create policies
2. Or temporarily disable RLS (development only):
```sql
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE references DISABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity DISABLE ROW LEVEL SECURITY;
```

---

### ❌ TypeScript compilation errors

**Cause**: Type mismatches or missing types

**Solution**:
```bash
cd backend
npm run build
```

Common fixes:
- Ensure all imports match exported names
- Check `types/index.ts` for correct interfaces
- Verify agent methods return correct types

---

## Frontend Issues

### ❌ Error: "Cannot find module 'react'"

**Cause**: Dependencies not installed

**Solution**:
```bash
cd frontend
rm -rf node_modules
npm install
```

---

### ❌ Error: "PORT 5173 is already in use"

**Cause**: Another Vite instance running

**Solution**:
```bash
# Kill the process
npx kill-port 5173

# Or use different port in vite.config.ts
server: { port: 5174 }
```

---

### ❌ Error: "Network Error" when calling API

**Cause**: Backend not running or wrong API URL

**Solution**:
1. Ensure backend is running on port 3001
2. Check `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001/api
```
3. Verify CORS is enabled in `backend/src/index.ts`
4. Restart both servers

---

### ❌ Error: "Failed to fetch" in browser console

**Cause**: CORS issue or backend down

**Solution**:
1. Check backend is running: `http://localhost:3001`
2. Verify CORS configuration:
```typescript
// backend/src/index.ts
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```
3. Clear browser cache
4. Try in incognito mode

---

### ❌ Dark mode not persisting

**Cause**: localStorage not working

**Solution**:
1. Check browser console for errors
2. Verify localStorage is enabled
3. Clear localStorage:
```javascript
// In browser console
localStorage.clear()
```

---

### ❌ File upload failing

**Cause**: Storage bucket not configured or file too large

**Solution 1** - Check bucket exists:
1. Go to [Supabase Storage](https://supabase.com/dashboard/project/qzeozxwgbuazbinbqcxn/storage/buckets)
2. Verify `references` bucket exists
3. Ensure it's set to **public**

**Solution 2** - Check file size:
- Maximum file size: 50MB
- Reduce file size if needed

**Solution 3** - Check backend uploads directory:
```bash
mkdir -p backend/uploads
```

---

## Database Issues

### ❌ Error: "relation 'storage.buckets' does not exist"

**Cause**: Running schema on wrong database or storage not enabled

**Solution**:
1. Verify you're in the correct Supabase project
2. Ensure Storage is enabled in project settings
3. Try creating bucket manually:
   - Go to Storage → Create Bucket
   - Name: `references`
   - Public: ✓ Enabled

---

### ❌ Query timeout or slow performance

**Cause**: Missing indexes or large dataset

**Solution**:
1. Verify indexes exist:
```sql
-- Check indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';
```
2. Re-run `database/schema.sql` to create indexes
3. Consider adding more indexes for your queries

---

### ❌ Foreign key constraint violation

**Cause**: Trying to insert with non-existent foreign key

**Solution**:
1. Ensure parent record exists first
2. Check cascade delete is working
3. Example: Create project before adding messages

---

## Session Management Issues

### ❌ Error: "Session data unavailable. Database setup may be required"

**Cause**: Session management tables don't exist in database

**Solution**:
1. Apply the session migration script:
   - Open [Supabase SQL Editor](https://supabase.com/dashboard/project/qzeozxwgbuazbinbqcxn/sql)
   - Copy contents of `database/APPLY_SESSION_MIGRATION.sql`
   - Paste and click **RUN**
   - You should see: "Success. No rows returned"

2. Verify installation:
   - Copy contents of `database/verify-session-tables.sql`
   - Paste in SQL Editor and run
   - All checks should show ✅

3. Restart backend server

**See also**: [database/SESSION_FIX_README.md](database/SESSION_FIX_README.md) for detailed fix guide

---

### ❌ Backend: "user_sessions table does not exist"

**Cause**: Migration script not applied to database

**Console error**:
```
[SessionService] ❌ ERROR: user_sessions table does not exist!
[SessionService] 📋 ACTION REQUIRED: Apply database migration
[SessionService] 📄 Run: database/APPLY_SESSION_MIGRATION.sql in Supabase SQL Editor
```

**Solution**:
1. Open Supabase SQL Editor
2. Run `database/APPLY_SESSION_MIGRATION.sql` (entire file)
3. Run `database/verify-session-tables.sql` to verify
4. Restart backend with `Ctrl+C` then `npm run dev`

**Database error code**: PostgreSQL error 42P01 (relation does not exist)

---

### ❌ Backend: "get_session_summary function does not exist"

**Cause**: Database functions weren't created during migration

**Console error**:
```
[SessionService] ❌ ERROR: get_session_summary function does not exist!
[SessionService] 📋 ACTION REQUIRED: Apply database migration
[SessionService] 📄 Run: database/APPLY_SESSION_MIGRATION.sql
```

**Solution**:
1. Re-run the complete migration script: `database/APPLY_SESSION_MIGRATION.sql`
2. Verify functions exist:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_session_summary', 'get_time_since_last_session');
```
3. Should see both functions listed
4. Restart backend server

**Database error code**: PostgreSQL error 42883 (function does not exist)

---

### ❌ Session start button works but nothing recorded

**Symptoms**:
- ✅ "Start Session" button clickable
- ❌ No session appears in history
- ❌ No data in `user_sessions` table
- ❌ Backend returns null silently

**Cause 1**: Database tables don't exist
**Solution**: Apply migration (see above)

**Cause 2**: Old backend process still running
**Solution**:
```bash
# Kill old process
npx kill-port 3001

# Restart backend
cd backend && npm run dev
```

**Cause 3**: Row Level Security blocking writes
**Solution**:
```sql
-- Check policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('user_sessions', 'session_analytics');

-- If policies missing, re-run migration
```

---

### ❌ Session history modal shows "No sessions yet"

**Cause 1**: First time using the feature (expected)
**Solution**: Start and end a session first

**Cause 2**: Database query failing silently
**Solution**:
1. Check browser console (F12) for errors
2. Check backend console for error messages
3. Verify tables exist:
```sql
SELECT * FROM user_sessions LIMIT 1;
```

**Cause 3**: User/project mismatch
**Solution**:
1. Verify correct user_id and project_id being used
2. Check session records:
```sql
SELECT user_id, project_id, session_start, is_active
FROM user_sessions
ORDER BY session_start DESC
LIMIT 5;
```

---

### ❌ Multiple active sessions for same project

**Cause**: Session end logic failed or duplicate creation

**Check**:
```sql
SELECT COUNT(*) as active_sessions
FROM user_sessions
WHERE user_id = 'your-user-id'
AND project_id = 'your-project-id'
AND is_active = true;
```

**Solution**:
```sql
-- Manually end all but the most recent session
UPDATE user_sessions
SET session_end = NOW(), is_active = false
WHERE user_id = 'your-user-id'
AND project_id = 'your-project-id'
AND is_active = true
AND id NOT IN (
  SELECT id FROM user_sessions
  WHERE user_id = 'your-user-id'
  AND project_id = 'your-project-id'
  AND is_active = true
  ORDER BY session_start DESC
  LIMIT 1
);
```

---

### ❌ Session analytics not updating

**Symptoms**:
- Sessions are recorded
- "Items decided" always shows 0
- Suggested next steps empty
- Blockers not detected

**Cause 1**: `session_analytics` table missing
**Solution**: Apply migration (see above)

**Cause 2**: Analytics not being updated on activity
**Solution**:
1. Check `trackActivity()` is being called in backend
2. Verify analytics record exists:
```sql
SELECT * FROM session_analytics
WHERE user_id = 'your-user-id'
AND project_id = 'your-project-id';
```
3. If missing, create session will auto-create it

**Cause 3**: Project items not in expected format
**Solution**:
1. Check project items structure:
```sql
SELECT items FROM projects WHERE id = 'your-project-id';
```
2. Ensure items have `state` field: 'decided', 'exploring', or 'parked'

---

### ❌ Session duration showing incorrectly

**Cause**: Timezone mismatch or end time not set

**Check session times**:
```sql
SELECT
  id,
  session_start,
  session_end,
  is_active,
  EXTRACT(EPOCH FROM (session_end - session_start)) / 60 as duration_minutes
FROM user_sessions
WHERE id = 'your-session-id';
```

**Solution**:
1. Ensure `session_end` is set when ending session
2. Check frontend is calculating duration correctly
3. Verify timezone consistency (all should be UTC with timezone)

---

### ❌ Verification script shows missing indexes

**Symptoms**: verify-session-tables.sql shows ❌ for indexes

**Cause**: Migration didn't complete fully or database resource limits

**Solution**:
```sql
-- Check existing indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('user_sessions', 'session_analytics')
ORDER BY indexname;

-- Expected indexes:
-- idx_session_analytics_last_activity
-- idx_session_analytics_project_id
-- idx_session_analytics_user_id
-- idx_user_sessions_is_active
-- idx_user_sessions_project_id
-- idx_user_sessions_session_start
-- idx_user_sessions_user_id
```

If missing, re-run migration or create manually:
```sql
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_project_id ON user_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_start ON user_sessions(session_start DESC);
CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_project_id ON session_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_last_activity ON session_analytics(last_activity DESC);
```

---

### ❌ Session state snapshot is empty

**Cause**: No items in project when session started

**Check**:
```sql
SELECT
  id,
  snapshot_at_start->'decided' as decided,
  snapshot_at_start->'exploring' as exploring,
  snapshot_at_start->'parked' as parked
FROM user_sessions
WHERE id = 'your-session-id';
```

**Expected behavior**: Snapshot captures project state at session start time
- If project has no items, arrays will be empty `[]` (this is correct)
- Add items to project, then start new session to capture them

---

### ❌ "Time since last session" showing incorrectly

**Cause**: Function calculation error or no previous session

**Test function**:
```sql
SELECT get_time_since_last_session('your-user-id', 'your-project-id');
```

**Expected outputs**:
- 'first session' - if no previous completed sessions
- 'X minutes ago' - if < 1 hour
- 'X hours ago' - if < 1 day
- 'X days ago' - if < 1 week
- 'X weeks ago' - if < 1 month
- 'X months ago' - if >= 1 month

**Solution**: If function doesn't exist, re-run migration

---

### ❌ Session summary API returning null

**Symptoms**:
- Frontend shows "No data available"
- Backend logs show null return

**Debug**:
1. Check backend console for specific error:
   - Table doesn't exist → Apply migration
   - Function doesn't exist → Apply migration
   - No sessions yet → Expected for first use

2. Test database function directly:
```sql
SELECT get_session_summary('your-user-id', 'your-project-id');
```

3. Check function returns expected structure:
```json
{
  "lastSession": "first session",
  "itemsDecided": 0,
  "itemsExploring": 2,
  "itemsParked": 1,
  "totalDecided": 0
}
```

---

### ❌ Frontend error: "Cannot read properties of null"

**Cause**: Session data is null but frontend expects object

**Check**:
1. Browser console shows full error
2. Backend returns valid session structure
3. Frontend has null checks:
```typescript
if (!sessionSummary) {
  return <div>No session data available</div>;
}
```

**Solution**: Ensure backend error handling returns appropriate responses
- Check `sessionService.ts` returns null on errors
- Check `sessionStore.ts` handles null responses
- Apply migration if tables are missing

---

### Session Management - Quick Reference

| Error Message | Error Code | Solution |
|--------------|------------|----------|
| "user_sessions table does not exist" | 42P01 | Apply migration |
| "get_session_summary function does not exist" | 42883 | Apply migration |
| "Session data unavailable" | - | Apply migration + restart |
| Nothing recorded | - | Check RLS policies |
| Empty history | - | Create first session |
| Multiple active sessions | - | Run cleanup SQL |
| Analytics not updating | - | Check trackActivity() calls |

**All session issues**: See [database/SESSION_FIX_README.md](database/SESSION_FIX_README.md)
**Complete setup**: See [database/SESSION_SETUP_GUIDE.md](database/SESSION_SETUP_GUIDE.md)

---

## Agent Issues

### ❌ Agents not responding

**Cause**: Claude API error or workflow not executing

**Solution**:
1. Check backend console for errors
2. Verify Anthropic API key is valid
3. Check API quota not exceeded
4. Test individual agent:
```bash
# In backend/src/index.ts, add test endpoint
app.get('/test-agent', async (req, res) => {
  const agent = new BrainstormingAgent();
  const result = await agent.reflect('Test message', []);
  res.json(result);
});
```

---

### ❌ Wrong workflow executing

**Cause**: Intent classification incorrect

**Solution**:
1. Check ContextManagerAgent classification
2. Add logging to see intent:
```typescript
// In agentCoordination.ts
console.log('Classified intent:', intent);
```
3. Adjust system prompt in ContextManagerAgent if needed

---

### ❌ Agent response not showing in UI

**Cause**: `showToUser` flag is false or message not added to store

**Solution**:
1. Check agent response has `showToUser: true`
2. Verify `chatStore.addMessages()` is called
3. Check browser console for errors

---

## Environment Issues

### ❌ .env file not being read

**Cause**: File in wrong location or wrong naming

**Solution**:
1. Verify file name is exactly `.env` (not `env.txt` or `.env.local`)
2. Ensure file is in correct directory:
   - Backend: `backend/.env`
   - Frontend: `frontend/.env`
3. Restart servers after changing .env

---

### ❌ Environment variables undefined

**Cause**: Not prefixed with VITE_ in frontend

**Solution**:
Frontend environment variables MUST start with `VITE_`:
```env
# ✅ Correct
VITE_API_URL=http://localhost:3001/api

# ❌ Wrong
API_URL=http://localhost:3001/api
```

---

## Build Issues

### ❌ Backend build fails

**Cause**: TypeScript errors

**Solution**:
```bash
cd backend
npm run build -- --noEmit
```
Fix all TypeScript errors shown

---

### ❌ Frontend build fails

**Cause**: Type errors or missing dependencies

**Solution**:
```bash
cd frontend
npm run build
```
Common issues:
- Missing type definitions
- Unused imports (remove them)
- Type mismatches in components

---

## Performance Issues

### ❌ Slow API responses

**Cause**: Claude API latency or inefficient queries

**Solution**:
1. Add request timeout logging
2. Check Supabase query performance
3. Consider caching frequent requests
4. Monitor Claude API response times

---

### ❌ Frontend lag or freezing

**Cause**: Too many re-renders or large state

**Solution**:
1. Use React DevTools Profiler
2. Add `React.memo()` to components
3. Optimize Zustand selectors
4. Reduce conversation history size

---

### ❌ Memory leaks

**Cause**: Unclosed connections or listeners

**Solution**:
1. Check useEffect cleanup functions
2. Remove event listeners on unmount
3. Close WebSocket connections (if added)

---

## Git Issues

### ❌ Accidentally committed .env file

**Cause**: .gitignore not working

**Solution**:
```bash
# Remove from git but keep local file
git rm --cached backend/.env
git rm --cached frontend/.env
git commit -m "Remove .env files from git"

# Verify .gitignore includes .env
cat .gitignore | grep .env
```

---

### ❌ Large files in git history

**Cause**: Accidentally committed node_modules or uploads

**Solution**:
```bash
# Remove from git
git rm -r --cached node_modules
git rm -r --cached backend/uploads
git commit -m "Remove large files"
```

---

## Testing Issues

### ❌ Can't create test project

**Cause**: Validation failing or API error

**Solution**:
1. Check browser console for error
2. Verify all required fields filled
3. Check API endpoint is reachable:
```bash
curl http://localhost:3001/api/projects
```

---

### ❌ Test messages not working

**Cause**: Project not selected or API down

**Solution**:
1. Ensure a project is selected
2. Check `projectStore.currentProject` is not null
3. Verify backend is receiving request

---

## Quick Diagnostic Commands

### Check if services are running
```bash
# Check backend
curl http://localhost:3001/api/agents

# Check frontend
curl http://localhost:5173
```

### Check database connection
```bash
# In backend directory
node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"
```

### Check Node.js version
```bash
node -v  # Should be 18+
npm -v
```

### Reset everything
```bash
# Kill all processes
npx kill-port 3001
npx kill-port 5173

# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install

# Restart servers
cd ../backend && npm run dev
cd ../frontend && npm run dev
```

---

## Still Having Issues?

### Check Logs
1. **Backend console**: Look for error messages
2. **Browser console**: Check for network errors
3. **Supabase logs**: Check database query logs

### Verify Setup
Use [COMPLETION_CHECKLIST.md](COMPLETION_CHECKLIST.md) to ensure all components are in place

### Documentation
- [SETUP.md](SETUP.md) - Comprehensive setup guide
- [START.md](START.md) - Quick start reference
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [README.md](README.md) - Project overview

---

## Debug Mode

Enable verbose logging:

### Backend
```typescript
// In backend/src/index.ts
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

### Frontend
```typescript
// In frontend/src/services/api.ts
api.interceptors.request.use(config => {
  console.log('API Request:', config);
  return config;
});

api.interceptors.response.use(
  response => {
    console.log('API Response:', response);
    return response;
  },
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);
```

---

**Need more help? Check the documentation or review the code comments!**
