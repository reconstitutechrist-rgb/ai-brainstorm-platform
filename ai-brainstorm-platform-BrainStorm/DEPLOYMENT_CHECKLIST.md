# Session Management - Deployment Checklist

## ✅ Pre-Deployment Checklist

Use this checklist to ensure everything is ready:

### 1. Database Migration
- [ ] Copy `database/migrations/004_user_sessions.sql`
- [ ] Open Supabase SQL Editor
- [ ] Paste the SQL
- [ ] Run the migration
- [ ] Verify success message
- [ ] Check tables exist:
  ```sql
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('user_sessions', 'session_analytics');
  ```

### 2. Backend Verification
- [ ] All new files exist:
  - [ ] `backend/src/services/sessionService.ts`
  - [ ] `backend/src/routes/sessions.ts`
- [ ] Modified files updated:
  - [ ] `backend/src/types/index.ts`
  - [ ] `backend/src/index.ts`
- [ ] Dependencies installed: `cd backend && npm install`
- [ ] No TypeScript errors: `npm run build`
- [ ] Backend starts: `npm run dev`
- [ ] Backend accessible at http://localhost:3001

### 3. Frontend Verification
- [ ] All new files exist:
  - [ ] `frontend/src/components/SessionManager.tsx`
  - [ ] `frontend/src/store/sessionStore.ts`
- [ ] Modified files updated:
  - [ ] `frontend/src/services/api.ts`
  - [ ] `frontend/src/types/index.ts`
  - [ ] `frontend/src/pages/ChatPage.tsx`
- [ ] Dependencies installed: `cd frontend && npm install`
- [ ] No TypeScript errors: `npm run build`
- [ ] Frontend starts: `npm run dev`
- [ ] Frontend accessible at http://localhost:5173

### 4. Testing
- [ ] Can log in to the application
- [ ] Can create a new project
- [ ] Can open existing project
- [ ] SessionManager visible on Chat page
- [ ] Session stats display (even if zeros)
- [ ] Can send a message
- [ ] No errors in browser console
- [ ] No errors in backend console
- [ ] Activity tracking works (check Network tab)

---

## 🧪 Testing Guide

### Test 1: Basic Display
1. Open a project
2. Go to Chat page
3. **Expected**: SessionManager component appears at top
4. **Expected**: Shows "Last active: first session" (if first time)
5. **Expected**: Shows item counts (0s for new project)

### Test 2: Session Start
1. Open browser DevTools → Network tab
2. Open a project
3. **Expected**: POST request to `/api/sessions/start`
4. **Expected**: GET request to `/api/sessions/summary`
5. **Expected**: No errors in console

### Test 3: Activity Tracking
1. Open a project
2. Send a message
3. Check Network tab
4. **Expected**: POST request to `/api/sessions/track-activity`
5. **Expected**: Returns 200 OK
6. **Expected**: No errors

### Test 4: Data Verification
Run in Supabase SQL Editor:
```sql
-- Should see your session
SELECT * FROM user_sessions
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- Should see analytics
SELECT * FROM session_analytics
ORDER BY last_activity DESC
LIMIT 1;
```

---

## 🐛 Troubleshooting

### Issue: SessionManager not appearing
**Check:**
- [ ] Are you on the Chat page (not Dashboard)?
- [ ] Is a project selected?
- [ ] Is user logged in?
- [ ] Check browser console for errors

**Fix:**
```javascript
// In browser console:
console.log('User:', user);
console.log('Project:', currentProject);
// Both should have values
```

### Issue: Database errors
**Check:**
- [ ] Migration ran successfully
- [ ] Tables exist in Supabase
- [ ] RLS policies enabled

**Fix:**
Run this in Supabase:
```sql
-- Check if tables exist
SELECT * FROM user_sessions LIMIT 1;
SELECT * FROM session_analytics LIMIT 1;

-- If error, re-run migration
```

### Issue: API errors (404)
**Check:**
- [ ] Backend is running
- [ ] Routes registered in `backend/src/index.ts`
- [ ] URL in frontend matches backend port

**Fix:**
```typescript
// In frontend/src/services/api.ts
// Check API_BASE_URL
console.log(import.meta.env.VITE_API_URL);
// Should be http://localhost:3001/api
```

### Issue: TypeScript errors
**Check:**
- [ ] All types imported correctly
- [ ] No circular dependencies
- [ ] Dependencies installed

**Fix:**
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Verification Queries

### Check Session Data
```sql
-- Get latest sessions
SELECT
  s.id,
  s.user_id,
  s.session_start,
  s.session_end,
  s.is_active,
  p.title as project_title
FROM user_sessions s
JOIN projects p ON s.project_id = p.id
ORDER BY s.session_start DESC
LIMIT 5;
```

### Check Analytics
```sql
-- Get analytics summary
SELECT
  a.user_id,
  a.last_activity,
  a.items_decided_since_last,
  a.items_exploring,
  a.items_parked,
  a.pending_questions,
  p.title as project_title
FROM session_analytics a
JOIN projects p ON a.project_id = p.id
ORDER BY a.last_activity DESC
LIMIT 5;
```

### Test Database Functions
```sql
-- Test time calculation
SELECT get_time_since_last_session('your-user-id', 'your-project-id');

-- Test summary function
SELECT get_session_summary('your-user-id', 'your-project-id');
```

---

## 🚀 Go Live Checklist

Before going to production:

### Security
- [ ] Update RLS policies (currently set to allow all)
- [ ] Review authentication requirements
- [ ] Add rate limiting on API endpoints
- [ ] Enable CORS only for production domains
- [ ] Review sensitive data in logs

### Performance
- [ ] Add caching layer (Redis) if needed
- [ ] Set up database connection pooling
- [ ] Monitor query performance
- [ ] Add API response caching
- [ ] Optimize JSONB queries

### Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Add performance monitoring
- [ ] Set up database alerts
- [ ] Monitor API response times
- [ ] Track user session metrics

### Documentation
- [ ] Update API documentation
- [ ] Document environment variables
- [ ] Create runbook for common issues
- [ ] Document deployment process
- [ ] Create user guide

---

## 📝 Environment Variables

Ensure these are set:

### Backend `.env`
```bash
SUPABASE_URL=https://qzeozxwgbuazbinbqcxn.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3001
```

### Frontend `.env`
```bash
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=https://qzeozxwgbuazbinbqcxn.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## ✅ Final Checks

Before considering it complete:

- [ ] ✅ Database migration successful
- [ ] ✅ Backend starts without errors
- [ ] ✅ Frontend starts without errors
- [ ] ✅ Can log in
- [ ] ✅ Can create/open projects
- [ ] ✅ SessionManager displays
- [ ] ✅ Session tracking works
- [ ] ✅ No console errors
- [ ] ✅ All API endpoints respond
- [ ] ✅ Database functions work
- [ ] ✅ Documentation reviewed

---

## 🎉 Success Criteria

You'll know it's working when:

1. **Visual Confirmation**
   - SessionManager appears at top of Chat page
   - Shows "Last active: first session" on first visit
   - Shows item counts (even if 0)
   - Styled correctly (matches theme)

2. **Functional Confirmation**
   - Sessions created in database
   - Activity tracking happens after messages
   - Analytics updated in background
   - No errors in console

3. **Data Confirmation**
   - Records in `user_sessions` table
   - Records in `session_analytics` table
   - Database functions return data
   - All timestamps updating correctly

---

## 📞 Support

If you get stuck:

1. **Check Documentation**
   - `SESSION_SETUP_GUIDE.md` - Quick start
   - `SESSION_MANAGEMENT_COMPLETE.md` - Full docs
   - `WHAT_WAS_BUILT.md` - Understanding the system
   - `SESSION_ARCHITECTURE.md` - Architecture details

2. **Check Logs**
   - Browser Console (F12)
   - Backend Console
   - Supabase Logs
   - Network Tab in DevTools

3. **Common Solutions**
   - Clear browser cache
   - Restart backend/frontend
   - Re-run migration
   - Check environment variables
   - Verify all files in place

---

## 🎯 Quick Start (TL;DR)

```bash
# 1. Run migration in Supabase SQL Editor
#    Copy: database/migrations/004_user_sessions.sql
#    Paste & Run in Supabase

# 2. Restart backend
cd backend
npm run dev

# 3. Restart frontend
cd frontend
npm run dev

# 4. Test
#    Open app → Login → Open project → See SessionManager
```

**That's it!** 🎉

If SessionManager appears on the Chat page with no errors, you're done! ✅