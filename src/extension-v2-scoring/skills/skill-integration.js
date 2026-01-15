/**
 * Job Filter - Skill Extraction Integration
 *
 * Main entry point that integrates all skill extraction components:
 * - Initializes the fuzzy matcher with taxonomy
 * - Provides a simple API for the extension
 * - Handles caching and performance optimization
 * - Formats results for display and Airtable
 */

// ============================================================================
// SKILL EXTRACTION SERVICE
// ============================================================================

/**
 * Singleton service for skill extraction
 */
const SkillExtractionService = (function() {
  // Private state
  let initialized = false;
  let fuzzyMatcher = null;
  let cache = new Map();
  const MAX_CACHE_SIZE = 50;

  /**
   * Initialize the skill extraction service
   * @returns {boolean} Success status
   */
  async function initialize() {
    if (initialized) {
      console.log('[SkillService] Already initialized');
      return true;
    }

    try {
      console.log('[SkillService] Initializing...');

      // Verify dependencies are loaded
      if (!window.SkillTaxonomy?.SKILL_TAXONOMY) {
        console.error('[SkillService] Skill taxonomy not loaded');
        return false;
      }

      if (!window.SkillFuzzyMatcher) {
        console.error('[SkillService] Fuzzy matcher not loaded');
        return false;
      }

      // Initialize fuzzy matcher
      const taxonomy = window.SkillTaxonomy.SKILL_TAXONOMY;
      fuzzyMatcher = new window.SkillFuzzyMatcher(taxonomy, {
        threshold: window.SkillConstants?.EXTRACTION_CONFIG?.FUZZY_THRESHOLD || 0.35,
        keys: ['name', 'aliases']
      });

      initialized = true;
      console.log('[SkillService] Initialized successfully with', taxonomy.length, 'skills');

      return true;
    } catch (error) {
      console.error('[SkillService] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Extract and analyze skills from job description
   * @param {string} jobDescriptionText - Full job description
   * @param {Object} options - Optional settings
   * @returns {Object} Skill analysis result
   */
  async function analyzeJobSkills(jobDescriptionText, options = {}) {
    // DEBUG: Log input text
    console.log('[SkillService] analyzeJobSkills called with text length:', jobDescriptionText?.length || 0);
    if (!jobDescriptionText || jobDescriptionText.length < 50) {
      console.log('[SkillService] DEBUG: Text too short or empty. First 200 chars:', jobDescriptionText?.substring(0, 200));
    }

    // Ensure initialized
    if (!initialized) {
      const initSuccess = await initialize();
      if (!initSuccess) {
        return createErrorResult('Service not initialized');
      }
    }

    // Check cache
    const cacheKey = hashText(jobDescriptionText);
    if (cache.has(cacheKey) && !options.skipCache) {
      console.log('[SkillService] Cache hit for', cacheKey.substring(0, 8));
      return cache.get(cacheKey);
    }

    try {
      const startTime = performance.now();

      // Get user profile skills
      let userSkills = options.userSkills || [];
      if (userSkills.length === 0 && typeof chrome !== 'undefined') {
        try {
          const profile = await chrome.storage.local.get('jh_user_profile');
          userSkills = profile?.jh_user_profile?.background?.core_skills || [];
        } catch (e) {
          console.warn('[SkillService] Could not load user profile:', e);
        }
      }

      // Get extraction options
      const extractionOptions = {
        taxonomy: window.SkillTaxonomy.SKILL_TAXONOMY,
        fuzzyMatcher: fuzzyMatcher,
        denyList: window.SkillConstants.TOOLS_DENY_LIST,
        genericDenyList: window.SkillConstants.GENERIC_PHRASES_DENY_LIST,
        canonicalRules: window.SkillTaxonomy.CANONICAL_RULES,
        synonymGroups: window.SkillTaxonomy.SKILL_SYNONYM_GROUPS,
        jobUrl: options.jobUrl || window.location?.href || ''
      };

      // Run full analysis
      const result = window.SkillMatcher?.analyzeJobSkillFit
        ? window.SkillMatcher.analyzeJobSkillFit(jobDescriptionText, userSkills, extractionOptions)
        : await fallbackAnalysis(jobDescriptionText, userSkills, extractionOptions);

      // Add metadata
      result.serviceVersion = '1.0.0';
      result.totalTime = performance.now() - startTime;
      result.cached = false;

      // Update cache
      updateCache(cacheKey, result);

      console.log(`[SkillService] Analysis complete in ${result.totalTime.toFixed(2)}ms`);
      return result;

    } catch (error) {
      console.error('[SkillService] Analysis error:', error);
      return createErrorResult(error.message);
    }
  }

  /**
   * Fallback analysis when full SkillMatcher isn't available
   */
  async function fallbackAnalysis(jobDescriptionText, userSkills, options) {
    // Extract skills
    const extraction = window.SkillExtractor?.extractRequiredSkillConcepts(jobDescriptionText, options)
      || { required: [], desired: [], confidence: 0 };

    // Simple matching
    const matched = [];
    const missing = [];
    const userSkillsLower = new Set(userSkills.map(s => s.toLowerCase()));

    for (const skill of extraction.required) {
      const skillName = (skill.name || skill).toLowerCase();
      if (userSkillsLower.has(skillName)) {
        matched.push(skill.name || skill);
      } else {
        missing.push(skill.name || skill);
      }
    }

    const ratio = extraction.required.length > 0 ? matched.length / extraction.required.length : 0;

    return {
      extraction: extraction,
      match: { matched, missing, matchRatio: ratio },
      desired: { has: [], missing: extraction.desired.map(s => s.name || s) },
      skillFitScore: Math.round(ratio * 100),
      skillFitLabel: getSkillFitLabel(Math.round(ratio * 100)),
      airtablePayload: {
        'Matched Skills': matched.join(', '),
        'Missing Skills': missing.join(', '),
        'Skill Match Ratio': `${(ratio * 100).toFixed(1)}%`
      }
    };
  }

  /**
   * Update cache with LRU eviction
   */
  function updateCache(key, value) {
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(key, value);
  }

  /**
   * Create error result object
   */
  function createErrorResult(message) {
    return {
      error: true,
      message: message,
      extraction: { required: [], desired: [], confidence: 0 },
      match: { matched: [], missing: [], matchRatio: 0 },
      desired: { has: [], missing: [] },
      skillFitScore: 0,
      skillFitLabel: 'Unable to analyze',
      airtablePayload: {}
    };
  }

  /**
   * Simple string hash for caching
   */
  function hashText(text) {
    let hash = 0;
    for (let i = 0; i < Math.min(text.length, 500); i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Get skill fit label
   */
  function getSkillFitLabel(score) {
    if (score >= 90) return 'Excellent Match';
    if (score >= 75) return 'Strong Match';
    if (score >= 60) return 'Good Match';
    if (score >= 45) return 'Moderate Match';
    if (score >= 30) return 'Partial Match';
    return 'Weak Match';
  }

  /**
   * Get service statistics
   */
  function getStats() {
    return {
      initialized,
      cacheSize: cache.size,
      maxCacheSize: MAX_CACHE_SIZE,
      taxonomySize: window.SkillTaxonomy?.SKILL_TAXONOMY?.length || 0,
      fuzzyMatcherStats: fuzzyMatcher?.getStats() || null
    };
  }

  /**
   * Clear cache
   */
  function clearCache() {
    cache.clear();
    console.log('[SkillService] Cache cleared');
  }

  // Public API
  return {
    initialize,
    analyzeJobSkills,
    getStats,
    clearCache,
    isInitialized: () => initialized
  };
})();

// ============================================================================
// CONVENIENCE FUNCTIONS FOR CONTENT SCRIPT
// ============================================================================

/**
 * Quick skill analysis for the current job page
 * @param {string} jobDescription - Job description text
 * @param {string} jobUrl - Job URL for caching
 * @returns {Object} Simplified skill match result
 */
async function quickSkillAnalysis(jobDescription, jobUrl = '') {
  const result = await SkillExtractionService.analyzeJobSkills(jobDescription, { jobUrl });

  if (result.error) {
    return {
      success: false,
      error: result.message
    };
  }

  return {
    success: true,
    matchedCount: result.match?.matched?.length || 0,
    missingCount: result.match?.missing?.length || 0,
    matchRatio: result.match?.matchRatio || 0,
    matchPercentage: `${((result.match?.matchRatio || 0) * 100).toFixed(0)}%`,
    skillFitScore: result.skillFitScore,
    skillFitLabel: result.skillFitLabel,
    matched: result.match?.matched || [],
    missing: result.match?.missing || [],
    desiredMissing: result.desired?.missing || [],
    requiredSkillCount: result.extraction?.required?.length || 0,
    airtablePayload: result.airtablePayload
  };
}

/**
 * Format skill match for sidebar display
 * @param {Object} skillResult - Result from quickSkillAnalysis
 * @returns {string} HTML string for display
 */
function formatSkillMatchHTML(skillResult) {
  if (!skillResult.success) {
    return `<div class="skill-match-error">Unable to analyze skills</div>`;
  }

  const matchClass = skillResult.matchRatio >= 0.7 ? 'good' :
                     skillResult.matchRatio >= 0.5 ? 'moderate' : 'weak';

  let html = `
    <div class="skill-match-summary">
      <div class="skill-match-score ${matchClass}">
        <span class="score-value">${skillResult.matchPercentage}</span>
        <span class="score-label">Skill Match</span>
      </div>
      <div class="skill-match-counts">
        <span class="matched">${skillResult.matchedCount} matched</span>
        <span class="missing">${skillResult.missingCount} missing</span>
      </div>
    </div>
  `;

  if (skillResult.matched.length > 0) {
    html += `
      <div class="skill-section matched-skills">
        <h4>Your Skills</h4>
        <div class="skill-tags">
          ${skillResult.matched.slice(0, 5).map(s => `<span class="skill-tag matched">${escapeHtml(s)}</span>`).join('')}
          ${skillResult.matched.length > 5 ? `<span class="skill-tag more">+${skillResult.matched.length - 5} more</span>` : ''}
        </div>
      </div>
    `;
  }

  if (skillResult.missing.length > 0) {
    html += `
      <div class="skill-section missing-skills">
        <h4>Skills to Develop</h4>
        <div class="skill-tags">
          ${skillResult.missing.slice(0, 5).map(s => `<span class="skill-tag missing">${escapeHtml(s)}</span>`).join('')}
          ${skillResult.missing.length > 5 ? `<span class="skill-tag more">+${skillResult.missing.length - 5} more</span>` : ''}
        </div>
      </div>
    `;
  }

  return html;
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// MESSAGE HANDLING FOR BACKGROUND SCRIPT
// ============================================================================

/**
 * Handle skill extraction request from content script
 * @param {Object} request - Message request
 * @param {Function} sendResponse - Response callback
 */
async function handleSkillExtractionRequest(request, sendResponse) {
  try {
    const { jobDescription, jobUrl, userSkills } = request;

    const result = await SkillExtractionService.analyzeJobSkills(jobDescription, {
      jobUrl,
      userSkills
    });

    sendResponse({
      success: !result.error,
      data: result
    });
  } catch (error) {
    console.error('[SkillService] Request handling error:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

// ============================================================================
// AUTO-INITIALIZATION
// ============================================================================

// Auto-initialize when DOM is ready (for content script context)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      SkillExtractionService.initialize();
    });
  } else {
    // DOM already ready
    SkillExtractionService.initialize();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillExtractionService = SkillExtractionService;
  window.quickSkillAnalysis = quickSkillAnalysis;
  window.formatSkillMatchHTML = formatSkillMatchHTML;
  window.handleSkillExtractionRequest = handleSkillExtractionRequest;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SkillExtractionService,
    quickSkillAnalysis,
    formatSkillMatchHTML,
    handleSkillExtractionRequest
  };
}
