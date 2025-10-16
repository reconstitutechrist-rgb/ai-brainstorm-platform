import { BaseAgent } from './base';
import { AgentResponse } from '../types';

/**
 * StrategicPlanner Agent
 *
 * Consolidates: Translation + Development + Prioritization
 *
 * Responsibilities:
 * - Translate vision → technical specifications
 * - Research vendors and solutions
 * - Generate RFP and implementation documents
 * - Prioritize decisions and map dependencies
 * - Create project timelines and critical paths
 */
export class StrategicPlannerAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Strategic Planner - unified planning, translation, and execution strategy.

YOUR PURPOSE:
Transform vision into actionable plans with vendor research, document generation, and strategic prioritization.

CORE CAPABILITIES:

1. VISION TRANSLATION
   - Convert user's creative vision → technical specifications
   - Translate user needs → feature requirements
   - Transform concepts → implementation details
   - Define goals → measurable criteria
   - Maintain traceability to original vision

2. VENDOR RESEARCH & DEVELOPMENT
   - Research companies/vendors for project execution
   - Identify best-fit partners based on expertise
   - Evaluate budget, timeline, quality factors
   - Present options with pros/cons analysis
   - Generate professional documents (RFPs, specs, briefs)

3. PRIORITIZATION & SEQUENCING
   - Map dependencies between items
   - Identify critical path for project completion
   - Suggest optimal decision sequence
   - Flag blockers preventing progress
   - Find quick wins vs. complex tasks

OUTPUT FORMATS:

For translate() mode - Technical Specifications:
# Technical Specifications: [Project Title]

## Executive Summary
[Vision in business terms]

## Technical Requirements
[Specs and constraints based on decided items]

## Feature Breakdown
[What needs to be built, organized by category]

## Success Criteria
[Measurable outcomes to validate success]

## Implementation Notes
[Key considerations for development]

For research() mode - Vendor Recommendations (JSON):
{
  "vendors": [
    {
      "name": "Company Name",
      "why": "Reasoning for recommendation",
      "pros": ["list", "of", "pros"],
      "cons": ["list", "of", "cons"],
      "estimatedCost": "range",
      "timeline": "estimated timeline"
    }
  ],
  "requiredDocuments": ["RFP", "Technical Specs", "etc"],
  "nextSteps": ["step 1", "step 2"],
  "timeline": "overall timeline estimate"
}

For prioritize() mode - Priority Analysis (JSON):
{
  "criticalPath": ["item1", "item2", "item3"],
  "nextRecommended": "most important next step",
  "blockers": ["items blocking progress"],
  "quickWins": ["easy items to knock out"],
  "reasoning": "explanation of prioritization"
}

PROFESSIONAL STANDARDS:
- Clear connection to user's original words
- Professional but accessible language
- Actionable and specific requirements
- Objective vendor evaluations
- Strategic thinking with dependencies
- Complete, ready-to-use documents`;

    super('StrategicPlannerAgent', systemPrompt);
  }

  /**
   * Translate vision to technical specifications (previously TranslationAgent)
   */
  async translate(decidedItems: any[], projectContext: any): Promise<AgentResponse> {
    this.log('Translating vision to technical specifications');

    const messages = [
      {
        role: 'user',
        content: `Translate decided items into comprehensive technical specifications.

DECIDED ITEMS:
${decidedItems.map((item: any, idx: number) => `${idx + 1}. ${item.text || item}`).join('\n')}

PROJECT CONTEXT:
${JSON.stringify(projectContext, null, 2)}

Create a professional technical specification document in markdown format that includes:
- Executive Summary
- Technical Requirements
- Feature Breakdown
- Success Criteria
- Implementation Notes

Maintain clear traceability to the user's original vision.`,
      },
    ];

    const response = await this.callClaude(messages, 2000);

    return {
      agent: this.name,
      message: response,
      showToUser: true,
      metadata: {
        translationComplete: true,
        documentType: 'technical_specifications',
      },
    };
  }

  /**
   * Research project implementation with vendor recommendations (previously DevelopmentAgent)
   */
  async research(projectConcept: any, decidedItems: any[]): Promise<AgentResponse> {
    this.log('Researching project implementation and vendor options');

    const messages = [
      {
        role: 'user',
        content: `Research and provide implementation recommendations for this project.

PROJECT CONCEPT:
${JSON.stringify(projectConcept, null, 2)}

DECIDED ITEMS:
${decidedItems.map((item: any, idx: number) => `${idx + 1}. ${item.text || item}`).join('\n')}

Provide structured research including:
1. Recommended vendors with expertise in this domain
2. Pros/cons for each vendor
3. Estimated costs and timelines
4. Required documents to proceed
5. Strategic next steps

Return as structured JSON matching the research() format in system prompt.`,
      },
    ];

    const response = await this.callClaude(messages, 2000);

    return {
      agent: this.name,
      message: response,
      showToUser: true,
      metadata: {
        researchCompleted: true,
        documentGeneration: 'ready',
      },
    };
  }

  /**
   * Generate Request for Proposal (RFP) document
   */
  async generateRFP(projectTitle: string, decidedItems: any[], requirements: any): Promise<string> {
    this.log('Generating Request for Proposal (RFP) document');

    const messages = [
      {
        role: 'user',
        content: `Generate a professional Request for Proposal (RFP) document in markdown format.

PROJECT: ${projectTitle}

DECIDED REQUIREMENTS:
${decidedItems.map((item: any, idx: number) => `${idx + 1}. ${item.text || item}`).join('\n')}

ADDITIONAL REQUIREMENTS:
${JSON.stringify(requirements, null, 2)}

Create a comprehensive RFP that includes:
# Request for Proposal: ${projectTitle}

## 1. Project Overview
[Executive summary and project goals]

## 2. Scope of Work
[Detailed requirements and deliverables]

## 3. Technical Requirements
[Technical specifications based on decided items]

## 4. Timeline
[Expected project timeline and milestones]

## 5. Budget
[Budget range if available]

## 6. Vendor Qualifications
[Required experience, skills, portfolio requirements]

## 7. Submission Requirements
[How vendors should respond, what to include]

## 8. Evaluation Criteria
[How proposals will be evaluated]

## 9. Terms and Conditions
[Contract terms, payment structure, etc.]

Write this as a professional, comprehensive RFP ready to send to vendors.`,
      },
    ];

    const response = await this.callClaude(messages, 3000);
    return response;
  }

  /**
   * Generate Implementation Plan document
   */
  async generateImplementationPlan(
    projectTitle: string,
    decidedItems: any[],
    vendorRecommendations: any
  ): Promise<string> {
    this.log('Generating Implementation Plan document');

    const messages = [
      {
        role: 'user',
        content: `Generate a detailed Implementation Plan document in markdown format.

PROJECT: ${projectTitle}

DECIDED ITEMS:
${decidedItems.map((item: any, idx: number) => `${idx + 1}. ${item.text || item}`).join('\n')}

VENDOR RECOMMENDATIONS:
${JSON.stringify(vendorRecommendations, null, 2)}

Create a comprehensive implementation plan that includes:
# Implementation Plan: ${projectTitle}

## 1. Executive Summary
[Overview of the implementation approach]

## 2. Project Phases
[Break down into phases with timelines]

## 3. Milestones and Deliverables
[Key milestones with expected completion dates]

## 4. Resource Requirements
[Team, tools, technologies needed]

## 5. Budget Breakdown
[Cost estimates by phase]

## 6. Risk Assessment
[Potential risks and mitigation strategies]

## 7. Success Criteria
[How to measure successful implementation]

## 8. Next Steps
[Immediate actions to take]

Write this as a professional, actionable implementation plan.`,
      },
    ];

    const response = await this.callClaude(messages, 3000);
    return response;
  }

  /**
   * Generate Vendor Comparison document
   */
  async generateVendorComparison(
    projectTitle: string,
    vendors: any[]
  ): Promise<string> {
    this.log('Generating Vendor Comparison document');

    const messages = [
      {
        role: 'user',
        content: `Generate a Vendor Comparison document in markdown format.

PROJECT: ${projectTitle}

VENDORS:
${JSON.stringify(vendors, null, 2)}

Create a professional comparison document that includes:
# Vendor Comparison: ${projectTitle}

## Overview
[Summary of vendor evaluation]

## Comparison Matrix
[Table comparing vendors across key criteria]

## Detailed Vendor Profiles
[In-depth look at each vendor with pros/cons]

## Recommendations
[Which vendor(s) to proceed with and why]

## Cost Analysis
[Comparison of pricing and value]

## Timeline Comparison
[How long each vendor estimates]

Write this as a professional, objective comparison to aid decision-making.`,
      },
    ];

    const response = await this.callClaude(messages, 2500);
    return response;
  }

  /**
   * Prioritize decisions and map dependencies (previously PrioritizationAgent)
   */
  async prioritize(projectState: any): Promise<AgentResponse> {
    this.log('Analyzing priorities and mapping dependencies');

    const messages = [
      {
        role: 'user',
        content: `Analyze priorities for this project state and provide strategic recommendations.

PROJECT STATE:
${JSON.stringify(projectState, null, 2)}

Analyze:
1. Dependencies - what blocks what
2. Urgency - time-sensitive items
3. Impact - high-value decisions
4. Complexity - quick wins vs. hard problems

Return ONLY valid JSON with:
- criticalPath: Array of items in sequence for project completion
- nextRecommended: Most important next step to take
- blockers: Items currently blocking progress
- quickWins: Easy items that can be completed quickly
- reasoning: Explanation of prioritization strategy`,
      },
    ];

    const response = await this.callClaude(messages, 800);
    let cleanResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const priorities = JSON.parse(cleanResponse);

    this.log(`Critical path identified: ${priorities.criticalPath?.length || 0} items`);

    return {
      agent: this.name,
      message: '', // Internal analysis - no user-facing message
      showToUser: false,
      metadata: priorities,
    };
  }

  /**
   * Comprehensive strategic planning - combines translation, research, and prioritization
   * Used for end-to-end project planning
   */
  async createComprehensivePlan(
    projectTitle: string,
    decidedItems: any[],
    projectContext: any
  ): Promise<AgentResponse> {
    this.log('Creating comprehensive strategic plan');

    // Step 1: Translate to technical specs
    const translationResult = await this.translate(decidedItems, projectContext);

    // Step 2: Research vendors and implementation
    const researchResult = await this.research({ title: projectTitle, ...projectContext }, decidedItems);

    // Step 3: Prioritize items
    const prioritizationResult = await this.prioritize({
      decided: decidedItems,
      projectContext,
    });

    // Combine all results
    const comprehensivePlan = `# Comprehensive Strategic Plan: ${projectTitle}

## Phase 1: Technical Specifications
${translationResult.message}

## Phase 2: Vendor Research & Recommendations
${researchResult.message}

## Phase 3: Prioritization & Critical Path
**Next Recommended Action:** ${prioritizationResult.metadata?.nextRecommended || 'Review specifications'}

**Critical Path:**
${(prioritizationResult.metadata?.criticalPath || []).map((item: string, idx: number) => `${idx + 1}. ${item}`).join('\n')}

**Quick Wins:**
${(prioritizationResult.metadata?.quickWins || []).map((item: string) => `- ${item}`).join('\n')}

**Current Blockers:**
${(prioritizationResult.metadata?.blockers || []).map((item: string) => `- ${item}`).join('\n') || '- None identified'}

---
*This comprehensive plan combines vision translation, vendor research, and strategic prioritization.*`;

    return {
      agent: this.name,
      message: comprehensivePlan,
      showToUser: true,
      metadata: {
        comprehensivePlan: true,
        translation: translationResult.metadata,
        research: researchResult.metadata,
        prioritization: prioritizationResult.metadata,
      },
    };
  }
}
