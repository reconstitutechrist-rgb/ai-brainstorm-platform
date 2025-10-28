// Script to apply migration 015: Add clusters column to projects table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

async function applyMigration() {
  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🔧 Applying migration 015: Add clusters column to projects table');
  console.log('📍 Database:', process.env.SUPABASE_URL);

  try {
    // Read migration SQL
    const migrationPath = path.join(__dirname, 'migrations', '015_add_clusters_column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Migration SQL:');
    console.log(sql);
    console.log('\n⏳ Executing migration...\n');

    // Execute each SQL statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('ALTER TABLE')) {
        console.log('✓ Adding clusters column...');
        const { error } = await supabase.rpc('exec_sql', { sql_query: `${statement};` }).catch(async () => {
          // Fallback: Try direct query
          return await supabase.from('projects').select('clusters').limit(1);
        });

        if (error) {
          console.log('⚠️  Column may already exist, continuing...');
        } else {
          console.log('✓ Clusters column added successfully');
        }
      }
    }

    // Verify the column was added
    console.log('\n🔍 Verifying migration...');
    const { data, error } = await supabase
      .from('projects')
      .select('id, clusters')
      .limit(1);

    if (error) {
      console.error('❌ Migration verification failed:', error);
      console.log('\n⚠️  The column might need to be added manually via Supabase dashboard.');
      console.log('📋 Please run this SQL in the Supabase SQL Editor:');
      console.log('\n' + sql + '\n');
      process.exit(1);
    }

    console.log('✅ Migration verified successfully!');
    console.log('✨ The projects table now has a clusters column.');

    if (data && data.length > 0) {
      console.log('\n📊 Sample data:', JSON.stringify(data[0], null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n📋 Manual migration required. Please run this SQL in Supabase SQL Editor:');

    const migrationPath = path.join(__dirname, 'migrations', '015_add_clusters_column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('\n' + sql + '\n');

    process.exit(1);
  }
}

applyMigration();
