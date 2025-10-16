# 🚀 Quick Start Guide

Get your AI Brainstorm Platform running in 5 minutes!

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Anthropic API key ([Get one here](https://console.anthropic.com/))
- [ ] Supabase account ([Sign up here](https://supabase.com))

---

## Step 1: Clone & Install (2 minutes)

```bash
# Navigate to project
cd ai-brainstorm-platform

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Step 2: Setup Environment Variables (1 minute)

### Backend Configuration

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-your-key-here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend Configuration

```bash
cd ../frontend
cp .env.example .env
```

The default should work:
```env
VITE_API_URL=http://localhost:3001/api
```

---

## Step 3: Setup Database (30 seconds)

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Click on SQL Editor
3. Create these tables:

```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'exploring',
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  agent_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- References table
CREATE TABLE references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  type TEXT NOT NULL,
  filename TEXT,
  analysis_status TEXT DEFAULT 'pending',
  analysis TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Activity table
CREATE TABLE agent_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_messages_project_id ON messages(project_id);
CREATE INDEX idx_references_project_id ON references(project_id);
CREATE INDEX idx_agent_activity_project_id ON agent_activity(project_id);
```

4. Create Storage Bucket:
   - Go to Storage → Create bucket
   - Name: `references`
   - Make it public

---

## Step 4: Start the Servers (30 seconds)

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

You should see:
```
🚀 AI Brainstorm Platform Backend
📡 Server running on http://localhost:3001
🗄️  Database: ✓ Connected
🤖 18 AI Agents: Ready
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v7.1.9  ready in 500 ms

  ➜  Local:   http://localhost:5173/
```

---

## Step 5: Open & Test (30 seconds)

1. Open http://localhost:5173
2. Click "New Project"
3. Create a test project
4. Start chatting with the AI agents!

---

## 🎉 You're Done!

Your AI Brainstorm Platform is now running with:
- ✅ 18 AI Agents active
- ✅ Real-time chat interface
- ✅ File upload capability
- ✅ Dark mode enabled
- ✅ Multi-agent orchestration

---

## 🐛 Troubleshooting

### Backend won't start
- Check your `ANTHROPIC_API_KEY` is valid
- Verify Supabase credentials are correct
- Ensure port 3001 is not in use

### Frontend won't connect
- Verify backend is running on port 3001
- Check browser console for errors
- Ensure CORS is configured (already done)

### Database errors
- Verify all 4 tables are created
- Check Supabase project is active
- Ensure storage bucket exists

### Can't upload files
- Check storage bucket is public
- Verify file size < 50MB
- Ensure file type is supported

---

## 🎯 Next Steps

1. **Explore the Dashboard** - See your projects
2. **Create a Project** - Click "New Project"
3. **Start Chatting** - Share ideas with AI agents
4. **Upload References** - Add images, videos, PDFs
5. **View Agents** - See all 18 agents working
6. **Check Documents** - Review decided/exploring/parked items
7. **Customize Settings** - Toggle dark mode, configure agents

---

## 📚 Learn More

- Read [README.md](./README.md) for detailed documentation
- Check [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for architecture
- Explore agent code in `backend/src/agents/`

---

## 💡 Pro Tips

1. **Use Dark Mode** - Toggle in settings or top-right corner
2. **Drag the Nav** - Floating nav is fully draggable
3. **Upload References** - AI analyzes images automatically
4. **Check Citations** - Every decision has a citation
5. **Review Agents** - See which agents are working on your project

---

## 🆘 Need Help?

- Check troubleshooting section above
- Review error logs in terminal
- Verify all environment variables
- Ensure database tables exist

---

**Happy Brainstorming! 🧠✨**
