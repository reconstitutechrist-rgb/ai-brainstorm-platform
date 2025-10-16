# Run This SQL in Supabase SQL Editor

## Instructions

1. Go to your Supabase project: https://qzeozxwgbuazbinbqcxn.supabase.co
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the ENTIRE contents of the file: `database/migrations/004_user_sessions.sql`
5. Paste into the SQL editor
6. Click "Run" (or press Ctrl+Enter / Cmd+Enter)
7. Wait for success message

## What This Migration Does

✅ Creates `user_sessions` table to track individual user sessions
✅ Creates `session_analytics` table to store pre-computed analytics
✅ Adds indexes for fast queries
✅ Sets up Row Level Security (RLS) policies
✅ Creates database functions for calculations
✅ Adds triggers for automatic timestamp updates

## Expected Output

After running, you should see:
```
Success. No rows returned
```

This is normal! The migration creates tables and functions but doesn't return data.

## Verify Installation

After running the migration, verify it worked by running this query:

```sql
-- Check that tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_sessions', 'session_analytics');
```

**Expected Result:** You should see 2 rows with the table names.

## Test the Functions

You can test the database functions with this query:

```sql
-- Test get_time_since_last_session function
SELECT get_time_since_last_session('test-user', 'test-project-id'::uuid);
```

**Expected Result:** Should return "first session" since there's no session data yet.

## Troubleshooting

### "relation already exists"
**Meaning:** Tables were already created
**Action:** This is fine, the migration uses `IF NOT EXISTS` so it won't break anything

### "function does not exist: uuid_generate_v4()"
**Meaning:** UUID extension not enabled
**Action:** Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### "function does not exist: update_updated_at_column"
**Meaning:** Trigger function doesn't exist
**Action:** Make sure you ran previous migrations first. Check if this function exists:
```sql
SELECT * FROM information_schema.routines
WHERE routine_name = 'update_updated_at_column';
```

If it doesn't exist, add this before running the migration:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## After Migration

Once the migration completes successfully:

1. ✅ Restart your backend server
2. ✅ Restart your frontend dev server
3. ✅ Open the application and log in
4. ✅ Navigate to a project's chat page
5. ✅ You should see the SessionManager component

## Quick Verification Test

After everything is running, you can verify the system works by checking in Supabase:

```sql
-- Check if sessions are being created
SELECT * FROM user_sessions
ORDER BY created_at DESC
LIMIT 5;

-- Check if analytics are being tracked
SELECT * FROM session_analytics
ORDER BY last_activity DESC
LIMIT 5;
```

## File Location

The full SQL migration file is located at:
```
database/migrations/004_user_sessions.sql
```

## Need Help?

If you encounter any issues:
1. Check the error message carefully
2. Ensure previous migrations (001, 002, 003) were run first
3. Verify you have the correct permissions in Supabase
4. See `SESSION_SETUP_GUIDE.md` for more troubleshooting tips

---

**Ready?** Copy `database/migrations/004_user_sessions.sql` and run it in Supabase now! 🚀