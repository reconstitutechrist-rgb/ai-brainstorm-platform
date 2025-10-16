// Apply SQL fix to add missing columns
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function applySQLFix() {
  console.log('\n🔧 Applying SQL fixes to database...\n');

  try {
    // Since Supabase JS client doesn't support raw SQL DDL commands,
    // we need to use the Supabase Management API or SQL Editor

    console.log('⚠️  DATABASE MIGRATION REQUIRED');
    console.log('═'.repeat(70));
    console.log('\nPlease run the following SQL in your Supabase SQL Editor:');
    console.log('URL: https://qzeozxwgbuazbinbqcxn.supabase.co/project/qzeozxwgbuazbinbqcxn/sql/new');
    console.log('\nSQL to execute:');
    console.log('─'.repeat(70));
    console.log(`
-- Add missing columns to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS agent_type TEXT;

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_agent_type ON messages(agent_type);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;
    `);
    console.log('─'.repeat(70));
    console.log('\nAfter running the SQL:');
    console.log('1. Press Ctrl+C to stop the backend server');
    console.log('2. Run: cd backend && npm run dev');
    console.log('3. The AI responses will now be saved properly!');
    console.log('\n═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

applySQLFix();
