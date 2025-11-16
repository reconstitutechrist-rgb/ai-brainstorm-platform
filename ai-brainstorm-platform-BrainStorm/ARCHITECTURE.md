# AI Brainstorm Platform - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                        │
│                        http://localhost:5173                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Dashboard │  │   Chat   │  │Documents │  │  Agents  │  │Settings │ │
│  │   Page   │  │   Page   │  │   Page   │  │   Page   │  │  Page   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       └──────────────┴─────────────┴──────────────┴─────────────┘      │
│                                  │                                      │
│                        ┌─────────▼─────────┐                           │
│                        │   Zustand Stores  │                           │
│                        │  (State Manager)  │                           │
│                        └─────────┬─────────┘                           │
│                                  │                                      │
│                        ┌─────────▼─────────┐                           │
│                        │   API Service     │                           │
│                        │   (Axios Client)  │                           │
│                        └─────────┬─────────┘                           │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
                                   │ REST API (JSON)
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                     BACKEND (Express + TypeScript)                     │
│                        http://localhost:3001                           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                      API ROUTES                                │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │  /api/projects          │  CRUD for projects                  │   │
│  │  /api/conversations     │  Chat messages & AI responses       │   │
│  │  /api/references        │  File uploads & analysis            │   │
│  │  /api/agents            │  Agent information                  │   │
│  └────────────────────────┬──────────────────────────────────────┘   │
│                           │                                            │
│  ┌────────────────────────▼──────────────────────────────────────┐   │
│  │              AGENT COORDINATION SERVICE                        │   │
│  │  • Processes user messages                                     │   │
│  │  • Determines workflow based on intent                         │   │
│  │  • Executes agent sequence                                     │   │
│  │  • Updates project state                                       │   │
│  └────────────────────────┬──────────────────────────────────────┘   │
│                           │                                            │
│  ┌────────────────────────▼──────────────────────────────────────┐   │
│  │             INTEGRATION ORCHESTRATOR                           │   │
│  │  • Coordinates 9 specialized agents                            │   │
│  │  • Manages workflow execution                                  │   │
│  │  • Handles conditional logic                                   │   │
│  │  • Tracks workflow history                                     │   │
│  └────────────────────────┬──────────────────────────────────────┘   │
│                           │                                            │
│  ┌────────────────────────▼──────────────────────────────────────┐   │
│  │           PAGE-SPECIFIC ORCHESTRATORS (NEW)                    │   │
│  │  • ChatOrchestrator - Chat page workflows                      │   │
│  │  • DocumentOrchestrator - Auto-document generation             │   │
│  │  • ResearchOrchestrator - Research with context separation     │   │
│  │  • SandboxOrchestrator - Extraction validation                 │   │
│  └────────────────────────┬──────────────────────────────────────┘   │
│                           │                                            │
│         ┌─────────────────┴──────────────────┐                        │
│         │                                    │                        │
│  ┌──────▼──────┐                   ┌────────▼────────┐               │
│  │   9 AI      │                   │  Support        │               │
│  │  AGENTS     │                   │  SERVICES       │               │
│  ├─────────────┤                   ├─────────────────┤               │
│  │ 1. Context  │                   │ • FileUpload    │               │
│  │    Manager  │                   │ • Supabase      │               │
│  │ 2. Conversa-│                   │ • Base Agent    │               │
│  │    tion     │                   └────────┬────────┘               │
│  │ 3. Quality  │                            │                        │
│  │    Auditor  │                            │                        │
│  │ 4. Strategic│                            │                        │
│  │    Planner  │                            │                        │
│  │ 5. Persiste-│                            │                        │
│  │    nce Mgr  │                            │                        │
│  │ 6. Reference│                            │                        │
│  │    Analysis │                            │                        │
│  │ 7. Unified  │                            │                        │
│  │    Research │                            │                        │
│  │ 8. Reviewer │                            │                        │
│  │ 9. Resource │                            │                        │
│  │    Manager  │                            │                        │
│  └────────┬────┘                            │                        │
│           │                                 │                        │
│           └─────────────┬───────────────────┘                        │
│                         │                                            │
└─────────────────────────┼────────────────────────────────────────────┘
                          │
        ┌─────────────────┴──────────────────┐
        │                                    │
┌───────▼────────┐              ┌────────────▼──────────┐
│  ANTHROPIC     │              │     SUPABASE          │
│  CLAUDE API    │              │   (PostgreSQL)        │
├────────────────┤              ├───────────────────────┤
│ • Claude       │              │ Tables:               │
│   Sonnet 4     │              │ • projects            │
│ • Message API  │              │ • messages            │
│ • Streaming    │              │ • references          │
│   (future)     │              │ • agent_activity      │
└────────────────┘              │                       │
                                │ Storage:              │
                                │ • references bucket   │
                                │   (file uploads)      │
                                └───────────────────────┘
```

---

## Data Flow Diagram

### User Message Processing Flow

```
1. USER INPUT
   │
   └─> Frontend ChatPage
       └─> chatStore.addMessage()
           └─> API Service: POST /api/conversations/message
               │
               ▼
2. BACKEND RECEIVES MESSAGE
   │
   └─> conversationRoutes.post('/')
       └─> agentCoordinationService.processUserMessage()
           │
           ├─> Step 1: Validate Input
           ├─> Step 2: Fetch Project State (Supabase)
           ├─> Step 3: Get Conversation History (Supabase)
           │
           ▼
3. INTENT CLASSIFICATION
   │
   └─> ContextManagerAgent.classifyIntent()
       └─> Claude API call
           └─> Returns: IntentClassification
               • type: 'brainstorming' | 'deciding' | ...
               • confidence: 0-100
               • needsClarification: boolean
               │
               ▼
4. WORKFLOW DETERMINATION
   │
   └─> IntegrationOrchestrator.determineWorkflow()
       └─> Maps intent to agent sequence
           │
           Example for 'deciding':
           ├─> BrainstormingAgent.reflect()
           ├─> VerificationAgent.verify()
           ├─> AssumptionBlockerAgent.scan()
           ├─> ConsistencyGuardianAgent.checkConsistency()
           ├─> RecorderAgent.record() [if verified]
           └─> VersionControlAgent.trackChange()
           │
           ▼
5. WORKFLOW EXECUTION
   │
   └─> IntegrationOrchestrator.executeWorkflow()
       │
       For each agent in sequence:
       ├─> Check condition (if any)
       ├─> Execute agent action
       ├─> Claude API call with context
       ├─> Parse agent response
       └─> Add to results[]
           │
           ▼
6. STATE UPDATES
   │
   └─> Update Project State (if changes)
       ├─> Supabase: UPDATE projects
       ├─> Supabase: INSERT INTO messages
       └─> Supabase: INSERT INTO agent_activity
           │
           ▼
7. RESPONSE TO FRONTEND
   │
   └─> Return AgentResponse[]
       └─> Frontend receives responses
           └─> chatStore.addMessages()
               └─> UI updates with agent messages
                   └─> User sees responses
```

---

## Agent Workflow Types

### 1. Brainstorming Workflow
```
User: "I'm thinking about building a fitness app"
  │
  ├─> BrainstormingAgent: Reflect on idea
  ├─> GapDetectionAgent: Identify missing info
  └─> ClarificationAgent: Ask follow-up questions [if gaps found]
```

### 2. Deciding Workflow
```
User: "I've decided we'll target iOS first"
  │
  ├─> BrainstormingAgent: Reflect on decision
  ├─> VerificationAgent: Validate (no assumptions)
  ├─> AssumptionBlockerAgent: Scan for assumptions
  ├─> ConsistencyGuardianAgent: Check contradictions
  ├─> RecorderAgent: Document decision [if verified]
  └─> VersionControlAgent: Track change
```

### 3. Modifying Workflow
```
User: "Actually, let's do web app instead of mobile"
  │
  ├─> BrainstormingAgent: Reflect on change
  ├─> VerificationAgent: Validate change
  ├─> ConsistencyGuardianAgent: Check conflicts
  ├─> VersionControlAgent: Track modification
  └─> AccuracyAuditorAgent: Audit consistency
```

### 4. Development Workflow
```
User: "Find vendors for authentication"
  │
  ├─> TranslationAgent: Translate requirement
  ├─> DevelopmentAgent: Research vendors
  └─> ReviewerAgent: Review recommendations
```

### 5. Exploring Workflow
```
User: "What if we added gamification?"
  │
  ├─> BrainstormingAgent: Explore idea
  └─> QuestionerAgent: Generate strategic questions
```

### 6. Reviewing Workflow
```
User: "Review what we've decided so far"
  │
  ├─> AccuracyAuditorAgent: Audit all decisions
  └─> PrioritizationAgent: Sequence next steps
```

---

## State Management Architecture

### Frontend State (Zustand)

```
┌─────────────────────────────────────────────────┐
│              ZUSTAND STORES                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  themeStore                                     │
│  ├─ isDark: boolean                             │
│  ├─ setDark()                                   │
│  ├─ setLight()                                  │
│  └─ toggleTheme()                               │
│                                                 │
│  projectStore                                   │
│  ├─ projects: Project[]                         │
│  ├─ currentProject: Project | null              │
│  ├─ setProjects()                               │
│  ├─ setCurrentProject()                         │
│  ├─ addProject()                                │
│  └─ updateProject()                             │
│                                                 │
│  chatStore                                      │
│  ├─ messages: Message[]                         │
│  ├─ isTyping: boolean                           │
│  ├─ activeAgents: string[]                      │
│  ├─ addMessage()                                │
│  ├─ addMessages()                               │
│  ├─ setTyping()                                 │
│  └─ clearMessages()                             │
│                                                 │
│  referenceStore                                 │
│  ├─ references: Reference[]                     │
│  ├─ uploading: boolean                          │
│  ├─ addReference()                              │
│  └─ removeReference()                           │
│                                                 │
│  uiStore                                        │
│  ├─ modals: { createProject: boolean }          │
│  └─ setModalOpen()                              │
│                                                 │
│  userStore                                      │
│  ├─ user: User | null                           │
│  └─ setUser()                                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Backend State (Database)

```
┌─────────────────────────────────────────────────┐
│           SUPABASE DATABASE                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  projects                                       │
│  ├─ id (UUID, PK)                               │
│  ├─ user_id (TEXT)                              │
│  ├─ title (TEXT)                                │
│  ├─ description (TEXT)                          │
│  ├─ status (TEXT) ← 'decided'|'exploring'|...   │
│  ├─ items (JSONB) ← State columns data          │
│  ├─ created_at (TIMESTAMP)                      │
│  └─ updated_at (TIMESTAMP)                      │
│                                                 │
│  messages                                       │
│  ├─ id (UUID, PK)                               │
│  ├─ project_id (UUID, FK)                       │
│  ├─ user_id (TEXT)                              │
│  ├─ role (TEXT) ← 'user'|'assistant'|'system'   │
│  ├─ content (TEXT)                              │
│  ├─ agent_type (TEXT) ← Agent name              │
│  ├─ metadata (JSONB)                            │
│  └─ created_at (TIMESTAMP)                      │
│                                                 │
│  references                                     │
│  ├─ id (UUID, PK)                               │
│  ├─ project_id (UUID, FK)                       │
│  ├─ user_id (TEXT)                              │
│  ├─ file_url (TEXT)                             │
│  ├─ type (TEXT) ← 'image'|'video'|'document'    │
│  ├─ filename (TEXT)                             │
│  ├─ analysis_status (TEXT)                      │
│  ├─ analysis (TEXT) ← AI analysis result        │
│  ├─ metadata (JSONB)                            │
│  ├─ created_at (TIMESTAMP)                      │
│  └─ updated_at (TIMESTAMP)                      │
│                                                 │
│  agent_activity                                 │
│  ├─ id (UUID, PK)                               │
│  ├─ project_id (UUID, FK)                       │
│  ├─ agent_type (TEXT)                           │
│  ├─ action (TEXT)                               │
│  ├─ details (JSONB)                             │
│  └─ created_at (TIMESTAMP)                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## File Structure

```
ai-brainstorm-platform/
│
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── base.ts                 # BaseAgent class
│   │   │   ├── orchestrator.ts         # Workflow coordinator
│   │   │   ├── contextManager.ts       # Intent classification
│   │   │   ├── conversation.ts         # User responses
│   │   │   ├── qualityAuditor.ts       # Quality checks
│   │   │   ├── strategicPlanner.ts     # Priority planning
│   │   │   ├── persistenceManager.ts   # State persistence
│   │   │   ├── referenceAnalysis.ts    # File analysis
│   │   │   ├── unifiedResearchAgent.ts # Web + Doc research
│   │   │   ├── reviewer.ts             # QA
│   │   │   └── resourceManager.ts      # Resource org
│   │   │
│   │   ├── orchestrators/              # NEW: Page-specific orchestrators
│   │   │   ├── ChatOrchestrator.ts     # Chat page workflows
│   │   │   ├── DocumentOrchestrator.ts # Auto-doc generation
│   │   │   ├── ResearchOrchestrator.ts # Research with separation
│   │   │   └── SandboxOrchestrator.ts  # Extraction validation
│   │   │
│   │   ├── routes/
│   │   │   ├── projects.ts             # Project CRUD
│   │   │   ├── conversations.ts        # Chat endpoints
│   │   │   ├── references.ts           # File uploads
│   │   │   ├── research.ts             # Research endpoints
│   │   │   ├── generated-documents.ts  # Document generation
│   │   │   ├── sandbox.ts              # Sandbox operations
│   │   │   └── agents.ts               # Agent info
│   │   │
│   │   ├── services/
│   │   │   ├── supabase.ts             # DB connection
│   │   │   ├── fileUpload.ts           # Multer + Sharp
│   │   │   └── agentCoordination.ts    # Main orchestration
│   │   │
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript types
│   │   │
│   │   └── index.ts                    # Express server
│   │
│   ├── uploads/                        # Temporary files
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FloatingNav.tsx         # Draggable nav
│   │   │   ├── DarkModeToggle.tsx      # Theme toggle
│   │   │   ├── Layout.tsx              # App wrapper
│   │   │   ├── ReferenceUpload.tsx     # File upload
│   │   │   └── modals/
│   │   │       └── CreateProjectModal.tsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx           # Project overview
│   │   │   ├── ChatPage.tsx            # AI conversation
│   │   │   ├── AgentsPage.tsx          # Agent directory
│   │   │   ├── DocumentsPage.tsx       # State columns
│   │   │   └── SettingsPage.tsx        # Configuration
│   │   │
│   │   ├── store/
│   │   │   ├── themeStore.ts           # Dark mode
│   │   │   ├── projectStore.ts         # Projects
│   │   │   ├── chatStore.ts            # Messages
│   │   │   ├── referenceStore.ts       # Files
│   │   │   ├── userStore.ts            # Auth
│   │   │   └── uiStore.ts              # UI state
│   │   │
│   │   ├── services/
│   │   │   └── api.ts                  # Axios client
│   │   │
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript types
│   │   │
│   │   ├── App.tsx                     # Router setup
│   │   ├── main.tsx                    # Entry point
│   │   └── index.css                   # Global styles
│   │
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── .env
│
├── database/
│   └── schema.sql                      # Supabase schema
│
├── docs/                               # Additional docs
│
├── .gitignore
├── README.md
├── PROJECT_SUMMARY.md
├── QUICKSTART.md
├── SETUP.md
├── START.md
├── COMPLETION_CHECKLIST.md
├── PROJECT_STATUS.md
└── ARCHITECTURE.md                     # This file
```

---

## Technology Stack Deep Dive

### Backend Stack

```
┌────────────────────────────────────────┐
│         Node.js Runtime                │
│         (v18 or higher)                │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│         Express.js 5                   │
│   • Routing                            │
│   • Middleware                         │
│   • CORS                               │
└────────────────┬───────────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
┌──────▼──────┐    ┌──────▼──────────┐
│ TypeScript  │    │  Dependencies   │
│    5.9      │    ├─────────────────┤
└─────────────┘    │ • @anthropic-ai │
                   │ • @supabase     │
                   │ • multer        │
                   │ • sharp         │
                   │ • uuid          │
                   └─────────────────┘
```

### Frontend Stack

```
┌────────────────────────────────────────┐
│            React 19                    │
│   • Functional Components              │
│   • Hooks (useState, useEffect, etc)   │
│   • Context API (via Zustand)          │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│            Vite 7                      │
│   • Fast HMR                           │
│   • Build optimization                 │
│   • Plugin system                      │
└────────────────┬───────────────────────┘
                 │
       ┌─────────┴─────────┐
       │                   │
┌──────▼──────┐    ┌──────▼──────────┐
│ TypeScript  │    │  UI Libraries   │
│    5.9      │    ├─────────────────┤
└─────────────┘    │ • Tailwind CSS  │
                   │ • Framer Motion │
                   │ • Lucide Icons  │
                   │ • React Router  │
                   └─────────────────┘
```

---

## Security Architecture

```
┌─────────────────────────────────────────────┐
│          SECURITY LAYERS                    │
├─────────────────────────────────────────────┤
│                                             │
│  1. Environment Variables                   │
│     • .env files (not in git)               │
│     • API keys secured                      │
│     • Database credentials protected        │
│                                             │
│  2. CORS Configuration                      │
│     • Whitelist: localhost:5173             │
│     • Credentials: true                     │
│     • Methods: GET, POST, PUT, DELETE       │
│                                             │
│  3. Row Level Security (Supabase)           │
│     • User-based access control             │
│     • Policy enforcement on tables          │
│     • Storage bucket policies               │
│                                             │
│  4. Input Validation                        │
│     • File size limits (50MB)               │
│     • File type validation                  │
│     • SQL injection prevention (Supabase)   │
│                                             │
│  5. XSS Protection                          │
│     • React auto-escaping                   │
│     • No dangerouslySetInnerHTML            │
│     • Content Security Policy (future)      │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Performance Considerations

### Current Setup
- **No caching**: Every request hits the database
- **No rate limiting**: Unlimited API calls
- **No CDN**: Static files served from Vite
- **Direct Claude API**: No request batching

### Future Optimizations
```
1. Caching Layer (Redis)
   ├─ Cache frequently accessed projects
   ├─ Cache conversation history
   └─ Cache agent responses (optional)

2. Rate Limiting
   ├─ Limit API calls per user
   ├─ Prevent abuse
   └─ Queue management

3. Request Batching
   ├─ Batch multiple Claude API calls
   ├─ Reduce latency
   └─ Cost optimization

4. Database Optimization
   ├─ Connection pooling ✅ (Supabase handles)
   ├─ Indexes ✅ (already implemented)
   └─ Query optimization

5. Frontend Optimization
   ├─ Code splitting
   ├─ Lazy loading
   ├─ Image optimization
   └─ Service worker (PWA)
```

---

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────────────┐
│               PRODUCTION SETUP                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Frontend (Vercel/Netlify)                      │
│  ├─ CDN distribution                            │
│  ├─ Automatic HTTPS                             │
│  ├─ Preview deployments                         │
│  └─ Edge functions                              │
│                                                 │
│  Backend (Railway/Render/Fly.io)                │
│  ├─ Auto-scaling                                │
│  ├─ Health checks                               │
│  ├─ Environment variables                       │
│  └─ Monitoring                                  │
│                                                 │
│  Database (Supabase Production)                 │
│  ├─ Connection pooling                          │
│  ├─ Automated backups                           │
│  ├─ Point-in-time recovery                      │
│  └─ Read replicas                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Development Workflow

```
1. LOCAL DEVELOPMENT
   ├─ Backend: npm run dev (nodemon + ts-node)
   ├─ Frontend: npm run dev (Vite HMR)
   └─ Database: Supabase cloud instance

2. TESTING
   ├─ Manual testing in browser
   ├─ API testing (Postman/Thunder Client)
   └─ Database queries (Supabase dashboard)

3. VERSION CONTROL
   ├─ Git repository
   ├─ Feature branches (recommended)
   └─ .gitignore configured

4. DEPLOYMENT
   ├─ Backend: npm run build → dist/
   ├─ Frontend: npm run build → dist/
   └─ Deploy to hosting platform
```

---

**This architecture supports:**
- ✅ Scalability
- ✅ Maintainability
- ✅ Extensibility
- ✅ Security
- ✅ Performance

**Ready for production with minimal changes!**
