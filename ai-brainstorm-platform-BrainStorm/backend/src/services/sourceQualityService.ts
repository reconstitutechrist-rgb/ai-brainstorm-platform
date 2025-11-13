/**
 * Source Quality Assessment Service
 * Evaluates the quality and trustworthiness of research sources
 */

export interface SourceQualityScore {
  overall: number; // 0-100
  breakdown: {
    domainReputation: number; // 0-100
    freshness: number; // 0-100
    contentQuality: number; // 0-100
    credibility: number; // 0-100
  };
  flags: string[];
  recommendations: string[];
  metadata: {
    domain: string;
    publishDate?: string;
    lastModified?: string;
    wordCount?: number;
    hasAuthor: boolean;
    hasSources: boolean;
  };
}

export class SourceQualityService {
  // Trusted domain lists (can be expanded)
  private trustedDomains = new Set([
    // Academic & Research
    'arxiv.org', 'scholar.google.com', 'researchgate.net', 'academia.edu',
    'jstor.org', 'sciencedirect.com', 'springer.com', 'nature.com',
    'ieee.org', 'acm.org', 'pubmed.ncbi.nlm.nih.gov',
    
    // News (high credibility)
    'reuters.com', 'apnews.com', 'bbc.com', 'npr.org', 'pbs.org',
    
    // Tech Documentation
    'docs.microsoft.com', 'developer.mozilla.org', 'developer.android.com',
    'developer.apple.com', 'aws.amazon.com', 'cloud.google.com',
    
    // Open Source
    'github.com', 'gitlab.com', 'stackoverflow.com',
    
    // Standards Bodies
    'w3.org', 'ietf.org', 'iso.org',
  ]);

  private suspiciousDomains = new Set([
    'blogspot.com', 'wordpress.com', 'wixsite.com', 'weebly.com',
    // Add more as needed
  ]);

  /**
   * Assess the quality of a source
   */
  async assessSource(params: {
    url: string;
    title: string;
    content: string;
    byline?: string;
    siteName?: string;
    extractedDate?: string;
  }): Promise<SourceQualityScore> {
    const domain = this.extractDomain(params.url);
    
    // Calculate individual scores
    const domainReputation = this.assessDomainReputation(domain);
    const freshness = this.assessFreshness(params.extractedDate);
    const contentQuality = this.assessContentQuality({
      content: params.content,
      title: params.title,
      byline: params.byline,
    });
    const credibility = this.assessCredibility({
      domain,
      byline: params.byline,
      siteName: params.siteName,
      content: params.content,
    });

    // Calculate overall score (weighted average)
    const overall = Math.round(
      domainReputation * 0.3 +
      freshness * 0.2 +
      contentQuality * 0.3 +
      credibility * 0.2
    );

    // Generate flags and recommendations
    const flags = this.generateFlags({
      domain,
      domainReputation,
      freshness,
      contentQuality,
      credibility,
      byline: params.byline,
    });

    const recommendations = this.generateRecommendations({
      overall,
      domainReputation,
      freshness,
      contentQuality,
      credibility,
    });

    return {
      overall,
      breakdown: {
        domainReputation,
        freshness,
        contentQuality,
        credibility,
      },
      flags,
      recommendations,
      metadata: {
        domain,
        publishDate: params.extractedDate,
        wordCount: params.content.split(/\s+/).length,
        hasAuthor: Boolean(params.byline),
        hasSources: this.detectSources(params.content),
      },
    };
  }

  /**
   * Assess domain reputation
   */
  private assessDomainReputation(domain: string): number {
    // Trusted domains
    if (this.trustedDomains.has(domain)) {
      return 95;
    }

    // Known academic/research TLDs
    if (domain.endsWith('.edu') || domain.endsWith('.gov')) {
      return 90;
    }

    // Suspicious domains
    if (this.suspiciousDomains.has(domain)) {
      return 40;
    }

    // Common TLDs
    if (domain.endsWith('.org')) {
      return 70;
    }

    if (domain.endsWith('.com')) {
      return 60;
    }

    // Unknown TLDs
    if (domain.match(/\.(tk|ml|ga|cf|gq)$/)) {
      return 30; // Free TLDs often used for spam
    }

    // Default
    return 50;
  }

  /**
   * Assess content freshness
   */
  private assessFreshness(dateString?: string): number {
    if (!dateString) {
      return 50; // Unknown date
    }

    try {
      const publishDate = new Date(dateString);
      const now = new Date();
      const ageInDays = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);

      // Scoring based on age
      if (ageInDays < 30) return 100; // Less than 1 month
      if (ageInDays < 90) return 90;  // Less than 3 months
      if (ageInDays < 180) return 80; // Less than 6 months
      if (ageInDays < 365) return 70; // Less than 1 year
      if (ageInDays < 730) return 60; // Less than 2 years
      if (ageInDays < 1825) return 40; // Less than 5 years
      return 20; // Older than 5 years
    } catch (error) {
      return 50; // Invalid date
    }
  }

  /**
   * Assess content quality
   */
  private assessContentQuality(params: {
    content: string;
    title: string;
    byline?: string;
  }): number {
    let score = 50; // Base score

    const wordCount = params.content.split(/\s+/).length;
    const sentences = params.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = wordCount / (sentences.length || 1);

    // Word count scoring
    if (wordCount < 100) {
      score -= 20; // Too short
    } else if (wordCount < 300) {
      score -= 10;
    } else if (wordCount > 500 && wordCount < 3000) {
      score += 20; // Good length
    } else if (wordCount > 3000) {
      score += 10; // Very detailed
    }

    // Sentence structure
    if (avgWordsPerSentence > 10 && avgWordsPerSentence < 25) {
      score += 10; // Good readability
    }

    // Has author
    if (params.byline) {
      score += 10;
    }

    // Title quality (not too short, not all caps)
    if (params.title.length > 10 && params.title.length < 100) {
      score += 5;
    }
    if (params.title !== params.title.toUpperCase()) {
      score += 5; // Not clickbait-style all caps
    }

    // Detect quality indicators
    const hasReferences = /references|bibliography|sources|citations/i.test(params.content);
    if (hasReferences) score += 10;

    const hasLinks = /https?:\/\//i.test(params.content);
    if (hasLinks) score += 5;

    // Detect low-quality indicators
    const hasExcessiveAds = /advertisement|sponsored|affiliate/gi.test(params.content);
    if (hasExcessiveAds) score -= 10;

    const hasClickbait = /(you won't believe|shocking|this one trick)/i.test(params.title);
    if (hasClickbait) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Assess credibility
   */
  private assessCredibility(params: {
    domain: string;
    byline?: string;
    siteName?: string;
    content: string;
  }): number {
    let score = 50; // Base score

    // Has author
    if (params.byline) {
      score += 15;
      
      // Author has credentials (Dr., PhD, etc.)
      if (/\b(Dr\.|PhD|Professor|Prof\.)\b/i.test(params.byline)) {
        score += 10;
      }
    }

    // Has site name
    if (params.siteName) {
      score += 5;
    }

    // Content has citations/references
    const citationCount = (params.content.match(/\[\d+\]|\(\d{4}\)|et al\./g) || []).length;
    if (citationCount > 0) {
      score += Math.min(20, citationCount * 2);
    }

    // Content has quotes from experts
    const hasQuotes = /"[^"]{20,}"|said|according to/i.test(params.content);
    if (hasQuotes) {
      score += 5;
    }

    // Domain credibility
    if (this.trustedDomains.has(params.domain)) {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Detect if content has sources/references
   */
  private detectSources(content: string): boolean {
    const sourceIndicators = [
      /references/i,
      /bibliography/i,
      /sources/i,
      /citations/i,
      /\[\d+\]/,
      /doi:/i,
      /arxiv:/i,
    ];

    return sourceIndicators.some(regex => regex.test(content));
  }

  /**
   * Generate quality flags
   */
  private generateFlags(params: {
    domain: string;
    domainReputation: number;
    freshness: number;
    contentQuality: number;
    credibility: number;
    byline?: string;
  }): string[] {
    const flags: string[] = [];

    if (params.domainReputation < 50) {
      flags.push('low_domain_reputation');
    }

    if (params.freshness < 40) {
      flags.push('outdated_content');
    }

    if (params.contentQuality < 50) {
      flags.push('low_content_quality');
    }

    if (params.credibility < 50) {
      flags.push('low_credibility');
    }

    if (!params.byline) {
      flags.push('no_author');
    }

    if (this.suspiciousDomains.has(params.domain)) {
      flags.push('suspicious_domain');
    }

    return flags;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(params: {
    overall: number;
    domainReputation: number;
    freshness: number;
    contentQuality: number;
    credibility: number;
  }): string[] {
    const recommendations: string[] = [];

    if (params.overall >= 80) {
      recommendations.push('High-quality source - recommended for use');
    } else if (params.overall >= 60) {
      recommendations.push('Good source - verify key claims');
    } else if (params.overall >= 40) {
      recommendations.push('Moderate quality - cross-reference with other sources');
    } else {
      recommendations.push('Low quality - use with caution');
    }

    if (params.domainReputation < 60) {
      recommendations.push('Consider finding sources from more reputable domains');
    }

    if (params.freshness < 60) {
      recommendations.push('Look for more recent sources on this topic');
    }

    if (params.credibility < 60) {
      recommendations.push('Verify claims with additional authoritative sources');
    }

    if (params.contentQuality < 60) {
      recommendations.push('Look for more in-depth analysis');
    }

    return recommendations;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (error) {
      return url;
    }
  }

  /**
   * Detect duplicate content
   */
  async detectDuplicate(
    content: string,
    existingContents: string[]
  ): Promise<{
    isDuplicate: boolean;
    similarity: number;
    duplicateIndex?: number;
  }> {
    // Simple similarity check using word overlap
    const words = new Set(content.toLowerCase().split(/\s+/));
    
    let maxSimilarity = 0;
    let duplicateIndex = -1;

    existingContents.forEach((existing, index) => {
      const existingWords = new Set(existing.toLowerCase().split(/\s+/));
      const intersection = new Set([...words].filter(w => existingWords.has(w)));
      const union = new Set([...words, ...existingWords]);
      
      const similarity = intersection.size / union.size;
      
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        duplicateIndex = index;
      }
    });

    return {
      isDuplicate: maxSimilarity > 0.8, // 80% similarity threshold
      similarity: maxSimilarity,
      duplicateIndex: maxSimilarity > 0.8 ? duplicateIndex : undefined,
    };
  }

  /**
   * Batch assess multiple sources
   */
  async assessBatch(
    sources: Array<{
      url: string;
      title: string;
      content: string;
      byline?: string;
      siteName?: string;
      extractedDate?: string;
    }>
  ): Promise<SourceQualityScore[]> {
    return Promise.all(sources.map(source => this.assessSource(source)));
  }
}

// Singleton instance
export const sourceQualityService = new SourceQualityService();
