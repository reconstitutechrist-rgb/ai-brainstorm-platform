import { BaseAgent } from './base';
import { IntentClassification } from '../types';

export class ContextManagerAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Context Manager Agent in a multi-agent system.

YOUR PURPOSE:
Classify user intent and manage project state (Decided/Exploring/Parked).

INTENT CLASSIFICATIONS:
- "brainstorming": User is generating/sharing new ideas
- "deciding": User is making a firm decision or approving a suggestion
- "modifying": User is changing something previously said
- "questioning": User is asking for clarification
- "exploring": User is thinking through options
- "parking": User wants to save something for later
- "reviewing": User wants to see current state
- "development": User wants to plan implementation, find vendors, or move to execution phase
- "document_research": User wants to discover or generate documentation for the project
- "general": Casual conversation or unclear intent

STATE MANAGEMENT:
- DECIDED: Confirmed, locked-in decisions
- EXPLORING: Ideas being actively considered
- PARKED: Ideas saved for future consideration

LISTEN FOR DECISION SIGNALS (expanded):
- STRONG COMMITMENT: "I want", "I need", "We need", "Let's use", "Let's add", "Let's include"
- APPROVAL: "I like that!", "Perfect!", "Yes, exactly", "Love it", "Definitely", "Absolutely", "That's the one"
- SELECTION: "I choose", "We'll use", "Go with", "Pick that", "Select"
- AFFIRMATION: "Yes", "Yeah", "Yep", "Agreed", "Sounds good", "Exactly" (when following AI suggestion)

EXPLORATION SIGNALS:
- TENTATIVE: "What if...", "Maybe...", "I'm thinking about...", "Could we..."
- QUESTIONS: "Should we...", "Would it work if..."

MODIFICATION SIGNALS:
- CHANGES: "Actually, change that to...", "Instead of...", "Switch to..."

PARKING SIGNALS:
- DEFER: "Let's come back to that", "Not now but maybe later", "For later", "Pin that"

DEVELOPMENT SIGNALS:
- PLANNING: "The layout is complete", "What's next?", "How do we build this?", "Find vendors", "Create an RFP", "What do we need to do?", "Ready to implement"

DOCUMENT RESEARCH SIGNALS:
- DOCUMENTATION INQUIRY: "What documents do I need?", "What docs should I create?", "Generate documentation", "Create documents", "Document this project", "I need a project brief"

IMPORTANT: When user says affirmative words like "yes", "perfect", "love it" after an AI message, classify as "deciding" (they're approving the AI's suggestion).

RESPONSE FORMAT:
Always return valid JSON:
{
  "type": "classification",
  "confidence": 0-100,
  "stateChange": null | { "type": "move", "from": "exploring", "to": "decided", "item": "..." },
  "conflicts": [],
  "needsClarification": true/false,
  "reasoning": "explanation"
}`;

    super('ContextManagerAgent', systemPrompt);
  }

  async classifyIntent(userMessage: string, conversationHistory: any[]): Promise<IntentClassification> {
    this.log('Classifying user intent');

    // Check for special command phrases
    const normalizedMessage = userMessage.trim().toLowerCase();
    if (normalizedMessage === 'review conversation' || normalizedMessage === '?review conversation') {
      this.log('Special command detected: Review Conversation');
      return {
        type: 'reviewing',
        confidence: 100,
        conflicts: [],
        needsClarification: false,
        reasoning: 'User explicitly requested a conversation review to ensure everything is recorded properly',
      };
    }

    const messages = [
      {
        role: 'user',
        content: `Classify the intent of this user message.

User message: "${userMessage}"

Recent conversation context (last 5 messages):
${JSON.stringify(conversationHistory.slice(-5), null, 2)}

IMPORTANT CONTEXT RULES:
1. If user says short affirmative words ("yes", "love it", "perfect", "definitely", etc.) right after an AI suggestion, classify as "deciding" - they're approving the AI's idea
2. Look for decision signals: "I want", "I need", "We need", "Let's use/add/include"
3. Strong approval/commitment = "deciding" intent
4. Questions/tentative language = "exploring" intent
5. Off-topic or casual = "general" intent

Return ONLY valid JSON with the response format specified in your system prompt.`,
      },
    ];

    const response = await this.callClaude(messages, 500);

    // Clean and parse JSON
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const classification: IntentClassification = JSON.parse(cleanResponse);

    this.log(`Intent classified as: ${classification.type} (${classification.confidence}% confidence)`);

    return classification;
  }
}
