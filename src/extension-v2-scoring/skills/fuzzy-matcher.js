/**
 * Job Filter - Fuzzy Matcher
 *
 * Lightweight fuzzy string matching implementation for skill extraction.
 * Uses a combination of:
 * - Exact matching
 * - Levenshtein distance (edit distance)
 * - Token-based similarity (Jaccard)
 * - N-gram matching
 *
 * Inspired by Fuse.js but optimized for the skill matching use case.
 */

// ============================================================================
// FUZZY MATCHER CLASS
// ============================================================================

class SkillFuzzyMatcher {
  /**
   * Create a fuzzy matcher for skill taxonomy
   * @param {Array} skills - Array of skill objects from taxonomy
   * @param {Object} options - Configuration options
   */
  constructor(skills, options = {}) {
    this.options = {
      threshold: options.threshold || 0.35, // 0 = exact, 1 = match anything
      keys: options.keys || ['name', 'aliases'],
      minMatchCharLength: options.minMatchCharLength || 2,
      includeScore: options.includeScore !== false,
      ...options
    };

    // Build searchable index
    this.index = this._buildIndex(skills);
    this.skills = skills;

    console.log(`[FuzzyMatcher] Initialized with ${skills.length} skills, ${this.index.size} indexed terms`);
  }

  /**
   * Build searchable index from skills
   * @param {Array} skills - Skill taxonomy
   * @returns {Map} Index mapping normalized terms to skills
   */
  _buildIndex(skills) {
    const index = new Map();

    skills.forEach((skill, skillIndex) => {
      // Index the main name
      this._addToIndex(index, skill.name, skillIndex);
      this._addToIndex(index, skill.canonical, skillIndex);

      // Index all aliases
      if (skill.aliases && Array.isArray(skill.aliases)) {
        skill.aliases.forEach(alias => {
          this._addToIndex(index, alias, skillIndex);
        });
      }
    });

    return index;
  }

  /**
   * Add a term to the index
   * @param {Map} index - Index map
   * @param {string} term - Term to add
   * @param {number} skillIndex - Index of the skill in taxonomy
   */
  _addToIndex(index, term, skillIndex) {
    if (!term || typeof term !== 'string') return;

    const normalized = this._normalize(term);
    if (normalized.length < this.options.minMatchCharLength) return;

    if (!index.has(normalized)) {
      index.set(normalized, new Set());
    }
    index.get(normalized).add(skillIndex);
  }

  /**
   * Normalize a string for matching
   * @param {string} str - String to normalize
   * @returns {string} Normalized string
   */
  _normalize(str) {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\/&-]/g, '') // Remove special chars except /&-
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Search for matching skills
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Array of matching skills with scores
   */
  search(query, options = {}) {
    const normalizedQuery = this._normalize(query);
    if (normalizedQuery.length < this.options.minMatchCharLength) {
      return [];
    }

    const threshold = options.threshold || this.options.threshold;
    const limit = options.limit || 10;
    const results = [];

    // Track which skills we've already matched to avoid duplicates
    const matchedSkillIndices = new Set();

    // PASS 1: Exact match in index
    if (this.index.has(normalizedQuery)) {
      this.index.get(normalizedQuery).forEach(skillIndex => {
        if (!matchedSkillIndices.has(skillIndex)) {
          matchedSkillIndices.add(skillIndex);
          results.push({
            item: this.skills[skillIndex],
            score: 0, // Perfect match
            refIndex: skillIndex,
            matchType: 'exact'
          });
        }
      });
    }

    // If we have exact matches with score 0, return them
    if (results.some(r => r.score === 0)) {
      return results.slice(0, limit);
    }

    // PASS 2: Fuzzy match against all indexed terms
    this.index.forEach((skillIndices, indexedTerm) => {
      // Calculate similarity score
      const distance = this._levenshteinDistance(normalizedQuery, indexedTerm);
      const maxLen = Math.max(normalizedQuery.length, indexedTerm.length);
      const score = distance / maxLen; // Normalize to 0-1 range

      if (score <= threshold) {
        skillIndices.forEach(skillIndex => {
          if (!matchedSkillIndices.has(skillIndex)) {
            matchedSkillIndices.add(skillIndex);
            results.push({
              item: this.skills[skillIndex],
              score: score,
              refIndex: skillIndex,
              matchType: 'fuzzy',
              matchedTerm: indexedTerm
            });
          } else {
            // Update score if this is a better match
            const existingResult = results.find(r => r.refIndex === skillIndex);
            if (existingResult && score < existingResult.score) {
              existingResult.score = score;
              existingResult.matchedTerm = indexedTerm;
            }
          }
        });
      }
    });

    // PASS 3: Token-based matching for multi-word queries
    const queryTokens = normalizedQuery.split(/\s+/).filter(t => t.length >= 2);
    if (queryTokens.length > 1) {
      this.skills.forEach((skill, skillIndex) => {
        if (matchedSkillIndices.has(skillIndex)) return;

        const skillTokens = this._normalize(skill.name).split(/\s+/);
        const aliasTokenArrays = (skill.aliases || []).map(a =>
          this._normalize(a).split(/\s+/)
        );

        // Check token overlap
        const allSkillTokens = new Set([
          ...skillTokens,
          ...aliasTokenArrays.flat()
        ]);

        const matchedTokens = queryTokens.filter(qt =>
          Array.from(allSkillTokens).some(st =>
            st.includes(qt) || qt.includes(st)
          )
        );

        const tokenScore = 1 - (matchedTokens.length / queryTokens.length);
        if (tokenScore <= threshold) {
          matchedSkillIndices.add(skillIndex);
          results.push({
            item: skill,
            score: tokenScore,
            refIndex: skillIndex,
            matchType: 'token'
          });
        }
      });
    }

    // Sort by score (lower is better) and return top results
    return results
      .sort((a, b) => a.score - b.score)
      .slice(0, limit);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Edit distance
   */
  _levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;

    // Early exit for common cases
    if (m === 0) return n;
    if (n === 0) return m;
    if (str1 === str2) return 0;

    // Create distance matrix
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill in the rest of the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  }

  /**
   * Get all skills in a category
   * @param {string} category - Category to filter by
   * @returns {Array} Skills in the category
   */
  getByCategory(category) {
    return this.skills.filter(s => s.category === category);
  }

  /**
   * Find skill by canonical name
   * @param {string} canonical - Canonical skill name
   * @returns {Object|null} Skill object or null
   */
  findByCanonical(canonical) {
    return this.skills.find(s => s.canonical === canonical) || null;
  }

  /**
   * Get statistics about the matcher
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      totalSkills: this.skills.length,
      indexedTerms: this.index.size,
      threshold: this.options.threshold,
      categories: [...new Set(this.skills.map(s => s.category))]
    };
  }
}

// ============================================================================
// SIMPLE TEXT SIMILARITY FUNCTIONS
// For comparing user skills against extracted skills
// ============================================================================

/**
 * Calculate similarity between two strings (0-1, higher = more similar)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
  const s1 = normalizeForComparison(str1);
  const s2 = normalizeForComparison(str2);

  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  // Calculate Levenshtein-based similarity
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  const editSimilarity = 1 - (distance / maxLen);

  // Calculate token-based similarity (Jaccard)
  const tokens1 = new Set(s1.split(/\s+/));
  const tokens2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;

  // Return weighted average
  return (editSimilarity * 0.6) + (jaccardSimilarity * 0.4);
}

/**
 * Normalize string for comparison
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalizeForComparison(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Simple Levenshtein distance implementation
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;

  if (m === 0) return n;
  if (n === 0) return m;
  if (str1 === str2) return 0;

  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Check if two strings are similar enough to be considered a match
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} threshold - Similarity threshold (default 0.7)
 * @returns {boolean} True if similar enough
 */
function isSimilarMatch(str1, str2, threshold = 0.7) {
  return calculateSimilarity(str1, str2) >= threshold;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillFuzzyMatcher = SkillFuzzyMatcher;
  window.FuzzyUtils = {
    calculateSimilarity,
    normalizeForComparison,
    levenshteinDistance,
    isSimilarMatch
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SkillFuzzyMatcher,
    calculateSimilarity,
    normalizeForComparison,
    levenshteinDistance,
    isSimilarMatch
  };
}
