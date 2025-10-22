import Anthropic from '@anthropic-ai/sdk';

export class SynthesisAgent {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Synthesize multiple reference analyses into a single coherent document
   */
  async synthesize(analyses: Array<{
    filename: string;
    analysis: string;
    type?: string;
  }>): Promise<{
    synthesis: string;
    conflicts: Array<{
      topic: string;
      references: Array<{ filename: string; content: string }>;
    }>;
    keyThemes: string[];
  }> {
    console.log(`[SynthesisAgent] Synthesizing ${analyses.length} analyses`);

    const prompt = `You are a synthesis agent tasked with combining multiple reference analyses into a single, coherent document.

You have been provided with ${analyses.length} reference analyses:

${analyses.map((ref, idx) => `
## Reference ${idx + 1}: ${ref.filename}
Type: ${ref.type || 'unknown'}

${ref.analysis}

---
`).join('\n')}

Your task is to:
1. **Identify key themes** that appear across multiple references
2. **Detect conflicts** where references contradict each other
3. **Create a synthesis** that combines insights from all references into a coherent narrative

Please provide your response in the following JSON format:
{
  "synthesis": "A comprehensive markdown synthesis that combines all insights",
  "conflicts": [
    {
      "topic": "The conflicting topic",
      "references": [
        {"filename": "ref1.pdf", "content": "What reference 1 says"},
        {"filename": "ref2.pdf", "content": "What reference 2 says"}
      ]
    }
  ],
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3"]
}

Guidelines for the synthesis:
- Structure it with clear headings and sections
- Cite specific references when making claims (e.g., "According to analysis of doc1.pdf...")
- Highlight areas of agreement and disagreement
- Identify gaps or missing information
- Provide actionable insights
- Use markdown formatting for readability`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON found, create a simple synthesis
        return {
          synthesis: content.text,
          conflicts: [],
          keyThemes: [],
        };
      }

      const result = JSON.parse(jsonMatch[0]);

      console.log(`[SynthesisAgent] ✅ Synthesis complete`);
      console.log(`[SynthesisAgent] Found ${result.conflicts?.length || 0} conflicts`);
      console.log(`[SynthesisAgent] Identified ${result.keyThemes?.length || 0} key themes`);

      return {
        synthesis: result.synthesis || content.text,
        conflicts: result.conflicts || [],
        keyThemes: result.keyThemes || [],
      };
    } catch (error) {
      console.error('[SynthesisAgent] Error during synthesis:', error);

      // Fallback: Create a simple concatenated synthesis
      const fallbackSynthesis = `# Combined Analysis\n\n${analyses.map((ref, idx) =>
        `## ${idx + 1}. ${ref.filename}\n\n${ref.analysis}\n\n`
      ).join('---\n\n')}`;

      return {
        synthesis: fallbackSynthesis,
        conflicts: [],
        keyThemes: [],
      };
    }
  }

  /**
   * Compare two specific analyses and highlight differences
   */
  async compare(
    ref1: { filename: string; analysis: string },
    ref2: { filename: string; analysis: string }
  ): Promise<{
    similarities: string[];
    differences: string[];
    conflicts: string[];
  }> {
    console.log(`[SynthesisAgent] Comparing ${ref1.filename} vs ${ref2.filename}`);

    const prompt = `Compare these two reference analyses and identify:
1. Key similarities (what they agree on)
2. Important differences (different focus areas or perspectives)
3. Direct conflicts (contradictory information)

Reference 1: ${ref1.filename}
${ref1.analysis}

---

Reference 2: ${ref2.filename}
${ref2.analysis}

Provide your response in JSON format:
{
  "similarities": ["similarity 1", "similarity 2"],
  "differences": ["difference 1", "difference 2"],
  "conflicts": ["conflict 1", "conflict 2"]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        temperature: 0.5,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          similarities: [],
          differences: [],
          conflicts: [],
        };
      }

      const result = JSON.parse(jsonMatch[0]);

      console.log(`[SynthesisAgent] ✅ Comparison complete`);

      return {
        similarities: result.similarities || [],
        differences: result.differences || [],
        conflicts: result.conflicts || [],
      };
    } catch (error) {
      console.error('[SynthesisAgent] Error during comparison:', error);
      return {
        similarities: [],
        differences: [],
        conflicts: [],
      };
    }
  }
}
