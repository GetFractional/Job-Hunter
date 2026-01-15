/**
 * Job Filter - Skill Matcher
 *
 * Compares extracted required skills against user profile skills to calculate:
 * - Matched skills (user HAS these required skills)
 * - Missing skills (user LACKS these required skills)
 * - Skill match ratio (matched / required)
 * - Desired skills the user is missing
 */

// ============================================================================
// MAIN MATCHING FUNCTION
// ============================================================================

/**
 * Match extracted skills against user profile skills
 * @param {Object[]} requiredSkills - Array of required skills from extraction
 * @param {string[]} userProfileSkills - Array of skill names from user's saved profile
 * @param {Object} options - Matching options
 * @param {Array} options.taxonomy - Skill taxonomy for normalization
 * @param {Object} options.fuzzyMatcher - SkillFuzzyMatcher instance
 * @param {number} options.matchThreshold - Similarity threshold for fuzzy matching (default 0.7)
 * @returns {Object} Match result
 */
function matchSkillConcepts(requiredSkills, userProfileSkills, options = {}) {
  const {
    taxonomy = window.SkillTaxonomy?.SKILL_TAXONOMY || [],
    fuzzyMatcher = null,
    matchThreshold = 0.7
  } = options;

  const result = {
    matched: [],
    missing: [],
    ratio: 0,
    matchedDetails: [],
    missingDetails: [],
    userSkillCount: userProfileSkills?.length || 0,
    requiredSkillCount: requiredSkills?.length || 0
  };

  // Validate inputs
  if (!requiredSkills || requiredSkills.length === 0) {
    return result;
  }

  if (!userProfileSkills || userProfileSkills.length === 0) {
    result.missing = requiredSkills.map(s => s.name || s);
    result.missingDetails = requiredSkills.map(s => ({
      name: s.name || s,
      canonical: s.canonical || toCanonicalKey(s.name || s),
      category: s.category || 'Other',
      confidence: s.confidence || 1
    }));
    return result;
  }

  // Normalize user profile skills for comparison
  const normalizedUserSkills = normalizeUserSkills(userProfileSkills, taxonomy);

  // Create a Set of canonical user skill keys for fast lookup
  const userSkillKeys = new Set(normalizedUserSkills.map(s => s.canonical));
  const userSkillNames = new Set(normalizedUserSkills.map(s => s.name.toLowerCase()));

  // Match each required skill against user profile
  for (const reqSkill of requiredSkills) {
    const reqCanonical = reqSkill.canonical || toCanonicalKey(reqSkill.name || reqSkill);
    const reqName = (reqSkill.name || reqSkill).toLowerCase();

    // Check for exact canonical match
    if (userSkillKeys.has(reqCanonical)) {
      result.matched.push(reqSkill.name || reqSkill);
      result.matchedDetails.push({
        name: reqSkill.name || reqSkill,
        canonical: reqCanonical,
        category: reqSkill.category || 'Other',
        matchType: 'exact',
        confidence: 1
      });
      continue;
    }

    // Check for exact name match
    if (userSkillNames.has(reqName)) {
      result.matched.push(reqSkill.name || reqSkill);
      result.matchedDetails.push({
        name: reqSkill.name || reqSkill,
        canonical: reqCanonical,
        category: reqSkill.category || 'Other',
        matchType: 'exact',
        confidence: 1
      });
      continue;
    }

    // Try fuzzy matching
    let foundMatch = false;
    if (fuzzyMatcher || window.FuzzyUtils) {
      const calcSimilarity = window.FuzzyUtils?.calculateSimilarity || calculateSimilarity;

      for (const userSkill of normalizedUserSkills) {
        const similarity = calcSimilarity(reqName, userSkill.name.toLowerCase());

        if (similarity >= matchThreshold) {
          result.matched.push(reqSkill.name || reqSkill);
          result.matchedDetails.push({
            name: reqSkill.name || reqSkill,
            canonical: reqCanonical,
            category: reqSkill.category || 'Other',
            matchType: 'fuzzy',
            confidence: similarity,
            matchedWith: userSkill.name
          });
          foundMatch = true;
          break;
        }
      }
    }

    // If no match found, add to missing
    if (!foundMatch) {
      result.missing.push(reqSkill.name || reqSkill);
      result.missingDetails.push({
        name: reqSkill.name || reqSkill,
        canonical: reqCanonical,
        category: reqSkill.category || 'Other',
        confidence: reqSkill.confidence || 1
      });
    }
  }

  // Calculate match ratio
  if (requiredSkills.length > 0) {
    result.ratio = result.matched.length / requiredSkills.length;
  }

  return result;
}

/**
 * Match desired skills against user profile
 * @param {Object[]} desiredSkills - Array of desired skills from extraction
 * @param {string[]} userProfileSkills - User's profile skills
 * @param {Object} options - Matching options
 * @returns {Object} Match result with desired skills user is missing
 */
function matchDesiredSkills(desiredSkills, userProfileSkills, options = {}) {
  const {
    taxonomy = window.SkillTaxonomy?.SKILL_TAXONOMY || [],
    matchThreshold = 0.7
  } = options;

  if (!desiredSkills || desiredSkills.length === 0) {
    return { hasAll: true, missing: [], has: [] };
  }

  // Normalize user skills
  const normalizedUserSkills = normalizeUserSkills(userProfileSkills, taxonomy);
  const userSkillNames = new Set(normalizedUserSkills.map(s => s.name.toLowerCase()));
  const userSkillKeys = new Set(normalizedUserSkills.map(s => s.canonical));

  const has = [];
  const missing = [];

  for (const desiredSkill of desiredSkills) {
    const canonical = desiredSkill.canonical || toCanonicalKey(desiredSkill.name || desiredSkill);
    const name = (desiredSkill.name || desiredSkill).toLowerCase();

    if (userSkillKeys.has(canonical) || userSkillNames.has(name)) {
      has.push(desiredSkill.name || desiredSkill);
    } else {
      // Check fuzzy match
      let foundMatch = false;
      const calcSimilarity = window.FuzzyUtils?.calculateSimilarity || calculateSimilarity;

      for (const userSkill of normalizedUserSkills) {
        const similarity = calcSimilarity(name, userSkill.name.toLowerCase());
        if (similarity >= matchThreshold) {
          has.push(desiredSkill.name || desiredSkill);
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        missing.push(desiredSkill.name || desiredSkill);
      }
    }
  }

  return {
    hasAll: missing.length === 0,
    missing,
    has,
    ratio: has.length / desiredSkills.length
  };
}

// ============================================================================
// USER SKILL NORMALIZATION
// ============================================================================

/**
 * Normalize user profile skills to match extraction format
 * @param {string[]} userSkills - Raw user skill strings
 * @param {Array} taxonomy - Skill taxonomy
 * @returns {Object[]} Normalized user skills
 */
function normalizeUserSkills(userSkills, taxonomy = []) {
  if (!userSkills || !Array.isArray(userSkills)) return [];

  // Build a lookup map from taxonomy
  const taxonomyLookup = new Map();
  for (const skill of taxonomy) {
    taxonomyLookup.set(skill.name.toLowerCase(), skill);
    taxonomyLookup.set(skill.canonical, skill);
    if (skill.aliases) {
      for (const alias of skill.aliases) {
        taxonomyLookup.set(alias.toLowerCase(), skill);
      }
    }
  }

  const normalizedList = userSkills.map((userSkill) => {
    const raw = (typeof userSkill === 'object' && userSkill !== null)
      ? (userSkill.name || userSkill.label || userSkill.value || '')
      : userSkill;
    const normalized = (raw || '').toLowerCase().trim();

    // Try to find in taxonomy
    const taxonomyMatch = taxonomyLookup.get(normalized);

    if (taxonomyMatch) {
      return {
        name: taxonomyMatch.name,
        canonical: taxonomyMatch.canonical,
        category: taxonomyMatch.category,
        original: raw || userSkill
      };
    }

    // Return as-is if not in taxonomy
    return {
      name: raw || userSkill,
      canonical: toCanonicalKey(raw || userSkill),
      category: 'Other',
      original: raw || userSkill
    };
  });
  const deduped = new Map();
  normalizedList.forEach((skill) => {
    if (!skill?.canonical) return;
    if (!deduped.has(skill.canonical)) {
      deduped.set(skill.canonical, skill);
    }
  });
  return Array.from(deduped.values());
}

// ============================================================================
// COMPLETE SKILL ANALYSIS
// ============================================================================

/**
 * Perform complete skill analysis: extract, match, and score
 * @param {string} jobDescriptionText - Full job description
 * @param {string[]} userProfileSkills - User's profile skills
 * @param {Object} options - Analysis options
 * @returns {Object} Complete analysis result
 */
function analyzeJobSkillFit(jobDescriptionText, userProfileSkills, options = {}) {
  const startTime = performance.now();

  // Step 1: Extract skills from job description
  const extraction = window.SkillExtractor
    ? window.SkillExtractor.extractRequiredSkillConcepts(jobDescriptionText, options)
    : { required: [], desired: [], confidence: 0 };

  // Step 2: Match required skills
  const requiredMatch = matchSkillConcepts(
    extraction.required,
    userProfileSkills,
    options
  );

  // Step 3: Match desired skills
  const desiredMatch = matchDesiredSkills(
    extraction.desired,
    userProfileSkills,
    options
  );

  // Step 4: Calculate overall skill fit score (0-100)
  const skillFitScore = calculateSkillFitScore(requiredMatch, desiredMatch);

  // Step 5: Build comprehensive result
  return {
    // Extraction results
    extraction: {
      required: extraction.required,
      desired: extraction.desired,
      extractionConfidence: extraction.confidence,
      executionTime: extraction.executionTime
    },

    // Match results
    match: {
      matched: requiredMatch.matched,
      missing: requiredMatch.missing,
      matchRatio: requiredMatch.ratio,
      matchedDetails: requiredMatch.matchedDetails,
      missingDetails: requiredMatch.missingDetails
    },

    // Desired skills
    desired: {
      has: desiredMatch.has,
      missing: desiredMatch.missing,
      ratio: desiredMatch.ratio
    },

    // Scores
    skillFitScore: skillFitScore.overall,
    skillFitLabel: getSkillFitLabel(skillFitScore.overall),
    breakdown: skillFitScore.breakdown,

    // Metadata
    userSkillCount: userProfileSkills?.length || 0,
    requiredSkillCount: extraction.required.length,
    desiredSkillCount: extraction.desired.length,
    analysisTime: performance.now() - startTime,

    // For Airtable
    airtablePayload: formatForAirtable(requiredMatch, desiredMatch, extraction)
  };
}

/**
 * Calculate skill fit score (0-100)
 * @param {Object} requiredMatch - Required skills match result
 * @param {Object} desiredMatch - Desired skills match result
 * @returns {Object} Score breakdown
 */
function calculateSkillFitScore(requiredMatch, desiredMatch) {
  // Required skills are weighted 80%, desired 20%
  const requiredScore = (requiredMatch.ratio || 0) * 80;
  const desiredScore = (desiredMatch.ratio || 0) * 20;
  const overall = Math.round(requiredScore + desiredScore);

  return {
    overall: Math.min(100, overall),
    breakdown: {
      requiredScore: Math.round(requiredScore),
      desiredScore: Math.round(desiredScore),
      requiredRatio: requiredMatch.ratio,
      desiredRatio: desiredMatch.ratio
    }
  };
}

/**
 * Get skill fit label for score
 * @param {number} score - Skill fit score (0-100)
 * @returns {string} Fit label
 */
function getSkillFitLabel(score) {
  if (score >= 90) return 'Excellent Match';
  if (score >= 75) return 'Strong Match';
  if (score >= 60) return 'Good Match';
  if (score >= 45) return 'Moderate Match';
  if (score >= 30) return 'Partial Match';
  return 'Weak Match';
}

// ============================================================================
// AIRTABLE FORMATTING
// ============================================================================

/**
 * Format skill analysis results for Airtable
 * @param {Object} requiredMatch - Required skills match result
 * @param {Object} desiredMatch - Desired skills match result
 * @param {Object} extraction - Extraction result
 * @returns {Object} Airtable payload
 */
function formatForAirtable(requiredMatch, desiredMatch, extraction) {
  return {
    'Matched Skills': requiredMatch.matched.join(', '),
    'Missing Skills': requiredMatch.missing.join(', '),
    'Skill Match Ratio': `${(requiredMatch.ratio * 100).toFixed(1)}%`,
    'Desired Skills Missing': desiredMatch.missing.join(', '),
    'Overall Confidence': extraction.confidence,
    'Required Skills Count': extraction.required.length,
    'Extracted At': new Date().toISOString()
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert phrase to canonical key
 * @param {string} phrase - Input phrase
 * @returns {string} Canonical key
 */
function toCanonicalKey(phrase) {
  return (phrase || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
}

/**
 * Simple string similarity (fallback if FuzzyUtils not available)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity (0-1)
 */
function calculateSimilarity(str1, str2) {
  const s1 = (str1 || '').toLowerCase().trim();
  const s2 = (str2 || '').toLowerCase().trim();

  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  // Simple Jaccard similarity on tokens
  const tokens1 = new Set(s1.split(/\s+/));
  const tokens2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillMatcher = {
    matchSkillConcepts,
    matchDesiredSkills,
    normalizeUserSkills,
    analyzeJobSkillFit,
    calculateSkillFitScore,
    getSkillFitLabel,
    formatForAirtable,
    toCanonicalKey
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    matchSkillConcepts,
    matchDesiredSkills,
    normalizeUserSkills,
    analyzeJobSkillFit,
    calculateSkillFitScore,
    getSkillFitLabel,
    formatForAirtable,
    toCanonicalKey
  };
}
