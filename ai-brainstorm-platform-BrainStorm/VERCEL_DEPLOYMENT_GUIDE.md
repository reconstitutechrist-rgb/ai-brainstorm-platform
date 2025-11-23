# Vercel Deployment Guide - AI Brainstorm Platform

Complete guide to deploy your AI Brainstorm Platform to Vercel and connect it to Supabase.

---

## Prerequisites

- GitHub account with your project repository
- Supabase project created (https://supabase.com)
- Vercel account (https://vercel.com) - sign up with GitHub
- Anthropic API key for Claude

---

## Part 1: Prepare Your Project

### 1. Update package.json for Vercel

Add build scripts if not already present:

**Backend (`backend/package.json`):**

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}
```

**Frontend (`frontend/package.json`):**

```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview",
    "dev": "vite"
  }
}
```

### 2. Create Vercel Configuration Files

**Root `vercel.json`:**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "backend/package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/src/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "frontend/dist/$1"
    }
  ]
}
```

**Alternative: Separate Deployments (Recommended)**

Deploy frontend and backend as separate Vercel projects for better control.

---

## Part 2: Get Supabase Credentials

### 1. Navigate to Supabase Project Settings

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon) in sidebar
4. Click **API** section

### 2. Copy Required Values

You'll need:

- **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
- **Project API Key (anon, public)** - For client-side access
- **Service Role Key (secret)** - For backend access (keep this secret!)

### 3. Get Database Connection String (Optional)

If using direct database connection:

1. Go to **Settings** → **Database**
2. Copy **Connection string** (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password

---

## Part 3: Deploy Backend to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Go to Vercel Dashboard**

   - Visit https://vercel.com/dashboard
   - Click **Add New...** → **Project**

2. **Import Repository**

   - Select **Import Git Repository**
   - Choose your GitHub repository
   - Click **Import**

3. **Configure Project**

   - **Root Directory:** `backend` (if deploying backend separately)
   - **Framework Preset:** Other
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Add Environment Variables**
   Click **Environment Variables** and add:

   ```
   SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   ANTHROPIC_API_KEY=your-anthropic-api-key
   PORT=3001
   NODE_ENV=production
   ```

   **Important:** Use `SUPABASE_SERVICE_KEY` (secret key) for backend, not the anon key.

5. **Deploy**
   - Click **Deploy**
   - Wait for deployment to complete
   - Copy your backend URL (e.g., `https://your-backend.vercel.app`)

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Navigate to backend folder
cd backend

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new? [Create new]
# - What's your project's name? [ai-brainstorm-backend]
# - In which directory is your code located? [./]

# Add environment variables
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_KEY production
vercel env add ANTHROPIC_API_KEY production
vercel env add PORT production
vercel env add NODE_ENV production

# Deploy to production
vercel --prod
```

---

## Part 4: Deploy Frontend to Vercel

### 1. Update Frontend API Endpoint

**Before deploying**, update your frontend to use the backend URL:

**`frontend/src/services/api.ts`:**

```typescript
// Change this:
const API_BASE_URL = "http://localhost:3001/api";

// To this:
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";
```

**Create `frontend/.env.production`:**

```
VITE_API_URL=https://your-backend.vercel.app/api
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Deploy Frontend

**Via Vercel Dashboard:**

1. Go to https://vercel.com/dashboard
2. Click **Add New...** → **Project**
3. Import same repository (Vercel will detect it's the same)
4. **Configure:**

   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. **Add Environment Variables:**

   ```
   VITE_API_URL=https://your-backend.vercel.app/api
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

6. Click **Deploy**
7. Your app will be live at `https://your-app.vercel.app`

**Via CLI:**

```bash
cd frontend

# Deploy
vercel

# Add environment variables
vercel env add VITE_API_URL production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# Deploy to production
vercel --prod
```

---

## Part 5: Configure Supabase for Vercel

### 1. Update CORS Settings

In your backend code, ensure CORS allows Vercel domain:

**`backend/src/index.ts`:**

```typescript
import cors from "cors";

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://your-app.vercel.app",
      "https://your-app-*.vercel.app", // For preview deployments
    ],
    credentials: true,
  })
);
```

### 2. Set Up Supabase Authentication (if using)

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Add your Vercel URL to:
   - **Site URL:** `https://your-app.vercel.app`
   - **Redirect URLs:**
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app-*.vercel.app/auth/callback` (for previews)

### 3. Verify Database Connection

Test that Vercel backend can connect to Supabase:

1. Visit `https://your-backend.vercel.app/api/health` (or similar test endpoint)
2. Check Vercel logs: Dashboard → Your Project → **Deployments** → Click deployment → **Functions** tab
3. Look for connection errors

---

## Part 6: Environment Variables Reference

### Backend Environment Variables

```bash
# Supabase
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...  # Use service_role key (secret)

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-...

# Server Config
PORT=3001
NODE_ENV=production

# Optional: Direct Database Access
DATABASE_URL=postgresql://postgres:[password]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

### Frontend Environment Variables

```bash
# Backend API
VITE_API_URL=https://your-backend.vercel.app/api

# Supabase (Client-side)
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...  # Use anon/public key
```

### Security Notes

⚠️ **NEVER commit these files:**

- `.env`
- `.env.local`
- `.env.production`

✅ **Add to `.gitignore`:**

```
.env*
!.env.example
```

✅ **Create `.env.example` files:**

```bash
# Backend .env.example
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_service_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
PORT=3001
NODE_ENV=development
```

---

## Part 7: Custom Domain (Optional)

### 1. Add Custom Domain to Vercel

1. Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `app.yourdomain.com`)
4. Follow DNS configuration instructions

### 2. Configure DNS

Add these records to your domain provider:

**For frontend:**

```
Type: CNAME
Name: app (or @)
Value: cname.vercel-dns.com
```

**For backend:**

```
Type: CNAME
Name: api
Value: cname.vercel-dns.com
```

### 3. Update Environment Variables

After domain is verified, update:

```bash
# Frontend
VITE_API_URL=https://api.yourdomain.com/api

# Backend CORS
# Update CORS origin to include https://app.yourdomain.com
```

---

## Part 8: Troubleshooting

### Issue: "Cannot connect to database"

**Check:**

1. Vercel logs: Dashboard → Deployment → Functions tab
2. Environment variables are set correctly (no extra spaces)
3. Supabase service key has correct permissions
4. IP allowlist in Supabase (if enabled) includes Vercel IPs

**Fix:**

- Supabase → Settings → Database → Connection Pooling: Enable
- Use connection pooling URL instead of direct connection

### Issue: "CORS error"

**Check:**

1. Backend CORS configuration includes Vercel domain
2. Frontend is making requests to correct backend URL

**Fix:**

```typescript
// backend/src/index.ts
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      /\.vercel\.app$/, // Allow all Vercel preview URLs
    ],
    credentials: true,
  })
);
```

### Issue: "Environment variables not loaded"

**Check:**

1. Variables are set in Vercel Dashboard → Project → Settings → Environment Variables
2. Correct environment selected (Production/Preview/Development)
3. Redeploy after adding variables

**Fix:**

- Variables require redeployment to take effect
- Go to Deployments → Click **... (menu)** → **Redeploy**

### Issue: "Build failed"

**Check:**

1. Build logs in Vercel deployment details
2. `package.json` has correct build script
3. All dependencies are in `dependencies` (not `devDependencies`)

**Fix:**

```bash
# Locally test the build
npm run build

# If successful, push and redeploy
git add .
git commit -m "Fix build configuration"
git push
```

### Issue: "SSE/WebSocket not working"

**Note:** Vercel Serverless Functions have 10-second timeout (Hobby) or 60-second (Pro).

**Solutions:**

1. Use Vercel Edge Functions for long-lived connections
2. Move SSE endpoint to separate hosting (Railway, Render, Fly.io)
3. Keep polling as fallback for Vercel deployments

**Quick Fix for Vercel:**

```typescript
// Disable SSE in production, use polling
if (import.meta.env.PROD) {
  // Use polling API instead of SSE
} else {
  // Use SSE in development
}
```

---

## Part 9: Continuous Deployment

Vercel automatically deploys when you push to GitHub:

### Production Deployments

- Push to `main` branch → Deploys to production
- Uses production environment variables

### Preview Deployments

- Push to any other branch → Creates preview URL
- Uses preview environment variables
- Perfect for testing before merging

### Configure Branch Deployments

1. Go to Project → Settings → Git
2. **Production Branch:** `main`
3. Enable/disable automatic deployments for branches

---

## Part 10: Monitoring & Logs

### View Logs

**Real-time logs:**

1. Dashboard → Project → Deployments
2. Click on deployment
3. **Functions** tab shows backend logs
4. **Build Logs** tab shows build output

**Via CLI:**

```bash
vercel logs your-deployment-url
```

### Monitor Performance

1. Dashboard → Project → **Analytics**
2. View:
   - Page load times
   - API response times
   - Error rates
   - Traffic patterns

### Set Up Alerts

1. Project Settings → **Notifications**
2. Configure Slack/Discord/Email alerts for:
   - Deployment failures
   - Error rate increases
   - Performance degradation

---

## Quick Reference Commands

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy current directory
vercel

# Deploy to production
vercel --prod

# Add environment variable
vercel env add VARIABLE_NAME production

# View environment variables
vercel env ls

# Pull environment variables locally
vercel env pull

# View logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel remove deployment-url
```

---

## Deployment Checklist

- [ ] Created Supabase project
- [ ] Copied Supabase URL and keys
- [ ] Created Anthropic API key
- [ ] Updated frontend API endpoint to use environment variable
- [ ] Created `.env.production` file (not committed)
- [ ] Added `.env*` to `.gitignore`
- [ ] Pushed code to GitHub
- [ ] Created Vercel account
- [ ] Deployed backend to Vercel
- [ ] Set backend environment variables
- [ ] Deployed frontend to Vercel
- [ ] Set frontend environment variables
- [ ] Updated CORS to allow Vercel domain
- [ ] Configured Supabase redirect URLs
- [ ] Tested deployment
- [ ] Set up custom domain (optional)
- [ ] Configured monitoring/alerts

---

## Next Steps

After successful deployment:

1. **Test All Features**

   - User authentication
   - Chat functionality
   - File uploads
   - Canvas interactions
   - Real-time updates

2. **Performance Optimization**

   - Enable Vercel Edge Caching
   - Optimize images with Vercel Image Optimization
   - Review bundle size

3. **Security Hardening**

   - Review environment variables
   - Enable Vercel Authentication (optional)
   - Set up rate limiting
   - Review Supabase RLS policies

4. **Set Up Monitoring**
   - Configure error tracking (Sentry)
   - Set up uptime monitoring
   - Create performance dashboards

---

## Alternative Hosting Options

If Vercel's serverless limitations are an issue (especially for SSE):

- **Backend:** Railway, Render, Fly.io, DigitalOcean App Platform
- **Frontend:** Vercel, Netlify, Cloudflare Pages
- **Full-stack:** Railway, Render (supports long-lived connections)

---

**Your AI Brainstorm Platform is now live!** 🚀

For issues, check Vercel logs and Supabase logs first. Most deployment issues are related to environment variables or CORS configuration.
