# AI Brainstorm Platform - Copilot Instructions

## Project Context & Architecture
This is a multi-agent AI brainstorming platform powered by Claude Sonnet 4, designed to transform ideas into actionable plans.
- **Architecture:** Hybrid architecture with 9 specialized AI agents and 4 page-specific orchestrators.
- **Frontend:** React + Vite + TypeScript + Tailwind CSS + Zustand (State).
- **Backend:** Node.js + Express + TypeScript + Supabase (PostgreSQL).
- **Core Logic:** Intent-based routing, parallel agent execution, and context-aware synthesis.

### Key Directories
- `backend/src/agents/`: Implementation of the 9 specialized AI agents.
- `backend/src/orchestrators/`: Page-specific orchestrators (Chat, Document, Research, Sandbox).
- `backend/src/services/`: Business logic and support services.
- `frontend/src/store/`: Zustand state management stores.
- `frontend/src/pages/`: Main page components corresponding to orchestrators.

## Tech Stack & Key Libraries
- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion, Lucide React, React Router DOM.
- **Backend:** Express, Anthropic SDK, Supabase JS, Multer (uploads), Mammoth (DOCX).
- **Testing:** Vitest (Frontend & Backend).
- **Database:** PostgreSQL via Supabase.

## Development Workflow
- **Frontend Dev:** `npm run dev` (Vite)
- **Backend Dev:** `npm run dev` (Nodemon + ts-node)
- **Testing:** `npm test` (Vitest)
- **Database:** Migrations located in `database/migrations/`.

## Coding Conventions & Best Practices
- **Code Modification:** Only modify code directly relevant to the request. Do not use placeholders like `# ... rest of code`.
- **Planning:** Always provide a complete PLAN with REASONING based on evidence before making changes.
- **Logging:** Use console logs to gather observations before fixing issues.
- **State Management:** Use Zustand for frontend state. Follow the "Three-Column State System" (Decided / Exploring / Parked).
- **Agent Implementation:**
  - Follow the pattern in `backend/src/agents/`.
  - Ensure agents are coordinated via `IntegrationOrchestrator` or page-specific orchestrators.
- **Orchestration:**
  - **ChatOrchestrator:** Handles intent-based chat workflows.
  - **DocumentOrchestrator:** Manages auto-document generation.
  - **ResearchOrchestrator:** Separates new vs. decided items.
  - **SandboxOrchestrator:** Validates extractions and detects duplicates.

## Agent & Orchestration Specifics
- **Core Agents:** Context Manager, Conversation, Quality Auditor, Strategic Planner, Persistence Manager.
- **Support Agents:** Reference Analysis, Unified Research, Reviewer, Resource Manager.
- **Unified Research:** Use `UnifiedResearchAgent` for both web and document research (replaces deprecated agents).
- **Context:** Respect the `.giga/rules` if referenced.

## Common Patterns
- **Intent Routing:** The `IntegrationOrchestrator` determines the workflow based on user intent.
- **Parallel Execution:** Agents can run in parallel for efficiency.
- **Zero Assumptions:** The system enforces strict accuracy validation with assumption scanning.
