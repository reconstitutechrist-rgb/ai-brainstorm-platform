/**
 * Analysis Chat Routes - Phase 4.1
 *
 * Enables interactive Q&A with reference analysis content
 * and deep-dive exploration of specific sections
 */

import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * POST /api/analysis/chat
 * Chat with analysis content - ask questions and get AI-powered answers
 */
router.post('/chat', async (req, res) => {
  try {
    const { referenceId, projectId, analysisContent, messages, question } = req.body;

    if (!referenceId || !question || !analysisContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: referenceId, question, analysisContent',
      });
    }

    // Build context for Claude
    const systemPrompt = `You are an AI assistant helping users understand and analyze reference documents.

ANALYSIS CONTENT:
${analysisContent.substring(0, 8000)}

Your role:
- Answer questions about the analysis clearly and concisely
- Provide specific quotes and references when possible
- Offer insights and connections between different parts
- Suggest follow-up questions to deepen understanding
- Be helpful but honest - if something isn't in the analysis, say so

Keep responses focused and actionable. Use markdown formatting for better readability.`;

    // Build conversation history
    const conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (messages && Array.isArray(messages)) {
      messages.forEach((msg: ChatMessage) => {
        conversationMessages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: conversationMessages,
    });

    const answer = message.content[0].type === 'text' ? message.content[0].text : 'No response generated.';

    // Generate suggested follow-up questions
    const suggestedQuestions = generateFollowUpQuestions(question, answer);

    res.json({
      success: true,
      answer,
      suggestedQuestions,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error('Analysis chat error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process chat request',
    });
  }
});

/**
 * POST /api/analysis/deep-dive
 * Get expanded detailed analysis for a specific section
 */
router.post('/deep-dive', async (req, res) => {
  try {
    const { referenceId, projectId, analysisContent, sectionTitle } = req.body;

    if (!referenceId || !sectionTitle || !analysisContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: referenceId, sectionTitle, analysisContent',
      });
    }

    // Extract the section content
    const sectionContent = extractSectionContent(analysisContent, sectionTitle);

    if (!sectionContent) {
      return res.status(404).json({
        success: false,
        error: 'Section not found in analysis',
      });
    }

    // Generate expanded analysis
    const prompt = `You are analyzing a reference document. A user wants more details about this section:

SECTION: ${sectionTitle}

CURRENT CONTENT:
${sectionContent}

FULL ANALYSIS CONTEXT:
${analysisContent.substring(0, 6000)}

Provide a detailed deep-dive analysis of this section:
1. Expand on key points with more detail
2. Add context and background information
3. Identify implications and connections
4. Highlight actionable insights
5. Suggest areas for further research

Format your response in markdown with clear headings and bullet points.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const expandedContent = message.content[0].type === 'text' ? message.content[0].text : '';

    // Generate research suggestions for this section
    const researchSuggestions = generateResearchSuggestions(sectionTitle, expandedContent);

    res.json({
      success: true,
      expandedContent,
      researchSuggestions,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error('Deep dive error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate deep dive analysis',
    });
  }
});

/**
 * POST /api/analysis/extract-insights
 * Extract and structure key insights from analysis for Canvas
 */
router.post('/extract-insights', async (req, res) => {
  try {
    const { referenceId, projectId, analysisContent, selectedText } = req.body;

    if (!referenceId || !analysisContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: referenceId, analysisContent',
      });
    }

    const prompt = `Extract actionable insights from this analysis that can be added to a project canvas.

${selectedText ? `SELECTED TEXT:\n${selectedText}\n\n` : ''}

FULL ANALYSIS:
${analysisContent.substring(0, 8000)}

Return a JSON array of insights in this format:
[
  {
    "text": "Brief, actionable insight",
    "category": "feature" | "requirement" | "constraint" | "opportunity" | "risk",
    "priority": "high" | "medium" | "low",
    "reasoning": "Why this matters"
  }
]

Focus on:
- Concrete, actionable items
- Features or requirements that could be implemented
- Risks or constraints to be aware of
- Opportunities for improvement
- Technical or business insights

Return ONLY the JSON array, no other text.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';

    // Parse JSON response
    let insights: any[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse insights JSON:', error);
    }

    res.json({
      success: true,
      insights,
      count: insights.length,
    });
  } catch (error: any) {
    console.error('Extract insights error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to extract insights',
    });
  }
});

/**
 * POST /api/analysis/suggest-research
 * Generate follow-up research suggestions based on analysis
 */
router.post('/suggest-research', async (req, res) => {
  try {
    const { referenceId, projectId, analysisContent } = req.body;

    if (!referenceId || !analysisContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: referenceId, analysisContent',
      });
    }

    const prompt = `Based on this analysis, suggest follow-up research topics that would provide additional value.

ANALYSIS:
${analysisContent.substring(0, 6000)}

Return a JSON array of research suggestions:
[
  {
    "topic": "Specific research topic",
    "query": "Search query to use",
    "reasoning": "Why this research would be valuable",
    "category": "competitive" | "technical" | "market" | "user"
  }
]

Focus on:
- Gaps in current knowledge
- Areas that need deeper exploration
- Related topics worth investigating
- Competitive intelligence opportunities
- Technical validation needs

Return ONLY the JSON array.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '[]';

    let suggestions: any[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse suggestions JSON:', error);
    }

    res.json({
      success: true,
      suggestions,
      count: suggestions.length,
    });
  } catch (error: any) {
    console.error('Suggest research error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate research suggestions',
    });
  }
});

// Helper Functions

function extractSectionContent(analysisContent: string, sectionTitle: string): string | null {
  const lines = analysisContent.split('\n');
  let inSection = false;
  let sectionContent: string[] = [];

  for (const line of lines) {
    if (line.match(/^#{2,3}\s+/)) {
      const title = line.replace(/^#{2,3}\s+/, '').trim();
      if (title === sectionTitle) {
        inSection = true;
        continue;
      } else if (inSection) {
        // Hit next section, stop
        break;
      }
    }

    if (inSection) {
      sectionContent.push(line);
    }
  }

  return sectionContent.length > 0 ? sectionContent.join('\n') : null;
}

function generateFollowUpQuestions(question: string, answer: string): string[] {
  // Simple heuristic-based follow-up generation
  const questions: string[] = [];

  if (answer.toLowerCase().includes('competitor')) {
    questions.push('How does this compare to other competitors?');
  }
  if (answer.toLowerCase().includes('price') || answer.toLowerCase().includes('cost')) {
    questions.push('What are the pricing implications?');
  }
  if (answer.toLowerCase().includes('technology') || answer.toLowerCase().includes('technical')) {
    questions.push('What are the technical requirements?');
  }
  if (answer.toLowerCase().includes('user') || answer.toLowerCase().includes('customer')) {
    questions.push('What do users think about this?');
  }

  // Add generic questions
  if (questions.length < 3) {
    questions.push('Can you provide more details?');
    questions.push('What are the implications of this?');
  }

  return questions.slice(0, 3);
}

function generateResearchSuggestions(sectionTitle: string, content: string): string[] {
  const suggestions: string[] = [];

  // Heuristic-based suggestions
  if (sectionTitle.toLowerCase().includes('competitor')) {
    suggestions.push('Research competitor pricing strategies');
    suggestions.push('Analyze competitor feature comparisons');
  } else if (sectionTitle.toLowerCase().includes('technical')) {
    suggestions.push('Research technical implementation details');
    suggestions.push('Investigate alternative technologies');
  } else if (sectionTitle.toLowerCase().includes('market')) {
    suggestions.push('Research market trends and forecasts');
    suggestions.push('Analyze target market segments');
  }

  return suggestions;
}

export default router;
