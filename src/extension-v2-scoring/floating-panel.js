/**
 * Job Hunter OS - Floating Score Panel
 *
 * A condensed, movable panel that auto-scores jobs when viewing them.
 * Displays in the bottom-right corner and can be:
 * - Minimized to just show the score
 * - Expanded to show criteria breakdown
 * - Dragged to a different position
 * - Dismissed temporarily
 */

// ============================================================================
// PANEL STATE
// ============================================================================

let panelState = {
  isVisible: false,
  isExpanded: false,
  isMinimized: false,
  position: { right: 20, bottom: 20 },
  currentScore: null,
  currentJobData: null,
  isDragging: false,
  dragOffset: { x: 0, y: 0 }
};

// ============================================================================
// PANEL CREATION & MANAGEMENT
// ============================================================================

/**
 * Create and inject the floating panel into the page
 */
function createFloatingPanel() {
  // Remove existing panel if present
  removeFloatingPanel();

  const panel = document.createElement('div');
  panel.id = 'jh-floating-panel';
  panel.innerHTML = getPanelHTML();

  // Add styles
  const styleEl = document.createElement('style');
  styleEl.id = 'jh-floating-panel-styles';
  styleEl.textContent = getPanelStyles();
  document.head.appendChild(styleEl);

  document.body.appendChild(panel);

  // Set initial position
  updatePanelPosition();

  // Set up event handlers
  setupPanelEventHandlers(panel);

  panelState.isVisible = true;

  console.log('[Floating Panel] Created');
  return panel;
}

/**
 * Remove the floating panel from the page
 */
function removeFloatingPanel() {
  const panel = document.getElementById('jh-floating-panel');
  const styles = document.getElementById('jh-floating-panel-styles');

  if (panel) panel.remove();
  if (styles) styles.remove();

  panelState.isVisible = false;
}

/**
 * Update the panel's position on screen
 */
function updatePanelPosition() {
  const panel = document.getElementById('jh-floating-panel');
  if (!panel) return;

  panel.style.right = `${panelState.position.right}px`;
  panel.style.bottom = `${panelState.position.bottom}px`;
}

/**
 * Update the panel with score data
 * @param {Object} scoreResult - Score result from scoring engine
 * @param {Object} jobData - Job data
 */
function updatePanelScore(scoreResult, jobData) {
  let panel = document.getElementById('jh-floating-panel');
  if (!panel) {
    createFloatingPanel();
    panel = document.getElementById('jh-floating-panel');
  }

  if (!panel) {
    console.error('[Job Hunter] Failed to create floating panel');
    return;
  }

  panelState.currentScore = scoreResult;
  panelState.currentJobData = jobData;

  // Update score display
  const scoreNumber = panel.querySelector('.jh-fp-score-number');
  const scoreLabel = panel.querySelector('.jh-fp-score-label');
  const scoreMeter = panel.querySelector('.jh-fp-meter-fill');
  const companyName = panel.querySelector('.jh-fp-company');
  const jobTitle = panel.querySelector('.jh-fp-title');

  if (scoreNumber) {
    animateScoreValue(scoreNumber, scoreResult.overall_score);
  }

  if (scoreLabel) {
    scoreLabel.textContent = scoreResult.overall_label;
    scoreLabel.className = 'jh-fp-score-label ' + getLabelClass(scoreResult.overall_label);
  }

  if (scoreMeter) {
    scoreMeter.style.width = `${scoreResult.overall_score}%`;
    scoreMeter.className = 'jh-fp-meter-fill ' + getLabelClass(scoreResult.overall_label);
  }

  if (companyName) {
    companyName.textContent = jobData.companyName || 'Unknown Company';
  }

  if (jobTitle) {
    jobTitle.textContent = truncateText(jobData.jobTitle || 'Unknown Role', 40);
  }

  // Update job highlights
  updateJobHighlights(panel, jobData, scoreResult);

  // Update expanded content
  updateExpandedContent(scoreResult);

  // Show the panel
  panel.classList.remove('jh-fp-hidden');
  panel.classList.add('jh-fp-visible');

  // Apply score-based styling
  panel.className = panel.className.replace(/jh-fp-score-\w+/g, '');
  panel.classList.add(getScoreClass(scoreResult.overall_score));
}

/**
 * Update the expanded content with score breakdown
 * @param {Object} scoreResult - Score result
 */
/**
 * Update job highlights (salary, workplace, bonus, equity)
 * @param {HTMLElement} panel - The panel element
 * @param {Object} jobData - Job data
 * @param {Object} scoreResult - Score result
 */
function updateJobHighlights(panel, jobData, scoreResult) {
  const salaryEl = panel.querySelector('.jh-fp-salary');
  const workplaceEl = panel.querySelector('.jh-fp-workplace');
  const bonusEl = panel.querySelector('.jh-fp-bonus');
  const equityEl = panel.querySelector('.jh-fp-equity');
  const postedEl = panel.querySelector('.jh-fp-posted');
  const applicantsEl = panel.querySelector('.jh-fp-applicants');
  const hiringManagerEl = panel.querySelector('.jh-fp-hiring-manager');

  // Salary - format from min/max values or check string fields
  if (salaryEl) {
    let salaryDisplay = '';
    let salaryConfidence = jobData.salaryConfidence || 'NONE';

    // Build salary display from min/max if available
    if (jobData.salaryMin !== null && jobData.salaryMin !== undefined) {
      const formatNum = (n) => {
        if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `$${Math.round(n / 1000)}K`;
        return `$${n}`;
      };
      if (jobData.salaryMax && jobData.salaryMax !== jobData.salaryMin) {
        salaryDisplay = `${formatNum(jobData.salaryMin)}-${formatNum(jobData.salaryMax)}`;
      } else {
        salaryDisplay = formatNum(jobData.salaryMin);
      }
    } else {
      // Fallback to string fields
      const salary = jobData.salary || jobData.salaryRange || jobData.compensation ||
                     jobData.salary_range || jobData.pay || jobData.salaryText;
      if (salary && salary !== 'Not specified' && salary !== '--') {
        salaryDisplay = salary;
      }
    }

    if (salaryDisplay) {
      salaryEl.textContent = salaryDisplay;
      salaryEl.classList.add('jh-fp-has-value');
      // Add confidence indicator to data-tooltip
      const confidenceTitles = {
        'HIGH': 'Salary from job posting',
        'MEDIUM': 'Salary from description (keyword match)',
        'LOW': 'Salary inferred from description',
        'NONE': 'Salary range'
      };
      salaryEl.setAttribute('data-tooltip', confidenceTitles[salaryConfidence] || 'Salary range');

      // Visual confidence indicator - slightly dim if low confidence
      salaryEl.classList.remove('jh-fp-confidence-low');
      if (salaryConfidence === 'LOW') {
        salaryEl.classList.add('jh-fp-confidence-low');
      }
    } else {
      salaryEl.textContent = 'Salary N/A';
      salaryEl.classList.remove('jh-fp-has-value');
      salaryEl.setAttribute('data-tooltip', 'Salary not specified in posting');
    }
  }

  // Workplace type
  if (workplaceEl) {
    const workplace = jobData.workplaceType || jobData.locationType || jobData.workplace_type;
    workplaceEl.classList.remove('jh-fp-good', 'jh-fp-neutral', 'jh-fp-bad');
    if (workplace) {
      const wpLower = workplace.toLowerCase();
      if (wpLower.includes('remote')) {
        workplaceEl.textContent = 'Remote';
        workplaceEl.classList.add('jh-fp-good');
        workplaceEl.setAttribute('data-tooltip', 'Remote position - matches your preference');
      } else if (wpLower.includes('hybrid')) {
        workplaceEl.textContent = 'Hybrid';
        workplaceEl.classList.add('jh-fp-neutral');
        workplaceEl.setAttribute('data-tooltip', 'Hybrid - some office time required');
      } else if (wpLower.includes('on-site') || wpLower.includes('onsite')) {
        workplaceEl.textContent = 'On-site';
        workplaceEl.classList.add('jh-fp-bad');
        workplaceEl.setAttribute('data-tooltip', 'On-site only - requires physical presence');
      } else {
        workplaceEl.textContent = workplace;
        workplaceEl.setAttribute('data-tooltip', 'Work location type');
      }
    } else {
      workplaceEl.textContent = 'Location N/A';
      workplaceEl.setAttribute('data-tooltip', 'Work location not specified');
    }
  }

  // Bonus - scan job description for actual bonus mentions
  if (bonusEl) {
    const bonusDetected = detectBonusInJob(jobData, scoreResult);
    bonusEl.classList.remove('jh-fp-good', 'jh-fp-bad');
    if (bonusDetected.found) {
      bonusEl.innerHTML = '<span class="jh-fp-thumb jh-fp-thumb-up">▲</span> Bonus';
      bonusEl.classList.add('jh-fp-good');
      bonusEl.setAttribute('data-tooltip', bonusDetected.tooltip || 'Performance bonus mentioned');
    } else {
      bonusEl.innerHTML = '<span class="jh-fp-thumb jh-fp-thumb-down">▼</span> Bonus';
      bonusEl.classList.add('jh-fp-bad');
      bonusEl.setAttribute('data-tooltip', 'No performance bonus mentioned in posting');
    }
  }

  // Equity - scan job description for actual equity mentions
  if (equityEl) {
    const equityDetected = detectEquityInJob(jobData, scoreResult);
    equityEl.classList.remove('jh-fp-good', 'jh-fp-bad');
    if (equityDetected.found) {
      equityEl.innerHTML = '<span class="jh-fp-thumb jh-fp-thumb-up">▲</span> Equity';
      equityEl.classList.add('jh-fp-good');
      equityEl.setAttribute('data-tooltip', equityDetected.tooltip || 'Stock/equity compensation mentioned');
    } else {
      equityEl.innerHTML = '<span class="jh-fp-thumb jh-fp-thumb-down">▼</span> Equity';
      equityEl.classList.add('jh-fp-bad');
      equityEl.setAttribute('data-tooltip', 'No equity/stock options mentioned in posting');
    }
  }

  // Benefits - scan for health, dental, PTO, 401k etc.
  const benefitsEl = panel.querySelector('.jh-fp-benefits');
  if (benefitsEl) {
    const benefitsDetected = detectBenefitsInJob(jobData, scoreResult);
    benefitsEl.classList.remove('jh-fp-good', 'jh-fp-neutral', 'jh-fp-bad');
    if (benefitsDetected.count >= 3) {
      benefitsEl.textContent = benefitsDetected.display || 'Benefits';
      benefitsEl.classList.add('jh-fp-good');
      benefitsEl.setAttribute('data-tooltip', benefitsDetected.tooltip || 'Comprehensive benefits package');
    } else if (benefitsDetected.count >= 1) {
      benefitsEl.textContent = benefitsDetected.display || 'Some Benefits';
      benefitsEl.classList.add('jh-fp-neutral');
      benefitsEl.setAttribute('data-tooltip', benefitsDetected.tooltip || 'Some benefits mentioned');
    } else {
      benefitsEl.textContent = 'Benefits?';
      benefitsEl.classList.add('jh-fp-bad');
      benefitsEl.setAttribute('data-tooltip', 'No benefits information found');
    }
  }

  // Posted Date
  if (postedEl) {
    const posted = jobData.postedDate;
    if (posted) {
      postedEl.textContent = `📅 ${posted}`;
      postedEl.classList.add('jh-fp-has-value');
      postedEl.setAttribute('data-tooltip', `Posted: ${posted}`);
    } else {
      postedEl.textContent = '';
      postedEl.style.display = 'none';
    }
  }

  // Applicant Count
  if (applicantsEl) {
    const count = jobData.applicantCount;
    if (count !== null && count !== undefined) {
      applicantsEl.textContent = `👥 ${count} applicants`;
      applicantsEl.classList.add('jh-fp-has-value');
      // Color code based on competition level
      applicantsEl.classList.remove('jh-fp-good', 'jh-fp-neutral', 'jh-fp-bad');
      if (count < 25) {
        applicantsEl.classList.add('jh-fp-good');
        applicantsEl.setAttribute('data-tooltip', `Low competition: ${count} applicants`);
      } else if (count < 100) {
        applicantsEl.classList.add('jh-fp-neutral');
        applicantsEl.setAttribute('data-tooltip', `Moderate competition: ${count} applicants`);
      } else {
        applicantsEl.classList.add('jh-fp-bad');
        applicantsEl.setAttribute('data-tooltip', `High competition: ${count} applicants`);
      }
    } else {
      applicantsEl.textContent = '';
      applicantsEl.style.display = 'none';
    }
  }

  // Hiring Manager
  if (hiringManagerEl) {
    const manager = jobData.hiringManager;
    if (manager) {
      hiringManagerEl.textContent = `👤 ${manager}`;
      hiringManagerEl.classList.add('jh-fp-has-value');
      hiringManagerEl.setAttribute('data-tooltip', `Hiring Manager: ${manager}`);
    } else {
      hiringManagerEl.textContent = '';
      hiringManagerEl.style.display = 'none';
    }
  }
}

/**
 * Detect if bonus is mentioned in the job posting
 * Uses strict criteria: only positive patterns count, no generic "bonus" matching
 * Badge only shows as positive if clear performance/annual bonus indicators found
 */
function detectBonusInJob(jobData, scoreResult) {
  const description = (jobData.descriptionText || jobData.job_description_text || '').toLowerCase();

  // Skip if no description
  if (!description) {
    return { found: false };
  }

  // STRICT positive patterns - must match one of these specific patterns
  const positivePatterns = [
    { regex: /performance\s+bonus/i, label: 'performance bonus' },
    { regex: /annual\s+bonus/i, label: 'annual bonus' },
    { regex: /yearly\s+bonus/i, label: 'yearly bonus' },
    { regex: /target\s+bonus/i, label: 'target bonus' },
    { regex: /discretionary\s+bonus/i, label: 'discretionary bonus' },
    { regex: /quarterly\s+bonus/i, label: 'quarterly bonus' },
    { regex: /bonus\s+(of|up\s+to)\s+\d+%/i, label: 'bonus percentage' },
    { regex: /bonus\s+(target|structure|plan|program)/i, label: 'bonus program' },
    { regex: /\d+%\s+bonus/i, label: 'bonus percentage' },
    { regex: /bonus\s+\d+%/i, label: 'bonus percentage' },
    { regex: /variable\s+compensation/i, label: 'variable compensation' },
    { regex: /variable\s+pay/i, label: 'variable pay' },
    { regex: /incentive\s+bonus/i, label: 'incentive bonus' },
    { regex: /incentive\s+compensation/i, label: 'incentive compensation' },
    { regex: /bonus\s+eligib/i, label: 'bonus eligibility' }
  ];

  // Negative patterns - if these appear, don't count as positive even with pattern match
  const negativePatterns = [
    /sign[-\s]?on\s+bonus/i,
    /signing\s+bonus/i,
    /referral\s+bonus/i,
    /hiring\s+bonus/i,
    /relocation\s+bonus/i,
    /retention\s+bonus/i,
    /spot\s+bonus/i,
    /new\s+hire\s+bonus/i,
    /joining\s+bonus/i
  ];

  // Check for negative patterns first
  let hasNegativeMatch = false;
  for (const pattern of negativePatterns) {
    if (pattern.test(description)) {
      hasNegativeMatch = true;
      break;
    }
  }

  // Check for positive pattern matches
  for (const { regex, label } of positivePatterns) {
    if (regex.test(description)) {
      // Found a positive pattern
      // If there's also a negative pattern, check if the positive is in a different context
      // For now, if positive pattern exists and it's not a sign-on type, return true
      return {
        found: true,
        tooltip: `Bonus found: ${label}`
      };
    }
  }

  // Only trust jobData.bonusMentioned if content.js used the strict proximity rule
  // and we verified it's not just a generic mention
  if (jobData.bonusMentioned === true && !hasNegativeMatch) {
    // Double-check by looking for compensation context
    const compContext = /compensation|salary|pay|total\s+rewards|benefits/i.test(description);
    if (compContext) {
      return { found: true, tooltip: 'Bonus mentioned in compensation section' };
    }
  }

  return { found: false };
}

/**
 * Detect if equity is mentioned in the job posting
 * Uses score threshold and stricter criteria to avoid DEI/EEO false positives
 * Badge only shows as positive if equity_score > 15 (threshold out of 50)
 */
function detectEquityInJob(jobData, scoreResult) {
  const description = (jobData.descriptionText || jobData.job_description_text || '').toLowerCase();

  // First check: score threshold from scoring engine (equity_score > 15 out of 50)
  const equityScoreThreshold = 15;
  const bonusEquityCriterion = scoreResult?.job_to_user_fit?.breakdown?.find(
    b => b.criteria === 'Bonus & Equity'
  );
  const equityScore = bonusEquityCriterion?.equity_score || 0;

  // If score is above threshold, trust the scoring engine
  if (equityScore > equityScoreThreshold) {
    return {
      found: true,
      tooltip: `Equity detected (score: ${equityScore}/50)`
    };
  }

  // Also check if explicitly mentioned in jobData (from content.js detection)
  if (jobData.equityMentioned === true) {
    return { found: true, tooltip: 'Equity/stock options mentioned' };
  }

  // Skip text detection if no description
  if (!description) {
    return { found: false };
  }

  // Positive patterns for compensation equity (with word boundaries to avoid false positives)
  const positivePatterns = [
    /stock\s+options?/i,
    /equity\s+(grant|package|compensation|awards?|incentive)/i,
    /\brsus?\b/i,
    /restricted\s+stock/i,
    /equity\s+in\s+the\s+company/i,
    /shares?\s+(of|in)\s+(the\s+)?company/i,
    /ownership\s+(stake|interest)/i,
    /stock\s+(grant|award|compensation)/i,
    /employee\s+stock\s+purchase/i,
    /\bespp\b/i
  ];

  // Negative patterns (DEI/EEO mentions, not compensation)
  const negativePatterns = [
    /equal\s+opportunity/i,
    /diversity[^.]{0,40}equity[^.]{0,40}inclusion/i,
    /equity\s+in\s+(hiring|employment|workplace|our\s+practices)/i,
    /promote\s+equity/i,
    /commitment\s+to\s+equity/i
  ];

  // Check for positive matches
  let hasPositiveMatch = false;
  let matchedPattern = '';
  for (const pattern of positivePatterns) {
    if (pattern.test(description)) {
      hasPositiveMatch = true;
      const match = description.match(pattern);
      if (match) matchedPattern = match[0];
      break;
    }
  }

  // Check for negative patterns - these are disqualifying for generic "equity" mentions
  let hasNegativeMatch = false;
  for (const pattern of negativePatterns) {
    if (pattern.test(description)) {
      hasNegativeMatch = true;
      break;
    }
  }

  // If we have a strong positive pattern, trust it even with DEI mentions
  if (hasPositiveMatch && matchedPattern.match(/stock|rsu|espp|ownership/i)) {
    return {
      found: true,
      tooltip: `Equity found: "${matchedPattern}"`
    };
  }

  // If positive match but also DEI mention, be more careful
  if (hasPositiveMatch && !hasNegativeMatch) {
    return {
      found: true,
      tooltip: matchedPattern ? `Equity found: "${matchedPattern}"` : 'Equity compensation mentioned'
    };
  }

  return { found: false };
}

/**
 * Detect benefits mentioned in job posting
 * Returns count and display string for header badge
 */
function detectBenefitsInJob(jobData, scoreResult) {
  const description = (jobData.descriptionText || jobData.job_description_text || '').toLowerCase();

  if (!description) {
    return { count: 0, display: 'Benefits?', tooltip: 'No description to analyze' };
  }

  // Benefits categories to detect
  const benefitCategories = {
    'Medical': [/health\s*(insurance|care|coverage|benefits)/i, /medical\s*(insurance|coverage|benefits)/i],
    'Dental': [/dental/i],
    'Vision': [/vision/i],
    '401k': [/401\s*\(?\s*k\)?/i, /retirement\s*(plan|benefits)/i],
    'PTO': [/\bpto\b/i, /paid\s+time\s+off/i, /unlimited\s+(pto|vacation)/i, /vacation\s+(days?|time)/i],
    'Parental': [/parental\s+leave/i, /maternity/i, /paternity/i]
  };

  const foundBenefits = [];

  for (const [name, patterns] of Object.entries(benefitCategories)) {
    for (const pattern of patterns) {
      if (pattern.test(description)) {
        foundBenefits.push(name);
        break;
      }
    }
  }

  const count = foundBenefits.length;

  // Build display string - show first 2-3 benefits
  let display = 'Benefits?';
  let tooltip = 'No benefits information found';

  if (count >= 3) {
    display = foundBenefits.slice(0, 2).join(' + ') + '+';
    tooltip = `Benefits: ${foundBenefits.join(', ')}`;
  } else if (count === 2) {
    display = foundBenefits.join(' + ');
    tooltip = `Benefits: ${foundBenefits.join(', ')}`;
  } else if (count === 1) {
    display = foundBenefits[0];
    tooltip = `Only ${foundBenefits[0]} mentioned`;
  }

  return { count, display, tooltip, found: foundBenefits };
}

/**
 * Check if bonus or equity was detected in score breakdown
 */
function checkBonusEquityFromScore(scoreResult, keyword) {
  const allBreakdown = [
    ...(scoreResult.job_to_user_fit?.breakdown || []),
    ...(scoreResult.user_to_job_fit?.breakdown || [])
  ];

  for (const item of allBreakdown) {
    const criteriaLower = (item.criteria || '').toLowerCase();
    const detailsLower = (item.details || item.rationale || '').toLowerCase();
    const actualValue = (item.actual_value || '').toLowerCase();

    if (criteriaLower.includes(keyword) || detailsLower.includes(keyword) || actualValue.includes(keyword)) {
      // Check for positive indicators
      if (detailsLower.includes('mentioned') ||
          detailsLower.includes('detected') ||
          detailsLower.includes('offers') ||
          detailsLower.includes('includes') ||
          actualValue.includes(keyword)) {
        return true;
      }
      // Check score - higher score indicates presence
      if (keyword === 'bonus' && item.bonus_score && item.bonus_score > 30) {
        return true;
      }
      if (keyword === 'equity' && item.equity_score && item.equity_score > 30) {
        return true;
      }
    }
  }
  return false;
}

function updateExpandedContent(scoreResult) {
  const panel = document.getElementById('jh-floating-panel');
  if (!panel) return;

  const j2uScoreEl = panel.querySelector('.jh-fp-j2u-score');
  const u2jScoreEl = panel.querySelector('.jh-fp-u2j-score');
  const j2uCriteriaList = panel.querySelector('.jh-fp-j2u-criteria');
  const u2jCriteriaList = panel.querySelector('.jh-fp-u2j-criteria');
  const recommendationBadge = panel.querySelector('.jh-fp-recommendation-badge');
  const recommendationSummary = panel.querySelector('.jh-fp-recommendation-summary');

  // Update Job Fit score (job-to-user)
  if (j2uScoreEl) {
    const j2uScore = scoreResult.job_to_user_fit?.score || 0;
    j2uScoreEl.textContent = `${j2uScore}/50`;
    j2uScoreEl.className = 'jh-fp-j2u-score ' + getSubScoreClass(j2uScore);
  }

  // Update Your Fit score (user-to-job)
  if (u2jScoreEl) {
    const u2jScore = scoreResult.user_to_job_fit?.score || 0;
    u2jScoreEl.textContent = `${u2jScore}/50`;
    u2jScoreEl.className = 'jh-fp-u2j-score ' + getSubScoreClass(u2jScore);
  }

  // Update recommendation badge and summary
  if (recommendationBadge && scoreResult.overall_label) {
    const label = scoreResult.overall_label;
    let badgeText = '';
    let badgeClass = '';

    switch (label) {
      case 'STRONG FIT':
        badgeText = 'APPLY';
        badgeClass = 'jh-fp-rec-strong';
        break;
      case 'GOOD FIT':
        badgeText = 'APPLY';
        badgeClass = 'jh-fp-rec-good';
        break;
      case 'MODERATE FIT':
        badgeText = 'CONSIDER';
        badgeClass = 'jh-fp-rec-moderate';
        break;
      case 'WEAK FIT':
        badgeText = 'LOW FIT';
        badgeClass = 'jh-fp-rec-weak';
        break;
      case 'POOR FIT':
      case 'HARD NO':
        badgeText = 'SKIP';
        badgeClass = 'jh-fp-rec-poor';
        break;
      default:
        badgeText = label;
        badgeClass = 'jh-fp-rec-moderate';
    }

    recommendationBadge.textContent = badgeText;
    recommendationBadge.className = 'jh-fp-recommendation-badge ' + badgeClass;
  }

  if (recommendationSummary && scoreResult.interpretation?.summary) {
    recommendationSummary.textContent = scoreResult.interpretation.summary;
  }

  // Render Job Fit criteria (left column) - filter out hiring urgency
  if (j2uCriteriaList) {
    const j2uCriteria = (scoreResult.job_to_user_fit?.breakdown || [])
      .filter(c => !c.criteria?.toLowerCase().includes('hiring urgency'));
    j2uCriteriaList.innerHTML = renderCriteriaItems(j2uCriteria, 'j2u');
  }

  // Render Your Fit criteria (right column)
  if (u2jCriteriaList) {
    const u2jCriteria = scoreResult.user_to_job_fit?.breakdown || [];
    u2jCriteriaList.innerHTML = renderCriteriaItems(u2jCriteria, 'u2j');
  }

  // Re-initialize tooltips for dynamically added criteria
  setTimeout(() => {
    setupTooltips(panel);
  }, 100);
}

/**
 * Render criteria items as HTML
 * @param {Array} criteria - Array of criterion objects
 * @param {string} type - 'j2u' (Job Fit) or 'u2j' (Your Fit) for different thresholds
 * @returns {string} HTML string
 */
function renderCriteriaItems(criteria, type = 'j2u') {
  // Different thresholds for Job Fit (j2u) vs Your Fit (u2j)
  // Job Fit: 35-50 good, 15-34 moderate, 0-14 poor
  // Your Fit: 25-50 good, 10-24 moderate, 0-9 poor
  const thresholds = type === 'j2u'
    ? { high: 35, mid: 15 }
    : { high: 25, mid: 10 };

  return criteria.map(c => {
    const score = c.score || 0;
    const scoreClass = score >= thresholds.high ? 'jh-fp-criterion-high' :
                       score >= thresholds.mid ? 'jh-fp-criterion-mid' : 'jh-fp-criterion-low';

    // Show matched skills as tags if available (with truncation)
    let skillTagsHtml = '';
    if (c.matched_skills && c.matched_skills.length > 0) {
      const maxDisplay = 3;
      const displaySkills = c.matched_skills.slice(0, maxDisplay);
      const remaining = c.matched_skills.length - maxDisplay;

      skillTagsHtml = `
        <div class="jh-fp-skill-tags">
          ${displaySkills.map(skill =>
            `<span class="jh-fp-skill-tag">${escapeHtml(skill)}</span>`
          ).join('')}
          ${remaining > 0 ? `<span class="jh-fp-skill-more">+${remaining} more</span>` : ''}
        </div>
      `;
    }

    // Shorten long criteria names
    let criteriaName = c.criteria || '';
    const nameMap = {
      'Operations & Systems Focus': 'Ops & Systems',
      'Title & Seniority Match': 'Title Match',
      'Organizational Stability': 'Org Stability',
      'Industry Experience': 'Industry',
      'Skills Overlap': 'Skills'
    };
    criteriaName = nameMap[criteriaName] || criteriaName;

    return `
      <div class="jh-fp-criterion ${scoreClass}" title="${escapeHtml(c.rationale || '')}" data-tooltip="${escapeHtml(c.rationale || '')}">
        <div class="jh-fp-criterion-row">
          <span class="jh-fp-criterion-name">${escapeHtml(criteriaName)}</span>
          <span class="jh-fp-criterion-score">${score}</span>
        </div>
        ${c.actual_value ? `<span class="jh-fp-criterion-value">${escapeHtml(c.actual_value)}</span>` : ''}
        ${skillTagsHtml}
      </div>
    `;
  }).join('');
}

/**
 * Get CSS class based on sub-score (0-50 scale)
 */
function getSubScoreClass(score) {
  if (score >= 40) return 'jh-fp-subscore-high';
  if (score >= 25) return 'jh-fp-subscore-mid';
  return 'jh-fp-subscore-low';
}

/**
 * Toggle panel expanded/collapsed state
 */
function togglePanelExpanded() {
  const panel = document.getElementById('jh-floating-panel');
  if (!panel) return;

  panelState.isExpanded = !panelState.isExpanded;
  panel.classList.toggle('jh-fp-expanded', panelState.isExpanded);
}

/**
 * Toggle panel minimized state (just score badge)
 */
function togglePanelMinimized() {
  const panel = document.getElementById('jh-floating-panel');
  if (!panel) return;

  panelState.isMinimized = !panelState.isMinimized;
  panel.classList.toggle('jh-fp-minimized', panelState.isMinimized);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Set up panel event handlers
 * @param {HTMLElement} panel - The panel element
 */
function setupPanelEventHandlers(panel) {
  // Header click to expand/collapse
  const header = panel.querySelector('.jh-fp-header');
  if (header) {
    header.addEventListener('click', (e) => {
      // Don't toggle if clicking on buttons
      if (e.target.closest('button')) return;
      togglePanelExpanded();
    });
  }

  // Expand hint click to expand
  const expandHint = panel.querySelector('.jh-fp-expand-hint');
  if (expandHint) {
    expandHint.addEventListener('click', () => {
      togglePanelExpanded();
    });
  }

  // Close button
  const closeBtn = panel.querySelector('.jh-fp-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.add('jh-fp-hidden');
      panel.classList.remove('jh-fp-visible');
    });
  }

  // Settings/Edit Profile button
  const settingsBtn = panel.querySelector('.jh-fp-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Open profile setup
      if (window.openProfileSetup) {
        window.openProfileSetup();
      } else {
        console.log('[Floating Panel] openProfileSetup not available');
      }
    });
  }

  // View Details button
  const detailsBtn = panel.querySelector('.jh-fp-details-btn');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => {
      // Trigger full modal view
      if (window.JobHunterResults && panelState.currentScore && panelState.currentJobData) {
        window.JobHunterResults.showResultsModal(
          panelState.currentScore,
          panelState.currentJobData,
          window.sendJobToAirtable,
          window.openProfileSetup
        );
      }
    });
  }

  // Send to Airtable button
  const sendBtn = panel.querySelector('.jh-fp-send-btn');
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      if (!panelState.currentJobData || !panelState.currentScore) return;

      sendBtn.disabled = true;
      sendBtn.classList.add('jh-fp-loading');

      try {
        await window.sendJobToAirtable(panelState.currentJobData, panelState.currentScore);
        sendBtn.textContent = 'Sent!';
        sendBtn.classList.remove('jh-fp-loading');
        sendBtn.classList.add('jh-fp-success');

        setTimeout(() => {
          sendBtn.textContent = 'Hunt Job';
          sendBtn.classList.remove('jh-fp-success');
          sendBtn.disabled = false;
        }, 2000);
      } catch (error) {
        console.error('[Floating Panel] Send error:', error);
        sendBtn.textContent = 'Error';
        sendBtn.classList.remove('jh-fp-loading');
        sendBtn.disabled = false;
      }
    });
  }

  // Set up tooltips
  setupTooltips(panel);

  // Dragging functionality
  setupDragging(panel);
}

/**
 * Set up tooltip event listeners
 * @param {HTMLElement} panel - The panel element
 */
function setupTooltips(panel) {
  const tooltip = panel.querySelector('.jh-fp-tooltip');
  if (!tooltip) return;

  // Elements that can show tooltips
  const tooltipTriggers = panel.querySelectorAll('[data-tooltip], .jh-fp-criterion');

  tooltipTriggers.forEach(trigger => {
    // Mouse enter - show tooltip
    trigger.addEventListener('mouseenter', (e) => {
      const text = trigger.getAttribute('data-tooltip') ||
                   trigger.getAttribute('title') ||
                   trigger.querySelector('.jh-fp-criterion-name')?.textContent;

      if (!text) return;

      // Get criterion rationale if available
      let tooltipContent = text;
      if (trigger.classList.contains('jh-fp-criterion')) {
        const rationale = trigger.getAttribute('title');
        if (rationale) {
          tooltipContent = rationale;
        }
      }

      tooltip.textContent = tooltipContent;
      tooltip.classList.add('jh-fp-tooltip-visible');

      // Position tooltip above the trigger
      const triggerRect = trigger.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      tooltip.style.left = `${triggerRect.left - panelRect.left + triggerRect.width / 2}px`;
      tooltip.style.top = `${triggerRect.top - panelRect.top - tooltip.offsetHeight - 8}px`;
      tooltip.style.transform = 'translateX(-50%)';
    });

    // Mouse leave - hide tooltip
    trigger.addEventListener('mouseleave', () => {
      tooltip.classList.remove('jh-fp-tooltip-visible');
    });

    // Touch support - toggle tooltip on tap
    trigger.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const isVisible = tooltip.classList.contains('jh-fp-tooltip-visible');

      if (isVisible) {
        tooltip.classList.remove('jh-fp-tooltip-visible');
      } else {
        // Show tooltip at touch position
        const text = trigger.getAttribute('data-tooltip') ||
                     trigger.getAttribute('title');
        if (text) {
          tooltip.textContent = text;
          tooltip.classList.add('jh-fp-tooltip-visible');

          const triggerRect = trigger.getBoundingClientRect();
          const panelRect = panel.getBoundingClientRect();
          tooltip.style.left = `${triggerRect.left - panelRect.left + triggerRect.width / 2}px`;
          tooltip.style.top = `${triggerRect.top - panelRect.top - tooltip.offsetHeight - 8}px`;
          tooltip.style.transform = 'translateX(-50%)';
        }
      }
    });
  });

  // Hide tooltip when clicking elsewhere
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.jh-fp-criterion') && !e.target.closest('[data-tooltip]')) {
      tooltip.classList.remove('jh-fp-tooltip-visible');
    }
  });
}

/**
 * Set up panel dragging
 * @param {HTMLElement} panel - The panel element
 */
function setupDragging(panel) {
  const dragHandle = panel.querySelector('.jh-fp-drag-handle');
  if (!dragHandle) return;

  dragHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    panelState.isDragging = true;

    const rect = panel.getBoundingClientRect();
    panelState.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    panel.classList.add('jh-fp-dragging');
  });

  document.addEventListener('mousemove', (e) => {
    if (!panelState.isDragging) return;

    const newRight = window.innerWidth - e.clientX - (panel.offsetWidth - panelState.dragOffset.x);
    const newBottom = window.innerHeight - e.clientY - (panel.offsetHeight - panelState.dragOffset.y);

    // Constrain to viewport
    panelState.position.right = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, newRight));
    panelState.position.bottom = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, newBottom));

    updatePanelPosition();
  });

  document.addEventListener('mouseup', () => {
    if (panelState.isDragging) {
      panelState.isDragging = false;
      panel.classList.remove('jh-fp-dragging');
    }
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Animate score number
 */
function animateScoreValue(element, targetValue) {
  const startValue = parseInt(element.textContent) || 0;
  const duration = 600;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(startValue + (targetValue - startValue) * easeProgress);

    element.textContent = currentValue;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Get CSS class based on score label
 */
function getLabelClass(label) {
  const labelMap = {
    'STRONG FIT': 'jh-fp-strong',
    'GOOD FIT': 'jh-fp-good',
    'MODERATE FIT': 'jh-fp-moderate',
    'WEAK FIT': 'jh-fp-weak',
    'POOR FIT': 'jh-fp-poor',
    'HARD NO': 'jh-fp-hardno'
  };
  return labelMap[label] || '';
}

/**
 * Get CSS class based on numeric score
 */
function getScoreClass(score) {
  if (score >= 80) return 'jh-fp-score-strong';
  if (score >= 70) return 'jh-fp-score-good';
  if (score >= 50) return 'jh-fp-score-moderate';
  if (score >= 30) return 'jh-fp-score-weak';
  return 'jh-fp-score-poor';
}

/**
 * Get star display for score (0-50 scale)
 */
function getStarDisplay(score) {
  const stars = Math.round(score / 10);
  return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// PANEL HTML TEMPLATE
// ============================================================================

function getPanelHTML() {
  return `
    <div class="jh-fp-container">
      <div class="jh-fp-drag-handle" title="Drag to move">⋮⋮</div>

      <div class="jh-fp-header">
        <div class="jh-fp-score-ring">
          <span class="jh-fp-score-number">--</span>
        </div>
        <div class="jh-fp-info">
          <span class="jh-fp-score-label">Analyzing...</span>
          <span class="jh-fp-company">Loading...</span>
        </div>
        <div class="jh-fp-controls">
          <button class="jh-fp-settings" title="Edit Profile">⚙</button>
          <button class="jh-fp-close" title="Dismiss">×</button>
        </div>
      </div>

      <div class="jh-fp-job-highlights">
        <span class="jh-fp-highlight jh-fp-salary" data-tooltip="Salary range from job posting">--</span>
        <span class="jh-fp-highlight jh-fp-workplace" data-tooltip="Work location preference">--</span>
        <span class="jh-fp-highlight jh-fp-bonus" data-tooltip="Performance bonus mentioned">--</span>
        <span class="jh-fp-highlight jh-fp-equity" data-tooltip="Stock options or equity compensation">--</span>
        <span class="jh-fp-highlight jh-fp-benefits" data-tooltip="Benefits package (Medical, Dental, PTO)">--</span>
      </div>

      <div class="jh-fp-job-meta">
        <span class="jh-fp-meta-item jh-fp-posted" data-tooltip="When job was posted">--</span>
        <span class="jh-fp-meta-item jh-fp-applicants" data-tooltip="Number of applicants">--</span>
        <span class="jh-fp-meta-item jh-fp-hiring-manager" data-tooltip="Hiring manager">--</span>
      </div>

      <div class="jh-fp-meter">
        <div class="jh-fp-meter-fill"></div>
      </div>

      <div class="jh-fp-expanded-content">
        <div class="jh-fp-title-row">
          <span class="jh-fp-title">Loading role...</span>
        </div>

        <!-- Recommendation badge at top -->
        <div class="jh-fp-recommendation-row">
          <span class="jh-fp-recommendation-badge">Analyzing...</span>
          <span class="jh-fp-recommendation-summary"></span>
        </div>

        <!-- Side-by-side columns for expanded view -->
        <div class="jh-fp-columns">
          <!-- Left Column: Job Fit (how well job meets your needs) -->
          <div class="jh-fp-column jh-fp-column-left">
            <div class="jh-fp-column-header">
              <span class="jh-fp-column-title">JOB FIT</span>
              <span class="jh-fp-j2u-score">--/50</span>
            </div>
            <div class="jh-fp-criteria-list jh-fp-j2u-criteria">
              <!-- Populated dynamically -->
            </div>
          </div>

          <!-- Right Column: Your Fit (how well you match the job) -->
          <div class="jh-fp-column jh-fp-column-right">
            <div class="jh-fp-column-header">
              <span class="jh-fp-column-title">YOUR FIT</span>
              <span class="jh-fp-u2j-score">--/50</span>
            </div>
            <div class="jh-fp-criteria-list jh-fp-u2j-criteria">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="jh-fp-legend">
          <span class="jh-fp-legend-title">Score Guide:</span>
          <span class="jh-fp-legend-item jh-fp-legend-good">●</span><span class="jh-fp-legend-text">35-50 Good</span>
          <span class="jh-fp-legend-item jh-fp-legend-moderate">●</span><span class="jh-fp-legend-text">15-34 Moderate</span>
          <span class="jh-fp-legend-item jh-fp-legend-poor">●</span><span class="jh-fp-legend-text">0-14 Poor</span>
        </div>

        <div class="jh-fp-buttons">
          <button class="jh-fp-btn jh-fp-details-btn">View Details</button>
          <button class="jh-fp-btn jh-fp-send-btn jh-fp-primary">Hunt Job</button>
        </div>
      </div>

      <div class="jh-fp-expand-hint">Click to expand ▼</div>

      <!-- Tooltip element -->
      <div class="jh-fp-tooltip" id="jh-fp-tooltip"></div>
    </div>
  `;
}

// ============================================================================
// PANEL STYLES
// ============================================================================

function getPanelStyles() {
  return `
    #jh-floating-panel {
      position: fixed;
      z-index: 999997;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #1a1a2e;
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    #jh-floating-panel.jh-fp-hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateY(20px);
    }

    #jh-floating-panel.jh-fp-visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    #jh-floating-panel.jh-fp-dragging {
      cursor: grabbing;
      user-select: none;
    }

    .jh-fp-container {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
      min-width: 280px;
      max-width: 300px;
      overflow: hidden;
      transition: max-width 0.25s ease;
    }

    #jh-floating-panel.jh-fp-expanded .jh-fp-container {
      max-width: 600px;
    }

    /* Drag handle */
    .jh-fp-drag-handle {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      padding: 2px 12px;
      color: #adb5bd;
      font-size: 10px;
      cursor: grab;
      letter-spacing: 2px;
    }

    .jh-fp-drag-handle:hover {
      color: #495057;
    }

    /* Header */
    .jh-fp-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      cursor: pointer;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    .jh-fp-score-ring {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      flex-shrink: 0;
      border: 3px solid #e9ecef;
    }

    .jh-fp-score-number {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
    }

    /* Score ring colors based on overall score */
    #jh-floating-panel.jh-fp-score-strong .jh-fp-score-ring { border-color: #2b8a3e; }
    #jh-floating-panel.jh-fp-score-strong .jh-fp-score-number { color: #2b8a3e; }
    #jh-floating-panel.jh-fp-score-good .jh-fp-score-ring { border-color: #087f5b; }
    #jh-floating-panel.jh-fp-score-good .jh-fp-score-number { color: #087f5b; }
    #jh-floating-panel.jh-fp-score-moderate .jh-fp-score-ring { border-color: #e67700; }
    #jh-floating-panel.jh-fp-score-moderate .jh-fp-score-number { color: #e67700; }
    #jh-floating-panel.jh-fp-score-weak .jh-fp-score-ring { border-color: #d9480f; }
    #jh-floating-panel.jh-fp-score-weak .jh-fp-score-number { color: #d9480f; }
    #jh-floating-panel.jh-fp-score-poor .jh-fp-score-ring { border-color: #c92a2a; }
    #jh-floating-panel.jh-fp-score-poor .jh-fp-score-number { color: #c92a2a; }

    .jh-fp-info {
      flex: 1;
      min-width: 0;
    }

    .jh-fp-score-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 10px;
      display: inline-block;
      margin-bottom: 2px;
    }

    .jh-fp-score-label.jh-fp-strong { background: #d3f9d8; color: #2b8a3e; }
    .jh-fp-score-label.jh-fp-good { background: #c3fae8; color: #087f5b; }
    .jh-fp-score-label.jh-fp-moderate { background: #fff3bf; color: #e67700; }
    .jh-fp-score-label.jh-fp-weak { background: #ffe8cc; color: #d9480f; }
    .jh-fp-score-label.jh-fp-poor { background: #ffe3e3; color: #c92a2a; }
    .jh-fp-score-label.jh-fp-hardno { background: #495057; color: #fff; }

    .jh-fp-company {
      display: block;
      font-size: 12px;
      color: #495057;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .jh-fp-controls {
      display: flex;
      gap: 4px;
    }

    .jh-fp-controls button {
      width: 24px;
      height: 24px;
      border: none;
      background: rgba(0,0,0,0.05);
      border-radius: 6px;
      cursor: pointer;
      color: #495057;
      font-size: 14px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jh-fp-controls button:hover {
      background: rgba(0,0,0,0.1);
    }

    .jh-fp-settings {
      font-size: 12px;
    }

    .jh-fp-settings:hover {
      color: #4361ee;
    }

    /* Score meter */
    .jh-fp-meter {
      height: 4px;
      background: #e9ecef;
    }

    .jh-fp-meter-fill {
      height: 100%;
      width: 0;
      transition: width 0.6s ease;
    }

    .jh-fp-meter-fill.jh-fp-strong { background: #2b8a3e; }
    .jh-fp-meter-fill.jh-fp-good { background: #087f5b; }
    .jh-fp-meter-fill.jh-fp-moderate { background: #e67700; }
    .jh-fp-meter-fill.jh-fp-weak { background: #d9480f; }
    .jh-fp-meter-fill.jh-fp-poor { background: #c92a2a; }

    /* Job highlights row - all badges on one line */
    .jh-fp-job-highlights {
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      padding: 8px 10px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
    }

    .jh-fp-job-highlights::-webkit-scrollbar {
      display: none;
    }

    .jh-fp-highlight {
      font-size: 10px;
      padding: 3px 6px;
      background: #fff;
      border: 1px solid #dee2e6;
      border-radius: 10px;
      color: #495057;
      white-space: nowrap;
      flex-shrink: 0;
      cursor: help;
    }

    .jh-fp-highlight.jh-fp-has-value {
      font-weight: 600;
      color: #1a1a2e;
    }

    /* Job meta row - posted date, applicants, hiring manager */
    .jh-fp-job-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 6px 10px;
      background: #fff;
      border-bottom: 1px solid #e9ecef;
      font-size: 11px;
      color: #6c757d;
    }

    .jh-fp-meta-item {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      cursor: help;
    }

    .jh-fp-meta-item.jh-fp-has-value {
      color: #495057;
    }

    .jh-fp-meta-item.jh-fp-good {
      color: #2b8a3e;
    }

    .jh-fp-meta-item.jh-fp-neutral {
      color: #e67700;
    }

    .jh-fp-meta-item.jh-fp-bad {
      color: #c92a2a;
    }

    .jh-fp-highlight.jh-fp-confidence-low {
      font-style: italic;
      opacity: 0.8;
    }

    .jh-fp-highlight.jh-fp-good {
      background: #d3f9d8;
      border-color: #8ce99a;
      color: #2b8a3e;
    }

    .jh-fp-highlight.jh-fp-neutral {
      background: #fff3bf;
      border-color: #ffd43b;
      color: #e67700;
    }

    .jh-fp-highlight.jh-fp-bad {
      background: #fff;
      border-color: #dee2e6;
      color: #868e96;
    }

    .jh-fp-thumb {
      font-size: 9px;
      margin-right: 2px;
    }

    .jh-fp-thumb-up {
      color: #2b8a3e;
    }

    .jh-fp-thumb-down {
      color: #868e96;
    }

    /* Tooltip styles */
    .jh-fp-tooltip {
      position: absolute;
      background: #1a1a2e;
      color: #fff;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      max-width: 200px;
      z-index: 1000001;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }

    .jh-fp-tooltip.jh-fp-tooltip-visible {
      opacity: 1;
    }

    .jh-fp-tooltip::after {
      content: '';
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 6px 6px 0;
      border-style: solid;
      border-color: #1a1a2e transparent transparent;
    }

    /* Expand hint */
    .jh-fp-expand-hint {
      text-align: center;
      font-size: 10px;
      color: #868e96;
      padding: 8px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .jh-fp-expand-hint:hover {
      background: #f1f3f5;
      color: #495057;
    }

    #jh-floating-panel.jh-fp-expanded .jh-fp-expand-hint {
      display: none;
    }

    /* Expanded content */
    .jh-fp-expanded-content {
      display: none;
      padding: 12px 14px;
      border-top: 1px solid #e9ecef;
    }

    #jh-floating-panel.jh-fp-expanded .jh-fp-expanded-content {
      display: block;
    }

    .jh-fp-title-row {
      margin-bottom: 10px;
    }

    .jh-fp-title {
      font-size: 13px;
      font-weight: 500;
      color: #1a1a2e;
    }

    /* Side-by-side columns */
    .jh-fp-columns {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
    }

    .jh-fp-column {
      flex: 1;
      min-width: 0;
    }

    .jh-fp-column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      background: #f1f3f5;
      border-radius: 6px 6px 0 0;
      margin-bottom: 0;
    }

    .jh-fp-column-title {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #495057;
    }

    .jh-fp-column-left .jh-fp-column-header {
      background: linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%);
    }

    .jh-fp-column-right .jh-fp-column-header {
      background: linear-gradient(135deg, #fff3bf 0%, #ffe066 100%);
    }

    .jh-fp-column-left .jh-fp-column-title { color: #1971c2; }
    .jh-fp-column-right .jh-fp-column-title { color: #e67700; }

    .jh-fp-j2u-score,
    .jh-fp-u2j-score {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255,255,255,0.6);
    }

    .jh-fp-subscore-high { color: #2b8a3e; }
    .jh-fp-subscore-mid { color: #e67700; }
    .jh-fp-subscore-low { color: #c92a2a; }

    .jh-fp-column .jh-fp-criteria-list {
      background: #f8f9fa;
      border-radius: 0 0 6px 6px;
      padding: 6px;
      margin-bottom: 0;
    }

    .jh-fp-criterion {
      display: flex;
      flex-direction: column;
      padding: 6px 8px;
      background: #fff;
      border-radius: 4px;
      margin-bottom: 4px;
      cursor: help;
    }

    .jh-fp-criterion:last-child {
      margin-bottom: 0;
    }

    .jh-fp-criterion-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .jh-fp-criterion-name {
      font-size: 11px;
      font-weight: 500;
      color: #1a1a2e;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .jh-fp-criterion-score {
      font-size: 12px;
      font-weight: 700;
      min-width: 28px;
      height: 22px;
      padding: 0 4px;
      border-radius: 4px;
      margin-left: 6px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .jh-fp-criterion.jh-fp-criterion-high .jh-fp-criterion-score {
      background: #2b8a3e;
      color: #fff;
    }

    .jh-fp-criterion.jh-fp-criterion-mid .jh-fp-criterion-score {
      background: #e67700;
      color: #fff;
    }

    .jh-fp-criterion.jh-fp-criterion-low .jh-fp-criterion-score {
      background: #c92a2a;
      color: #fff;
    }

    .jh-fp-criterion-value {
      font-size: 10px;
      color: #868e96;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Skill tags in criteria */
    .jh-fp-skill-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 3px;
      margin-top: 4px;
    }

    .jh-fp-skill-tag {
      font-size: 9px;
      padding: 1px 5px;
      background: #e7f5ff;
      color: #1971c2;
      border-radius: 8px;
      border: 1px solid #a5d8ff;
    }

    .jh-fp-skill-more {
      font-size: 9px;
      padding: 1px 5px;
      color: #868e96;
    }

    /* Recommendation row - replaces action row */
    .jh-fp-recommendation-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      background: #f8f9fa;
      border-radius: 6px;
      margin-bottom: 10px;
    }

    .jh-fp-recommendation-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 12px;
      white-space: nowrap;
    }

    .jh-fp-recommendation-badge.jh-fp-rec-strong {
      background: #2b8a3e;
      color: #fff;
    }

    .jh-fp-recommendation-badge.jh-fp-rec-good {
      background: #087f5b;
      color: #fff;
    }

    .jh-fp-recommendation-badge.jh-fp-rec-moderate {
      background: #e67700;
      color: #fff;
    }

    .jh-fp-recommendation-badge.jh-fp-rec-weak {
      background: #d9480f;
      color: #fff;
    }

    .jh-fp-recommendation-badge.jh-fp-rec-poor {
      background: #c92a2a;
      color: #fff;
    }

    .jh-fp-recommendation-summary {
      font-size: 11px;
      color: #495057;
      line-height: 1.3;
      flex: 1;
    }

    /* Legend styles */
    .jh-fp-legend {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: #f1f3f5;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 9px;
    }

    .jh-fp-legend-title {
      font-weight: 600;
      color: #495057;
      margin-right: 4px;
    }

    .jh-fp-legend-item {
      font-size: 10px;
    }

    .jh-fp-legend-good {
      color: #2b8a3e;
    }

    .jh-fp-legend-moderate {
      color: #e67700;
    }

    .jh-fp-legend-poor {
      color: #c92a2a;
    }

    .jh-fp-legend-text {
      color: #868e96;
      margin-right: 8px;
    }

    .jh-fp-buttons {
      display: flex;
      gap: 8px;
    }

    .jh-fp-btn {
      flex: 1;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 500;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .jh-fp-details-btn {
      background: #e9ecef;
      color: #495057;
    }

    .jh-fp-details-btn:hover {
      background: #dee2e6;
    }

    .jh-fp-primary {
      background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
      color: #fff;
    }

    .jh-fp-primary:hover {
      background: linear-gradient(135deg, #3a56d4 0%, #324bc0 100%);
    }

    .jh-fp-primary.jh-fp-loading {
      opacity: 0.7;
      pointer-events: none;
    }

    .jh-fp-primary.jh-fp-success {
      background: linear-gradient(135deg, #2b8a3e 0%, #228b22 100%);
    }

    /* Minimized state */
    #jh-floating-panel.jh-fp-minimized .jh-fp-container {
      min-width: auto;
    }

    #jh-floating-panel.jh-fp-minimized .jh-fp-info,
    #jh-floating-panel.jh-fp-minimized .jh-fp-meter,
    #jh-floating-panel.jh-fp-minimized .jh-fp-expand-hint,
    #jh-floating-panel.jh-fp-minimized .jh-fp-expanded-content,
    #jh-floating-panel.jh-fp-minimized .jh-fp-drag-handle {
      display: none;
    }

    #jh-floating-panel.jh-fp-minimized .jh-fp-header {
      padding: 8px;
    }

    #jh-floating-panel.jh-fp-minimized .jh-fp-score-ring {
      width: 36px;
      height: 36px;
    }

    #jh-floating-panel.jh-fp-minimized .jh-fp-score-number {
      font-size: 14px;
    }

    /* Score-based border colors */
    #jh-floating-panel.jh-fp-score-strong .jh-fp-container { border-left: 3px solid #2b8a3e; }
    #jh-floating-panel.jh-fp-score-good .jh-fp-container { border-left: 3px solid #087f5b; }
    #jh-floating-panel.jh-fp-score-moderate .jh-fp-container { border-left: 3px solid #e67700; }
    #jh-floating-panel.jh-fp-score-weak .jh-fp-container { border-left: 3px solid #d9480f; }
    #jh-floating-panel.jh-fp-score-poor .jh-fp-container { border-left: 3px solid #c92a2a; }
  `;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.JobHunterFloatingPanel = {
    create: createFloatingPanel,
    remove: removeFloatingPanel,
    updateScore: updatePanelScore,
    toggleExpanded: togglePanelExpanded,
    toggleMinimized: togglePanelMinimized,
    isVisible: () => panelState.isVisible,
    getState: () => panelState
  };
}
