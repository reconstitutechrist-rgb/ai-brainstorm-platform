# Sandbox Mode + Idea Generator Agent - Setup Guide

## Overview
The Sandbox Mode feature provides a dedicated creative workspace where users can explore wild ideas risk-free using AI-powered idea generation. Nothing affects the main project until ideas are explicitly extracted.

## Features Implemented

### 1. **IdeaGeneratorAgent** (Backend AI Agent)
- **Location**: `backend/src/agents/IdeaGeneratorAgent.ts`
- **Capabilities**:
  - Generate creative ideas based on project context
  - Support multiple direction modes (innovative, practical, budget, premium, experimental)
  - Refine individual ideas with expanded details
  - Combine multiple ideas into synergistic concepts
  - Maintain conversation history for context

### 2. **Sandbox Backend API Routes**
- **Location**: `backend/src/routes/sandbox.ts`
- **Endpoints**:
  - `POST /api/sandbox/create` - Create new sandbox session
  - `POST /api/sandbox/generate-ideas` - Generate ideas using AI
  - `POST /api/sandbox/refine-idea` - Refine a specific idea
  - `POST /api/sandbox/combine-ideas` - Combine multiple ideas
  - `POST /api/sandbox/extract-ideas` - Extract ideas to main project
  - `POST /api/sandbox/save-as-alternative` - Save sandbox as alternative version
  - `DELETE /api/sandbox/:sandboxId` - Discard sandbox
  - `GET /api/sandbox/project/:projectId` - Get all sandboxes for a project

### 3. **Database Schema**
- **Location**: `database/migrations/005_sandbox_sessions.sql`
- **Table**: `sandbox_sessions`
  - `id` (UUID) - Primary key
  - `project_id` (UUID) - Reference to project
  - `user_id` (TEXT) - User identifier
  - `name` (TEXT) - Sandbox name
  - `original_project_state` (JSONB) - Snapshot of project when sandbox was created
  - `sandbox_state` (JSONB) - Current sandbox state (ideas, decisions, explorations)
  - `status` (TEXT) - active | saved_as_alternative | discarded
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

### 4. **Frontend SandboxPage**
- **Location**: `frontend/src/pages/SandboxPage.tsx`
- **Features**:
  - Beautiful glassmorphic UI
  - AI Idea Generator with direction selector
  - Idea cards with selection checkboxes
  - Extract selected ideas to main project
  - Save sandbox as alternative version
  - Discard entire sandbox
  - Real-time idea generation with loading states
  - Animated idea cards with staggered entrance

### 5. **Frontend API Service**
- **Location**: `frontend/src/services/api.ts`
- **Added**: `sandboxApi` with all necessary methods

### 6. **Navigation**
- **Location**: `frontend/src/components/FloatingNav.tsx`
- **Added**: Sandbox navigation item with Flask icon

### 7. **Routing**
- **Location**: `frontend/src/App.tsx`
- **Added**: `/sandbox` route with SandboxPage component

## Setup Instructions

### Step 1: Run Database Migration
Run the sandbox sessions migration in your Supabase SQL editor:

```bash
# Navigate to database migrations
cd database/migrations

# Copy the contents of 005_sandbox_sessions.sql and run in Supabase SQL Editor
```

Or run it directly using the Supabase CLI:

```bash
supabase db push
```

### Step 2: Install Dependencies (if needed)
All dependencies should already be installed, but verify:

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### Step 3: Environment Variables
Ensure your `.env` file has the required variables:

**Backend (`backend/.env`):**
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3001
```

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Verify Setup
1. Navigate to `http://localhost:5173`
2. Login with your credentials
3. Select or create a project
4. Click the **Sandbox** item in the floating navigation (Flask icon)
5. You should see the Sandbox page with the Idea Generator

## How to Use Sandbox Mode

### 1. **Access Sandbox**
- Click the **Sandbox** icon (Flask) in the floating navigation
- A new sandbox session will be created automatically if one doesn't exist
- You'll see the Creative Sandbox interface

### 2. **Generate Ideas**
- Select a **Direction** (Innovative, Practical, Budget, Premium, or Experimental)
- Click **Generate 5 Ideas**
- Wait for the AI to generate creative ideas
- Ideas will appear as animated cards

### 3. **Select Ideas**
- Click the checkbox on any idea card to select it
- Selected ideas will show a green ring
- You can select multiple ideas

### 4. **Extract Ideas to Main Project**
- Select one or more ideas
- Click **Extract (N)** button in the top right
- Selected ideas will be added to your main project as "exploring" items
- Your main project remains unchanged until extraction

### 5. **Save as Alternative Version**
- Click **Save as Alternative**
- Enter a name for this version
- The sandbox will be saved for future reference
- A new active sandbox will be created

### 6. **Discard Sandbox**
- Click **Discard All**
- Confirm the action
- All ideas in the sandbox will be deleted
- A new sandbox will be created

## Architecture

### Data Flow

```
User → SandboxPage → sandboxApi → Backend Routes → IdeaGeneratorAgent → Claude API
                                                   ↓
                                              Supabase DB (sandbox_sessions)
```

### Idea Generation Process

1. **User clicks "Generate Ideas"**
2. **Frontend** sends request with:
   - Project context (title, description)
   - Current decisions (decided items)
   - Direction (innovative, practical, etc.)
   - Quantity (default: 5)
3. **IdeaGeneratorAgent** builds a structured prompt
4. **Claude API** generates ideas in JSON format
5. **Backend** parses and stores ideas in sandbox_state
6. **Frontend** displays ideas as animated cards

### Idea Extraction Process

1. **User selects ideas and clicks "Extract"**
2. **Frontend** sends selected idea IDs to backend
3. **Backend** retrieves ideas from sandbox
4. **Backend** converts ideas to project items (state: "exploring")
5. **Backend** adds items to main project
6. **Frontend** shows success message

## API Usage Examples

### Generate Ideas
```typescript
const response = await sandboxApi.generateIdeas({
  sandboxId: 'uuid-here',
  projectContext: 'Project: AI Product\nDescription: Building an AI tool...',
  currentDecisions: [
    { text: 'Use React for frontend', state: 'decided' },
    { text: 'Deploy on Vercel', state: 'decided' }
  ],
  direction: 'innovative',
  quantity: 5
});

console.log(response.ideas);
```

### Extract Ideas
```typescript
const response = await sandboxApi.extractIdeas({
  sandboxId: 'uuid-here',
  selectedIdeaIds: ['idea-1', 'idea-3', 'idea-5']
});

console.log(response.extractedIdeas);
```

### Refine an Idea
```typescript
const response = await sandboxApi.refineIdea({
  ideaId: 'idea-1',
  idea: {
    title: 'AI-Powered Search',
    description: 'Implement semantic search using embeddings'
  },
  refinementDirection: 'Provide implementation details and tech stack recommendations'
});

console.log(response.refinedIdea);
```

## Advanced Features (Future Enhancements)

### 1. **Combine Ideas** (Button placeholder exists)
Allows users to select 2+ ideas and have the AI generate synergistic combinations.

### 2. **Refine Selected** (Button placeholder exists)
Allows users to select multiple ideas and refine them together.

### 3. **Generate Variations** (Button placeholder exists)
Generates variations of existing ideas with different parameters.

### 4. **Idea History**
View all saved sandbox sessions and their ideas.

### 5. **Compare Alternatives**
Compare multiple saved alternative versions side-by-side.

## Troubleshooting

### Ideas not generating?
- Check that `ANTHROPIC_API_KEY` is set in backend `.env`
- Verify backend is running and connected to database
- Check browser console for errors

### Sandbox not loading?
- Ensure database migration has been run
- Verify Supabase connection in backend
- Check that project is selected

### Ideas not extracting to main project?
- Verify that ideas are selected (green ring)
- Check browser network tab for API errors
- Ensure user has permissions

### TypeScript errors?
- Run `npm install` in both frontend and backend
- Restart TypeScript server in your IDE

## Files Modified/Created

### Backend Files
- ✅ Created: `backend/src/agents/IdeaGeneratorAgent.ts`
- ✅ Created: `backend/src/routes/sandbox.ts`
- ✅ Modified: `backend/src/index.ts` (added sandbox routes)

### Frontend Files
- ✅ Created: `frontend/src/pages/SandboxPage.tsx`
- ✅ Modified: `frontend/src/services/api.ts` (added sandboxApi)
- ✅ Modified: `frontend/src/components/FloatingNav.tsx` (added Sandbox nav item)
- ✅ Modified: `frontend/src/App.tsx` (added /sandbox route)

### Database Files
- ✅ Created: `database/migrations/005_sandbox_sessions.sql`

## Security Considerations

- All sandbox sessions are user-scoped (user_id field)
- RLS policies enable row-level security
- Sandbox sessions are isolated from main project until extraction
- Ideas are stored in JSONB for flexibility and security

## Performance Notes

- Idea generation typically takes 3-5 seconds
- Each idea card animates in with a 50ms stagger
- Ideas are stored in memory until extracted
- Database queries are optimized with indexes

## Next Steps

1. **Run the database migration**
2. **Restart backend and frontend**
3. **Test the Sandbox feature**
4. **Implement advanced features** (combine, refine, variations)
5. **Add idea export to PDF/Markdown**
6. **Implement idea comparison view**

---

**Questions?** Check the main project documentation or review the code comments in the implementation files.

**Enjoy exploring ideas in the Sandbox! 🧪✨**
