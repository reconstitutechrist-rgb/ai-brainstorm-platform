# Sandbox Mode - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
│                     (Frontend - React/TypeScript)                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │   Floating   │  │   Sandbox    │  │     App      │
         │     Nav      │  │     Page     │  │   Router     │
         │              │  │              │  │              │
         │  - Flask     │  │  - Generate  │  │  - /sandbox  │
         │    icon      │  │  - Select    │  │    route     │
         │  - Navigate  │  │  - Extract   │  │              │
         │    to /      │  │  - Save      │  │              │
         │    sandbox   │  │  - Discard   │  │              │
         └──────────────┘  └──────┬───────┘  └──────────────┘
                                  │
                                  │ sandboxApi
                                  │
                                  ▼
         ┌────────────────────────────────────────────────┐
         │          API SERVICE LAYER                     │
         │          (frontend/src/services/api.ts)        │
         │                                                │
         │  - create()                                    │
         │  - generateIdeas()                             │
         │  - refineIdea()                                │
         │  - combineIdeas()                              │
         │  - extractIdeas()                              │
         │  - saveAsAlternative()                         │
         │  - discard()                                   │
         │  - getByProject()                              │
         └────────────────────┬───────────────────────────┘
                              │
                              │ HTTP/REST
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────┐       │
│  │          BACKEND API ROUTES                         │       │
│  │          (backend/src/routes/sandbox.ts)            │       │
│  │                                                      │       │
│  │  POST   /api/sandbox/create                         │       │
│  │  POST   /api/sandbox/generate-ideas   ──────┐       │       │
│  │  POST   /api/sandbox/refine-idea      ──────┤       │       │
│  │  POST   /api/sandbox/combine-ideas    ──────┤       │       │
│  │  POST   /api/sandbox/extract-ideas           │       │       │
│  │  POST   /api/sandbox/save-as-alternative     │       │       │
│  │  DELETE /api/sandbox/:sandboxId              │       │       │
│  │  GET    /api/sandbox/project/:projectId      │       │       │
│  └──────────────────────┬───────────────────────┘       │       │
│                         │                       │       │       │
│                         │                       │       │       │
│                         │              ┌────────┼───────┼───┐   │
│                         │              │                    │   │
│                         ▼              ▼                    │   │
│         ┌───────────────────────────────────────┐           │   │
│         │     IDEA GENERATOR AGENT              │           │   │
│         │  (backend/src/agents/               │           │   │
│         │   IdeaGeneratorAgent.ts)             │           │   │
│         │                                       │           │   │
│         │  - generateIdeas()                    │           │   │
│         │    • Build prompt                     │           │   │
│         │    • Call Claude API                  │           │   │
│         │    • Parse JSON response              │           │   │
│         │                                       │           │   │
│         │  - refineIdea()                       │           │   │
│         │    • Expand on specific idea          │           │   │
│         │    • Provide implementation details   │           │   │
│         │                                       │           │   │
│         │  - combineIdeas()                     │           │   │
│         │    • Create synergistic combinations  │           │   │
│         │                                       │           │   │
│         │  Maintains conversation history       │           │   │
│         └───────────────┬───────────────────────┘           │   │
│                         │                                   │   │
│                         │ Claude API                        │   │
│                         │                                   │   │
│                         ▼                                   │   │
│         ┌───────────────────────────────────────┐           │   │
│         │     ANTHROPIC CLAUDE API              │           │   │
│         │     (claude-sonnet-4-20250514)        │           │   │
│         │                                       │           │   │
│         │  - Receives structured prompt         │           │   │
│         │  - Generates creative ideas           │           │   │
│         │  - Returns JSON with ideas            │           │   │
│         └───────────────────────────────────────┘           │   │
│                                                             │   │
│                                                             │   │
└─────────────────────────────────────────────────────────────┼───┘
                                                              │
                                      Supabase Client         │
                                                              │
                                                              ▼
                            ┌─────────────────────────────────────┐
                            │         SUPABASE DATABASE           │
                            │         (PostgreSQL)                │
                            │                                     │
                            │  ┌──────────────────────────┐       │
                            │  │  sandbox_sessions        │       │
                            │  │  ──────────────────────  │       │
                            │  │  id (UUID)               │       │
                            │  │  project_id (UUID)       │       │
                            │  │  user_id (TEXT)          │       │
                            │  │  name (TEXT)             │       │
                            │  │  original_project_state  │       │
                            │  │    (JSONB)               │       │
                            │  │  sandbox_state (JSONB)   │       │
                            │  │    {                     │       │
                            │  │      ideas: [...],       │       │
                            │  │      decisions: [...],   │       │
                            │  │      explorations: [...] │       │
                            │  │    }                     │       │
                            │  │  status (TEXT)           │       │
                            │  │  created_at (TIMESTAMP)  │       │
                            │  │  updated_at (TIMESTAMP)  │       │
                            │  └──────────────────────────┘       │
                            │                                     │
                            │  ┌──────────────────────────┐       │
                            │  │  projects                │       │
                            │  │  (linked via project_id) │       │
                            │  └──────────────────────────┘       │
                            │                                     │
                            │  RLS Policies:                      │
                            │  - User-scoped access               │
                            │  - Secure row-level security        │
                            │                                     │
                            │  Indexes:                           │
                            │  - project_id                       │
                            │  - user_id                          │
                            │  - status                           │
                            │  - created_at                       │
                            └─────────────────────────────────────┘
```

## Data Flow Diagram

### 1. Generate Ideas Flow

```
User clicks         Frontend sends          Backend creates         Claude generates
"Generate Ideas" → request with context → structured prompt    →   creative ideas
                                                                    (JSON format)
                                                                          ↓
                                                                    Parse & validate
                                                                          ↓
User sees animated ← Frontend displays ← Backend returns    ←    Store in sandbox_state
idea cards            ideas                ideas array
```

### 2. Extract Ideas Flow

```
User selects ideas → Frontend sends      → Backend retrieves → Backend converts
and clicks Extract   selected idea IDs     ideas from sandbox  to project items
                                                                      ↓
                                                               Add to main project
                                                                      ↓
Success message   ←  Frontend receives  ←  Backend returns   ← Update database
displayed            confirmation          extracted items
```

### 3. Save as Alternative Flow

```
User enters        → Frontend sends     → Backend updates    → New sandbox
alternative name     sandbox ID & name    status to 'saved'    created
                                                                   ↓
User continues   ←  Frontend reloads   ← Backend returns    ← Active sandbox
with new sandbox    sandbox              new sandbox
```

## Component Hierarchy

```
App
└── Layout
    └── SandboxPage
        ├── Header Section
        │   ├── Title & Description
        │   └── Action Buttons
        │       ├── Extract Button
        │       ├── Save as Alternative Button
        │       └── Discard Button
        │
        ├── Idea Generator Controls
        │   ├── Direction Selector
        │   │   ├── Innovative
        │   │   ├── Practical
        │   │   ├── Budget
        │   │   ├── Premium
        │   │   └── Experimental
        │   │
        │   ├── Generate Button
        │   │
        │   └── Quick Actions
        │       ├── Combine Ideas
        │       ├── Refine Selected
        │       └── Generate Variations
        │
        └── Ideas Grid
            ├── IdeaCard (repeating)
            │   ├── Selection Checkbox
            │   ├── Icon
            │   ├── Title
            │   ├── Description
            │   ├── Reasoning Section
            │   ├── Tags
            │   ├── Innovation Level Badge
            │   └── Refine Link
            │
            └── Empty State
                ├── Icon
                ├── Message
                └── Instruction
```

## State Management

```
┌─────────────────────────────────────┐
│      Component State (useState)     │
├─────────────────────────────────────┤
│                                     │
│  activeSandbox: Sandbox | null      │
│    - Current sandbox session        │
│                                     │
│  ideas: Idea[]                      │
│    - All generated ideas            │
│                                     │
│  selectedIdeas: Set<string>         │
│    - Selected idea IDs              │
│                                     │
│  generating: boolean                │
│    - Loading state                  │
│                                     │
│  direction: Direction               │
│    - Selected creative direction    │
│                                     │
└─────────────────────────────────────┘
         │                    ▲
         │                    │
         ▼                    │
┌─────────────────────────────────────┐
│      Global State (Zustand)        │
├─────────────────────────────────────┤
│                                     │
│  currentProject: Project | null     │
│    - Selected project (from store)  │
│                                     │
│  isDarkMode: boolean                │
│    - Theme preference               │
│                                     │
└─────────────────────────────────────┘
```

## API Request/Response Format

### Generate Ideas Request
```json
{
  "sandboxId": "uuid-123",
  "projectContext": "Project: AI Tool\nDescription: Building...",
  "currentDecisions": [
    { "text": "Use React", "state": "decided" }
  ],
  "direction": "innovative",
  "quantity": 5
}
```

### Generate Ideas Response
```json
{
  "success": true,
  "ideas": [
    {
      "id": "idea-1",
      "title": "AI-Powered Search",
      "description": "Implement semantic search using embeddings",
      "reasoning": "Would improve user experience significantly",
      "impact": "30% faster search results",
      "considerations": "Requires vector database setup",
      "tags": ["ai", "search", "ux"],
      "innovationLevel": "moderate"
    }
  ]
}
```

## Security Architecture

```
┌────────────────────────────────────┐
│         Authentication             │
│         (Supabase Auth)            │
└────────────────┬───────────────────┘
                 │
                 │ JWT Token
                 │
                 ▼
┌────────────────────────────────────┐
│      Backend Middleware            │
│      (Token Validation)            │
└────────────────┬───────────────────┘
                 │
                 │ Validated User
                 │
                 ▼
┌────────────────────────────────────┐
│    Row-Level Security (RLS)        │
│    - User can only access their    │
│      own sandbox sessions          │
│    - Project-based access control  │
└────────────────────────────────────┘
```

## Performance Optimization

### Frontend
- **React.memo()** for IdeaCard components
- **Lazy loading** of SandboxPage
- **Debounced selection** to prevent excessive re-renders
- **Animated entrance** with staggered timing
- **Optimistic UI updates** for better UX

### Backend
- **Database indexes** on frequently queried columns
- **Connection pooling** for Supabase
- **Efficient JSONB queries** for sandbox_state
- **Caching** of Claude API responses (conversation history)

### Database
- **JSONB** for flexible idea storage
- **Indexes** on project_id, user_id, status, created_at
- **Triggers** for automatic updated_at
- **Efficient queries** using proper JOINs

## Scalability Considerations

### Horizontal Scaling
- Stateless backend API (can run multiple instances)
- Supabase handles database scaling
- Claude API has built-in rate limiting and scaling

### Data Volume
- Sandbox sessions can be archived after certain time
- Old sandboxes can be moved to cold storage
- Ideas stored as JSONB for efficient storage

### Concurrent Users
- Row-level security ensures data isolation
- Multiple users can have active sandboxes simultaneously
- No locking required (each user has their own sandbox)

---

**Architecture designed for scalability, security, and performance! 🚀**
