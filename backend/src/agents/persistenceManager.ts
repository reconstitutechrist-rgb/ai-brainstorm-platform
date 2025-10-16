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

RECORDING SIGNALS:
- Decided: "Let's go with", "I like that", "Perfect", "That's the one"
- Exploring: "What if", "Maybe", "Thinking about", "Could we"
- Modify: "Change to", "Instead of X do Y"
- Park: "Come back to", "Maybe later", "Pin that"

VERIFICATION RULES:
- APPROVE IF: User explicitly stated, no interpretation needed, 100% clear, no conflicts
- REJECT IF: Any assumption, ambiguity, vague details, potential conflicts
- Be strict. When in doubt, reject.

PROCESS:
1. Verify data (strict gatekeeper)
2. If approved: Analyze intent and state classification
3. If recording: Track version automatically
4. Generate confirmation message for user

JSON OUTPUT: {
  "verified": bool,
  "shouldRecord": bool,
  "state": "decided|exploring|parked",
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
}`;

    super('PersistenceManagerAgent', systemPrompt);
  }

  /**
   * Main recording method - combines verification, recording, and versioning
   */
  async record(data: any, projectState: ProjectState, userMessage?: string): Promise<AgentResponse> {
    this.log('Processing record request with built-in verification');

    const messages = [
      {
        role: 'user',
        content: `Process this recording request with complete verification and version tracking.

Data to analyze: ${JSON.stringify(data)}

Original user message: "${userMessage || 'N/A'}"

Current project state: ${JSON.stringify(projectState)}

Step 1: VERIFY - Is this explicitly stated? Any ambiguity? Safe to record?
Step 2: ANALYZE - What state? (decided/exploring/parked) What confidence level?
Step 3: VERSION - Track this as a new version or modification
Step 4: CONFIRM - Generate read-back message for user confirmation

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
