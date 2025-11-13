/**
 * Search Intelligence Service
 * Provides query expansion, related searches, and search patterns
 */

export interface SearchIntelligence {
  expandedQueries: string[];
  relatedSearches: string[];
  suggestions: string[];
  patterns: {
    commonTerms: string[];
    queryType: 'technical' | 'business' | 'general' | 'specific';
  };
}

export class SearchIntelligenceService {
  // Common search patterns and synonyms
  private synonyms: Record<string, string[]> = {
    'fast': ['quick', 'rapid', 'speedy', 'high-performance'],
    'slow': ['sluggish', 'delayed', 'lagging'],
    'good': ['effective', 'efficient', 'quality', 'best'],
    'bad': ['poor', 'ineffective', 'low-quality'],
    'cheap': ['affordable', 'low-cost', 'budget'],
    'expensive': ['costly', 'premium', 'high-end'],
    'easy': ['simple', 'straightforward', 'user-friendly'],
    'hard': ['difficult', 'complex', 'challenging'],
    'new': ['recent', 'latest', 'modern', 'current'],
    'old': ['legacy', 'outdated', 'deprecated'],
  };

  private queryPatterns: Record<string, string[]> = {
    'how to': ['tutorial', 'guide', 'step by step', 'instructions'],
    'what is': ['definition', 'explanation', 'overview', 'introduction'],
    'best': ['top', 'recommended', 'comparison', 'review'],
    'vs': ['versus', 'comparison', 'difference between'],
  };

  /**
   * Generate intelligent search suggestions
   */
  async generateIntelligence(query: string): Promise<SearchIntelligence> {
    const expandedQueries = this.expandQuery(query);
    const relatedSearches = this.generateRelatedSearches(query);
    const suggestions = this.generateSuggestions(query);
    const patterns = this.analyzeQueryPattern(query);

    return {
      expandedQueries,
      relatedSearches,
      suggestions,
      patterns,
    };
  }

  /**
   * Expand query with synonyms and variations
   */
  private expandQuery(query: string): string[] {
    const expanded: Set<string> = new Set([query]);
    const words = query.toLowerCase().split(/\s+/);

    // Expand with synonyms
    words.forEach(word => {
      if (this.synonyms[word]) {
        this.synonyms[word].forEach(synonym => {
          const expandedQuery = query.replace(new RegExp(`\\b${word}\\b`, 'i'), synonym);
          expanded.add(expandedQuery);
        });
      }
    });

    // Expand with common query patterns
    for (const [pattern, expansions] of Object.entries(this.queryPatterns)) {
      if (query.toLowerCase().includes(pattern)) {
        expansions.forEach(expansion => {
          const expandedQuery = query.replace(new RegExp(pattern, 'i'), expansion);
          expanded.add(expandedQuery);
        });
      }
    }

    return Array.from(expanded).slice(0, 5); // Limit to top 5
  }

  /**
   * Generate related search queries
   */
  private generateRelatedSearches(query: string): string[] {
    const related: string[] = [];

    // Add common modifiers
    const modifiers = [
      'best',
      'latest',
      'how to',
      'tutorial',
      'comparison',
      'vs alternatives',
      'pricing',
      'review',
    ];

    modifiers.forEach(modifier => {
      if (!query.toLowerCase().includes(modifier)) {
        related.push(`${modifier} ${query}`);
      }
    });

    // Add question formats
    if (!query.toLowerCase().startsWith('what') && !query.toLowerCase().startsWith('how')) {
      related.push(`what is ${query}`);
      related.push(`how to use ${query}`);
    }

    // Add specificity variations
    related.push(`${query} 2024`); // Add recency
    related.push(`${query} for beginners`);
    related.push(`advanced ${query}`);

    return related.slice(0, 8); // Limit to top 8
  }

  /**
   * Generate autocomplete suggestions
   */
  private generateSuggestions(query: string): string[] {
    const suggestions: string[] = [];

    // Common completions based on partial query
    const commonCompletions: Record<string, string[]> = {
      'machine learning': [
        'machine learning algorithms',
        'machine learning tutorial',
        'machine learning python',
        'machine learning projects',
      ],
      'react': [
        'react hooks',
        'react tutorial',
        'react native',
        'react vs angular',
      ],
      'api': [
        'api design',
        'api testing',
        'api documentation',
        'api gateway',
      ],
      'database': [
        'database design',
        'database optimization',
        'database management',
        'database vs data warehouse',
      ],
    };

    // Find matching completions
    const lowerQuery = query.toLowerCase();
    for (const [key, completions] of Object.entries(commonCompletions)) {
      if (key.startsWith(lowerQuery) || lowerQuery.includes(key)) {
        suggestions.push(...completions);
      }
    }

    // Add generic completions
    if (suggestions.length === 0) {
      suggestions.push(
        `${query} tutorial`,
        `${query} best practices`,
        `${query} example`,
        `${query} documentation`
      );
    }

    return suggestions.slice(0, 5);
  }

  /**
   * Analyze query pattern and type
   */
  private analyzeQueryPattern(query: string): {
    commonTerms: string[];
    queryType: 'technical' | 'business' | 'general' | 'specific';
  } {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);

    // Extract common terms
    const technicalTerms = ['api', 'code', 'programming', 'framework', 'library', 'algorithm', 'database'];
    const businessTerms = ['market', 'revenue', 'cost', 'roi', 'strategy', 'customer'];

    const commonTerms = words.filter(word => 
      technicalTerms.includes(word) || businessTerms.includes(word)
    );

    // Classify query type
    let queryType: 'technical' | 'business' | 'general' | 'specific' = 'general';

    if (technicalTerms.some(term => lowerQuery.includes(term))) {
      queryType = 'technical';
    } else if (businessTerms.some(term => lowerQuery.includes(term))) {
      queryType = 'business';
    } else if (words.length > 4) {
      queryType = 'specific';
    }

    return {
      commonTerms,
      queryType,
    };
  }

  /**
   * Track search history and learn patterns
   */
  async trackSearch(userId: string, query: string, results: number): Promise<void> {
    // This would store to database for pattern learning
    // For now, just log
    console.log(`[SearchIntelligence] User ${userId} searched for "${query}" (${results} results)`);
  }

  /**
   * Get trending searches (placeholder for future implementation)
   */
  async getTrendingSearches(): Promise<string[]> {
    // This would pull from database analytics
    return [
      'AI and machine learning',
      'Cloud computing',
      'Microservices architecture',
      'React best practices',
      'Database optimization',
    ];
  }
}

// Singleton instance
export const searchIntelligenceService = new SearchIntelligenceService();
