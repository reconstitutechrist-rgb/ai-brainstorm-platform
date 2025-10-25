import { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { ExtractedIdea } from './contextGroupingService';
import { GeneratedDocument } from './generatedDocumentsService';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface SessionDocuments {
  acceptedDoc: GeneratedDocument;
  rejectedDoc: GeneratedDocument;
  updatedDocs: GeneratedDocument[];
}

/**
 * Brainstorm Document Service
 *
 * Generates documents from completed brainstorm sessions:
 * - Accepted Ideas document
 * - Rejected Ideas document
 * - Appends to Decision/Rejection logs
 * - Regenerates relevant live documents
 */
export class BrainstormDocumentService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Generate all documents for completed session
   */
  async generateSessionDocuments(
    projectId: string,
    sessionId: string,
    sessionName: string,
    acceptedIdeas: ExtractedIdea[],
    rejectedIdeas: ExtractedIdea[]
  ): Promise<SessionDocuments> {
    console.log(`[BrainstormDocs] Generating documents for session ${sessionId}`);
    console.log(`[BrainstormDocs] ${acceptedIdeas.length} accepted, ${rejectedIdeas.length} rejected`);

    // 1. Create "Accepted Ideas" document
    const acceptedDoc = await this.createAcceptedDocument(
      projectId,
      sessionId,
      sessionName,
      acceptedIdeas
    );

    // 2. Create "Rejected Ideas" document
    const rejectedDoc = await this.createRejectedDocument(
      projectId,
      sessionId,
      sessionName,
      rejectedIdeas
    );

    // 3. Append to Decision Log
    if (acceptedIdeas.length > 0) {
      await this.appendToDecisionLog(projectId, sessionName, acceptedIdeas);
    }

    // 4. Append to Rejection Log
    if (rejectedIdeas.length > 0) {
      await this.appendToRejectionLog(projectId, sessionName, rejectedIdeas);
    }

    // 5. Regenerate all relevant live documents
    const updatedDocs = await this.regenerateLiveDocuments(
      projectId,
      acceptedIdeas,
      rejectedIdeas
    );

    console.log(`[BrainstormDocs] Created 2 new docs, updated ${updatedDocs.length} existing docs`);

    return { acceptedDoc, rejectedDoc, updatedDocs };
  }

  /**
   * Create Accepted Ideas document
   */
  private async createAcceptedDocument(
    projectId: string,
    sessionId: string,
    sessionName: string,
    ideas: ExtractedIdea[]
  ): Promise<GeneratedDocument> {
    const content = this.generateAcceptedDocumentContent(sessionName, ideas);

    const { data, error } = await this.supabase
      .from('generated_documents')
      .insert({
        project_id: projectId,
        document_type: 'decision_log',
        title: `${sessionName} - Accepted Ideas`,
        content,
        version: 1,
        source_type: 'brainstorm_session',
        source_id: sessionId,
        metadata: {
          ideaCount: ideas.length,
          sessionId,
          sessionName,
          type: 'accepted'
        }
      })
      .select()
      .single();

    if (error) {
      console.error('[BrainstormDocs] Error creating accepted document:', error);
      throw new Error(`Failed to create accepted document: ${error.message}`);
    }

    return data;
  }

  /**
   * Create Rejected Ideas document
   */
  private async createRejectedDocument(
    projectId: string,
    sessionId: string,
    sessionName: string,
    ideas: ExtractedIdea[]
  ): Promise<GeneratedDocument> {
    const content = this.generateRejectedDocumentContent(sessionName, ideas);

    const { data, error } = await this.supabase
      .from('generated_documents')
      .insert({
        project_id: projectId,
        document_type: 'rejection_log',
        title: `${sessionName} - Rejected Ideas`,
        content,
        version: 1,
        source_type: 'brainstorm_session',
        source_id: sessionId,
        metadata: {
          ideaCount: ideas.length,
          sessionId,
          sessionName,
          type: 'rejected'
        }
      })
      .select()
      .single();

    if (error) {
      console.error('[BrainstormDocs] Error creating rejected document:', error);
      throw new Error(`Failed to create rejected document: ${error.message}`);
    }

    return data;
  }

  /**
   * Generate markdown content for accepted ideas
   */
  private generateAcceptedDocumentContent(sessionName: string, ideas: ExtractedIdea[]): string {
    const date = new Date().toLocaleDateString();

    return `# ${sessionName} - Accepted Ideas

**Date:** ${date}
**Total Ideas Accepted:** ${ideas.length}
**Status:** These ideas have been accepted and added to the main project

---

## Summary

The following ${ideas.length} ideas were accepted during the brainstorm session and will be implemented as part of the project:

${ideas.map((idea, i) => `${i + 1}. **${idea.idea.title}**`).join('\n')}

---

## Detailed Breakdown

${ideas.map((idea, i) => `
### ${i + 1}. ${idea.idea.title}

**Description:**
${idea.idea.description}

**Reasoning:**
${idea.idea.reasoning}

**User Intent:**
${idea.idea.userIntent}

**Innovation Level:** ${idea.innovationLevel}

**Tags:** ${idea.tags.join(', ')}

**Source:** ${idea.source}

**Decision:** ✅ ACCEPTED - Added to project as "decided"

---
`).join('\n')}

## Next Steps

These accepted ideas have been:
- ✅ Added to the main project items list
- ✅ Recorded in the Decision Log
- ✅ Incorporated into live project documents (Project Brief, Technical Specs, etc.)

The team can now proceed with planning and implementation of these features.
`;
  }

  /**
   * Generate markdown content for rejected ideas
   */
  private generateRejectedDocumentContent(sessionName: string, ideas: ExtractedIdea[]): string {
    const date = new Date().toLocaleDateString();

    return `# ${sessionName} - Rejected Ideas

**Date:** ${date}
**Total Ideas Rejected:** ${ideas.length}
**Status:** These ideas were considered but ultimately rejected

---

## Summary

The following ${ideas.length} ideas were discussed during the brainstorm session but rejected:

${ideas.map((idea, i) => `${i + 1}. **${idea.idea.title}**`).join('\n')}

---

## Detailed Breakdown

${ideas.map((idea, i) => `
### ${i + 1}. ${idea.idea.title}

**Description:**
${idea.idea.description}

**Reasoning (for consideration):**
${idea.idea.reasoning}

**Innovation Level:** ${idea.innovationLevel}

**Tags:** ${idea.tags.join(', ')}

**Decision:** ❌ REJECTED

**Why Rejected:**
This idea was discussed but ultimately not chosen for the current project scope.

---
`).join('\n')}

## Notes

These rejected ideas are documented for future reference. They may be reconsidered:
- In future project phases
- For different use cases
- When project requirements change
- As inspiration for alternative approaches
`;
  }

  /**
   * Append accepted ideas to Decision Log
   */
  private async appendToDecisionLog(
    projectId: string,
    sessionName: string,
    acceptedIdeas: ExtractedIdea[]
  ): Promise<void> {
    // Find existing Decision Log
    const { data: existingDoc } = await this.supabase
      .from('generated_documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('document_type', 'decision_log')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!existingDoc) {
      console.log('[BrainstormDocs] No existing Decision Log found, skipping append');
      return;
    }

    // Generate new entries
    const newEntries = acceptedIdeas.map((idea, i) => `
### ${idea.idea.title}

**Date:** ${new Date().toLocaleDateString()}
**Source:** ${sessionName}
**Description:** ${idea.idea.description}
**Reasoning:** ${idea.idea.reasoning}
**Status:** Decided
`).join('\n\n');

    // Append to existing content
    const updatedContent = existingDoc.content + `\n\n---\n\n## From ${sessionName}\n\n${newEntries}`;

    // Update document
    const { error } = await this.supabase
      .from('generated_documents')
      .update({
        content: updatedContent,
        version: existingDoc.version + 1,
        updated_at: new Date().toISOString(),
        metadata: {
          ...existingDoc.metadata,
          lastBrainstormSession: sessionName,
          totalBrainstormIdeas: (existingDoc.metadata?.totalBrainstormIdeas || 0) + acceptedIdeas.length
        }
      })
      .eq('id', existingDoc.id);

    if (error) {
      console.error('[BrainstormDocs] Error appending to Decision Log:', error);
    } else {
      console.log(`[BrainstormDocs] Appended ${acceptedIdeas.length} entries to Decision Log`);
    }
  }

  /**
   * Append rejected ideas to Rejection Log
   */
  private async appendToRejectionLog(
    projectId: string,
    sessionName: string,
    rejectedIdeas: ExtractedIdea[]
  ): Promise<void> {
    // Find existing Rejection Log
    const { data: existingDoc } = await this.supabase
      .from('generated_documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('document_type', 'rejection_log')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!existingDoc) {
      console.log('[BrainstormDocs] No existing Rejection Log found, skipping append');
      return;
    }

    // Generate new entries
    const newEntries = rejectedIdeas.map((idea, i) => `
### ${idea.idea.title}

**Date:** ${new Date().toLocaleDateString()}
**Source:** ${sessionName}
**Description:** ${idea.idea.description}
**Reasoning:** ${idea.idea.reasoning}
**Status:** Rejected
`).join('\n\n');

    // Append to existing content
    const updatedContent = existingDoc.content + `\n\n---\n\n## From ${sessionName}\n\n${newEntries}`;

    // Update document
    const { error } = await this.supabase
      .from('generated_documents')
      .update({
        content: updatedContent,
        version: existingDoc.version + 1,
        updated_at: new Date().toISOString(),
        metadata: {
          ...existingDoc.metadata,
          lastBrainstormSession: sessionName,
          totalBrainstormRejections: (existingDoc.metadata?.totalBrainstormRejections || 0) + rejectedIdeas.length
        }
      })
      .eq('id', existingDoc.id);

    if (error) {
      console.error('[BrainstormDocs] Error appending to Rejection Log:', error);
    } else {
      console.log(`[BrainstormDocs] Appended ${rejectedIdeas.length} entries to Rejection Log`);
    }
  }

  /**
   * Regenerate live documents with brainstorm data
   */
  private async regenerateLiveDocuments(
    projectId: string,
    acceptedIdeas: ExtractedIdea[],
    rejectedIdeas: ExtractedIdea[]
  ): Promise<GeneratedDocument[]> {
    console.log('[BrainstormDocs] Regenerating live documents...');

    // Fetch current project state with new accepted ideas
    const { data: project } = await this.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (!project) {
      console.log('[BrainstormDocs] Project not found');
      return [];
    }

    // Determine which documents to regenerate based on accepted ideas
    const docsToRegenerate = this.determineRelevantDocuments(acceptedIdeas);
    console.log(`[BrainstormDocs] Will regenerate: ${docsToRegenerate.join(', ')}`);

    const updatedDocs: GeneratedDocument[] = [];

    for (const docType of docsToRegenerate) {
      try {
        const regeneratedDoc = await this.regenerateDocument(
          projectId,
          docType,
          project,
          acceptedIdeas
        );

        if (regeneratedDoc) {
          updatedDocs.push(regeneratedDoc);
        }
      } catch (error) {
        console.error(`[BrainstormDocs] Error regenerating ${docType}:`, error);
      }
    }

    return updatedDocs;
  }

  /**
   * Determine which documents are relevant to accepted ideas
   */
  private determineRelevantDocuments(acceptedIdeas: ExtractedIdea[]): string[] {
    // Always regenerate these core documents
    const toRegenerate: Set<string> = new Set(['project_brief', 'technical_specs']);

    // Analyze accepted ideas to determine other relevant docs
    const ideaTexts = acceptedIdeas.map(idea =>
      `${idea.idea.title} ${idea.idea.description}`.toLowerCase()
    );

    const combinedText = ideaTexts.join(' ');

    // Check for implementation-related content
    if (combinedText.match(/implement|build|develop|create|code/)) {
      toRegenerate.add('implementation_plan');
    }

    // Check for risk-related content
    if (combinedText.match(/risk|challenge|concern|issue|problem/)) {
      toRegenerate.add('risk_assessment');
    }

    // Check for vendor/comparison content
    if (combinedText.match(/vendor|provider|service|tool|platform|compare/)) {
      toRegenerate.add('vendor_comparison');
    }

    return Array.from(toRegenerate);
  }

  /**
   * Regenerate a specific document type with brainstorm data
   */
  private async regenerateDocument(
    projectId: string,
    docType: string,
    project: any,
    acceptedIdeas: ExtractedIdea[]
  ): Promise<GeneratedDocument | null> {
    console.log(`[BrainstormDocs] Regenerating ${docType}...`);

    // Find existing document
    const { data: existingDoc } = await this.supabase
      .from('generated_documents')
      .select('*')
      .eq('project_id', projectId)
      .eq('document_type', docType)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    // Build context including accepted ideas
    const projectContext = {
      title: project.title,
      description: project.description,
      items: project.items || [],
      acceptedIdeasFromBrainstorm: acceptedIdeas.map(idea => ({
        title: idea.idea.title,
        description: idea.idea.description,
        reasoning: idea.idea.reasoning
      }))
    };

    // Generate new content using AI
    const newContent = await this.generateDocumentContent(docType, projectContext);

    if (!newContent) {
      return null;
    }

    // Update or create document
    if (existingDoc) {
      // Update existing
      const { data, error } = await this.supabase
        .from('generated_documents')
        .update({
          content: newContent,
          version: existingDoc.version + 1,
          updated_at: new Date().toISOString(),
          metadata: {
            ...existingDoc.metadata,
            regeneratedWithBrainstorm: true,
            brainstormIdeasIncluded: acceptedIdeas.length
          }
        })
        .eq('id', existingDoc.id)
        .select()
        .single();

      if (error) {
        console.error(`[BrainstormDocs] Error updating ${docType}:`, error);
        return null;
      }

      return data;
    } else {
      // Create new
      const { data, error } = await this.supabase
        .from('generated_documents')
        .insert({
          project_id: projectId,
          document_type: docType,
          title: this.getDocumentTitle(docType),
          content: newContent,
          version: 1,
          metadata: {
            generatedWithBrainstorm: true,
            brainstormIdeasIncluded: acceptedIdeas.length
          }
        })
        .select()
        .single();

      if (error) {
        console.error(`[BrainstormDocs] Error creating ${docType}:`, error);
        return null;
      }

      return data;
    }
  }

  /**
   * Generate document content using AI
   */
  private async generateDocumentContent(
    docType: string,
    projectContext: any
  ): Promise<string> {
    const prompt = this.buildDocumentPrompt(docType, projectContext);

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      return '';
    } catch (error) {
      console.error(`[BrainstormDocs] Error generating ${docType}:`, error);
      return '';
    }
  }

  /**
   * Build prompt for document generation
   */
  private buildDocumentPrompt(docType: string, context: any): string {
    const baseContext = `
PROJECT: ${context.title}
DESCRIPTION: ${context.description}

DECIDED ITEMS:
${context.items.filter((i: any) => i.state === 'decided').map((i: any) => `- ${i.text}`).join('\n')}

NEW IDEAS FROM BRAINSTORM SESSION:
${context.acceptedIdeasFromBrainstorm.map((idea: any) => `- ${idea.title}: ${idea.description}`).join('\n')}
`;

    const prompts: { [key: string]: string } = {
      project_brief: `Generate a comprehensive Project Brief document incorporating the brainstorm session ideas.

${baseContext}

Create a professional project brief in markdown format that includes:
1. Executive Summary
2. Project Goals & Objectives (incorporating new brainstorm ideas)
3. Scope (updated with accepted ideas)
4. Key Features (including new ideas from brainstorm)
5. Success Criteria
6. Timeline Overview

Make it comprehensive and professional.`,

      technical_specs: `Generate comprehensive Technical Specifications incorporating the brainstorm session ideas.

${baseContext}

Create technical specifications in markdown format that includes:
1. Technical Overview
2. Architecture (incorporating new ideas)
3. Technology Stack
4. System Requirements (updated with brainstorm ideas)
5. Integration Points
6. Security Considerations
7. Performance Requirements

Be detailed and technical.`,

      implementation_plan: `Generate an Implementation Plan incorporating the brainstorm session ideas.

${baseContext}

Create an implementation plan in markdown format that includes:
1. Implementation Phases
2. Task Breakdown (including new brainstorm ideas)
3. Dependencies
4. Resource Requirements
5. Timeline Estimates
6. Risk Mitigation

Be actionable and detailed.`,
    };

    return prompts[docType] || prompts.project_brief;
  }

  /**
   * Get default document title for type
   */
  private getDocumentTitle(docType: string): string {
    const titles: { [key: string]: string } = {
      project_brief: 'Project Brief',
      technical_specs: 'Technical Specifications',
      implementation_plan: 'Implementation Plan',
      risk_assessment: 'Risk Assessment',
      vendor_comparison: 'Vendor Comparison',
    };

    return titles[docType] || 'Generated Document';
  }
}
