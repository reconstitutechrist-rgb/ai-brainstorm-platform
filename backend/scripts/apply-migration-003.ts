// Apply migration 003: Add agent_type column to messages table
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function applyMigration() {
  console.log('\n🔄 Applying migration 003: Add agent_type column...\n');

  try {
    // Read migration SQL
    const migrationPath = join(__dirname, '../../database/migrations/003_add_agent_type_column.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('Migration SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log('');

    // Execute migration using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql RPC doesn't exist, we need to execute each statement separately
      console.log('⚠️  exec_sql RPC not available, applying migration manually...');

      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('ALTER TABLE')) {
          console.log(`Executing: ${statement.substring(0, 60)}...`);

          // Use PostgreSQL client through Supabase
          const { error: stmtError } = await supabase.rpc('exec', {
            sql: statement
          });

          if (stmtError) {
            console.error(`❌ Error: ${stmtError.message}`);

            // For ALTER TABLE, we can use the REST API approach
            console.log('⚠️  Trying alternative approach...');

            // Since we can't execute raw SQL directly, we'll need to use Supabase SQL Editor
            console.log('\n⚠️  MANUAL STEP REQUIRED:');
            console.log('Please run the following SQL in your Supabase SQL Editor:');
            console.log('─'.repeat(60));
            console.log(migrationSQL);
            console.log('─'.repeat(60));
            console.log('\nSteps:');
            console.log('1. Go to https://qzeozxwgbuazbinbqcxn.supabase.co/project/qzeozxwgbuazbinbqcxn/sql');
            console.log('2. Paste the SQL above');
            console.log('3. Click "Run"');
            console.log('4. Return here and press Enter to continue\n');

            // Wait for user confirmation
            process.stdin.once('data', async () => {
              // Verify migration
              await verifyMigration();
              process.exit(0);
            });

            return;
          } else {
            console.log('✓ Statement executed successfully');
          }
        }
      }
    } else {
      console.log('✓ Migration executed successfully via RPC');
    }

    // Verify migration
    await verifyMigration();

  } catch (error: any) {
    console.error('\n❌ Error applying migration:', error.message);

    console.log('\n⚠️  MANUAL STEP REQUIRED:');
    console.log('Please run the migration SQL in your Supabase SQL Editor.');
    console.log('Go to: https://qzeozxwgbuazbinbqcxn.supabase.co/project/qzeozxwgbuazbinbqcxn/sql');
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');

  // Check if column was added
  const { data, error } = await supabase
    .from('messages')
    .select('id, agent_type')
    .limit(1);

  if (error) {
    if (error.message.includes('agent_type')) {
      console.log('❌ Migration not applied yet - agent_type column still missing');
    } else {
      console.error('❌ Error verifying:', error.message);
    }
  } else {
    console.log('✅ Migration successful - agent_type column exists!');
  }

  console.log('');
}

applyMigration();
