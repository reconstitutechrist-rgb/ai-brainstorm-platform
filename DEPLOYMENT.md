# Deployment Guide

## Overview

This guide covers deploying the AI Brainstorm Platform to production with proper security and performance optimizations.

---

## Database Migration

### Option 1: Fresh Installation (New Project)

If you're setting up a new project, use the production schema:

1. **Go to Supabase SQL Editor**:
   ```
   https://supabase.com/dashboard/project/qzeozxwgbuazbinbqcxn/sql
   ```

2. **Run production schema**:
   - Open `database/schema-production.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **RUN**

3. **Verify installation**:
   ```sql
   -- Check tables exist
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';

   -- Check RLS is enabled
   SELECT tablename, rowsecurity FROM pg_tables
   WHERE schemaname = 'public';

   -- Count policies
   SELECT schemaname, tablename, COUNT(*) as policy_count
   FROM pg_policies
   WHERE schemaname = 'public'
   GROUP BY schemaname, tablename;
   ```

### Option 2: Migration (Existing Project)

If you have existing data, use the migration script:

1. **Backup your data** (critical!):
   ```sql
   -- Supabase automatically backs up, but create manual backup:
   CREATE TABLE projects_backup AS SELECT * FROM projects;
   CREATE TABLE messages_backup AS SELECT * FROM messages;
   CREATE TABLE references_backup AS SELECT * FROM references;
   CREATE TABLE agent_activity_backup AS SELECT * FROM agent_activity;
   ```

2. **Run migration script**:
   - Open `database/migrate-to-production.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **RUN**

3. **Monitor output**:
   - Check for NOTICE messages showing progress
   - Verify row counts match your data
   - Check for any ERROR messages

4. **Verify migration**:
   ```sql
   -- Compare row counts
   SELECT
     (SELECT COUNT(*) FROM projects) as projects,
     (SELECT COUNT(*) FROM projects_backup) as projects_backup,
     (SELECT COUNT(*) FROM messages) as messages,
     (SELECT COUNT(*) FROM messages_backup) as messages_backup;

   -- Check RLS policies
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

5. **Test with your application**:
   - Start backend and frontend
   - Create test project as authenticated user
   - Verify data access works correctly

6. **Clean up backups** (after confirming everything works):
   ```sql
   DROP TABLE IF EXISTS projects_backup;
   DROP TABLE IF EXISTS messages_backup;
   DROP TABLE IF EXISTS references_backup;
   DROP TABLE IF EXISTS agent_activity_backup;
   ```

---

## Backend Deployment

### Environment Variables

**Production .env**:
```env
# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-app.com

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-api03-your-production-key

# Supabase (Production Project)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# File Upload
MAX_FILE_SIZE=52428800

# Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

### Build Backend

```bash
cd backend
npm install --production
npm run build
```

This creates `dist/` folder with compiled JavaScript.

### Deployment Options

#### Option A: Railway

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Initialize project**:
   ```bash
   railway init
   ```

3. **Add environment variables**:
   ```bash
   railway variables set ANTHROPIC_API_KEY=sk-ant-...
   railway variables set SUPABASE_URL=https://...
   railway variables set SUPABASE_SERVICE_KEY=eyJ...
   # ... add all variables
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

5. **Get deployment URL**:
   ```bash
   railway status
   ```

#### Option B: Render

1. **Create new Web Service** at https://render.com

2. **Connect GitHub repository**

3. **Configure**:
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm start`
   - Environment: Node 18+

4. **Add environment variables** in Render dashboard

5. **Deploy**

#### Option C: Fly.io

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Create `fly.toml`** in backend/:
   ```toml
   app = "ai-brainstorm-api"

   [env]
     PORT = "3001"
     NODE_ENV = "production"

   [[services]]
     internal_port = 3001
     protocol = "tcp"

     [[services.ports]]
       port = 80
       handlers = ["http"]

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]
   ```

3. **Deploy**:
   ```bash
   fly launch
   fly secrets set ANTHROPIC_API_KEY=sk-ant-...
   fly secrets set SUPABASE_SERVICE_KEY=eyJ...
   fly deploy
   ```

---

## Frontend Deployment

### Environment Variables

**Production .env**:
```env
VITE_API_URL=https://your-api.railway.app/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Build Frontend

```bash
cd frontend
npm install
npm run build
```

This creates `dist/` folder with optimized static files.

### Deployment Options

#### Option A: Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   cd frontend
   vercel
   ```

3. **Add environment variables** in Vercel dashboard

4. **Production deployment**:
   ```bash
   vercel --prod
   ```

#### Option B: Netlify

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   cd frontend
   netlify deploy --prod --dir=dist
   ```

3. **Configure** in `netlify.toml`:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

#### Option C: Cloudflare Pages

1. **Go to Cloudflare Pages** dashboard

2. **Connect GitHub repository**

3. **Configure**:
   - Build command: `cd frontend && npm run build`
   - Build output: `frontend/dist`
   - Framework: Vite

4. **Add environment variables**

5. **Deploy**

---

## Post-Deployment Configuration

### 1. Update CORS Settings

In backend `src/index.ts`:

```typescript
app.use(cors({
  origin: [
    'https://your-frontend.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

### 2. Configure Supabase Auth

1. **Go to Authentication → URL Configuration**

2. **Set Site URL**:
   ```
   https://your-frontend.vercel.app
   ```

3. **Add Redirect URLs**:
   ```
   https://your-frontend.vercel.app/**
   https://your-custom-domain.com/**
   ```

### 3. Set up Custom Domain (Optional)

#### For Frontend (Vercel):
```bash
vercel domains add your-domain.com
```

#### For Backend (Railway):
```bash
railway domain create your-api.com
```

### 4. Enable HTTPS

All platforms (Vercel, Netlify, Railway, Fly.io) automatically provide HTTPS.

Ensure your app redirects HTTP to HTTPS:

```typescript
// In backend Express
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

## Database Configuration

### Connection Pooling

Supabase handles connection pooling automatically. For production:

1. **Go to Project Settings → Database**

2. **Use Pooler connection string** for backend:
   ```
   postgresql://postgres:password@pooler.supabase.co:6543/postgres
   ```

3. **Update environment variable**:
   ```env
   DATABASE_URL=postgresql://postgres:password@pooler.supabase.co:6543/postgres
   ```

### Backup Configuration

1. **Go to Database → Backups**

2. **Enable daily backups**

3. **Set retention period** (recommended: 7-30 days)

4. **Test restoration**:
   - Download a backup
   - Test restore in staging environment

---

## Monitoring & Logging

### Application Monitoring

#### Option A: Sentry

1. **Install Sentry**:
   ```bash
   npm install @sentry/node @sentry/tracing
   ```

2. **Configure** in backend:
   ```typescript
   import * as Sentry from '@sentry/node';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   });
   ```

#### Option B: LogRocket

1. **Install LogRocket**:
   ```bash
   npm install logrocket
   ```

2. **Configure** in frontend:
   ```typescript
   import LogRocket from 'logrocket';

   LogRocket.init('your-app-id');
   ```

### Database Monitoring

1. **Enable pg_stat_statements** in Supabase

2. **Monitor slow queries**:
   ```sql
   SELECT query, calls, mean_exec_time, total_exec_time
   FROM pg_stat_statements
   ORDER BY total_exec_time DESC
   LIMIT 10;
   ```

3. **Set up alerts** for:
   - Slow queries (>1000ms)
   - High CPU usage (>80%)
   - Storage usage (>80%)
   - Connection pool exhaustion

### API Monitoring

1. **Add health check endpoint**:
   ```typescript
   app.get('/health', async (req, res) => {
     const dbHealthy = await testConnection();
     const anthropicHealthy = await testAnthropicAPI();

     res.status(dbHealthy && anthropicHealthy ? 200 : 503).json({
       status: dbHealthy && anthropicHealthy ? 'healthy' : 'unhealthy',
       services: {
         database: dbHealthy ? 'up' : 'down',
         anthropic: anthropicHealthy ? 'up' : 'down'
       }
     });
   });
   ```

2. **Monitor with UptimeRobot or Pingdom**

---

## Performance Optimization

### 1. Enable Caching

**Backend caching** (Redis recommended):

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache project data
async function getProject(projectId: string) {
  const cached = await redis.get(`project:${projectId}`);
  if (cached) return JSON.parse(cached);

  const project = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single();

  await redis.setex(`project:${projectId}`, 300, JSON.stringify(project));
  return project;
}
```

### 2. CDN for Static Assets

**Cloudflare CDN**:
1. Add your domain to Cloudflare
2. Enable CDN caching
3. Configure cache rules for static assets

### 3. Database Optimization

**Analyze query performance**:
```sql
EXPLAIN ANALYZE
SELECT * FROM projects
WHERE user_id = 'uuid-here'
ORDER BY updated_at DESC
LIMIT 10;
```

**Add missing indexes**:
```sql
-- If you notice slow queries on specific fields
CREATE INDEX idx_custom ON table_name (column_name);
```

### 4. Rate Limiting

**Install express-rate-limit**:
```bash
npm install express-rate-limit
```

**Configure**:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

app.use('/api/', limiter);
```

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables set correctly
- [ ] Database RLS policies enabled and tested
- [ ] CORS configured for production domains
- [ ] HTTPS enforced
- [ ] API keys rotated from development
- [ ] Storage bucket policies configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Error messages don't leak sensitive info

### Post-Deployment

- [ ] Test authentication flow
- [ ] Verify RLS blocks unauthorized access
- [ ] Test file upload and storage policies
- [ ] Monitor error logs for security issues
- [ ] Set up alerts for suspicious activity
- [ ] Document incident response plan
- [ ] Schedule security audit

---

## Rollback Plan

### If Deployment Fails

1. **Database rollback**:
   ```sql
   BEGIN;
   -- Restore from backup
   DROP TABLE projects;
   CREATE TABLE projects AS SELECT * FROM projects_backup;
   -- Repeat for other tables
   COMMIT;
   ```

2. **Application rollback**:
   - Vercel: Revert to previous deployment in dashboard
   - Railway: `railway rollback`
   - Render: Rollback in dashboard

3. **Clear caches**:
   ```bash
   # If using Redis
   redis-cli FLUSHALL
   ```

### Emergency Contacts

- **Database issues**: Supabase support
- **API issues**: Anthropic support
- **Hosting issues**: Platform-specific support
- **Team lead**: [Your contact info]

---

## Maintenance

### Regular Tasks

**Weekly**:
- [ ] Review error logs
- [ ] Check API usage and costs
- [ ] Monitor database performance
- [ ] Review security logs

**Monthly**:
- [ ] Test backup restoration
- [ ] Review and optimize slow queries
- [ ] Update dependencies
- [ ] Review RLS policy effectiveness

**Quarterly**:
- [ ] Rotate API keys
- [ ] Security audit
- [ ] Performance review
- [ ] Cost optimization review

---

## Scaling

### Vertical Scaling (Bigger servers)

**Backend**:
- Railway: Upgrade plan in dashboard
- Render: Increase instance size
- Fly.io: Scale VM size

**Database**:
- Supabase: Upgrade to Pro plan
- Increase compute resources

### Horizontal Scaling (More servers)

**Backend** (with load balancer):
```bash
# Railway
railway scale --replicas 3

# Fly.io
fly scale count 3
```

**Database** (Read replicas):
- Supabase Pro+ supports read replicas
- Direct read queries to replicas

### Auto-scaling

**Fly.io autoscaling**:
```toml
[services]
  [[services.scaling]]
    min = 1
    max = 10
    cpu_threshold = 80
```

---

## Cost Optimization

### Monitor Costs

**Anthropic API**:
- Track token usage
- Implement caching for similar queries
- Use Claude Haiku for simple tasks

**Supabase**:
- Monitor database size
- Archive old data
- Optimize storage usage

**Hosting**:
- Right-size instances
- Use auto-scaling
- Enable CDN caching

### Optimization Tips

1. **Cache AI responses** for repeated questions
2. **Batch API calls** where possible
3. **Compress uploaded files** before storage
4. **Archive old projects** after 90 days
5. **Use edge functions** for simple operations

---

## Support

### Getting Help

- **Supabase**: https://supabase.com/support
- **Anthropic**: https://docs.anthropic.com/support
- **Deployment platform**: Check their documentation

### Useful Commands

```bash
# Check backend logs (Railway)
railway logs

# Check frontend logs (Vercel)
vercel logs

# Database connection test
psql $DATABASE_URL -c "SELECT 1"

# Redis connection test
redis-cli -u $REDIS_URL ping
```

---

**Last Updated**: 2025-10-13
**Version**: 2.0
