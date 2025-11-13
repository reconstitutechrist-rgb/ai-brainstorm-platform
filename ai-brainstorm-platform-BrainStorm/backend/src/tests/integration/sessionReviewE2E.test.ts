import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SessionCompletionService } from '../../services/sessionCompletionService';
import { ContextGroupingService } from '../../services/ContextGroupingService';
import { SessionReviewAgent } from '../../agents/SessionReviewAgent';

/**
 * END-TO-END INTEGRATION TEST
 *
 * This test simulates the complete session review workflow:
 * 1. User chats in sandbox
 * 2. Ideas are extracted
 * 3. User ends session
 * 4. Ideas are grouped by topic
 * 5. User makes decisions
 * 6. Session is finalized
 * 7. Documents are generated
 * 8. Project is updated
 *
 * NOTE: These tests require a test database to be configured.
 * Set TEST_SUPABASE_URL and TEST_SUPABASE_KEY in .env.test
 * If not configured, tests will be skipped.
 */

describe.skipIf(!process.env.TEST_SUPABASE_URL)('Session Review E2E Integration Test', () => {
  let supabase: SupabaseClient;
  let testProjectId: string;
  let testSandboxId: string;
  let testConversationId: string;

  // Mock Anthropic API
  beforeAll(() => {
    // Setup test database connection (use test DB)
    supabase = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_KEY!
    );
  });

  afterAll(async () => {
    // Cleanup test data
    if (testProjectId) {
      await supabase.from('projects').delete().eq('id', testProjectId);
    }
  });

  beforeEach(async () => {
    // Create test project
    const { data: project } = await supabase
      .from('projects')
      .insert({
        title: 'E2E Test Project',
        description: 'Test project for integration testing',
        items: [],
        user_id: 'test-user-123',
      })
      .select()
      .single();

    testProjectId = project.id;

    // Create test sandbox
    const { data: sandbox } = await supabase
      .from('sandbox_sessions')
      .insert({
        project_id: testProjectId,
        status: 'active',
        name: 'Test Sandbox',
      })
      .select()
      .single();

    testSandboxId = sandbox.id;

    // Create test conversation with extracted ideas
    const { data: conversation } = await supabase
      .from('sandbox_conversations')
      .insert({
        sandbox_id: testSandboxId,
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'I want to add OAuth authentication',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Great! OAuth would improve security.',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'msg-3',
            role: 'user',
            content: 'Also add dark mode support',
            timestamp: new Date().toISOString(),
          },
        ],
        extracted_ideas: [
          {
            id: 'idea-1',
            source: 'user_mention',
            idea: {
              title: 'OAuth Authentication',
              description: 'Add OAuth 2.0 login support',
              reasoning: 'Improves security and user experience',
              userIntent: 'secure authentication',
            },
            status: 'refined',
            tags: ['auth', 'security'],
            innovationLevel: 'practical',
            conversationContext: {
              messageId: 'msg-1',
              timestamp: new Date().toISOString(),
              leadingQuestions: [],
              topic: 'Authentication',
              topicConfidence: 95,
            },
          },
          {
            id: 'idea-2',
            source: 'user_mention',
            idea: {
              title: 'Dark Mode',
              description: 'Add dark theme support',
              reasoning: 'Better UX for users who prefer dark themes',
              userIntent: 'visual customization',
            },
            status: 'refined',
            tags: ['ui', 'theme'],
            innovationLevel: 'moderate',
            conversationContext: {
              messageId: 'msg-3',
              timestamp: new Date().toISOString(),
              leadingQuestions: [],
              topic: 'UI Design',
              topicConfidence: 90,
            },
          },
          {
            id: 'idea-3',
            source: 'ai_suggestion',
            idea: {
              title: 'Mobile App',
              description: 'Create native mobile application',
              reasoning: 'Expand platform reach',
              userIntent: 'mobile support',
            },
            status: 'mentioned',
            tags: ['mobile'],
            innovationLevel: 'experimental',
            conversationContext: {
              messageId: 'msg-2',
              timestamp: new Date().toISOString(),
              leadingQuestions: [],
              topic: 'Mobile',
              topicConfidence: 85,
            },
          },
        ],
        current_mode: 'exploration',
        session_status: 'active',
      })
      .select()
      .single();

    testConversationId = conversation.id;
  });

  it('should complete the full session review workflow', async () => {
    // STEP 1: Group ideas by context
    const contextGroupingService = new ContextGroupingService();
    const conversation = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', testConversationId)
      .single();

    const topicGroups = await contextGroupingService.groupIdeasByContext(
      conversation.data.extracted_ideas,
      conversation.data.messages
    );

    // Verify grouping
    expect(topicGroups.length).toBeGreaterThan(0);
    const authGroup = topicGroups.find((g) => g.topic.toLowerCase().includes('auth'));
    expect(authGroup).toBeDefined();
    expect(authGroup!.ideas.length).toBeGreaterThan(0);

    // STEP 2: Generate review summary
    const reviewAgent = new SessionReviewAgent();
    const summary = await reviewAgent.generateReviewSummary(topicGroups);

    expect(summary).toBeDefined();
    expect(summary.summaryText).toBeTruthy();

    // STEP 3: Parse user decisions
    const userDecisions = 'I want OAuth and Dark Mode. I don\'t want the mobile app.';
    const parsedDecisions = await reviewAgent.parseDecisions(
      userDecisions,
      conversation.data.extracted_ideas,
      topicGroups
    );

    expect(parsedDecisions.accepted.length).toBe(2);
    expect(parsedDecisions.rejected.length).toBe(1);
    expect(parsedDecisions.unmarked.length).toBe(0);
    expect(parsedDecisions.needsClarification).toBe(false);

    // STEP 4: Finalize session
    const completionService = new SessionCompletionService(supabase);
    const finalSummary = await completionService.completeSession(testConversationId, {
      accepted: parsedDecisions.accepted,
      rejected: parsedDecisions.rejected,
      unmarked: parsedDecisions.unmarked,
    });

    // Verify session completion
    expect(finalSummary.success).toBe(true);
    expect(finalSummary.sessionId).toBeTruthy();
    expect(finalSummary.documentsCreated.length).toBe(2); // Accepted + Rejected docs
    expect(finalSummary.documentsUpdated.length).toBeGreaterThan(0); // Live docs regenerated
    expect(finalSummary.projectItemsAdded).toBe(2); // 2 accepted ideas

    // STEP 5: Verify database state
    // Check brainstorm session record
    const { data: session } = await supabase
      .from('brainstorm_sessions')
      .select('*')
      .eq('id', finalSummary.sessionId)
      .single();

    expect(session).toBeDefined();
    expect(session.accepted_ideas.length).toBe(2);
    expect(session.rejected_ideas.length).toBe(1);
    expect(session.generated_document_ids.length).toBe(2);

    // Check conversation status
    const { data: updatedConversation } = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', testConversationId)
      .single();

    expect(updatedConversation.session_status).toBe('completed');
    expect(updatedConversation.completed_at).toBeTruthy();
    expect(updatedConversation.final_decisions).toBeDefined();

    // Check sandbox status
    const { data: updatedSandbox } = await supabase
      .from('sandbox_sessions')
      .select('*')
      .eq('id', testSandboxId)
      .single();

    expect(updatedSandbox.status).toBe('saved_as_alternative');

    // Check project items
    const { data: updatedProject } = await supabase
      .from('projects')
      .select('*')
      .eq('id', testProjectId)
      .single();

    expect(updatedProject.items.length).toBe(2);
    expect(updatedProject.items[0].state).toBe('decided');
    expect(updatedProject.items[0].metadata.fromBrainstorm).toBe(true);
    expect(updatedProject.items[0].metadata.sessionId).toBe(finalSummary.sessionId);

    // Check generated documents
    const { data: generatedDocs } = await supabase
      .from('generated_documents')
      .select('*')
      .in('id', session.generated_document_ids);

    expect(generatedDocs).not.toBeNull();
    expect(generatedDocs!.length).toBe(2);

    const acceptedDoc = generatedDocs!.find((d) => d.document_type === 'accepted_ideas');
    const rejectedDoc = generatedDocs!.find((d) => d.document_type === 'rejected_ideas');

    expect(acceptedDoc).toBeDefined();
    expect(acceptedDoc!.content).toContain('OAuth');
    expect(acceptedDoc!.content).toContain('Dark Mode');
    expect(acceptedDoc!.source_type).toBe('brainstorm_session');
    expect(acceptedDoc!.source_id).toBe(finalSummary.sessionId);

    expect(rejectedDoc).toBeDefined();
    expect(rejectedDoc!.content).toContain('Mobile App');
    expect(rejectedDoc!.source_type).toBe('brainstorm_session');

    // STEP 6: Verify session can be retrieved
    const retrievedSummary = await completionService.getSessionSummary(finalSummary.sessionId);

    expect(retrievedSummary.id).toBe(finalSummary.sessionId);
    expect(retrievedSummary.generatedDocuments.length).toBe(2);

    // STEP 7: Verify project sessions list
    const projectSessions = await completionService.getProjectSessions(testProjectId);

    expect(projectSessions.length).toBe(1);
    expect(projectSessions[0].id).toBe(finalSummary.sessionId);
  }, 30000); // 30 second timeout for full E2E test

  it('should handle clarification workflow correctly', async () => {
    const reviewAgent = new SessionReviewAgent();
    const conversation = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', testConversationId)
      .single();

    const topicGroups = await new ContextGroupingService().groupIdeasByContext(
      conversation.data.extracted_ideas,
      conversation.data.messages
    );

    // STEP 1: Submit ambiguous decision (only mentions one idea)
    const ambiguousDecision = 'I want OAuth';
    const firstParse = await reviewAgent.parseDecisions(
      ambiguousDecision,
      conversation.data.extracted_ideas,
      topicGroups
    );

    // Should need clarification for unmarked ideas
    expect(firstParse.unmarked.length).toBeGreaterThan(0);
    expect(firstParse.needsClarification).toBe(true);
    expect(firstParse.clarificationQuestion).toBeTruthy();

    // STEP 2: Provide clarification
    const clarification = ambiguousDecision + '. Accept Dark Mode too. Reject mobile app.';
    const secondParse = await reviewAgent.parseDecisions(
      clarification,
      conversation.data.extracted_ideas,
      topicGroups
    );

    // Should have all ideas marked now
    expect(secondParse.accepted.length).toBe(2);
    expect(secondParse.rejected.length).toBe(1);
    expect(secondParse.unmarked.length).toBe(0);
    expect(secondParse.needsClarification).toBe(false);
  }, 20000);

  it('should handle session with only accepted ideas', async () => {
    const conversation = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', testConversationId)
      .single();

    const completionService = new SessionCompletionService(supabase);

    // Accept all ideas
    const summary = await completionService.completeSession(testConversationId, {
      accepted: conversation.data.extracted_ideas,
      rejected: [],
      unmarked: [],
    });

    expect(summary.success).toBe(true);
    expect(summary.projectItemsAdded).toBe(3);

    // Verify rejected doc is still created (but empty)
    const { data: session } = await supabase
      .from('brainstorm_sessions')
      .select('*')
      .eq('id', summary.sessionId)
      .single();

    expect(session.rejected_ideas.length).toBe(0);
    expect(session.accepted_ideas.length).toBe(3);
  });

  it('should handle session with only rejected ideas', async () => {
    const conversation = await supabase
      .from('sandbox_conversations')
      .select('*')
      .eq('id', testConversationId)
      .single();

    const completionService = new SessionCompletionService(supabase);

    // Reject all ideas
    const summary = await completionService.completeSession(testConversationId, {
      accepted: [],
      rejected: conversation.data.extracted_ideas,
      unmarked: [],
    });

    expect(summary.success).toBe(true);
    expect(summary.projectItemsAdded).toBe(0);

    // Verify project items not added
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', testProjectId)
      .single();

    expect(project.items.length).toBe(0);
  });
});
