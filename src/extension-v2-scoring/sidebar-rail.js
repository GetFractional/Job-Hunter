/**
 * Job Filter - Docked Sidebar Rail (Command Center Design)
 *
 * A LinkedIn-native docked right sidebar that displays:
 * - Jobs Mode: Job scoring, company metadata, and actions
 * - Outreach Mode: Contact info, outreach history, and compose
 *
 * Features:
 * - Fixed 400px right sidebar with Command Center styling
 * - Semantic fit color system
 * - Progress bars for scores
 * - Roboto typography
 * - Brand Indigo (#5856D6) CTAs
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const sidebarState = {
  mode: null, // 'jobs' | 'outreach' | null
  isVisible: false,
  isMinimized: false,
  currentScore: null,
  currentJobData: null,
  currentContactData: null,
  outreachHistory: [],
  isExpanded: true
};

const CRITERIA_ORDER_STORAGE_KEY = 'jh_criteria_order';
const SIDEBAR_POSITION_STORAGE_KEY = 'jh_sidebar_position';

// ============================================================================
// FIT LEVEL COLOR SYSTEM
// ============================================================================

const FIT_COLORS = {
  'STRONG FIT': {
    primary: '#059669',
    background: '#D1FAE5',
    text: '#059669',
    border: '#059669'
  },
  'GOOD FIT': {
    primary: '#10B981',
    background: '#D1FAE5',
    text: '#059669',
    border: '#10B981'
  },
  'MODERATE FIT': {
    primary: '#F59E0B',
    background: '#FEF3C7',
    text: '#B45309',
    border: '#F59E0B'
  },
  'WEAK FIT': {
    primary: '#F97316',
    background: '#FFEDD5',
    text: '#C2410C',
    border: '#F97316'
  },
  'POOR FIT': {
    primary: '#EF4444',
    background: '#FEE2E2',
    text: '#DC2626',
    border: '#EF4444'
  },
  'HARD NO': {
    primary: '#991B1B',
    background: '#FEE2E2',
    text: '#991B1B',
    border: '#991B1B'
  }
};

// ============================================================================
// SIDEBAR CREATION & MANAGEMENT
// ============================================================================

/**
 * Create and inject the sidebar rail into the page
 * @param {string} mode - 'jobs' or 'outreach'
 */
function createSidebarRail(mode) {
  // Remove existing sidebar if present
  removeSidebarRail();

  const sidebar = document.createElement('div');
  sidebar.id = 'jh-sidebar-rail';
  sidebar.className = `jh-sidebar-rail jh-mode-${mode}`;

  // Set mode-specific content
  if (mode === 'jobs') {
    sidebar.innerHTML = getJobsSidebarHTML();
  } else if (mode === 'outreach') {
    sidebar.innerHTML = getOutreachSidebarHTML();
  }

  // Add styles
  if (!document.getElementById('jh-sidebar-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'jh-sidebar-styles';
    styleEl.textContent = getSidebarStyles();
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(sidebar);

  // Add resize handles
  addResizeHandles(sidebar);

  // Set up event handlers
  setupSidebarEventHandlers(sidebar, mode);
  applySavedSidebarPosition(sidebar);
  enableSidebarDrag(sidebar);
  enableSidebarResize(sidebar);

  sidebarState.mode = mode;
  sidebarState.isVisible = true;

  console.log('[Job Filter Sidebar] Created in mode:', mode);
  return sidebar;
}

/**
 * Remove the sidebar rail from the page
 */
function removeSidebarRail() {
  const sidebar = document.getElementById('jh-sidebar-rail');
  if (sidebar) {
    sidebar.remove();
  }
  sidebarState.isVisible = false;
  sidebarState.mode = null;
}

/**
 * Switch sidebar mode (Jobs <-> Outreach)
 * @param {string} newMode - 'jobs' or 'outreach'
 */
function switchSidebarMode(newMode) {
  if (sidebarState.mode === newMode) return;

  console.log('[Job Filter Sidebar] Switching mode:', sidebarState.mode, '->', newMode);
  createSidebarRail(newMode);
}

// ============================================================================
// JOBS MODE - SCORE UPDATES
// ============================================================================

/**
 * Update the sidebar with job score data
 * @param {Object} scoreResult - Score result from scoring engine
 * @param {Object} jobData - Job data
 */
async function updateSidebarScore(scoreResult, jobData) {
  let sidebar = document.getElementById('jh-sidebar-rail');
  if (!sidebar || sidebarState.mode !== 'jobs') {
    createSidebarRail('jobs');
    sidebar = document.getElementById('jh-sidebar-rail');
  }

  if (!sidebar) {
    console.error('[Job Filter Sidebar] Failed to create sidebar');
    return;
  }

  sidebarState.currentScore = scoreResult;
  sidebarState.currentJobData = jobData;

  // Load user profile for accurate skill/benefit counts
  let userProfile = null;
  try {
    const stored = await chrome.storage.local.get(['jh_user_profile']);
    userProfile = stored.jh_user_profile || null;
  } catch (error) {
    console.warn('[Job Filter Sidebar] Could not load user profile:', error);
  }

  // Update header section
  updateHeaderSection(sidebar, jobData, scoreResult);

  // Update fit label and score card
  updateFitScoreCard(sidebar, scoreResult);

  // Update score breakdown with progress bars - NOW WITH USER PROFILE
  updateScoreBreakdown(sidebar, scoreResult, userProfile);

  // Update dealbreakers if any
  updateDealbreakers(sidebar, scoreResult);

  // Enhance skills card with extraction results without blocking UI updates
  updateSkillCriteriaAsync(sidebar, scoreResult, jobData, userProfile);

  // Show sidebar
  sidebar.classList.add('jh-visible');

  console.log('[Job Filter Sidebar] Updated with score:', scoreResult.overall_score);
}

/**
 * Update the Skills card with extraction results
 */
async function updateSkillCriteriaAsync(sidebar, scoreResult, jobData, userProfile) {
  const descriptionText = jobData?.descriptionText || '';
  const jobUrl = jobData?.jobUrl || window.location?.href || '';

  if (!descriptionText.trim()) return;
  if (!window.SkillExtractionService?.analyzeJobSkills) return;

  try {
    const userSkills = userProfile?.background?.core_skills || [];
    const analysis = await window.SkillExtractionService.analyzeJobSkills(descriptionText, {
      jobUrl,
      userSkills,
      skipCache: true
    });
    if (!analysis || analysis.error) return;

    const userToJob = scoreResult?.user_to_job_fit?.breakdown || [];
    const skillsItem = userToJob.find(item => item.criteria === 'Skills Overlap');
    if (!skillsItem) return;

    const uniqueByCanonical = (items) => {
      const seen = new Set();
      const deduped = [];
      items.forEach((item) => {
        const canonical = item?.canonical || (item?.name || '').toLowerCase();
        if (!canonical || seen.has(canonical)) return;
        seen.add(canonical);
        deduped.push(item);
      });
      return deduped;
    };

    const match = analysis.match || {};
    const matchedDetails = uniqueByCanonical(match.matchedDetails || []);
    const missingDetails = uniqueByCanonical(match.missingDetails || []);

    const matchedSkills = matchedDetails.length
      ? matchedDetails.map(s => s.name).filter(Boolean)
      : (match.matched || []).filter(Boolean);
    const missingSkills = missingDetails.length
      ? missingDetails.map(s => s.name).filter(Boolean)
      : (match.missing || []).filter(Boolean);

    const requiredCount = (analysis.extraction?.required?.length || (matchedSkills.length + missingSkills.length) || 0);
    const matchedCount = matchedSkills.length;
    const percentage = requiredCount > 0 ? Math.round((matchedCount / requiredCount) * 100) : 0;

    skillsItem.matched_skills = matchedSkills;
    skillsItem.unmatched_skills = missingSkills;
    skillsItem.match_percentage = percentage;
    skillsItem.actual_value = requiredCount > 0
      ? `${matchedCount}/${requiredCount} skills (${percentage}%)`
      : 'No skills found';

    const maxScore = skillsItem.max_score || 50;
    skillsItem.score = Math.round((percentage / 100) * maxScore);

    // Extract and display tools using v2 extraction
    await extractAndDisplayTools(sidebar, descriptionText, userToJob, userProfile);

    updateScoreBreakdown(sidebar, scoreResult, userProfile);
  } catch (error) {
    console.warn('[Job Filter Sidebar] Skill match failed:', error);
  }
}

/**
 * Extract tools from job description and add to breakdown
 */
async function extractAndDisplayTools(sidebar, descriptionText, userToJobBreakdown, userProfile) {
  try {
    // Use v2 extraction to get tools
    const extractAndClassify = window.SkillExtractor?.extractAndClassifySkills;
    if (!extractAndClassify) {
      console.log('[Job Filter Sidebar] v2 extraction not available for tools');
      return;
    }

    const extraction = await extractAndClassify(descriptionText, {
      taxonomy: window.SkillTaxonomy?.SKILL_TAXONOMY || [],
      fuzzyMatcher: null,
      denyList: window.SkillConstants?.TOOLS_DENY_LIST || [],
      genericDenyList: window.SkillConstants?.GENERIC_PHRASES_DENY_LIST || [],
      canonicalRules: window.SkillTaxonomy?.CANONICAL_RULES || [],
      synonymGroups: window.SkillTaxonomy?.SKILL_SYNONYM_GROUPS || {}
    });

    if (!extraction) return;

    const requiredTools = (extraction.requiredTools || []).map(t => t.name || t).filter(Boolean);
    const desiredTools = (extraction.desiredTools || []).map(t => t.name || t).filter(Boolean);
    const allTools = [...requiredTools, ...desiredTools];

    // Only add Tools card if we found tools
    if (allTools.length === 0) return;

    // Check if Tools item already exists
    let toolsItem = userToJobBreakdown.find(item => item.criteria === 'Required Tools');
    if (!toolsItem) {
      // Create a new Tools item
      toolsItem = {
        criteria: 'Required Tools',
        criteria_description: 'Software, platforms, and technologies required for this role',
        actual_value: `${allTools.length} tools found`,
        score: 25, // Informational - no match scoring for now
        max_score: 50,
        rationale: 'Tools extracted from job description',
        weight: 0, // Don't affect overall score
        required_tools: requiredTools,
        desired_tools: desiredTools,
        all_tools: allTools
      };
      userToJobBreakdown.push(toolsItem);
    } else {
      // Update existing item
      toolsItem.required_tools = requiredTools;
      toolsItem.desired_tools = desiredTools;
      toolsItem.all_tools = allTools;
      toolsItem.actual_value = `${allTools.length} tools found`;
    }

    console.log(`[Job Filter Sidebar] Extracted ${requiredTools.length} required tools, ${desiredTools.length} desired tools`);
  } catch (error) {
    console.warn('[Job Filter Sidebar] Tools extraction failed:', error);
  }
}

/**
 * Update the header section with company metadata
 */
function updateHeaderSection(sidebar, jobData, scoreResult) {
  const companyEl = sidebar.querySelector('.jh-header-company');
  const titleEl = sidebar.querySelector('.jh-header-title');
  const locationEl = sidebar.querySelector('.jh-header-location');
  const postedEl = sidebar.querySelector('.jh-header-posted');

  // Stats grid elements
  const employeesEl = sidebar.querySelector('.jh-stat-employees');
  const followersEl = sidebar.querySelector('.jh-stat-followers');
  const applicantsEl = sidebar.querySelector('.jh-stat-applicants');
  const growthEl = sidebar.querySelector('.jh-stat-growth');
  const tenureEl = sidebar.querySelector('.jh-stat-tenure');
  const hiringManagerEl = sidebar.querySelector('.jh-stat-hiring-manager');

  if (companyEl) companyEl.textContent = jobData.companyName || 'Unknown Company';
  if (titleEl) titleEl.textContent = jobData.jobTitle || 'Unknown Role';

  // Build location string
  if (locationEl) {
    let locationParts = [];
    if (jobData.workplaceType) locationParts.push(jobData.workplaceType);
    if (jobData.location) locationParts.push(jobData.location);
    locationEl.textContent = locationParts.length > 0 ? locationParts.join(' · ') : '--';
  }

  // Posted date
  if (postedEl) {
    const posted = jobData.postedDate;
    if (posted) {
      // Clean up the posted date text
      let postedText = posted.replace(/^(Posted|Reposted)\s*/i, '').trim();
      postedEl.textContent = `· ${postedText}`;
    } else {
      postedEl.textContent = '';
    }
  }

  // Stats grid values
  if (employeesEl) {
    const headcount = jobData.companyHeadcount || jobData.totalEmployees;
    employeesEl.textContent = headcount ? formatNumber(headcount) : '--';
  }

  if (followersEl) {
    const followers = jobData.companyFollowers;
    followersEl.textContent = followers ? formatNumber(followers) : '--';
  }

  if (applicantsEl) {
    const count = jobData.applicantCount;
    const recent24h = jobData.applicantsLast24h;

    if (count !== null && count !== undefined) {
      let displayText = `${count}+`;
      if (recent24h !== null && recent24h !== undefined) {
        displayText += ` (${recent24h} in <24h)`;
      }
      applicantsEl.textContent = displayText;
    } else {
      applicantsEl.textContent = '--';
    }
  }

  if (growthEl) {
    const growth = jobData.companyHeadcountGrowth;
    if (growth) {
      growthEl.textContent = growth;
      growthEl.classList.remove('jh-positive', 'jh-negative');
      if (growth.includes('+')) {
        growthEl.classList.add('jh-positive');
      } else if (growth.includes('-')) {
        growthEl.classList.add('jh-negative');
      }
    } else {
      growthEl.textContent = '--';
    }
  }

  if (tenureEl) {
    const tenure = jobData.medianEmployeeTenure;
    tenureEl.textContent = (tenure !== null && tenure !== undefined) ? `${tenure}y` : '--';
  }

  if (hiringManagerEl) {
    const manager = (jobData.hiringManagerDetails?.name || '').trim();
    const headline = (jobData.hiringManagerDetails?.headline || jobData.hiringManagerDetails?.title || '').trim();
    const companyName = (jobData.companyName || '').trim().toLowerCase();
    const isCompanyFallback = manager && companyName && manager.toLowerCase().includes(companyName);

    if (manager && !isCompanyFallback) {
      const headlineHtml = headline ? `<div class="jh-hm-title">${escapeHtml(headline)}</div>` : '';
      hiringManagerEl.innerHTML = `
        <div class="jh-hm-name">${escapeHtml(manager)}</div>
        ${headlineHtml}
      `;
    } else {
      hiringManagerEl.textContent = 'Unknown';
    }
  }
}

/**
 * Update the fit score card with semantic colors
 */
function updateFitScoreCard(sidebar, scoreResult) {
  const fitLabel = scoreResult.overall_label || 'ANALYZING';
  const fitColors = FIT_COLORS[fitLabel] || FIT_COLORS['MODERATE FIT'];

  // Update fit label chip
  const fitChip = sidebar.querySelector('.jh-fit-chip');
  if (fitChip) {
    fitChip.textContent = fitLabel;
    fitChip.style.backgroundColor = fitColors.background;
    fitChip.style.color = fitColors.text;
    fitChip.style.borderColor = fitColors.border;
  }

  // Update score circle (both regular and compact versions)
  const scoreCircle = sidebar.querySelector('.jh-score-circle') || sidebar.querySelector('.jh-score-circle-compact');
  const scoreValue = sidebar.querySelector('.jh-score-value');

  if (scoreValue) {
    scoreValue.textContent = scoreResult.overall_score || 0;
    scoreValue.style.color = fitColors.primary;
  }

  if (scoreCircle) {
    scoreCircle.style.borderColor = fitColors.primary;
    scoreCircle.style.backgroundColor = fitColors.background;
  }
}

/**
 * Update the score breakdown section with criteria cards
 */
function updateScoreBreakdown(sidebar, scoreResult, userProfile = null) {
  // Consolidated section combining both job-to-user and user-to-job criteria
  const breakdownList = sidebar.querySelector('.jh-breakdown-section .jh-breakdown-list');

  // Merge both breakdown arrays
  if (breakdownList) {
    const allCriteria = [];

    // Add job-to-user criteria
    if (scoreResult.job_to_user_fit?.breakdown) {
      allCriteria.push(...scoreResult.job_to_user_fit.breakdown);
    }

    // Add user-to-job criteria
    if (scoreResult.user_to_job_fit?.breakdown) {
      allCriteria.push(...scoreResult.user_to_job_fit.breakdown);
    }

    const renderCriteria = (customOrder) => {
      const sortedCriteria = sortCriteriaByOrder(allCriteria, customOrder);
      breakdownList.innerHTML = renderBreakdownItems(
        sortedCriteria,
        'consolidated',
        userProfile
      );
      enableCriteriaReorder(breakdownList);
      enableCardResizing(breakdownList);
      if (breakdownList.dataset.resizeListener !== 'true') {
        breakdownList.dataset.resizeListener = 'true';
        window.addEventListener('resize', () => applyGridLayout(breakdownList));
      }
      requestAnimationFrame(() => {
        applyGridLayout(breakdownList);
      });
    };

    if (chrome?.storage?.local) {
      chrome.storage.local.get([CRITERIA_ORDER_STORAGE_KEY], (result) => {
        renderCriteria(result[CRITERIA_ORDER_STORAGE_KEY] || null);
      });
    } else {
      renderCriteria(null);
    }
  }

  // Add profile mismatch warnings if any
  updateProfileMismatchWarnings(sidebar, scoreResult);
}

/**
 * Display profile mismatch warnings (softer than dealbreakers)
 */
function updateProfileMismatchWarnings(sidebar, scoreResult) {
  let warningsContainer = sidebar.querySelector('.jh-mismatch-warnings');

  // Create container if it doesn't exist
  if (!warningsContainer) {
    const dealbreakersEl = sidebar.querySelector('.jh-dealbreakers');
    if (dealbreakersEl) {
      warningsContainer = document.createElement('div');
      warningsContainer.className = 'jh-mismatch-warnings';
      dealbreakersEl.parentNode.insertBefore(warningsContainer, dealbreakersEl);
    }
  }

  if (!warningsContainer) return;

  const warnings = [];

  // Check for low scores that warrant warnings (but not dealbreakers)
  const userToJobBreakdown = scoreResult.user_to_job_fit?.breakdown || [];
  const jobToUserBreakdown = scoreResult.job_to_user_fit?.breakdown || [];

  // Check experience level mismatch
  const expItem = userToJobBreakdown.find(b => b.criteria === 'Experience Level');
  if (expItem && expItem.score <= 20 && expItem.required_years) {
    warnings.push(`Experience gap: Job requires ${expItem.required_years}+ years`);
  }

  // Check skills gap - calculate percentage consistently with the card display
  const skillsItem = userToJobBreakdown.find(b => b.criteria === 'Skills Overlap');
  if (skillsItem) {
    const matchedSkills = skillsItem.matched_skills || [];
    const unmatchedSkills = skillsItem.unmatched_skills || [];
    const actualTotal = matchedSkills.length + unmatchedSkills.length;
    // Calculate percentage the same way as renderBreakdownItems
    const displayPercentage = actualTotal > 0 ? Math.round((matchedSkills.length / actualTotal) * 100) : (skillsItem.match_percentage || 0);
    if (displayPercentage < 30 && actualTotal > 0) {
      warnings.push(`Skills gap: Only ${displayPercentage}% of required skills match`);
    }
  }

  // Check industry mismatch
  const industryItem = userToJobBreakdown.find(b => b.criteria === 'Industry Experience');
  if (industryItem && industryItem.score <= 20) {
    warnings.push('Industry: Outside your typical sectors');
  }

  // Check salary concerns
  const salaryItem = jobToUserBreakdown.find(b => b.criteria === 'Base Salary');
  if (salaryItem && salaryItem.score <= 15 && !salaryItem.missing_data) {
    warnings.push('Salary: Below your target range');
  }

  if (warnings.length > 0) {
    warningsContainer.innerHTML = `
      <div class="jh-mismatch-alert">
        <div class="jh-mismatch-header">
          <span class="jh-mismatch-icon">⚡</span>
          <strong>Profile Considerations</strong>
        </div>
        <ul class="jh-mismatch-list">
          ${warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
        </ul>
      </div>
    `;
    warningsContainer.style.display = 'block';
  } else {
    warningsContainer.style.display = 'none';
  }
}

/**
 * Update dealbreakers section
 */
function updateDealbreakers(sidebar, scoreResult) {
  const dealbreakersSection = sidebar.querySelector('.jh-dealbreakers');
  if (!dealbreakersSection) return;

  if (scoreResult.deal_breaker_triggered) {
    const reasons = Array.isArray(scoreResult.deal_breaker_triggered)
      ? scoreResult.deal_breaker_triggered
      : [scoreResult.deal_breaker_triggered];

    dealbreakersSection.innerHTML = `
      <div class="jh-dealbreaker-alert">
        <div class="jh-dealbreaker-header">
          <span class="jh-dealbreaker-icon">⚠</span>
          <strong>Dealbreakers Triggered</strong>
        </div>
        <ul class="jh-dealbreaker-list">
          ${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
        </ul>
      </div>
    `;
    dealbreakersSection.style.display = 'block';
  } else {
    dealbreakersSection.style.display = 'none';
  }
}

/**
 * Render breakdown items with progress bars
 * @param {Array} breakdown - Score breakdown items
 * @param {string} type - 'j2u' (job-to-user) or 'u2j' (user-to-job)
 * @param {Object} userProfile - User profile for skills count
 */
function renderBreakdownItems(breakdown, type, userProfile = null) {
  if (!breakdown || breakdown.length === 0) {
    return '<div class="jh-breakdown-empty">No data available</div>';
  }

  // Get total user skills count for proper X/Y display
  const totalUserSkills = userProfile?.background?.core_skills?.length || 30;
  const totalUserBenefits = userProfile?.preferences?.benefits?.length || 11;

  // Filter out Hiring Urgency from display
  const filteredBreakdown = breakdown.filter(item =>
    !item.criteria?.toLowerCase().includes('hiring urgency')
  );

  return filteredBreakdown.map(item => {
    const score = item.score || 0;
    const criteriaMaxScore = item.max_score || 50;
    // Calculate percentage based on the criteria's max score
    const percentage = Math.round((score / criteriaMaxScore) * 100);
    const isHigh = percentage >= 70;
    const isMedium = percentage >= 40 && percentage < 70;

    // Get weight for this criterion (from scoring engine, 0-1 scale converted to percentage)
    const weight = item.weight ? Math.round(item.weight * 100) : null;

    // Shorten criteria names
    let criteriaName = item.criteria || '';
    const nameMap = {
      'Operations & Systems Focus': 'Ops & Systems',
      'Title & Seniority Match': 'Title Match',
      'Organizational Stability': 'Org Stability',
      'Industry Experience': 'Industry',
      'Skills Overlap': 'Skills',
      'Required Tools': 'Tools',
      'Benefits Package': 'Benefits',
      'Business Lifecycle': 'Lifecycle',
      'Base Salary': 'Base Salary',
      'Work Location': 'Location',
      'Bonus & Equity': 'Bonus & Equity',
      'Bonus': 'Bonus',
      'Equity': 'Equity',
      'Experience Level': 'Experience',
      'Org Stability': 'Org Stability'
    };
    criteriaName = nameMap[criteriaName] || criteriaName;

    // Build extra content based on criteria type
    let extraHtml = '';
    let badgeCount = null;

    // Skills display - matched badges highlighted, "Missing" label shows unmatched on hover
    if (item.criteria === 'Skills Overlap' && (item.matched_skills || item.unmatched_skills || totalUserSkills)) {
      const matchedSkills = item.matched_skills || [];
      const unmatchedSkills = item.unmatched_skills || [];
      const matchCount = matchedSkills.length;

      // Calculate total correctly: matched + unmatched = job's required skills
      const actualTotal = matchedSkills.length + unmatchedSkills.length;
      const displayTotal = actualTotal > 0 ? actualTotal : totalUserSkills;

      // Calculate percentage consistently
      const displayPercentage = displayTotal > 0 ? Math.round((matchCount / displayTotal) * 100) : 0;

      // Update match_percentage to ensure consistency between card and warnings
      if (displayTotal > 0) {
        item.match_percentage = displayPercentage;
      }

      // Show X/Y with percentage
      extraHtml += `<div class="jh-skills-summary">${matchCount}/${displayTotal} skills (${displayPercentage}%)</div>`;

      // Show ALL matched skills first (highlighted)
      if (matchedSkills.length > 0) {
        extraHtml += `
          <div class="jh-skill-tags jh-responsive-tags">
            ${matchedSkills.map(s =>
              `<span class="jh-skill-tag jh-matched">${escapeHtml(formatBadgeLabel(s))}</span>`
            ).join('')}
          </div>
        `;
      }

      // Show "Missing" label that reveals unmatched skills on hover
      if (unmatchedSkills.length > 0) {
        const missingTooltip = unmatchedSkills.map(s => escapeHtml(s)).join(', ');
        extraHtml += `
          <div class="jh-missing-skills-container">
            <span class="jh-skill-tag jh-missing" data-missing-count="${unmatchedSkills.length}">
              Missing (${unmatchedSkills.length})
            </span>
            <div class="jh-missing-tooltip">
              <div class="jh-missing-tooltip-header">Missing Skills:</div>
              <div class="jh-missing-tooltip-content">
                ${unmatchedSkills.map(s => `<span class="jh-missing-skill-item">${escapeHtml(s)}</span>`).join('')}
              </div>
            </div>
          </div>
        `;
      }

      badgeCount = matchedSkills.length + (unmatchedSkills.length > 0 ? 1 : 0);
    }

    // Benefits display - matched badges highlighted, "Missing" shows unmatched on hover
    if (item.criteria === 'Benefits Package' || item.criteria === 'Benefits') {
      const matchedBenefits = item.matched_benefits || [];
      const rawPreferredBenefits = userProfile?.preferences?.benefits || [];
      const preferredBenefits = rawPreferredBenefits.map((pref) => {
        if (typeof pref === 'string') return pref;
        if (pref && typeof pref === 'object') {
          return pref.label || pref.name || pref.value || '';
        }
        return '';
      }).filter(Boolean);
      const totalCount = preferredBenefits.length;

      const normalizeBenefitName = (value) => (value || '')
        .toLowerCase()
        .replace(/[_-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const matchedSet = new Set(matchedBenefits.map(b => normalizeBenefitName(b)));
      const isPreferredMatched = (pref) => {
        const prefKey = normalizeBenefitName(pref);
        for (const matched of matchedSet) {
          if (prefKey.includes(matched) || matched.includes(prefKey)) {
            return true;
          }
        }
        return false;
      };

      const matchedPreferred = preferredBenefits.filter(isPreferredMatched);
      const missingPreferred = preferredBenefits.filter(pref => !isPreferredMatched(pref));

      const displayMatched = matchedPreferred.length > 0 ? matchedPreferred : matchedBenefits;
      const matchCount = matchedPreferred.length;

      extraHtml += totalCount > 0
        ? `<div class="jh-benefits-summary">${matchCount}/${totalCount} benefits matched</div>`
        : `<div class="jh-benefits-summary">${displayMatched.length} benefits matched</div>`;

      // Show matched benefits (highlighted)
      if (displayMatched.length > 0) {
        extraHtml += `
          <div class="jh-benefits-tags jh-responsive-tags">
            ${displayMatched.map(b =>
              `<span class="jh-benefit-tag jh-matched">${escapeHtml(formatBadgeLabel(b))}</span>`
            ).join('')}
          </div>
        `;
      }

      // Show "Missing" label for benefits user wants but job doesn't have
      if (missingPreferred.length > 0) {
        extraHtml += `
          <div class="jh-missing-benefits-container">
            <span class="jh-benefit-tag jh-missing" data-missing-count="${missingPreferred.length}">
              Missing (${missingPreferred.length})
            </span>
            <div class="jh-missing-tooltip">
              <div class="jh-missing-tooltip-header">Missing Benefits:</div>
              <div class="jh-missing-tooltip-content">
                ${missingPreferred.map(b => `<span class="jh-missing-benefit-item">${escapeHtml(b)}</span>`).join('')}
              </div>
            </div>
          </div>
        `;
      }

      badgeCount = displayMatched.length + (missingPreferred.length > 0 ? 1 : 0);
    }

    // Tools display - show required and desired tools from job description
    if (item.criteria === 'Required Tools') {
      const requiredTools = item.required_tools || [];
      const desiredTools = item.desired_tools || [];
      const allTools = item.all_tools || [...requiredTools, ...desiredTools];

      // Show summary
      if (requiredTools.length > 0 || desiredTools.length > 0) {
        const summaryParts = [];
        if (requiredTools.length > 0) summaryParts.push(`${requiredTools.length} required`);
        if (desiredTools.length > 0) summaryParts.push(`${desiredTools.length} nice-to-have`);
        extraHtml += `<div class="jh-tools-summary">${summaryParts.join(', ')}</div>`;
      }

      // Show required tools (highlighted differently)
      if (requiredTools.length > 0) {
        extraHtml += `
          <div class="jh-tools-section">
            <div class="jh-tools-tags jh-responsive-tags">
              ${requiredTools.map(t =>
                `<span class="jh-tool-tag jh-required">${escapeHtml(formatBadgeLabel(t))}</span>`
              ).join('')}
            </div>
          </div>
        `;
      }

      // Show desired tools (muted style)
      if (desiredTools.length > 0) {
        extraHtml += `
          <div class="jh-tools-section jh-desired-tools">
            <div class="jh-tools-tags jh-responsive-tags">
              ${desiredTools.map(t =>
                `<span class="jh-tool-tag jh-desired">${escapeHtml(formatBadgeLabel(t))}</span>`
              ).join('')}
            </div>
          </div>
        `;
      }

      badgeCount = allTools.length;
    }

    // Bonus & Equity combined display
    if (item.criteria === 'Bonus & Equity') {
      extraHtml += `<div class="jh-actual-value">${escapeHtml(item.actual_value || '--')}</div>`;
    }

    // Experience Level display with required years
    if (item.criteria === 'Experience Level') {
      if (item.required_years) {
        extraHtml += `<div class="jh-actual-value">${item.required_years}+ years required</div>`;
      } else if (item.actual_value) {
        extraHtml += `<div class="jh-actual-value">${escapeHtml(item.actual_value)}</div>`;
      }
    }

    // Base Salary - clear range display with comparison
    if (item.criteria === 'Base Salary') {
      const salaryFloor = userProfile?.preferences?.salary_floor || 150000;
      const salaryTarget = userProfile?.preferences?.salary_target || 200000;
      const jobSalaryMin = item.job_salary_min || null;
      const jobSalaryMax = item.job_salary_max || null;

      let jobRangeHtml = '';
      let salaryRowClass = '';
      let salaryLabel = 'Salary';

      if (jobSalaryMin !== null || jobSalaryMax !== null) {
        // Show job salary range
        if (jobSalaryMin !== null && jobSalaryMax !== null) {
          jobRangeHtml = `$${formatSalary(jobSalaryMin)} - $${formatSalary(jobSalaryMax)}`;
        } else if (jobSalaryMin !== null) {
          jobRangeHtml = `$${formatSalary(jobSalaryMin)}+`;
        } else {
          jobRangeHtml = `Up to $${formatSalary(jobSalaryMax)}`;
        }
        if (!(jobSalaryMin !== null && jobSalaryMax !== null && jobSalaryMax !== jobSalaryMin)) {
          salaryRowClass = 'jh-salary-single';
          salaryLabel = '';
        }
      } else {
        jobRangeHtml = item.actual_value && item.actual_value.includes('$') ? item.actual_value : '--';
        salaryRowClass = 'jh-salary-single';
        salaryLabel = '';
      }

      extraHtml += `
        <div class="jh-salary-comparison">
          <div class="jh-salary-row ${salaryRowClass}">
            <span class="jh-salary-label-text">${salaryLabel}</span>
            <span class="jh-salary-value">${jobRangeHtml}</span>
          </div>
          <div class="jh-salary-row">
            <span class="jh-salary-label-text">Target</span>
            <span class="jh-salary-value jh-salary-muted">$${formatSalary(salaryFloor)} - $${formatSalary(salaryTarget)}</span>
          </div>
        </div>
      `;
    }

    // Actual value display for other criteria
    else if (item.actual_value && !['Benefits Package', 'Benefits', 'Bonus & Equity', 'Skills Overlap', 'Required Tools', 'Experience Level', 'Base Salary'].includes(item.criteria)) {
      extraHtml += `<div class="jh-actual-value">${escapeHtml(item.actual_value)}</div>`;
    }

    // Progress bar color class
    const progressClass = isHigh ? 'jh-high' : (isMedium ? 'jh-medium' : 'jh-low');

    // Build score display - percentage with optional weight indicator
    const scoreDisplay = `${percentage}%`;

    const criteriaKey = getCriteriaKey(item.criteria);
    // Determine if this item should be full-width (Skills, Benefits, and Tools) or can be in grid
    const isFullWidth = ['skills', 'benefits', 'tools'].includes(criteriaKey);
    const sizeClass = 'jh-size-1';
    const compactClass = criteriaKey === 'base salary' ? 'jh-compact-card' : '';
    const badgeClass = isFullWidth ? 'jh-badge-card' : '';
    const itemClass = isFullWidth
      ? `jh-breakdown-item jh-full-width jh-no-flip ${badgeClass} ${sizeClass} ${compactClass}`
      : `jh-breakdown-item ${badgeClass} ${sizeClass} ${compactClass}`;

    // Build fit assessment text for card flip back
    const rationaleText = item.rationale || 'Assessment details not available';
    const hasRationale = (item.rationale && item.rationale.trim().length > 0) || weight !== null;

    const weightInline = weight !== null && isFullWidth
      ? `<div class="jh-weight-inline">Weight: ${weight}%</div>`
      : '';
    const weightFooter = weight !== null ? `<div class="jh-card-back-weight">Weight: ${weight}%</div>` : '';

    const badgeAttr = badgeCount !== null ? ` data-badge-count="${badgeCount}"` : '';
    return `
      <div class="${itemClass}" data-criteria="${escapeHtml(item.criteria || '')}" data-criteria-key="${escapeHtml(criteriaKey)}"${badgeAttr} draggable="true">
        <div class="jh-card-inner">
          <div class="jh-card-front">
            <div class="jh-breakdown-row">
              <span class="jh-breakdown-name">${escapeHtml(criteriaName)}</span>
              <span class="jh-breakdown-score">${scoreDisplay}</span>
            </div>
            <div class="jh-progress-bar">
              <div class="jh-progress-fill ${progressClass}" style="width: ${percentage}%"></div>
            </div>
            ${extraHtml}
            ${weightInline}
          </div>
          ${hasRationale ? `
          <div class="jh-card-back">
            <div class="jh-card-back-header">${escapeHtml(criteriaName)}</div>
            <div class="jh-card-back-content">${escapeHtml(rationaleText)}</div>
            ${weightFooter}
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// OUTREACH MODE - CONTACT & HISTORY
// ============================================================================

/**
 * Update sidebar with contact data for Outreach Mode
 * @param {Object} contactData - Scraped contact data
 */
function updateSidebarContact(contactData) {
  let sidebar = document.getElementById('jh-sidebar-rail');
  if (!sidebar || sidebarState.mode !== 'outreach') {
    createSidebarRail('outreach');
    sidebar = document.getElementById('jh-sidebar-rail');
  }

  if (!sidebar) return;

  sidebarState.currentContactData = contactData;

  // Update contact mini-card - order: Name, Company, Location, Headline/Role
  const nameEl = sidebar.querySelector('.jh-contact-name');
  const companyEl = sidebar.querySelector('.jh-contact-company');
  const locationEl = sidebar.querySelector('.jh-contact-location');
  const roleEl = sidebar.querySelector('.jh-contact-role');

  // Build full name from firstName + lastName if fullName not available
  let displayName = contactData.fullName;
  if (!displayName && (contactData.firstName || contactData.lastName)) {
    displayName = `${contactData.firstName || ''} ${contactData.lastName || ''}`.trim();
  }

  if (nameEl) nameEl.textContent = displayName || 'Unknown Contact';
  if (companyEl) companyEl.textContent = contactData.companyName || '--';
  if (locationEl) locationEl.textContent = contactData.location || '--';
  if (roleEl) roleEl.textContent = contactData.roleTitle || contactData.headline || '--';

  // Update sync status
  updateSyncStatus(sidebar, 'ready');

  console.log('[Job Filter Sidebar] Contact data loaded:', displayName);
}

/**
 * Update sync status indicator
 */
function updateSyncStatus(sidebar, status, message = '') {
  const statusEl = sidebar.querySelector('.jh-sync-status');
  if (!statusEl) return;

  statusEl.className = 'jh-sync-status jh-sync-' + status;

  switch (status) {
    case 'ready':
      statusEl.textContent = '';
      statusEl.style.display = 'none';
      break;
    case 'syncing':
      statusEl.textContent = 'Syncing...';
      statusEl.style.display = 'inline';
      break;
    case 'synced':
      statusEl.innerHTML = '✓ Synced';
      statusEl.style.display = 'inline';
      break;
    case 'error':
      statusEl.textContent = message || 'Sync failed';
      statusEl.style.display = 'inline';
      break;
  }
}

/**
 * Update outreach history list
 */
function updateOutreachHistory(history) {
  const sidebar = document.getElementById('jh-sidebar-rail');
  if (!sidebar || sidebarState.mode !== 'outreach') return;

  sidebarState.outreachHistory = history;

  const historyList = sidebar.querySelector('.jh-outreach-history-list');
  if (!historyList) return;

  if (!history || history.length === 0) {
    historyList.innerHTML = `
      <div class="jh-outreach-empty">
        <p>No outreach history yet.</p>
        <p class="jh-outreach-hint">Use the compose area below to draft a message.</p>
      </div>
    `;
    return;
  }

  historyList.innerHTML = history.map(entry => {
    const isSent = entry.status === 'Sent' || entry.sentDate;
    const statusClass = isSent ? 'jh-status-sent' : 'jh-status-not-sent';
    const statusText = isSent ? 'Sent' : 'Not Sent';
    const dateText = entry.sentDate ? formatDate(entry.sentDate) : '';
    const messagePreview = truncateText(entry.message || '', 100);

    return `
      <div class="jh-outreach-entry" data-id="${escapeHtml(entry.id)}">
        <div class="jh-outreach-entry-header">
          <span class="jh-outreach-channel">${escapeHtml(entry.channel || 'Message')}</span>
          <span class="jh-outreach-status ${statusClass}">${statusText}</span>
          ${dateText ? `<span class="jh-outreach-date">${dateText}</span>` : ''}
        </div>
        <div class="jh-outreach-entry-message">
          <p class="jh-outreach-text">${escapeHtml(messagePreview)}</p>
        </div>
        <div class="jh-outreach-entry-actions">
          <button class="jh-btn jh-btn-sm jh-btn-copy" data-message="${escapeHtml(entry.message || '')}">Copy</button>
          ${!isSent ? `<button class="jh-btn jh-btn-sm jh-btn-primary jh-mark-sent" data-id="${escapeHtml(entry.id)}">Mark Sent</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Set up entry event handlers
  setupOutreachEntryHandlers(historyList);
}

/**
 * Set up event handlers for outreach history entries
 */
function setupOutreachEntryHandlers(container) {
  // Copy buttons
  container.querySelectorAll('.jh-btn-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const message = btn.getAttribute('data-message');
      try {
        await navigator.clipboard.writeText(message);
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = message;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      }
    });
  });

  // Mark Sent buttons
  container.querySelectorAll('.jh-mark-sent').forEach(btn => {
    btn.addEventListener('click', async () => {
      const recordId = btn.getAttribute('data-id');
      btn.disabled = true;
      btn.textContent = 'Updating...';

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'jobHunter.markOutreachSent',
          recordId: recordId,
          contactRecordId: sidebarState.currentContactData?.airtableContactId
        });

        if (response.success) {
          const entry = sidebarState.outreachHistory.find(e => e.id === recordId);
          if (entry) {
            entry.status = 'Sent';
            entry.sentDate = new Date().toISOString().split('T')[0];
          }
          updateOutreachHistory(sidebarState.outreachHistory);
        } else {
          btn.textContent = 'Failed';
          setTimeout(() => {
            btn.textContent = 'Mark Sent';
            btn.disabled = false;
          }, 2000);
        }
      } catch (err) {
        console.error('[Job Filter Sidebar] Mark sent error:', err);
        btn.textContent = 'Error';
        setTimeout(() => {
          btn.textContent = 'Mark Sent';
          btn.disabled = false;
        }, 2000);
      }
    });
  });
}

/**
 * Fetch outreach history for current contact
 */
async function fetchOutreachHistory() {
  if (!sidebarState.currentContactData?.linkedinUrl) return;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'JH_FETCH_OUTREACH_LOG',
      payload: {
        contactLinkedinUrl: sidebarState.currentContactData.linkedinUrl
      }
    });

    if (response.success && response.data) {
      updateOutreachHistory(response.data);
    }
  } catch (error) {
    console.error('[Job Filter Sidebar] Fetch history error:', error);
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Set up sidebar event handlers
 */
function setupSidebarEventHandlers(sidebar, mode) {
  // Close button
  const closeBtn = sidebar.querySelector('.jh-sidebar-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('jh-visible');
      sidebar.classList.add('jh-hidden');
    });
  }

  // Minimize button - collapse to title bar only
  const minimizeBtn = sidebar.querySelector('.jh-btn-minimize');
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      sidebarState.isMinimized = !sidebarState.isMinimized;
      if (sidebarState.isMinimized) {
        sidebar.classList.add('jh-minimized');
        minimizeBtn.textContent = '+';
        minimizeBtn.title = 'Expand';
      } else {
        sidebar.classList.remove('jh-minimized');
        minimizeBtn.textContent = '−';
        minimizeBtn.title = 'Minimize';
      }
    });
  }

  // Settings button
  const settingsBtn = sidebar.querySelector('.jh-btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (window.openProfileSetup) {
        window.openProfileSetup();
      }
    });
  }

  if (mode === 'jobs') {
    setupJobsModeHandlers(sidebar);
  } else if (mode === 'outreach') {
    setupOutreachModeHandlers(sidebar);
  }
}

/**
 * Set up Jobs Mode specific handlers
 */
function setupJobsModeHandlers(sidebar) {
  // Hunt Job button
  const huntBtn = sidebar.querySelector('.jh-btn-hunt');
  if (huntBtn) {
    huntBtn.addEventListener('click', async () => {
      if (!sidebarState.currentJobData || !sidebarState.currentScore) return;

      huntBtn.disabled = true;
      huntBtn.textContent = 'Capturing...';
      huntBtn.classList.add('jh-loading');

      try {
        await window.sendJobToAirtable(sidebarState.currentJobData, sidebarState.currentScore);
        huntBtn.textContent = 'Captured!';
        huntBtn.classList.remove('jh-loading');
        huntBtn.classList.add('jh-success');

        setTimeout(() => {
          huntBtn.textContent = 'Hunt Job';
          huntBtn.classList.remove('jh-success');
          huntBtn.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('[Job Filter Sidebar] Hunt error:', error);
        huntBtn.textContent = 'Error';
        huntBtn.classList.remove('jh-loading');

        setTimeout(() => {
          huntBtn.textContent = 'Hunt Job';
          huntBtn.disabled = false;
        }, 2000);
      }
    });
  }
}

/**
 * Set up Outreach Mode specific handlers
 */
function setupOutreachModeHandlers(sidebar) {
  // Capture/Sync Contact button
  const syncBtn = sidebar.querySelector('.jh-btn-sync');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      if (!sidebarState.currentContactData) return;

      syncBtn.disabled = true;
      syncBtn.textContent = 'Syncing...';
      updateSyncStatus(sidebar, 'syncing');

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'JH_UPSERT_CONTACT',
          payload: sidebarState.currentContactData
        });

        if (response.success) {
          sidebarState.currentContactData.airtableContactId = response.data.contactId;
          sidebarState.currentContactData.airtableCompanyId = response.data.companyId;

          updateSyncStatus(sidebar, 'synced');
          syncBtn.textContent = 'Synced';
          syncBtn.classList.add('jh-success');

          fetchOutreachHistory();

          setTimeout(() => {
            syncBtn.textContent = 'Capture / Sync';
            syncBtn.classList.remove('jh-success');
            syncBtn.disabled = false;
          }, 2000);
        } else {
          throw new Error(response.error || 'Sync failed');
        }
      } catch (error) {
        console.error('[Job Filter Sidebar] Sync error:', error);
        updateSyncStatus(sidebar, 'error', error.message);
        syncBtn.textContent = 'Sync Failed';

        setTimeout(() => {
          syncBtn.textContent = 'Capture / Sync';
          syncBtn.disabled = false;
        }, 2000);
      }
    });
  }

  // Compose textarea and save button
  const composeTextarea = sidebar.querySelector('.jh-compose-textarea');
  const channelSelect = sidebar.querySelector('.jh-channel-select');
  const saveBtn = sidebar.querySelector('.jh-btn-save-draft');
  const copyDraftBtn = sidebar.querySelector('.jh-btn-copy-draft');

  if (saveBtn && composeTextarea) {
    saveBtn.addEventListener('click', async () => {
      const message = composeTextarea.value.trim();
      const channel = channelSelect?.value || 'LinkedIn Message';

      if (!message) {
        alert('Please enter a message');
        return;
      }

      if (!sidebarState.currentContactData?.airtableContactId) {
        alert('Please sync contact first');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'JH_CREATE_OUTREACH_LOG',
          payload: {
            contactLinkedinUrl: sidebarState.currentContactData.linkedinUrl,
            message: message,
            channel: channel
          }
        });

        if (response.success) {
          composeTextarea.value = '';
          saveBtn.textContent = 'Saved!';

          fetchOutreachHistory();

          setTimeout(() => {
            saveBtn.textContent = 'Save to Outreach Log';
            saveBtn.disabled = false;
          }, 2000);
        } else {
          throw new Error(response.error || 'Save failed');
        }
      } catch (error) {
        console.error('[Job Filter Sidebar] Save draft error:', error);
        saveBtn.textContent = 'Save Failed';

        setTimeout(() => {
          saveBtn.textContent = 'Save to Outreach Log';
          saveBtn.disabled = false;
        }, 2000);
      }
    });
  }

  if (copyDraftBtn && composeTextarea) {
    copyDraftBtn.addEventListener('click', async () => {
      const message = composeTextarea.value.trim();
      if (!message) return;

      try {
        await navigator.clipboard.writeText(message);
        copyDraftBtn.textContent = 'Copied!';
        setTimeout(() => { copyDraftBtn.textContent = 'Copy Draft'; }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  }
}

// ============================================================================
// HTML TEMPLATES
// ============================================================================

/**
 * Get Jobs Mode sidebar HTML - Command Center Design
 */
function getJobsSidebarHTML() {
  return `
    <div class="jh-sidebar-container">
      <!-- Header with branding -->
      <div class="jh-sidebar-header">
        <div class="jh-header-brand">
          <span class="jh-brand-text">Job Filter</span>
        </div>
        <div class="jh-header-controls">
          <button class="jh-btn-settings" title="Edit Profile">⚙</button>
          <button class="jh-btn-minimize" title="Minimize">−</button>
          <button class="jh-sidebar-close" title="Close">×</button>
        </div>
      </div>

      <!-- Condensed Score Card with Job Info -->
      <div class="jh-score-card jh-score-card-compact">
        <div class="jh-score-section-compact">
          <div class="jh-fit-score-compact">
            <span class="jh-fit-chip">ANALYZING...</span>
            <div class="jh-score-circle-compact">
              <span class="jh-score-value">--</span>
            </div>
          </div>
          <div class="jh-job-info-compact">
            <div class="jh-header-company">Loading...</div>
            <div class="jh-header-title">Loading...</div>
            <div class="jh-header-meta">
              <span class="jh-header-location">--</span>
              <span class="jh-header-posted">--</span>
            </div>
          </div>
        </div>

        <!-- Compact Stats Grid -->
        <div class="jh-stats-grid-compact">
          <div class="jh-stat-item-compact">
            <span class="jh-stat-label">Employees</span>
            <span class="jh-stat-value jh-stat-employees">--</span>
          </div>
          <div class="jh-stat-item-compact">
            <span class="jh-stat-label">Tenure</span>
            <span class="jh-stat-value jh-stat-tenure">--</span>
          </div>
          <div class="jh-stat-item-compact">
            <span class="jh-stat-label">2Y Growth</span>
            <span class="jh-stat-value jh-stat-growth">--</span>
          </div>
          <div class="jh-stat-item-compact jh-stat-full">
            <span class="jh-stat-label">Hiring Manager</span>
            <span class="jh-stat-value jh-stat-hiring-manager">--</span>
          </div>
        </div>
      </div>

      <!-- Score Breakdown - Consolidated -->
      <div class="jh-score-breakdown">
        <div class="jh-breakdown-section">
          <div class="jh-breakdown-list">
            <!-- Populated dynamically with all criteria in the preferred display order -->
          </div>
        </div>
      </div>

      <!-- Dealbreakers -->
      <div class="jh-dealbreakers" style="display: none;"></div>

      <!-- Actions -->
      <div class="jh-actions">
        <button class="jh-btn jh-btn-hunt jh-btn-primary">Hunt Job</button>
      </div>
    </div>
  `;
}

/**
 * Get Outreach Mode sidebar HTML
 */
function getOutreachSidebarHTML() {
  return `
    <div class="jh-sidebar-container">
      <!-- Header -->
      <div class="jh-sidebar-header">
        <div class="jh-header-brand">
          <span class="jh-brand-text">Job Filter</span>
          <span class="jh-mode-badge">Outreach</span>
        </div>
        <div class="jh-header-controls">
          <button class="jh-btn-minimize" title="Minimize">−</button>
          <button class="jh-sidebar-close" title="Close">×</button>
        </div>
      </div>

      <!-- Contact mini-card -->
      <div class="jh-contact-card">
        <div class="jh-contact-info">
          <span class="jh-contact-name">Loading...</span>
          <span class="jh-contact-company">--</span>
          <span class="jh-contact-location">--</span>
          <span class="jh-contact-role">--</span>
        </div>
        <div class="jh-sync-row">
          <button class="jh-btn jh-btn-sync jh-btn-primary">Hunt Contact</button>
          <span class="jh-sync-status"></span>
        </div>
      </div>

      <!-- Outreach history -->
      <div class="jh-outreach-history">
        <div class="jh-section-header">
          <span class="jh-section-title">Outreach History</span>
        </div>
        <div class="jh-outreach-history-list">
          <div class="jh-outreach-empty">
            <p>No outreach history yet.</p>
            <p class="jh-outreach-hint">Hunt the contact first, then compose a message below.</p>
          </div>
        </div>
      </div>

      <!-- Compose area -->
      <div class="jh-compose">
        <div class="jh-section-header">
          <span class="jh-section-title">Compose Message</span>
        </div>
        <div class="jh-compose-form">
          <div class="jh-select-wrapper">
            <select class="jh-channel-select">
              <option value="LinkedIn Message">LinkedIn Message</option>
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="In-Person">In-Person</option>
              <option value="Other">Other</option>
            </select>
            <span class="jh-select-chevron">▼</span>
          </div>
          <textarea class="jh-compose-textarea" placeholder="Draft your outreach message..."></textarea>
          <div class="jh-compose-actions">
            <button class="jh-btn jh-btn-copy-draft">Copy Draft</button>
            <button class="jh-btn jh-btn-save-draft jh-btn-primary">Save to Outreach Log</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// STYLES - Command Center Design
// ============================================================================

/**
 * Get sidebar CSS styles
 */
function getSidebarStyles() {
  return `
    /* ========================================
       JOB HUNTER SIDEBAR RAIL - Command Center
       ======================================== */

    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700;900&display=swap');

    #jh-sidebar-rail {
      position: fixed;
      top: 52px;
      right: 0;
      width: 400px;
      min-width: 280px;
      max-width: 600px;
      height: calc(100vh - 52px);
      min-height: 300px;
      background: #F4F7FA;
      border-left: 1px solid #D1D9E0;
      box-shadow: -8px 0 24px rgba(0,0,0,0.15);
      z-index: 9999;
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #1F2937;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, opacity 0.2s ease;
    }

    /* Resize handle on left edge */
    .jh-resize-handle-left {
      position: absolute;
      left: 0;
      top: 0;
      width: 6px;
      height: 100%;
      cursor: ew-resize;
      background: transparent;
      z-index: 10001;
    }
    .jh-resize-handle-left:hover,
    .jh-resize-handle-left.jh-resizing {
      background: linear-gradient(to right, rgba(88, 86, 214, 0.3), transparent);
    }

    /* Resize handle on bottom edge */
    .jh-resize-handle-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 6px;
      cursor: ns-resize;
      background: transparent;
      z-index: 10001;
    }
    .jh-resize-handle-bottom:hover,
    .jh-resize-handle-bottom.jh-resizing {
      background: linear-gradient(to bottom, transparent, rgba(88, 86, 214, 0.3));
    }

    /* Corner resize handle */
    .jh-resize-handle-corner {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 12px;
      height: 12px;
      cursor: nesw-resize;
      background: transparent;
      z-index: 10002;
    }
    .jh-resize-handle-corner:hover,
    .jh-resize-handle-corner.jh-resizing {
      background: rgba(88, 86, 214, 0.4);
      border-radius: 0 6px 0 0;
    }

    /* When resizing, prevent text selection */
    #jh-sidebar-rail.jh-is-resizing {
      user-select: none;
    }
    #jh-sidebar-rail.jh-is-resizing * {
      pointer-events: none;
    }
    #jh-sidebar-rail.jh-is-resizing .jh-resize-handle-left,
    #jh-sidebar-rail.jh-is-resizing .jh-resize-handle-bottom,
    #jh-sidebar-rail.jh-is-resizing .jh-resize-handle-corner {
      pointer-events: auto;
    }

    #jh-sidebar-rail.jh-hidden {
      transform: translateX(100%);
      opacity: 0;
    }

    #jh-sidebar-rail.jh-visible {
      transform: translateX(0);
      opacity: 1;
    }

    .jh-sidebar-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    /* ========================================
       HEADER
       ======================================== */

    .jh-sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      background: #EEF2FF;
      border-bottom: 1px solid #C7D2FE;
      flex-shrink: 0;
      cursor: grab;
      user-select: none;
    }

    .jh-sidebar-header.jh-dragging {
      cursor: grabbing;
    }

    .jh-header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .jh-brand-text {
      font-family: 'Roboto', sans-serif;
      font-weight: 800;
      font-size: 17px;
      color: #5856D6;
      letter-spacing: -0.3px;
    }

    .jh-mode-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      background: #C7D2FE;
      color: #4F46E5;
      border-radius: 12px;
    }

    .jh-header-controls {
      display: flex;
      gap: 6px;
    }

    .jh-header-controls button {
      width: 28px;
      height: 28px;
      border: none;
      background: #E0E7FF;
      border-radius: 6px;
      cursor: pointer;
      color: #5856D6;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .jh-header-controls button:hover {
      background: #C7D2FE;
      color: #4F46E5;
    }

    /* ========================================
       FIT LABEL CHIP
       ======================================== */

    .jh-fit-row {
      padding: 12px 16px;
      background: #ffffff;
      border-bottom: 1px solid #E5E7EB;
      text-align: center;
      flex-shrink: 0;
    }

    .jh-fit-chip {
      display: inline-block;
      padding: 8px 24px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-radius: 20px;
      border: 2px solid #E5E7EB;
      background: #F4F7FA;
      color: #6B7280;
      transition: all 0.2s ease;
    }

    /* ========================================
       SCORE CARD
       ======================================== */

    .jh-score-card {
      padding: 16px;
      background: #ffffff;
      border-bottom: 1px solid #E5E7EB;
      flex-shrink: 0;
    }

    .jh-score-section {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
    }

    .jh-score-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F4F7FA;
      border: 4px solid #E5E7EB;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .jh-score-value {
      font-size: 26px;
      font-weight: 700;
      color: #6B7280;
      transition: color 0.3s ease;
    }

    .jh-job-info {
      flex: 1;
      min-width: 0;
    }

    .jh-header-company {
      font-weight: 600;
      font-size: 16px;
      color: #1F2937;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }

    .jh-header-title {
      font-weight: 700;
      font-size: 18px;
      color: #1F2937;
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
      margin-bottom: 4px;
    }

    .jh-header-location {
      font-size: 13px;
      color: #6B7280;
    }

    /* ========================================
       STATS GRID
       ======================================== */

    .jh-stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1px;
      background: #E5E7EB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      overflow: hidden;
    }

    .jh-stat-item {
      display: flex;
      flex-direction: column;
      padding: 10px 12px;
      background: #ffffff;
    }

    .jh-stat-item.jh-stat-full {
      grid-column: span 2;
    }

    .jh-stat-label {
      font-size: 10px;
      font-weight: 500;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }

    .jh-stat-value {
      font-size: 14px;
      font-weight: 600;
      color: #1F2937;
    }

    .jh-stat-value.jh-positive {
      color: #059669;
    }

    .jh-stat-value.jh-negative {
      color: #EF4444;
    }

    /* ========================================
       SCORE BREAKDOWN
       ======================================== */

    .jh-score-breakdown {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      box-shadow:
        inset 0 8px 8px -8px rgba(15, 23, 42, 0.18),
        inset 0 -8px 8px -8px rgba(15, 23, 42, 0.18);
    }

    .jh-breakdown-section {
      margin-bottom: 10px;
    }

    .jh-breakdown-section:last-child {
      margin-bottom: 0;
    }

    .jh-breakdown-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-radius: 8px;
      margin-bottom: 12px;
    }

    .jh-breakdown-job-fit .jh-breakdown-section-header {
      background: #1F2937;
    }

    .jh-breakdown-your-fit .jh-breakdown-section-header {
      background: #1F2937;
    }

    .jh-breakdown-section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #ffffff;
    }

    .jh-section-progress {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .jh-progress-bar-container {
      width: 80px;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
    }

    .jh-section-progress .jh-progress-fill {
      height: 100%;
      background: #10B981;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .jh-progress-text {
      font-size: 12px;
      font-weight: 600;
      color: #ffffff;
      min-width: 40px;
    }

    .jh-breakdown-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      grid-auto-rows: minmax(110px, auto);
      grid-auto-flow: row;
      align-content: start;
    }

    .jh-breakdown-item {
      background: transparent;
      border: none;
      position: relative;
      cursor: grab;
      user-select: none;
      perspective: 1000px;
      min-height: 110px;
      height: 100%;
      resize: both;
      overflow: visible;
      box-sizing: border-box;
    }

    .jh-breakdown-item.jh-full-width {
      grid-column: span 2;
      resize: vertical;
    }

    .jh-size-1 {
      grid-row-end: span 1;
    }

    .jh-size-2 {
      grid-row-end: span 2;
    }

    .jh-size-4 {
      grid-row-end: span 4;
    }

    .jh-size-6 {
      grid-row-end: span 6;
    }

    .jh-breakdown-item.jh-no-flip .jh-card-inner {
      transform: none;
    }

    .jh-breakdown-item.jh-no-flip:hover .jh-card-inner {
      transform: none;
    }

    .jh-breakdown-item.jh-no-flip .jh-card-back {
      display: none;
    }

    .jh-breakdown-item.jh-badge-card {
      height: auto;
      resize: none;
      align-self: start;
    }

    .jh-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.6s;
      transform-style: preserve-3d;
    }

    .jh-breakdown-item:hover .jh-card-inner {
      transform: rotateY(180deg);
    }

    .jh-card-front,
    .jh-card-back {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      border-radius: 8px;
      padding: 10px;
      box-sizing: border-box;
    }

    .jh-breakdown-item.jh-dragging {
      opacity: 0.65;
      cursor: grabbing;
    }

    .jh-card-front {
      background: #ffffff;
      border: 1px solid #E5E7EB;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .jh-breakdown-item.jh-badge-card .jh-card-inner {
      height: auto;
      position: static;
    }

    .jh-breakdown-item.jh-badge-card .jh-card-front {
      position: static;
      height: auto;
      overflow: visible;
    }

    .jh-breakdown-item:hover .jh-card-front {
      border-color: #5856D6;
      box-shadow: 0 2px 8px rgba(88, 86, 214, 0.15);
    }

    .jh-card-back {
      background: linear-gradient(135deg, #5856D6 0%, #4845B4 100%);
      color: white;
      transform: rotateY(180deg);
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;
      text-align: left;
      padding: 16px;
    }

    .jh-card-back-header {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.9;
    }

    .jh-card-back-content {
      font-size: 11px;
      line-height: 1.4;
      opacity: 0.95;
      flex: 1;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 6;
      -webkit-box-orient: vertical;
      min-height: 32px;
    }

    .jh-card-back-weight {
      margin-top: auto;
      padding-top: 6px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.75);
    }

    .jh-flip-hint {
      font-size: 10px;
      color: #9CA3AF;
      text-align: center;
      margin-top: 8px;
      opacity: 0.7;
    }

    .jh-breakdown-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .jh-breakdown-name {
      font-size: 13px;
      font-weight: 600;
      color: #1F2937;
    }

    .jh-breakdown-score {
      font-size: 12px;
      font-weight: 600;
      color: #1F2937;
    }

    .jh-weight {
      font-size: 10px;
      font-weight: 500;
      color: #9CA3AF;
      margin-left: 4px;
    }

    .jh-progress-bar {
      height: 6px;
      background: #E5E7EB;
      border-radius: 3px;
      overflow: hidden;
    }

    .jh-progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s ease;
    }

    .jh-progress-fill.jh-high {
      background: #10B981;
    }

    .jh-progress-fill.jh-low {
      background: #F97316;
    }

    .jh-actual-value {
      font-size: 12px;
      color: #6B7280;
      margin-top: 6px;
    }

    .jh-detection-status {
      font-size: 12px;
      margin-top: 6px;
    }

    .jh-detection-status.jh-detected {
      color: #059669;
    }

    .jh-detection-status.jh-not-detected {
      color: #9CA3AF;
    }

    .jh-breakdown-empty {
      padding: 20px;
      text-align: center;
      color: #9CA3AF;
      font-size: 13px;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
    }

    /* ========================================
       SKILL TAGS - Light badges for matches, ghost for non-matches
       ======================================== */

    .jh-skill-tags,
    .jh-benefits-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }

    .jh-skill-tag,
    .jh-benefit-tag {
      font-size: 10px;
      font-weight: 500;
      padding: 3px 8px;
      background: transparent;
      color: #9CA3AF;
      border-radius: 10px;
      border: 1px dashed #D1D9E0;
    }

    .jh-more-badge {
      position: relative;
      cursor: pointer;
    }

    .jh-badge-tooltip {
      position: fixed;
      z-index: 999999;
      max-width: 240px;
      background: #111827;
      color: #F9FAFB;
      font-size: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
      white-space: normal;
      pointer-events: none;
    }

    /* Matched skills/benefits - light indigo background */
    .jh-skill-tag.jh-matched,
    .jh-benefit-tag.jh-matched {
      background: #EEF2FF;
      color: #5856D6;
      border: 1px solid #C7D2FE;
    }

    /* Ghost badges for non-matching */
    .jh-skill-tag.jh-ghost,
    .jh-benefit-tag.jh-ghost {
      background: transparent;
      color: #9CA3AF;
      border: 1px dashed #D1D9E0;
      opacity: 0.7;
    }

    /* "+X more" badges for overflow */
    .jh-skill-tag.jh-more,
    .jh-benefit-tag.jh-more {
      background: #F3F4F6;
      color: #6B7280;
      border: 1px solid #E5E7EB;
      cursor: pointer;
      font-weight: 500;
    }
    .jh-skill-tag.jh-more:hover,
    .jh-benefit-tag.jh-more:hover {
      background: #E5E7EB;
      color: #374151;
    }

    /* Responsive tag containers - expand to fit content */
    .jh-responsive-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }

    /* "Missing" badge - red/warning style with hover tooltip */
    .jh-skill-tag.jh-missing,
    .jh-benefit-tag.jh-missing {
      background: #FEF2F2;
      color: #DC2626;
      border: 1px solid #FECACA;
      cursor: pointer;
      font-weight: 500;
    }
    .jh-skill-tag.jh-missing:hover,
    .jh-benefit-tag.jh-missing:hover {
      background: #FEE2E2;
      border-color: #F87171;
    }

    /* Missing skills/benefits container with tooltip */
    .jh-missing-skills-container,
    .jh-missing-benefits-container {
      position: relative;
      display: inline-block;
      margin-top: 6px;
    }

    .jh-missing-tooltip {
      display: none;
      position: absolute;
      bottom: 100%;
      left: 0;
      z-index: 10002;
      min-width: 200px;
      max-width: 300px;
      background: #1F2937;
      color: #F9FAFB;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .jh-missing-skills-container:hover .jh-missing-tooltip,
    .jh-missing-benefits-container:hover .jh-missing-tooltip {
      display: block;
    }

    .jh-missing-tooltip-header {
      font-size: 11px;
      font-weight: 600;
      color: #F87171;
      margin-bottom: 6px;
    }

    .jh-missing-tooltip-content {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .jh-missing-skill-item,
    .jh-missing-benefit-item {
      font-size: 10px;
      background: #374151;
      color: #F9FAFB;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .jh-skills-summary,
    .jh-benefits-summary,
    .jh-tools-summary {
      font-size: 11px;
      color: #6B7280;
      margin-top: 6px;
    }

    /* ========================================
       TOOLS TAGS - Show required and desired tools
       ======================================== */

    .jh-tools-section {
      margin-top: 8px;
    }

    .jh-tools-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }

    .jh-tool-tag {
      font-size: 10px;
      font-weight: 500;
      padding: 3px 8px;
      border-radius: 12px;
      background: transparent;
      color: #9CA3AF;
      border: 1px dashed #D1D9E0;
      max-width: 100%;
      display: inline-block;
      word-break: break-word;
      white-space: normal;
    }

    /* Required tools - teal/cyan color to differentiate from skills */
    .jh-tool-tag.jh-required {
      background: #F0FDFA;
      color: #0D9488;
      border: 1px solid #99F6E4;
    }

    /* Desired/nice-to-have tools - lighter/muted style */
    .jh-tool-tag.jh-desired {
      background: #F9FAFB;
      color: #6B7280;
      border: 1px dashed #D1D9E0;
    }

    .jh-desired-tools {
      margin-top: 6px;
    }

    .jh-weight-inline {
      margin-top: auto;
      padding-top: 6px;
      font-size: 10px;
      color: #9CA3AF;
    }


    /* ========================================
       SALARY COMPARISON DISPLAY
       ======================================== */

    .jh-salary-comparison {
      margin-top: 6px;
      background: #F9FAFB;
      border-radius: 8px;
      padding: 8px;
    }

    .jh-salary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .jh-salary-row.jh-salary-single {
      justify-content: flex-end;
    }

    .jh-salary-row.jh-salary-single .jh-salary-label-text {
      display: none;
    }

    .jh-salary-row:last-of-type {
      margin-bottom: 0;
    }

    .jh-salary-row + .jh-salary-row {
      border-top: 1px solid #E5E7EB;
      padding-top: 4px;
      margin-top: 4px;
    }

    .jh-salary-label-text {
      font-size: 10px;
      color: #6B7280;
      font-weight: 500;
    }

    .jh-salary-value {
      font-size: 11px;
      color: #1F2937;
      font-weight: 600;
    }

    .jh-salary-value.jh-salary-muted {
      font-weight: 500;
      color: #4B5563;
    }

    .jh-compact-card .jh-card-front {
      padding: 8px;
    }

    .jh-compact-card .jh-breakdown-row {
      margin-bottom: 4px;
    }

    /* ========================================
       PROFILE MISMATCH WARNINGS
       ======================================== */

    .jh-mismatch-warnings {
      padding: 6px 12px;
      margin-bottom: 0;
      background: #FFFFFF;
    }

    .jh-mismatch-alert {
      padding: 8px 10px;
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      border-radius: 8px;
    }

    .jh-mismatch-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .jh-mismatch-icon {
      font-size: 14px;
      color: #B45309;
    }

    .jh-mismatch-header strong {
      font-size: 12px;
      color: #B45309;
    }

    .jh-mismatch-list {
      margin: 0;
      padding-left: 20px;
      font-size: 11px;
      color: #92400E;
    }

    .jh-mismatch-list li {
      margin: 3px 0;
    }

    /* ========================================
       PROGRESS BAR - Medium state
       ======================================== */

    .jh-progress-fill.jh-medium {
      background: #F59E0B;
    }

    /* ========================================
       DEALBREAKERS
       ======================================== */

    .jh-dealbreakers {
      padding: 0 16px 16px;
      flex-shrink: 0;
      background: #FFFFFF;
    }

    .jh-dealbreaker-alert {
      padding: 12px;
      background: #FEE2E2;
      border: 1px solid #FECACA;
      border-radius: 8px;
    }

    .jh-dealbreaker-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .jh-dealbreaker-icon {
      font-size: 18px;
      color: #991B1B;
    }

    .jh-dealbreaker-header strong {
      font-size: 13px;
      color: #991B1B;
    }

    .jh-dealbreaker-list {
      margin: 0;
      padding-left: 24px;
      font-size: 12px;
      color: #991B1B;
    }

    .jh-dealbreaker-list li {
      margin: 4px 0;
    }

    /* ========================================
       ACTIONS
       ======================================== */

    .jh-actions {
      display: flex;
      justify-content: center;
      padding: 12px;
      background: #EEF2FF;
      border-top: 1px solid #C7D2FE;
      flex-shrink: 0;
    }

    .jh-btn {
      width: 100%;
      max-width: 260px;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .jh-btn-primary {
      background: #5856D6;
      color: white;
    }

    .jh-btn-primary:hover {
      background: #4845B4;
    }

    .jh-btn-primary.jh-loading {
      opacity: 0.7;
      cursor: wait;
    }

    .jh-btn-primary.jh-success {
      background: #059669;
    }

    .jh-btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 6px;
    }

    /* ========================================
       OUTREACH MODE - CONTACT CARD
       ======================================== */

    .jh-contact-card {
      padding: 16px;
      background: #ffffff;
      border-bottom: 1px solid #E5E7EB;
      flex-shrink: 0;
    }

    .jh-contact-info {
      margin-bottom: 12px;
    }

    .jh-contact-name {
      display: block;
      font-size: 18px;
      font-weight: 700;
      color: #1F2937;
    }

    .jh-contact-role {
      display: block;
      font-size: 14px;
      color: #6B7280;
      margin-top: 2px;
    }

    .jh-contact-company {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #1F2937;
      margin-top: 4px;
    }

    .jh-contact-location {
      display: block;
      font-size: 13px;
      color: #6B7280;
      margin-top: 2px;
    }

    .jh-sync-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .jh-btn-sync {
      flex: 1;
    }

    .jh-sync-status {
      font-size: 12px;
      display: none;
    }

    .jh-sync-syncing { color: #F59E0B; }
    .jh-sync-synced { color: #059669; }
    .jh-sync-error { color: #EF4444; }

    /* ========================================
       OUTREACH MODE - HISTORY
       ======================================== */

    .jh-outreach-history {
      flex: 1;
      overflow-y: auto;
    }

    .jh-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #F4F7FA;
      border-bottom: 1px solid #E5E7EB;
      position: sticky;
      top: 0;
    }

    .jh-section-title {
      font-weight: 600;
      font-size: 13px;
      color: #1F2937;
    }

    .jh-outreach-history-list {
      padding: 16px;
    }

    .jh-outreach-empty {
      text-align: center;
      padding: 24px 16px;
      color: #6B7280;
    }

    .jh-outreach-empty p {
      margin: 0 0 8px 0;
    }

    .jh-outreach-hint {
      font-size: 12px;
      color: #9CA3AF;
    }

    .jh-outreach-entry {
      padding: 12px;
      background: #ffffff;
      border-radius: 8px;
      margin-bottom: 10px;
      border: 1px solid #E5E7EB;
    }

    .jh-outreach-entry-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .jh-outreach-channel {
      font-size: 12px;
      font-weight: 600;
      color: #5856D6;
    }

    .jh-outreach-status {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .jh-status-sent {
      background: #D1FAE5;
      color: #059669;
    }

    .jh-status-not-sent {
      background: #FEF3C7;
      color: #B45309;
    }

    .jh-outreach-date {
      font-size: 11px;
      color: #9CA3AF;
      margin-left: auto;
    }

    .jh-outreach-entry-message {
      margin-bottom: 8px;
    }

    .jh-outreach-text {
      font-size: 13px;
      color: #1F2937;
      margin: 0;
      line-height: 1.5;
    }


    .jh-outreach-entry-actions {
      display: flex;
      gap: 8px;
    }

    /* ========================================
       OUTREACH MODE - COMPOSE
       ======================================== */

    .jh-compose {
      flex-shrink: 0;
      background: #ffffff;
      border-top: 1px solid #E5E7EB;
    }

    .jh-compose-form {
      padding: 12px 16px;
    }

    .jh-channel-select {
      width: 100%;
      padding: 10px 12px;
      font-size: 13px;
      border: 1px solid #D1D9E0;
      border-radius: 6px;
      margin-bottom: 10px;
      background: white;
    }

    .jh-compose-textarea {
      width: 100%;
      height: 80px;
      padding: 10px 12px;
      font-size: 13px;
      border: 1px solid #D1D9E0;
      border-radius: 6px;
      resize: vertical;
      font-family: inherit;
      margin-bottom: 10px;
    }

    .jh-compose-textarea:focus {
      outline: none;
      border-color: #5856D6;
    }

    .jh-compose-actions {
      display: flex;
      gap: 8px;
    }

    .jh-btn-copy-draft {
      background: #F4F7FA;
      color: #1F2937;
      border: 1px solid #D1D9E0;
    }

    /* ========================================
       SELECT WRAPPER WITH CHEVRON
       ======================================== */

    .jh-select-wrapper {
      position: relative;
      width: 100%;
      margin-bottom: 10px;
    }

    .jh-select-wrapper .jh-channel-select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      padding-right: 36px;
      margin-bottom: 0;
      width: 100%;
      box-sizing: border-box;
      cursor: pointer;
      background-color: white;
      background-image: none;
    }

    .jh-select-chevron {
      position: absolute;
      right: 14px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 12px;
      color: #6B7280;
      pointer-events: none;
      font-weight: bold;
    }

    /* ========================================
       COMPACT HEADER STYLES
       ======================================== */

    .jh-score-card-compact {
      padding: 10px 12px;
    }

    .jh-score-section-compact {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
    }

    .jh-fit-score-compact {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .jh-fit-score-compact .jh-fit-chip {
      padding: 4px 12px;
      font-size: 10px;
      font-weight: 700;
      border-radius: 12px;
    }

    .jh-score-circle-compact {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F4F7FA;
      border: 3px solid #E5E7EB;
      flex-shrink: 0;
    }

    .jh-score-circle-compact .jh-score-value {
      font-size: 18px;
      font-weight: 700;
    }

    .jh-job-info-compact {
      flex: 1;
      min-width: 0;
    }

    .jh-job-info-compact .jh-header-company {
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
      margin-bottom: 1px;
    }

    .jh-job-info-compact .jh-header-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 2px;
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
    }

    .jh-header-meta {
      font-size: 11px;
      color: #6B7280;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .jh-header-posted {
      color: #9CA3AF;
    }

    /* Compact Stats Grid */
    .jh-stats-grid-compact {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1px;
      background: #E5E7EB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      overflow: hidden;
    }

    .jh-stat-item-compact {
      display: flex;
      flex-direction: column;
      padding: 6px 8px;
      background: #ffffff;
    }

    .jh-stat-item-compact.jh-stat-full {
      grid-column: span 3;
    }

    .jh-stat-item-compact .jh-stat-label {
      font-size: 9px;
      margin-bottom: 1px;
    }

    .jh-stat-item-compact .jh-stat-value {
      font-size: 12px;
      font-weight: 600;
    }

    .jh-hm-name {
      font-size: 12px;
      font-weight: 600;
      color: #111827;
      line-height: 1.2;
    }

    .jh-hm-title {
      font-size: 10px;
      font-weight: 400;
      color: #6B7280;
      line-height: 1.2;
      margin-top: 2px;
    }

    /* ========================================
       MINIMIZE STATE
       ======================================== */

    #jh-sidebar-rail.jh-minimized {
      height: auto;
      min-height: 0;
      max-height: none;
      overflow: hidden;
    }

    #jh-sidebar-rail.jh-minimized .jh-sidebar-container > *:not(.jh-sidebar-header) {
      display: none;
    }

    #jh-sidebar-rail.jh-minimized .jh-sidebar-header {
      border-bottom: none;
    }

    /* ========================================
       SCROLLBAR
       ======================================== */

    .jh-score-breakdown::-webkit-scrollbar,
    .jh-outreach-history::-webkit-scrollbar {
      width: 6px;
    }

    .jh-score-breakdown::-webkit-scrollbar-thumb,
    .jh-outreach-history::-webkit-scrollbar-thumb {
      background: #D1D9E0;
      border-radius: 3px;
    }

    .jh-score-breakdown::-webkit-scrollbar-track,
    .jh-outreach-history::-webkit-scrollbar-track {
      background: transparent;
    }
  `;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toLocaleString();
}

function formatSalary(num) {
  if (num >= 1000) return Math.round(num / 1000) + 'K';
  return num.toLocaleString();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatBadgeLabel(label) {
  return (label || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getCriteriaKey(criteria) {
  const raw = (criteria || '').toLowerCase();
  const map = {
    'base salary': 'base salary',
    'bonus & equity': 'bonus & equity',
    'title match': 'title match',
    'title alignment': 'title match',
    'experience level': 'experience',
    'experience': 'experience',
    'location match': 'location',
    'location': 'location',
    'industry experience': 'industry',
    'industry': 'industry',
    'skills overlap': 'skills',
    'skills': 'skills',
    'required tools': 'tools',
    'tools': 'tools',
    'benefits package': 'benefits',
    'benefits': 'benefits',
    'lifecycle stage': 'lifecycle',
    'lifecycle': 'lifecycle',
    'org stability': 'org stability',
    'organization stability': 'org stability'
  };
  return map[raw] || raw;
}

function sortCriteriaByOrder(criteriaList, customOrder) {
  const defaultOrder = [
    'base salary',
    'bonus & equity',
    'title match',
    'experience',
    'location',
    'industry',
    'benefits',
    'skills',
    'tools',
    'lifecycle',
    'org stability'
  ];

  const order = Array.isArray(customOrder) && customOrder.length > 0 ? customOrder : defaultOrder;
  const orderIndex = new Map(order.map((key, idx) => [key, idx]));

  return [...criteriaList].sort((a, b) => {
    const keyA = getCriteriaKey(a.criteria);
    const keyB = getCriteriaKey(b.criteria);
    const orderA = orderIndex.has(keyA) ? orderIndex.get(keyA) : Number.MAX_SAFE_INTEGER;
    const orderB = orderIndex.has(keyB) ? orderIndex.get(keyB) : Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) return orderA - orderB;

    const weightA = a.weight || 0;
    const weightB = b.weight || 0;
    if (weightA !== weightB) return weightB - weightA;

    return keyA.localeCompare(keyB);
  });
}

function enableCriteriaReorder(breakdownList) {
  if (!breakdownList || breakdownList.dataset.reorderEnabled === 'true') {
    return;
  }

  breakdownList.dataset.reorderEnabled = 'true';

  breakdownList.addEventListener('dragstart', (event) => {
    const item = event.target.closest('.jh-breakdown-item');
    if (!item) return;
    item.classList.add('jh-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.dataset.criteriaKey || '');
  });

  breakdownList.addEventListener('dragend', () => {
    breakdownList.querySelectorAll('.jh-dragging').forEach((el) => {
      el.classList.remove('jh-dragging');
    });
    saveCriteriaOrder(breakdownList);
    applyGridLayout(breakdownList);
  });

  breakdownList.addEventListener('dragover', (event) => {
    event.preventDefault();
    const dragging = breakdownList.querySelector('.jh-dragging');
    const target = event.target.closest('.jh-breakdown-item');
    if (!dragging || !target || dragging === target) return;

    const rect = target.getBoundingClientRect();
    const shouldInsertAfter = (event.clientY - rect.top) > rect.height / 2;
    breakdownList.insertBefore(dragging, shouldInsertAfter ? target.nextSibling : target);
  });

  breakdownList.addEventListener('drop', (event) => {
    event.preventDefault();
    saveCriteriaOrder(breakdownList);
    applyGridLayout(breakdownList);
  });
}

function saveCriteriaOrder(breakdownList) {
  const order = Array.from(breakdownList.querySelectorAll('.jh-breakdown-item'))
    .map((item) => item.dataset.criteriaKey)
    .filter(Boolean);

  if (chrome?.storage?.local) {
    chrome.storage.local.set({ [CRITERIA_ORDER_STORAGE_KEY]: order });
  }
}

const GRID_ROW_HEIGHT = 110;
const GRID_ALLOWED_SPANS = [1, 2, 3, 4, 5, 6];

function getSpanForHeight(height) {
  const rawSpan = Math.max(GRID_ALLOWED_SPANS[0], Math.ceil(height / GRID_ROW_HEIGHT));
  return GRID_ALLOWED_SPANS.find(span => span >= rawSpan) || GRID_ALLOWED_SPANS[GRID_ALLOWED_SPANS.length - 1];
}

function setItemSize(item, span) {
  GRID_ALLOWED_SPANS.forEach(size => item.classList.remove(`jh-size-${size}`));
  item.classList.add(`jh-size-${span}`);
  item.dataset.sizeSpan = String(span);
}

function applyItemGridSpan(item, breakdownList) {
  const styles = window.getComputedStyle(breakdownList);
  const columnGap = parseFloat(styles.columnGap || styles.gap || 0);
  const listWidth = breakdownList.clientWidth;
  const columnWidth = (listWidth - columnGap) / 2;
  const desiredColSpan = item.classList.contains('jh-full-width')
    ? 2
    : (item.offsetWidth > columnWidth * 1.1 ? 2 : 1);
  const span = parseInt(item.dataset.sizeSpan || '1', 10);
  const isBadgeCard = item.dataset.criteriaKey === 'skills' || item.dataset.criteriaKey === 'benefits';

  item.style.gridColumnEnd = `span ${desiredColSpan}`;
  item.style.gridRowEnd = `span ${span}`;
  item.style.width = '100%';
  item.style.height = isBadgeCard ? 'auto' : '100%';
  item.style.alignSelf = isBadgeCard ? 'start' : 'stretch';
}

function adjustCriteriaCardHeights(breakdownList) {
  if (!breakdownList) return;

  const items = Array.from(breakdownList.querySelectorAll('.jh-breakdown-item'));

  items.forEach((item) => {
    if (item.dataset.userResized === 'true') return;
    const front = item.querySelector('.jh-card-front');
    if (!front) return;
    const isBadgeCard = item.dataset.criteriaKey === 'skills' || item.dataset.criteriaKey === 'benefits';
    if (isBadgeCard) return;
    const minSpan = 1;
    const requiredSpan = getSpanForHeight(front.scrollHeight);
    let targetSpan = Math.max(minSpan, requiredSpan);

    setItemSize(item, targetSpan);
  });
}

function enableCardResizing(breakdownList) {
  if (!breakdownList || breakdownList.dataset.resizeEnabled === 'true') {
    return;
  }

  breakdownList.dataset.resizeEnabled = 'true';

  breakdownList.querySelectorAll('.jh-breakdown-item').forEach((item) => {
    applyItemGridSpan(item, breakdownList);
    item.addEventListener('mouseup', () => {
      item.dataset.userResized = 'true';
      const span = getSpanForHeight(item.offsetHeight);
      const minSpan = item.classList.contains('jh-full-width') ? 2 : 1;
      setItemSize(item, Math.max(minSpan, span));
      applyItemGridSpan(item, breakdownList);
    });
  });
}

function applyGridLayout(breakdownList) {
  if (!breakdownList) return;
  adjustCriteriaCardHeights(breakdownList);
  breakdownList.querySelectorAll('.jh-breakdown-item').forEach((item) => {
    applyItemGridSpan(item, breakdownList);
  });
  updateBadgeOverflow(breakdownList);
}

function updateBadgeOverflow(breakdownList) {
  if (!breakdownList) return;

  const tagSections = breakdownList.querySelectorAll('.jh-skill-tags, .jh-benefits-tags, .jh-tools-tags');
  tagSections.forEach((section) => {
    if (section.classList.contains('jh-benefits-tags') || section.classList.contains('jh-skill-tags') || section.classList.contains('jh-tools-tags')) {
      return;
    }
    const badges = Array.from(section.querySelectorAll('span'));
    if (badges.length === 0) return;

    // Remove existing "+ more" badge if any
    badges.forEach((badge) => {
      if (badge.classList.contains('jh-more-badge')) {
        badge.remove();
      } else {
        badge.style.display = '';
      }
    });

    const card = section.closest('.jh-card-front');
    if (!card) return;

    const cardRect = card.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const weightEl = card.querySelector('.jh-weight-inline');
    const reserved = weightEl ? (weightEl.getBoundingClientRect().height + 6) : 0;
    const availableHeight = Math.max(0, cardRect.bottom - sectionRect.top - 10 - reserved);

    let lastVisibleIndex = badges.length - 1;
    for (let i = 0; i < badges.length; i += 1) {
      const badgeRect = badges[i].getBoundingClientRect();
      if ((badgeRect.bottom - sectionRect.top) > availableHeight) {
        lastVisibleIndex = Math.max(0, i - 1);
        break;
      }
    }

    if (badges.length > 1) {
      const rowTops = [];
      badges.forEach((badge) => {
        const top = badge.getBoundingClientRect().top;
        if (!rowTops.some(t => Math.abs(t - top) < 2)) {
          rowTops.push(top);
        }
      });

      const maxRows = 2;
      if (rowTops.length > 0) {
        const allowedTop = rowTops[Math.min(maxRows - 1, rowTops.length - 1)];
        const rowLimitedIndex = badges.reduce((idx, badge, i) => (
          badge.getBoundingClientRect().top <= allowedTop ? i : idx
        ), 0);
        lastVisibleIndex = Math.min(lastVisibleIndex, rowLimitedIndex);
      }
    }

    if (lastVisibleIndex < badges.length - 1) {
      const remaining = badges.slice(lastVisibleIndex + 1);
      remaining.forEach(badge => {
        badge.style.display = 'none';
      });

      const remainingLabels = remaining.map(badge => badge.textContent.trim()).filter(Boolean);
      const moreBadge = document.createElement('span');
      moreBadge.className = `${section.classList.contains('jh-skill-tags') ? 'jh-skill-tag' : 'jh-benefit-tag'} jh-ghost jh-more-badge`;
      moreBadge.dataset.remaining = remainingLabels.join(', ');
      moreBadge.textContent = `+${remainingLabels.length} more`;
      section.appendChild(moreBadge);
      attachBadgeTooltip(moreBadge);
    }
  });
}

function attachBadgeTooltip(badge) {
  if (!badge || badge.dataset.tooltipBound === 'true') return;
  badge.dataset.tooltipBound = 'true';

  let tooltip = null;

  const show = () => {
    const text = badge.dataset.remaining || '';
    if (!text) return;
    tooltip = document.createElement('div');
    tooltip.className = 'jh-badge-tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    const rect = badge.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const top = Math.max(8, rect.top - tooltipRect.height - 8);
    const left = Math.min(window.innerWidth - tooltipRect.width - 8, rect.left);
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  };

  const hide = () => {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  };

  badge.addEventListener('mouseenter', show);
  badge.addEventListener('mouseleave', hide);
  badge.addEventListener('blur', hide);
}

function applySavedSidebarPosition(sidebar) {
  if (!chrome?.storage?.local || !sidebar) return;

  chrome.storage.local.get([SIDEBAR_POSITION_STORAGE_KEY], (result) => {
    const position = result[SIDEBAR_POSITION_STORAGE_KEY];
    if (!position) return;

    sidebar.style.left = `${position.left}px`;
    sidebar.style.top = `${position.top}px`;
    sidebar.style.right = 'auto';
  });
}

function enableSidebarDrag(sidebar) {
  if (!sidebar) return;

  const header = sidebar.querySelector('.jh-sidebar-header');
  if (!header || header.dataset.dragEnabled === 'true') return;

  header.dataset.dragEnabled = 'true';
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const onMouseMove = (event) => {
    if (!isDragging) return;
    const rect = sidebar.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;

    const nextLeft = Math.min(Math.max(0, event.clientX - offsetX), Math.max(0, maxLeft));
    const nextTop = Math.min(Math.max(0, event.clientY - offsetY), Math.max(0, maxTop));

    sidebar.style.left = `${nextLeft}px`;
    sidebar.style.top = `${nextTop}px`;
    sidebar.style.right = 'auto';
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    header.classList.remove('jh-dragging');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (chrome?.storage?.local) {
      const rect = sidebar.getBoundingClientRect();
      chrome.storage.local.set({
        [SIDEBAR_POSITION_STORAGE_KEY]: {
          left: rect.left,
          top: rect.top
        }
      });
    }
  };

  header.addEventListener('mousedown', (event) => {
    if (event.target.closest('.jh-header-controls')) return;
    isDragging = true;
    header.classList.add('jh-dragging');

    const rect = sidebar.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

/**
 * Add resize handles to the sidebar
 */
function addResizeHandles(sidebar) {
  if (!sidebar) return;

  // Left edge resize handle
  const leftHandle = document.createElement('div');
  leftHandle.className = 'jh-resize-handle-left';
  sidebar.appendChild(leftHandle);

  // Bottom edge resize handle
  const bottomHandle = document.createElement('div');
  bottomHandle.className = 'jh-resize-handle-bottom';
  sidebar.appendChild(bottomHandle);

  // Corner resize handle (bottom-left)
  const cornerHandle = document.createElement('div');
  cornerHandle.className = 'jh-resize-handle-corner';
  sidebar.appendChild(cornerHandle);
}

/**
 * Enable sidebar resizing via drag handles
 */
function enableSidebarResize(sidebar) {
  if (!sidebar) return;

  const SIDEBAR_SIZE_STORAGE_KEY = 'jh_sidebar_size';
  const MIN_WIDTH = 280;
  const MAX_WIDTH = 600;
  const MIN_HEIGHT = 300;

  // Apply saved size on load
  if (chrome?.storage?.local) {
    chrome.storage.local.get([SIDEBAR_SIZE_STORAGE_KEY], (result) => {
      const size = result[SIDEBAR_SIZE_STORAGE_KEY];
      if (size) {
        if (size.width) sidebar.style.width = `${size.width}px`;
        if (size.height) sidebar.style.height = `${size.height}px`;
      }
    });
  }

  const leftHandle = sidebar.querySelector('.jh-resize-handle-left');
  const bottomHandle = sidebar.querySelector('.jh-resize-handle-bottom');
  const cornerHandle = sidebar.querySelector('.jh-resize-handle-corner');

  let isResizing = false;
  let resizeType = null; // 'left', 'bottom', or 'corner'
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let startLeft = 0;

  const onMouseMove = (event) => {
    if (!isResizing) return;
    event.preventDefault();

    const deltaX = startX - event.clientX;
    const deltaY = event.clientY - startY;

    if (resizeType === 'left' || resizeType === 'corner') {
      // Resize width from left edge (increases when dragging left)
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + deltaX));
      const widthDiff = newWidth - startWidth;
      sidebar.style.width = `${newWidth}px`;
      sidebar.style.left = `${startLeft - widthDiff}px`;
      sidebar.style.right = 'auto';
    }

    if (resizeType === 'bottom' || resizeType === 'corner') {
      // Resize height from bottom edge
      const maxHeight = window.innerHeight - sidebar.getBoundingClientRect().top - 10;
      const newHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight + deltaY));
      sidebar.style.height = `${newHeight}px`;
    }
  };

  const onMouseUp = () => {
    if (!isResizing) return;
    isResizing = false;
    sidebar.classList.remove('jh-is-resizing');

    if (leftHandle) leftHandle.classList.remove('jh-resizing');
    if (bottomHandle) bottomHandle.classList.remove('jh-resizing');
    if (cornerHandle) cornerHandle.classList.remove('jh-resizing');

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    // Save the new size
    if (chrome?.storage?.local) {
      chrome.storage.local.set({
        [SIDEBAR_SIZE_STORAGE_KEY]: {
          width: sidebar.offsetWidth,
          height: sidebar.offsetHeight
        }
      });
    }
  };

  const startResize = (event, type) => {
    event.preventDefault();
    isResizing = true;
    resizeType = type;
    sidebar.classList.add('jh-is-resizing');

    const handle = type === 'left' ? leftHandle : (type === 'bottom' ? bottomHandle : cornerHandle);
    if (handle) handle.classList.add('jh-resizing');

    const rect = sidebar.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startWidth = rect.width;
    startHeight = rect.height;
    startLeft = rect.left;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  if (leftHandle) {
    leftHandle.addEventListener('mousedown', (e) => startResize(e, 'left'));
  }
  if (bottomHandle) {
    bottomHandle.addEventListener('mousedown', (e) => startResize(e, 'bottom'));
  }
  if (cornerHandle) {
    cornerHandle.addEventListener('mousedown', (e) => startResize(e, 'corner'));
  }
}

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'jobCaptureComplete') {
    console.log('[Job Filter Sidebar] Job capture complete:', request.success ? 'SUCCESS' : 'FAILURE');

    const sidebar = document.getElementById('jh-sidebar-rail');
    if (!sidebar) return;

    const huntBtn = sidebar.querySelector('.jh-btn-hunt');
    if (!huntBtn) return;

    if (request.success) {
      huntBtn.textContent = 'Captured!';
      huntBtn.classList.remove('jh-loading');
      huntBtn.classList.add('jh-success');
      huntBtn.disabled = false;

      setTimeout(() => {
        huntBtn.textContent = 'Hunt Job';
        huntBtn.classList.remove('jh-success');
      }, 3000);
    } else {
      huntBtn.textContent = 'Failed';
      huntBtn.classList.remove('jh-loading');
      huntBtn.disabled = false;

      setTimeout(() => {
        huntBtn.textContent = 'Hunt Job';
      }, 3000);
    }

    sendResponse({ received: true });
  }
});

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.JobHunterSidebar = {
    create: createSidebarRail,
    remove: removeSidebarRail,
    switchMode: switchSidebarMode,
    updateScore: updateSidebarScore,
    updateContact: updateSidebarContact,
    updateOutreachHistory: updateOutreachHistory,
    getState: () => sidebarState
  };
}
