import { createClient } from '@supabase/supabase-js';

// Environment variables are loaded in index.ts before any imports
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('projects').select('count').limit(1);
    if (error) throw error;
    console.log('✓ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('✗ Supabase connection failed:', error);
    return false;
  }
}
