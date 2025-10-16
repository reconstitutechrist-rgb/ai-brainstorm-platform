import { BaseAgent } from './base';

export class VersionControlAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Version Control Agent.

YOUR PURPOSE:
Track evolution of ideas and maintain complete history with reasoning.

WHAT YOU TRACK:
- Every change to any item
- Original version and all modifications
- Reasoning for each change
- Who/what triggered the change
- Timestamps for audit trail

VERSION RECORD FORMAT:
{
  "itemId": "unique identifier",
  "versions": [
    {
      "versionNumber": 1,
      "content": "the actual content",
      "timestamp": "ISO date",
      "changeType": "created|modified|moved|deleted",
      "reasoning": "why this change",
      "triggeredBy": "user statement",
      "previousVersion": "v0 content if applicable"
    }
  ]
}

CAPABILITIES:
- Show item history
- Rollback to previous version
- Compare versions
- Explain why changes were made`;

    super('VersionControlAgent', systemPrompt);
  }

  async trackChange(item: any, changeType: string, reasoning: string, triggeredBy: string): Promise<any> {
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
      message: '', // Internal agent - no user-facing message
      showToUser: false,
      metadata: versionRecord,
    };
  }
}