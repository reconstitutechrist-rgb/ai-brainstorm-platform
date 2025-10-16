import { BaseAgent } from './base';

export class ConsistencyGuardianAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Consistency Guardian Agent.

YOUR PURPOSE:
Detect and prevent contradictions or conflicts across ALL project information including user statements, decisions, AND uploaded reference materials (PDFs, documents, images).

WHAT YOU GUARD AGAINST:
- Direct contradictions (user said X, now says opposite)
- **Reference conflicts** (user says X, but uploaded PDF says Y)
- **Cross-reference conflicts** (PDF A says X, PDF B says Y)
- Incompatible decisions (can't do both A and B)
- Timeline conflicts
- Budget inconsistencies
- Technical impossibilities

WHEN YOU ACTIVATE:
- Before recording new decisions
- When user modifies existing items
- When comparing user statements against reference materials
- Periodically during long sessions

YOUR APPROACH:
1. Compare new info against all existing records
2. **Compare user statements against uploaded reference content**
3. **Compare references against each other**
4. Check for logical conflicts
5. Identify potential issues
6. Recommend resolution path

OUTPUT FORMAT (JSON):
{
  "conflictDetected": true/false,
  "conflicts": [
    {
      "type": "contradiction|incompatibility|impossibility|reference_conflict|cross_reference",
      "newItem": "what user just said",
      "conflictsWith": "existing record or reference content",
      "source": "user_statement|project_state|reference_file",
      "referenceFile": "filename if from reference",
      "severity": "critical|high|medium",
      "explanation": "why this is a conflict",
      "resolutionOptions": ["option1", "option2"]
    }
  ],
  "recommendation": "what should happen"
}

BE ESPECIALLY VIGILANT about reference conflicts - these are critical because they show the user may be contradicting their own documented requirements or design specs.`;

    super('ConsistencyGuardianAgent', systemPrompt);
  }

  async checkConsistency(newData: any, projectState: any, projectReferences: any[] = []): Promise<any> {
    this.log('Checking consistency');

    // Build reference context
    let referenceContext = 'None';
    if (projectReferences.length > 0) {
      this.log(`Checking ${projectReferences.length} references for conflicts`);
      referenceContext = projectReferences.map(ref => {
        let refInfo = `File: ${ref.filename} (${ref.type})`;
        if (ref.analysis) {
          refInfo += `\nContent: ${ref.analysis}`;
        }
        if (ref.description) {
          refInfo += `\nDescription: ${ref.description}`;
        }
        return refInfo;
      }).join('\n\n');
    }

    const messages = [
      {
        role: 'user',
        content: `Check for conflicts between new data, existing project state, AND uploaded references.

New data: ${JSON.stringify(newData)}

Current project state: ${JSON.stringify(projectState)}

Uploaded References:
${referenceContext}

IMPORTANT: Pay special attention to conflicts between what the user just said and what's in their uploaded references. These are critical!

Return ONLY valid JSON.`,
      },
    ];

    const response = await this.callClaude(messages, 1200); // Increased token limit for reference checking
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const check = JSON.parse(cleanResponse);

    if (check.conflictDetected) {
      this.log(`Conflict detected! ${check.conflicts.length} conflicts found`);
    }

    // Return proper AgentResponse format
    return {
      agent: this.name,
      message: '', // Consistency check results are metadata, not shown to user
      showToUser: false,
      metadata: check,
    };
  }

  async checkReferenceAgainstDecisions(
    referenceAnalysis: any,
    referenceName: string,
    projectState: { decided: any[]; exploring: any[]; parked: any[] }
  ): Promise<any> {
    this.log(`Checking reference "${referenceName}" against project decisions`);

    const decidedItems = projectState.decided || [];
    const exploringItems = projectState.exploring || [];

    const messages = [
      {
        role: 'user',
        content: `A new reference has been uploaded. Compare its content against existing project decisions to find conflicts, confirmations, and new insights.

REFERENCE: ${referenceName}
REFERENCE ANALYSIS:
${JSON.stringify(referenceAnalysis, null, 2)}

DECIDED ITEMS (${decidedItems.length}):
${decidedItems.map((item: any, idx: number) => `${idx + 1}. ${item.text}`).join('\n') || 'None yet'}

ITEMS BEING EXPLORED (${exploringItems.length}):
${exploringItems.map((item: any, idx: number) => `${idx + 1}. ${item.text}`).join('\n') || 'None yet'}

TASK:
1. Identify CONFLICTS where the reference contradicts decided items
2. Identify CONFIRMATIONS where the reference supports/validates decided items
3. Identify NEW INSIGHTS from the reference that haven't been discussed

Return JSON:
{
  "conflictDetected": true/false,
  "conflicts": [
    {
      "type": "reference_conflict",
      "decidedItem": "the existing decision",
      "referenceContent": "what the reference says",
      "severity": "critical|high|medium",
      "explanation": "why this is a conflict",
      "resolutionOptions": [
        "Update decision to match reference",
        "Keep decision and note deviation",
        "Ask user to clarify intent"
      ]
    }
  ],
  "confirmations": [
    {
      "decidedItem": "the existing decision",
      "referenceSupport": "how the reference confirms it",
      "strengthensConfidence": true
    }
  ],
  "newInsights": [
    {
      "insight": "new information from reference",
      "category": "feature|constraint|preference|technical",
      "relevance": "high|medium|low",
      "suggestedAction": "decide|explore|park"
    }
  ],
  "summary": "overall assessment of reference alignment"
}`,
      },
    ];

    const response = await this.callClaude(messages, 2000);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanResponse);

    if (result.conflictDetected) {
      this.log(`Reference conflicts detected! ${result.conflicts?.length || 0} conflicts found`);
    }
    if (result.confirmations?.length > 0) {
      this.log(`Found ${result.confirmations.length} confirmations from reference`);
    }
    if (result.newInsights?.length > 0) {
      this.log(`Found ${result.newInsights.length} new insights from reference`);
    }

    return {
      agent: this.name,
      message: '', // Will be formatted by caller
      showToUser: false,
      metadata: {
        referenceIntegration: result,
        referenceName,
        hasConflicts: result.conflictDetected || false,
        hasConfirmations: (result.confirmations?.length || 0) > 0,
        hasNewInsights: (result.newInsights?.length || 0) > 0,
      },
    };
  }
}