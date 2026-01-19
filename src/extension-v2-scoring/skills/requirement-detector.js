/**
 * Job Filter - Requirement Detector (v2 Upgrade)
 *
 * Detects whether extracted skills are REQUIRED or DESIRED based on:
 * 1. Section context ("Required Skills" vs "Preferred Skills" headers)
 * 2. Language signals ("expert required", "must have", "3+ years", etc.)
 * 3. Multiplier strength based on language intensity
 *
 * Output: Maps each skill to requirement level with multiplier
 */

// ============================================================================
// REQUIREMENT DETECTION
// ============================================================================

/**
 * Detect requirement level for extracted skills
 * @param {string} jobDescriptionText - Full job description
 * @param {Array} extractedPhrases - Array of extracted skill phrases with context
 * @returns {Object} Requirement mapping
 */
function detectRequirements(jobDescriptionText, extractedPhrases = []) {
  const result = {
    required: [],
    desired: [],
    metadata: {
      hasRequiredSection: false,
      hasDesiredSection: false,
      defaultToRequired: false
    }
  };

  // Step 1: Parse job description into sections
  const sections = parseSections(jobDescriptionText);

  result.metadata.hasRequiredSection = sections.requiredSection !== null;
  result.metadata.hasDesiredSection = sections.desiredSection !== null;

  // Step 2: If no explicit sections, default all to required (conservative)
  if (!sections.requiredSection && !sections.desiredSection) {
    result.metadata.defaultToRequired = true;
    result.required = extractedPhrases.map(p => ({
      ...p,
      requirementLevel: 'required',
      multiplier: 2.0,
      evidence: 'No explicit sections - defaulted to required'
    }));
    return result;
  }

  // Step 3: Classify each phrase based on source location
  for (const phrase of extractedPhrases) {
    const classification = classifyPhrase(phrase, sections, jobDescriptionText);

    if (classification.level === 'required') {
      result.required.push({
        ...phrase,
        requirementLevel: 'required',
        multiplier: classification.multiplier,
        languageSignal: classification.languageSignal,
        evidence: classification.evidence
      });
    } else {
      result.desired.push({
        ...phrase,
        requirementLevel: 'desired',
        multiplier: classification.multiplier,
        languageSignal: classification.languageSignal,
        evidence: classification.evidence
      });
    }
  }

  return result;
}

// ============================================================================
// SECTION PARSING
// ============================================================================

/**
 * Parse job description into required and desired sections
 * @param {string} text - Job description text
 * @returns {Object} Parsed sections with boundaries
 */
function parseSections(text) {
  const result = {
    requiredSection: null,
    desiredSection: null,
    requiredBoundaries: null,
    desiredBoundaries: null
  };

  // Required section patterns (more comprehensive)
  const requiredPatterns = [
    /(?:^|\n)\s*(required|minimum|essential|must[\s-]have|basic)\s*(?:skills?|qualifications?|requirements?|experience)?\s*:?\s*/gi,
    /(?:^|\n)\s*what\s+(?:you(?:'ll)?|we(?:'re)?)\s+(?:need|looking\s+for|require)\s*:?\s*/gi,
    /(?:^|\n)\s*you\s+(?:should|must|will)\s+have\s*:?\s*/gi,
    /(?:^|\n)\s*qualifications?\s*:?\s*/gi,
    /(?:^|\n)\s*requirements?\s*:?\s*/gi
  ];

  // Desired section patterns
  const desiredPatterns = [
    /(?:^|\n)\s*(preferred|desired|nice[\s-]to[\s-]have|bonus|additional|plus)\s*(?:skills?|qualifications?|requirements?|experience)?\s*:?\s*/gi,
    /(?:^|\n)\s*it(?:'s)?\s+a\s+plus\s+if\s*:?\s*/gi,
    /(?:^|\n)\s*ideal(?:ly)?\s*:?\s*/gi
  ];

  // Find required section boundaries
  for (const pattern of requiredPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const startIndex = match.index;
      const endIndex = findSectionEnd(text, startIndex, desiredPatterns);

      result.requiredSection = text.substring(startIndex, endIndex);
      result.requiredBoundaries = { start: startIndex, end: endIndex };
      break;
    }
    pattern.lastIndex = 0;
  }

  // Find desired section boundaries
  for (const pattern of desiredPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const startIndex = match.index;
      const endIndex = findSectionEnd(text, startIndex, []);

      result.desiredSection = text.substring(startIndex, endIndex);
      result.desiredBoundaries = { start: startIndex, end: endIndex };
      break;
    }
    pattern.lastIndex = 0;
  }

  return result;
}

/**
 * Find the end of a section (next section header or end of text)
 * @param {string} text - Full text
 * @param {number} startIndex - Section start index
 * @param {Array} nextSectionPatterns - Patterns for next section
 * @returns {number} End index
 */
function findSectionEnd(text, startIndex, nextSectionPatterns) {
  let endIndex = text.length;

  // Look for next section header
  for (const pattern of nextSectionPatterns) {
    pattern.lastIndex = startIndex + 1;
    const match = pattern.exec(text);
    if (match && match.index < endIndex) {
      endIndex = match.index;
    }
    pattern.lastIndex = 0;
  }

  // Look for common section boundaries
  const boundaryPatterns = [
    /(?:^|\n)\s*(?:about\s+(?:us|the\s+company)|benefits|what\s+we\s+offer|responsibilities|location|salary)\s*:?\s*/gi
  ];

  for (const pattern of boundaryPatterns) {
    pattern.lastIndex = startIndex + 1;
    const match = pattern.exec(text);
    if (match && match.index < endIndex) {
      endIndex = match.index;
    }
    pattern.lastIndex = 0;
  }

  return endIndex;
}

// ============================================================================
// PHRASE CLASSIFICATION
// ============================================================================

/**
 * Classify a phrase as required or desired
 * @param {Object} phrase - Phrase object with sourceLocation
 * @param {Object} sections - Parsed sections
 * @param {string} fullText - Full job description
 * @returns {Object} Classification result
 */
function classifyPhrase(phrase, sections, fullText) {
  // Default classification
  let level = 'required'; // Conservative default
  let multiplier = 2.0;
  let languageSignal = null;
  let evidence = '';

  // Step 1: Check if phrase comes from a known section
  if (phrase.sourceLocation && sections.requiredBoundaries) {
    const phraseIndex = fullText.indexOf(phrase.raw);
    if (phraseIndex >= sections.requiredBoundaries.start &&
        phraseIndex <= sections.requiredBoundaries.end) {
      level = 'required';
      evidence = 'Found in required section';
    }
  }

  if (phrase.sourceLocation && sections.desiredBoundaries) {
    const phraseIndex = fullText.indexOf(phrase.raw);
    if (phraseIndex >= sections.desiredBoundaries.start &&
        phraseIndex <= sections.desiredBoundaries.end) {
      level = 'desired';
      multiplier = 1.0;
      evidence = 'Found in desired/preferred section';
    }
  }

  // Step 2: Check for language signals in the phrase context
  const contextStart = Math.max(0, fullText.indexOf(phrase.raw) - 100);
  const contextEnd = Math.min(fullText.length, fullText.indexOf(phrase.raw) + phrase.raw.length + 100);
  const context = fullText.substring(contextStart, contextEnd).toLowerCase();

  const signals = detectLanguageSignals(context, phrase.raw);

  if (signals.expertRequired) {
    level = 'required';
    multiplier = getMultiplier(level, 'expert required');
    languageSignal = 'expert required';
    evidence = 'Expert level explicitly required';
  } else if (signals.mustHave) {
    level = 'required';
    multiplier = getMultiplier(level, 'required');
    languageSignal = 'required';
    evidence = 'Must have language detected';
  } else if (signals.yearsRequired) {
    level = 'required';
    multiplier = getMultiplier(level, 'required');
    languageSignal = `${signals.yearsCount} years required`;
    evidence = `${signals.yearsCount}+ years required`;
  } else if (signals.preferred) {
    level = 'desired';
    multiplier = getMultiplier(level, 'preferred');
    languageSignal = 'preferred';
    evidence = 'Preferred/nice-to-have language detected';
  }

  return { level, multiplier, languageSignal, evidence };
}

// ============================================================================
// LANGUAGE SIGNAL DETECTION
// ============================================================================

/**
 * Detect language signals in context around a skill
 * @param {string} context - Context around skill mention
 * @param {string} skillPhrase - The skill phrase itself
 * @returns {Object} Detected signals
 */
function detectLanguageSignals(context, skillPhrase) {
  const config = window.SkillConstants?.FIT_SCORE_CONFIG || {};
  const languageConfig = config.requirementLanguage || {};
  const expertKeywords = languageConfig.expertKeywords || [];
  const requiredKeywords = languageConfig.requiredKeywords || [];
  const desiredKeywords = languageConfig.desiredKeywords || [];

  const signals = {
    expertRequired: false,
    mustHave: false,
    yearsRequired: false,
    yearsCount: 0,
    preferred: false
  };

  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const buildRegex = (keywords) => {
    if (!keywords.length) return null;
    return new RegExp(`\\b(?:${keywords.map(escapeRegex).join('|')})\\b`, 'i');
  };

  const expertRegex = buildRegex(expertKeywords);
  if (expertRegex && expertRegex.test(context)) {
    signals.expertRequired = true;
  }

  const requiredRegex = buildRegex(requiredKeywords);
  if (requiredRegex && requiredRegex.test(context)) {
    signals.mustHave = true;
  }

  // Years of experience patterns
  const yearsMatch = context.match(/(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience|background|track\s+record)/i);
  if (yearsMatch) {
    signals.yearsRequired = true;
    signals.yearsCount = parseInt(yearsMatch[1], 10);
  }

  const preferredRegex = buildRegex(desiredKeywords);
  if (preferredRegex && preferredRegex.test(context)) {
    signals.preferred = true;
  }

  return signals;
}

// ============================================================================
// BATCH DETECTION
// ============================================================================

/**
 * Detect requirements for multiple job descriptions
 * @param {Array} jobs - Array of {jobText, extractedPhrases}
 * @returns {Array} Array of requirement results
 */
function detectBatch(jobs) {
  return jobs.map(job => detectRequirements(job.jobText, job.extractedPhrases));
}

/**
 * Analyze a section for language intensity and return multipliers per phrase.
 * Keeps backward compatibility with callers expecting analyzeSection().
 * @param {string} sectionText - Section text (required/desired)
 * @returns {{ multipliers: Object }}
 */
function analyzeSection(sectionText) {
  const result = {
    multipliers: {}
  };

  if (!sectionText || typeof sectionText !== 'string') {
    return result;
  }

  const patterns = [
    { regex: /expert(?:ise)?\s+(?:in|with)\s+([a-z][a-z0-9\s/&-]{2,50})/gi, level: 'required', signal: 'expert required' },
    { regex: /advanced\s+(?:in|with)\s+([a-z][a-z0-9\s/&-]{2,50})/gi, level: 'required', signal: 'expert required' },
    { regex: /must\s+have\s+([a-z][a-z0-9\s/&-]{2,50})/gi, level: 'required', signal: 'required' }
  ];

  patterns.forEach(({ regex, level, signal }) => {
    let match;
    while ((match = regex.exec(sectionText)) !== null) {
      const phrase = (match[1] || '').trim();
      if (!phrase) continue;
      result.multipliers[phrase] = getMultiplier(level, signal);
    }
    regex.lastIndex = 0;
  });

  return result;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get multiplier for requirement level
 * @param {string} level - 'required' or 'desired'
 * @param {string} languageSignal - Optional language signal
 * @returns {number} Multiplier value
 */
function getMultiplier(level, languageSignal = null) {
  const config = window.SkillConstants?.FIT_SCORE_CONFIG || {};
  const multipliers = config.multipliers || {};

  if (level === 'required') {
    return multipliers.required || 2.0;
  }
  return multipliers.desired || 1.0;
}

/**
 * Get penalty for missing skill based on requirement level
 * @param {string} level - 'required' or 'desired'
 * @param {string} type - 'CORE_SKILL' or 'TOOL'
 * @param {string} languageSignal - Optional language signal
 * @returns {number} Penalty value (negative)
 */
function getPenalty(level, type, languageSignal = null) {
  const config = window.SkillConstants?.FIT_SCORE_CONFIG || {};
  const penalties = config.penalties || {};

  if (level === 'required') {
    if (type === 'CORE_SKILL') {
      return penalties.missingRequiredSkill ?? -0.10;
    }
    if (type === 'TOOL') {
      if (languageSignal && languageSignal.includes('expert')) {
        return penalties.missingRequiredToolExpertLanguage ?? -0.15;
      }
      return penalties.missingRequiredTool ?? -0.12;
    }
  }

  if (level === 'desired' && type === 'TOOL') {
    return penalties.missingDesiredTool ?? -0.05;
  }

  return 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.RequirementDetector = {
    detectRequirements,
    parseSections,
    classifyPhrase,
    detectLanguageSignals,
    detectBatch,
    analyzeSection,
    getMultiplier,
    getPenalty
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectRequirements,
    parseSections,
    classifyPhrase,
    detectLanguageSignals,
    detectBatch,
    analyzeSection,
    getMultiplier,
    getPenalty
  };
}
