/**
 * Job Filter - Skill Extractor (v2 Upgrade)
 *
 * Extracts required and desired skill concepts from job descriptions using
 * a multi-stage pipeline with 4-layer classification, soft skill rejection,
 * and tools/skills separation.
 *
 * Pipeline:
 * 1. Parse sections (Required vs Desired) via RequirementDetector
 * 2. Extract phrases (bullets + paragraphs + indicators)
 * 3. Split multi-skills ("SQL, Python, R" → ["SQL", "Python", "R"])
 * 4. Classify (4-layer: soft skills, dictionary, forced, patterns, candidates)
 * 5. Normalize with dynamic thresholds + alias matching
 * 6. Return structured output with evidence tracking
 */

// ============================================================================
// GLOBAL STATE
// ============================================================================

let toolsDictionary = [];
let ignoreRules = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Load tools dictionary and ignore rules from data files
 * Call this once on extension startup
 */
async function initializeExtractor() {
  try {
    // Load tools.json
    const toolsResponse = await fetch(chrome.runtime.getURL('data/tools.json'));
    const toolsData = await toolsResponse.json();
    toolsDictionary = toolsData.tools || [];
    console.log(`[SkillExtractor] Loaded ${toolsDictionary.length} tools from dictionary`);

    // Load ignore-rules.json
    const ignoreResponse = await fetch(chrome.runtime.getURL('data/ignore-rules.json'));
    ignoreRules = await ignoreResponse.json();
    console.log(`[SkillExtractor] Loaded ${ignoreRules.softSkills.exact.length} soft skill rules`);

    return true;
  } catch (error) {
    console.error('[SkillExtractor] Failed to load data files:', error);
    return false;
  }
}

// ============================================================================
// MAIN EXTRACTION FUNCTION (v2 UPGRADE)
// ============================================================================

/**
 * Extract required and desired skills/tools from a job description
 * @param {string} jobDescriptionText - Full job posting text
 * @param {Object} options - Extraction options
 * @returns {Object} Extraction result with 3 buckets
 */
function extractRequiredSkillConcepts(jobDescriptionText, options = {}) {
  const startTime = performance.now();
  const config = window.SkillConstants?.EXTRACTION_CONFIG || {};

  const {
    taxonomy = window.SkillTaxonomy?.SKILL_TAXONOMY || [],
    fuzzyMatcher = null,
    jobUrl = window.location?.href || ''
  } = options;

  // Initialize result (v2 format with 3 buckets)
  const result = {
    requiredCoreSkills: [],
    desiredCoreSkills: [],
    requiredTools: [],
    desiredTools: [],
    candidates: [],
    timestamp: Date.now(),
    jobUrl,
    confidence: 0,
    executionTime: 0,
    debug: {
      totalPhrases: 0,
      afterSplitting: 0,
      classified: { coreSkills: 0, tools: 0, candidates: 0, rejected: 0 },
      afterNormalization: 0
    }
  };

  // Validate input
  if (!jobDescriptionText || typeof jobDescriptionText !== 'string') {
    result.executionTime = performance.now() - startTime;
    return result;
  }

  // STEP 1: Extract all raw phrases (bullets + paragraphs + indicators)
  const rawPhrases = extractAllPhrases(jobDescriptionText);
  result.debug.totalPhrases = rawPhrases.length;

  // STEP 2: Split multi-skill phrases
  const splitPhrases = [];
  for (const phrase of rawPhrases) {
    if (window.SkillSplitter) {
      const splits = window.SkillSplitter.splitMultiSkills(phrase.text, { taxonomy });
      splits.forEach(split => {
        splitPhrases.push({
          text: split,
          sourceLocation: phrase.sourceLocation,
          context: phrase.context
        });
      });
    } else {
      splitPhrases.push(phrase);
    }
  }
  result.debug.afterSplitting = splitPhrases.length;

  // STEP 3: Classify each phrase (4-layer classification)
  const classified = {
    required: { coreSkills: [], tools: [], candidates: [] },
    desired: { coreSkills: [], tools: [], candidates: [] },
    rejected: []
  };

  for (const phrase of splitPhrases) {
    if (window.SkillClassifier) {
      const classification = window.SkillClassifier.classifySkill(phrase.text, {
        skillTaxonomy: taxonomy,
        toolsDictionary,
        context: phrase.context
      });

      // Track classification stats
      if (classification.type === 'REJECTED') {
        classified.rejected.push({ ...classification, ...phrase });
        result.debug.classified.rejected++;
        continue;
      }

      // Determine if required or desired (default to required if ambiguous)
      const isRequired = !phrase.sourceLocation ||
                         phrase.sourceLocation.includes('required') ||
                         !phrase.sourceLocation.includes('desired');

      const bucket = isRequired ? classified.required : classified.desired;

      if (classification.type === 'CORE_SKILL') {
        bucket.coreSkills.push({ ...classification, ...phrase });
        result.debug.classified.coreSkills++;
      } else if (classification.type === 'TOOL') {
        bucket.tools.push({ ...classification, ...phrase });
        result.debug.classified.tools++;
      } else if (classification.type === 'CANDIDATE') {
        bucket.candidates.push({ ...classification, ...phrase });
        result.debug.classified.candidates++;
      }
    } else {
      // Fallback if classifier not loaded
      const isRequired = !phrase.sourceLocation || !phrase.sourceLocation.includes('desired');
      const bucket = isRequired ? classified.required : classified.desired;
      bucket.coreSkills.push({
        name: phrase.text,
        canonical: toCanonicalKey(phrase.text),
        confidence: 0.5,
        evidence: 'No classifier available',
        ...phrase
      });
    }
  }

  // STEP 4: Normalize and deduplicate using SkillNormalizer with aliases
  if (window.SkillNormalizer) {
    const normalizerOptions = {
      taxonomy,
      fuzzyMatcher,
      useAliases: true,  // NEW: Enable alias matching
      dynamicThresholds: true  // NEW: Enable dynamic thresholds
    };

    // Normalize required core skills
    result.requiredCoreSkills = normalizeAndDeduplicate(
      classified.required.coreSkills,
      normalizerOptions
    );

    // Normalize desired core skills
    result.desiredCoreSkills = normalizeAndDeduplicate(
      classified.desired.coreSkills,
      normalizerOptions
    );

    // Normalize required tools
    result.requiredTools = normalizeAndDeduplicate(
      classified.required.tools,
      normalizerOptions
    );

    // Normalize desired tools
    result.desiredTools = normalizeAndDeduplicate(
      classified.desired.tools,
      normalizerOptions
    );
  } else {
    // Fallback without normalizer
    result.requiredCoreSkills = classified.required.coreSkills;
    result.desiredCoreSkills = classified.desired.coreSkills;
    result.requiredTools = classified.required.tools;
    result.desiredTools = classified.desired.tools;
  }

  // STEP 5: Store candidates for human review
  result.candidates = [...classified.required.candidates, ...classified.desired.candidates];

  // Remove duplicates between required and desired (required wins)
  const requiredCoreCanonicals = new Set(result.requiredCoreSkills.map(s => s.canonical));
  result.desiredCoreSkills = result.desiredCoreSkills.filter(s => !requiredCoreCanonicals.has(s.canonical));

  const requiredToolCanonicals = new Set(result.requiredTools.map(t => t.canonical));
  result.desiredTools = result.desiredTools.filter(t => !requiredToolCanonicals.has(t.canonical));

  result.debug.afterNormalization =
    result.requiredCoreSkills.length +
    result.desiredCoreSkills.length +
    result.requiredTools.length +
    result.desiredTools.length;

  // Calculate overall confidence
  const allItems = [
    ...result.requiredCoreSkills,
    ...result.desiredCoreSkills,
    ...result.requiredTools,
    ...result.desiredTools
  ];
  if (allItems.length > 0) {
    const totalConfidence = allItems.reduce((sum, item) => sum + (item.confidence || 0), 0);
    result.confidence = totalConfidence / allItems.length;
  }

  // Calculate execution time
  result.executionTime = performance.now() - startTime;

  console.log(`[SkillExtractor v2] Extracted in ${result.executionTime.toFixed(2)}ms:`, {
    requiredCoreSkills: result.requiredCoreSkills.length,
    desiredCoreSkills: result.desiredCoreSkills.length,
    requiredTools: result.requiredTools.length,
    desiredTools: result.desiredTools.length,
    candidates: result.candidates.length,
    rejected: result.debug.classified.rejected
  });

  return result;
}

// ============================================================================
// PHRASE EXTRACTION (v2 UPGRADE - Multi-Strategy)
// ============================================================================

/**
 * Extract all phrases from job description using multiple strategies
 * @param {string} text - Job description text
 * @returns {Array} Extracted phrases with metadata
 */
function extractAllPhrases(text) {
  const phrases = [];
  const config = window.SkillConstants?.EXTRACTION_CONFIG || {};
  const minLength = config.MIN_PHRASE_LENGTH || 2;
  const maxWords = config.MAX_PHRASE_WORDS || 7;

  // Strategy 1: Bullet point items (highest confidence)
  const bulletItems = extractBulletItems(text);
  bulletItems.forEach(item => {
    phrases.push({
      text: item,
      sourceLocation: 'bullet',
      context: null,
      extractionMethod: 'bullet'
    });
  });

  // Strategy 2: Indicator phrases ("experience with X", "proficiency in Y")
  const indicatorPhrases = extractIndicatorPhrases(text);
  indicatorPhrases.forEach(phrase => {
    phrases.push({
      text: phrase,
      sourceLocation: 'indicator',
      context: null,
      extractionMethod: 'indicator'
    });
  });

  // Strategy 3: Direct taxonomy matches
  const taxonomyMatches = extractTaxonomyMatches(text);
  taxonomyMatches.forEach(match => {
    phrases.push({
      text: match,
      sourceLocation: 'taxonomy',
      context: null,
      extractionMethod: 'taxonomy'
    });
  });

  // Strategy 4: Comma-separated lists
  const commaSeparated = extractCommaSeparated(text);
  commaSeparated.forEach(skill => {
    phrases.push({
      text: skill,
      sourceLocation: 'list',
      context: null,
      extractionMethod: 'list'
    });
  });

  // TODO Phase 2.1: Strategy 5: Paragraph extraction with Compromise.js
  // This will add +40% recall by capturing skills in prose
  // Example: "You will work on lifecycle marketing campaigns" → "lifecycle marketing"
  // if (typeof nlp !== 'undefined') {
  //   const paragraphSkills = extractFromParagraphs(text);
  //   paragraphSkills.forEach(skill => {
  //     phrases.push({
  //       text: skill,
  //       sourceLocation: 'paragraph',
  //       context: null,
  //       extractionMethod: 'nlp'
  //     });
  //   });
  // }

  // Clean and filter
  return phrases
    .map(p => ({
      ...p,
      text: cleanExtractedPhrase(p.text)
    }))
    .filter(p => {
      if (!p.text || p.text.length < minLength || p.text.length > 50) return false;
      const wordCount = p.text.split(/\s+/).length;
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
  const bulletPattern = /^[\s]*[•\-\*\u2022\u25E6\u25AA\u25CF\d.)]+\s*(.+)$/gm;

  let match;
  while ((match = bulletPattern.exec(text)) !== null) {
    const item = match[1].trim();
    if (item && item.length >= 2) {
      // If item contains a colon, take what's before it
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
  const indicatorPatterns = [
    /experience\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /proficiency\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /expertise\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /knowledge\s+of\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /skilled?\s+(?:in|at|with)\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /background\s+in\s+([a-z][a-z\s\/&,()-]{2,50})/gi,
    /understanding\s+of\s+([a-z][a-z\s\/&,()-]{2,50})/gi
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
  const taxonomy = window.SkillTaxonomy?.SKILL_TAXONOMY || [];

  for (const skill of taxonomy) {
    if (lowerText.includes(skill.name.toLowerCase())) {
      matches.push(skill.name);
    }
    if (skill.aliases) {
      for (const alias of skill.aliases) {
        if (lowerText.includes(alias.toLowerCase())) {
          matches.push(alias);
          break;
        }
      }
    }
  }

  return matches;
}

/**
 * Extract comma-separated skills from skill lists
 * @param {string} text - Input text
 * @returns {string[]} Extracted skills
 */
function extractCommaSeparated(text) {
  const skills = [];
  const listPatterns = [
    /(?:skills?|technologies|tools)\s*(?:include|:)\s*([^.]+)/gi,
    /(?:including|such\s+as|e\.g\.?,?)\s*([^.]+)/gi
  ];

  for (const pattern of listPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const listText = match[1];
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
// NORMALIZATION (v2 UPGRADE)
// ============================================================================

/**
 * Normalize and deduplicate items with dynamic thresholds
 * @param {Array} items - Items to normalize
 * @param {Object} options - Normalization options
 * @returns {Array} Normalized items
 */
function normalizeAndDeduplicate(items, options) {
  if (!items || items.length === 0) return [];

  const normalized = [];
  const seen = new Set();

  for (const item of items) {
    if (window.SkillNormalizer) {
      const result = window.SkillNormalizer.normalizeSkillConcept(item.name || item.text, options);

      if (result.canonical && !seen.has(result.canonical)) {
        seen.add(result.canonical);
        normalized.push({
          name: result.normalized || item.name || item.text,
          canonical: result.canonical,
          confidence: result.confidence,
          evidence: item.evidence || result.matchType,
          category: result.matchedSkill?.category || 'Other',
          sourceLocation: item.sourceLocation,
          matchType: result.matchType
        });
      }
    } else {
      // Fallback without normalizer
      const canonical = toCanonicalKey(item.name || item.text);
      if (!seen.has(canonical)) {
        seen.add(canonical);
        normalized.push({
          name: item.name || item.text,
          canonical,
          confidence: item.confidence || 0.5,
          evidence: item.evidence || 'No normalizer',
          category: 'Other',
          sourceLocation: item.sourceLocation
        });
      }
    }
  }

  return normalized;
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
    .replace(/^[,.\s\-•*:]+|[,.\s\-•*:]+$/g, '')
    .replace(/\d+\+?\s*years?\s*(of\s+)?/gi, '')
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
    initializeExtractor,
    extractAllPhrases,
    extractBulletItems,
    extractIndicatorPhrases,
    extractTaxonomyMatches,
    extractCommaSeparated,
    normalizeAndDeduplicate,
    cleanExtractedPhrase,
    toCanonicalKey
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractRequiredSkillConcepts,
    initializeExtractor,
    extractAllPhrases,
    cleanExtractedPhrase,
    toCanonicalKey
  };
}
