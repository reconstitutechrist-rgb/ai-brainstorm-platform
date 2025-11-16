/**
 * Text Similarity Utilities
 *
 * Provides text comparison functions for duplicate detection
 * and semantic matching across the platform.
 */

/**
 * Calculate Jaccard similarity between two text strings
 * Uses word overlap with filtering of short words
 *
 * @param text1 First text string
 * @param text2 Second text string
 * @param minWordLength Minimum word length to consider (default: 3)
 * @returns Similarity score between 0 and 1
 */
export function calculateJaccardSimilarity(
  text1: string,
  text2: string,
  minWordLength: number = 3
): number {
  const words1 = new Set(
    text1
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > minWordLength)
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > minWordLength)
  );

  if (words1.size === 0 && words2.size === 0) {
    return 1; // Both empty = identical
  }

  if (words1.size === 0 || words2.size === 0) {
    return 0; // One empty = no similarity
  }

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Find the best match for a text among a list of candidates
 *
 * @param text Text to match
 * @param candidates Array of candidate objects with text content
 * @param textExtractor Function to extract text from candidate
 * @returns Best match with similarity score, or null if no matches
 */
export function findBestMatch<T>(
  text: string,
  candidates: T[],
  textExtractor: (candidate: T) => string
): { item: T; similarity: number } | null {
  let bestMatch: { item: T; similarity: number } | null = null;
  let highestSimilarity = 0;

  for (const candidate of candidates) {
    const candidateText = textExtractor(candidate);
    const similarity = calculateJaccardSimilarity(text, candidateText);

    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = { item: candidate, similarity };
    }
  }

  return bestMatch;
}

/**
 * Get similarity classification based on score
 *
 * @param similarity Similarity score (0-1)
 * @returns Classification string
 */
export function classifySimilarity(similarity: number): 'none' | 'low' | 'moderate' | 'high' | 'very_high' {
  if (similarity >= 0.8) return 'very_high';
  if (similarity >= 0.65) return 'high';
  if (similarity >= 0.5) return 'moderate';
  if (similarity >= 0.3) return 'low';
  return 'none';
}

/**
 * Get recommendation for duplicate handling based on similarity
 *
 * @param similarity Similarity score (0-1)
 * @param itemState Current state of the matched item
 * @returns Recommendation action
 */
export function getDuplicateRecommendation(
  similarity: number,
  itemState: string
): 'skip' | 'merge' | 'extract_anyway' {
  if (similarity > 0.8) {
    // Very high similarity - likely duplicate
    return itemState === 'decided' ? 'skip' : 'merge';
  } else if (similarity > 0.65) {
    // High similarity - consider merging
    return 'merge';
  } else {
    // Moderate similarity - safe to extract
    return 'extract_anyway';
  }
}
