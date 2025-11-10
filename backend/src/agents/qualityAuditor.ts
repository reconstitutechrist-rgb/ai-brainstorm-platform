import { BaseAgent } from './base';
import { AgentResponse, isQualityAuditorResponse } from '../types';
import { AI_MODELS } from '../config/aiModels';

/**
 * QualityAuditor Agent
 *
 * Consolidates: Verification + AssumptionBlocker + AccuracyAuditor + ConsistencyGuardian
 *
 * Responsibilities:
 * - Pre-record verification (gatekeeper checks)
 * - Scan for hidden assumptions
 * - Post-record accuracy audits
 * - Detect contradictions and conflicts
 * - Reference material consistency checking
 */
export class QualityAuditorAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Quality Auditor - unified quality control for accuracy, consistency, and assumption prevention.

YOUR PURPOSE:
Ensure all recorded information is accurate, explicit, consistent, and assumption-free.

QUALITY CONTROL MODES:

1. PRE-RECORD VERIFICATION (Gatekeeper)
   - Check: Explicitly stated? Ambiguous? Details clear? Conflicts? Intent clear?
   - APPROVE IF: User explicitly stated, no interpretation needed, 100% clear, no conflicts
   - REJECT IF: Any assumption, ambiguity, vague details, potential conflicts
   - Be strict. When in doubt, reject.

2. ASSUMPTION SCANNING (Zero Tolerance)
   - Flag ANYTHING not explicitly stated by user
   - No interpretations beyond exact words
   - No "logical" inferences (even obvious ones)
   - No reading between the lines
   - No filling in "reasonable" details
   - No common sense additions
   - BLOCK EVERYTHING that isn't 100% explicit

3. ACCURACY AUDITING (Continuous Verification)
   - Does recorded info match user statements exactly?
   - Are there contradictions across records?
   - Has context changed requiring updates?
   - Are timestamps and citations correct?
   - Is categorization (decided/exploring/parked) accurate?

4. CONSISTENCY CHECKING (Conflict Detection)
   - Direct contradictions (user said X, now says opposite)
   - Reference conflicts (user says X, uploaded PDF says Y)
   - Cross-reference conflicts (PDF A says X, PDF B says Y)
   - Incompatible decisions (can't do both A and B)
   - Timeline conflicts, budget inconsistencies
   - Technical impossibilities

OUTPUT FORMATS:

For verify() mode:
{
  "approved": bool,
  "confidence": 0-100,
  "issues": ["list of concerns"],
  "reasoning": "detailed explanation",
  "recommendation": "what should happen next"
}

For scanAssumptions() mode:
{
  "assumptionsDetected": bool,
  "assumptions": [
    {
      "detail": "what was assumed",
      "explicitStatement": "what user actually said",
      "severity": "critical|high|medium",
      "recommendation": "ask user to specify this"
    }
  ],
  "approved": bool,
  "reasoning": "explanation"
}

For audit() mode:
{
  "overallStatus": "accurate|needs_review|has_errors",
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "type": "contradiction|inaccuracy|miscategorization|drift",
      "description": "what's wrong",
      "affectedRecords": ["list of record IDs"],
      "recommendation": "how to fix"
    }
  ],
  "auditTimestamp": "ISO date",
  "recordsAudited": number
}

For checkConsistency() mode:
{
  "conflictDetected": bool,
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
}`;

    super('QualityAuditorAgent', systemPrompt);
  }

  /**
   * Pre-record verification - gatekeeper check (previously VerificationAgent)
   */
  async verify(data: any, userMessage: string): Promise<AgentResponse> {
    this.log('Performing pre-record verification');

    const messages = [
      {
        role: 'user',
        content: `Verify if this information should be recorded.

Data to verify: ${JSON.stringify(data)}

Original user message: "${userMessage}"

VERIFICATION CHECKLIST:
✓ Is this EXPLICITLY stated by the user?
✓ Is there ANY ambiguity?
✓ Are all details clear and specific?
✓ Are there conflicts with existing information?
✓ Is the user's intent clear?

APPROVE IF: All checks pass, 100% certainty
REJECT IF: Any doubt, assumption, or ambiguity

Return ONLY valid JSON matching verify() format in system prompt.`,
      },
    ];

    // Use Claude Haiku for fast verification - simple validation checklist
    const response = await this.callClaude(messages, 600, AI_MODELS.HAIKU);

    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const verification = JSON.parse(cleanResponse);

    this.log(`Verification: ${verification.approved ? 'APPROVED' : 'REJECTED'}`);

    return {
      agent: 'QualityAuditor',
      message: '', // Verification results are metadata, not shown to user
      showToUser: false,
      metadata: verification,
    };
  }

  /**
   * Scan for assumptions - zero tolerance (previously AssumptionBlockerAgent)
   */
  async scan(data: any): Promise<AgentResponse> {
    this.log('Scanning for assumptions');

    const messages = [
      {
        role: 'user',
        content: `Scan this data for ANY assumptions - be EXTREMELY strict.

Data: ${JSON.stringify(data)}

WHAT COUNTS AS AN ASSUMPTION:
- Anything not explicitly stated by the user
- Interpretations beyond exact words
- "Logical" inferences (even obvious ones)
- Reading between the lines
- Filling in "reasonable" details
- Common sense additions

EXAMPLES:
✗ User: "Make it blue" → Assuming: "a blue background" (which blue? background or foreground?)
✓ User: "Make the background navy blue" → This is explicit

Flag EVERYTHING that isn't 100% explicit.

Return ONLY valid JSON matching scanAssumptions() format in system prompt.`,
      },
    ];

    // Use Claude Haiku for fast assumption scanning - simple detection task
    const response = await this.callClaude(messages, 700, AI_MODELS.HAIKU);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const scan = JSON.parse(cleanResponse);

    this.log(`Assumptions detected: ${scan.assumptionsDetected ? 'YES' : 'NO'}`);

    return {
      agent: 'QualityAuditor',
      message: '', // Scan results are metadata, not shown to user
      showToUser: false,
      metadata: scan,
    };
  }

  /**
   * Audit accuracy of recorded information (previously AccuracyAuditorAgent)
   */
  async audit(projectState: any, conversationHistory: any[]): Promise<AgentResponse> {
    this.log('Auditing accuracy of recorded information');

    const messages = [
      {
        role: 'user',
        content: `Audit the accuracy of recorded information against conversation history.

Project state: ${JSON.stringify(projectState)}

Recent conversation (last 10 messages): ${JSON.stringify(conversationHistory.slice(-10))}

AUDIT CHECKLIST:
1. Does recorded info match user statements exactly?
2. Are there any contradictions across records?
3. Has context changed requiring updates?
4. Are timestamps and citations correct?
5. Is categorization (decided/exploring/parked) still accurate?
6. Is there any drift from original meaning?

Perform thorough audit and return ONLY valid JSON matching audit() format in system prompt.`,
      },
    ];

    const response = await this.callClaude(messages, 1000);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const audit = JSON.parse(cleanResponse);

    this.log(`Audit status: ${audit.overallStatus}`);

    return {
      agent: 'QualityAuditor',
      message: '', // Internal audit - no user-facing message
      showToUser: false,
      metadata: audit,
    };
  }

  /**
   * Check consistency and detect conflicts (previously ConsistencyGuardianAgent)
   */
  async checkConsistency(newData: any, projectState: any, projectReferences: any[] = []): Promise<AgentResponse> {
    this.log('Checking consistency and detecting conflicts');

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

WHAT TO DETECT:
- Direct contradictions (user said X, now says opposite)
- **Reference conflicts** (user says X, but uploaded PDF says Y)
- **Cross-reference conflicts** (PDF A says X, PDF B says Y)
- Incompatible decisions (can't do both A and B)
- Timeline conflicts
- Budget inconsistencies
- Technical impossibilities

IMPORTANT: Pay special attention to conflicts between what the user just said and what's in their uploaded references. These are critical!

Return ONLY valid JSON matching checkConsistency() format in system prompt.`,
      },
    ];

    const response = await this.callClaude(messages, 1200); // Increased token limit for reference checking
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const check = JSON.parse(cleanResponse);

    if (check.conflictDetected) {
      this.log(`Conflict detected! ${check.conflicts?.length || 0} conflicts found`);
    }

    return {
      agent: 'QualityAuditor',
      message: '', // Consistency check results are metadata, not shown to user
      showToUser: false,
      metadata: check,
    };
  }

  /**
   * Check reference against decisions (special consistency check for reference integration)
   */
  async checkReferenceAgainstDecisions(
    referenceAnalysis: any,
    referenceName: string,
    projectState: { decided: any[]; exploring: any[]; parked: any[] }
  ): Promise<AgentResponse> {
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
      agent: 'QualityAuditor',
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

  /**
   * Comprehensive quality check - run all checks in sequence
   * Used for critical workflows where maximum quality assurance is needed
   */
  async comprehensiveCheck(
    data: any,
    userMessage: string,
    projectState: any,
    conversationHistory: any[],
    projectReferences: any[] = []
  ): Promise<AgentResponse> {
    this.log('Running comprehensive quality check');

    // Run all checks
    const verificationResult = await this.verify(data, userMessage);
    const assumptionResult = await this.scan(data);
    const consistencyResult = await this.checkConsistency(data, projectState, projectReferences);
    const auditResult = await this.audit(projectState, conversationHistory);

    // Aggregate results with type guards
    const allPassed =
      (isQualityAuditorResponse(verificationResult) && verificationResult.metadata.approved) &&
      (isQualityAuditorResponse(assumptionResult) && !(assumptionResult.metadata as any).assumptionsDetected) &&
      (isQualityAuditorResponse(consistencyResult) && !consistencyResult.metadata.conflictDetected) &&
      (isQualityAuditorResponse(auditResult) && (auditResult.metadata as any).overallStatus === 'accurate');

    const allIssues: string[] = [];

    if (isQualityAuditorResponse(verificationResult) && verificationResult.metadata.issues) {
      allIssues.push(...verificationResult.metadata.issues.map((i: any) => i.description || i));
    }

    if (isQualityAuditorResponse(assumptionResult)) {
      const assumptions = (assumptionResult.metadata as any).assumptions;
      if (assumptions) {
        allIssues.push(...assumptions.map((a: any) => a.detail || a));
      }
    }

    if (isQualityAuditorResponse(consistencyResult) && consistencyResult.metadata.conflicts) {
      allIssues.push(...consistencyResult.metadata.conflicts.map((c: any) => c.description || c.explanation || c));
    }

    if (isQualityAuditorResponse(auditResult) && auditResult.metadata.issues) {
      allIssues.push(...auditResult.metadata.issues.map((i: any) => i.description || i));
    }

    this.log(`Comprehensive check: ${allPassed ? 'PASSED' : 'FAILED'} (${allIssues.length} issues)`);

    return {
      agent: 'QualityAuditor',
      message: '', // Comprehensive results are metadata
      showToUser: false,
      metadata: {
        qualityScore: allPassed ? 100 : Math.max(0, 100 - (allIssues.length * 10)),
        issues: allIssues.map(desc => ({
          type: 'comprehensive_check',
          severity: 'warning' as const,
          description: desc
        })),
        recommendations: allPassed ? [] : ['Review flagged issues and address before proceeding'],
        auditComplete: true,
      },
    };
  }
}
