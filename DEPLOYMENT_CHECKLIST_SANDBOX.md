# Conversational Sandbox - Deployment Checklist

## Pre-Deployment Checklist

### 1. Database Migration
- [ ] Open Supabase SQL Editor
- [ ] Run `database/migrations/006_sandbox_conversations.sql`
- [ ] Verify table created: `sandbox_conversations`
- [ ] Check indexes created
- [ ] Confirm RLS policies active
- [ ] Test query: `SELECT * FROM sandbox_conversations LIMIT 1;`

### 2. Backend Setup
- [ ] Navigate to `backend` directory
- [ ] Verify `ANTHROPIC_API_KEY` in `.env` file
- [ ] Install dependencies: `npm install`
- [ ] Check TypeScript compiles: `npm run build`
- [ ] Start backend: `npm run dev`
- [ ] Verify server running on port 3001
- [ ] Check console for errors

### 3. Frontend Setup
- [ ] Navigate to `frontend` directory
- [ ] Install dependencies: `npm install`
- [ ] Check TypeScript compiles: `npm run build`
- [ ] Start frontend: `npm run dev`
- [ ] Verify app running on port 5173
- [ ] Check console for errors

---

## Testing Checklist

### Basic Functionality
- [ ] Login to application
- [ ] Select or create a project
- [ ] Navigate to Sandbox (Flask icon in nav)
- [ ] Page loads without errors
- [ ] AI greeting message appears
- [ ] Can type in message input
- [ ] Can send message
- [ ] AI responds within 5 seconds
- [ ] Conversation appears in left panel

### Conversation Features
- [ ] Try quick prompt buttons
- [ ] Send message: "I'm thinking about adding analytics"
- [ ] Verify AI asks clarifying questions
- [ ] Check mode indicator changes
- [ ] Test suggested action buttons
- [ ] Verify timestamp appears on messages
- [ ] Test Enter to send, Shift+Enter for new line

### Idea Extraction
- [ ] Wait for AI to mention ideas
- [ ] Check ideas appear in right panel
- [ ] Verify ideas grouped by status (Mentioned, Exploring, etc.)
- [ ] Click idea to select (checkbox)
- [ ] Select multiple ideas
- [ ] Click "Extract X to Project" button
- [ ] Verify success message
- [ ] Check main project for extracted ideas

### Idea Status Management
- [ ] Find idea in "Mentioned" status
- [ ] Click "Explore" button
- [ ] Verify moves to "Exploring" group
- [ ] Click "Refine" button
- [ ] Verify moves to "Refined" group
- [ ] Click "Mark Ready" button
- [ ] Verify moves to "Ready to Extract" group

### Conversation Modes
- [ ] Send message: "I'm not sure what to do"
  - [ ] Verify mode changes to "Clarifying"
- [ ] Send message: "Generate some ideas"
  - [ ] Verify mode changes to "Generating"
- [ ] Send message: "How would this work?"
  - [ ] Verify mode changes to "Planning"

### UI/UX
- [ ] Test dark mode toggle
- [ ] Verify animations smooth
- [ ] Check auto-scroll on new messages
- [ ] Test textarea auto-resize
- [ ] Verify loading indicators
- [ ] Check responsive layout (resize window)
- [ ] Test collapsible idea groups

---

## Advanced Testing

### Edge Cases
- [ ] Send very long message (500+ chars)
- [ ] Send rapid messages (test loading state)
- [ ] Navigate away and back (conversation persists)
- [ ] Refresh page (conversation loads)
- [ ] Extract all ideas (panel empties)
- [ ] Test with no project selected

### Multi-Session
- [ ] Create sandbox, add ideas
- [ ] Click "Save as Alternative"
- [ ] Enter name, confirm
- [ ] Verify new sandbox created
- [ ] Original saved as alternative
- [ ] Can access both sandboxes

### Discard Flow
- [ ] Create sandbox with ideas
- [ ] Click "Discard All"
- [ ] Confirm warning dialog
- [ ] Verify sandbox deleted
- [ ] New sandbox created
- [ ] Ideas panel empty

### Error Handling
- [ ] Stop backend
- [ ] Try sending message
- [ ] Verify error handling (no crash)
- [ ] Restart backend
- [ ] Verify recovery

---

## Performance Testing

### Response Times
- [ ] Measure first AI response (< 5 sec)
- [ ] Measure subsequent responses (< 4 sec)
- [ ] Check message render time (< 100ms)
- [ ] Verify scroll smooth
- [ ] Test with 50+ messages (performance OK)

### Memory
- [ ] Check browser DevTools memory
- [ ] Send 20+ messages
- [ ] Verify no memory leaks
- [ ] Check network tab for payload sizes

---

## Integration Testing

### With Main Project
- [ ] Extract ideas from sandbox
- [ ] Go to main project view
- [ ] Verify ideas appear as "exploring"
- [ ] Check metadata includes sandbox origin
- [ ] Verify idea description intact

### With Session Management
- [ ] Start session
- [ ] Use sandbox
- [ ] Check session tracks sandbox activity
- [ ] End session
- [ ] Verify session summary includes sandbox

---

## Browser Testing

### Chrome
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Firefox
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Safari
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

### Edge
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors

---

## API Testing

### Direct API Calls (Optional)

Using Postman or similar:

```bash
# 1. Start conversation
POST /api/sandbox/conversation/start
Body: {
  "sandboxId": "your-sandbox-id",
  "projectContext": {
    "projectTitle": "Test Project",
    "projectDescription": "Testing",
    "currentDecisions": [],
    "constraints": []
  }
}

# 2. Send message
POST /api/sandbox/conversation/message
Body: {
  "conversationId": "conversation-id-from-step-1",
  "userMessage": "I'm thinking about adding analytics",
  "mode": "exploration"
}

# 3. Get conversation
GET /api/sandbox/conversation/:conversationId

# 4. Update idea status
PATCH /api/sandbox/conversation/idea/:ideaId/status
Body: {
  "conversationId": "conversation-id",
  "status": "exploring"
}

# 5. Extract ideas
POST /api/sandbox/conversation/extract
Body: {
  "conversationId": "conversation-id",
  "selectedIdeaIds": ["idea-1", "idea-2"]
}
```

---

## Security Checklist

- [ ] RLS enabled on sandbox_conversations
- [ ] User can only access own conversations
- [ ] Authentication required for all endpoints
- [ ] No SQL injection vulnerabilities
- [ ] API key not exposed in frontend
- [ ] No sensitive data in console logs

---

## Documentation Review

- [ ] Read `CONVERSATIONAL_SANDBOX_GUIDE.md`
- [ ] Read `SANDBOX_REWRITE_SUMMARY.md`
- [ ] Understand conversation modes
- [ ] Understand idea lifecycle
- [ ] Know how to troubleshoot

---

## Production Readiness

### Code Quality
- [ ] No TypeScript errors
- [ ] No console.error in production
- [ ] All imports valid
- [ ] No unused variables
- [ ] Proper error handling

### Database
- [ ] Migrations applied
- [ ] Indexes created
- [ ] RLS policies tested
- [ ] Backup strategy in place

### Monitoring
- [ ] Set up error tracking
- [ ] Monitor API response times
- [ ] Track conversation lengths
- [ ] Monitor idea extraction rate

---

## User Acceptance Testing

### Test Scenarios

#### Scenario 1: New User
1. [ ] User logs in for first time
2. [ ] Creates project
3. [ ] Navigates to sandbox
4. [ ] Sees greeting
5. [ ] Has conversation
6. [ ] Extracts ideas
7. [ ] Success!

#### Scenario 2: Returning User
1. [ ] User returns to sandbox
2. [ ] Conversation loads
3. [ ] Can continue conversation
4. [ ] New ideas extracted
5. [ ] Success!

#### Scenario 3: Power User
1. [ ] User has long conversation (20+ messages)
2. [ ] Extracts 10+ ideas
3. [ ] Changes idea statuses
4. [ ] Saves as alternative
5. [ ] Creates new sandbox
6. [ ] Success!

---

## Rollback Plan

If issues occur:

### Quick Rollback
1. [ ] Revert `frontend/src/App.tsx` to old SandboxPage
2. [ ] Restart frontend
3. [ ] Old sandbox still works

### Full Rollback
1. [ ] Revert all Git changes
2. [ ] Restart backend and frontend
3. [ ] Verify old version works

### Data Preservation
- Sandbox data preserved in database
- Can reactivate new version later
- No data loss

---

## Post-Deployment

### Monitoring (First Week)
- [ ] Check error logs daily
- [ ] Monitor user engagement
- [ ] Track conversation lengths
- [ ] Measure idea extraction rate
- [ ] Collect user feedback

### Metrics to Track
- Average conversation length
- Ideas extracted per session
- Most common conversation modes
- User satisfaction ratings
- Time to first idea extraction

### User Feedback
- [ ] Add feedback button
- [ ] Monitor support tickets
- [ ] Watch for confusion points
- [ ] Iterate based on feedback

---

## Success Criteria

The deployment is successful if:

1. ✅ **Zero critical bugs** in first 24 hours
2. ✅ **User engagement** > 5 min per session
3. ✅ **Idea extraction rate** > 50%
4. ✅ **Positive user feedback** > 80%
5. ✅ **No performance issues** (< 5 sec response time)

---

## Common Issues & Solutions

### Issue: AI not responding
**Check:**
- [ ] ANTHROPIC_API_KEY set correctly
- [ ] Backend running
- [ ] Network connectivity
- [ ] API rate limits

### Issue: Ideas not appearing
**Check:**
- [ ] Database migration ran
- [ ] Console errors in browser
- [ ] API response includes ideas
- [ ] Idea extraction logic working

### Issue: Conversation not saving
**Check:**
- [ ] sandbox_conversations table exists
- [ ] RLS policies correct
- [ ] User authenticated
- [ ] API endpoints returning success

### Issue: Slow responses
**Check:**
- [ ] Claude API response time
- [ ] Database query performance
- [ ] Network latency
- [ ] Payload sizes

---

## Contact & Support

**Issues:** Create ticket in project management system
**Questions:** Check documentation first
**Bugs:** Include steps to reproduce

---

## Sign-Off

### Development Team
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation complete

### QA Team
- [ ] All tests passed
- [ ] Edge cases tested
- [ ] Performance acceptable

### Product Team
- [ ] UX approved
- [ ] Features complete
- [ ] User stories satisfied

### Operations Team
- [ ] Monitoring set up
- [ ] Alerts configured
- [ ] Rollback plan ready

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Status:** _____________

**Ready to launch the Conversational Sandbox! 🚀**
