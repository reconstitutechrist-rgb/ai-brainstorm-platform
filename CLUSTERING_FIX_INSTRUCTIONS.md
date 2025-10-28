# Canvas Clustering - Final Setup Steps

## Current Status
✅ **Clustering AI is working** - generating 5-6 clusters for your 38 cards
❌ **Database column missing** - can't save clusters

## Error Message
```
Could not find the 'clusters' column of 'projects' in the schema cache
```

## Solution: Add Clusters Column to Database

### Step 1: Run SQL Migration in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Paste this SQL:

```sql
-- Add clusters column to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS clusters JSONB DEFAULT '[]'::jsonb;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_clusters ON projects USING GIN (clusters);

-- Add comment
COMMENT ON COLUMN projects.clusters IS 'Stores canvas cluster metadata';
```

6. Click **Run** (or press Ctrl+Enter)

### Step 2: Reload Supabase Schema Cache

After running the SQL, you need to reload the PostgREST schema cache:

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to **Settings** → **API**
2. Find **PostgREST Schema Cache**
3. Click **Reload Schema**

**Option B: Via API**
```bash
curl -X POST "https://YOUR_PROJECT.supabase.co/rest/v1/rpc/reload_schema" \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"
```

### Step 3: Verify & Test

1. Refresh your browser at http://localhost:5174
2. The 38 cards should automatically cluster into 5-6 groups with colors
3. Check the browser console - you should see:
   ```
   [ChatPage] Auto-clustering triggered: 38 cards detected
   [ChatPage] Auto-clustering completed: 5 clusters created
   ```

## Troubleshooting

### If clustering still doesn't work after steps above:

1. **Hard refresh the page**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Check if column was added**:
   - Go to Supabase → **Table Editor** → **projects**
   - Look for `clusters` column (should be at the end)
3. **Verify the SQL ran successfully**:
   - Check for any error messages in the SQL Editor
   - The query should return "Success. No rows returned"

### Still not working?

Check browser console for errors and share the output. The clustering logic is working - it's just the database save that's failing.

## What's Working

From the backend logs, clustering is successfully:
- ✅ Analyzing 38 cards
- ✅ Generating 5-6 semantic clusters
- ✅ Creating cluster names, colors, and positions
- ❌ Saving to database (only issue)

Once the database column is added and cache reloaded, everything will work!
