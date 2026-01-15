/**
 * Job Filter - Skill Extractor
 *
 * Extracts required and desired skill concepts from job descriptions.
 * Uses a pattern-based extraction approach optimized for job postings:
 *
 * 1. Split text into sections (required vs desired)
 * 2. Extract skill phrases using multiple patterns
 * 3. Filter out tools/platforms via deny-list
 * 4. Normalize and deduplicate using the skill normalizer
 * 5. Return structured extraction result with confidence scores
 */

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract required and desired skill concepts from a job description
 * @param {string} jobDescriptionText - Full job posting text
 * @param {Object} options - Extraction options
 * @param {Array} options.taxonomy - Skill taxonomy
 * @param {Object} options.fuzzyMatcher - SkillFuzzyMatcher instance
 * @param {Set} options.denyList - Tools/platforms deny-list
 * @param {Set} options.genericDenyList - Generic phrases deny-list
 * @param {Map} options.canonicalRules - Canonical mapping rules
 * @param {Map} options.synonymGroups - Synonym mappings
 * @returns {Object} Extraction result
 */
function extractRequiredSkillConcepts(jobDescriptionText, options = {}) {
  const startTime = performance.now();
  const config = (typeof window !== 'undefined' && window.SkillConstants?.EXTRACTION_CONFIG)
    ? window.SkillConstants.EXTRACTION_CONFIG
    : {};
  const minConfidence = typeof config.MIN_CONFIDENCE === 'number' ? config.MIN_CONFIDENCE : 0.5;
  // FIXED: Default to 0 (no cap) instead of 30 to match EXTRACTION_CONFIG.MAX_SKILLS_PER_JOB
  const maxSkills = typeof config.MAX_SKILLS_PER_JOB === 'number' ? config.MAX_SKILLS_PER_JOB : 0;

  // Default options
  const {
    taxonomy = window.SkillTaxonomy?.SKILL_TAXONOMY || [],
    fuzzyMatcher = null,
    denyList = window.SkillConstants?.TOOLS_DENY_LIST || new Set(),
    genericDenyList = window.SkillConstants?.GENERIC_PHRASES_DENY_LIST || new Set(),
    canonicalRules = window.SkillTaxonomy?.CANONICAL_RULES || new Map(),
    synonymGroups = window.SkillTaxonomy?.SKILL_SYNONYM_GROUPS || new Map()
  } = options;

  // Initialize result
  const result = {
    required: [],
    desired: [],
    timestamp: Date.now(),
    jobUrl: options.jobUrl || window.location?.href || '',
    rawExtracted: [],
    confidence: 0,
    executionTime: 0,
    debug: {
      totalPhrases: 0,
      afterToolFilter: 0,
      afterGenericFilter: 0,
      afterNormalization: 0
    }
  };

  // Validate input
  if (!jobDescriptionText || typeof jobDescriptionText !== 'string') {
    result.executionTime = performance.now() - startTime;
    return result;
  }

  // Step 1: Parse sections
  const { requiredSection, desiredSection, fullText } = parseSections(jobDescriptionText);

  // Step 2: Extract phrases from each section
  const rawRequiredPhrases = extractPhrases(requiredSection || fullText);
  const rawDesiredPhrases = desiredSection ? extractPhrases(desiredSection) : [];

  // Store raw for debugging
  result.rawExtracted = [...rawRequiredPhrases, ...rawDesiredPhrases];
  result.debug.totalPhrases = result.rawExtracted.length;

  // Step 3: Filter out tools/platforms
  const filteredRequiredPhrases = filterToolsPlatforms(rawRequiredPhrases, denyList);
  const filteredDesiredPhrases = filterToolsPlatforms(rawDesiredPhrases, denyList);

  result.debug.afterToolFilter = filteredRequiredPhrases.length + filteredDesiredPhrases.length;

  // Step 4: Filter out generic phrases
  const cleanRequiredPhrases = filterGenericPhrases(filteredRequiredPhrases, genericDenyList);
  const cleanDesiredPhrases = filterGenericPhrases(filteredDesiredPhrases, genericDenyList);

  result.debug.afterGenericFilter = cleanRequiredPhrases.length + cleanDesiredPhrases.length;

  // Step 5: Normalize and deduplicate using SkillNormalizer
  const normalizerOptions = {
    taxonomy,
    canonicalRules,
    synonymGroups,
    fuzzyMatcher
  };

  const normalizedRequired = window.SkillNormalizer
    ? window.SkillNormalizer.normalizeAndDeduplicate(cleanRequiredPhrases, normalizerOptions)
    : cleanRequiredPhrases.map(p => ({ original: p, normalized: p, confidence: 0.5 }));

  const normalizedDesired = window.SkillNormalizer
    ? window.SkillNormalizer.normalizeAndDeduplicate(cleanDesiredPhrases, normalizerOptions)
    : cleanDesiredPhrases.map(p => ({ original: p, normalized: p, confidence: 0.5 }));

  result.debug.afterNormalization = normalizedRequired.length + normalizedDesired.length;

  // DEBUG: Log filtering stages
  if (result.debug.totalPhrases === 0) {
    console.log('[SkillExtractor] DEBUG: No phrases extracted from text. Text length:', jobDescriptionText?.length || 0);
  } else {
    console.log('[SkillExtractor] DEBUG: Extraction pipeline:', {
      rawPhrases: result.debug.totalPhrases,
      afterToolFilter: result.debug.afterToolFilter,
      afterGenericFilter: result.debug.afterGenericFilter,
      afterNormalization: result.debug.afterNormalization,
      sampleRaw: result.rawExtracted.slice(0, 5),
      cleanRequired: cleanRequiredPhrases.slice(0, 5),
      normalizedRequired: normalizedRequired.slice(0, 5).map(s => ({
        original: s.original,
        confidence: s.confidence,
        matchedSkill: s.matchedSkill?.name
      }))
    });
  }

  // Step 6: Build final skill arrays
  result.required = normalizedRequired
    .filter(s => s.confidence >= minConfidence)
    .map(s => ({
      name: s.matchedSkill?.name || s.normalized || s.original,
      canonical: s.canonical || toCanonicalKey(s.original),
      category: s.matchedSkill?.category || 'Other',
      confidence: s.confidence,
      matchType: s.matchType || 'extracted'
    }));

  result.desired = normalizedDesired
    .filter(s => s.confidence >= minConfidence)
    .map(s => ({
      name: s.matchedSkill?.name || s.normalized || s.original,
      canonical: s.canonical || toCanonicalKey(s.original),
      category: s.matchedSkill?.category || 'Other',
      confidence: s.confidence,
      matchType: s.matchType || 'extracted'
    }));

  // DEBUG: Log final results
  if (result.required.length === 0 && result.desired.length === 0 && result.debug.afterNormalization > 0) {
    console.log('[SkillExtractor] DEBUG: All skills filtered by confidence threshold:', minConfidence);
  }

  // Remove duplicates between required and desired (required wins)
  const requiredCanonicals = new Set(result.required.map(s => s.canonical));
  result.desired = result.desired.filter(s => !requiredCanonicals.has(s.canonical));

  // Cap total skills to avoid overwhelming output (keep highest confidence)
  if (maxSkills > 0) {
    const combined = [...result.required, ...result.desired].sort((a, b) => b.confidence - a.confidence);
    const capped = combined.slice(0, maxSkills);
    const cappedCanonicals = new Set(capped.map(s => s.canonical));
    result.required = result.required.filter(s => cappedCanonicals.has(s.canonical));
    result.desired = result.desired.filter(s => cappedCanonicals.has(s.canonical));
  }

  // Step 7: Calculate overall confidence
  const allSkills = [...result.required, ...result.desired];
  if (allSkills.length > 0) {
    const totalConfidence = allSkills.reduce((sum, s) => sum + s.confidence, 0);
    result.confidence = totalConfidence / allSkills.length;
  }

  // Calculate execution time
  result.executionTime = performance.now() - startTime;

  console.log(`[SkillExtractor] Extracted ${result.required.length} required, ${result.desired.length} desired skills in ${result.executionTime.toFixed(2)}ms`);

  return result;
}

// ============================================================================
// SECTION PARSING
// ============================================================================

/**
 * Parse job description into required and desired sections
 * @param {string} text - Full job description
 * @returns {Object} Parsed sections
 */
function parseSections(text) {
  const result = {
    requiredSection: null,
    desiredSection: null,
    fullText: text
  };

  // Required section patterns
  const requiredPatterns = [
    /(?:required|minimum|essential|must[\s-]have|basic)\s*(?:skills?|qualifications?|requirements?|experience)?\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice[\s-]to[\s-]have|bonus|additional|plus|ideal|$))/gi,
    /what\s+(?:you(?:'ll)?|we(?:'re)?)\s+(?:need|looking\s+for)\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice[\s-]to[\s-]have|bonus|plus|$))/gi,
    /you\s+(?:should|must)\s+have\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice[\s-]to[\s-]have|$))/gi
  ];

  // Desired section patterns
  const desiredPatterns = [
    /(?:preferred|desired|nice[\s-]to[\s-]have|bonus|additional|plus)\s*(?:skills?|qualifications?|requirements?|experience)?\s*:?\s*([\s\S]*?)(?=(?:about\s+(?:us|the\s+company)|benefits|what\s+we\s+offer|$))/gi,
    /it(?:'s)?\s+a\s+plus\s+if\s*:?\s*([\s\S]*?)(?=(?:about|benefits|what\s+we|$))/gi
  ];

  // Try to extract required section
  for (const pattern of requiredPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      result.requiredSection = match[1].trim();
      break;
    }
    pattern.lastIndex = 0; // Reset for next iteration
  }

  // Try to extract desired section
  for (const pattern of desiredPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      result.desiredSection = match[1].trim();
      break;
    }
    pattern.lastIndex = 0;
  }

  // If no sections found, treat full text as required
  if (!result.requiredSection && !result.desiredSection) {
    result.requiredSection = text;
  }

  return result;
}

// ============================================================================
// PHRASE EXTRACTION
// ============================================================================

/**
 * Extract skill phrases from text using multiple strategies
 * @param {string} text - Section text
 * @returns {string[]} Extracted phrases
 */
function extractPhrases(text) {
  if (!text) return [];
  const config = (typeof window !== 'undefined' && window.SkillConstants?.EXTRACTION_CONFIG)
    ? window.SkillConstants.EXTRACTION_CONFIG
    : {};
  const minLength = typeof config.MIN_PHRASE_LENGTH === 'number' ? config.MIN_PHRASE_LENGTH : 2;
  const maxWords = typeof config.MAX_PHRASE_WORDS === 'number' ? config.MAX_PHRASE_WORDS : 5;

  const phrases = new Set();

  // Strategy 1: Extract bullet point items
  extractBulletItems(text).forEach(p => phrases.add(p));

  // Strategy 2: Extract phrases after skill indicators
  extractIndicatorPhrases(text).forEach(p => phrases.add(p));

  // Strategy 3: Direct taxonomy matching
  extractTaxonomyMatches(text).forEach(p => phrases.add(p));

  // Strategy 4: Extract comma-separated skills in skill lists
  extractCommaSeparated(text).forEach(p => phrases.add(p));

  // Clean and return
  return Array.from(phrases)
    .map(p => cleanExtractedPhrase(p))
    .filter(p => {
      if (!p || p.length < minLength || p.length > 50) return false;
      const wordCount = p.split(/\s+/).length;
      return wordCount <= maxWords;
    });
}

/**
 * Extract items from bullet points
 * @param {string} text - Input text
 * @returns {string[]} Bullet items
 */
function extractBulletItems(text) {
  const items = [];

  // Match various bullet formats
  const bulletPattern = /^[\s]*[•\-\*\u2022\u25E6\u25AA\u25CF\d.)]+\s*(.+)$/gm;

  let match;
  while ((match = bulletPattern.exec(text)) !== null) {
    const item = match[1].trim();
    if (item && item.length >= 2) {
      // If item contains a colon, take what's after it (often "Skill: description")
      const colonSplit = item.split(':');
      if (colonSplit.length === 2 && colonSplit[0].length < 50) {
        items.push(colonSplit[0].trim());
      } else {
        items.push(item);
      }
    }
  }

  return items;
}

/**
 * Extract phrases after skill indicator words
 * @param {string} text - Input text
 * @returns {string[]} Extracted phrases
 */
function extractIndicatorPhrases(text) {
  const phrases = [];
  const lowerText = text.toLowerCase();

  // Patterns to find skills after indicators
  const indicatorPatterns = [
    /experience\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /proficiency\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /expertise\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /knowledge\s+of\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /skilled?\s+(?:in|at|with)\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /background\s+in\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /understanding\s+of\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /strong\s+([a-z][a-z\s\/&,()-]{2,40})\s+skills?/gi,
    /proven\s+([a-z][a-z\s\/&,()-]{2,40})\s+(?:skills?|ability|experience)/gi,
    /responsible\s+for\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /accountable\s+for\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /experience\s+(?:scaling|building|owning)\s+([a-z][a-z\s\/&,()-]{2,50})/gi
  ];

  for (const pattern of indicatorPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[1].trim();
      if (phrase) {
        phrases.push(phrase);
      }
    }
    pattern.lastIndex = 0;
  }

  return phrases;
}

/**
 * Extract direct matches from taxonomy
 * @param {string} text - Input text
 * @returns {string[]} Matched terms
 */
function extractTaxonomyMatches(text) {
  const matches = [];
  const lowerText = text.toLowerCase();

  // Get taxonomy if available
  const taxonomy = window.SkillTaxonomy?.SKILL_TAXONOMY || [];

  for (const skill of taxonomy) {
    // Check main name
    if (lowerText.includes(skill.name.toLowerCase())) {
      matches.push(skill.name);
    }

    // Check aliases
    if (skill.aliases) {
      for (const alias of skill.aliases) {
        if (lowerText.includes(alias.toLowerCase())) {
          matches.push(alias);
          break; // Only add once per skill
        }
      }
    }
  }

  return matches;
}

/**
 * Extract comma-separated skills from skill list patterns
 * @param {string} text - Input text
 * @returns {string[]} Extracted skills
 */
function extractCommaSeparated(text) {
  const skills = [];

  // Look for patterns like "Skills: X, Y, Z" or "including X, Y, and Z"
  const listPatterns = [
    /(?:skills?|technologies|tools)\s*(?:include|:)\s*([^.]+)/gi,
    /(?:including|such\s+as|e\.g\.?,?)\s*([^.]+)/gi
  ];

  for (const pattern of listPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const listText = match[1];
      // Split by comma, "and", "or"
      const items = listText.split(/\s*,\s*|\s+and\s+|\s+or\s+/);
      items.forEach(item => {
        const cleaned = item.trim().replace(/^(and|or)\s+/i, '');
        if (cleaned && cleaned.length >= 2 && cleaned.length <= 40) {
          skills.push(cleaned);
        }
      });
    }
    pattern.lastIndex = 0;
  }

  return skills;
}

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Filter out tools and platforms from phrases
 * @param {string[]} phrases - Extracted phrases
 * @param {Set} denyList - Tools deny-list
 * @returns {string[]} Filtered phrases
 */
function filterToolsPlatforms(phrases, denyList) {
  return phrases.filter(phrase => {
    const lower = phrase.toLowerCase().trim();

    // Direct deny-list match
    if (denyList.has(lower)) {
      return false;
    }

    // Partial match check
    for (const tool of denyList) {
      // Only filter if the phrase IS the tool or starts with it
      if (lower === tool || lower.startsWith(tool + ' ') || lower.endsWith(' ' + tool)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter out generic/noise phrases
 * @param {string[]} phrases - Input phrases
 * @param {Set} genericList - Generic phrases deny-list
 * @returns {string[]} Filtered phrases
 */
function filterGenericPhrases(phrases, genericList) {
  return phrases.filter(phrase => {
    const lower = phrase.toLowerCase().trim();
    return !genericList.has(lower);
  });
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Clean an extracted phrase
 * @param {string} phrase - Raw phrase
 * @returns {string} Cleaned phrase
 */
function cleanExtractedPhrase(phrase) {
  if (!phrase) return '';

  return phrase
    .trim()
    // Remove leading/trailing punctuation
    .replace(/^[,.\s\-•*:]+|[,.\s\-•*:]+$/g, '')
    // Remove parenthetical content
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    // Remove "X years" patterns
    .replace(/\d+\+?\s*years?\s*(of\s+)?/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

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

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillExtractor = {
    extractRequiredSkillConcepts,
    parseSections,
    extractPhrases,
    filterToolsPlatforms,
    filterGenericPhrases,
    cleanExtractedPhrase,
    toCanonicalKey
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractRequiredSkillConcepts,
    parseSections,
    extractPhrases,
    filterToolsPlatforms,
    filterGenericPhrases,
    cleanExtractedPhrase,
    toCanonicalKey
  };
}
