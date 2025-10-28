import { BaseAgent } from './base';
import { ExtractedIdea, TopicGroup } from '../services/ContextGroupingService';

export interface ParsedDecisions {
  accepted: ExtractedIdea[];
  rejected: ExtractedIdea[];
  unmarked: ExtractedIdea[];
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
  ambiguousItems?: Array<{
    idea: ExtractedIdea;
    possibleInterpretations: string[];
  }>;
}

export interface ReviewSummary {
  totalIdeas: number;
  topicGroups: TopicGroup[];
  summaryText: string;
}

/**
 * Session Review Agent
 *
 * Handles end-of-session workflow:
 * - Detects "end session" intent
 * - Summarizes ideas for user review
 * - Parses natural language decisions
 * - Asks clarifying questions for unmarked/ambiguous ideas
 * - Generates final confirmation
 */
export class SessionReviewAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Session Review Agent - helps users review and make decisions on brainstorm ideas.

YOUR ROLE:
1. Detect when user wants to end the brainstorm session
2. Present all ideas in organized summary for review
3. Parse user's natural language decisions (accepted/rejected)
4. Ask clarifying questions for unmarked or ambiguous items
5. Generate final confirmation before processing

DECISION PARSING RULES:
- ACCEPTED signals: "I want", "Let's do", "Add", "Include", "Go with", "I like", "Yes to"
- REJECTED signals: "I don't want", "Skip", "No", "Not", "Reject", "Don't like"
- UNMARKED: Ideas not mentioned in user's statement

CLARIFICATION APPROACH:
- List all unmarked ideas clearly
- Ask: "Should I accept, reject, or leave these for later?"
- For ambiguous phrases ("the auth stuff"), list specific items and ask which ones

Be conversational and helpful, not robotic.`;

    super('SessionReviewAgent', systemPrompt);
  }

  /**
   * Detect if user wants to end the session
   */
  async detectEndSessionIntent(userMessage: string): Promise<{
    isEndIntent: boolean;
    confidence: number;
  }> {
    const lowerMessage = userMessage.toLowerCase();

    // Pattern matching for common end-session phrases
    const endPatterns = [
      /i'?m?\s+ready\s+to\s+end/i,
      /let'?s?\s+(wrap|finish|end|complete)/i,
      /i\s+think\s+we'?re\s+done/i,
      /that'?s?\s+(enough|all|everything)/i,
      /ready\s+to\s+review/i,
      /can\s+we\s+review/i,
      /end\s+(this\s+)?(session|brainstorm)/i,
    ];

    const matches = endPatterns.filter(pattern => pattern.test(userMessage));

    if (matches.length > 0) {
      return {
        isEndIntent: true,
        confidence: 90,
      };
    }

    // Use AI for more nuanced detection
    const prompt = `Is the user trying to end the brainstorm session and review ideas?

User message: "${userMessage}"

Return ONLY valid JSON:
{
  "isEndIntent": true/false,
  "confidence": 0-100,
  "reasoning": "brief explanation"
}`;

    try {
      const response = await this.callClaude([{ role: 'user', content: prompt }], 300);
      let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanResponse);

      return {
        isEndIntent: result.isEndIntent,
        confidence: result.confidence,
      };
    } catch (error) {
      console.error('[SessionReviewAgent] Error detecting end intent:', error);
      return {
        isEndIntent: false,
        confidence: 0,
      };
    }
  }

  /**
   * Generate review summary for user
   */
  async generateReviewSummary(topicGroups: TopicGroup[]): Promise<ReviewSummary> {
    const totalIdeas = topicGroups.reduce((sum, g) => sum + g.ideas.length, 0);

    const summaryText = `Great! Let's review what we discussed. I've identified ${totalIdeas} ideas grouped into ${topicGroups.length} topics:

${topicGroups.map(group => `
${group.icon} **${group.topic}** (${group.ideas.length} ideas)
${group.ideas.map((idea, i) => `  ${i + 1}. ${idea.idea.title}`).join('\n')}
`).join('\n')}

Tell me which ideas you want to move forward with and which you'd like to reject.`;

    return {
      totalIdeas,
      topicGroups,
      summaryText,
    };
  }

  /**
   * Parse user's natural language decisions
   */
  async parseDecisions(
    userStatement: string,
    allIdeas: ExtractedIdea[],
    topicGroups: TopicGroup[]
  ): Promise<ParsedDecisions> {
    this.log(`Parsing decisions from user statement: "${userStatement}"`);
    this.log(`Total ideas to review: ${allIdeas.length}`);

    const ideasText = allIdeas.map((idea, i) => `${i + 1}. ${idea.idea.title}: ${idea.idea.description}`).join('\n');

    const topicsText = topicGroups.map(group =>
      `${group.icon} ${group.topic}:\n${group.ideas.map((idea, i) => `  - ${idea.idea.title}`).join('\n')}`
    ).join('\n\n');

    const prompt = `The user is reviewing ${allIdeas.length} ideas from a brainstorm session and making decisions.

IDEAS (numbered):
${ideasText}

GROUPED BY TOPIC:
${topicsText}

USER'S DECISION STATEMENT:
"${userStatement}"

TASK: Parse the user's statement and identify which ideas they ACCEPTED and which they REJECTED.

RULES:
- ACCEPTED signals: "I want", "Let's do", "Add", "Include", "Go with", "I like", "Yes to", "Choose", "Pick"
- REJECTED signals: "I don't want", "Skip", "No", "Not", "Reject", "Don't like", "Remove"
- Be FLEXIBLE with fuzzy matching:
  * "the OAuth stuff" or "auth things" → match OAuth-related ideas
  * "mobile apps" → match all mobile-related ideas
  * "dark mode" → match dark mode idea even if phrased differently
- If user mentions a TOPIC name, apply decision to ALL ideas in that topic
- Ideas NOT mentioned → UNMARKED

IMPORTANT: Use the idea NUMBERS (1, 2, 3...) in your response.

Return ONLY valid JSON (no markdown, no explanation):
{
  "accepted": [1, 3, 5],
  "rejected": [2, 7, 9],
  "unmarked": [4, 6, 8, 10],
  "confidence": 85,
  "reasoning": "Brief explanation of parsing logic",
  "ambiguousMatches": [
    {
      "phrase": "the mobile stuff",
      "matchedIdeas": [6, 7, 8],
      "confidence": 90
    }
  ]
}`;

    try {
      const response = await this.callClaude([{ role: 'user', content: prompt }], 2000);
      let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanResponse);

      this.log(`Parsed decisions: ${parsed.accepted.length} accepted, ${parsed.rejected.length} rejected, ${parsed.unmarked.length} unmarked`);

      // Convert indices to actual ideas
      const accepted = parsed.accepted.map((i: number) => allIdeas[i - 1]).filter(Boolean);
      const rejected = parsed.rejected.map((i: number) => allIdeas[i - 1]).filter(Boolean);
      const unmarked = parsed.unmarked.map((i: number) => allIdeas[i - 1]).filter(Boolean);

      // Determine if clarification needed
      const needsClarification = unmarked.length > 0 || parsed.confidence < 70;

      let clarificationQuestion: string | undefined;
      if (unmarked.length > 0) {
        clarificationQuestion = this.generateClarificationQuestion(unmarked, topicGroups);
      } else if (parsed.confidence < 70) {
        clarificationQuestion = this.generateAmbiguityQuestion(parsed.ambiguousMatches, allIdeas);
      }

      return {
        accepted,
        rejected,
        unmarked,
        confidence: parsed.confidence,
        needsClarification,
        clarificationQuestion,
      };
    } catch (error) {
      console.error('[SessionReviewAgent] Error parsing decisions:', error);

      // Fallback: all ideas unmarked, need clarification
      return {
        accepted: [],
        rejected: [],
        unmarked: allIdeas,
        confidence: 0,
        needsClarification: true,
        clarificationQuestion: this.generateClarificationQuestion(allIdeas, topicGroups),
      };
    }
  }

  /**
   * Generate clarification question for unmarked ideas
   */
  private generateClarificationQuestion(
    unmarkedIdeas: ExtractedIdea[],
    topicGroups: TopicGroup[]
  ): string {
    if (unmarkedIdeas.length === 0) return '';

    // Group unmarked by topic for clearer presentation
    const unmarkedByTopic: { [topic: string]: ExtractedIdea[] } = {};

    for (const idea of unmarkedIdeas) {
      const topic = idea.conversationContext.topic || 'Other';
      if (!unmarkedByTopic[topic]) {
        unmarkedByTopic[topic] = [];
      }
      unmarkedByTopic[topic].push(idea);
    }

    const topicSections = Object.entries(unmarkedByTopic)
      .map(([topic, ideas]) => {
        const icon = topicGroups.find(g => g.topic === topic)?.icon || '💡';
        return `${icon} **${topic}**:\n${ideas.map(idea => `  - ${idea.idea.title}`).join('\n')}`;
      })
      .join('\n\n');

    return `What about these ${unmarkedIdeas.length} ideas you didn't mention?

${topicSections}

Should I accept, reject, or leave these for later consideration?`;
  }

  /**
   * Generate question for ambiguous matches
   */
  private generateAmbiguityQuestion(
    ambiguousMatches: Array<{ phrase: string; matchedIdeas: number[]; confidence: number }>,
    allIdeas: ExtractedIdea[]
  ): string {
    if (!ambiguousMatches || ambiguousMatches.length === 0) return '';

    const sections = ambiguousMatches.map(match => {
      const ideas = match.matchedIdeas.map(i => allIdeas[i - 1]).filter(Boolean);
      return `When you said "${match.phrase}", did you mean:\n${ideas.map(idea => `  - ${idea.idea.title}`).join('\n')}`;
    }).join('\n\n');

    return `I want to make sure I understand correctly:\n\n${sections}\n\nPlease clarify which specific ideas you want.`;
  }

  /**
   * Generate final confirmation message
   */
  async generateConfirmation(decisions: ParsedDecisions): Promise<string> {
    const { accepted, rejected, unmarked } = decisions;

    let confirmation = `Perfect! Here's the final breakdown:\n\n`;

    if (accepted.length > 0) {
      confirmation += `✅ **ACCEPTED** (${accepted.length} ideas - will be added to project):\n`;
      confirmation += accepted.map(idea => `  - ${idea.idea.title} (state: decided)`).join('\n');
      confirmation += '\n\n';
    }

    if (rejected.length > 0) {
      confirmation += `❌ **REJECTED** (${rejected.length} ideas - documented as rejected):\n`;
      confirmation += rejected.map(idea => `  - ${idea.idea.title}`).join('\n');
      confirmation += '\n\n';
    }

    if (unmarked.length > 0) {
      confirmation += `📋 **FOR LATER** (${unmarked.length} ideas - will stay in sandbox):\n`;
      confirmation += unmarked.map(idea => `  - ${idea.idea.title}`).join('\n');
      confirmation += '\n\n';
    }

    confirmation += `Should I proceed with generating documents and updating your project?`;

    return confirmation;
  }

  /**
   * Detect if user confirms to proceed
   */
  detectConfirmation(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase();

    const confirmPatterns = [
      /^yes$/i,
      /^yeah$/i,
      /^yep$/i,
      /^sure$/i,
      /^ok$/i,
      /^okay$/i,
      /proceed/i,
      /go ahead/i,
      /do it/i,
      /let's do it/i,
      /sounds good/i,
      /looks good/i,
    ];

    return confirmPatterns.some(pattern => pattern.test(lowerMessage));
  }

  /**
   * Detect if user wants to cancel
   */
  detectCancellation(userMessage: string): boolean {
    const lowerMessage = userMessage.toLowerCase();

    const cancelPatterns = [
      /^no$/i,
      /^nope$/i,
      /cancel/i,
      /nevermind/i,
      /never mind/i,
      /stop/i,
      /wait/i,
      /hold on/i,
      /go back/i,
    ];

    return cancelPatterns.some(pattern => pattern.test(lowerMessage));
  }
}
