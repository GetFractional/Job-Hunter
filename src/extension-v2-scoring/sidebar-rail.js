/**
 * Job Hunter OS - Docked Sidebar Rail (Command Center Design)
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

  // Set up event handlers
  setupSidebarEventHandlers(sidebar, mode);

  sidebarState.mode = mode;
  sidebarState.isVisible = true;

  console.log('[Job Hunter Sidebar] Created in mode:', mode);
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

  console.log('[Job Hunter Sidebar] Switching mode:', sidebarState.mode, '->', newMode);
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
    console.error('[Job Hunter Sidebar] Failed to create sidebar');
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
    console.warn('[Job Hunter Sidebar] Could not load user profile:', error);
  }

  // Update header section
  updateHeaderSection(sidebar, jobData, scoreResult);

  // Update fit label and score card
  updateFitScoreCard(sidebar, scoreResult);

  // Update score breakdown with progress bars - NOW WITH USER PROFILE
  updateScoreBreakdown(sidebar, scoreResult, userProfile);

  // Update dealbreakers if any
  updateDealbreakers(sidebar, scoreResult);

  // Show sidebar
  sidebar.classList.add('jh-visible');

  console.log('[Job Hunter Sidebar] Updated with score:', scoreResult.overall_score);
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
    const manager = jobData.hiringManagerDetails?.name;
    // Truncate long names
    const displayName = manager ? (manager.length > 15 ? manager.substring(0, 14) + '…' : manager) : '--';
    hiringManagerEl.textContent = displayName;
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
 * Update the score breakdown section with progress bars
 */
function updateScoreBreakdown(sidebar, scoreResult, userProfile = null) {
  // Consolidated section combining both job-to-user and user-to-job criteria
  const breakdownProgress = sidebar.querySelector('.jh-breakdown-section .jh-section-progress');
  const breakdownList = sidebar.querySelector('.jh-breakdown-section .jh-breakdown-list');

  // Calculate total score (job fit + user fit)
  const jobFitScore = scoreResult.job_to_user_fit?.score || 0;
  const userFitScore = scoreResult.user_to_job_fit?.score || 0;
  const totalScore = jobFitScore + userFitScore;

  // Update progress bar
  if (breakdownProgress) {
    const percentage = totalScore; // Total is already out of 100
    breakdownProgress.querySelector('.jh-progress-fill').style.width = `${percentage}%`;
    breakdownProgress.querySelector('.jh-progress-text').textContent = `${totalScore}/100`;
  }

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

    // Sort by weight/importance (highest first)
    allCriteria.sort((a, b) => {
      const weightA = a.weight || 0;
      const weightB = b.weight || 0;
      return weightB - weightA;
    });

    // Render all criteria in one consolidated list
    breakdownList.innerHTML = renderBreakdownItems(
      allCriteria,
      'consolidated',
      userProfile
    );
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

  // Check skills gap
  const skillsItem = userToJobBreakdown.find(b => b.criteria === 'Skills Overlap');
  if (skillsItem && skillsItem.match_percentage && skillsItem.match_percentage < 30) {
    warnings.push(`Skills gap: Only ${skillsItem.match_percentage}% of your skills match`);
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

    // Skills display with ghost badges for non-matching
    if (item.criteria === 'Skills Overlap' && (item.matched_skills || item.unmatched_skills || totalUserSkills)) {
      const matchedSkills = item.matched_skills || [];
      const unmatchedSkills = item.unmatched_skills || [];
      const matchCount = matchedSkills.length;

      // Calculate total correctly: either from unmatched + matched, or from user profile
      const actualTotal = matchedSkills.length + unmatchedSkills.length;
      const displayTotal = actualTotal > 0 ? actualTotal : totalUserSkills;

      // Show X/Y where Y is total user skills
      extraHtml += `<div class="jh-skills-summary">${matchCount}/${displayTotal} skills</div>`;

      // Combine matched and unmatched for display
      // Show ALL skills up to a reasonable limit (first 15 total)
      const displaySkills = [
        ...matchedSkills.map(s => ({ name: s, matched: true })),
        ...unmatchedSkills.map(s => ({ name: s, matched: false }))
      ].slice(0, 15);

      if (displaySkills.length > 0) {
        extraHtml += `
          <div class="jh-skill-tags">
            ${displaySkills.map(s =>
              `<span class="jh-skill-tag ${s.matched ? 'jh-matched' : 'jh-ghost'}">${escapeHtml(s.name)}</span>`
            ).join('')}
            ${(matchedSkills.length + unmatchedSkills.length) > 15 ? `<span class="jh-skill-tag jh-ghost">+${(matchedSkills.length + unmatchedSkills.length) - 15} more</span>` : ''}
          </div>
        `;
      }
    }

    // Benefits display - same logic as skills with ghost badges
    if (item.criteria === 'Benefits Package' || item.criteria === 'Benefits') {
      const matchedBenefits = item.matched_benefits || [];
      const allBenefits = item.all_benefits || [];
      const matchCount = matchedBenefits.length;

      // Show X/Y where Y is total user preferred benefits
      extraHtml += `<div class="jh-benefits-summary">${matchCount}/${totalUserBenefits} benefits matched</div>`;

      // Get user's preferred benefits to show as ghost badges if not matched
      const matchedSet = new Set(matchedBenefits.map(b => b.toLowerCase()));
      const preferredBenefits = userProfile?.preferences?.benefits || [];

      // Build display list: matched first, then unmatched preferred as ghost
      const displayBenefits = [];
      matchedBenefits.slice(0, 6).forEach(b => displayBenefits.push({ name: b, matched: true }));

      // Add unmatched preferred benefits as ghost
      preferredBenefits.forEach(b => {
        if (!matchedSet.has(b.toLowerCase()) && displayBenefits.length < 10) {
          displayBenefits.push({ name: b, matched: false });
        }
      });

      if (displayBenefits.length > 0) {
        extraHtml += `
          <div class="jh-benefits-tags">
            ${displayBenefits.map(b =>
              `<span class="jh-benefit-tag ${b.matched ? 'jh-matched' : 'jh-ghost'}">${escapeHtml(b.name)}</span>`
            ).join('')}
          </div>
        `;
      }
    }

    // Bonus & Equity combined display
    if (item.criteria === 'Bonus & Equity') {
      extraHtml += `<div class="jh-actual-value">${escapeHtml(item.actual_value || 'Not specified')}</div>`;
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
      let statusHtml = '';

      if (jobSalaryMin !== null || jobSalaryMax !== null) {
        // Show job salary range
        if (jobSalaryMin !== null && jobSalaryMax !== null) {
          jobRangeHtml = `$${formatSalary(jobSalaryMin)} - $${formatSalary(jobSalaryMax)}`;
        } else if (jobSalaryMin !== null) {
          jobRangeHtml = `$${formatSalary(jobSalaryMin)}+`;
        } else {
          jobRangeHtml = `Up to $${formatSalary(jobSalaryMax)}`;
        }

        // Calculate status and gap
        const jobMax = jobSalaryMax || jobSalaryMin || 0;
        const jobMin = jobSalaryMin || jobSalaryMax || 0;

        let statusClass = '';
        let statusText = '';
        let gapText = '';

        if (jobMax >= salaryTarget) {
          // Job max meets or exceeds target - excellent
          statusClass = 'jh-status-excellent';
          statusText = '✓ At or above target';
          const surplus = jobMax - salaryTarget;
          if (surplus > 0) {
            gapText = `+$${formatSalary(surplus)} above target`;
          }
        } else if (jobMax >= salaryFloor) {
          // Job is within acceptable range
          statusClass = 'jh-status-good';
          statusText = '✓ Within range';
          const gapToTarget = salaryTarget - jobMax;
          if (gapToTarget > 0) {
            gapText = `$${formatSalary(gapToTarget)} below target`;
          }
        } else {
          // Job is below minimum
          statusClass = 'jh-status-below';
          statusText = '⚠ Below minimum';
          const gap = salaryFloor - jobMax;
          gapText = `$${formatSalary(gap)} below floor`;
        }

        statusHtml = `
          <div class="jh-salary-status ${statusClass}">
            <div class="jh-salary-status-label">${statusText}</div>
            ${gapText ? `<div class="jh-salary-gap">${gapText}</div>` : ''}
          </div>
        `;
      } else {
        jobRangeHtml = 'Not specified';
        statusHtml = `<div class="jh-salary-status jh-status-unknown">Salary not listed</div>`;
      }

      extraHtml += `
        <div class="jh-salary-comparison">
          <div class="jh-salary-row">
            <span class="jh-salary-label-text">Job offers:</span>
            <span class="jh-salary-value">${jobRangeHtml}</span>
          </div>
          <div class="jh-salary-row">
            <span class="jh-salary-label-text">Your target:</span>
            <span class="jh-salary-value">$${formatSalary(salaryFloor)} - $${formatSalary(salaryTarget)}</span>
          </div>
          ${statusHtml}
        </div>
      `;
    }

    // Actual value display for other criteria
    else if (item.actual_value && !['Benefits Package', 'Benefits', 'Bonus & Equity', 'Skills Overlap', 'Experience Level', 'Base Salary'].includes(item.criteria)) {
      extraHtml += `<div class="jh-actual-value">${escapeHtml(item.actual_value)}</div>`;
    }

    // Progress bar color class
    const progressClass = isHigh ? 'jh-high' : (isMedium ? 'jh-medium' : 'jh-low');

    // Build score display - percentage with optional weight indicator
    const scoreDisplay = weight !== null
      ? `${percentage}% <span class="jh-weight">(${weight}%)</span>`
      : `${percentage}%`;

    // Determine if this item should be full-width (Skills and Benefits) or can be in grid
    const isFullWidth = ['Skills Overlap', 'Skills', 'Benefits Package', 'Benefits'].includes(item.criteria);
    const itemClass = isFullWidth ? 'jh-breakdown-item jh-full-width' : 'jh-breakdown-item';

    // Build fit assessment text for card flip back
    const rationaleText = item.rationale || 'Assessment details not available';
    const hasRationale = item.rationale && item.rationale.trim().length > 0;

    return `
      <div class="${itemClass}" data-criteria="${escapeHtml(item.criteria || '')}">
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
            ${hasRationale ? '<div class="jh-flip-hint">↻ Hover for details</div>' : ''}
          </div>
          ${hasRationale ? `
          <div class="jh-card-back">
            <div class="jh-card-back-header">${escapeHtml(criteriaName)}</div>
            <div class="jh-card-back-content">${escapeHtml(rationaleText)}</div>
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

  console.log('[Job Hunter Sidebar] Contact data loaded:', displayName);
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
        console.error('[Job Hunter Sidebar] Mark sent error:', err);
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
    console.error('[Job Hunter Sidebar] Fetch history error:', error);
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
          huntBtn.textContent = 'Send to Airtable';
          huntBtn.classList.remove('jh-success');
          huntBtn.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('[Job Hunter Sidebar] Hunt error:', error);
        huntBtn.textContent = 'Error';
        huntBtn.classList.remove('jh-loading');

        setTimeout(() => {
          huntBtn.textContent = 'Send to Airtable';
          huntBtn.disabled = false;
        }, 2000);
      }
    });
  }

  // View Details button
  const detailsBtn = sidebar.querySelector('.jh-btn-details');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => {
      if (window.JobHunterResults && sidebarState.currentScore && sidebarState.currentJobData) {
        window.JobHunterResults.showResultsModal(
          sidebarState.currentScore,
          sidebarState.currentJobData,
          window.sendJobToAirtable,
          window.openProfileSetup
        );
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
        console.error('[Job Hunter Sidebar] Sync error:', error);
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
        console.error('[Job Hunter Sidebar] Save draft error:', error);
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
          <span class="jh-brand-text">Job Hunter</span>
        </div>
        <div class="jh-header-controls">
          <button class="jh-btn-minimize" title="Minimize">−</button>
          <button class="jh-btn-settings" title="Edit Profile">⚙</button>
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
            <span class="jh-stat-label">Followers</span>
            <span class="jh-stat-value jh-stat-followers">--</span>
          </div>
          <div class="jh-stat-item-compact">
            <span class="jh-stat-label">Applicants</span>
            <span class="jh-stat-value jh-stat-applicants">--</span>
          </div>
          <div class="jh-stat-item-compact">
            <span class="jh-stat-label">2Y Growth</span>
            <span class="jh-stat-value jh-stat-growth">--</span>
          </div>
          <div class="jh-stat-item-compact">
            <span class="jh-stat-label">Tenure</span>
            <span class="jh-stat-value jh-stat-tenure">--</span>
          </div>
          <div class="jh-stat-item-compact">
            <span class="jh-stat-label">Hiring Mgr</span>
            <span class="jh-stat-value jh-stat-hiring-manager">--</span>
          </div>
        </div>
      </div>

      <!-- Score Breakdown - Consolidated -->
      <div class="jh-score-breakdown">
        <div class="jh-breakdown-section">
          <div class="jh-breakdown-section-header">
            <span class="jh-breakdown-section-title">Criteria Assessment</span>
            <div class="jh-section-progress">
              <div class="jh-progress-bar-container">
                <div class="jh-progress-fill"></div>
              </div>
              <span class="jh-progress-text">--/100</span>
            </div>
          </div>
          <div class="jh-breakdown-list">
            <!-- Populated dynamically with all criteria sorted by importance -->
          </div>
        </div>
      </div>

      <!-- Dealbreakers -->
      <div class="jh-dealbreakers" style="display: none;"></div>

      <!-- Actions -->
      <div class="jh-actions">
        <button class="jh-btn jh-btn-hunt jh-btn-primary">Send to Airtable</button>
        <button class="jh-btn jh-btn-details">View Details</button>
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
          <span class="jh-brand-text">Job Hunter</span>
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
      height: calc(100vh - 52px);
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
      padding: 14px 16px;
      background: #1F2937;
      flex-shrink: 0;
    }

    .jh-header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .jh-brand-text {
      font-family: 'Roboto', sans-serif;
      font-weight: 900;
      font-size: 20px;
      color: #ffffff;
      letter-spacing: -0.3px;
    }

    .jh-mode-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      background: #5856D6;
      color: white;
      border-radius: 12px;
    }

    .jh-header-controls {
      display: flex;
      gap: 6px;
    }

    .jh-header-controls button {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.8);
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .jh-header-controls button:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
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
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
      padding: 16px;
    }

    .jh-breakdown-section {
      margin-bottom: 20px;
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
    }

    .jh-breakdown-item {
      background: transparent;
      border: none;
      position: relative;
      cursor: pointer;
      perspective: 1000px;
      min-height: 120px;
    }

    .jh-breakdown-item.jh-full-width {
      grid-column: span 2;
    }

    .jh-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 120px;
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
      min-height: 120px;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      border-radius: 8px;
      padding: 12px;
      box-sizing: border-box;
    }

    .jh-card-front {
      background: #ffffff;
      border: 1px solid #E5E7EB;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
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
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 16px;
    }

    .jh-card-back-header {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.9;
    }

    .jh-card-back-content {
      font-size: 12px;
      line-height: 1.6;
      opacity: 0.95;
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
      background: #E5E7EB;
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

    .jh-skills-summary,
    .jh-benefits-summary {
      font-size: 11px;
      color: #6B7280;
      margin-top: 6px;
    }

    /* ========================================
       SALARY COMPARISON DISPLAY
       ======================================== */

    .jh-salary-comparison {
      margin-top: 10px;
      background: #F9FAFB;
      border-radius: 8px;
      padding: 10px;
    }

    .jh-salary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .jh-salary-row:last-of-type {
      margin-bottom: 10px;
    }

    .jh-salary-label-text {
      font-size: 11px;
      color: #6B7280;
      font-weight: 500;
    }

    .jh-salary-value {
      font-size: 12px;
      color: #1F2937;
      font-weight: 600;
    }

    .jh-salary-status {
      padding: 8px 10px;
      border-radius: 6px;
      margin-top: 4px;
    }

    .jh-salary-status-label {
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .jh-salary-gap {
      font-size: 11px;
      opacity: 0.8;
    }

    .jh-status-excellent {
      background: #D1FAE5;
      color: #065F46;
    }

    .jh-status-good {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .jh-status-below {
      background: #FEF3C7;
      color: #92400E;
    }

    .jh-status-unknown {
      background: #F3F4F6;
      color: #6B7280;
      font-size: 11px;
      text-align: center;
      padding: 6px;
    }

    /* ========================================
       PROFILE MISMATCH WARNINGS
       ======================================== */

    .jh-mismatch-warnings {
      padding: 0 16px;
      margin-bottom: 12px;
    }

    .jh-mismatch-alert {
      padding: 10px 12px;
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
      gap: 10px;
      padding: 16px;
      background: #ffffff;
      border-top: 1px solid #E5E7EB;
      flex-shrink: 0;
    }

    .jh-btn {
      flex: 1;
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

    .jh-btn-details {
      background: #ffffff;
      color: #1F2937;
      border: 1px solid #D1D9E0;
    }

    .jh-btn-details:hover {
      background: #F4F7FA;
      border-color: #5856D6;
      color: #5856D6;
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

    .jh-stat-item-compact .jh-stat-label {
      font-size: 9px;
      margin-bottom: 1px;
    }

    .jh-stat-item-compact .jh-stat-value {
      font-size: 12px;
      font-weight: 600;
    }

    /* ========================================
       MINIMIZE STATE
       ======================================== */

    #jh-sidebar-rail.jh-minimized {
      height: auto;
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

// ============================================================================
// MESSAGE LISTENER
// ============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'jobCaptureComplete') {
    console.log('[Job Hunter Sidebar] Job capture complete:', request.success ? 'SUCCESS' : 'FAILURE');

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
        huntBtn.textContent = 'Send to Airtable';
        huntBtn.classList.remove('jh-success');
      }, 3000);
    } else {
      huntBtn.textContent = 'Failed';
      huntBtn.classList.remove('jh-loading');
      huntBtn.disabled = false;

      setTimeout(() => {
        huntBtn.textContent = 'Send to Airtable';
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
