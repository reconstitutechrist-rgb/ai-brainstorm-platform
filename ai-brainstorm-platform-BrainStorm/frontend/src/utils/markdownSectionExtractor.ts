/**
 * Markdown Section Extractor
 *
 * Extracts key sections from generated markdown documents:
 * - Next Steps
 * - Open Questions
 * - Risk Assessment
 */

export interface ExtractedSection {
  title: string;
  content: string;
  rawMarkdown: string;
  type: 'next_steps' | 'open_questions' | 'risk_assessment' | 'other';
}

export interface DocumentSections {
  nextSteps: ExtractedSection | null;
  openQuestions: ExtractedSection | null;
  riskAssessment: ExtractedSection | null;
}

/**
 * Extract a specific section from markdown content
 */
function extractSection(
  markdown: string,
  headingPatterns: RegExp[]
): ExtractedSection | null {
  // Try each heading pattern
  for (const pattern of headingPatterns) {
    const match = markdown.match(pattern);

    if (match) {
      const startIndex = match.index!;
      const headingLine = match[0];
      const title = headingLine.replace(/^#+\s*\d*\.?\s*/, '').trim();

      // Find the end of this section (next heading of same or higher level)
      const headingLevel = (headingLine.match(/^#+/) || ['##'])[0].length;
      const nextHeadingPattern = new RegExp(
        `\\n#{1,${headingLevel}}\\s+`,
        'i'
      );

      const contentStart = startIndex + headingLine.length;
      const remainingContent = markdown.slice(contentStart);
      const nextHeadingMatch = remainingContent.match(nextHeadingPattern);

      const contentEnd = nextHeadingMatch
        ? contentStart + nextHeadingMatch.index!
        : markdown.length;

      const rawContent = markdown.slice(contentStart, contentEnd).trim();

      // Parse content into clean text (remove markdown formatting)
      const cleanContent = rawContent
        .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
        .replace(/\*(.+?)\*/g, '$1')     // Italic
        .replace(/^[-*+]\s+/gm, '• ')    // Convert list markers to bullets
        .replace(/^\d+\.\s+/gm, '• ')    // Convert numbered lists to bullets
        .trim();

      return {
        title,
        content: cleanContent,
        rawMarkdown: rawContent,
        type: determineType(title)
      };
    }
  }

  return null;
}

/**
 * Determine section type from title
 */
function determineType(title: string): ExtractedSection['type'] {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('next step')) {
    return 'next_steps';
  } else if (lowerTitle.includes('open question') || lowerTitle.includes('question')) {
    return 'open_questions';
  } else if (lowerTitle.includes('risk')) {
    return 'risk_assessment';
  }

  return 'other';
}

/**
 * Extract all key sections from a markdown document
 */
export function extractKeySections(markdown: string): DocumentSections {
  if (!markdown || markdown.trim().length === 0) {
    return {
      nextSteps: null,
      openQuestions: null,
      riskAssessment: null
    };
  }

  // Patterns for "Next Steps" section
  const nextStepsPatterns = [
    /^##\s*\d*\.?\s*Next Steps?/im,
    /^###\s*\d*\.?\s*Next Steps?/im,
    /^##\s*\d*\.?\s*Immediate Actions?/im,
  ];

  // Patterns for "Open Questions" section
  const openQuestionsPatterns = [
    /^##\s*\d*\.?\s*Open Questions?/im,
    /^###\s*\d*\.?\s*Open Questions?/im,
    /^##\s*\d*\.?\s*Questions?/im,
    /^##\s*\d*\.?\s*Unresolved Questions?/im,
  ];

  // Patterns for "Risk Assessment" section
  const riskAssessmentPatterns = [
    /^##\s*\d*\.?\s*Risk Assessment/im,
    /^###\s*\d*\.?\s*Risk Assessment/im,
    /^##\s*\d*\.?\s*Risks?/im,
    /^##\s*\d*\.?\s*Potential Risks?/im,
    /^##\s*\d*\.?\s*Risks? and Mitigation/im,
  ];

  return {
    nextSteps: extractSection(markdown, nextStepsPatterns),
    openQuestions: extractSection(markdown, openQuestionsPatterns),
    riskAssessment: extractSection(markdown, riskAssessmentPatterns)
  };
}

/**
 * Extract key sections from multiple documents and combine
 */
export function extractFromMultipleDocuments(
  documents: Array<{ document_type: string; content: string; title: string }>
): {
  nextSteps: Array<ExtractedSection & { source: string }>;
  openQuestions: Array<ExtractedSection & { source: string }>;
  riskAssessment: Array<ExtractedSection & { source: string }>;
} {
  const result = {
    nextSteps: [] as Array<ExtractedSection & { source: string }>,
    openQuestions: [] as Array<ExtractedSection & { source: string }>,
    riskAssessment: [] as Array<ExtractedSection & { source: string }>
  };

  for (const doc of documents) {
    const sections = extractKeySections(doc.content);

    if (sections.nextSteps) {
      result.nextSteps.push({
        ...sections.nextSteps,
        source: doc.title
      });
    }

    if (sections.openQuestions) {
      result.openQuestions.push({
        ...sections.openQuestions,
        source: doc.title
      });
    }

    if (sections.riskAssessment) {
      result.riskAssessment.push({
        ...sections.riskAssessment,
        source: doc.title
      });
    }
  }

  return result;
}

/**
 * Check if document has any key sections
 */
export function hasKeySections(markdown: string): boolean {
  const sections = extractKeySections(markdown);
  return !!(sections.nextSteps || sections.openQuestions || sections.riskAssessment);
}

/**
 * Count items in a section (list items)
 */
export function countSectionItems(section: ExtractedSection | null): number {
  if (!section) return 0;

  // Count bullet points and numbered list items
  const bulletMatches = section.rawMarkdown.match(/^[-*+•]\s+/gm) || [];
  const numberedMatches = section.rawMarkdown.match(/^\d+\.\s+/gm) || [];

  return bulletMatches.length + numberedMatches.length;
}
