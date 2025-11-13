# Quick Start Guide

## One-Time Setup (5 minutes)

### 1. Setup Database
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/qzeozxwgbuazbinbqcxn/sql)
2. Open `database/schema.sql`
3. Copy all content
4. Paste into SQL Editor
5. Click **RUN**

✅ Database is now ready!

---

## Every Time You Start Development

### Terminal 1: Backend
```bash
cd backend
npm run dev
```

Wait for:
```
✓ All 17 agents initialized
🚀 Server running on http://localhost:3001
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

Wait for:
```
➜ Local: http://localhost:5173
```

### Open Browser
```
http://localhost:5173
```

---

## That's It!

Your AI Brainstorm Platform is now running with:
- ✅ 8 AI agents ready
- ✅ Claude Sonnet 4 integration
- ✅ Real-time chat interface
- ✅ File upload & analysis
- ✅ Three-column state system

---

## Troubleshooting

**Port already in use?**
```bash
# Kill process on port 3001 (backend)
npx kill-port 3001

# Kill process on port 5173 (frontend)
npx kill-port 5173
```

**Dependencies issue?**
```bash
# Reinstall backend
cd backend && rm -rf node_modules && npm install

# Reinstall frontend
cd frontend && rm -rf node_modules && npm install
```

**Database not working?**
- Re-run the `database/schema.sql` in Supabase SQL Editor
- Check that `.env` files have correct credentials

---

## Need More Help?

- 📖 [SETUP.md](SETUP.md) - Comprehensive setup guide
- 📋 [COMPLETION_CHECKLIST.md](COMPLETION_CHECKLIST.md) - Full project status
- 📝 [README.md](README.md) - Project overview
- ⚡ [QUICKSTART.md](QUICKSTART.md) - Alternative quick guide

---

**Happy Brainstorming! 🚀**
