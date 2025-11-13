/**
 * Analysis Templates - Phase 4.2
 *
 * Specialized templates for different types of research analysis
 * Each template defines specific fields to extract and structured output format
 */

export type AnalysisTemplateType = 'competitor' | 'technical' | 'user_research' | 'market' | 'custom';

export interface TemplateField {
  id: string;
  label: string;
  description: string;
  type: 'text' | 'list' | 'table' | 'comparison' | 'rating' | 'pros_cons';
  required: boolean;
  extractionHint?: string; // Hint for AI on how to extract this field
}

export interface AnalysisTemplate {
  id: string;
  name: string;
  description: string;
  type: AnalysisTemplateType;
  icon: string;
  fields: TemplateField[];
  outputFormat: 'markdown' | 'structured_json' | 'table';
  systemPrompt: string;
}

/**
 * Competitor Analysis Template
 * For analyzing competitor products, services, or companies
 */
export const competitorAnalysisTemplate: AnalysisTemplate = {
  id: 'competitor_analysis',
  name: 'Competitor Analysis',
  description: 'Analyze competitor features, pricing, strengths and weaknesses',
  type: 'competitor',
  icon: 'target',
  outputFormat: 'structured_json',
  fields: [
    {
      id: 'company_overview',
      label: 'Company Overview',
      description: 'Brief overview of the competitor',
      type: 'text',
      required: true,
      extractionHint: 'Extract company name, founding year, location, and brief description',
    },
    {
      id: 'key_features',
      label: 'Key Features',
      description: 'Main features and capabilities',
      type: 'list',
      required: true,
      extractionHint: 'List the most important features and capabilities mentioned',
    },
    {
      id: 'pricing',
      label: 'Pricing',
      description: 'Pricing tiers and costs',
      type: 'table',
      required: false,
      extractionHint: 'Extract pricing tiers, costs, and what\'s included in each tier',
    },
    {
      id: 'target_market',
      label: 'Target Market',
      description: 'Who they serve',
      type: 'text',
      required: true,
      extractionHint: 'Identify their target customer segments and industries',
    },
    {
      id: 'pros_cons',
      label: 'Strengths & Weaknesses',
      description: 'Advantages and disadvantages',
      type: 'pros_cons',
      required: true,
      extractionHint: 'Identify clear strengths (pros) and weaknesses (cons) from the content',
    },
    {
      id: 'unique_selling_points',
      label: 'Unique Selling Points',
      description: 'What makes them different',
      type: 'list',
      required: true,
      extractionHint: 'Extract what makes this competitor unique or different from others',
    },
    {
      id: 'technology_stack',
      label: 'Technology Stack',
      description: 'Technologies they use (if mentioned)',
      type: 'list',
      required: false,
      extractionHint: 'List technologies, platforms, or technical approaches mentioned',
    },
    {
      id: 'market_position',
      label: 'Market Position',
      description: 'Market share, growth, reputation',
      type: 'text',
      required: false,
      extractionHint: 'Extract information about market share, growth rate, or market reputation',
    },
  ],
  systemPrompt: `You are analyzing a competitor. Extract structured information to help compare and evaluate this competitor against our product.

Focus on:
- Specific features and capabilities
- Pricing tiers and cost structure
- Target market and customer segments
- Clear strengths and weaknesses
- What makes them unique or different
- Technical implementation details (if available)
- Market positioning and reputation

Be objective and factual. Only extract information that is explicitly stated or clearly implied in the source material.`,
};

/**
 * Technical Documentation Template
 * For analyzing APIs, technical specs, integration guides
 */
export const technicalDocumentationTemplate: AnalysisTemplate = {
  id: 'technical_documentation',
  name: 'Technical Documentation',
  description: 'Analyze APIs, technical specifications, and integration details',
  type: 'technical',
  icon: 'code',
  outputFormat: 'structured_json',
  fields: [
    {
      id: 'overview',
      label: 'Technical Overview',
      description: 'High-level technical summary',
      type: 'text',
      required: true,
      extractionHint: 'Summarize the technical purpose and capabilities',
    },
    {
      id: 'api_endpoints',
      label: 'API Endpoints',
      description: 'Available API endpoints',
      type: 'table',
      required: false,
      extractionHint: 'Extract endpoint paths, methods (GET/POST/etc), and descriptions',
    },
    {
      id: 'authentication',
      label: 'Authentication',
      description: 'Auth methods and requirements',
      type: 'text',
      required: false,
      extractionHint: 'Describe authentication methods (API keys, OAuth, JWT, etc)',
    },
    {
      id: 'data_formats',
      label: 'Data Formats',
      description: 'Input/output formats',
      type: 'list',
      required: false,
      extractionHint: 'List supported data formats (JSON, XML, etc)',
    },
    {
      id: 'integration_steps',
      label: 'Integration Steps',
      description: 'How to integrate',
      type: 'list',
      required: false,
      extractionHint: 'Step-by-step integration process',
    },
    {
      id: 'requirements',
      label: 'Technical Requirements',
      description: 'Prerequisites and dependencies',
      type: 'list',
      required: true,
      extractionHint: 'List technical requirements, dependencies, and prerequisites',
    },
    {
      id: 'rate_limits',
      label: 'Rate Limits',
      description: 'API rate limits or constraints',
      type: 'text',
      required: false,
      extractionHint: 'Extract rate limits, quotas, or usage constraints',
    },
    {
      id: 'code_examples',
      label: 'Code Examples',
      description: 'Example code snippets',
      type: 'list',
      required: false,
      extractionHint: 'Extract code examples or sample implementations',
    },
    {
      id: 'supported_platforms',
      label: 'Supported Platforms',
      description: 'Compatible platforms and environments',
      type: 'list',
      required: false,
      extractionHint: 'List supported operating systems, browsers, or platforms',
    },
  ],
  systemPrompt: `You are analyzing technical documentation. Extract structured technical information that developers would need to implement or integrate with this technology.

Focus on:
- API endpoints and methods
- Authentication and security
- Data formats and schemas
- Integration steps and process
- Technical requirements and dependencies
- Rate limits and constraints
- Code examples and samples
- Platform compatibility

Be precise with technical details. Include version numbers, exact endpoint paths, and specific requirements.`,
};

/**
 * User Research Template
 * For analyzing user feedback, reviews, pain points
 */
export const userResearchTemplate: AnalysisTemplate = {
  id: 'user_research',
  name: 'User Research',
  description: 'Analyze user feedback, pain points, needs, and sentiments',
  type: 'user_research',
  icon: 'users',
  outputFormat: 'structured_json',
  fields: [
    {
      id: 'summary',
      label: 'Research Summary',
      description: 'Overall summary of user insights',
      type: 'text',
      required: true,
      extractionHint: 'Summarize the key user insights and findings',
    },
    {
      id: 'pain_points',
      label: 'Pain Points',
      description: 'User problems and frustrations',
      type: 'list',
      required: true,
      extractionHint: 'Extract specific problems, frustrations, or challenges users face',
    },
    {
      id: 'needs',
      label: 'User Needs',
      description: 'What users want or need',
      type: 'list',
      required: true,
      extractionHint: 'Identify what users are looking for or need',
    },
    {
      id: 'quotes',
      label: 'Key Quotes',
      description: 'Notable user quotes',
      type: 'list',
      required: false,
      extractionHint: 'Extract direct quotes from users that illustrate key points',
    },
    {
      id: 'sentiment',
      label: 'Overall Sentiment',
      description: 'Positive, negative, or mixed',
      type: 'rating',
      required: true,
      extractionHint: 'Assess overall user sentiment as positive, negative, or mixed',
    },
    {
      id: 'feature_requests',
      label: 'Feature Requests',
      description: 'Desired features or improvements',
      type: 'list',
      required: false,
      extractionHint: 'List features or improvements users requested',
    },
    {
      id: 'user_segments',
      label: 'User Segments',
      description: 'Different types of users mentioned',
      type: 'list',
      required: false,
      extractionHint: 'Identify different user types, personas, or segments',
    },
    {
      id: 'use_cases',
      label: 'Use Cases',
      description: 'How users use or want to use the product',
      type: 'list',
      required: false,
      extractionHint: 'Extract specific use cases or scenarios mentioned by users',
    },
  ],
  systemPrompt: `You are analyzing user research data. Extract insights about user needs, pain points, and sentiments to inform product decisions.

Focus on:
- Specific pain points and frustrations
- Unmet needs and desires
- Direct user quotes that illustrate key points
- Overall sentiment (positive, negative, mixed)
- Requested features or improvements
- Different user segments or personas
- Real-world use cases

Preserve the user voice. Include direct quotes when available. Be empathetic and user-focused.`,
};

/**
 * Market Research Template
 * For analyzing market trends, opportunities, size
 */
export const marketResearchTemplate: AnalysisTemplate = {
  id: 'market_research',
  name: 'Market Research',
  description: 'Analyze market trends, size, opportunities, and competitive landscape',
  type: 'market',
  icon: 'trending-up',
  outputFormat: 'structured_json',
  fields: [
    {
      id: 'market_overview',
      label: 'Market Overview',
      description: 'High-level market summary',
      type: 'text',
      required: true,
      extractionHint: 'Summarize the market, its size, and key characteristics',
    },
    {
      id: 'market_size',
      label: 'Market Size',
      description: 'TAM, SAM, SOM estimates',
      type: 'text',
      required: false,
      extractionHint: 'Extract market size data (total addressable market, revenue, growth rate)',
    },
    {
      id: 'trends',
      label: 'Market Trends',
      description: 'Current and emerging trends',
      type: 'list',
      required: true,
      extractionHint: 'List current trends and emerging patterns in the market',
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      description: 'Market opportunities and gaps',
      type: 'list',
      required: true,
      extractionHint: 'Identify market opportunities, gaps, or underserved segments',
    },
    {
      id: 'threats',
      label: 'Threats',
      description: 'Market risks and challenges',
      type: 'list',
      required: false,
      extractionHint: 'List market threats, risks, or challenges',
    },
    {
      id: 'key_players',
      label: 'Key Players',
      description: 'Major companies in the market',
      type: 'list',
      required: false,
      extractionHint: 'List major companies or competitors in this market',
    },
    {
      id: 'growth_drivers',
      label: 'Growth Drivers',
      description: 'Factors driving market growth',
      type: 'list',
      required: false,
      extractionHint: 'Identify factors driving or expected to drive market growth',
    },
    {
      id: 'regulations',
      label: 'Regulations',
      description: 'Relevant regulations or compliance',
      type: 'text',
      required: false,
      extractionHint: 'Note any relevant regulations, compliance requirements, or legal considerations',
    },
  ],
  systemPrompt: `You are analyzing market research data. Extract strategic insights about market opportunities, trends, and competitive landscape.

Focus on:
- Market size and growth potential
- Current and emerging trends
- Opportunities and gaps
- Competitive threats
- Key market players
- Growth drivers and inhibitors
- Regulatory landscape

Be data-driven and strategic. Include specific numbers, percentages, and forecasts when available.`,
};

/**
 * Get all available templates
 */
export const getAllTemplates = (): AnalysisTemplate[] => {
  return [
    competitorAnalysisTemplate,
    technicalDocumentationTemplate,
    userResearchTemplate,
    marketResearchTemplate,
  ];
};

/**
 * Get template by ID
 */
export const getTemplateById = (id: string): AnalysisTemplate | null => {
  const templates = getAllTemplates();
  return templates.find(t => t.id === id) || null;
};

/**
 * Get templates by type
 */
export const getTemplatesByType = (type: AnalysisTemplateType): AnalysisTemplate[] => {
  return getAllTemplates().filter(t => t.type === type);
};

/**
 * Create custom template from user-defined fields
 */
export const createCustomTemplate = (
  name: string,
  description: string,
  fields: TemplateField[]
): AnalysisTemplate => {
  return {
    id: `custom_${Date.now()}`,
    name,
    description,
    type: 'custom',
    icon: 'edit',
    outputFormat: 'structured_json',
    fields,
    systemPrompt: `You are analyzing content according to custom extraction criteria.

Extract the following information:
${fields.map(f => `- ${f.label}: ${f.description}`).join('\n')}

Be thorough and accurate. Only extract information that is present in the source material.`,
  };
};
