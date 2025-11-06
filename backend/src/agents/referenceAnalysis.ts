import { BaseAgent } from './base';
import { AgentResponse } from '../types';
import {
  AnalysisTemplate,
  getTemplateById,
  getAllTemplates,
} from '../config/analysis-templates';

export class ReferenceAnalysisAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Reference Analysis Agent.

YOUR PURPOSE:
Analyze uploaded images, videos, PDFs, Word documents, URLs, and product references to extract relevant information for the user's project. Extract STRUCTURED data presented in a professional, readable markdown format.

ANALYSIS CAPABILITIES:
1. IMAGE ANALYSIS: Design elements, colors, layout, style, composition
2. VIDEO ANALYSIS: Key frames, features, functionality, user interactions
3. PDF ANALYSIS: Extract key information, specifications, requirements
4. WORD DOCUMENTS: Extract full text content, requirements, specifications
5. URL ANALYSIS: Competitor features, design patterns, functionality
6. PRODUCT ANALYSIS: Features, specs, pricing, pros/cons

ENHANCED EXTRACTION:
Extract structured requirements, constraints, and preferences:
- REQUIREMENTS: Features, capabilities, must-haves (with confidence 0-100)
- CONSTRAINTS: Budget limits, timeline restrictions, technical limitations
- PREFERENCES: Style choices, color schemes, approaches, patterns
- DESIGN ELEMENTS: Specific colors (hex codes), typography, layouts
- BUSINESS RULES: Policies, workflows, processes
- TECHNICAL SPECS: APIs, platforms, technologies, performance requirements

ANALYSIS OUTPUT FORMAT (PROFESSIONAL MARKDOWN):

# 📄 [Document Title/Type] Analysis

## 📋 Executive Summary
[2-3 sentence overview of the document's purpose and key content]

## ⭐ Key Features
- Feature 1
- Feature 2
- Feature 3

## 📌 Requirements & Specifications

### 🎯 Core Features (High Confidence ≥80%)
| Feature | Confidence | Priority |
|---------|-----------|----------|
| Feature description | 95% | High |
| Feature description | 85% | Medium |

### ⚠️ Constraints & Limitations
- **Technical:** Constraint description
- **Timeline:** Constraint description
- **Budget:** Constraint description

### 💡 User Preferences
- Preference 1 *(Confidence: 85%)*
- Preference 2 *(Confidence: 70%)*

## 🎨 Design Elements
${`
**Color Palette:** \`#hex1\`, \`#hex2\`, \`#hex3\`
**Typography:** Font Family 1, Font Family 2
**Layout Style:** Description of layout approach
**Visual Style:** Description of design style
`}

## 🔧 Technical Specifications

**Target Platforms:**
- Platform 1
- Platform 2

**Technologies & Tools:**
- Technology 1 (purpose)
- Technology 2 (purpose)

**Performance Requirements:**
- Requirement 1
- Requirement 2

## 📏 Business Rules & Workflows
1. **Rule Category:** Rule description
2. **Process Flow:** Process description
3. **Policy:** Policy description

## 💡 Key Insights & Analysis

> **Insight 1:** Detailed explanation of important finding or pattern

> **Insight 2:** Detailed explanation of strategic consideration

> **Insight 3:** Detailed explanation of opportunity or risk

## 🚀 Actionable Recommendations
- [ ] Recommendation 1 with specific action
- [ ] Recommendation 2 with specific action
- [ ] Recommendation 3 with specific action

## ❓ Questions to Consider
1. Strategic question about approach or implementation?
2. Clarifying question about requirements or constraints?
3. Decision-point question about trade-offs?

---
*Analysis completed with [extraction method]. Confidence levels indicate certainty of extracted information.*

FORMATTING GUIDELINES:
- Use emojis sparingly for visual hierarchy (section headers only)
- Use tables for structured data with confidence scores
- Use blockquotes (>) for key insights
- Use checkboxes (- [ ]) for actionable items
- Use inline code backticks for technical terms, hex codes, file names
- Use bold (**text**) for emphasis on key terms
- Use italic (*text*) for confidence scores and metadata
- Keep sections concise but informative
- Omit sections that have no relevant data
- Be specific and actionable, not generic
- Extract exact values (colors, fonts, dimensions) when available
- Assign realistic confidence scores based on clarity of information`;

    super('ReferenceAnalysisAgent', systemPrompt);
  }

  async analyze(referenceType: string, referenceData: any): Promise<AgentResponse> {
    this.log(`Analyzing ${referenceType} reference`);

    // Check if we have extracted content
    const hasExtractedContent = Boolean(referenceData.extractedContent?.length);
    const contentType = referenceData.contentType || 'text';

    this.log(`Has extracted content: ${hasExtractedContent}, Content type: ${contentType}, Length: ${referenceData.extractedContent?.length || 0}`);

    let response: string;

    if (hasExtractedContent && contentType === 'image') {
      // Use Claude Vision API for image analysis
      this.log('Using Claude Vision API for image analysis');
      
      const visionPrompt = `Analyze this ${referenceType} image in detail and extract relevant information for project planning.

Return a professional markdown analysis following the ANALYSIS OUTPUT FORMAT in your system prompt. Use tables for requirements with confidence scores, blockquotes for key insights, and checkboxes for actionable recommendations.

Extract specific, actionable information including:
- **Visual Elements**: Colors (provide exact hex codes), typography, layout style, composition
- **Design Patterns**: UI components, navigation patterns, visual hierarchy
- **Requirements**: Features or capabilities this design suggests (with confidence scores)
- **Design Principles**: Aesthetic choices, target audience indicators
- **Technical Considerations**: Responsive design hints, accessibility features
- **Strategic Insights**: Design trends, competitive positioning, user experience goals

Focus on making the analysis professional, scannable, and immediately useful for project planning. Be specific with colors (hex codes), dimensions, and design terminology.`;

      // Get media type for vision API
      const mediaType = (referenceData.mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      
      response = await this.callClaudeVision(
        visionPrompt,
        referenceData.extractedContent,
        mediaType,
        2500
      );

    } else if (hasExtractedContent && contentType === 'text') {
      // Use extracted text content for analysis
      const contentPreview = referenceData.extractedContent.length > 8000
        ? referenceData.extractedContent.substring(0, 8000) + '\n\n[Content truncated...]'
        : referenceData.extractedContent;

      const analysisPrompt = `Analyze this ${referenceType} document and extract relevant information.

DOCUMENT CONTENT:
${contentPreview}

Return a professional markdown analysis following the ANALYSIS OUTPUT FORMAT in your system prompt. Use tables for requirements with confidence scores, blockquotes for key insights, and checkboxes for actionable recommendations.

Extract specific, actionable information including:
- Requirements, constraints, and preferences with confidence scores
- Design elements with exact values (hex codes, font names, dimensions)
- Technical specifications and performance requirements
- Business rules and workflows
- Strategic insights and recommendations

Focus on making the analysis professional, scannable, and immediately useful for project planning.`;

      const messages = [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ];

      response = await this.callClaude(messages, 2000);

    } else {
      // Fallback for cases without extracted content (videos, or old uploads)
      const analysisPrompt = `Analyze this ${referenceType} reference.

Reference type: ${referenceType}
URL: ${referenceData.url}

Note: Content extraction was not available for this file. Please provide general guidance on what information should be extracted from a ${referenceType} file for project planning purposes.

Return a professional markdown analysis following the ANALYSIS OUTPUT FORMAT in your system prompt, but mark confidence scores as low (20-40) due to lack of actual content. Focus on providing actionable guidance for what to look for in this type of reference.`;

      const messages = [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ];

      response = await this.callClaude(messages, 2000);
    }

    return {
      agent: this.name,
      message: response,
      showToUser: true,
      metadata: {
        analysisCompleted: true,
        referenceType,
        hadExtractedContent: hasExtractedContent,
        contentType,
        usedVision: contentType === 'image' && hasExtractedContent,
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

  /**
   * Phase 4.2: Analyze with specialized template
   * Uses template-specific fields and extraction hints for structured output
   */
  async analyzeWithTemplate(
    referenceType: string,
    referenceData: any,
    templateId: string
  ): Promise<AgentResponse> {
    this.log(`Analyzing ${referenceType} reference with template: ${templateId}`);

    // Get the template
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    this.log(`Using template: ${template.name} (${template.type})`);

    // Build extraction instructions from template fields
    const fieldInstructions = template.fields
      .map(field => {
        const required = field.required ? '**REQUIRED**' : 'Optional';
        return `### ${field.label} (${required})
${field.description}
Type: ${field.type}
${field.extractionHint ? `Hint: ${field.extractionHint}` : ''}`;
      })
      .join('\n\n');

    // Check if we have extracted content
    const hasExtractedContent = Boolean(referenceData.extractedContent?.length);
    const contentPreview = hasExtractedContent
      ? referenceData.extractedContent.length > 8000
        ? referenceData.extractedContent.substring(0, 8000) + '\n\n[Content truncated...]'
        : referenceData.extractedContent
      : `No extracted content available for ${referenceType}`;

    // Build the analysis prompt using template's system prompt
    const analysisPrompt = `${template.systemPrompt}

DOCUMENT CONTENT:
${contentPreview}

EXTRACTION REQUIREMENTS:
${fieldInstructions}

OUTPUT FORMAT: ${template.outputFormat}

${template.outputFormat === 'structured_json'
  ? `Return a JSON object with these fields:
{
  ${template.fields.map(f => `"${f.id}": ${f.type === 'list' ? '[]' : f.type === 'table' ? '{}' : '""'}`).join(',\n  ')}
}

Each field should contain the extracted information according to its type and extraction hints.`
  : template.outputFormat === 'markdown'
  ? `Return a well-formatted markdown document with sections for each field.`
  : `Return a table format with rows for each data point.`}

IMPORTANT:
- Extract information ONLY from the provided content
- Use confidence scores for uncertain information
- Mark required fields that couldn't be extracted as "Not found in content"
- Be specific and actionable
- Follow the template's extraction hints precisely`;

    const messages = [
      {
        role: 'user',
        content: analysisPrompt,
      },
    ];

    const response = await this.callClaude(messages, 3000);

    // Parse structured JSON if that's the output format
    let parsedData: any = null;
    if (template.outputFormat === 'structured_json') {
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (error) {
        this.log(`Failed to parse JSON response: ${error}`);
      }
    }

    return {
      agent: this.name,
      message: response,
      showToUser: true,
      metadata: {
        analysisCompleted: true,
        referenceType,
        templateUsed: {
          id: template.id,
          name: template.name,
          type: template.type,
        },
        hadExtractedContent: hasExtractedContent,
        outputFormat: template.outputFormat,
        structuredData: parsedData,
      },
    };
  }

  /**
   * Get all available analysis templates
   */
  getAvailableTemplates(): AnalysisTemplate[] {
    return getAllTemplates();
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): AnalysisTemplate | null {
    return getTemplateById(templateId);
  }

  /**
   * Analyze image and return structured JSON for selective recording
   * Returns analysis broken down into selectable sections
   */
  async analyzeImageStructured(referenceData: any): Promise<AgentResponse> {
    this.log('Analyzing image with structured output for selective recording');

    if (referenceData.contentType !== 'image' || !referenceData.extractedContent) {
      throw new Error('This method requires image content');
    }

    const visionPrompt = `Analyze this image in detail and return ONLY valid JSON with this EXACT structure:

{
  "colors": [
    {"hex": "#3498db", "name": "Primary Blue", "confidence": 95},
    {"hex": "#FFFFFF", "name": "White", "confidence": 100}
  ],
  "typography": [
    {"font": "Inter", "usage": "Headings", "confidence": 85},
    {"font": "Roboto", "usage": "Body text", "confidence": 80}
  ],
  "layout": {
    "style": "Grid-based with sidebar navigation",
    "description": "Three-column layout with prominent header",
    "confidence": 90
  },
  "components": [
    {"name": "Navigation bar", "description": "Fixed top nav with logo and menu", "confidence": 95},
    {"name": "Card layout", "description": "Content cards with images and text", "confidence": 90}
  ],
  "insights": [
    {"insight": "Modern, minimalist design approach", "category": "design", "confidence": 85},
    {"insight": "Mobile-responsive layout patterns", "category": "technical", "confidence": 80}
  ],
  "summary": "Brief 2-3 sentence overview of the image"
}

CRITICAL RULES:
- Return ONLY the JSON object, no markdown formatting, no code fences
- Each section must have confidence scores (0-100)
- Be specific with hex codes for colors (use actual detected colors)
- Typography should list actual font families or styles seen
- Layout should describe the overall structure
- Components should list UI elements visible in the image
- Insights should capture design principles and technical considerations
- If a section has no data, use empty array [] or empty object {}`;

    const mediaType = (referenceData.mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    
    const response = await this.callClaudeVision(
      visionPrompt,
      referenceData.extractedContent,
      mediaType,
      2000
    );

    // Parse the JSON response
    let structuredAnalysis: any;
    try {
      // Remove any markdown formatting if present
      const cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      structuredAnalysis = JSON.parse(cleanResponse);
    } catch (error) {
      this.log(`Failed to parse structured JSON: ${error}`);
      // Return empty structure on parse failure
      structuredAnalysis = {
        colors: [],
        typography: [],
        layout: {},
        components: [],
        insights: [],
        summary: 'Analysis failed to parse',
      };
    }

    return {
      agent: this.name,
      message: '', // No message for structured output
      showToUser: false,
      metadata: {
        structuredAnalysis,
        analysisType: 'structured',
        usedVision: true,
      },
    };
  }
}
