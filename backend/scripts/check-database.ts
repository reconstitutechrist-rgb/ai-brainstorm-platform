// Check database schema and diagnose issues
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkDatabase() {
  console.log('\n🔍 Checking database schema...\n');

  try {
    // Check if messages table has agent_type column
    console.log('1. Checking messages table structure...');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (msgError) {
      console.error('❌ Error querying messages:', msgError.message);
    } else {
      console.log('✓ Messages table accessible');
      if (messages && messages.length > 0) {
        console.log('  Columns:', Object.keys(messages[0]));
      }
    }

    // Check if agent_activity table exists
    console.log('\n2. Checking agent_activity table...');
    const { data: activity, error: activityError } = await supabase
      .from('agent_activity')
      .select('*')
      .limit(1);

    if (activityError) {
      console.error('❌ Error querying agent_activity:', activityError.message);
    } else {
      console.log('✓ Agent_activity table accessible');
      if (activity && activity.length > 0) {
        console.log('  Columns:', Object.keys(activity[0]));
      }
    }

    // Check recent messages
    console.log('\n3. Checking recent messages...');
    const { data: recentMessages, error: recentError } = await supabase
      .from('messages')
      .select('id, role, agent_type, content, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Error fetching recent messages:', recentError.message);
    } else {
      console.log(`✓ Found ${recentMessages?.length || 0} recent messages`);
      recentMessages?.forEach((msg, i) => {
        console.log(`  ${i + 1}. [${msg.role}] ${msg.agent_type || 'no-agent'} - ${msg.content.substring(0, 50)}...`);
      });
    }

    // Check agent activity logs
    console.log('\n4. Checking agent activity logs...');
    const { data: recentActivity, error: actError } = await supabase
      .from('agent_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (actError) {
      console.error('❌ Error fetching activity:', actError.message);
    } else {
      console.log(`✓ Found ${recentActivity?.length || 0} activity records`);
      recentActivity?.forEach((act, i) => {
        console.log(`  ${i + 1}. ${act.agent_type} - ${act.action}`);
      });
    }

    // Try to insert a test message with agent_type
    console.log('\n5. Testing message insert with agent_type...');
    const testProjectId = '77b010bd-2fd1-4d9c-ad85-485d83f8cd6e'; // From the logs
    const { data: testMsg, error: insertError } = await supabase
      .from('messages')
      .insert({
        project_id: testProjectId,
        role: 'system',
        content: 'Database diagnostic test message',
        agent_type: 'DiagnosticAgent',
        metadata: { test: true }
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting test message:', insertError.message);
      console.error('   This suggests the agent_type column might not exist');
    } else {
      console.log('✓ Successfully inserted test message with agent_type');

      // Clean up test message
      await supabase
        .from('messages')
        .delete()
        .eq('id', testMsg.id);
      console.log('✓ Cleaned up test message');
    }

  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message);
  }

  console.log('\n✅ Diagnostic complete\n');
}

checkDatabase();
