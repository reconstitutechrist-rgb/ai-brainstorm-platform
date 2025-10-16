# Session Management Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              SessionManager Component                      │ │
│  │  ┌────────────────────────────────────────────────────┐   │ │
│  │  │  Session Summary                                    │   │ │
│  │  │  Last active: 2 hours ago                           │   │ │
│  │  │                                                      │   │ │
│  │  │  📊 Stats:                                          │   │ │
│  │  │  • 5 decided since last    • 3 exploring           │   │ │
│  │  │  • 1 parked                • 2 pending questions    │   │ │
│  │  │                                                      │   │ │
│  │  │  💡 Suggested Next Steps:                           │   │ │
│  │  │  🔴 HIGH: Answer clarification questions            │   │ │
│  │  │  🟡 MEDIUM: Decide on authentication method         │   │ │
│  │  │                                                      │   │ │
│  │  │  ⚠️  Active Blockers:                               │   │ │
│  │  │  • Missing database schema details                  │   │ │
│  │  │  • Needs clarification on deployment strategy       │   │ │
│  │  └────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  [Chat Interface Below]                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                           │
│                                                                 │
│  ┌──────────────────┐          ┌──────────────────┐            │
│  │  Session Store   │◄────────►│  API Service     │            │
│  │  (Zustand)       │          │  (Axios)         │            │
│  └──────────────────┘          └──────────────────┘            │
│         │                              │                        │
│         │ State Management             │ HTTP Requests          │
│         ↓                              ↓                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Actions:                                                 │  │
│  │  • loadSessionSummary()                                   │  │
│  │  • loadSuggestedSteps()                                   │  │
│  │  • loadBlockers()                                         │  │
│  │  • startSession()                                         │  │
│  │  • trackActivity()                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js/Express)                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Session Routes                          │  │
│  │  POST   /api/sessions/start                              │  │
│  │  POST   /api/sessions/end                                │  │
│  │  GET    /api/sessions/summary/:userId/:projectId         │  │
│  │  GET    /api/sessions/analytics/:userId/:projectId       │  │
│  │  POST   /api/sessions/track-activity                     │  │
│  │  GET    /api/sessions/suggested-steps/:projectId         │  │
│  │  GET    /api/sessions/blockers/:projectId                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↕                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 SessionService                            │  │
│  │                                                            │  │
│  │  • startSession()          • endActiveSession()           │  │
│  │  • getSessionSummary()     • getOrCreateAnalytics()       │  │
│  │  • updateAnalytics()       • trackActivity()              │  │
│  │  • generateSuggestedSteps()                               │  │
│  │  • detectBlockers()                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ SQL
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase/PostgreSQL)               │
│                                                                 │
│  ┌────────────────────────┐    ┌────────────────────────┐      │
│  │    user_sessions       │    │  session_analytics     │      │
│  │                        │    │                        │      │
│  │  • id                  │    │  • id                  │      │
│  │  • user_id             │    │  • user_id             │      │
│  │  • project_id          │    │  • project_id          │      │
│  │  • session_start       │    │  • last_activity       │      │
│  │  • session_end         │    │  • previous_activity   │      │
│  │  • is_active           │    │  • items_decided_since │      │
│  │  • snapshot_at_start   │    │  • items_exploring     │      │
│  │  • metadata            │    │  • items_parked        │      │
│  └────────────────────────┘    │  • pending_questions   │      │
│                                 │  • suggested_next_steps│      │
│                                 │  • active_blockers     │      │
│                                 └────────────────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Database Functions                           │  │
│  │                                                            │  │
│  │  • get_time_since_last_session(user_id, project_id)      │  │
│  │    Returns: "2 hours ago", "3 days ago", etc.            │  │
│  │                                                            │  │
│  │  • get_session_summary(user_id, project_id)              │  │
│  │    Returns: Complete session summary with all metrics    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Session Start Flow
```
User Opens Project
       ↓
ChatPage useEffect triggers
       ↓
sessionStore.startSession(userId, projectId)
       ↓
POST /api/sessions/start
       ↓
sessionService.startSession()
       ↓
• End any active sessions
• Get current project state (snapshot)
• Insert new session record
       ↓
sessionStore.loadAllSessionData()
       ↓
Parallel API calls:
• GET /api/sessions/summary
• GET /api/sessions/suggested-steps
• GET /api/sessions/blockers
       ↓
SessionManager displays data
```

### 2. Activity Tracking Flow
```
User Sends Message
       ↓
Message sent successfully
       ↓
sessionStore.trackActivity(userId, projectId)
       ↓
POST /api/sessions/track-activity (fire-and-forget)
       ↓
sessionService.trackActivity()
       ↓
Background processing:
• Update last_activity timestamp
• Get current project state
• Count items by state
• Count pending questions
• Generate suggested steps
• Detect blockers
       ↓
Update session_analytics table
       ↓
(SessionManager will refresh on next load)
```

### 3. Session Summary Calculation
```
GET /api/sessions/summary/:userId/:projectId
       ↓
sessionService.getSessionSummary()
       ↓
Call database function:
get_session_summary(user_id, project_id)
       ↓
Database performs:
• Get current project items
• Count items by state (decided, exploring, parked)
• Get last session snapshot
• Calculate items decided since last session
• Format time since last session
       ↓
Merge with session_analytics data:
• Pending questions
• Suggested next steps
• Active blockers
       ↓
Return complete summary
       ↓
SessionManager displays
```

## Component Hierarchy

```
ChatPage
└── SessionManager
    ├── Header (Last Session Info)
    ├── Stats Grid
    │   ├── Items Decided Card
    │   ├── Items Exploring Card
    │   ├── Items Parked Card
    │   └── Pending Questions Card
    ├── Suggested Next Steps Section
    │   └── Step Cards (with priority badges)
    └── Active Blockers Section
        └── Blocker Cards (with type indicators)
```

## Key Technologies

### Frontend
- **React** - UI framework
- **Zustand** - State management
- **Axios** - HTTP client
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Supabase Client** - Database access

### Database
- **PostgreSQL** - Database
- **Supabase** - Database platform
- **PL/pgSQL** - Database functions

## Security Layers

```
┌──────────────────────────────────────────┐
│  1. Authentication (Supabase Auth)       │
│     User must be logged in               │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│  2. Authorization (JWT Tokens)           │
│     Bearer token in request headers      │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│  3. Row Level Security (RLS)             │
│     Database-level access control        │
└──────────────────────────────────────────┘
              ↓
┌──────────────────────────────────────────┐
│  4. Input Validation                     │
│     TypeScript types + runtime checks    │
└──────────────────────────────────────────┘
```

## Performance Optimizations

1. **Database Level**
   - Indexes on frequently queried columns
   - Pre-computed analytics in separate table
   - Database functions for complex calculations
   - JSONB columns for flexible data

2. **Backend Level**
   - Fire-and-forget activity tracking
   - Efficient SQL queries
   - Caching opportunities (future)

3. **Frontend Level**
   - Parallel data loading
   - Lazy loading of session data
   - Optimistic UI updates
   - State management with Zustand

4. **Network Level**
   - Minimal payload sizes
   - HTTP/2 support
   - Compression enabled

## Scalability Considerations

```
Current Setup:
└── Single database instance
    └── Suitable for: 1-10K users

Future Scaling:
├── Add Redis caching layer
│   └── Cache session summaries
│   └── Cache suggested steps
│
├── Add background job queue
│   └── Process analytics async
│   └── Generate reports
│
├── Add database read replicas
│   └── Separate read/write workloads
│
└── Add CDN for static assets
    └── Faster SessionManager loads
```

## Monitoring Points

```
Key Metrics to Track:
├── Session duration (avg, median, p95)
├── Sessions per user per day
├── Items decided per session
├── Time between sessions
├── Activity tracking success rate
├── API response times
├── Database query performance
└── Error rates by endpoint
```

## Integration with Existing System

```
                    ┌─────────────────┐
                    │  AI Agents      │
                    │  (Existing)     │
                    └────────┬────────┘
                             │
                             ↓ Agent Activity
┌────────────────────────────────────────────────┐
│           Session Management System            │
│                                                │
│  Uses Agent Activity for:                     │
│  • Detecting blockers                         │
│  • Counting pending questions                 │
│  • Generating suggestions                     │
└────────────────────────────────────────────────┘
                             ↓
                    ┌────────────────┐
                    │  Projects      │
                    │  (Existing)    │
                    └────────────────┘
```

## Summary

The session management system integrates seamlessly with the existing AI brainstorming platform to provide:

✅ **Real-time tracking** of user sessions
✅ **Intelligent suggestions** based on project state
✅ **Blocker detection** from AI agent activity
✅ **Performance metrics** to measure progress
✅ **Beautiful UI** that enhances user experience
✅ **Scalable architecture** ready for growth

All built with modern technologies and best practices! 🚀