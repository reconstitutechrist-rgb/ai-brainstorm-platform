// Script to apply migration 015: Add clusters column to projects table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '015_add_clusters_column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Migration SQL:');
    console.log(sql);
    console.log('\n⏳ Executing migration...\n');

    // Verify the column was added by trying to select it
    console.log('🔍 Checking if migration is needed...');
    const { data, error } = await supabase
      .from('projects')
      .select('id, clusters')
      .limit(1);

    if (error) {
      console.log('⚠️  Column does not exist, applying migration...\n');
      console.log('❌ Cannot apply migration via Supabase client.');
      console.log('\n📋 Please run this SQL manually in the Supabase SQL Editor:');
      console.log('\n' + sql + '\n');
      console.log('👉 Go to: https://supabase.com/dashboard → SQL Editor');
      process.exit(1);
    }

    console.log('✅ Clusters column already exists!');
    console.log('✨ The projects table has the clusters column.');

    if (data && data.length > 0) {
      console.log('\n📊 Sample data:', JSON.stringify(data[0], null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration check failed:', error.message);
    console.log('\n📋 Manual migration required. Please run this SQL in Supabase SQL Editor:');

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '015_add_clusters_column.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('\n' + sql + '\n');
    console.log('👉 Go to: https://supabase.com/dashboard → SQL Editor');

    process.exit(1);
  }
}

applyMigration();
