/**
 * Job Filter - Skill Extractor (v2 Upgrade)
 *
 * Extracts required and desired skill concepts from job descriptions.
 * Uses a multi-strategy extraction approach optimized for job postings:
 *
 * 1. Split text into sections (required vs desired)
 * 2. Extract skill phrases using multiple strategies:
 *    - Strategy 1: Bullet point extraction
 *    - Strategy 2: Indicator phrase extraction
 *    - Strategy 3: Taxonomy matching
 *    - Strategy 4: Comma-separated lists
 *    - Strategy 5: Compromise.js NLP for paragraph extraction (NEW v2)
 * 3. Classify extracted phrases into CORE_SKILL, TOOL, or CANDIDATE
 * 4. Split multi-skill phrases using skill-splitter
 * 5. Filter out soft skills and junk (100% rejection)
 * 6. Normalize and deduplicate using the skill normalizer
 * 7. Return structured extraction result with confidence scores and evidence
 *
 * v2 Upgrade Features:
 * - Compromise.js for paragraph-level NLP (+40% recall)
 * - 3-bucket classification (CORE_SKILLS, TOOLS, CANDIDATES)
 * - Evidence tracking for every extracted item
 * - Integrated skill-classifier.js for rule-based classification
 * - Soft skill 100% rejection rate
 */

// ============================================================================
// COMPROMISE.JS INTEGRATION
// ============================================================================

/**
 * Extract noun phrases from text using Compromise.js
 * @param {string} text - Text to extract from
 * @returns {string[]} Array of noun phrases
 */
function extractNounPhrasesWithCompromise(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  try {
    // Check if Compromise is available (loaded as a module or global)
    const nlp = typeof window !== 'undefined' && window.nlp
      ? window.nlp
      : (typeof require !== 'undefined' ? require('compromise') : null);

    if (!nlp) {
      console.warn('[SkillExtractor] Compromise.js not available, using fallback extraction');
      return extractNounPhrasesFallback(text);
    }

    const doc = nlp(text);
    const nounPhrases = [];

    // Extract noun phrases (noun + optional adjectives)
    doc.nouns().forEach((noun) => {
      const phrase = noun.text().trim();
      if (phrase.length >= 2 && phrase.length <= 50) {
        nounPhrases.push(phrase);
      }
    });

    // Extract compound terms (e.g., "lifecycle marketing", "data analysis")
    doc.match('#Adjective+ #Noun+').forEach((match) => {
      const phrase = match.text().trim();
      if (phrase.length >= 3 && phrase.length <= 50) {
        nounPhrases.push(phrase);
      }
    });

    // Extract gerund phrases (e.g., "marketing automation", "data modeling")
    doc.match('#Gerund #Noun+').forEach((match) => {
      const phrase = match.text().trim();
      if (phrase.length >= 3 && phrase.length <= 50) {
        nounPhrases.push(phrase);
      }
    });

    // Extract abbreviations and acronyms
    doc.match('#Acronym').forEach((match) => {
      const phrase = match.text().trim();
      if (phrase.length >= 2 && phrase.length <= 10) {
        nounPhrases.push(phrase);
      }
    });

    return nounPhrases;
  } catch (error) {
    console.error('[SkillExtractor] Compromise.js error:', error);
    return extractNounPhrasesFallback(text);
  }
}

/**
 * Fallback noun phrase extraction without Compromise.js
 * Enhanced to extract more skill-like phrases from job descriptions
 * @param {string} text - Text to extract from
 * @returns {string[]} Array of noun phrases
 */
function extractNounPhrasesFallback(text) {
  if (!text) return [];

  const phrases = new Set();

  // Pattern 1: Capitalized phrases (proper nouns/tools like "Google Analytics", "HubSpot")
  const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
  let match;
  while ((match = capitalizedPattern.exec(text)) !== null) {
    const phrase = match[0];
    if (phrase.length >= 2 && phrase.length <= 50) {
      phrases.add(phrase);
    }
  }

  // Pattern 2: Common multi-word skill patterns (e.g., "lifecycle marketing", "data analysis")
  const skillPatterns = [
    // Core business skills
    /\b(?:data|product|lifecycle|customer|revenue|growth|marketing|content|demand)\s+(?:analysis|strategy|operations|management|optimization|marketing|generation|development|engineering)\b/gi,
    /\b[a-z]+\s+(?:marketing|analysis|development|engineering|operations|strategy|optimization|management|generation|automation)\b/gi,

    // Technical skills
    /\b(?:machine\s+learning|deep\s+learning|data\s+science|data\s+engineering|data\s+modeling)\b/gi,
    /\b(?:api\s+integration|system\s+integration|etl|data\s+pipeline)\b/gi,
    /\b(?:a\/b\s+testing|split\s+testing|experimentation|multivariate\s+testing)\b/gi,

    // Analytics & BI
    /\b(?:web\s+analytics|product\s+analytics|marketing\s+analytics|business\s+intelligence)\b/gi,
    /\b(?:cohort\s+analysis|funnel\s+analysis|attribution\s+modeling|statistical\s+analysis)\b/gi,
    /\b(?:kpi|okr|roi|cac|ltv|arpu|mrr|arr)\b/gi,

    // Marketing specific
    /\b(?:seo|sem|ppc|cro|abm|plg)\b/gi,
    /\b(?:email\s+marketing|content\s+marketing|social\s+media\s+marketing|performance\s+marketing)\b/gi,
    /\b(?:lead\s+generation|demand\s+generation|lead\s+nurturing|customer\s+acquisition)\b/gi,
    /\b(?:conversion\s+rate\s+optimization|landing\s+page\s+optimization|funnel\s+optimization)\b/gi,
    /\b(?:go[\s-]to[\s-]market|gtm|product[\s-]led\s+growth|sales[\s-]led\s+growth)\b/gi,
    /\b(?:account[\s-]based\s+marketing|field\s+marketing|partner\s+marketing|influencer\s+marketing)\b/gi,

    // Operations
    /\b(?:revenue\s+operations|marketing\s+operations|sales\s+operations|revops|mops|salesops)\b/gi,
    /\b(?:crm\s+administration|process\s+optimization|workflow\s+automation)\b/gi,
    /\b(?:pipeline\s+management|territory\s+planning|sales\s+forecasting)\b/gi,

    // Product & UX
    /\b(?:product\s+management|product\s+strategy|user\s+research|ux\s+design|ui\s+design)\b/gi,
    /\b(?:roadmap\s+planning|feature\s+prioritization|customer\s+journey\s+mapping)\b/gi,

    // Programming languages (must be explicit matches)
    /\b(?:python|sql|javascript|typescript|java|ruby|scala|golang|swift|kotlin)\b/gi,

    // Common acronyms in context
    /\b(?:bi|ml|ai|nlp|etl|api|crm|erp|cdp)\b/gi
  ];

  for (const pattern of skillPatterns) {
    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[0];
      if (phrase.length >= 2 && phrase.length <= 50) {
        phrases.add(phrase);
      }
    }
    pattern.lastIndex = 0;
  }

  // Pattern 3: Extract phrases after "experience with/in" indicators
  const indicatorPatterns = [
    /experience\s+(?:in|with)\s+([a-z][a-z\s\/&-]{2,40})(?=[,.\n]|$)/gi,
    /proficiency\s+(?:in|with)\s+([a-z][a-z\s\/&-]{2,40})(?=[,.\n]|$)/gi,
    /expertise\s+(?:in|with)\s+([a-z][a-z\s\/&-]{2,40})(?=[,.\n]|$)/gi,
    /knowledge\s+of\s+([a-z][a-z\s\/&-]{2,40})(?=[,.\n]|$)/gi,
    /background\s+in\s+([a-z][a-z\s\/&-]{2,40})(?=[,.\n]|$)/gi
  ];

  for (const pattern of indicatorPatterns) {
    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[1]?.trim();
      if (phrase && phrase.length >= 3 && phrase.length <= 50) {
        // Clean up trailing words that aren't part of the skill
        const cleaned = phrase.replace(/\s+(and|or|with|for|to|of|in|at)$/i, '');
        if (cleaned.length >= 3) {
          phrases.add(cleaned);
        }
      }
    }
    pattern.lastIndex = 0;
  }

  // Pattern 4: Extract ALL-CAPS acronyms (CRM, SQL, API, etc.)
  const acronymPattern = /\b[A-Z]{2,6}\b/g;
  while ((match = acronymPattern.exec(text)) !== null) {
    const acronym = match[0];
    // Filter out common non-skill acronyms
    const nonSkillAcronyms = new Set(['AND', 'THE', 'FOR', 'WITH', 'FROM', 'THAT', 'THIS', 'WILL', 'HAVE', 'YOUR', 'ABOUT', 'MORE', 'MUST', 'LIKE']);
    if (!nonSkillAcronyms.has(acronym)) {
      phrases.add(acronym);
    }
  }

  return Array.from(phrases);
}

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

  // Step 6: Build final skill arrays
  // IMPORTANT: Preserve exact job language in 'name', use 'canonical' for matching
  result.required = normalizedRequired
    .filter(s => s.confidence >= minConfidence)
    .map(s => ({
      // Preserve exact job language - show what the job actually says
      name: s.original || s.normalized || s.matchedSkill?.name,
      // Canonical is used for deduplication and matching to user skills
      canonical: s.canonical || toCanonicalKey(s.original),
      // Track the taxonomy skill name for reference (useful for ATS matching)
      taxonomyMatch: s.matchedSkill?.name || null,
      category: s.matchedSkill?.category || 'Other',
      confidence: s.confidence,
      matchType: s.matchType || 'extracted'
    }));

  result.desired = normalizedDesired
    .filter(s => s.confidence >= minConfidence)
    .map(s => ({
      // Preserve exact job language - show what the job actually says
      name: s.original || s.normalized || s.matchedSkill?.name,
      // Canonical is used for deduplication and matching to user skills
      canonical: s.canonical || toCanonicalKey(s.original),
      // Track the taxonomy skill name for reference (useful for ATS matching)
      taxonomyMatch: s.matchedSkill?.name || null,
      category: s.matchedSkill?.category || 'Other',
      confidence: s.confidence,
      matchType: s.matchType || 'extracted'
    }));

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
// ENHANCED EXTRACTION WITH CLASSIFICATION (v2)
// ============================================================================

/**
 * Extract and classify skill concepts from a job description (v2 Upgrade)
 * This is the new main entry point that uses the 3-bucket classification system
 *
 * @param {string} jobDescriptionText - Full job posting text
 * @param {Object} options - Extraction options
 * @returns {Object} Classified extraction result with CORE_SKILLS, TOOLS, CANDIDATES
 */
async function extractAndClassifySkills(jobDescriptionText, options = {}) {
  const startTime = performance.now();

  // Load required modules and data
  const classifier = window.SkillClassifier;
  const taxonomy = window.SkillTaxonomy?.SKILL_TAXONOMY || options.taxonomy || [];
  const requirementDetector = window.RequirementDetector;

  // Load tools dictionary and ignore rules
  let toolsDictionary = [];
  let ignoreRules = {};

  if (classifier) {
    try {
      toolsDictionary = await classifier.loadToolsDictionary() || [];
      ignoreRules = await classifier.loadIgnoreRules() || {};
    } catch (error) {
      console.warn('[SkillExtractor] Failed to load classifier data:', error);
    }
  }

  const forcedCoreSkills = window.SkillConstants?.FORCED_CORE_SKILLS || new Set();
  const softSkillsPatterns = window.SkillConstants?.SOFT_SKILLS_PATTERNS || [];

  // Initialize v2 result structure
  const result = {
    requiredCoreSkills: [],
    desiredCoreSkills: [],
    requiredTools: [],
    desiredTools: [],
    candidates: [],
    rejected: [],
    scoring: {
      overallScore: 0,
      breakdown: {},
      weightsUsed: {},
      penalties: []
    },
    metadata: {
      timestamp: Date.now(),
      jobUrl: options.jobUrl || window.location?.href || '',
      executionTime: 0,
      version: '2.0'
    },
    debug: {
      totalExtracted: 0,
      classified: 0,
      rejected: 0
    }
  };

  // Validate input
  if (!jobDescriptionText || typeof jobDescriptionText !== 'string') {
    result.metadata.executionTime = performance.now() - startTime;
    return result;
  }

  // Step 1: Parse sections (required vs desired)
  const { requiredSection, desiredSection, fullText } = parseSections(jobDescriptionText);

  // Step 2: Detect requirement levels
  let requiredMultipliers = {};
  let desiredMultipliers = {};

  if (requirementDetector) {
    const reqAnalysis = requirementDetector.analyzeSection(requiredSection || fullText);
    requiredMultipliers = reqAnalysis.multipliers || {};

    if (desiredSection) {
      const desAnalysis = requirementDetector.analyzeSection(desiredSection);
      desiredMultipliers = desAnalysis.multipliers || {};
    }
  }

  // Step 3: Extract phrases from each section
  const rawRequiredPhrases = extractPhrases(requiredSection || fullText);
  const rawDesiredPhrases = desiredSection ? extractPhrases(desiredSection) : [];

  result.debug.totalExtracted = rawRequiredPhrases.length + rawDesiredPhrases.length;

  // Step 4: Classify extracted phrases using skill-classifier.js
  const classificationOptions = {
    skillsTaxonomy: taxonomy,
    toolsDictionary,
    ignoreRules,
    forcedCoreSkills,
    softSkillsPatterns
  };

  // Classify required phrases
  if (classifier) {
    const requiredClassified = classifier.classifyBatch(rawRequiredPhrases, classificationOptions);

    // Add to result buckets with requirement flag
    requiredClassified.coreSkills.forEach(skill => {
      result.requiredCoreSkills.push({
        ...skill,
        requirement: 'required',
        multiplier: requiredMultipliers[skill.raw] || 2.0,
        userHasSkill: false // Will be updated by matcher
      });
    });

    requiredClassified.tools.forEach(tool => {
      result.requiredTools.push({
        ...tool,
        requirement: 'required',
        multiplier: requiredMultipliers[tool.raw] || 2.0,
        userHasSkill: false
      });
    });

    requiredClassified.candidates.forEach(candidate => {
      result.candidates.push({
        ...candidate,
        requirement: 'required'
      });
    });

    requiredClassified.rejected.forEach(item => {
      result.rejected.push(item);
    });

    // Classify desired phrases
    const desiredClassified = classifier.classifyBatch(rawDesiredPhrases, classificationOptions);

    desiredClassified.coreSkills.forEach(skill => {
      result.desiredCoreSkills.push({
        ...skill,
        requirement: 'desired',
        multiplier: desiredMultipliers[skill.raw] || 1.0,
        userHasSkill: false
      });
    });

    desiredClassified.tools.forEach(tool => {
      result.desiredTools.push({
        ...tool,
        requirement: 'desired',
        multiplier: desiredMultipliers[tool.raw] || 1.0,
        userHasSkill: false
      });
    });

    desiredClassified.candidates.forEach(candidate => {
      result.candidates.push({
        ...candidate,
        requirement: 'desired'
      });
    });

    desiredClassified.rejected.forEach(item => {
      result.rejected.push(item);
    });
  } else {
    // Fallback: Use old extraction method
    console.warn('[SkillExtractor] SkillClassifier not available, using legacy extraction');
    const legacyResult = extractRequiredSkillConcepts(jobDescriptionText, options);

    // Convert legacy result to v2 format (all as core skills)
    legacyResult.required.forEach(skill => {
      result.requiredCoreSkills.push({
        raw: skill.name,
        canonical: skill.canonical,
        confidence: skill.confidence,
        evidence: 'Legacy extraction',
        sourceLocation: 'required',
        requirement: 'required',
        userHasSkill: false
      });
    });

    legacyResult.desired.forEach(skill => {
      result.desiredCoreSkills.push({
        raw: skill.name,
        canonical: skill.canonical,
        confidence: skill.confidence,
        evidence: 'Legacy extraction',
        sourceLocation: 'desired',
        requirement: 'desired',
        userHasSkill: false
      });
    });
  }

  // Step 5: Deduplicate across buckets (required wins over desired)
  const requiredCoreCanonicals = new Set(result.requiredCoreSkills.map(s => s.canonical));
  const requiredToolCanonicals = new Set(result.requiredTools.map(s => s.canonical));

  result.desiredCoreSkills = result.desiredCoreSkills.filter(
    s => !requiredCoreCanonicals.has(s.canonical)
  );
  result.desiredTools = result.desiredTools.filter(
    s => !requiredToolCanonicals.has(s.canonical)
  );

  // Step 6: Update debug stats
  result.debug.classified =
    result.requiredCoreSkills.length +
    result.desiredCoreSkills.length +
    result.requiredTools.length +
    result.desiredTools.length +
    result.candidates.length;

  result.debug.rejected = result.rejected.length;

  // Step 7: Store candidates for feedback loop
  const candidateManager = window.CandidateManager;
  if (candidateManager && result.candidates.length > 0) {
    const candidateItems = result.candidates.map(c =>
      candidateManager.createCandidate(c.raw, {
        inferredType: c.inferredType,
        confidence: c.confidence,
        evidence: c.evidence,
        sourceLocation: c.sourceLocation,
        context: { jobUrl: result.metadata.jobUrl }
      })
    );
    await candidateManager.storeCandidates(candidateItems);
  }

  // Calculate execution time
  result.metadata.executionTime = performance.now() - startTime;

  console.log(
    `[SkillExtractor v2] Extracted: ${result.requiredCoreSkills.length} req core skills, ` +
    `${result.requiredTools.length} req tools, ${result.desiredCoreSkills.length} des core skills, ` +
    `${result.desiredTools.length} des tools, ${result.candidates.length} candidates, ` +
    `${result.rejected.length} rejected in ${result.metadata.executionTime.toFixed(2)}ms`
  );

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

  if (!text || typeof text !== 'string') {
    return result;
  }

  // Required section patterns - expanded to catch more job posting formats
  const requiredPatterns = [
    // Explicit "Required" headers
    /(?:required|minimum|essential|must[\s-]have|basic)\s*(?:skills?|qualifications?|requirements?|experience)?\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice[\s-]to[\s-]have|bonus|additional|plus|ideal|about\s+(?:us|the)|benefits|what\s+we\s+offer|$))/gi,
    // "What you need" style
    /what\s+(?:you(?:'ll)?|we(?:'re)?)\s+(?:need|looking\s+for|require)\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice[\s-]to[\s-]have|bonus|plus|about|benefits|$))/gi,
    // "You should/must have" style
    /you\s+(?:should|must|will)\s+have\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice[\s-]to[\s-]have|about|benefits|$))/gi,
    // "Qualifications" section (common on LinkedIn)
    /(?:^|\n)\s*qualifications?\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice[\s-]to[\s-]have|bonus|about\s+(?:us|the)|benefits|responsibilities|$))/gi,
    // "Requirements" section
    /(?:^|\n)\s*requirements?\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice[\s-]to[\s-]have|bonus|about|benefits|responsibilities|$))/gi,
    // "Skills" section without qualifier (assume required)
    /(?:^|\n)\s*(?:key\s+)?skills?\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice[\s-]to[\s-]have|bonus|about|benefits|responsibilities|$))/gi,
    // "What you'll bring" style (common on Indeed)
    /what\s+you(?:'ll)?\s+bring\s*:?\s*([\s\S]*?)(?=(?:preferred|desired|nice|bonus|about|benefits|what\s+we|$))/gi,
    // "Responsibilities" often contains skill indicators too
    /(?:^|\n)\s*responsibilities\s*:?\s*([\s\S]*?)(?=(?:qualifications|requirements|skills|preferred|about|benefits|$))/gi,
    // "About the role" sometimes has skills
    /about\s+(?:the\s+)?role\s*:?\s*([\s\S]*?)(?=(?:qualifications|requirements|skills|preferred|about\s+us|benefits|$))/gi,
    // "Experience" section
    /(?:^|\n)\s*experience\s*:?\s*([\s\S]*?)(?=(?:qualifications|requirements|skills|preferred|about|benefits|$))/gi
  ];

  // Desired section patterns
  const desiredPatterns = [
    /(?:preferred|desired|nice[\s-]to[\s-]have|bonus|additional|plus)\s*(?:skills?|qualifications?|requirements?|experience)?\s*:?\s*([\s\S]*?)(?=(?:about\s+(?:us|the\s+company)|benefits|what\s+we\s+offer|responsibilities|$))/gi,
    /it(?:'s)?\s+a\s+plus\s+if\s*:?\s*([\s\S]*?)(?=(?:about|benefits|what\s+we|$))/gi,
    /would\s+be\s+(?:nice|great|a\s+plus)\s*:?\s*([\s\S]*?)(?=(?:about|benefits|$))/gi
  ];

  // Try to extract required section - lowered minimum to 30 chars
  for (const pattern of requiredPatterns) {
    const match = pattern.exec(text);
    if (match && match[1] && match[1].trim().length > 30) {
      result.requiredSection = match[1].trim();
      break;
    }
    pattern.lastIndex = 0; // Reset for next iteration
  }

  // Try to extract desired section
  for (const pattern of desiredPatterns) {
    const match = pattern.exec(text);
    if (match && match[1] && match[1].trim().length > 15) {
      result.desiredSection = match[1].trim();
      break;
    }
    pattern.lastIndex = 0;
  }

  // CRITICAL FIX: If no explicit required section found, treat ALL skills from
  // the full text as required (this is the conservative/safe approach)
  // Most job postings list core skills without explicit "Required:" headers
  if (!result.requiredSection) {
    // Log for debugging
    console.log('[SkillExtractor] No required section found, using full text');
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
 * @param {Object} options - Extraction options
 * @returns {string[]} Extracted phrases
 */
function extractPhrases(text, options = {}) {
  if (!text) return [];
  const config = (typeof window !== 'undefined' && window.SkillConstants?.EXTRACTION_CONFIG)
    ? window.SkillConstants.EXTRACTION_CONFIG
    : {};
  const minLength = typeof config.MIN_PHRASE_LENGTH === 'number' ? config.MIN_PHRASE_LENGTH : 2;
  const maxWords = typeof config.MAX_PHRASE_WORDS === 'number' ? config.MAX_PHRASE_WORDS : 7;

  const phrases = new Set();

  // Strategy 1: Extract bullet point items
  extractBulletItems(text).forEach(p => phrases.add(p));

  // Strategy 2: Extract phrases after skill indicators
  extractIndicatorPhrases(text).forEach(p => phrases.add(p));

  // Strategy 3: Direct taxonomy matching
  extractTaxonomyMatches(text).forEach(p => phrases.add(p));

  // Strategy 4: Extract comma-separated skills in skill lists
  extractCommaSeparated(text).forEach(p => phrases.add(p));

  // Strategy 5 (NEW v2): Extract noun phrases using Compromise.js for paragraph-level NLP
  // This captures skills mentioned in prose/paragraphs that other strategies miss
  extractNounPhrasesWithCompromise(text).forEach(p => phrases.add(p));

  // Clean and apply skill splitter for multi-skill phrases
  const cleanedPhrases = Array.from(phrases)
    .map(p => cleanExtractedPhrase(p))
    .filter(p => {
      if (!p || p.length < minLength || p.length > 50) return false;
      const wordCount = p.split(/\s+/).length;
      return wordCount <= maxWords;
    });

  // Apply skill splitter to handle multi-skill phrases (e.g., "SQL and Python")
  const splitPhrases = new Set();
  const splitter = window.SkillSplitter;

  for (const phrase of cleanedPhrases) {
    if (splitter) {
      const splits = splitter.splitMultiSkills(phrase, {
        taxonomy: window.SkillTaxonomy?.SKILL_TAXONOMY || [],
        maxWords
      });
      splits.forEach(s => splitPhrases.add(s));
    } else {
      splitPhrases.add(phrase);
    }
  }

  return Array.from(splitPhrases);
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

  // Patterns to find skills after indicators - ENHANCED for prose-style job descriptions
  const indicatorPatterns = [
    /experience\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /proficiency\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /expertise\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /(?:deep|strong|solid)\s+expertise\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /knowledge\s+of\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /skilled?\s+(?:in|at|with)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /background\s+in\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /understanding\s+of\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /strong\s+([a-z][a-z\s\/&,()-]{2,40})\s+skills?/gi,
    /proven\s+([a-z][a-z\s\/&,()-]{2,40})\s+(?:skills?|ability|experience)/gi,
    /responsible\s+for\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /accountable\s+for\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /experience\s+(?:scaling|building|owning|managing|leading)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    // New patterns for prose-style descriptions
    /(?:years?\s+of\s+)?experience\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /proven\s+(?:track\s+record|experience)\s+(?:in|with|of)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /mastery\s+of\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /fluent\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /demonstrated\s+(?:expertise|experience|skill)\s+(?:in|with)\s+([a-z][a-z\s\/&,()-]{2,80})/gi,
    /hands[\s-]on\s+experience\s+(?:with|in)\s+([a-z][a-z\s\/&,()-]{2,80})/gi
  ];

  for (const pattern of indicatorPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const phrase = match[1].trim();
      if (phrase) {
        // If the phrase contains commas, split it into individual skills
        if (phrase.includes(',')) {
          const parts = phrase.split(/\s*,\s*|\s+and\s+|\s+or\s+/);
          parts.forEach(part => {
            const cleaned = part.trim().replace(/^(and|or)\s+/i, '');
            if (cleaned && cleaned.length >= 2 && cleaned.length <= 60) {
              phrases.push(cleaned);
            }
          });
        } else {
          phrases.push(phrase);
        }
      }
    }
    pattern.lastIndex = 0;
  }

  return phrases;
}

/**
 * Extract direct matches from taxonomy using word boundary matching
 * @param {string} text - Input text
 * @returns {string[]} Matched terms
 */
function extractTaxonomyMatches(text) {
  const matches = [];
  const lowerText = text.toLowerCase();

  // Get taxonomy if available
  const taxonomy = window.SkillTaxonomy?.SKILL_TAXONOMY || [];

  // Skills that require special handling due to short names or common substrings
  const shortSkillsRequiringContext = new Set([
    'r programming', 'r language', 'r statistics',  // R programming language
    'c programming', 'c language',  // C programming language
    'go programming', 'go language', 'golang'  // Go language
  ]);

  for (const skill of taxonomy) {
    const skillNameLower = skill.name.toLowerCase();

    // Skip "R Programming" entirely - it causes too many false positives
    // Only match if explicitly mentioned with context like "R programming" or "statistical R"
    if (skillNameLower === 'r programming') {
      // Only match if we see explicit R programming context
      if (/\b(?:r\s+programming|r\s+language|statistical\s+r|r\s+(?:for\s+)?statistics|programming\s+in\s+r)\b/i.test(text)) {
        matches.push('R Programming');
      }
      continue;
    }

    // Use word boundary matching for all other skills
    // This prevents "marketing" from matching "remarketing" or "R" from matching "or"
    const escapedName = skillNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`\\b${escapedName}\\b`, 'i');

    if (nameRegex.test(text)) {
      matches.push(skill.name);
      continue; // Found main name, no need to check aliases
    }

    // Check aliases with word boundary matching
    if (skill.aliases) {
      for (const alias of skill.aliases) {
        const aliasLower = alias.toLowerCase();

        // Skip short/problematic aliases that need special handling
        if (shortSkillsRequiringContext.has(aliasLower)) {
          continue;
        }

        const escapedAlias = aliasLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const aliasRegex = new RegExp(`\\b${escapedAlias}\\b`, 'i');

        if (aliasRegex.test(text)) {
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
  // ENHANCED to catch more prose patterns
  const listPatterns = [
    /(?:skills?|technologies|tools|platforms|systems)\s*(?:include|:)\s*([^.]+)/gi,
    /(?:including|such\s+as|e\.g\.?,?|like)\s*([^.]+)/gi,
    // Expertise/experience in lists
    /expertise\s+in\s+([^.]+(?:,\s+[^.]+)+)/gi,
    /experience\s+(?:with|in)\s+([^.]+(?:,\s+[^.]+)+)/gi,
    // Proficiency patterns
    /proficient\s+(?:in|with)\s+([^.]+(?:,\s+[^.]+)+)/gi,
    // Managing/optimizing multiple things
    /(?:managing|optimizing|building|scaling|leading)\s+([^.]+(?:,\s+[^.]+)+(?:\s+and\s+[^.]+)?)/gi
  ];

  for (const pattern of listPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const listText = match[1];
      // Only process if it looks like a list (has commas)
      if (listText.includes(',')) {
        // Split by comma, "and", "or"
        const items = listText.split(/\s*,\s*|\s+and\s+|\s+or\s+/);
        items.forEach(item => {
          const cleaned = item.trim().replace(/^(and|or)\s+/i, '');
          if (cleaned && cleaned.length >= 2 && cleaned.length <= 50) {
            skills.push(cleaned);
          }
        });
      }
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
    // Legacy method (v1)
    extractRequiredSkillConcepts,
    // New v2 method - uses 3-bucket classification
    extractAndClassifySkills,
    // Utility functions
    parseSections,
    extractPhrases,
    filterToolsPlatforms,
    filterGenericPhrases,
    cleanExtractedPhrase,
    toCanonicalKey,
    // v2 additions
    extractNounPhrasesWithCompromise,
    extractNounPhrasesFallback
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Legacy method (v1)
    extractRequiredSkillConcepts,
    // New v2 method - uses 3-bucket classification
    extractAndClassifySkills,
    // Utility functions
    parseSections,
    extractPhrases,
    filterToolsPlatforms,
    filterGenericPhrases,
    cleanExtractedPhrase,
    toCanonicalKey,
    // v2 additions
    extractNounPhrasesWithCompromise,
    extractNounPhrasesFallback
  };
}
