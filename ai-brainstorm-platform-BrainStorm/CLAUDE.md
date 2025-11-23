# === USER INSTRUCTIONS ===

AI-powered brainstorming and research platform with 9 specialized AI agents, 4 page-specific orchestrators, and real-time SSE updates. Implements sophisticated multi-agent coordination with intent-based routing, parallel execution, and cross-agent context sharing.

For comprehensive agent documentation, see: AGENTS_DOCUMENTATION.md
For page-specific orchestrators, see: ORCHESTRATORS.md

## Development Guidelines

- Only modify code directly relevant to the specific request. Avoid changing unrelated functionality.
- Never replace code with placeholders like `# ... rest of the processing ...`. Always include complete code.
- Break problems into smaller steps. Think through each step separately before implementing.
- Always provide a complete PLAN with REASONING based on evidence from code and logs before making changes.
- Explain your OBSERVATIONS clearly, then provide REASONING to identify the exact issue. Add console logs when needed to gather more information.

# === END USER INSTRUCTIONS ===

# AI Brainstorm Platform - System Overview

## Core Architecture

### 1. Multi-Agent System (95/100)

**9 Specialized AI Agents** with distinct roles:

**Core Agents (5):**

- ConversationAgent: Natural language understanding and response generation
- PersistenceManagerAgent: Data storage and retrieval coordination
- QualityAuditorAgent: Response validation and quality checking
- StrategicPlannerAgent: Long-term planning and goal alignment
- ContextManagerAgent: Context pruning and relevance filtering

**Support Agents (4):**

- ReferenceAnalysisAgent: Document and file analysis
- ReviewerAgent: Content review and feedback generation
- ResourceManagerAgent: Asset and reference management
- UnifiedResearchAgent: Web + document research (replaces LiveResearchAgent + DocumentResearchAgent)

**Location:** `backend/src/agents/`

**Key Features:**

- Intent-based routing and workflow categorization
- Parallel/sequential execution based on dependencies
- Context-aware agent selection with pruning
- Response caching and optimization
- Cross-agent context sharing

---

### 2. Page-Specific Orchestrators (90/100)

**4 Specialized Orchestrators** coordinate agents for different workflows:

- **ChatOrchestrator:** Real-time chat workflows with quality metadata
- **DocumentOrchestrator:** Auto-document generation (PRD, Tech Spec, User Stories, Roadmap)
- **ResearchOrchestrator:** Unified research with semantic similarity detection
- **SandboxOrchestrator:** Idea extraction validation with duplicate detection

**Location:** `backend/src/orchestrators/`

**Operational Modes:**

- Quick Mode: Fast responses (2-3 seconds)
- Verify & Generate Mode: Quality-checked with full validation

---

### 3. Real-Time Updates System (NEW - 95/100)

**SSE-based real-time updates** via SharedWorker pattern:

**Frontend:**

- SharedWorker managing single SSE connection across all browser tabs
- Automatic reconnection with exponential backoff
- Event types: `item_added`, `item_modified`, `item_moved`, `workflow_complete`
- Graceful fallback for unsupported browsers (Safari)

**Backend:**

- SSE streaming endpoint: `GET /:projectId/updates-stream`
- 500ms polling interval of updatesCache
- Heartbeat every ~5 seconds
- Automatic cleanup on disconnect

**Performance:**

- 98% reduction in API calls (from 30+/min to 1 persistent connection)
- <500ms update latency (improved from 0-2s polling)
- Single connection shared across all tabs

**Location:**

- Frontend: `frontend/public/sse-worker.js`, `frontend/src/hooks/useRealtimeUpdates.ts`
- Backend: `backend/src/routes/conversations.ts` (line ~483)

---

### 4. Research Intelligence Hub (90/100)

**Unified research system** combining multiple sources:

- Web search + document analysis in single workflow
- Intent classification: research/discovery/gap_analysis
- Cross-source synthesis with confidence scoring
- Contradiction detection between sources
- Automated quality assessment and gap analysis
- Document suggestion engine with relevance scoring

**Location:** `backend/src/services/unifiedResearchAgent.ts`

---

### 5. Session Management System (85/100)

**Multi-stage brainstorming lifecycle:**

- Four-stage progression: mentioned → exploring → refined → ready_to_extract
- Innovation classification: practical/moderate/experimental
- Topic-based idea grouping and clustering
- Conflict detection and blocker identification
- Natural language decision parsing
- Multi-document synchronization

**Location:** `backend/src/services/sessionService.ts`

---

### 6. Conversational Intelligence (85/100)

**Context-aware conversation system:**

- Dynamic mode switching: exploration/clarification/generation/refinement
- Real-time idea extraction from natural dialogue
- Quick prompt suggestions based on context
- Intent detection with confidence scoring
- Cross-reference analysis
- Innovation level assessment

**Location:** `backend/src/agents/ConversationalIdeaAgent.ts`

---

### 7. Canvas Management System (80/100)

**Visual workspace organization:**

- Dynamic clustering of related project items
- State-based visual organization (decided/exploring/archived)
- Capacity management with graduated warnings (60%/80%/90%)
- Auto-positioning based on semantic relationships
- Position memory for expanded/collapsed states
- Drag-and-drop with collision detection

**Location:** `frontend/src/components/canvas/VisualCanvas.tsx`

---

## Integration Architecture

```
User Input → ChatOrchestrator
    ↓
Intent Detection → Agent Selection
    ↓
Parallel Agent Execution → Context Sharing
    ↓
Quality Validation → Response Generation
    ↓
SSE Stream → Real-time Updates → All Browser Tabs
    ↓
Canvas Visualization + Session Tracking
```

**Key Integration Points:**

- Agent orchestration drives conversation flow
- Research system feeds unified information
- Session analytics tracks progress and blockers
- SSE system provides real-time updates (replaces polling)
- Canvas provides visual organization
- Persistence manager coordinates data flow

---

## Key Workflows

1. **Chat Workflow:** User message → Intent detection → Agent coordination → Real-time response + SSE updates
2. **Research Workflow:** Query → Unified research (web + docs) → Synthesis → Quality scoring → Results
3. **Sandbox Workflow:** Brainstorm → Idea extraction → Validation → Conflict detection → Integration
4. **Document Workflow:** Requirements → Auto-generation (PRD/Tech Spec) → Quality check → Export
5. **Session Workflow:** Ideas → Clustering → Progress tracking → Decision support → Completion

---

## Technical Stack

**Backend:**

- Node.js + Express + TypeScript
- Supabase (PostgreSQL)
- Anthropic Claude API
- SSE for real-time updates

**Frontend:**

- React 18 + Vite + TypeScript
- Zustand (state management)
- Tailwind CSS
- SharedWorker for SSE

**Key Files:**

- Agents: `backend/src/agents/*.ts`
- Orchestrators: `backend/src/orchestrators/*.ts`
- Routes: `backend/src/routes/*.ts`
- SSE: `backend/src/routes/conversations.ts`, `frontend/public/sse-worker.js`
- Canvas: `frontend/src/components/canvas/`
- Hooks: `frontend/src/hooks/`

---

This is a unique implementation focused on AI-assisted brainstorming with sophisticated multi-agent coordination, real-time updates, and intelligent workflow orchestration.
