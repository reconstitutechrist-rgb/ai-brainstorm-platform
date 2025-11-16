/**
 * DocumentOrchestrator - Page-Specific Orchestrator for DocumentsPage
 *
 * Coordinates auto-document generation with optional verification.
 * Provides two modes: Quick Generate (fast) and Verify & Generate (quality-checked).
 */

import { BaseOrchestrator, ProjectItem } from './BaseOrchestrator';
import { supabase } from '../services/supabase';
import {
  extractVerificationResult,
  extractAssumptionScanResult,
  extractConsistencyCheckResult,
} from '../utils/typeGuards';

interface DocumentContext {
  projectId: string;
  documentType: 'prd' | 'technical_spec' | 'user_stories' | 'roadmap';
  verify?: boolean;
  userId?: string;
}

interface DocumentResult {
  documentId: string;
  content: string;
  metadata: {
    itemsUsed: number;
    decidedItems: number;
    exploringItems: number;
    parkedItems: number;
    generatedAt: Date;
  };
  qualityReport?: {
    verified: boolean;
    issues: string[];
    assumptions: Array<{
      detail: string;
      severity: 'critical' | 'high' | 'medium';
      recommendation?: string;
    }>;
    conflicts: Array<{
      type: string;
      description: string;
      severity?: string;
      explanation?: string;
      resolutionOptions?: string[];
    }>;
    gapsDetected: string[];
  };
}


export class DocumentOrchestrator extends BaseOrchestrator {


  constructor() {
    super('DocumentOrchestrator');
  }

  /**
   * Main entry point for document generation
   * Supports both quick and verified generation modes
   */
  async generateDocument(context: DocumentContext): Promise<DocumentResult> {
    try {
      this.log('Generating document', { type: context.documentType, verify: context.verify });

      // Step 1: Fetch project items
      const projectItems = await this.getProjectItems(context.projectId);
      this.log(`Found ${projectItems.length} project items`);

      if (projectItems.length === 0) {
        throw new Error('No project items found. Start a conversation on the Chat page to build your project first.');
      }

      // Step 2: Filter items by state
      const decidedItems = projectItems.filter(item => item.state === 'decided');
      const exploringItems = projectItems.filter(item => item.state === 'exploring');
      const parkedItems = projectItems.filter(item => item.state === 'parked');

      this.log(`Items breakdown: ${decidedItems.length} decided, ${exploringItems.length} exploring, ${parkedItems.length} parked`);

      // Step 3: Generate document content
      const documentContent = await this.generateDocumentContent(
        context.documentType,
        decidedItems,
        exploringItems,
        parkedItems
      );

      // Step 4: Optional verification
      let qualityReport: DocumentResult['qualityReport'] = undefined;
      if (context.verify) {
        qualityReport = await this.verifyDocument(
          context.projectId,
          documentContent,
          projectItems
        );
      }

      // Step 5: Save document to database
      const documentId = await this.saveDocument(
        context.projectId,
        context.documentType,
        documentContent,
        context.userId
      );

      // Step 6: Build result
      const result: DocumentResult = {
        documentId,
        content: documentContent,
        metadata: {
          itemsUsed: projectItems.length,
          decidedItems: decidedItems.length,
          exploringItems: exploringItems.length,
          parkedItems: parkedItems.length,
          generatedAt: new Date()
        },
        qualityReport
      };

      this.log('Document generated successfully', documentId);

      return result;
    } catch (error) {
      this.logError('Error generating document', error);
      throw error;
    }
  }

  /**
   * Quick generate mode (no verification)
   * Fast document generation from decided items
   */
  async quickGenerate(context: DocumentContext): Promise<DocumentResult> {
    return this.generateDocument({ ...context, verify: false });
  }

  /**
   * Verify & generate mode (full quality checks)
   * Slower but ensures document quality
   */
  async verifyAndGenerate(context: DocumentContext): Promise<DocumentResult> {
    return this.generateDocument({ ...context, verify: true });
  }

  /**
   * Generate document content based on type and items
   */
  private async generateDocumentContent(
    documentType: string,
    decidedItems: ProjectItem[],
    exploringItems: ProjectItem[],
    parkedItems: ProjectItem[]
  ): Promise<string> {
    switch (documentType) {
      case 'prd':
        return this.generatePRD(decidedItems, exploringItems);

      case 'technical_spec':
        return this.generateTechnicalSpec(decidedItems);

      case 'user_stories':
        return this.generateUserStories(decidedItems, exploringItems);

      case 'roadmap':
        return this.generateRoadmap(decidedItems, exploringItems, parkedItems);

      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }
  }

  /**
   * Generate Product Requirements Document
   */
  private generatePRD(
    decidedItems: ProjectItem[],
    exploringItems: ProjectItem[]
  ): string {
    let prd = '# Product Requirements Document\n\n';
    prd += `_Generated on ${new Date().toLocaleDateString()}_\n\n`;

    prd += '## Overview\n\n';
    prd += 'This document outlines the requirements for the project based on decisions made during brainstorming sessions.\n\n';

    prd += '## Decided Requirements\n\n';
    decidedItems.forEach((item, index) => {
      prd += `### ${index + 1}. ${item.title}\n\n`;
      prd += `${item.description}\n\n`;
      prd += `**Confidence:** ${item.confidence}%\n\n`;
      if (item.tags && item.tags.length > 0) {
        prd += `**Tags:** ${item.tags.join(', ')}\n\n`;
      }
    });

    if (exploringItems.length > 0) {
      prd += '## Under Exploration\n\n';
      prd += 'These items are still being evaluated:\n\n';
      exploringItems.forEach((item, index) => {
        prd += `${index + 1}. **${item.title}**: ${item.description}\n`;
      });
      prd += '\n';
    }

    return prd;
  }

  /**
   * Generate Technical Specification
   */
  private generateTechnicalSpec(decidedItems: ProjectItem[]): string {
    let spec = '# Technical Specification\n\n';
    spec += `_Generated on ${new Date().toLocaleDateString()}_\n\n`;

    spec += '## Architecture\n\n';

    const techItems = decidedItems.filter(item =>
      item.tags?.some(tag =>
        ['tech', 'architecture', 'database', 'api', 'frontend', 'backend'].includes(tag.toLowerCase())
      )
    );

    if (techItems.length > 0) {
      techItems.forEach((item, index) => {
        spec += `### ${index + 1}. ${item.title}\n\n`;
        spec += `${item.description}\n\n`;
      });
    } else {
      spec += 'No technical decisions recorded yet.\n\n';
    }

    spec += '## Features\n\n';

    const featureItems = decidedItems.filter(item =>
      item.tags?.some(tag =>
        ['feature', 'functionality', 'component'].includes(tag.toLowerCase())
      )
    );

    if (featureItems.length > 0) {
      featureItems.forEach((item, index) => {
        spec += `### ${index + 1}. ${item.title}\n\n`;
        spec += `${item.description}\n\n`;
      });
    } else {
      spec += 'No feature decisions recorded yet.\n\n';
    }

    spec += '## Requirements\n\n';
    decidedItems.forEach((item, index) => {
      spec += `${index + 1}. ${item.title}\n`;
    });

    return spec;
  }

  /**
   * Generate User Stories
   */
  private generateUserStories(
    decidedItems: ProjectItem[],
    exploringItems: ProjectItem[]
  ): string {
    let stories = '# User Stories\n\n';
    stories += `_Generated on ${new Date().toLocaleDateString()}_\n\n`;

    stories += '## Decided Stories\n\n';
    decidedItems.forEach((item, index) => {
      stories += `### Story ${index + 1}: ${item.title}\n\n`;
      stories += `**As a** user,\n`;
      stories += `**I want** ${item.description.toLowerCase()},\n`;
      stories += `**So that** I can achieve my goals.\n\n`;
      stories += `**Acceptance Criteria:**\n`;
      stories += `- [ ] ${item.description}\n`;
      stories += `- [ ] Meets quality standards\n`;
      stories += `- [ ] Tested and verified\n\n`;
    });

    if (exploringItems.length > 0) {
      stories += '## Exploratory Stories (Under Consideration)\n\n';
      exploringItems.forEach((item, index) => {
        stories += `${index + 1}. **${item.title}**: ${item.description}\n`;
      });
      stories += '\n';
    }

    return stories;
  }

  /**
   * Generate Project Roadmap
   */
  private generateRoadmap(
    decidedItems: ProjectItem[],
    exploringItems: ProjectItem[],
    parkedItems: ProjectItem[]
  ): string {
    let roadmap = '# Project Roadmap\n\n';
    roadmap += `_Generated on ${new Date().toLocaleDateString()}_\n\n`;

    roadmap += '## Phase 1: Decided Features\n\n';
    roadmap += 'These features are confirmed and ready for development:\n\n';
    decidedItems.forEach((item, index) => {
      roadmap += `${index + 1}. **${item.title}** (Confidence: ${item.confidence}%)\n`;
      roadmap += `   ${item.description}\n\n`;
    });

    if (exploringItems.length > 0) {
      roadmap += '## Phase 2: Under Exploration\n\n';
      roadmap += 'These features are being evaluated:\n\n';
      exploringItems.forEach((item, index) => {
        roadmap += `${index + 1}. **${item.title}**\n`;
        roadmap += `   ${item.description}\n\n`;
      });
    }

    if (parkedItems.length > 0) {
      roadmap += '## Backlog: Parked for Later\n\n';
      roadmap += 'These features are on hold:\n\n';
      parkedItems.forEach((item, index) => {
        roadmap += `${index + 1}. **${item.title}**\n`;
      });
      roadmap += '\n';
    }

    return roadmap;
  }

  /**
   * Verify document quality
   * Runs comprehensive quality checks
   */
  private async verifyDocument(
    projectId: string,
    documentContent: string,
    projectItems: ProjectItem[]
  ): Promise<{
    verified: boolean;
    issues: string[];
    assumptions: Array<{
      detail: string;
      severity: 'critical' | 'high' | 'medium';
      recommendation?: string;
    }>;
    conflicts: Array<{
      type: string;
      description: string;
      severity?: string;
      explanation?: string;
      resolutionOptions?: string[];
    }>;
    gapsDetected: string[];
  }> {
    this.log('Running quality checks on document');

    // Run quality checks in parallel
    const [verification, assumptionScan, consistencyCheck] = await Promise.all([
      this.qualityAuditor.verify(
        { documentContent },
        'Verify auto-generated document'
      ),
      this.qualityAuditor.scan(
        { documentContent }
      ),
      this.qualityAuditor.checkConsistency(
        { documentContent },
        { decided: projectItems.filter(i => i.state === 'decided'), exploring: [], parked: [] },
        []
      )
    ]);

    // Detect gaps in the document
    const gapsDetected = this.detectDocumentGaps(documentContent, projectItems);

    // Extract results using type-safe helper functions
    const verificationResult = extractVerificationResult(verification);
    const assumptionResult = extractAssumptionScanResult(assumptionScan);
    const consistencyResult = extractConsistencyCheckResult(consistencyCheck);

    const qualityReport = {
      verified: verificationResult.approved,
      issues: verificationResult.issues,
      assumptions: assumptionResult.assumptions,
      conflicts: consistencyResult.conflicts,
      gapsDetected
    };

    this.log('Quality report', qualityReport);

    return qualityReport;
  }

  /**
   * Detect gaps in the document
   * Identifies missing sections or incomplete information
   */
  private detectDocumentGaps(
    documentContent: string,
    projectItems: ProjectItem[]
  ): string[] {
    const gaps: string[] = [];

    // Check if all decided items are included
    const decidedItems = projectItems.filter(item => item.state === 'decided');
    decidedItems.forEach(item => {
      if (!documentContent.toLowerCase().includes(item.title.toLowerCase())) {
        gaps.push(`Missing decided item: "${item.title}"`);
      }
    });

    // Check for common document sections
    const commonSections = ['overview', 'requirements', 'features', 'architecture'];
    commonSections.forEach(section => {
      if (!documentContent.toLowerCase().includes(section)) {
        gaps.push(`Missing section: "${section}"`);
      }
    });

    return gaps;
  }

  /**
   * Save generated document to database
   */
  private async saveDocument(
    projectId: string,
    documentType: string,
    content: string,
    userId?: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('generated_documents')
        .insert([{
          project_id: projectId,
          title: documentType,
          content: content,
          format: 'markdown',
          status: 'completed',
          generated_at: new Date().toISOString(),
          metadata: {
            documentType,
            generatedBy: userId || 'system',
            orchestrator: 'DocumentOrchestrator',
          },
        }])
        .select('id')
        .single();

      if (error) throw error;

      return data.id;
    } catch (error) {
      this.logError('Error saving document', error);
      throw error;
    }
  }

  /**
   * Analyze document for gaps and suggestions
   * Provides recommendations for improving the document
   */
  async analyzeDocumentGaps(
    projectId: string,
    documentId: string
  ): Promise<{
    gaps: string[];
    suggestions: string[];
    completeness: number;
  }> {
    try {
      // Fetch document
      const { data: docData, error: docError } = await supabase
        .from('generated_documents')
        .select('content, title')
        .eq('id', documentId)
        .single();

      if (docError || !docData) {
        throw new Error('Document not found');
      }

      const content = docData.content;
      const document_type = docData.title;

      // Fetch project items
      const projectItems = await this.getProjectItems(projectId);

      // Detect gaps
      const gaps = this.detectDocumentGaps(content, projectItems);

      // Generate suggestions
      const suggestions: string[] = [];

      if (gaps.length > 0) {
        suggestions.push('Consider adding the missing items to make the document complete');
      }

      const exploringItems = projectItems.filter(item => item.state === 'exploring');
      if (exploringItems.length > 0) {
        suggestions.push(`You have ${exploringItems.length} items under exploration that could be added to the document`);
      }

      // Calculate completeness
      const decidedItems = projectItems.filter(item => item.state === 'decided');
      const includedItems = decidedItems.filter(item =>
        content.toLowerCase().includes(item.title.toLowerCase())
      );
      const completeness = decidedItems.length > 0
        ? Math.round((includedItems.length / decidedItems.length) * 100)
        : 100;

      return {
        gaps,
        suggestions,
        completeness
      };
    } catch (error) {
      this.logError('Error analyzing document gaps', error);
      throw error;
    }
  }
}
