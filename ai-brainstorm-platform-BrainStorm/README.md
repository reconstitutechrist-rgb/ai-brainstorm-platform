# AI Brainstorm Platform

A sophisticated multi-agent AI brainstorming platform powered by Claude Sonnet 4, featuring 18 specialized agents working together to transform ideas into actionable plans.

## 🌟 Features

- **18 Specialized AI Agents** - Each with unique responsibilities
- **Multi-Agent Orchestration** - Agents collaborate seamlessly
- **Three-Column State System** - Decided / Exploring / Parked
- **Real-time Chat Interface** - Natural conversation with AI agents
- **Zero Assumptions** - Strict accuracy validation
- **Citation Tracking** - Full traceability of decisions
- **Reference Analysis** - Upload images, videos, PDFs for AI analysis
- **Dark Mode** - Beautiful glassmorphism UI with theme toggle
- **Draggable Navigation** - Floating nav you can position anywhere

## 🤖 The 18 AI Agents

### Core Agents (5)
1. **Brainstorming Agent** - Reflects and organizes user ideas
2. **Questioner Agent** - Asks strategic clarifying questions
3. **Recorder Agent** - Documents decisions with context
4. **Context Manager** - Classifies intent and manages state
5. **Development Agent** - Research and vendor recommendations

### Quality Agents (6)
6. **Verification Agent** - Gatekeeps against assumptions
7. **Gap Detection Agent** - Identifies missing information
8. **Clarification Agent** - Asks targeted questions
9. **Accuracy Auditor** - Continuous accuracy validation
10. **Assumption Blocker** - Zero tolerance for assumptions
11. **Reference Analysis Agent** - Analyzes uploaded files

### Support Agents (6)
12. **Consistency Guardian** - Detects contradictions
13. **Translation Agent** - Converts vision to technical specs
14. **Prioritization Agent** - Sequences decisions
15. **Version Control Agent** - Tracks changes with reasoning
16. **Reviewer Agent** - Comprehensive QA
17. **Resource Manager** - Organizes references

### Meta (1)
18. **Integration Orchestrator** - Coordinates all agents

## 🏗️ Architecture

```
ai-brainstorm-platform/
├── backend/                 # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── agents/         # 18 AI agent implementations
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript definitions
│   │   └── index.ts        # Server entry point
│   └── package.json
│
└── frontend/               # React + Vite + TypeScript
    ├── src/
    │   ├── components/     # Reusable UI components
    │   ├── pages/          # Page components
    │   ├── store/          # Zustand state management
    │   ├── services/       # API client
    │   ├── types/          # TypeScript definitions
    │   └── App.tsx         # Main app component
    └── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Anthropic API Key

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your keys:
   ```env
   PORT=3001
   ANTHROPIC_API_KEY=your_anthropic_key_here
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_KEY=your_supabase_service_key_here
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:3001`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   App runs on `http://localhost:5173`

### Database Setup

1. Create a [Supabase](https://supabase.com) account
2. Create a new project
3. Run the SQL migrations (see `database/schema.sql`)
4. Add your Supabase credentials to backend `.env`

## 📊 Database Schema

```sql
-- Projects table
projects (
  id uuid PRIMARY KEY,
  user_id text,
  title text,
  description text,
  status text,
  items jsonb,
  created_at timestamptz,
  updated_at timestamptz
)

-- Messages table
messages (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  user_id text,
  role text,
  content text,
  agent_type text,
  metadata jsonb,
  created_at timestamptz
)

-- References table
references (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  user_id text,
  file_url text,
  type text,
  filename text,
  analysis_status text,
  analysis text,
  metadata jsonb,
  created_at timestamptz
)

-- Agent Activity table
agent_activity (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id),
  agent_type text,
  action text,
  details jsonb,
  created_at timestamptz
)
```

## 🎨 Tech Stack

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Anthropic SDK** - Claude AI integration
- **Supabase** - Database & storage
- **Multer** - File uploads
- **Sharp** - Image processing

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Framer Motion** - Animations
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Dropzone** - File uploads
- **date-fns** - Date formatting
- **Lucide React** - Icons

## 📝 API Endpoints

### Projects
- `GET /api/projects/user/:userId` - Get all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:projectId` - Get project
- `PATCH /api/projects/:projectId` - Update project
- `DELETE /api/projects/:projectId` - Delete project

### Conversations
- `POST /api/conversations/:projectId/message` - Send message
- `GET /api/conversations/:projectId/messages` - Get messages
- `DELETE /api/conversations/:projectId/messages` - Clear conversation

### References
- `POST /api/references/upload` - Upload file
- `GET /api/references/project/:projectId` - Get references
- `GET /api/references/:referenceId` - Get reference
- `DELETE /api/references/:referenceId` - Delete reference

### Agents
- `GET /api/agents/list` - Get all agents
- `GET /api/agents/stats` - Get agent statistics
- `GET /api/agents/activity/:projectId` - Get agent activity

## 🎯 Usage

1. **Create a Project** - Click "New Project" on dashboard
2. **Start Chatting** - Share your ideas naturally
3. **AI Agent Workflow** - Agents automatically:
   - Reflect your ideas
   - Ask clarifying questions
   - Detect information gaps
   - Verify accuracy
   - Block assumptions
   - Record decisions with citations
4. **Track Decisions** - View organized items in Documents
5. **Upload References** - Add images, videos, or PDFs for analysis
6. **Review Agents** - See all 18 agents and their roles

## 🔒 Security Features

- **Zero Assumptions** - Agents never make assumptions
- **Verification Layer** - All recordings verified before saving
- **Citation Tracking** - Full traceability of decisions
- **Conflict Detection** - Identifies contradictions
- **Accuracy Auditing** - Continuous validation

## 🎨 Design System

### Colors
- **Teal Background** - Soft teal (#B8D8D8) / Dark (#0A2F2F)
- **Metallic Green** - Accents (#1A7F7F, #2DA3A3, #0D5555)
- **Glassmorphism** - Semi-transparent panels with blur

### Components
- Floating draggable navigation
- Glass-effect cards
- Angular accent decorations
- Custom scrollbars
- Smooth animations

## 📦 Build for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm run preview
```

## 🤝 Contributing

This is a demonstration project showcasing multi-agent AI orchestration.

## 📄 License

ISC

## 🙏 Acknowledgments

- **Anthropic** - Claude AI
- **Supabase** - Backend infrastructure
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling

---

Built with ❤️ using Claude Sonnet 4
#   a i - b r a i n s t o r m - p l a t f o r m  
 