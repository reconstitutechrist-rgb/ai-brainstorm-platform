# Frontend-Backend Setup Guide

## ✅ Setup Complete!

Your AI Brainstorm Platform is now fully configured with both frontend and backend connected.

## 🎯 What's Been Configured

### Backend Setup
1. **Environment Variables** ([backend/.env](backend/.env))
   - ✅ `SUPABASE_URL` - Supabase project URL
   - ✅ `SUPABASE_ANON_KEY` - Public anonymous key
   - ✅ `SUPABASE_SERVICE_KEY` - Service role key (backend only)
   - ✅ `ANTHROPIC_API_KEY` - Claude API key for AI agents
   - ✅ `PORT` - Backend server port (3001)

2. **Supabase Client** ([backend/src/services/supabase.ts](backend/src/services/supabase.ts:1))
   - Configured to use service role key for full database access
   - Environment variables loaded at startup

3. **Server Running**
   - Backend server: `http://localhost:3001`
   - Database: Connected to Supabase
   - 18 AI Agents: Ready

### Frontend Setup
1. **Environment Variables** ([frontend/.env](frontend/.env))
   - ✅ `VITE_API_URL` - Backend API endpoint
   - ✅ `VITE_SUPABASE_URL` - Supabase project URL
   - ✅ `VITE_SUPABASE_ANON_KEY` - Public anonymous key for client-side auth

2. **Supabase Client** ([frontend/src/services/supabase.ts](frontend/src/services/supabase.ts:1))
   - Configured with anonymous key for client-side authentication
   - Helper functions for auth operations

3. **API Client** ([frontend/src/services/api.ts](frontend/src/services/api.ts:1))
   - ✅ Axios configured with backend base URL
   - ✅ Request interceptor adds JWT token to all API calls
   - ✅ Response interceptor handles 401 authentication errors

4. **Authentication Store** ([frontend/src/store/userStore.ts](frontend/src/store/userStore.ts:1))
   - ✅ Sign in with email/password
   - ✅ Sign up with email/password
   - ✅ Session persistence
   - ✅ Auto-refresh on auth state changes
   - ✅ Logout functionality

5. **Login Page** ([frontend/src/pages/LoginPage.tsx](frontend/src/pages/LoginPage.tsx:1))
   - Beautiful login/signup UI
   - Form validation
   - Error handling

6. **Protected Routes** ([frontend/src/App.tsx](frontend/src/App.tsx:15))
   - All main routes require authentication
   - Automatic redirect to `/login` for unauthenticated users
   - Automatic redirect to `/` for authenticated users trying to access login

## 🚀 Running the Application

### Start Backend
```bash
cd backend
npm run dev
```
Backend runs on: `http://localhost:3001`

### Start Frontend
```bash
cd frontend
npm run dev
```
Frontend runs on: `http://localhost:5173`

## 🔐 Authentication Flow

1. **First Visit**
   - User lands on the app
   - App checks for existing session
   - If no session → redirect to `/login`

2. **Login/Signup**
   - User enters email and password
   - Credentials sent to Supabase Auth
   - On success → JWT token stored
   - User redirected to dashboard

3. **API Requests**
   - Every API request automatically includes JWT token
   - Backend validates token via Supabase
   - Backend enforces Row Level Security (RLS)

4. **Logout**
   - User clicks logout
   - Session cleared from Supabase
   - User redirected to `/login`

## 🔒 Security Features

### Frontend
- ✅ JWT tokens automatically attached to API requests
- ✅ Protected routes with authentication guards
- ✅ Session persistence in localStorage
- ✅ Automatic token refresh

### Backend
- ✅ Service role key for database operations
- ✅ Environment variables protected
- ✅ CORS configured for frontend origin

### Database (Supabase)
- ✅ Row Level Security (RLS) policies
- ✅ Users can only access their own data
- ✅ Service role bypasses RLS for backend operations

## 📝 Next Steps

### 1. Create Your First User
Visit: `http://localhost:5173/login`
- Click "Don't have an account? Sign up"
- Enter email and password (min 6 characters)
- Click "Create Account"

### 2. Explore the Dashboard
After login, you'll have access to:
- **Dashboard** - Overview of your projects
- **Chat** - Brainstorm with AI agents
- **Documents** - Upload and manage references
- **Agents** - View AI agent activity
- **Settings** - Manage your account

### 3. Run Database Migration (Production)
When ready for production, run the migration script:
```bash
# Connect to your Supabase project via SQL editor or psql
psql -h <your-supabase-host> -U postgres -d postgres -f database/migrate-to-production-v3.sql
```

This will:
- Enable Row Level Security
- Create production-ready policies
- Add performance indexes
- Set up foreign key constraints

## 🐛 Troubleshooting

### Backend Won't Start
**Error**: `supabaseUrl is required`
- ✅ **Fixed!** Environment variables now load before imports
- Check `backend/.env` exists with correct values

### Frontend Shows Blank Screen
- Check browser console for errors
- Verify environment variables in `frontend/.env`
- Ensure backend is running on port 3001

### Authentication Not Working
- Check Supabase dashboard → Authentication → Users
- Verify email confirmation settings (disable if testing)
- Check browser network tab for API errors

### API Calls Failing
- Check backend logs for errors
- Verify CORS settings in backend
- Ensure JWT token is being sent (check network tab)

## 📚 File Structure

```
ai-brainstorm-platform/
├── backend/
│   ├── .env                          # Backend environment variables
│   ├── src/
│   │   ├── index.ts                  # Entry point (loads env first!)
│   │   ├── services/
│   │   │   └── supabase.ts          # Supabase client (service role)
│   │   └── routes/                   # API endpoints
│   └── dist/                         # Compiled JavaScript
│
├── frontend/
│   ├── .env                          # Frontend environment variables
│   ├── src/
│   │   ├── App.tsx                   # Main app with routing
│   │   ├── services/
│   │   │   ├── supabase.ts          # Supabase client (anon key)
│   │   │   └── api.ts               # API client with auth
│   │   ├── store/
│   │   │   └── userStore.ts         # Authentication state
│   │   └── pages/
│   │       └── LoginPage.tsx        # Login/signup UI
│   └── dist/                         # Built assets
│
└── database/
    └── migrate-to-production-v3.sql # Production schema migration
```

## 🎉 Success Checklist

- ✅ Backend starts without errors
- ✅ Backend connects to Supabase
- ✅ Frontend builds successfully
- ✅ Frontend loads on `http://localhost:5173`
- ✅ Login page displays correctly
- ✅ Can create a new user account
- ✅ Can sign in with credentials
- ✅ Dashboard loads after login
- ✅ API requests include JWT token
- ✅ Logout works correctly

## 💡 Tips

1. **Development**: Keep both backend and frontend running simultaneously
2. **Testing**: Use Supabase dashboard to view users and data
3. **Debugging**: Check browser console and backend terminal for errors
4. **Security**: Never commit `.env` files with real credentials
5. **Production**: Use the v3 migration script before going live

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review browser console and backend logs
3. Verify all environment variables are set correctly
4. Ensure Supabase project is active and accessible

---

**Congratulations!** Your AI Brainstorm Platform is ready to use! 🎊
