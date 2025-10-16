# AI Brainstorm Platform - Complete Setup Guide

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ installed
- ✅ npm or yarn package manager
- ✅ Anthropic API key (Claude Sonnet 4)
- ✅ Supabase account and project

## Step 1: Database Setup

### 1.1 Access Your Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `qzeozxwgbuazbinbqcxn`

### 1.2 Run Database Schema

1. In your Supabase dashboard, navigate to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `database/schema.sql`
4. Paste into the SQL editor
5. Click **Run** to execute the schema

This will create:
- 4 tables: `projects`, `messages`, `references`, `agent_activity`
- Indexes for performance
- Storage bucket for file uploads
- Row Level Security policies
- Triggers for auto-updating timestamps

### 1.3 Verify Storage Bucket

1. Navigate to **Storage** in Supabase dashboard
2. Verify that `references` bucket exists
3. Check that it's set to **public** (for file access)

## Step 2: Environment Configuration

Your environment files are already configured:

### Backend (.env)
```
✅ PORT=3001
✅ ANTHROPIC_API_KEY=sk-ant-api03-... (configured)
✅ SUPABASE_URL=https://qzeozxwgbuazbinbqcxn.supabase.co
✅ SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs... (configured)
✅ SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs... (configured)
```

### Frontend (.env)
```
✅ VITE_API_URL=http://localhost:3001/api
```

## Step 3: Install Dependencies

### Backend
```bash
cd backend
npm install
```

Expected packages:
- @anthropic-ai/sdk
- @supabase/supabase-js
- express
- multer
- sharp
- uuid
- TypeScript and dev tools

### Frontend
```bash
cd frontend
npm install
```

Expected packages:
- React 19
- Vite 7
- Tailwind CSS 4
- Zustand (state management)
- Framer Motion (animations)
- Axios (HTTP client)

## Step 4: Start the Application

### Terminal 1 - Backend Server
```bash
cd backend
npm run dev
```

Expected output:
```
✓ All 17 agents initialized
🚀 Server running on http://localhost:3001
✅ Supabase connected
```

### Terminal 2 - Frontend Dev Server
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v7.x.x ready in xxx ms
➜ Local: http://localhost:5173
```

## Step 5: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

You should see:
- The AI Brainstorm Platform homepage
- Floating navigation menu (draggable)
- Dark mode toggle
- Dashboard with project overview

## Step 6: Create Your First Project

1. Click **"+ New Project"** button on the Dashboard
2. Enter project details:
   - **Title**: e.g., "AI Product Launch"
   - **Description**: e.g., "Planning the launch of our new AI product"
3. Click **Create Project**
4. Navigate to the **Chat** page to start brainstorming

## Step 7: Test AI Agent Communication

In the chat interface, try these messages:

### Test 1: Brainstorming
```
I'm thinking about building a mobile app for fitness tracking.
```
Expected: BrainstormingAgent responds with reflection and insights

### Test 2: Deciding
```
I've decided we should target iOS first for the fitness app.
```
Expected: Multiple agents activate (Verification, Recorder, ConsistencyGuardian)

### Test 3: Questioning
```
What metrics should we track for user engagement?
```
Expected: QuestionerAgent generates strategic follow-up questions

## Troubleshooting

### Backend won't start

**Error**: `Module not found`
```bash
cd backend
npm install
```

**Error**: `Supabase connection failed`
- Verify your `.env` file has correct credentials
- Check that database schema was run successfully

**Error**: `Anthropic API error`
- Verify your API key is correct and active
- Check your API quota and billing status

### Frontend won't build

**Error**: `Cannot find module`
```bash
cd frontend
npm install
```

**Error**: `API calls failing`
- Ensure backend is running on port 3001
- Check that CORS is enabled (already configured in `backend/src/index.ts`)
- Verify `VITE_API_URL` in `frontend/.env`

### TypeScript Errors

If you encounter TypeScript build errors:

1. **Backend**: Check that all imports match the type definitions in `backend/src/types/index.ts`
2. **Frontend**: Verify imports match `frontend/src/types/index.ts`

### Database Issues

**Tables not created**:
1. Go to Supabase SQL Editor
2. Re-run the `database/schema.sql` script
3. Check for any error messages

**Storage bucket missing**:
1. Go to Storage in Supabase
2. Create bucket manually named `references`
3. Set to **public**

## Architecture Overview

### Backend Structure
```
backend/
├── src/
│   ├── agents/          # 17 AI agents + orchestrator
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   └── types/           # TypeScript definitions
└── uploads/             # Temporary file storage
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Main app pages
│   ├── store/           # Zustand state management
│   ├── services/        # API client
│   └── types/           # TypeScript definitions
```

### 18 AI Agents
1. **ContextManagerAgent** - Intent classification
2. **BrainstormingAgent** - Reflection and insights
3. **RecorderAgent** - Decision documentation
4. **QuestionerAgent** - Strategic questions
5. **DevelopmentAgent** - Research and vendors
6. **VerificationAgent** - Assumption gatekeeper
7. **GapDetectionAgent** - Missing information
8. **ClarificationAgent** - Targeted questions
9. **AccuracyAuditorAgent** - Continuous validation
10. **AssumptionBlockerAgent** - Zero tolerance for assumptions
11. **ReferenceAnalysisAgent** - File analysis
12. **ConsistencyGuardianAgent** - Contradiction detection
13. **TranslationAgent** - Vision to specs
14. **PrioritizationAgent** - Task sequencing
15. **VersionControlAgent** - Change tracking
16. **ReviewerAgent** - Quality assurance
17. **ResourceManagerAgent** - Resource organization
18. **IntegrationOrchestrator** - Workflow coordination

## Next Steps

Once your app is running:

1. **Explore the Dashboard** - View project statistics and recent activity
2. **Try Different Intents** - Test all 8 workflow types (brainstorming, deciding, modifying, etc.)
3. **Upload References** - Add images, PDFs, or product links for AI analysis
4. **Check the Documents Page** - See the three-column state system (Decided/Exploring/Parked)
5. **Review Agent Activity** - Visit the Agents page to see all 18 agents and their roles
6. **Customize Settings** - Configure preferences on the Settings page

## Production Deployment

When ready to deploy:

1. **Update RLS Policies**: The current policies allow all access - you'll want to restrict based on `auth.uid()`
2. **Environment Variables**: Set production URLs for both frontend and backend
3. **Build Frontend**: `npm run build` creates optimized production bundle
4. **Backend Compilation**: `npm run build` compiles TypeScript to JavaScript
5. **Deploy**: Use Vercel/Netlify for frontend, Railway/Render for backend

## Support

For issues or questions:
- Check the console logs (browser DevTools + terminal)
- Review the [Supabase documentation](https://supabase.com/docs)
- Check the [Anthropic API docs](https://docs.anthropic.com/)

---

**You're all set! Happy brainstorming! 🚀**
