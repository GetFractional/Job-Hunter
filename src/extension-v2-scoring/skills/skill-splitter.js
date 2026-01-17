/**
 * Job Filter - Skill Splitter (v2 Upgrade)
 *
 * Robustly splits comma-separated and multi-skill lists into individual skills.
 * Handles complex cases like:
 * - "SQL, Python, and R" → ["SQL", "Python", "R"]
 * - "HubSpot; Salesforce; Marketo" → ["HubSpot", "Salesforce", "Marketo"]
 * - "lifecycle marketing and segmentation" → ["lifecycle marketing", "segmentation"]
 * - "GA4 (Google Analytics 4)" → ["GA4", "Google Analytics 4"]
 *
 * Split priority: semicolon (;) > comma (,) > " and " > " or "
 * Preserves multi-word skills by checking against known taxonomy.
 */

// ============================================================================
// MAIN SPLITTING FUNCTION
// ============================================================================

// Known single-character skills (programming languages)
const SINGLE_CHAR_SKILLS = new Set(['r', 'c']);

/**
 * Check if a skill is a valid single-character skill
 * @param {string} skill - Skill to check
 * @returns {boolean} True if valid single-char skill
 */
function isValidSingleCharSkill(skill) {
  return skill && skill.length === 1 && SINGLE_CHAR_SKILLS.has(skill.toLowerCase());
}

/**
 * Split a phrase that may contain multiple skills
 * @param {string} phrase - Raw phrase from job description
 * @param {Object} options - Splitting options
 * @param {Array} options.taxonomy - Skill taxonomy for multi-word detection
 * @param {number} options.maxWords - Maximum words per skill (default 5)
 * @returns {string[]} Array of individual skills
 */
function splitMultiSkills(phrase, options = {}) {
  const { taxonomy = [], maxWords = 5 } = options;

  if (!phrase || typeof phrase !== 'string') {
    return [];
  }

  // Clean the phrase
  const cleaned = cleanPhrase(phrase);
  if (!cleaned) {
    return [];
  }

  // Step 1: Handle parenthetical content (extract both forms)
  const withParentheses = extractParentheticalVariants(cleaned);

  // Step 2: Detect separator type and split accordingly
  const skills = [];

  for (const variant of withParentheses) {
    // Try splitting by semicolon first (highest precedence)
    if (variant.includes(';')) {
      const parts = splitBySemicolon(variant);
      skills.push(...parts);
      continue;
    }

    // Try splitting by comma
    if (variant.includes(',')) {
      const parts = splitByComma(variant, taxonomy, maxWords);
      skills.push(...parts);
      continue;
    }

    // Try splitting by " and "
    if (/ and /i.test(variant)) {
      const parts = splitByAnd(variant, taxonomy);
      skills.push(...parts);
      continue;
    }

    // Try splitting by " or "
    if (/ or /i.test(variant)) {
      const parts = splitByOr(variant, taxonomy);
      skills.push(...parts);
      continue;
    }

    // No separators found - single skill
    skills.push(variant);
  }

  // Step 3: Clean and deduplicate
  // Allow single-char skills for known programming languages (R, C)
  const cleaned_skills = skills
    .map(s => cleanSkillFragment(s))
    .filter(s => s && (s.length >= 2 || isValidSingleCharSkill(s)));

  return deduplicateSkills(cleaned_skills);
}

// ============================================================================
// SEPARATOR-SPECIFIC SPLITTING
// ============================================================================

/**
 * Split by semicolon (highest precedence)
 * @param {string} text - Text to split
 * @returns {string[]} Split skills
 */
function splitBySemicolon(text) {
  return text.split(';').map(s => s.trim()).filter(s => s);
}

/**
 * Split by comma (careful to preserve multi-word skills)
 * @param {string} text - Text to split
 * @param {Array} taxonomy - Skill taxonomy
 * @param {number} maxWords - Max words per skill
 * @returns {string[]} Split skills
 */
function splitByComma(text, taxonomy, maxWords) {
  // Simple split first
  const parts = text.split(',').map(s => s.trim()).filter(s => s);

  // Check if any part is a multi-word known skill
  const skills = [];
  for (const part of parts) {
    // Remove leading "and" or "or"
    const cleaned = part.replace(/^(and|or)\s+/i, '');
    if (cleaned) {
      skills.push(cleaned);
    }
  }

  return skills;
}

/**
 * Split by " and " (preserve multi-word skills)
 * @param {string} text - Text to split
 * @param {Array} taxonomy - Skill taxonomy
 * @returns {string[]} Split skills
 */
function splitByAnd(text, taxonomy) {
  // Check if entire phrase is a known multi-word skill
  const knownSkill = findKnownSkill(text, taxonomy);
  if (knownSkill) {
    return [text]; // Don't split known skills
  }

  // Split by " and "
  const parts = text.split(/ and /i).map(s => s.trim()).filter(s => s);

  return parts;
}

/**
 * Split by " or " (similar to "and")
 * @param {string} text - Text to split
 * @param {Array} taxonomy - Skill taxonomy
 * @returns {string[]} Split skills
 */
function splitByOr(text, taxonomy) {
  // Check if entire phrase is a known multi-word skill
  const knownSkill = findKnownSkill(text, taxonomy);
  if (knownSkill) {
    return [text];
  }

  // Split by " or "
  const parts = text.split(/ or /i).map(s => s.trim()).filter(s => s);

  return parts;
}

// ============================================================================
// PARENTHETICAL HANDLING
// ============================================================================

/**
 * Extract both full phrase and parenthetical content as variants
 * Example: "GA4 (Google Analytics 4)" → ["GA4", "Google Analytics 4"]
 * @param {string} text - Text with potential parentheses
 * @returns {string[]} Variants
 */
function extractParentheticalVariants(text) {
  const variants = [];

  // Check for parenthetical content
  const parenthesisMatch = text.match(/^([^(]+)\s*\(([^)]+)\)$/);

  if (parenthesisMatch) {
    // Extract both the main term and parenthetical content
    const mainTerm = parenthesisMatch[1].trim();
    const parenthetical = parenthesisMatch[2].trim();

    if (mainTerm) variants.push(mainTerm);
    if (parenthetical) variants.push(parenthetical);
  } else {
    // No parentheses - return as-is
    variants.push(text);
  }

  return variants;
}

// ============================================================================
// CLEANING & DEDUPLICATION
// ============================================================================

/**
 * Clean a phrase before splitting
 * @param {string} phrase - Raw phrase
 * @returns {string} Cleaned phrase
 */
function cleanPhrase(phrase) {
  if (!phrase) return '';

  return phrase
    .trim()
    // Remove leading/trailing punctuation
    .replace(/^[,.\s\-•*:]+|[,.\s\-•*:]+$/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean a skill fragment after splitting
 * @param {string} fragment - Skill fragment
 * @returns {string} Cleaned fragment
 */
function cleanSkillFragment(fragment) {
  if (!fragment) return '';

  return fragment
    .trim()
    // Remove leading conjunctions
    .replace(/^(and|or|with|using)\s+/i, '')
    // Remove trailing conjunctions
    .replace(/\s+(and|or|with|using)$/i, '')
    // Remove leading/trailing punctuation
    .replace(/^[,.\s\-•*:]+|[,.\s\-•*:]+$/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deduplicate skills (case-insensitive)
 * @param {string[]} skills - Array of skills
 * @returns {string[]} Deduplicated skills
 */
function deduplicateSkills(skills) {
  const seen = new Set();
  const result = [];

  for (const skill of skills) {
    const normalized = skill.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(skill);
    }
  }

  return result;
}

// ============================================================================
// TAXONOMY HELPERS
// ============================================================================

/**
 * Check if text matches a known multi-word skill in taxonomy
 * @param {string} text - Text to check
 * @param {Array} taxonomy - Skill taxonomy
 * @returns {Object|null} Matched skill or null
 */
function findKnownSkill(text, taxonomy) {
  if (!taxonomy || !Array.isArray(taxonomy)) {
    return null;
  }

  const normalized = text.toLowerCase().trim();

  for (const skill of taxonomy) {
    // Check main name
    if (skill.name.toLowerCase() === normalized) {
      return skill;
    }

    // Check canonical
    if (skill.canonical === normalized.replace(/\s+/g, '_')) {
      return skill;
    }

    // Check aliases
    if (skill.aliases && skill.aliases.some(a => a.toLowerCase() === normalized)) {
      return skill;
    }
  }

  return null;
}

// ============================================================================
// BATCH SPLITTING
// ============================================================================

/**
 * Split multiple phrases in batch
 * @param {string[]} phrases - Array of phrases
 * @param {Object} options - Splitting options
 * @returns {string[]} Flat array of split skills
 */
function splitBatch(phrases, options = {}) {
  const allSkills = [];

  for (const phrase of phrases) {
    const skills = splitMultiSkills(phrase, options);
    allSkills.push(...skills);
  }

  return deduplicateSkills(allSkills);
}

// ============================================================================
// EDGE CASE HANDLERS
// ============================================================================

/**
 * Handle edge cases in skill lists
 * Examples:
 * - "SQL and/or Python" → ["SQL", "Python"]
 * - "Excel (advanced)" → ["Excel"]
 * - "3+ years of SQL" → ["SQL"]
 * @param {string} phrase - Phrase with edge case
 * @returns {string[]} Cleaned skills
 */
function handleEdgeCases(phrase) {
  if (!phrase) return [];

  let cleaned = phrase;

  // Remove year patterns
  cleaned = cleaned.replace(/\d+\+?\s*years?\s*(of\s+)?/gi, '');

  // Remove proficiency levels
  cleaned = cleaned.replace(/\s*\((advanced|intermediate|basic|beginner|expert)\)/gi, '');

  // Handle "and/or"
  cleaned = cleaned.replace(/\s+and\/or\s+/gi, ', ');

  // Remove "experience with" type prefixes
  cleaned = cleaned.replace(/^(experience\s+(with|in)|proficiency\s+(in|with)|knowledge\s+of)\s+/i, '');

  return [cleaned].filter(s => s && s.trim().length >= 2);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillSplitter = {
    splitMultiSkills,
    splitBatch,
    splitBySemicolon,
    splitByComma,
    splitByAnd,
    splitByOr,
    extractParentheticalVariants,
    cleanPhrase,
    cleanSkillFragment,
    deduplicateSkills,
    findKnownSkill,
    handleEdgeCases,
    isValidSingleCharSkill,
    SINGLE_CHAR_SKILLS
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    splitMultiSkills,
    splitBatch,
    splitBySemicolon,
    splitByComma,
    splitByAnd,
    splitByOr,
    extractParentheticalVariants,
    cleanPhrase,
    cleanSkillFragment,
    deduplicateSkills,
    findKnownSkill,
    handleEdgeCases,
    isValidSingleCharSkill,
    SINGLE_CHAR_SKILLS
  };
}
