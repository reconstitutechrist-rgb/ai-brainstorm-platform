import { BaseAgent } from './base';
import { AgentResponse, ProjectState } from '../types';

export class RecorderAgent extends BaseAgent {
  constructor() {
    // Phase 2 Optimization: Compressed system prompt (70% shorter)
    const systemPrompt = `Recorder Agent - document decisions from user language signals.

SIGNALS:
- Decided: "Let's go with", "I like that", "Perfect", "That's the one"
- Exploring: "What if", "Maybe", "Thinking about", "Could we"
- Modify: "Change to", "Instead of X do Y"
- Park: "Come back to", "Maybe later", "Pin that"

PROCESS: Analyze intent, cite exact quote, 100% certainty required.

JSON: {"shouldRecord":bool, "state":"decided|exploring|parked", "item":"text", "confidence":0-100, "reasoning":"why", "needsConfirmation":bool, "confirmationMessage":"text"}`;

    super('RecorderAgent', systemPrompt);
  }

  async record(data: any, projectState: ProjectState): Promise<AgentResponse> {
    this.log('Recording information');

    const messages = [
      {
        role: 'user',
        content: `Analyze this information and determine if it should be recorded.

Data to analyze: ${JSON.stringify(data)}

Current project state: ${JSON.stringify(projectState)}

Return ONLY valid JSON matching your system prompt format.`,
      },
    ];

    const response = await this.callClaude(messages, 800);

    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleanResponse);

    return {
      agent: this.name,
      message: analysis.confirmationMessage,
      showToUser: analysis.needsConfirmation,
      metadata: analysis,
    };
  }

  /**
   * Record items based on reviewer findings
   * Used when "Review Conversation" command identifies missing items
   */
  async recordFromReview(reviewFindings: any[], conversationHistory: any[], projectState: ProjectState): Promise<AgentResponse> {
    this.log('Recording items from review findings');
    console.log('[RecorderAgent] reviewFindings:', JSON.stringify(reviewFindings, null, 2));
    console.log('[RecorderAgent] conversationHistory length:', conversationHistory.length);
    console.log('[RecorderAgent] projectState:', JSON.stringify(projectState, null, 2));

    // Extract missing items from review findings
    const missingItems = reviewFindings.filter(
      (finding: any) => finding.category === 'completeness' && finding.severity !== 'low'
    );

    console.log('[RecorderAgent] Filtered missingItems:', JSON.stringify(missingItems, null, 2));

    if (missingItems.length === 0) {
      console.log('[RecorderAgent] No missing items to record - returning empty response');
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
        content: `Based on the review findings and conversation history, identify specific items to record.

Review Findings (Missing Items):
${JSON.stringify(missingItems, null, 2)}

Recent Conversation (last 20 messages):
${JSON.stringify(conversationHistory.slice(-20), null, 2)}

Current Project State:
${JSON.stringify(projectState, null, 2)}

Extract specific, concrete items to record. For each item:
1. Determine if it should be "decided", "exploring", or "parked"
2. Write a clear, concise item text (1-2 sentences max)
3. Include the relevant user quote as citation
4. Assign confidence level (0-100)

Return ONLY valid JSON in this format:
{
  "itemsToRecord": [
    {
      "item": "Clear text to record",
      "state": "decided|exploring|parked",
      "userQuote": "exact relevant quote from conversation",
      "confidence": 85,
      "reasoning": "why this should be recorded"
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
}
