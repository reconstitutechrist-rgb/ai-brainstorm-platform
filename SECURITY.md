# Security Documentation

## Overview

The AI Brainstorm Platform implements comprehensive security measures including Row Level Security (RLS), secure authentication, and data isolation. This document explains the security model and best practices.

---

## Security Model

### Authentication

**User Authentication**:
- Powered by Supabase Auth
- Supports email/password, OAuth, magic links
- JWT-based session management
- Automatic token refresh

**Backend Authentication**:
- Service role key for AI agent operations
- Never exposed to frontend
- Bypasses RLS for system operations
- Stored securely in environment variables

### Authorization (Row Level Security)

All database tables use RLS to ensure users can only access their own data.

---

## Row Level Security Policies

### Projects Table

| Operation | Policy | Description |
|-----------|--------|-------------|
| **SELECT** | Users can view own projects | `user_id = auth.uid()` |
| **INSERT** | Users can create own projects | `user_id = auth.uid()` |
| **UPDATE** | Users can update own projects | `user_id = auth.uid()` |
| **DELETE** | Users can delete own projects | `user_id = auth.uid()` |
| **ALL** | Service role full access | `USING (true)` for backend operations |

**Security Guarantees**:
- Users can only see projects they created
- Cannot modify or delete other users' projects
- Backend AI agents can access all projects via service role

### Messages Table

| Operation | Policy | Description |
|-----------|--------|-------------|
| **SELECT** | Users can view messages from own projects | Project must belong to user |
| **INSERT** | Users can create messages in own projects | Project must belong to user |
| **UPDATE** | ❌ Denied | Messages are append-only |
| **DELETE** | ❌ Denied | Messages are append-only |
| **ALL** | Service role can manage all messages | For AI agent responses |

**Security Guarantees**:
- Users can only read messages from their projects
- Messages cannot be edited or deleted (audit trail)
- AI agents can create assistant messages via service role

### References Table

| Operation | Policy | Description |
|-----------|--------|-------------|
| **SELECT** | Users can view references from own projects | Project must belong to user |
| **INSERT** | Users can upload references to own projects | `user_id = auth.uid()` AND project ownership |
| **UPDATE** | Users can update own references | `user_id = auth.uid()` |
| **DELETE** | Users can delete own references | `user_id = auth.uid()` |
| **ALL** | Service role can manage all references | For AI analysis updates |

**Security Guarantees**:
- Users can only access files from their projects
- Cannot upload files to other users' projects
- AI analysis updates use service role

### Agent Activity Table

| Operation | Policy | Description |
|-----------|--------|-------------|
| **SELECT** | Users can view activity from own projects | Project must belong to user |
| **INSERT** | ❌ Denied for users | Only service role can create |
| **UPDATE** | ❌ Denied | Activity log is immutable |
| **DELETE** | ❌ Denied | Activity log is immutable |
| **ALL** | Service role can manage activity | For AI agent logging |

**Security Guarantees**:
- Users can view agent activity for their projects
- Only backend can create activity logs
- Activity log is tamper-proof

---

## Storage Security

### File Storage (Supabase Storage)

**Bucket Configuration**:
```
Bucket: references
Public: false (private bucket with signed URLs)
```

**Folder Structure**:
```
references/
  ├── {user_id_1}/
  │   ├── file1.jpg
  │   └── file2.pdf
  ├── {user_id_2}/
  │   └── file3.png
  └── ...
```

**Storage Policies**:

| Operation | Policy | Description |
|-----------|--------|-------------|
| **INSERT** | Users can upload to own folder | `folder = auth.uid()` |
| **SELECT** | Users can view own files | `folder = auth.uid()` |
| **UPDATE** | Users can update own files | `folder = auth.uid()` |
| **DELETE** | Users can delete own files | `folder = auth.uid()` |
| **ALL** | Service role full access | For backend operations |

**Security Guarantees**:
- Files isolated by user folder
- Cannot access other users' files
- Signed URLs for temporary public access
- File size limits enforced (50MB)

---

## API Security

### Backend API (Express)

**CORS Configuration**:
```typescript
cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
})
```

**Authentication Middleware**:
```typescript
// Verify JWT token from Supabase Auth
async function authenticateUser(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: 'Unauthorized' });
  req.user = data.user;
  next();
}
```

**Rate Limiting** (recommended to add):
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Environment Variables

### Security Best Practices

**Never commit these to git**:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
SUPABASE_SERVICE_KEY=eyJhbGci...
```

**Safe for frontend** (prefixed with VITE_):
```env
VITE_API_URL=http://localhost:3001/api
```

**Backend Environment**:
```env
# Critical - Keep Secret
ANTHROPIC_API_KEY=sk-ant-api03-...
SUPABASE_SERVICE_KEY=eyJhbGci...

# Safe to share (public anon key)
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_URL=https://....supabase.co
```

### Key Rotation

**Regular rotation schedule**:
- Anthropic API key: Every 90 days
- Supabase service key: Every 90 days (via dashboard)
- JWT secret: Managed by Supabase, auto-rotated

---

## Threat Model

### Protected Against

✅ **SQL Injection**: Supabase uses parameterized queries
✅ **XSS**: React auto-escapes, no `dangerouslySetInnerHTML`
✅ **CSRF**: SameSite cookies, CORS restrictions
✅ **Unauthorized Data Access**: RLS enforces user isolation
✅ **File Upload Attacks**: File type validation, size limits
✅ **Brute Force**: Rate limiting (recommended)
✅ **JWT Tampering**: Supabase validates signatures
✅ **Session Hijacking**: Secure cookies, HTTPS only

### Potential Risks (to mitigate)

⚠️ **API Rate Limiting**: Add express-rate-limit
⚠️ **Anthropic API Quota**: Monitor usage, add alerts
⚠️ **Large File Uploads**: Enforce strict size limits
⚠️ **Denial of Service**: Add request timeouts
⚠️ **Data Exfiltration**: Add audit logging
⚠️ **Account Enumeration**: Add CAPTCHA on signup

---

## Security Testing

### RLS Policy Testing

**Test as authenticated user**:
```sql
-- Set user context
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';

-- Try to access data
SELECT * FROM projects;

-- Should only see own projects
RESET ROLE;
```

**Test policy enforcement**:
```sql
-- User A tries to access User B's project
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-a-uuid';

SELECT * FROM projects WHERE user_id = 'user-b-uuid';
-- Should return 0 rows

ROLLBACK;
```

### Storage Policy Testing

**Test file isolation**:
```typescript
// User A uploads file
const { data } = await supabase.storage
  .from('references')
  .upload(`${userA.id}/file.jpg`, file);

// User B tries to access User A's file
const { error } = await supabase.storage
  .from('references')
  .download(`${userA.id}/file.jpg`); // as User B

// Should fail with 403 Forbidden
```

---

## Security Headers

### Recommended HTTP Headers

```typescript
// In Express backend
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

---

## Incident Response

### If API Key Leaked

1. **Immediately rotate keys**:
   - Anthropic: Generate new key in console
   - Supabase: Rotate service key in dashboard

2. **Update environment variables**:
   ```bash
   # Update .env files
   # Redeploy backend
   ```

3. **Monitor for abuse**:
   - Check Anthropic usage logs
   - Review Supabase query logs

4. **Assess damage**:
   - Check for unauthorized data access
   - Review audit logs
   - Notify affected users if needed

### If Data Breach Detected

1. **Isolate the issue**:
   ```sql
   -- Temporarily disable affected user
   ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
   ```

2. **Investigate**:
   - Check Supabase logs
   - Review RLS policy bypasses
   - Identify attack vector

3. **Remediate**:
   - Fix vulnerability
   - Restore RLS
   - Force password reset for affected users

4. **Report**:
   - Document incident
   - Notify stakeholders
   - Implement preventive measures

---

## Compliance

### GDPR Considerations

**User Data Rights**:
- ✅ Right to access: Users can export their data
- ✅ Right to deletion: Cascade deletes implemented
- ✅ Right to rectification: Users can update their data
- ✅ Data portability: API provides structured data

**Data Retention**:
- Projects: Deleted when user deletes account
- Messages: Retained for audit (or deleted with project)
- Activity logs: 90-day retention policy (recommended)

**User Deletion**:
```sql
-- Delete all user data
BEGIN;
DELETE FROM projects WHERE user_id = 'user-uuid';
-- Cascade automatically deletes messages, references, activity
COMMIT;
```

---

## Monitoring & Alerts

### Recommended Monitoring

1. **Failed Authentication Attempts**:
   ```sql
   -- Monitor auth.audit_log_entries
   SELECT * FROM auth.audit_log_entries
   WHERE event_type = 'signin'
   AND error_message IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 100;
   ```

2. **RLS Policy Violations**:
   - Monitor Supabase logs for 403 errors
   - Alert on high violation rates

3. **Unusual API Usage**:
   - Track Anthropic API call volume
   - Alert on sudden spikes

4. **Storage Quota**:
   - Monitor storage bucket usage
   - Alert at 80% capacity

---

## Security Checklist

### Before Production Deployment

- [ ] All RLS policies enabled and tested
- [ ] Service role key stored securely
- [ ] CORS configured for production domain
- [ ] HTTPS enforced on all endpoints
- [ ] Rate limiting implemented
- [ ] File upload limits enforced
- [ ] Security headers configured
- [ ] Environment variables validated
- [ ] Backup and recovery tested
- [ ] Monitoring and alerts configured
- [ ] Security audit completed
- [ ] Incident response plan documented

### Regular Maintenance

- [ ] Weekly: Review security logs
- [ ] Monthly: Test RLS policies
- [ ] Quarterly: Rotate API keys
- [ ] Annually: Security audit

---

## Security Contact

For security issues, please:
1. **Do not** create a public GitHub issue
2. Email: security@yourcompany.com (replace with your email)
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (if any)

---

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-security.html)
- [Anthropic API Security](https://docs.anthropic.com/claude/reference/security)

---

**Last Updated**: 2025-10-13
**Version**: 2.0 (Production-Ready)
