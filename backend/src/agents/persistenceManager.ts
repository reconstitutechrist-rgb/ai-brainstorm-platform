import { BaseAgent } from './base';
import { AgentResponse, ProjectState } from '../types';

/**
 * PersistenceManager Agent
 *
 * Consolidates: Recorder + VersionControl + Verification
 *
 * Responsibilities:
 * - Verify data before recording (100% certainty requirement)
 * - Record decisions with state classification (decided/exploring/parked)
 * - Automatically track version history for all changes
 * - Handle confirmation read-backs to user
 */
export class PersistenceManagerAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Persistence Manager - unified recording, verification, and version control.

RECORDING SIGNALS (Expanded):
- DECIDED (Strong commitment):
  * Affirmative: "I want", "I need", "We need", "Let's use", "Let's go with", "Let's add"
  * Approval: "I like that", "Perfect", "Exactly", "Yes", "Definitely", "Absolutely", "That's the one", "Love it"
  * Selection: "I choose", "We'll use", "Go with", "Pick", "Select"

- EXPLORING (Considering options):
  * Tentative: "What if", "Maybe", "Could we", "Thinking about", "Consider"
  * Questions: "Should we", "Would it work", "How about"

- MODIFY (Changing previous decision):
  * Change: "Change to", "Instead of X do Y", "Actually", "Switch to"

- PARK (Save for later):
  * Defer: "Come back to", "Maybe later", "Pin that", "For later", "Not now"

- REJECTED (Explicitly don't want):
  * Rejection: "I don't want", "No [item]", "Not [item]", "Skip [item]"
  * Dismissal: "Don't like [item]", "Remove [item]", "Discard [item]"

VERIFICATION RULES:
- APPROVE IF: User explicitly stated intent, clear direction, specific feature/requirement mentioned
- REJECT IF: Pure question with no substance, completely off-topic, or just acknowledgment with no context
- Be BALANCED. Favor recording ideas over rejecting them, especially for "decided" and "exploring" intents.

CONTEXT-AWARE APPROVAL:
If user says "yes", "love it", "perfect", etc., look at the IMMEDIATELY PRECEDING AI message.
The user is approving what the AI suggested. Record the AI's suggestion as DECIDED.

CONTEXT-AWARE MULTI-SUGGESTION HANDLING:
When the assistant previously offered multiple suggestions (in bullet points), and the user responds, analyze their response to match specific suggestions:

Example conversation context:
[assistant]: "You could consider:
• Dark mode toggle
• User profile system
• Export to PDF"
[user]: "Love dark mode! Park profiles for now. Don't want export."

How to handle:
1. Identify all suggestions from assistant's previous message
2. Match user's words to each suggestion using natural language understanding
3. Assign appropriate states:
   - "Love dark mode" → Record "Dark mode toggle" as DECIDED ✅
   - "Park profiles" → Record "User profile system" as PARKED 📌
   - "Don't want export" → Record "Export to PDF" as REJECTED ❌
4. Suggestions NOT mentioned → Record as EXPLORING 🔍 (user is still considering)

Return multiple items in response when this pattern is detected, each with its own state.

PROCESS:
1. Verify data (balanced gatekeeper - favor recording)
2. If approved: Analyze intent and state classification
3. If recording: Track version automatically
4. Generate confirmation message for user

JSON OUTPUT: {
  "verified": bool,
  "shouldRecord": bool,
  "state": "decided|exploring|parked|rejected",
  "item": "text to record",
  "confidence": 0-100,
  "reasoning": "why this decision",
  "needsConfirmation": bool,
  "confirmationMessage": "text",
  "versionInfo": {
    "versionNumber": number,
    "changeType": "created|modified",
    "reasoning": "why this change"
  }
}

NOTE: When handling multi-suggestion responses, you may return multiple items.
For each item, include the same JSON structure with its specific state.`;

    super('PersistenceManagerAgent', systemPrompt);
  }

  /**
   * Main recording method - combines verification, recording, and versioning
   */
  async record(data: any, projectState: ProjectState, userMessage?: string, workflowIntent?: string, conversationHistory?: any[]): Promise<AgentResponse> {
    this.log(`Processing record request with built-in verification (intent: ${workflowIntent || 'unknown'})`);

    // Determine verification strictness based on workflow intent
    const isStrictIntent = workflowIntent === 'deciding' || workflowIntent === 'modifying';
    const isPermissiveIntent = workflowIntent === 'brainstorming' || workflowIntent === 'exploring' || workflowIntent === 'general';

    const verificationGuidance = isPermissiveIntent
      ? `PERMISSIVE VERIFICATION (Brainstorming/Exploring Mode):
- APPROVE IF: User mentioned an idea, feature, requirement, or thought about the project
- RECORD AS "exploring" state by default
- Be LENIENT - capture ideas even if not fully formed
- It's better to record and track ideas than to lose them
- Only REJECT if: Completely off-topic, pure question with no substance, or system message`
      : isStrictIntent
      ? `BALANCED VERIFICATION (Decision/Modification Mode):
- APPROVE IF: User stated intent, direction, or preference clearly
- Look for decision signals: "I want", "We need", "Let's use", "I like", "Yes", "Perfect"
- RECORD AS "decided" when user shows strong commitment or approval
- RECORD AS "exploring" if still considering options
- REJECT ONLY IF: Completely off-topic, pure question, or acknowledgment without context
- Favor recording decisions - better to track than lose them`
      : `BALANCED VERIFICATION (General Mode):
- APPROVE IF: User expressed intent, idea, preference, or requirement
- Extract and record specific features, needs, or decisions mentioned
- Be PERMISSIVE - capture valuable information even if casual
- REJECT ONLY IF: Pure question, off-topic, or no actionable content
- Favor recording over rejecting`;

    // Format conversation context for Claude
    const recentConversation = conversationHistory && conversationHistory.length > 0
      ? conversationHistory.slice(-10).map((msg: any) => `[${msg.role}]: ${msg.content}`).join('\n')
      : 'No conversation history available';

    const messages = [
      {
        role: 'user',
        content: `Process this recording request with complete verification and version tracking.

WORKFLOW INTENT: ${workflowIntent || 'general'}

${verificationGuidance}

CONTEXT AWARENESS - CRITICAL:
If the user message is short like "yes", "I love it", "perfect", "that's the one", "let's do it", etc.,
you MUST look at the IMMEDIATELY PRECEDING assistant/AI message in the conversation history below.
The user is approving/confirming what the AI just suggested.
Record the AI's suggestion as a DECIDED item, NOT just the user's approval phrase.

Example:
  [assistant]: "We could add a payment system using Stripe..."
  [user]: "Yes I love it!"
  → Record: "Add payment system using Stripe" (state: decided)

Recent Conversation (last 10 messages):
${recentConversation}

Data to analyze: ${JSON.stringify(data)}

Original user message: "${userMessage || 'N/A'}"

Current project state: ${JSON.stringify(projectState)}

Step 1: VERIFY - Apply the verification rules above based on the workflow intent
Step 2: CONTEXT - If user is confirming/approving, identify WHAT they're approving from conversation
Step 3: ANALYZE - What state? (decided/exploring/parked) What confidence level?
Step 4: VERSION - Track this as a new version or modification
Step 5: CONFIRM - Generate read-back message for user confirmation

Return ONLY valid JSON matching the system prompt format.`,
      },
    ];

    const response = await this.callClaude(messages, 1000);

    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanResponse);

    // Log verification result
    if (!analysis.verified) {
      this.log(`Verification FAILED: ${analysis.reasoning}`);
    } else {
      this.log(`Verified and ${analysis.shouldRecord ? 'recording' : 'skipping'}: ${analysis.item}`);
    }

    return {
      agent: this.name,
      message: analysis.confirmationMessage || '',
      showToUser: analysis.needsConfirmation,
      metadata: {
        verified: analysis.verified,
        shouldRecord: analysis.shouldRecord,
        state: analysis.state,
        item: analysis.item,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        versionInfo: analysis.versionInfo,
      },
    };
  }

  /**
   * Record items based on reviewer findings
   * Used when "Review Conversation" command identifies missing items
   */
  async recordFromReview(reviewFindings: any[], conversationHistory: any[], projectState: ProjectState): Promise<AgentResponse> {
    this.log('Recording items from review findings');
    console.log('[PersistenceManager] reviewFindings:', JSON.stringify(reviewFindings, null, 2));
    console.log('[PersistenceManager] conversationHistory length:', conversationHistory.length);

    // Extract missing items from review findings
    const missingItems = reviewFindings.filter(
      (finding: any) => finding.category === 'completeness' && finding.severity !== 'low'
    );

    console.log('[PersistenceManager] Filtered missingItems:', JSON.stringify(missingItems, null, 2));

    if (missingItems.length === 0) {
      console.log('[PersistenceManager] No missing items to record - returning empty response');
      return {
        agent: this.name,
        message: '',
        showToUser: false,
        metadata: { itemsRecorded: [] },
      };
    }

    // Ask Claude to extract concrete items to record from the findings and conversation
    const messages = [
      {
        role: 'user',
        content: `Based on the review findings and conversation history, identify specific items to record WITH VERIFICATION.

Review Findings (Missing Items):
${JSON.stringify(missingItems, null, 2)}

Recent Conversation (last 20 messages):
${JSON.stringify(conversationHistory.slice(-20), null, 2)}

Current Project State:
${JSON.stringify(projectState, null, 2)}

For each item you identify:
1. VERIFY it was explicitly stated (not inferred)
2. Determine state: "decided", "exploring", or "parked"
3. Write clear, concise item text (1-2 sentences max)
4. Include exact user quote as citation
5. Assign confidence level (0-100)
6. Create version record

Return ONLY valid JSON in this format:
{
  "itemsToRecord": [
    {
      "item": "Clear text to record",
      "state": "decided|exploring|parked",
      "userQuote": "exact relevant quote from conversation",
      "confidence": 85,
      "reasoning": "why this should be recorded",
      "verified": true,
      "versionInfo": {
        "versionNumber": 1,
        "changeType": "created",
        "reasoning": "Initial capture from review"
      }
    }
  ],
  "summary": "Brief summary of what was recorded"
}`,
      },
    ];

    const response = await this.callClaude(messages, 1500);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recordingPlan = JSON.parse(cleanResponse);

    // Format user-facing message
    const itemCount = recordingPlan.itemsToRecord?.length || 0;
    let message = '';

    if (itemCount > 0) {
      message = `\n\n📝 **Recorded ${itemCount} item${itemCount > 1 ? 's' : ''} based on review:**\n\n`;
      recordingPlan.itemsToRecord.forEach((item: any, index: number) => {
        const emoji = item.state === 'decided' ? '✅' : item.state === 'exploring' ? '🔍' : '📌';
        message += `${emoji} ${item.item}\n`;
      });

      if (recordingPlan.summary) {
        message += `\n${recordingPlan.summary}`;
      }
    }

    return {
      agent: this.name,
      message,
      showToUser: itemCount > 0,
      metadata: {
        itemsToRecord: recordingPlan.itemsToRecord || [],
        recordedCount: itemCount,
      },
    };
  }

  /**
   * Track a change to an existing item (handles versioning)
   */
  async trackChange(item: any, changeType: string, reasoning: string, triggeredBy: string): Promise<AgentResponse> {
    this.log(`Tracking ${changeType} change`);

    const versionRecord = {
      itemId: item.id,
      versionNumber: (item.currentVersion || 0) + 1,
      content: item.text || item.content,
      timestamp: new Date().toISOString(),
      changeType: changeType,
      reasoning: reasoning,
      triggeredBy: triggeredBy,
      previousVersion: item.currentVersion || null,
    };

    // Return standardized AgentResponse format
    return {
      agent: this.name,
      message: '', // Internal tracking - no user-facing message
      showToUser: false,
      metadata: {
        versionRecord,
        tracked: true,
      },
    };
  }

  /**
   * Verify data without recording (can be used standalone)
   */
  async verify(data: any, userMessage: string): Promise<AgentResponse> {
    this.log('Standalone verification check');

    const messages = [
      {
        role: 'user',
        content: `Verify if this information should be recorded.

Data to verify: ${JSON.stringify(data)}

Original user message: "${userMessage}"

Verification checklist:
✓ Explicitly stated by user?
✓ No ambiguity?
✓ Details clear and specific?
✓ No conflicts with existing information?
✓ User intent clear?

APPROVE IF: All checks pass, 100% certainty
REJECT IF: Any doubt, assumption, or ambiguity

Return ONLY valid JSON:
{
  "approved": bool,
  "confidence": 0-100,
  "issues": ["list of concerns if rejected"],
  "reasoning": "detailed explanation",
  "recommendation": "what should happen next"
}`,
      },
    ];

    const response = await this.callClaude(messages, 600);

    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const verification = JSON.parse(cleanResponse);

    this.log(`Verification: ${verification.approved ? 'APPROVED' : 'REJECTED'}`);

    // Return proper AgentResponse format
    return {
      agent: this.name,
      message: '', // Verification results are metadata, not shown to user
      showToUser: false,
      metadata: verification,
    };
  }
}
