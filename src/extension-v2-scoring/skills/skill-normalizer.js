/**
 * Job Filter - Skill Normalizer
 *
 * Normalizes raw skill phrases to canonical skill concepts using a 4-pass approach:
 *
 * PASS 1: Exact Match - Direct lookup in taxonomy
 * PASS 2: Canonical Rules - Apply manual mappings (e.g., "CRO" → "conversion rate optimization")
 * PASS 3: Fuzzy Match - Use fuzzy matcher against taxonomy names + aliases
 * PASS 4: Synonym Resolution - Check if phrase is a synonym of a known skill
 *
 * Also handles:
 * - Deduplication by canonical key
 * - Confidence scoring for each match
 */

// ============================================================================
// SKILL NORMALIZER
// ============================================================================

/**
 * Normalize a skill phrase to its canonical form (v2 UPGRADE)
 * @param {string} phrase - Raw skill phrase from job description
 * @param {Object} options - Normalization options
 * @param {Array} options.taxonomy - Skill taxonomy array
 * @param {Map} options.canonicalRules - Manual mapping rules
 * @param {Map} options.synonymGroups - Synonym group mappings
 * @param {Object} options.fuzzyMatcher - SkillFuzzyMatcher instance
 * @param {boolean} options.useAliases - Enable alias matching (v2)
 * @param {boolean} options.dynamicThresholds - Use dynamic thresholds based on string length (v2)
 * @returns {Object} Normalization result
 */
function normalizeSkillConcept(phrase, options) {
  const {
    taxonomy = [],
    canonicalRules = new Map(),
    synonymGroups = new Map(),
    fuzzyMatcher = null,
    useAliases = true,  // v2 UPGRADE
    dynamicThresholds = true  // v2 UPGRADE
  } = options;
  const config = (typeof window !== 'undefined' && window.SkillConstants?.EXTRACTION_CONFIG)
    ? window.SkillConstants.EXTRACTION_CONFIG
    : {};
  const minConfidence = typeof config.MIN_CONFIDENCE === 'number' ? config.MIN_CONFIDENCE : 0.5;

  // Clean and normalize input
  const cleaned = cleanSkillPhrase(phrase);

  if (!cleaned || cleaned.length < 2) {
    return {
      normalized: null,
      canonical: null,
      matchedSkill: null,
      confidence: 0,
      matchType: 'none'
    };
  }

  // PASS 0 (v2): Check SKILL_ALIASES map first
  if (useAliases) {
    const aliasMatch = findAliasMatch(cleaned);
    if (aliasMatch) {
      // Find the skill in taxonomy that matches the resolved alias
      const resolvedSkill = findExactMatch(aliasMatch, taxonomy);
      if (resolvedSkill) {
        return {
          normalized: resolvedSkill.name,
          canonical: resolvedSkill.canonical,
          matchedSkill: resolvedSkill,
          confidence: 0.98,
          matchType: 'alias'
        };
      }
    }
  }

  // PASS 1: Exact match in taxonomy
  const exactMatch = findExactMatch(cleaned, taxonomy);
  if (exactMatch) {
    return {
      normalized: exactMatch.name,
      canonical: exactMatch.canonical,
      matchedSkill: exactMatch,
      confidence: 1.0,
      matchType: 'exact'
    };
  }

  // PASS 2: Canonical rules (manual mappings)
  const canonicalMatch = findCanonicalRuleMatch(cleaned, canonicalRules, taxonomy);
  if (canonicalMatch) {
    return {
      normalized: canonicalMatch.name,
      canonical: canonicalMatch.canonical,
      matchedSkill: canonicalMatch,
      confidence: 0.95,
      matchType: 'canonical'
    };
  }

  // PASS 3: Fuzzy match with DYNAMIC THRESHOLDS (v2 UPGRADE)
  if (fuzzyMatcher) {
    // Calculate dynamic threshold based on string length
    const fuzzyThreshold = dynamicThresholds
      ? getDynamicThreshold(cleaned)
      : (typeof config.FUZZY_THRESHOLD === 'number' ? config.FUZZY_THRESHOLD : 0.35);

    const fuzzyResults = fuzzyMatcher.search(cleaned, { limit: 1 });
    if (fuzzyResults.length > 0 && fuzzyResults[0].score <= fuzzyThreshold) {
      const match = fuzzyResults[0];
      // Convert fuzzy score (0=best) to confidence (1=best)
      const confidence = 1 - match.score;
      return {
        normalized: match.item.name,
        canonical: match.item.canonical,
        matchedSkill: match.item,
        confidence: Math.max(minConfidence, confidence),
        matchType: 'fuzzy',
        matchedTerm: match.matchedTerm,
        threshold: fuzzyThreshold  // DEBUG: include threshold used
      };
    }
  }

  // PASS 4: Synonym resolution
  const synonymMatch = findSynonymMatch(cleaned, synonymGroups, taxonomy);
  if (synonymMatch) {
    return {
      normalized: synonymMatch.name,
      canonical: synonymMatch.canonical,
      matchedSkill: synonymMatch,
      confidence: 0.85,
      matchType: 'synonym'
    };
  }

  // No match found
  return {
    normalized: cleaned,
    canonical: toCanonicalKey(cleaned),
    matchedSkill: null,
    confidence: 0.3, // Low confidence for unmatched
    matchType: 'unmatched'
  };
}

/**
 * Clean and normalize a skill phrase for matching
 * @param {string} phrase - Raw phrase
 * @returns {string} Cleaned phrase
 */
function cleanSkillPhrase(phrase) {
  if (!phrase || typeof phrase !== 'string') return '';

  return phrase
    .toLowerCase()
    .trim()
    // Remove common prefixes
    .replace(/^(experience\s+(in|with)|proficiency\s+(in|with)|knowledge\s+of|skilled?\s+(in|at|with))\s*/i, '')
    // Remove trailing qualifiers
    .replace(/\s*(experience|skills?|expertise|knowledge|proficiency)$/i, '')
    // Normalize separators
    .replace(/\s*[\/&]\s*/g, '/')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Remove parenthetical content
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
}

/**
 * Convert a phrase to a canonical key format
 * @param {string} phrase - Phrase to convert
 * @returns {string} Canonical key (lowercase, underscores)
 */
function toCanonicalKey(phrase) {
  return (phrase || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_');
}

/**
 * Find exact match in taxonomy
 * @param {string} phrase - Cleaned phrase
 * @param {Array} taxonomy - Skill taxonomy
 * @returns {Object|null} Matched skill or null
 */
function findExactMatch(phrase, taxonomy) {
  const normalized = phrase.toLowerCase();

  // Check against skill names and aliases
  for (const skill of taxonomy) {
    // Check main name
    if (skill.name.toLowerCase() === normalized) {
      return skill;
    }

    // Check canonical
    if (skill.canonical === normalized || skill.canonical === toCanonicalKey(normalized)) {
      return skill;
    }

    // Check aliases
    if (skill.aliases && skill.aliases.some(a => a.toLowerCase() === normalized)) {
      return skill;
    }
  }

  return null;
}

/**
 * Find match using canonical rules
 * @param {string} phrase - Cleaned phrase
 * @param {Map} rules - Canonical mapping rules
 * @param {Array} taxonomy - Skill taxonomy
 * @returns {Object|null} Matched skill or null
 */
function findCanonicalRuleMatch(phrase, rules, taxonomy) {
  const normalized = phrase.toLowerCase();

  // Check if phrase maps to a canonical skill via rules
  if (rules.has(normalized)) {
    const mappedSkillName = rules.get(normalized);

    // Find the skill in taxonomy by mapped name
    const skill = taxonomy.find(s =>
      s.name.toLowerCase() === mappedSkillName.toLowerCase() ||
      s.canonical === toCanonicalKey(mappedSkillName)
    );

    return skill || null;
  }

  return null;
}

/**
 * Find match in synonym groups
 * @param {string} phrase - Cleaned phrase
 * @param {Map} synonymGroups - Synonym mappings
 * @param {Array} taxonomy - Skill taxonomy
 * @returns {Object|null} Matched skill or null
 */
function findSynonymMatch(phrase, synonymGroups, taxonomy) {
  const normalized = phrase.toLowerCase();

  // Check each synonym group
  for (const [canonical, synonyms] of synonymGroups) {
    if (synonyms.some(syn => syn.toLowerCase() === normalized)) {
      // Found a matching synonym - find the skill
      const skill = taxonomy.find(s => s.canonical === canonical);
      return skill || null;
    }
  }

  return null;
}

/**
 * Find alias match in SKILL_ALIASES map (v2 UPGRADE)
 * @param {string} phrase - Cleaned phrase
 * @returns {string|null} Resolved skill name or null
 */
function findAliasMatch(phrase) {
  const aliases = window.SkillConstants?.SKILL_ALIASES;
  if (!aliases || !(aliases instanceof Map)) {
    return null;
  }

  const normalized = phrase.toLowerCase().trim();
  return aliases.get(normalized) || null;
}

/**
 * Get dynamic fuzzy matching threshold based on string length (v2 UPGRADE)
 * Short strings (GA4, CRM) need tighter matching than long phrases
 * @param {string} phrase - Cleaned phrase
 * @returns {number} Threshold value (0-1, lower = stricter)
 */
function getDynamicThreshold(phrase) {
  const length = phrase.length;

  // Short strings (<5 chars): Very strict (acronyms like GA4, CRM, SQL)
  if (length < 5) {
    return 0.2;
  }

  // Medium strings (5-15 chars): Moderate (HubSpot, Salesforce, Python)
  if (length <= 15) {
    return 0.35;
  }

  // Long phrases (>15 chars): Relaxed (lifecycle marketing, conversion rate optimization)
  return 0.50;
}

// ============================================================================
// BATCH NORMALIZATION & DEDUPLICATION
// ============================================================================

/**
 * Normalize and deduplicate a list of skill phrases
 * @param {string[]} phrases - Array of raw skill phrases
 * @param {Object} options - Normalization options
 * @returns {Object[]} Array of unique, normalized skills
 */
function normalizeAndDeduplicate(phrases, options) {
  const normalized = [];
  const seenCanonicals = new Set();

  for (const phrase of phrases) {
    if (!phrase || typeof phrase !== 'string') continue;

    const result = normalizeSkillConcept(phrase, options);

    // Skip low-confidence unmatched skills unless they're substantial
    if (result.matchType === 'unmatched' && phrase.length < 5) {
      continue;
    }

    // Deduplicate by canonical key
    const key = result.canonical || toCanonicalKey(phrase);
    if (!seenCanonicals.has(key)) {
      seenCanonicals.add(key);
      normalized.push({
        original: phrase,
        ...result
      });
    } else {
      // If we have a better match for an existing skill, update it
      const existing = normalized.find(n => (n.canonical || toCanonicalKey(n.original)) === key);
      if (existing && result.confidence > existing.confidence) {
        Object.assign(existing, result, { original: phrase });
      }
    }
  }

  // Sort by confidence (highest first)
  normalized.sort((a, b) => b.confidence - a.confidence);

  return normalized;
}

/**
 * Filter out skills that are actually tools/platforms
 * @param {Object[]} skills - Array of normalized skill objects
 * @param {Set} denyList - Set of tool/platform names to exclude
 * @returns {Object[]} Filtered skills
 */
function filterOutTools(skills, denyList) {
  return skills.filter(skill => {
    const normalized = (skill.normalized || skill.original || '').toLowerCase();
    const original = (skill.original || '').toLowerCase();

    // Check both normalized and original against deny list
    if (denyList.has(normalized) || denyList.has(original)) {
      return false;
    }

    // Check partial matches for tool names (e.g., "hubspot crm" should be filtered)
    for (const tool of denyList) {
      if (normalized.includes(tool) || original.includes(tool)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter out generic/noise phrases
 * @param {Object[]} skills - Array of normalized skill objects
 * @param {Set} genericList - Set of generic phrases to exclude
 * @returns {Object[]} Filtered skills
 */
function filterOutGeneric(skills, genericList) {
  return skills.filter(skill => {
    const normalized = (skill.normalized || skill.original || '').toLowerCase();
    const original = (skill.original || '').toLowerCase();

    return !genericList.has(normalized) && !genericList.has(original);
  });
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get the confidence level label for a score
 * @param {number} confidence - Confidence score (0-1)
 * @returns {string} Confidence label
 */
function getConfidenceLabel(confidence) {
  if (confidence >= 0.95) return 'exact';
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.7) return 'medium';
  if (confidence >= 0.5) return 'low';
  return 'uncertain';
}

/**
 * Build a quick lookup map from taxonomy
 * @param {Array} taxonomy - Skill taxonomy
 * @returns {Map} Name -> Skill lookup map
 */
function buildSkillLookupMap(taxonomy) {
  const map = new Map();

  for (const skill of taxonomy) {
    // Index by lowercase name
    map.set(skill.name.toLowerCase(), skill);

    // Index by canonical
    map.set(skill.canonical, skill);

    // Index by aliases
    if (skill.aliases) {
      for (const alias of skill.aliases) {
        map.set(alias.toLowerCase(), skill);
      }
    }
  }

  return map;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillNormalizer = {
    normalizeSkillConcept,
    cleanSkillPhrase,
    toCanonicalKey,
    normalizeAndDeduplicate,
    filterOutTools,
    filterOutGeneric,
    getConfidenceLabel,
    buildSkillLookupMap,
    findAliasMatch,  // v2 UPGRADE
    getDynamicThreshold  // v2 UPGRADE
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    normalizeSkillConcept,
    cleanSkillPhrase,
    toCanonicalKey,
    normalizeAndDeduplicate,
    filterOutTools,
    filterOutGeneric,
    getConfidenceLabel,
    buildSkillLookupMap,
    findAliasMatch,  // v2 UPGRADE
    getDynamicThreshold  // v2 UPGRADE
  };
}
