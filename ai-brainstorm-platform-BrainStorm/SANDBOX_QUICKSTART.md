# Sandbox Mode - Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Step 1: Run Database Migration (1 minute)

Open your Supabase SQL Editor and run:

```sql
-- Copy and paste the entire contents of:
-- database/migrations/005_sandbox_sessions.sql
```

**Or** if you use Supabase CLI:
```bash
supabase db push
```

### Step 2: Restart Services (1 minute)

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

### Step 3: Test It Out! (1 minute)

1. Open browser to `http://localhost:5173`
2. Login to your account
3. Select or create a project
4. Click **Sandbox** (Flask icon 🧪) in navigation
5. Click **Generate 5 Ideas**
6. Select ideas you like (click checkbox)
7. Click **Extract (N)** to add to your project

---

## 🎯 What You Can Do

### Generate Ideas
- Click **Generate 5 Ideas** button
- Choose direction: Innovative, Practical, Budget, Premium, or Experimental
- Wait 3-5 seconds for AI to create ideas
- Ideas appear as animated cards

### Work with Ideas
- **Select**: Click checkbox on idea cards
- **Extract**: Add selected ideas to main project
- **Save**: Save entire sandbox as alternative version
- **Discard**: Delete all ideas and start fresh

---

## 🔥 Pro Tips

1. **Try Different Directions**: Each direction produces unique ideas
   - 🚀 **Innovative**: Cutting-edge, futuristic approaches
   - ⚙️ **Practical**: Realistic, proven solutions
   - 💰 **Budget**: Cost-effective options
   - 💎 **Premium**: High-end, quality-first
   - 🔬 **Experimental**: Wild, unconventional ideas

2. **Generate Multiple Batches**: Click generate multiple times to build a large idea pool

3. **Extract the Best**: Select only the ideas you want to explore further

4. **Save Alternatives**: Before discarding, save interesting sandboxes for later

---

## 📁 File Locations

- **Backend Agent**: [backend/src/agents/IdeaGeneratorAgent.ts](backend/src/agents/IdeaGeneratorAgent.ts)
- **Backend Routes**: [backend/src/routes/sandbox.ts](backend/src/routes/sandbox.ts)
- **Frontend Page**: [frontend/src/pages/SandboxPage.tsx](frontend/src/pages/SandboxPage.tsx)
- **Database Migration**: [database/migrations/005_sandbox_sessions.sql](database/migrations/005_sandbox_sessions.sql)

---

## ❓ Troubleshooting

**Ideas not generating?**
- Check `ANTHROPIC_API_KEY` in `backend/.env`
- Verify backend is running on port 3001

**Sandbox page blank?**
- Run database migration first
- Ensure a project is selected

**Can't extract ideas?**
- Select ideas first (click checkboxes)
- Check browser console for errors

---

## 📚 Full Documentation

- **Setup Guide**: [SANDBOX_SETUP_GUIDE.md](SANDBOX_SETUP_GUIDE.md)
- **Implementation**: [SANDBOX_IMPLEMENTATION_SUMMARY.md](SANDBOX_IMPLEMENTATION_SUMMARY.md)

---

**That's it! You're ready to explore ideas in the Sandbox! 🎉**

Need help? Check the full documentation or review the code comments.
