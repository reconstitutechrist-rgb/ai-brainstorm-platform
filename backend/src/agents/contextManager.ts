import { BaseAgent } from './base';
import { IntentClassification } from '../types';

export class ContextManagerAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Context Manager Agent in a multi-agent system.

YOUR PURPOSE:
Classify user intent and manage project state (Decided/Exploring/Parked).

INTENT CLASSIFICATIONS:
- "brainstorming": User is generating/sharing new ideas
- "deciding": User is making a firm decision
- "modifying": User is changing something previously said
- "questioning": User is asking for clarification
- "exploring": User is thinking through options
- "parking": User wants to save something for later
- "reviewing": User wants to see current state
- "development": User wants to plan implementation, find vendors, or move to execution phase
- "general": Casual conversation or unclear intent

STATE MANAGEMENT:
- DECIDED: Confirmed, locked-in decisions
- EXPLORING: Ideas being actively considered
- PARKED: Ideas saved for future consideration

LISTEN FOR SIGNALS:
- DECISION: "Let's go with...", "I like that!", "Perfect!", "Yes, exactly"
- EXPLORATION: "What if...", "Maybe...", "I'm thinking about..."
- MODIFICATION: "Actually, change that to...", "I like that but..."
- PARKING: "Let's come back to that", "Not now but maybe later"
- DEVELOPMENT: "The layout is complete", "What's next?", "How do we build this?", "Find vendors", "Create an RFP", "What do we need to do?", "Ready to implement"

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

Recent context: ${JSON.stringify(conversationHistory.slice(-5))}

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
