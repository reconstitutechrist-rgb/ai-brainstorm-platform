import { BaseAgent } from './base';
import { AgentResponse } from '../types';

export class ReferenceAnalysisAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Reference Analysis Agent.

YOUR PURPOSE:
Analyze uploaded images, videos, PDFs, URLs, and product references to extract relevant information for the user's project. Extract STRUCTURED data that can be compared against project decisions to detect conflicts, confirmations, and new insights.

ANALYSIS CAPABILITIES:
1. IMAGE ANALYSIS: Design elements, colors, layout, style, composition
2. VIDEO ANALYSIS: Key frames, features, functionality, user interactions
3. PDF ANALYSIS: Extract key information, specifications, requirements
4. URL ANALYSIS: Competitor features, design patterns, functionality
5. PRODUCT ANALYSIS: Features, specs, pricing, pros/cons

ENHANCED EXTRACTION:
Extract structured requirements, constraints, and preferences:
- REQUIREMENTS: Features, capabilities, must-haves (with confidence 0-100)
- CONSTRAINTS: Budget limits, timeline restrictions, technical limitations
- PREFERENCES: Style choices, color schemes, approaches, patterns
- DESIGN ELEMENTS: Specific colors (hex codes), typography, layouts
- BUSINESS RULES: Policies, workflows, processes
- TECHNICAL SPECS: APIs, platforms, technologies, performance requirements

ANALYSIS OUTPUT:
{
  "summary": "brief overview",
  "keyFeatures": ["list", "of", "features"],
  "extractedRequirements": [
    {"type": "feature|constraint|preference", "text": "requirement description", "confidence": 0-100}
  ],
  "designElements": {
    "colors": ["#hex1", "#hex2"],
    "typography": ["font1", "font2"],
    "layout": "description",
    "style": "description"
  },
  "technicalSpecs": {
    "platforms": ["platform1", "platform2"],
    "technologies": ["tech1", "tech2"],
    "performance": ["requirement1", "requirement2"]
  },
  "businessRules": ["rule1", "rule2"],
  "relevantInsights": ["insight 1", "insight 2"],
  "applicableIdeas": ["idea 1", "idea 2"],
  "questions": ["clarifying question 1"]
}

GUIDELINES:
- Be objective and descriptive
- Extract SPECIFIC values (exact hex codes, font names, dimensions)
- Categorize each finding (requirement/constraint/preference)
- Assign confidence scores (0-100) to extracted items
- Focus on what's relevant to user's project
- Identify patterns and best practices
- Suggest how insights could be applied
- Never make assumptions about user's intent`;

    super('ReferenceAnalysisAgent', systemPrompt);
  }

  async analyze(referenceType: string, referenceData: any): Promise<AgentResponse> {
    this.log(`Analyzing ${referenceType} reference`);

    const messages = [
      {
        role: 'user',
        content: `Analyze this ${referenceType} reference and extract relevant information.

Reference data: ${JSON.stringify(referenceData)}

Return structured JSON analysis following the ANALYSIS OUTPUT format in your system prompt. Include extractedRequirements with confidence scores, specific design elements with exact values (hex codes, font names), and technical specifications.`,
      },
    ];

    const response = await this.callClaude(messages, 2000);

    return {
      agent: this.name,
      message: response,
      showToUser: true,
      metadata: {
        analysisCompleted: true,
        referenceType,
      },
    };
  }

  async analyzeWithContext(
    referenceType: string,
    referenceData: any,
    projectContext: {
      decidedItems: any[];
      exploringItems: any[];
      projectTitle: string;
    }
  ): Promise<AgentResponse> {
    this.log(`Analyzing ${referenceType} reference with project context`);

    const messages = [
      {
        role: 'user',
        content: `Analyze this ${referenceType} reference in the context of the user's project.

PROJECT CONTEXT:
Title: ${projectContext.projectTitle}

Decided Items (${projectContext.decidedItems.length}):
${projectContext.decidedItems.map((item: any, idx: number) => `${idx + 1}. ${item.text}`).join('\n') || 'None yet'}

Items Being Explored (${projectContext.exploringItems.length}):
${projectContext.exploringItems.map((item: any, idx: number) => `${idx + 1}. ${item.text}`).join('\n') || 'None yet'}

REFERENCE TO ANALYZE:
${JSON.stringify(referenceData)}

TASK:
1. Extract structured requirements, constraints, and preferences from the reference
2. Compare them against the project's decided and exploring items
3. Identify:
   - CONFLICTS: Where reference contradicts decided items
   - CONFIRMATIONS: Where reference supports/validates decided items
   - NEW INSIGHTS: Valuable information not yet discussed in the project

Return JSON:
{
  "analysis": { ... standard analysis ... },
  "projectAlignment": {
    "conflicts": [{"decidedItem": "text", "referenceContent": "text", "severity": "critical|high|medium"}],
    "confirmations": [{"decidedItem": "text", "referenceSupport": "text"}],
    "newInsights": [{"insight": "text", "relevance": "high|medium|low"}]
  }
}`,
      },
    ];

    const response = await this.callClaude(messages, 2500);

    return {
      agent: this.name,
      message: '',
      showToUser: false,
      metadata: {
        contextualAnalysis: response,
        referenceType,
        hasConflicts: false, // Will be parsed from response
        hasConfirmations: false,
        hasNewInsights: false,
      },
    };
  }
}