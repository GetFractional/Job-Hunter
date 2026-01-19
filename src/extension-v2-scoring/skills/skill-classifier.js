/**
 * Job Filter - Skill Classifier (v2 Upgrade)
 *
 * Rule-based classification system to categorize extracted phrases as:
 * - CORE_SKILL: Fundamental skills (SQL, Python, lifecycle marketing, etc.)
 * - TOOL: Software platforms and tools (HubSpot, Salesforce, GA4, etc.)
 * - CANDIDATE: Unclear items that need human review
 * - REJECTED: Soft skills or junk that should be discarded
 *
 * Classification uses a 4-layer approach:
 * Layer 1: Exact dictionary match → immediate classification
 * Layer 2: Forced skills (SQL, Python always CORE_SKILL)
 * Layer 3: Pattern rules (brand names → tools, -ing words → skills)
 * Layer 4: Context-based heuristics + candidates bucket
 */

// ============================================================================
// CLASSIFICATION LAYERS
// ============================================================================

/**
 * Classify a skill phrase using 4-layer rules
 * @param {string} phrase - Raw phrase from extraction
 * @param {Object} options - Classification options
 * @param {Array} options.skillsTaxonomy - Skills dictionary
 * @param {Array} options.toolsDictionary - Tools dictionary (from tools.json)
 * @param {Object} options.ignoreRules - Ignore rules (from ignore-rules.json)
 * @param {Set} options.forcedCoreSkills - Skills that are always CORE_SKILL
 * @param {Array} options.softSkillsPatterns - Soft skills regex patterns
 * @returns {Object} Classification result
 */
function classifySkillPhrase(phrase, options = {}) {
  const {
    skillsTaxonomy = [],
    toolsDictionary = [],
    ignoreRules = {},
    forcedCoreSkills = new Set(),
    softSkillsPatterns = []
  } = options;

  if (!phrase || typeof phrase !== 'string' || phrase.trim().length < 2) {
    return {
      type: 'REJECTED',
      canonical: null,
      confidence: 0,
      evidence: 'Phrase too short or invalid',
      sourceLocation: 'validation'
    };
  }

  const cleaned = phrase.toLowerCase().trim();

  // LAYER 0: Reject soft skills and junk FIRST (100% rejection)
  const softSkillCheck = checkSoftSkillRejection(cleaned, ignoreRules, softSkillsPatterns);
  if (softSkillCheck.rejected) {
    return {
      type: 'REJECTED',
      canonical: null,
      confidence: 0,
      evidence: softSkillCheck.reason,
      sourceLocation: 'layer_0_soft_skill_rejection'
    };
  }

  // LAYER 1: Exact dictionary match
  const exactMatch = checkExactDictionaryMatch(cleaned, skillsTaxonomy, toolsDictionary);
  if (exactMatch.matched) {
    return {
      type: exactMatch.type,
      canonical: exactMatch.canonical,
      confidence: 1.0,
      evidence: `Exact match in ${exactMatch.dictionary} dictionary`,
      sourceLocation: 'layer_1_exact_match',
      matchedItem: exactMatch.item
    };
  }

  // LAYER 2: Forced core skills (SQL, Python always CORE_SKILL)
  const forcedSkillCheck = checkForcedCoreSkills(cleaned, forcedCoreSkills);
  if (forcedSkillCheck.matched) {
    return {
      type: 'CORE_SKILL',
      canonical: forcedSkillCheck.canonical,
      confidence: 1.0,
      evidence: 'Forced core skill (SQL/Python/etc.)',
      sourceLocation: 'layer_2_forced_core_skill'
    };
  }

  // LAYER 3: Pattern-based classification
  const patternMatch = checkPatternRules(cleaned);
  if (patternMatch.matched) {
    return {
      type: patternMatch.type,
      canonical: patternMatch.canonical,
      confidence: patternMatch.confidence,
      evidence: patternMatch.evidence,
      sourceLocation: 'layer_3_pattern_rules'
    };
  }

  // LAYER 4: Context-based heuristics + candidates bucket
  const contextMatch = checkContextHeuristics(cleaned, phrase);
  return {
    type: contextMatch.type,
    canonical: contextMatch.canonical,
    confidence: contextMatch.confidence,
    evidence: contextMatch.evidence,
    sourceLocation: 'layer_4_context_heuristics',
    inferredType: contextMatch.inferredType
  };
}

// ============================================================================
// LAYER 0: SOFT SKILL REJECTION (100% rejection)
// ============================================================================

/**
 * Check if phrase is a soft skill that should be rejected
 * @param {string} cleaned - Cleaned phrase
 * @param {Object} ignoreRules - Ignore rules from ignore-rules.json
 * @param {Array} softSkillsPatterns - Soft skills regex patterns
 * @returns {Object} Rejection result
 */
function checkSoftSkillRejection(cleaned, ignoreRules, softSkillsPatterns) {
  // Check exact matches in soft skills list
  if (ignoreRules.softSkills?.exactMatches) {
    const exactSoftSkills = ignoreRules.softSkills.exactMatches.map(s => s.toLowerCase());
    if (exactSoftSkills.includes(cleaned)) {
      return { rejected: true, reason: `Soft skill exact match: "${cleaned}"` };
    }
  }

  // Check soft skills patterns
  for (const pattern of softSkillsPatterns) {
    if (pattern.test(cleaned)) {
      return { rejected: true, reason: `Soft skill pattern match: ${pattern}` };
    }
  }

  // Check junk phrases exact matches
  if (ignoreRules.junkPhrases?.exactMatches) {
    const exactJunk = ignoreRules.junkPhrases.exactMatches.map(s => s.toLowerCase());
    if (exactJunk.includes(cleaned)) {
      return { rejected: true, reason: `Junk phrase: "${cleaned}"` };
    }
  }

  // Check junk phrase patterns
  if (ignoreRules.junkPhrases?.patterns) {
    for (const patternObj of ignoreRules.junkPhrases.patterns) {
      const regex = new RegExp(patternObj.pattern, 'i');
      if (regex.test(cleaned)) {
        return { rejected: true, reason: `Junk pattern: ${patternObj.description}` };
      }
    }
  }

  // Check degree/education phrases
  if (ignoreRules.degreeAndEducation?.exactMatches) {
    const degrees = ignoreRules.degreeAndEducation.exactMatches.map(s => s.toLowerCase());
    if (degrees.includes(cleaned)) {
      return { rejected: true, reason: 'Education/degree phrase' };
    }
  }

  // Check too generic phrases
  if (ignoreRules.tooGeneric?.exactMatches) {
    const tooGeneric = ignoreRules.tooGeneric.exactMatches.map(s => s.toLowerCase());
    if (tooGeneric.includes(cleaned)) {
      return { rejected: true, reason: 'Too generic' };
    }
  }

  return { rejected: false };
}

// ============================================================================
// LAYER 1: EXACT DICTIONARY MATCH
// ============================================================================

/**
 * Check for exact match in skills or tools dictionaries
 * @param {string} cleaned - Cleaned phrase
 * @param {Array} skillsTaxonomy - Skills dictionary
 * @param {Array} toolsDictionary - Tools dictionary
 * @returns {Object} Match result
 */
function checkExactDictionaryMatch(cleaned, skillsTaxonomy, toolsDictionary) {
  const normalize = (value) => (value || '').toLowerCase().trim();
  const matchesSubstring = (phrase, term) => {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm || normalizedTerm.length < 4) return false;
    if (normalizedTerm.includes(' ')) {
      return phrase.includes(normalizedTerm);
    }
    return new RegExp(`\\b${normalizedTerm}\\b`, 'i').test(phrase);
  };

  // Check tools dictionary first (tools.json)
  for (const tool of toolsDictionary) {
    // Check canonical name
    if (tool.canonical === cleaned || tool.canonical.replace(/_/g, ' ') === cleaned) {
      return {
        matched: true,
        type: 'TOOL',
        canonical: tool.canonical,
        dictionary: 'tools',
        item: tool
      };
    }

    // Check display name
    if (tool.name.toLowerCase() === cleaned) {
      return {
        matched: true,
        type: 'TOOL',
        canonical: tool.canonical,
        dictionary: 'tools',
        item: tool
      };
    }

    // Check aliases
    if (tool.aliases && tool.aliases.some(a => a.toLowerCase() === cleaned)) {
      return {
        matched: true,
        type: 'TOOL',
        canonical: tool.canonical,
        dictionary: 'tools',
        item: tool
      };
    }

    // Substring match for tool names within longer phrases
    if (
      matchesSubstring(cleaned, tool.name) ||
      matchesSubstring(cleaned, tool.canonical?.replace(/_/g, ' ')) ||
      (tool.aliases && tool.aliases.some(alias => matchesSubstring(cleaned, alias)))
    ) {
      return {
        matched: true,
        type: 'TOOL',
        canonical: tool.canonical,
        dictionary: 'tools',
        item: tool,
        evidence: 'Tool name substring match'
      };
    }
  }

  // Check skills taxonomy
  for (const skill of skillsTaxonomy) {
    // Check canonical name
    if (skill.canonical === cleaned || skill.canonical.replace(/_/g, ' ') === cleaned) {
      return {
        matched: true,
        type: 'CORE_SKILL',
        canonical: skill.canonical,
        dictionary: 'skills',
        item: skill
      };
    }

    // Check display name
    if (skill.name.toLowerCase() === cleaned) {
      return {
        matched: true,
        type: 'CORE_SKILL',
        canonical: skill.canonical,
        dictionary: 'skills',
        item: skill
      };
    }

    // Check aliases
    if (skill.aliases && skill.aliases.some(a => a.toLowerCase() === cleaned)) {
      return {
        matched: true,
        type: 'CORE_SKILL',
        canonical: skill.canonical,
        dictionary: 'skills',
        item: skill
      };
    }
  }

  return { matched: false };
}

// ============================================================================
// LAYER 2: FORCED CORE SKILLS
// ============================================================================

/**
 * Check if phrase is a forced core skill (SQL, Python always CORE_SKILL)
 * @param {string} cleaned - Cleaned phrase
 * @param {Set} forcedCoreSkills - Set of forced core skills
 * @returns {Object} Match result
 */
function checkForcedCoreSkills(cleaned, forcedCoreSkills) {
  if (forcedCoreSkills.has(cleaned)) {
    return {
      matched: true,
      canonical: cleaned.replace(/\s+/g, '_')
    };
  }

  // Check partial matches for forced skills
  for (const forcedSkill of forcedCoreSkills) {
    if (cleaned === forcedSkill || cleaned.includes(forcedSkill)) {
      return {
        matched: true,
        canonical: forcedSkill.replace(/\s+/g, '_')
      };
    }
  }

  return { matched: false };
}

// ============================================================================
// LAYER 3: PATTERN RULES
// ============================================================================

/**
 * Apply pattern-based classification rules
 * @param {string} cleaned - Cleaned phrase
 * @returns {Object} Classification result
 */
function checkPatternRules(cleaned) {
  // Rule 1: Brand names with numbers → TOOL (GA4, Salesforce360, etc.)
  if (/^[a-z]+\d+$/i.test(cleaned) || /\d+$/.test(cleaned)) {
    return {
      matched: true,
      type: 'TOOL',
      canonical: cleaned.replace(/\s+/g, '_'),
      confidence: 0.85,
      evidence: 'Brand name with number pattern (e.g., GA4, Salesforce360)'
    };
  }

  // Rule 2: Capitalized brand-like names → likely TOOL
  // (CRM, HubSpot, Salesforce patterns)
  if (/^[A-Z][a-z]+([A-Z][a-z]+)*$/.test(cleaned) && !cleaned.includes(' ')) {
    return {
      matched: true,
      type: 'TOOL',
      canonical: cleaned.toLowerCase().replace(/\s+/g, '_'),
      confidence: 0.75,
      evidence: 'CamelCase brand name pattern'
    };
  }

  // Rule 3: Phrases with "ing" often indicate skills (marketing, segmenting, analyzing)
  if (/ing\s|ing$/i.test(cleaned)) {
    return {
      matched: true,
      type: 'CORE_SKILL',
      canonical: cleaned.replace(/\s+/g, '_'),
      confidence: 0.70,
      evidence: 'Gerund form indicates skill/action'
    };
  }

  // Rule 4: "X strategy", "X operations", "X management" → CORE_SKILL
  if (/(strategy|operations|management|analysis|optimization|planning)$/i.test(cleaned)) {
    return {
      matched: true,
      type: 'CORE_SKILL',
      canonical: cleaned.replace(/\s+/g, '_'),
      confidence: 0.80,
      evidence: 'Strategy/operations/management suffix indicates core skill'
    };
  }

  // Rule 5: Multi-word phrases without brand indicators → likely CORE_SKILL
  const wordCount = cleaned.split(/\s+/).length;
  if (wordCount >= 2 && wordCount <= 4) {
    return {
      matched: true,
      type: 'CORE_SKILL',
      canonical: cleaned.replace(/\s+/g, '_'),
      confidence: 0.65,
      evidence: 'Multi-word phrase without brand indicators'
    };
  }

  return { matched: false };
}

// ============================================================================
// LAYER 4: CONTEXT HEURISTICS + CANDIDATES
// ============================================================================

/**
 * Apply context-based heuristics and create candidates
 * @param {string} cleaned - Cleaned phrase
 * @param {string} original - Original phrase
 * @returns {Object} Classification result
 */
function checkContextHeuristics(cleaned, original) {
  // If phrase is very short (<4 chars), likely an acronym → CANDIDATE
  if (cleaned.length < 4) {
    return {
      type: 'CANDIDATE',
      canonical: cleaned.replace(/\s+/g, '_'),
      confidence: 0.40,
      evidence: 'Short acronym - needs verification',
      inferredType: 'UNKNOWN'
    };
  }

  // If phrase contains special characters or numbers → likely TOOL
  if (/[._\-\/\\]/.test(cleaned) || /\d/.test(cleaned)) {
    return {
      type: 'CANDIDATE',
      canonical: cleaned.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_'),
      confidence: 0.50,
      evidence: 'Contains special chars/numbers - likely tool',
      inferredType: 'TOOL'
    };
  }

  // Default: add to candidates with low confidence
  return {
    type: 'CANDIDATE',
    canonical: cleaned.replace(/\s+/g, '_'),
    confidence: 0.35,
    evidence: 'No clear classification - human review needed',
    inferredType: 'UNKNOWN'
  };
}

// ============================================================================
// BATCH CLASSIFICATION
// ============================================================================

/**
 * Classify multiple phrases in batch
 * @param {Array} phrases - Array of raw phrases
 * @param {Object} options - Classification options
 * @returns {Object} Classified buckets
 */
function classifyBatch(phrases, options = {}) {
  const result = {
    coreSkills: [],
    tools: [],
    candidates: [],
    rejected: []
  };

  for (const phrase of phrases) {
    const classification = classifySkillPhrase(phrase, options);

    const item = {
      raw: phrase,
      canonical: classification.canonical,
      confidence: classification.confidence,
      evidence: classification.evidence,
      sourceLocation: classification.sourceLocation
    };

    switch (classification.type) {
      case 'CORE_SKILL':
        result.coreSkills.push(item);
        break;
      case 'TOOL':
        result.tools.push(item);
        break;
      case 'CANDIDATE':
        result.candidates.push({
          ...item,
          inferredType: classification.inferredType
        });
        break;
      case 'REJECTED':
        result.rejected.push(item);
        break;
    }
  }

  return result;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Load tools dictionary from tools.json
 * @returns {Promise<Array>} Tools dictionary
 */
async function loadToolsDictionary() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/tools.json'));
    const data = await response.json();
    const tools = data.tools || [];
    if (tools.length > 0) {
      return tools;
    }
    console.warn('[SkillClassifier] tools.json empty, falling back to TOOLS_DENY_LIST');
  } catch (error) {
    console.error('[SkillClassifier] Failed to load tools.json:', error);
  }

  const fallbackList = window.SkillConstants?.TOOLS_DENY_LIST;
  if (fallbackList && typeof fallbackList.forEach === 'function') {
    const fallbackTools = [];
    fallbackList.forEach((item) => {
      const name = String(item || '').trim();
      if (!name) return;
      fallbackTools.push({
        canonical: name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
        name,
        aliases: []
      });
    });
    return fallbackTools;
  }

  return [];
}

/**
 * Load ignore rules from ignore-rules.json
 * @returns {Promise<Object>} Ignore rules
 */
async function loadIgnoreRules() {
  try {
    const response = await fetch(chrome.runtime.getURL('data/ignore-rules.json'));
    return await response.json();
  } catch (error) {
    console.error('[SkillClassifier] Failed to load ignore-rules.json:', error);
    return {};
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillClassifier = {
    classifySkillPhrase,
    classifyBatch,
    loadToolsDictionary,
    loadIgnoreRules,
    checkSoftSkillRejection,
    checkExactDictionaryMatch,
    checkForcedCoreSkills,
    checkPatternRules,
    checkContextHeuristics
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    classifySkillPhrase,
    classifyBatch,
    loadToolsDictionary,
    loadIgnoreRules,
    checkSoftSkillRejection,
    checkExactDictionaryMatch,
    checkForcedCoreSkills,
    checkPatternRules,
    checkContextHeuristics
  };
}
