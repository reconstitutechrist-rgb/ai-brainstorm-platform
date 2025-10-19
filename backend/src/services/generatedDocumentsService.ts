import { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { EmbeddingService } from './embeddingService';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface GeneratedDocument {
  id: string;
  project_id: string;
  document_type: 'project_brief' | 'decision_log' | 'rejection_log' | 'technical_specs' | 'project_establishment' | 'rfp' | 'implementation_plan' | 'vendor_comparison' | 'next_steps' | 'open_questions' | 'risk_assessment';
  title: string;
  content: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  content: string;
  title: string;
  change_summary?: string;
  change_reason?: string;
  diff_from_previous?: string;
  created_by?: string;
  created_at: string;
}

export interface VersionDiff {
  from_version: number;
  to_version: number;
  from_content: string;
  to_content: string;
  from_title: string;
  to_title: string;
  changes: DiffChange[];
}

export interface DiffChange {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface DocumentRecommendation {
  document_type: GeneratedDocument['document_type'];
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimated_value: string;
}

export interface QualityScore {
  overall_score: number; // 0-100
  completeness: number; // 0-100
  consistency: number; // 0-100
  citation_coverage: number; // 0-100
  readability: number; // 0-100
  confidence: number; // 0-100
  issues: string[];
  suggestions: string[];
}

export class GeneratedDocumentsService {
  private embeddingService: EmbeddingService;

  constructor(private supabase: SupabaseClient) {
    this.embeddingService = new EmbeddingService(supabase);
  }

  /**
   * Get all generated documents for a project
   */
  async getByProject(projectId: string): Promise<GeneratedDocument[]> {
    const { data, error } = await this.supabase
      .from('generated_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('document_type', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch generated documents: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific generated document by ID
   */
  async getById(documentId: string): Promise<GeneratedDocument | null> {
    const { data, error } = await this.supabase
      .from('generated_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch generated document: ${error.message}`);
    }

    return data;
  }

  /**
   * Generate or regenerate all documents for a project
   */
  async generateDocuments(projectId: string): Promise<GeneratedDocument[]> {
    // Fetch project data (items are stored in JSONB column, not separate table)
    const { data: project, error: projectError } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to fetch project: ${projectError?.message}`);
    }

    // First, ensure all messages have embeddings
    console.log('Generating missing embeddings for project messages...');
    try {
      await this.embeddingService.generateMissingEmbeddings(projectId);
    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      // Continue anyway - we'll fall back to regular message fetching
    }

    // Fetch uploaded documents for context
    const { data: uploadedDocs } = await this.supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    const baseContext = {
      project,
      items: project.items || [],
      uploadedDocuments: uploadedDocs || [],
    };

    // Generate all document types
    const documentTypes: Array<GeneratedDocument['document_type']> = [
      'project_brief',
      'decision_log',
      'rejection_log',
      'technical_specs',
      'project_establishment',
      'next_steps',
      'open_questions',
      'risk_assessment',
    ];

    const generatedDocs: GeneratedDocument[] = [];

    for (const docType of documentTypes) {
      const doc = await this.generateSingleDocument(projectId, docType, baseContext);
      generatedDocs.push(doc);
    }

    return generatedDocs;
  }

  /**
   * Generate a single document of a specific type
   */
  private async generateSingleDocument(
    projectId: string,
    documentType: GeneratedDocument['document_type'],
    baseContext: any
  ): Promise<GeneratedDocument> {
    // Use semantic search to find relevant messages for this document type
    let relevantMessages: any[] = [];
    try {
      const semanticMessages = await this.embeddingService.findRelevantMessagesForDocument(
        documentType,
        projectId,
        50 // Get top 50 most relevant messages
      );
      relevantMessages = semanticMessages;
      console.log(`Found ${relevantMessages.length} semantically relevant messages for ${documentType}`);
    } catch (error) {
      console.error('Semantic search failed, falling back to recent messages:', error);
      // Fallback: get recent messages
      const { data: recentMessages } = await this.supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);
      relevantMessages = recentMessages || [];
    }

    // Build context with semantically relevant messages
    const context = {
      ...baseContext,
      messages: relevantMessages,
    };

    const prompt = this.getPromptForDocumentType(documentType, context);

    // Call Claude API to generate the document
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';
    const title = this.getTitleForDocumentType(documentType, context.project.title);

    // Upsert the document (insert or update if exists)
    const { data, error } = await this.supabase
      .from('generated_documents')
      .upsert(
        {
          project_id: projectId,
          document_type: documentType,
          title,
          content,
        },
        {
          onConflict: 'project_id,document_type',
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save generated document: ${error.message}`);
    }

    return data;
  }

  /**
   * Get the appropriate prompt for each document type
   */
  private getPromptForDocumentType(
    documentType: GeneratedDocument['document_type'],
    context: any
  ): string {
    const { project, items, messages, uploadedDocuments } = context;

    const decidedItems = items.filter((i: any) => i.state === 'decided');
    const rejectedItems = items.filter((i: any) => i.state === 'rejected');
    const exploringItems = items.filter((i: any) => i.state === 'exploring');

    // Build uploaded documents summary
    const uploadedDocsSummary = uploadedDocuments && uploadedDocuments.length > 0
      ? uploadedDocuments.map((doc: any) =>
          `- ${doc.filename} (${doc.file_type || 'unknown type'})${doc.description ? ': ' + doc.description : ''}`
        ).join('\n')
      : 'No documents uploaded yet';

    const baseContext = `
Project: ${project.title}
Description: ${project.description || 'No description provided'}

Uploaded Project Documents (${uploadedDocuments?.length || 0}):
${uploadedDocsSummary}

Decided Items (${decidedItems.length}):
${decidedItems.map((i: any, idx: number) => `${idx + 1}. ${i.text}`).join('\n') || 'None yet'}

Items Being Explored (${exploringItems.length}):
${exploringItems.map((i: any, idx: number) => `${idx + 1}. ${i.text}`).join('\n') || 'None yet'}

Rejected Items (${rejectedItems.length}):
${rejectedItems.map((i: any, idx: number) => `${idx + 1}. ${i.text}`).join('\n') || 'None yet'}

Recent Conversation Context:
${messages.slice(-10).map((m: any) => `${m.role}: ${m.content}`).join('\n\n') || 'No conversation history yet'}
`;

    switch (documentType) {
      case 'project_brief':
        return `${baseContext}

Generate a comprehensive PROJECT BRIEF document in markdown format. Include:
- Executive summary
- Project goals and objectives
- Current decisions made
- Key features and requirements

Write this as a professional, well-structured document that could be shared with stakeholders. DO NOT include next steps, open questions, or risk assessments - those are tracked in separate documents.`;

      case 'decision_log':
        return `${baseContext}

Generate a DECISION LOG document in markdown format. For each decided item:
- List the decision clearly
- Include when it was decided (if citation data available)
- Explain the reasoning or user quote that led to the decision
- Note any alternatives that were considered

Format as a clean, chronological log of all project decisions.`;

      case 'rejection_log':
        return `${baseContext}

Generate a REJECTION LOG document in markdown format. For each rejected item:
- State what was rejected
- Explain why it was rejected
- Note any alternatives or lessons learned

This document helps track what the user explicitly does NOT want, which is just as important as what they do want.`;

      case 'technical_specs':
        return `${baseContext}

Generate a TECHNICAL SPECIFICATIONS document in markdown format. Include:
- Technical requirements based on decisions
- Architecture considerations
- Technology stack suggestions
- Implementation details
- Technical constraints and considerations
${uploadedDocuments && uploadedDocuments.length > 0 ? '- Reference any uploaded documents that contain technical requirements or specifications' : ''}

Write this for developers who will implement the project.`;

      case 'project_establishment':
        return `${baseContext}

Generate a PROJECT ESTABLISHMENT document in markdown format. This document captures what the user has ESTABLISHED and DEFINED about the project. Include:
- **Project Definition**: Core purpose, vision, and what the user wants to build
- **User Requirements**: What the user has explicitly stated they need
- **Project Goals**: Objectives and success criteria the user has established
- **Constraints & Boundaries**: Limitations, restrictions, or boundaries the user has set
- **User Preferences**: Specific preferences, style choices, or approaches the user wants
- **Project Context**: Background information, target audience, use cases the user has defined
- **Established Facts**: Key information about the project that the user has confirmed
${uploadedDocuments && uploadedDocuments.length > 0 ? '- Reference any uploaded documents that contain project requirements or definitions' : ''}

This document is the foundation - the "source of truth" for what the user wants their project to be. Focus on capturing user-established definitions, not suggestions or technical details.`;

      case 'rfp':
        return `${baseContext}

Generate a professional REQUEST FOR PROPOSAL (RFP) document in markdown format. This document should be ready to send to potential vendors. Include:

# Request for Proposal: ${project.title}

## 1. Project Overview
- Executive summary and project goals

## 2. Scope of Work
- Detailed requirements based on decided items
- Expected deliverables

## 3. Technical Requirements
- Technical specifications from decided items
${uploadedDocuments && uploadedDocuments.length > 0 ? '- Reference technical requirements from uploaded documents' : ''}

## 4. Timeline
- Expected project duration and key milestones

## 5. Budget
- Budget range (if discussed in decisions)

## 6. Vendor Qualifications
- Required experience, skills, and portfolio

## 7. Submission Requirements
- How to respond, what to include in proposal

## 8. Evaluation Criteria
- How proposals will be evaluated

## 9. Terms and Conditions
- Contract terms, payment structure, etc.

Write this as a comprehensive, professional RFP ready to send to vendors.`;

      case 'implementation_plan':
        return `${baseContext}

Generate a detailed IMPLEMENTATION PLAN document in markdown format. Include:

# Implementation Plan: ${project.title}

## 1. Executive Summary
- Overview of implementation approach

## 2. Project Phases
- Break down into phases with timelines
- Phase 1: Discovery & Planning
- Phase 2: Design
- Phase 3: Development
- Phase 4: Testing & QA
- Phase 5: Deployment & Launch

## 3. Milestones and Deliverables
- Key milestones with completion dates
- Deliverables for each phase

## 4. Resource Requirements
- Team composition needed
- Tools and technologies required
- Infrastructure needs

## 5. Budget Breakdown
- Cost estimates by phase
- Resource allocation

## 6. Risk Assessment
- Potential risks and mitigation strategies

## 7. Success Criteria
- How to measure successful implementation
- KPIs and metrics

## 8. Next Steps
- Immediate actions to take
- Dependencies and blockers

Write this as a professional, actionable implementation plan.`;

      case 'vendor_comparison':
        return `${baseContext}

Generate a VENDOR COMPARISON document in markdown format. Based on project requirements, research and compare potential vendors. Include:

# Vendor Comparison: ${project.title}

## Overview
- Summary of vendor evaluation process
- Key criteria used for comparison

## Recommended Vendor Types
Based on the decided requirements, identify what types of vendors/companies would be best suited:
- Development agencies vs. freelancers
- Specialized firms vs. generalists
- Required expertise areas

## Comparison Matrix
Create a comparison table with:
- Vendor categories/types
- Typical cost ranges
- Typical timelines
- Pros and cons
- Best for (use cases)

## Evaluation Criteria
How to evaluate vendors:
- Technical expertise match
- Portfolio/case studies
- Cost structure
- Timeline capabilities
- Communication and support

## Recommendations
- Which vendor type(s) to pursue
- Why they're the best fit
- What to look for in proposals

## Next Steps
- How to find and vet vendors
- What questions to ask
- How to request proposals

Write this as an objective, helpful guide for vendor selection.`;

      case 'next_steps':
        return `${baseContext}

Generate a NEXT STEPS document in markdown format. Based on all project decisions, exploring ideas, and conversation history, create a clear action plan. Include:

# Next Steps: ${project.title}

## Immediate Actions (Next 1-2 weeks)
- Prioritized list of immediate tasks to move the project forward
- Who should do each task (if discussed)
- Expected timeline for each

## Short-term Actions (Next 1-3 months)
- Key milestones and deliverables
- Dependencies between tasks
- Resource requirements

## Long-term Planning (3+ months)
- Future considerations
- Strategic initiatives
- Scaling considerations

## Blockers & Dependencies
- What needs to be resolved before proceeding
- External dependencies
- Decisions still needed

## Resources Needed
- Team members or expertise required
- Tools or technology needed
- Budget considerations (if discussed)

Write this as an actionable, prioritized task list that helps move the project forward.`;

      case 'open_questions':
        return `${baseContext}

Generate an OPEN QUESTIONS document in markdown format. Based on the conversation and project context, identify questions that still need answers. Include:

# Open Questions: ${project.title}

## Critical Questions (Must Answer Before Proceeding)
List questions that are blockers to progress:
- Questions about core requirements
- Unresolved technical decisions
- Budget or resource questions that impact planning

## Important Questions (Should Answer Soon)
Questions that would significantly improve the project:
- Feature scope clarifications
- User experience questions
- Integration or compatibility questions

## Future Considerations (Nice to Explore)
Questions for future phases:
- Scaling questions
- Enhancement opportunities
- Long-term strategy questions

For each question, include:
- The question itself
- Why it matters (context and impact)
- Who should answer it (if known)
- Any dependencies or related questions

Write this to help stakeholders identify what decisions still need to be made.`;

      case 'risk_assessment':
        return `${baseContext}

Generate a RISK ASSESSMENT document in markdown format. Based on project decisions and requirements, identify potential risks. Include:

# Risk Assessment: ${project.title}

## High-Priority Risks
Risks that could seriously impact project success:
- **Risk Description**: What could go wrong
- **Impact**: What would happen if this risk materialized
- **Likelihood**: How likely is this risk (High/Medium/Low)
- **Mitigation Strategy**: How to prevent or minimize this risk
- **Contingency Plan**: What to do if the risk occurs

## Medium-Priority Risks
Risks that could cause delays or issues:
- Same format as above

## Low-Priority Risks
Minor risks worth monitoring:
- Same format as above

## Technical Risks
- Technology choices and compatibility issues
- Performance or scalability concerns
- Security or compliance risks

## Business Risks
- Budget overruns
- Timeline delays
- Resource availability
- Market or competitive risks

## Mitigation Summary
- Key actions to reduce overall risk
- Monitoring and review process
- Risk ownership and accountability

Write this as a professional risk assessment that helps stakeholders make informed decisions.`;

      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }
  }

  /**
   * Get the appropriate title for each document type
   */
  private getTitleForDocumentType(
    documentType: GeneratedDocument['document_type'],
    projectTitle: string
  ): string {
    switch (documentType) {
      case 'project_brief':
        return `${projectTitle} - Project Brief`;
      case 'decision_log':
        return `${projectTitle} - Decision Log`;
      case 'rejection_log':
        return `${projectTitle} - Rejection Log`;
      case 'technical_specs':
        return `${projectTitle} - Technical Specifications`;
      case 'project_establishment':
        return `${projectTitle} - Project Establishment`;
      case 'rfp':
        return `${projectTitle} - Request for Proposal`;
      case 'implementation_plan':
        return `${projectTitle} - Implementation Plan`;
      case 'vendor_comparison':
        return `${projectTitle} - Vendor Comparison`;
      case 'next_steps':
        return `${projectTitle} - Next Steps`;
      case 'open_questions':
        return `${projectTitle} - Open Questions`;
      case 'risk_assessment':
        return `${projectTitle} - Risk Assessment`;
      default:
        return `${projectTitle} - Document`;
    }
  }

  /**
   * Delete a generated document
   */
  async delete(documentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('generated_documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      throw new Error(`Failed to delete generated document: ${error.message}`);
    }
  }

  // ============================================
  // VERSION MANAGEMENT METHODS
  // ============================================

  /**
   * Get version history for a document
   */
  async getVersionHistory(documentId: string): Promise<DocumentVersion[]> {
    const { data, error } = await this.supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch version history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific version of a document
   */
  async getVersion(documentId: string, versionNumber: number): Promise<DocumentVersion | null> {
    const { data, error } = await this.supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .eq('version_number', versionNumber)
      .single();

    if (error) {
      throw new Error(`Failed to fetch version: ${error.message}`);
    }

    return data;
  }

  /**
   * Generate a diff between two versions
   */
  async getVersionDiff(documentId: string, fromVersion: number, toVersion: number): Promise<VersionDiff> {
    // Fetch both versions
    const [from, to] = await Promise.all([
      this.getVersion(documentId, fromVersion),
      this.getVersion(documentId, toVersion)
    ]);

    if (!from || !to) {
      throw new Error('One or both versions not found');
    }

    // Generate diff using simple line-by-line comparison
    const changes = this.computeTextDiff(from.content, to.content);

    return {
      from_version: fromVersion,
      to_version: toVersion,
      from_content: from.content,
      to_content: to.content,
      from_title: from.title,
      to_title: to.title,
      changes
    };
  }

  /**
   * Simple diff algorithm (line-by-line comparison)
   */
  private computeTextDiff(oldText: string, newText: string): DiffChange[] {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const changes: DiffChange[] = [];

    // Simple line matching algorithm
    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      if (oldIndex < oldLines.length && newIndex < newLines.length) {
        if (oldLines[oldIndex] === newLines[newIndex]) {
          changes.push({ type: 'unchanged', value: oldLines[oldIndex] });
          oldIndex++;
          newIndex++;
        } else {
          // Check if line was removed
          if (!newLines.includes(oldLines[oldIndex])) {
            changes.push({ type: 'removed', value: oldLines[oldIndex] });
            oldIndex++;
          }
          // Check if line was added
          else if (!oldLines.includes(newLines[newIndex])) {
            changes.push({ type: 'added', value: newLines[newIndex] });
            newIndex++;
          } else {
            // Line might have moved or changed
            changes.push({ type: 'removed', value: oldLines[oldIndex] });
            changes.push({ type: 'added', value: newLines[newIndex] });
            oldIndex++;
            newIndex++;
          }
        }
      } else if (oldIndex < oldLines.length) {
        changes.push({ type: 'removed', value: oldLines[oldIndex] });
        oldIndex++;
      } else {
        changes.push({ type: 'added', value: newLines[newIndex] });
        newIndex++;
      }
    }

    return changes;
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(documentId: string, versionNumber: number, userId?: string): Promise<GeneratedDocument> {
    // Get the version to rollback to
    const version = await this.getVersion(documentId, versionNumber);
    if (!version) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    // Update the current document with the old version's content
    const { data, error } = await this.supabase
      .from('generated_documents')
      .update({
        title: version.title,
        content: version.content,
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to rollback document: ${error.message}`);
    }

    // Optionally add a note in the version history about the rollback
    await this.addChangeNote(documentId, data.version, `Rolled back to version ${versionNumber}`, userId);

    return data;
  }

  /**
   * Generate an AI summary of changes between versions
   */
  async generateChangeSummary(documentId: string, fromVersion: number, toVersion: number): Promise<string> {
    const diff = await this.getVersionDiff(documentId, fromVersion, toVersion);

    // Count changes
    const added = diff.changes.filter(c => c.type === 'added').length;
    const removed = diff.changes.filter(c => c.type === 'removed').length;

    // Use Claude to generate a human-readable summary
    const prompt = `Analyze these document changes and provide a concise summary (2-3 sentences):

Old Title: ${diff.from_title}
New Title: ${diff.to_title}

Changes:
- ${added} lines added
- ${removed} lines removed

Old Content Preview:
${diff.from_content.substring(0, 500)}...

New Content Preview:
${diff.to_content.substring(0, 500)}...

Provide a brief, professional summary of what changed and why it might matter.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = message.content[0].type === 'text' ? message.content[0].text : '';

    // Store the summary in the version
    await this.supabase
      .from('document_versions')
      .update({ change_summary: summary })
      .eq('document_id', documentId)
      .eq('version_number', toVersion);

    return summary;
  }

  /**
   * Add a change note to a version
   */
  private async addChangeNote(documentId: string, versionNumber: number, note: string, userId?: string): Promise<void> {
    await this.supabase
      .from('document_versions')
      .update({
        change_reason: note,
        created_by: userId
      })
      .eq('document_id', documentId)
      .eq('version_number', versionNumber);
  }

  /**
   * Get document recommendations based on project state
   */
  async getRecommendations(projectId: string): Promise<DocumentRecommendation[]> {
    // Fetch project data
    const { data: project, error: projectError } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to fetch project: ${projectError?.message}`);
    }

    // Fetch existing documents
    const existingDocs = await this.getByProject(projectId);
    const existingTypes = new Set(existingDocs.map(d => d.document_type));

    // Fetch recent messages
    const { data: messages } = await this.supabase
      .from('conversation_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Analyze project state
    const items = project.items || [];
    const decidedCount = items.filter((i: any) => i.state === 'decided').length;
    const exploringCount = items.filter((i: any) => i.state === 'exploring').length;
    const hasDocuments = items.some((i: any) => i.type === 'document');
    const messageCount = messages?.length || 0;

    // Build analysis prompt
    const prompt = `Analyze this project and recommend which documents to generate next.

Project: ${project.title}
Status: ${project.status}
Items: ${items.length} total (${decidedCount} decided, ${exploringCount} exploring)
Messages: ${messageCount}
Has attached documents: ${hasDocuments}

Existing documents: ${existingTypes.size > 0 ? Array.from(existingTypes).join(', ') : 'None'}

Available document types:
1. project_brief - Overview and scope
2. decision_log - All decisions with rationale
3. rejection_log - Rejected ideas and why
4. technical_specs - Technical requirements and architecture
5. project_establishment - Charter and governance
6. rfp - Request for Proposal
7. implementation_plan - Step-by-step execution plan
8. vendor_comparison - Vendor evaluation matrix
9. next_steps - Immediate action items
10. open_questions - Unresolved questions
11. risk_assessment - Risks and mitigation strategies

Recent activity snippet:
${messages?.slice(0, 5).map((m: any) => `${m.role}: ${m.content.substring(0, 100)}...`).join('\n')}

Recommend up to 3 documents that would be most valuable right now. For each, provide:
1. Document type (exact name from list above)
2. Priority (high/medium/low)
3. Reason (one sentence)
4. Estimated value (one sentence)

Format as JSON array:
[
  {
    "document_type": "project_brief",
    "priority": "high",
    "reason": "Project has many decisions but no overview document",
    "estimated_value": "Provides stakeholders with quick project understanding"
  }
]`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse recommendations from AI response');
    }

    const recommendations: DocumentRecommendation[] = JSON.parse(jsonMatch[0]);

    // Filter out already existing documents
    return recommendations.filter(rec => !existingTypes.has(rec.document_type));
  }

  /**
   * Calculate quality score for a document
   */
  async calculateQualityScore(documentId: string): Promise<QualityScore> {
    const document = await this.getById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Fetch project to get items with citations
    const { data: project } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', document.project_id)
      .single();

    const items = project?.items || [];
    const itemsWithCitations = items.filter((i: any) => i.citation);

    // Basic metrics
    const wordCount = document.content.split(/\s+/).length;
    const sectionCount = (document.content.match(/^#{1,3}\s/gm) || []).length;
    const hasIntroduction = /^#\s.*introduction/i.test(document.content);
    const hasConclusion = /^#\s.*(conclusion|summary|next steps)/i.test(document.content);

    // Citation metrics
    const citationMatches = document.content.match(/\[.*?\]\(.*?\)/g) || [];
    const citationCount = citationMatches.length;
    const citationDensity = wordCount > 0 ? (citationCount / wordCount) * 100 : 0;

    // AI-powered quality analysis
    const prompt = `Analyze this document for quality and provide scores:

Title: ${document.title}
Type: ${document.document_type}
Word Count: ${wordCount}
Sections: ${sectionCount}
Citations: ${citationCount}

Content Preview:
${document.content.substring(0, 1000)}...

Provide quality assessment with scores (0-100):
1. Completeness - Has all expected sections for this document type
2. Consistency - Consistent terminology and formatting
3. Citation Coverage - Adequate support for claims
4. Readability - Clear structure and language
5. Confidence - Overall reliability and thoroughness

Also identify 2-3 specific issues and 2-3 improvement suggestions.

Format as JSON:
{
  "completeness": 85,
  "consistency": 90,
  "citation_coverage": 75,
  "readability": 80,
  "confidence": 82,
  "issues": ["Missing risk analysis section", "Some technical terms undefined"],
  "suggestions": ["Add glossary", "Include timeline", "Add more data visualizations"]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to parse quality scores from AI response');
    }

    const aiScores = JSON.parse(jsonMatch[0]);

    // Calculate overall score as weighted average
    const overall_score = Math.round(
      (aiScores.completeness * 0.25) +
      (aiScores.consistency * 0.15) +
      (aiScores.citation_coverage * 0.20) +
      (aiScores.readability * 0.20) +
      (aiScores.confidence * 0.20)
    );

    return {
      overall_score,
      completeness: aiScores.completeness,
      consistency: aiScores.consistency,
      citation_coverage: aiScores.citation_coverage,
      readability: aiScores.readability,
      confidence: aiScores.confidence,
      issues: aiScores.issues || [],
      suggestions: aiScores.suggestions || [],
    };
  }
}
