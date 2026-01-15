/**
 * Job Filter - Skills Module Index
 *
 * This file serves as the entry point for all skill extraction functionality.
 * It ensures modules are loaded in the correct order and provides a simple API.
 *
 * Dependencies (load in this order):
 * 1. skill-taxonomy.js - Skill data and canonical mappings
 * 2. skill-constants.js - Configuration and deny-lists
 * 3. fuzzy-matcher.js - Fuzzy string matching
 * 4. skill-normalizer.js - 4-pass normalization
 * 5. skill-extractor.js - Main extraction logic
 * 6. skill-matcher.js - User profile matching
 * 7. skill-integration.js - Service wrapper
 *
 * Usage in content script:
 *
 *   // Wait for service to initialize
 *   await window.SkillExtractionService.initialize();
 *
 *   // Quick analysis
 *   const result = await window.quickSkillAnalysis(jobDescription, jobUrl);
 *
 *   // Full analysis
 *   const analysis = await window.SkillExtractionService.analyzeJobSkills(jobDescription);
 */

// ============================================================================
// INITIALIZATION CHECK
// ============================================================================

/**
 * Check if all skill modules are loaded
 * @returns {Object} Status of each module
 */
function checkSkillModulesLoaded() {
  return {
    taxonomy: !!window.SkillTaxonomy?.SKILL_TAXONOMY,
    constants: !!window.SkillConstants?.TOOLS_DENY_LIST,
    fuzzyMatcher: !!window.SkillFuzzyMatcher,
    normalizer: !!window.SkillNormalizer,
    extractor: !!window.SkillExtractor,
    matcher: !!window.SkillMatcher,
    service: !!window.SkillExtractionService,
    allLoaded: !!(
      window.SkillTaxonomy?.SKILL_TAXONOMY &&
      window.SkillConstants?.TOOLS_DENY_LIST &&
      window.SkillFuzzyMatcher &&
      window.SkillNormalizer &&
      window.SkillExtractor &&
      window.SkillMatcher &&
      window.SkillExtractionService
    )
  };
}

/**
 * Wait for all skill modules to be loaded
 * @param {number} timeout - Max wait time in ms (default 5000)
 * @returns {Promise<boolean>} True if all loaded
 */
async function waitForSkillModules(timeout = 5000) {
  const startTime = Date.now();
  const checkInterval = 100;

  return new Promise((resolve) => {
    const check = () => {
      const status = checkSkillModulesLoaded();
      if (status.allLoaded) {
        console.log('[Skills] All modules loaded');
        resolve(true);
        return;
      }

      if (Date.now() - startTime >= timeout) {
        console.warn('[Skills] Timeout waiting for modules. Status:', status);
        resolve(false);
        return;
      }

      setTimeout(check, checkInterval);
    };

    check();
  });
}

// ============================================================================
// CONVENIENCE API
// ============================================================================

/**
 * Get skill extraction statistics
 * @returns {Object} Stats about loaded taxonomy and service state
 */
function getSkillStats() {
  const status = checkSkillModulesLoaded();

  return {
    modulesLoaded: status,
    taxonomySize: window.SkillTaxonomy?.SKILL_TAXONOMY?.length || 0,
    categories: window.SkillTaxonomy?.SKILL_CATEGORIES?.map(c => c.id) || [],
    toolsDenyListSize: window.SkillConstants?.TOOLS_DENY_LIST?.size || 0,
    genericDenyListSize: window.SkillConstants?.GENERIC_PHRASES_DENY_LIST?.size || 0,
    serviceInitialized: window.SkillExtractionService?.isInitialized?.() || false,
    serviceStats: window.SkillExtractionService?.getStats?.() || null
  };
}

/**
 * Run a quick test of the skill extraction
 * @param {string} testText - Optional test text (uses default if not provided)
 * @returns {Object} Test result
 */
async function testSkillExtraction(testText) {
  const defaultText = `
    Required Skills:
    - 5+ years of experience in conversion rate optimization (CRO)
    - Expert in A/B testing and experimentation
    - Strong SQL skills for analytics
    - Experience with customer segmentation
    - Knowledge of lifecycle marketing
    - Proficiency in data analysis

    Nice to have:
    - Python or R programming
    - Machine learning experience

    We use HubSpot, Salesforce, and Tableau.
  `;

  const text = testText || defaultText;

  // Ensure modules are loaded
  const ready = await waitForSkillModules();
  if (!ready) {
    return { success: false, error: 'Modules not loaded' };
  }

  // Run extraction
  const result = await window.quickSkillAnalysis(text, 'test-url');

  return {
    success: result.success,
    testTextLength: text.length,
    extractedRequired: result.matchedCount + result.missingCount,
    matchedSkills: result.matched,
    missingSkills: result.missing,
    matchRatio: result.matchRatio,
    skillFitScore: result.skillFitScore
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillsModule = {
    checkSkillModulesLoaded,
    waitForSkillModules,
    getSkillStats,
    testSkillExtraction
  };

  // Log module loading
  console.log('[Skills] Index module loaded. Use window.SkillsModule.getSkillStats() to check status.');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkSkillModulesLoaded,
    waitForSkillModules,
    getSkillStats,
    testSkillExtraction
  };
}
