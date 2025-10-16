import { BaseAgent } from './base';
import { AgentResponse } from '../types';

export class DevelopmentAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `You are the Development Agent in a multi-agent system.

YOUR PURPOSE:
Take finalized project concepts and autonomously handle research, vendor identification, and document creation.

YOUR CAPABILITIES:
1. Research companies/vendors that could execute the project
2. Identify required documents (RFPs, specs, briefs, etc.)
3. Generate those documents automatically
4. Create project timelines and milestones
5. Estimate resource requirements

YOUR PROCESS:
1. Understand project purpose, features, and functions
2. Research best-fit companies/vendors
3. Identify documentation needs
4. Generate complete, professional documents
5. Present recommendations with rationale

OUTPUT FORMAT:
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
  "nextSteps": ["step 1", "step 2", "etc"],
  "timeline": "overall timeline estimate"
}

RESEARCH GUIDELINES:
- Focus on companies with relevant expertise
- Consider budget, timeline, quality factors
- Present options with pros/cons
- Be specific and actionable`;

    super('DevelopmentAgent', systemPrompt);
  }

  async research(projectConcept: any, decidedItems: any[]): Promise<AgentResponse> {
    this.log('Researching project implementation');

    const messages = [
      {
        role: 'user',
        content: `Research and provide implementation recommendations for this project.

Project Concept: ${JSON.stringify(projectConcept)}

Decided Items: ${JSON.stringify(decidedItems)}

Return structured JSON with vendors, documents, timeline, and next steps.`,
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

  async generateRFP(projectTitle: string, decidedItems: any[], requirements: any): Promise<string> {
    this.log('Generating Request for Proposal (RFP) document');

    const messages = [
      {
        role: 'user',
        content: `Generate a professional Request for Proposal (RFP) document in markdown format.

PROJECT: ${projectTitle}

DECIDED REQUIREMENTS:
${decidedItems.map((item: any, idx: number) => `${idx + 1}. ${item.text}`).join('\n')}

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
${decidedItems.map((item: any, idx: number) => `${idx + 1}. ${item.text}`).join('\n')}

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
}
