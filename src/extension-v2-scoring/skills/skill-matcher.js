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
 * v2 Upgrade: Uses 3-bucket system (CORE_SKILLS, TOOLS, CANDIDATES) with dual-bucket scoring
 * @param {string} jobDescriptionText - Full job description
 * @param {string[]} userProfileSkills - User's profile skills
 * @param {Object} options - Analysis options
 * @returns {Object} Complete analysis result
 */
function analyzeJobSkillFit(jobDescriptionText, userProfileSkills, options = {}) {
  const startTime = performance.now();

  // Check if v2 modules are available
  const hasV2Modules = window.SkillClassifier && window.RequirementDetector && window.FitScoreCalculator;

  if (hasV2Modules) {
    return analyzeJobSkillFitV2(jobDescriptionText, userProfileSkills, options, startTime);
  }

  // Fallback to v1 analysis if v2 modules not loaded
  return analyzeJobSkillFitV1(jobDescriptionText, userProfileSkills, options, startTime);
}

/**
 * v2 Analysis: Full skill extraction with 3-bucket classification
 * @private
 */
async function analyzeJobSkillFitV2(jobDescriptionText, userProfileSkills, options, startTime) {
  try {
    // Step 1: Extract raw skill phrases from job description
    const extraction = window.SkillExtractor
      ? window.SkillExtractor.extractRequiredSkillConcepts(jobDescriptionText, options)
      : { required: [], desired: [], confidence: 0, rawExtracted: [] };

    // Step 2: Load tools dictionary and ignore rules
    const toolsDictionary = await window.SkillClassifier.loadToolsDictionary();
    const ignoreRules = await window.SkillClassifier.loadIgnoreRules();

    // Step 3: Get classification options
    const classificationOptions = {
      skillsTaxonomy: options.taxonomy || window.SkillTaxonomy?.SKILL_TAXONOMY || [],
      toolsDictionary: toolsDictionary,
      ignoreRules: ignoreRules,
      forcedCoreSkills: window.SkillConstants?.FORCED_CORE_SKILLS || new Set(['sql', 'python', 'r']),
      softSkillsPatterns: getSoftSkillsPatterns()
    };

    // Step 4: Classify extracted skills into buckets
    const allExtractedPhrases = [
      ...extraction.required.map(s => s.name || s),
      ...extraction.desired.map(s => s.name || s)
    ];

    const classified = window.SkillClassifier.classifyBatch(allExtractedPhrases, classificationOptions);

    // Step 5: Detect requirements (Required vs Desired)
    const coreSkillsWithReqs = window.RequirementDetector.detectRequirements(
      jobDescriptionText,
      classified.coreSkills.map(s => ({ raw: s.raw, canonical: s.canonical }))
    );

    const toolsWithReqs = window.RequirementDetector.detectRequirements(
      jobDescriptionText,
      classified.tools.map(s => ({ raw: s.raw, canonical: s.canonical }))
    );

    // Step 6: Build 4-bucket structure for fit score calculator
    const extractedSkillsV2 = {
      requiredCoreSkills: coreSkillsWithReqs.required.map(s => ({
        ...s,
        canonical: s.canonical || toCanonicalKey(s.raw),
        raw: s.raw,
        confidence: s.confidence || 0.8,
        evidence: s.evidence || 'Classified as required core skill',
        userHasSkill: false // Will be set by matching
      })),
      desiredCoreSkills: coreSkillsWithReqs.desired.map(s => ({
        ...s,
        canonical: s.canonical || toCanonicalKey(s.raw),
        raw: s.raw,
        confidence: s.confidence || 0.8,
        evidence: s.evidence || 'Classified as desired core skill'
      })),
      requiredTools: toolsWithReqs.required.map(s => ({
        ...s,
        canonical: s.canonical || toCanonicalKey(s.raw),
        raw: s.raw,
        confidence: s.confidence || 0.8,
        evidence: s.evidence || 'Classified as required tool',
        languageSignal: s.languageSignal
      })),
      desiredTools: toolsWithReqs.desired.map(s => ({
        ...s,
        canonical: s.canonical || toCanonicalKey(s.raw),
        raw: s.raw,
        confidence: s.confidence || 0.8,
        evidence: s.evidence || 'Classified as desired tool'
      })),
      candidates: classified.candidates
    };

    // Step 7: Build user profile for scoring
    const userProfile = buildUserProfileV2(userProfileSkills, options.taxonomy || window.SkillTaxonomy?.SKILL_TAXONOMY || [], toolsDictionary);

    // Step 8: Match and mark user skills
    markUserSkillMatches(extractedSkillsV2, userProfile);

    // Step 9: Calculate fit score using v2 calculator
    const fitScoreResult = window.FitScoreCalculator.calculateFitScore(extractedSkillsV2, userProfile);

    // Step 10: Store candidates for feedback (if CandidateManager available)
    if (window.CandidateManager && classified.candidates.length > 0) {
      const candidateItems = classified.candidates.map(c =>
        window.CandidateManager.createCandidate(c.raw, {
          inferredType: c.inferredType,
          confidence: c.confidence,
          evidence: c.evidence
        })
      );
      window.CandidateManager.storeCandidates(candidateItems);
    }

    // Step 11: Build comprehensive v2 result
    const result = {
      // v2 Extraction results (3-bucket)
      extraction: {
        requiredCoreSkills: extractedSkillsV2.requiredCoreSkills,
        desiredCoreSkills: extractedSkillsV2.desiredCoreSkills,
        requiredTools: extractedSkillsV2.requiredTools,
        desiredTools: extractedSkillsV2.desiredTools,
        candidates: extractedSkillsV2.candidates,
        extractionConfidence: extraction.confidence,
        executionTime: extraction.executionTime
      },

      // v2 Scoring results
      scoring: {
        overallScore: fitScoreResult.overallScore,
        breakdown: fitScoreResult.breakdown,
        coreSkillsDetails: fitScoreResult.coreSkillsDetails,
        toolsDetails: fitScoreResult.toolsDetails,
        penalties: fitScoreResult.penalties,
        weightsUsed: fitScoreResult.weightsUsed
      },

      // Backward compatible fields
      match: {
        matched: [
          ...fitScoreResult.coreSkillsDetails.matchedItems.map(i => i.item),
          ...fitScoreResult.toolsDetails.matchedItems.map(i => i.item)
        ],
        missing: [
          ...fitScoreResult.coreSkillsDetails.requiredMissing.map(i => i.raw || i.canonical),
          ...fitScoreResult.toolsDetails.requiredMissing.map(i => i.raw || i.canonical)
        ],
        matchRatio: fitScoreResult.overallScore
      },

      desired: {
        has: [
          ...fitScoreResult.coreSkillsDetails.matchedItems.filter(i => i.type === 'desired').map(i => i.item),
          ...fitScoreResult.toolsDetails.matchedItems.filter(i => i.type === 'desired').map(i => i.item)
        ],
        missing: [
          ...fitScoreResult.coreSkillsDetails.desiredMissing.map(i => i.raw || i.canonical),
          ...fitScoreResult.toolsDetails.desiredMissing.map(i => i.raw || i.canonical)
        ]
      },

      // Scores (0-100 scale for UI compatibility)
      skillFitScore: Math.round(fitScoreResult.overallScore * 100),
      skillFitLabel: window.FitScoreCalculator.getFitLabel(fitScoreResult.overallScore),
      breakdown: fitScoreResult.breakdown,

      // Recommendations
      recommendations: window.FitScoreCalculator.getRecommendations(fitScoreResult),

      // Metadata
      userSkillCount: userProfileSkills?.length || 0,
      requiredSkillCount: extractedSkillsV2.requiredCoreSkills.length + extractedSkillsV2.requiredTools.length,
      desiredSkillCount: extractedSkillsV2.desiredCoreSkills.length + extractedSkillsV2.desiredTools.length,
      candidateCount: classified.candidates.length,
      rejectedCount: classified.rejected.length,
      analysisTime: performance.now() - startTime,
      version: '2.0',

      // For Airtable (v2 format)
      airtablePayload: formatForAirtableV2(extractedSkillsV2, fitScoreResult, userProfile)
    };

    console.log(`[SkillMatcher v2] Analysis complete in ${result.analysisTime.toFixed(2)}ms`);
    return result;

  } catch (error) {
    console.error('[SkillMatcher v2] Analysis error:', error);
    // Fallback to v1 on error
    return analyzeJobSkillFitV1(jobDescriptionText, userProfileSkills, options, startTime);
  }
}

/**
 * v1 Analysis: Original analysis for backward compatibility
 * @private
 */
function analyzeJobSkillFitV1(jobDescriptionText, userProfileSkills, options, startTime) {
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
    version: '1.0',

    // For Airtable
    airtablePayload: formatForAirtable(requiredMatch, desiredMatch, extraction)
  };
}

/**
 * Build user profile for v2 scoring
 * Separates user skills into coreSkills and tools
 * @private
 */
function buildUserProfileV2(userProfileSkills, taxonomy, toolsDictionary) {
  const coreSkills = [];
  const tools = [];

  if (!userProfileSkills || !Array.isArray(userProfileSkills)) {
    return { coreSkills: [], tools: [] };
  }

  // Create a set of tool names for quick lookup
  const toolNames = new Set(toolsDictionary.map(t => t.canonical));
  const toolAliases = new Map();
  toolsDictionary.forEach(t => {
    (t.aliases || []).forEach(alias => {
      toolAliases.set(alias.toLowerCase(), t.canonical);
    });
  });

  for (const userSkill of userProfileSkills) {
    const skillName = typeof userSkill === 'string' ? userSkill : (userSkill.name || userSkill.label || '');
    const canonical = toCanonicalKey(skillName);

    // Check if it's a tool
    if (toolNames.has(canonical) || toolAliases.has(skillName.toLowerCase())) {
      tools.push({
        name: skillName,
        canonical: canonical
      });
    } else {
      // Default to core skill
      coreSkills.push({
        name: skillName,
        canonical: canonical
      });
    }
  }

  return { coreSkills, tools };
}

/**
 * Mark which extracted skills the user has
 * @private
 */
function markUserSkillMatches(extractedSkillsV2, userProfile) {
  const userCoreCanonicals = new Set(userProfile.coreSkills.map(s => s.canonical));
  const userToolCanonicals = new Set(userProfile.tools.map(s => s.canonical));

  // Mark core skills
  for (const skill of extractedSkillsV2.requiredCoreSkills) {
    skill.userHasSkill = userCoreCanonicals.has(skill.canonical);
  }
  for (const skill of extractedSkillsV2.desiredCoreSkills) {
    skill.userHasSkill = userCoreCanonicals.has(skill.canonical);
  }

  // Mark tools
  for (const tool of extractedSkillsV2.requiredTools) {
    tool.userHasSkill = userToolCanonicals.has(tool.canonical);
  }
  for (const tool of extractedSkillsV2.desiredTools) {
    tool.userHasSkill = userToolCanonicals.has(tool.canonical);
  }
}

/**
 * Get soft skills patterns from constants
 * @private
 */
function getSoftSkillsPatterns() {
  const patterns = window.SkillConstants?.SOFT_SKILLS_PATTERNS || [];
  return patterns.map(p => {
    if (typeof p === 'string') {
      return new RegExp(p, 'i');
    }
    return p;
  });
}

/**
 * Format results for Airtable (v2 format)
 * @private
 */
function formatForAirtableV2(extractedSkills, fitScoreResult, userProfile) {
  const matchedCoreSkills = fitScoreResult.coreSkillsDetails.matchedItems.map(i => i.item);
  const missingCoreSkills = fitScoreResult.coreSkillsDetails.requiredMissing.map(i => i.raw || i.canonical);
  const matchedTools = fitScoreResult.toolsDetails.matchedItems.map(i => i.item);
  const missingTools = fitScoreResult.toolsDetails.requiredMissing.map(i => i.raw || i.canonical);

  return {
    'Matched Core Skills': matchedCoreSkills.join(', '),
    'Missing Core Skills': missingCoreSkills.join(', '),
    'Matched Tools': matchedTools.join(', '),
    'Missing Tools': missingTools.join(', '),
    'Overall Fit Score': `${Math.round(fitScoreResult.overallScore * 100)}%`,
    'Core Skills Score': `${Math.round(fitScoreResult.breakdown.coreSkillsScore * 100)}%`,
    'Tools Score': `${Math.round(fitScoreResult.breakdown.toolsScore * 100)}%`,
    'Total Penalties': fitScoreResult.breakdown.totalPenalty.toFixed(2),
    'Required Core Skills Count': extractedSkills.requiredCoreSkills.length,
    'Required Tools Count': extractedSkills.requiredTools.length,
    'Candidates Count': extractedSkills.candidates.length,
    'Extracted At': new Date().toISOString(),
    'Version': '2.0'
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
