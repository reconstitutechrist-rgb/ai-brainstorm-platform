// Test that agent tracking is working properly
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testAgentTracking() {
  console.log('\n🧪 Testing Agent Tracking System...\n');

  try {
    // Get recent messages with agent types
    console.log('1. Checking recent messages with agent tracking...');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, role, agent_type, content, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgError) {
      console.error('❌ Error:', msgError.message);
      return;
    }

    console.log(`\n✓ Found ${messages?.length || 0} recent messages:\n`);

    let assistantWithAgent = 0;
    let assistantWithoutAgent = 0;

    messages?.forEach((msg, i) => {
      const preview = msg.content.substring(0, 60).replace(/\n/g, ' ');
      const agentInfo = msg.agent_type || 'no-agent-type';
      const userId = msg.user_id || 'no-user-id';

      console.log(`${i + 1}. [${msg.role}] ${agentInfo}`);
      console.log(`   User: ${userId}`);
      console.log(`   "${preview}..."`);
      console.log(`   ${new Date(msg.created_at).toLocaleString()}\n`);

      if (msg.role === 'assistant') {
        if (msg.agent_type) {
          assistantWithAgent++;
        } else {
          assistantWithoutAgent++;
        }
      }
    });

    // Summary
    console.log('═'.repeat(70));
    console.log('SUMMARY:');
    console.log(`  Assistant messages WITH agent_type: ${assistantWithAgent}`);
    console.log(`  Assistant messages WITHOUT agent_type: ${assistantWithoutAgent}`);

    if (assistantWithoutAgent > 0 && assistantWithAgent === 0) {
      console.log('\n⚠️  WARNING: No assistant messages have agent_type set!');
      console.log('   This means messages saved BEFORE the fix are missing agent tracking.');
      console.log('   New messages should have agent_type set properly.');
    } else if (assistantWithAgent > 0) {
      console.log('\n✅ SUCCESS: Agent tracking is working!');
    }
    console.log('═'.repeat(70));

    // Check agent activity
    console.log('\n2. Checking agent activity logs...');
    const { data: activity, error: actError } = await supabase
      .from('agent_activity')
      .select('agent_type, action, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (actError) {
      console.error('❌ Error:', actError.message);
    } else {
      console.log(`\n✓ Found ${activity?.length || 0} recent activities:\n`);
      activity?.forEach((act, i) => {
        console.log(`${i + 1}. ${act.agent_type} - ${act.action}`);
        console.log(`   ${new Date(act.created_at).toLocaleString()}\n`);
      });
    }

    console.log('═'.repeat(70));
    console.log('✅ Test complete!\n');
    console.log('To test with a NEW message:');
    console.log('1. Go to http://localhost:5174');
    console.log('2. Send a message in your project');
    console.log('3. Run this script again to see the agent_type populated');
    console.log('═'.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

testAgentTracking();
