/**
 * Job Hunter OS - Results Dashboard Script
 * Redesigned to match new View Details layout with side-by-side columns
 */

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

/**
 * Create and inject the results modal into the page
 * @param {Object} scoreResult - Score result from scoring engine
 * @param {Object} jobData - Original job data
 * @param {Function} onSendToAirtable - Callback for "Send to Job Hunter" button
 * @param {Function} onEditProfile - Callback for "Edit Profile" button
 */
async function showResultsModal(scoreResult, jobData, onSendToAirtable, onEditProfile) {
  // Remove existing modal if present
  removeResultsModal();

  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.id = 'jh-results-container';

  // Inject the modal HTML
  modalContainer.innerHTML = getModalHTML();

  // Inject the styles - fetch from CSS file if not already loaded
  if (!document.getElementById('jh-results-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'jh-results-styles';

    // Fetch CSS file from extension
    try {
      const cssUrl = chrome.runtime.getURL('results-dashboard.css');
      const response = await fetch(cssUrl);
      const cssText = await response.text();
      styleEl.textContent = cssText;
    } catch (error) {
      console.error('[Results Dashboard] Failed to load CSS:', error);
      // Fallback to inline styles
      styleEl.textContent = getModalStyles();
    }

    document.head.appendChild(styleEl);
  }

  // Add modal to page
  document.body.appendChild(modalContainer);

  // Populate with score data
  populateModal(scoreResult, jobData);

  // Set up event handlers
  setupModalEventHandlers(scoreResult, jobData, onSendToAirtable, onEditProfile);

  // Prevent body scroll while modal is open
  document.body.style.overflow = 'hidden';

  console.log('[Results Dashboard] Modal displayed');
}

/**
 * Remove the results modal from the page
 */
function removeResultsModal() {
  const container = document.getElementById('jh-results-container');
  const styles = document.getElementById('jh-results-styles');
  const criterionModalStyles = document.getElementById('jh-criterion-modal-styles');

  if (container) container.remove();
  if (styles) styles.remove();
  if (criterionModalStyles) criterionModalStyles.remove();

  // Restore body scroll
  document.body.style.overflow = '';

  console.log('[Results Dashboard] Modal removed');
}

// ============================================================================
// MODAL POPULATION
// ============================================================================

/**
 * Populate the modal with score data
 * @param {Object} scoreResult - Score result from scoring engine
 * @param {Object} jobData - Job data including metadata
 */
function populateModal(scoreResult, jobData) {
  const modal = document.getElementById('jh-results-modal');
  if (!modal) return;

  // Populate header with job title and company
  const jobTitle = modal.querySelector('#jh-job-title');
  if (jobTitle && jobData) {
    const title = jobData.jobTitle || 'Unknown Role';
    const company = jobData.companyName || 'Unknown Company';
    jobTitle.textContent = `${title} at ${company}`;
  }

  // Populate Fit Analysis summary
  const fitSummary = modal.querySelector('#jh-fit-summary');
  if (fitSummary && scoreResult.interpretation) {
    fitSummary.textContent = scoreResult.interpretation.summary || 'Analyzing job fit...';
  }

  // Populate YOUR FIT column (user → job)
  const yourFitScore = scoreResult.user_to_job_fit?.score || 0;
  const yourFitScoreEl = modal.querySelector('#jh-your-fit-score');
  const yourFitLabelEl = modal.querySelector('#jh-your-fit-label');

  if (yourFitScoreEl) {
    yourFitScoreEl.textContent = yourFitScore;
  }
  if (yourFitLabelEl) {
    const label = getFitLabel(yourFitScore);
    yourFitLabelEl.textContent = label;
    yourFitLabelEl.className = 'jh-fit-label ' + getFitLabelClass(yourFitScore);
  }

  // Update Apply Badge
  const applyBadge = modal.querySelector('#jh-apply-badge');
  if (applyBadge) {
    const overallScore = scoreResult.overall_score || 0;
    if (overallScore >= 70) {
      applyBadge.textContent = 'APPLY';
      applyBadge.className = 'jh-apply-badge jh-apply-good';
    } else if (overallScore >= 50) {
      applyBadge.textContent = 'READY';
      applyBadge.className = 'jh-apply-badge jh-apply-moderate';
    } else {
      applyBadge.style.display = 'none';
    }
  }

  // Render YOUR FIT criteria
  renderCriteriaColumn('jh-your-fit-criteria', scoreResult.user_to_job_fit?.breakdown || [], scoreResult, jobData);

  // Populate JOB FIT column (job → user)
  const jobFitScore = scoreResult.job_to_user_fit?.score || 0;
  const jobFitScoreEl = modal.querySelector('#jh-job-fit-score');
  const jobFitLabelEl = modal.querySelector('#jh-job-fit-label');

  if (jobFitScoreEl) {
    jobFitScoreEl.textContent = jobFitScore;
  }
  if (jobFitLabelEl) {
    const label = getFitLabel(jobFitScore);
    jobFitLabelEl.textContent = label;
    jobFitLabelEl.className = 'jh-fit-label ' + getFitLabelClass(jobFitScore);
  }

  // Render JOB FIT criteria
  renderCriteriaColumn('jh-job-fit-criteria', scoreResult.job_to_user_fit?.breakdown || [], scoreResult, jobData);

  // Populate Deal Breakers section
  populateDealBreakers(scoreResult);

  // Populate Job Details section
  populateJobDetails(jobData);
}

/**
 * Get fit label text based on score (0-50 scale)
 */
function getFitLabel(score) {
  if (score >= 40) return 'GREAT FIT';
  if (score >= 30) return 'GOOD FIT';
  if (score >= 20) return 'MODERATE FIT';
  if (score >= 10) return 'WEAK FIT';
  return 'POOR FIT';
}

/**
 * Get CSS class for fit label based on score
 */
function getFitLabelClass(score) {
  if (score >= 40) return 'jh-fit-great';
  if (score >= 30) return 'jh-fit-good';
  if (score >= 20) return 'jh-fit-moderate';
  if (score >= 10) return 'jh-fit-weak';
  return 'jh-fit-poor';
}

/**
 * Render criteria breakdown in a column
 * @param {string} containerId - ID of container element
 * @param {Array} criteria - Array of criterion objects
 * @param {Object} scoreResult - Full score result
 * @param {Object} jobData - Job data
 */
function renderCriteriaColumn(containerId, criteria, scoreResult, jobData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Filter out hiring urgency
  const filteredCriteria = criteria.filter(c =>
    !c.criteria?.toLowerCase().includes('hiring urgency')
  );

  if (filteredCriteria.length === 0) {
    container.innerHTML = '<div class="jh-loading">No criteria available</div>';
    return;
  }

  container.innerHTML = filteredCriteria.map(criterion => {
    const score = criterion.score || 0;
    const maxScore = criterion.max_score || 50;
    const percentage = Math.round((score / maxScore) * 100);
    const barClass = getProgressBarClass(percentage);

    return `
      <div class="jh-criterion jh-criterion-clickable"
           data-criterion="${escapeHtml(criterion.criteria)}"
           data-score="${score}"
           data-max-score="${maxScore}">
        <div class="jh-criterion-header">
          <span class="jh-criterion-name">${escapeHtml(criterion.criteria)}</span>
          <span class="jh-criterion-percentage">${percentage}%</span>
        </div>
        <div class="jh-progress-bar">
          <div class="jh-progress-fill ${barClass}" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');

  // Attach click handlers to show detailed breakdown
  attachCriterionClickHandlers(container, criteria, scoreResult, jobData);
}

/**
 * Get progress bar color class based on percentage
 */
function getProgressBarClass(percentage) {
  if (percentage >= 70) return 'jh-progress-green';
  if (percentage >= 40) return 'jh-progress-yellow';
  return 'jh-progress-red';
}

/**
 * Attach click handlers to criteria for detail view
 */
function attachCriterionClickHandlers(container, allCriteria, scoreResult, jobData) {
  const criterionEls = container.querySelectorAll('.jh-criterion-clickable');

  criterionEls.forEach(el => {
    el.style.cursor = 'pointer';

    el.addEventListener('click', () => {
      const criterionName = el.getAttribute('data-criterion');
      const criterionData = allCriteria.find(c => c.criteria === criterionName);

      if (criterionData) {
        showCriterionDetailModal(criterionData, scoreResult, jobData);
      }
    });
  });
}

/**
 * Show detailed modal for a specific criterion
 */
function showCriterionDetailModal(criterionData, scoreResult, jobData) {
  // Remove any existing criterion modal
  const existing = document.getElementById('jh-criterion-detail-modal');
  if (existing) existing.remove();

  const score = criterionData.score || 0;
  const maxScore = criterionData.max_score || 50;
  const percentage = Math.round((score / maxScore) * 100);

  // Build modal
  const modal = document.createElement('div');
  modal.id = 'jh-criterion-detail-modal';
  modal.className = 'jh-criterion-modal-overlay';

  modal.innerHTML = `
    <div class="jh-criterion-modal">
      <button class="jh-criterion-close">&times;</button>

      <h2>${escapeHtml(criterionData.criteria)}</h2>

      <div class="jh-criterion-score-box">
        <span class="jh-criterion-score-value">${score}<span class="jh-criterion-score-max">/${maxScore}</span></span>
        <div class="jh-progress-bar jh-progress-bar-large">
          <div class="jh-progress-fill ${getProgressBarClass(percentage)}" style="width: ${percentage}%"></div>
        </div>
      </div>

      <div class="jh-criterion-section">
        <h3>Why this score?</h3>
        <p>${escapeHtml(criterionData.rationale || 'Score based on job fit analysis.')}</p>
        ${criterionData.actual_value ? `<p class="jh-criterion-actual"><strong>Detected:</strong> ${escapeHtml(criterionData.actual_value)}</p>` : ''}
        ${criterionData.matched_skills && criterionData.matched_skills.length > 0 ? `
          <div class="jh-matched-skills">
            <strong>Matched Skills:</strong>
            ${criterionData.matched_skills.map(skill => `<span class="jh-skill-badge">${escapeHtml(skill)}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="jh-criterion-section">
        <h3>How to improve:</h3>
        <ul>
          ${getCriterionTips(criterionData.criteria).map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;

  // Add modal styles if not present
  if (!document.getElementById('jh-criterion-modal-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'jh-criterion-modal-styles';
    styleEl.textContent = getCriterionModalStyles();
    document.head.appendChild(styleEl);
  }

  // Close handlers
  const closeBtn = modal.querySelector('.jh-criterion-close');
  closeBtn.addEventListener('click', () => modal.remove());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}

/**
 * Get improvement tips for a criterion
 */
function getCriterionTips(criterionName) {
  const tips = {
    'Base Salary': [
      'Target roles at Series C+ companies for higher budgets',
      'VP/Director titles typically command $180K-250K+',
      'Negotiate based on total comp, not just base'
    ],
    'Work Location': [
      'Filter job searches by your location preference',
      'Remote roles offer geographic flexibility'
    ],
    'Bonus & Equity': [
      'Look for explicit bonus percentages (10-20% typical)',
      'Growth-stage companies often offer meaningful equity'
    ],
    'Skills Overlap': [
      'Target roles where 60%+ skills match',
      'Highlight transferable skills in applications'
    ],
    'Title & Seniority Match': [
      'Target VP/Head-of titles for your experience',
      'Focus on scope and impact, not just title'
    ],
    'Industry Alignment': [
      'Leverage adjacent industry experience',
      'SaaS/B2B experience is widely transferable'
    ]
  };

  return tips[criterionName] || ['Focus on opportunities better aligned with this criterion'];
}

/**
 * Populate deal breakers section
 */
function populateDealBreakers(scoreResult) {
  const section = document.getElementById('jh-deal-breakers-section');
  const list = document.getElementById('jh-deal-breakers-list');

  if (!section || !list) return;

  // Check for deal breaker in score result
  if (scoreResult.deal_breaker_triggered) {
    section.style.display = 'block';
    list.innerHTML = `
      <div class="jh-deal-breaker jh-deal-breaker-triggered">
        ⚠️ ${escapeHtml(scoreResult.deal_breaker_triggered)}
      </div>
    `;
  } else {
    section.style.display = 'none';
  }
}

/**
 * Populate job details section
 */
function populateJobDetails(jobData) {
  if (!jobData) return;

  // Hiring Manager
  const hiringManagerItem = document.getElementById('jh-hiring-manager-item');
  const hiringManagerValue = document.getElementById('jh-hiring-manager');
  if (jobData.hiringManager && hiringManagerValue) {
    hiringManagerValue.textContent = jobData.hiringManager;
    if (hiringManagerItem) hiringManagerItem.style.display = 'flex';
  }

  // Posted Date
  const postedItem = document.getElementById('jh-posted-item');
  const postedValue = document.getElementById('jh-posted');
  if (jobData.postedDate && postedValue) {
    postedValue.textContent = jobData.postedDate;
    if (postedItem) postedItem.style.display = 'flex';
  }

  // Applicants
  const applicantsItem = document.getElementById('jh-applicants-item');
  const applicantsValue = document.getElementById('jh-applicants');
  if (jobData.applicantCount !== null && jobData.applicantCount !== undefined && applicantsValue) {
    applicantsValue.textContent = jobData.applicantCount;
    if (applicantsItem) applicantsItem.style.display = 'flex';
  }

  // Location
  const locationValue = document.getElementById('jh-location');
  if (locationValue) {
    locationValue.textContent = jobData.location || 'Not specified';
  }

  // Salary
  const salaryValue = document.getElementById('jh-salary');
  if (salaryValue) {
    if (jobData.salaryMin && jobData.salaryMax) {
      const formatSalary = (val) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${Math.round(val / 1000)}K`;
        return `$${val}`;
      };
      salaryValue.textContent = `${formatSalary(jobData.salaryMin)} - ${formatSalary(jobData.salaryMax)}`;
    } else {
      salaryValue.textContent = 'Not specified';
    }
  }

  // Bonus
  const bonusItem = document.getElementById('jh-bonus-item');
  const bonusValue = document.getElementById('jh-bonus');
  if (jobData.bonusMentioned && bonusValue) {
    bonusValue.textContent = 'Performance bonus mentioned';
    if (bonusItem) bonusItem.style.display = 'flex';
  }

  // Equity
  const equityItem = document.getElementById('jh-equity-item');
  const equityValue = document.getElementById('jh-equity');
  if (jobData.equityMentioned && equityValue) {
    equityValue.textContent = 'Stock options or equity mentioned';
    if (equityItem) equityItem.style.display = 'flex';
  }

  // Workplace Type
  const workplaceValue = document.getElementById('jh-workplace');
  if (workplaceValue) {
    workplaceValue.textContent = jobData.workplaceType || 'Not specified';
  }

  // Employment Type
  const employmentValue = document.getElementById('jh-employment');
  if (employmentValue) {
    employmentValue.textContent = jobData.employmentType || 'Not specified';
  }

  // Company Size
  const companySizeItem = document.getElementById('jh-company-size-item');
  const companySizeValue = document.getElementById('jh-company-size');
  if (jobData.companyHeadcount && companySizeValue) {
    companySizeValue.textContent = `${jobData.companyHeadcount} employees`;
    if (companySizeItem) companySizeItem.style.display = 'flex';
  }

  // Job Description
  const descriptionValue = document.getElementById('jh-description');
  if (descriptionValue) {
    descriptionValue.textContent = jobData.descriptionText || 'No description available';
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Set up modal event handlers
 */
function setupModalEventHandlers(scoreResult, jobData, onSendToAirtable, onEditProfile) {
  const modal = document.getElementById('jh-results-modal');
  if (!modal) return;

  // Close button (header)
  const closeHeaderBtn = document.getElementById('jh-btn-close-header');
  if (closeHeaderBtn) {
    closeHeaderBtn.addEventListener('click', removeResultsModal);
  }

  // Settings button (header)
  const settingsBtn = document.getElementById('jh-btn-settings');
  if (settingsBtn && onEditProfile) {
    settingsBtn.addEventListener('click', () => {
      onEditProfile();
      removeResultsModal();
    });
  }

  // Edit Profile button (footer)
  const editProfileBtn = document.getElementById('jh-btn-edit-profile');
  if (editProfileBtn && onEditProfile) {
    editProfileBtn.addEventListener('click', () => {
      onEditProfile();
      removeResultsModal();
    });
  }

  // Cancel/Close button (footer)
  const cancelBtn = document.getElementById('jh-btn-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', removeResultsModal);
  }

  // Send to Job Hunter button
  const sendBtn = document.getElementById('jh-btn-send');
  if (sendBtn && onSendToAirtable) {
    sendBtn.addEventListener('click', async () => {
      sendBtn.disabled = true;
      sendBtn.classList.add('jh-loading');
      sendBtn.textContent = 'Sending...';

      try {
        await onSendToAirtable(jobData, scoreResult);
        sendBtn.classList.remove('jh-loading');
        sendBtn.classList.add('jh-success');
        sendBtn.textContent = 'Sent!';

        setTimeout(() => {
          removeResultsModal();
        }, 1500);
      } catch (error) {
        console.error('[Results Dashboard] Send error:', error);
        sendBtn.classList.remove('jh-loading');
        sendBtn.disabled = false;
        sendBtn.textContent = 'Error - Try Again';
      }
    });
  }

  // Close on backdrop click
  const backdrop = modal.querySelector('.jh-modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', removeResultsModal);
  }

  // Close on Escape key
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      removeResultsModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// MODAL HTML & STYLES
// ============================================================================

/**
 * Get the modal HTML template (inline)
 */
function getModalHTML() {
  return `
<div id="jh-results-modal" class="jh-modal">
  <div class="jh-modal-backdrop"></div>
  <div class="jh-modal-content">
    <!-- Header: Job Title + Close + Settings -->
    <div class="jh-modal-header">
      <h1 class="jh-job-title" id="jh-job-title">Loading...</h1>
      <div class="jh-header-controls">
        <button type="button" class="jh-header-btn jh-settings-btn" id="jh-btn-settings" title="Edit Profile">⚙</button>
        <button type="button" class="jh-header-btn jh-close-btn" id="jh-btn-close-header" title="Close">&times;</button>
      </div>
    </div>

    <!-- Fit Analysis Summary -->
    <section class="jh-fit-analysis">
      <h2 class="jh-section-heading">FIT ANALYSIS</h2>
      <p class="jh-fit-summary" id="jh-fit-summary">Analyzing job fit...</p>
    </section>

    <!-- Two-Column Layout: Your Fit & Job Fit -->
    <div class="jh-columns">
      <!-- Left Column: YOUR FIT (User → Job) -->
      <div class="jh-column jh-column-your-fit">
        <div class="jh-column-header">
          <h3>YOUR FIT</h3>
          <div class="jh-fit-score-display">
            <span class="jh-score-large" id="jh-your-fit-score">--</span>
            <span class="jh-score-max">/50</span>
          </div>
        </div>

        <div class="jh-fit-label-container">
          <span class="jh-fit-label" id="jh-your-fit-label">Calculating...</span>
          <span class="jh-apply-badge" id="jh-apply-badge">Apply</span>
        </div>

        <div class="jh-criteria-breakdown" id="jh-your-fit-criteria">
          <!-- Populated by JS -->
          <div class="jh-loading">Loading criteria...</div>
        </div>
      </div>

      <!-- Right Column: JOB FIT (Job → User) -->
      <div class="jh-column jh-column-job-fit">
        <div class="jh-column-header">
          <h3>JOB FIT</h3>
          <div class="jh-fit-score-display">
            <span class="jh-score-large" id="jh-job-fit-score">--</span>
            <span class="jh-score-max">/50</span>
          </div>
        </div>

        <div class="jh-fit-label-container">
          <span class="jh-fit-label" id="jh-job-fit-label">Calculating...</span>
        </div>

        <div class="jh-criteria-breakdown" id="jh-job-fit-criteria">
          <!-- Populated by JS -->
          <div class="jh-loading">Loading criteria...</div>
        </div>
      </div>
    </div>

    <!-- Deal Breakers Section -->
    <section class="jh-deal-breakers" id="jh-deal-breakers-section" style="display: none;">
      <h2 class="jh-section-heading">⚠️ DEAL BREAKERS</h2>
      <div id="jh-deal-breakers-list">
        <!-- Populated by JS -->
      </div>
    </section>

    <!-- Job Details Section -->
    <section class="jh-job-details">
      <h2 class="jh-section-heading">JOB DETAILS</h2>

      <div class="jh-details-grid">
        <!-- Hiring Manager -->
        <div class="jh-detail-item" id="jh-hiring-manager-item" style="display: none;">
          <span class="jh-detail-label">Hiring Manager:</span>
          <span class="jh-detail-value" id="jh-hiring-manager">--</span>
        </div>

        <!-- Posted Date -->
        <div class="jh-detail-item" id="jh-posted-item" style="display: none;">
          <span class="jh-detail-label">Posted:</span>
          <span class="jh-detail-value" id="jh-posted">--</span>
        </div>

        <!-- Applicant Count -->
        <div class="jh-detail-item" id="jh-applicants-item" style="display: none;">
          <span class="jh-detail-label">Total Applicants:</span>
          <span class="jh-detail-value" id="jh-applicants">--</span>
        </div>

        <!-- Location -->
        <div class="jh-detail-item" id="jh-location-item">
          <span class="jh-detail-label">Location:</span>
          <span class="jh-detail-value" id="jh-location">--</span>
        </div>

        <!-- Salary -->
        <div class="jh-detail-item" id="jh-salary-item">
          <span class="jh-detail-label">Salary:</span>
          <span class="jh-detail-value" id="jh-salary">--</span>
        </div>

        <!-- Bonus -->
        <div class="jh-detail-item" id="jh-bonus-item" style="display: none;">
          <span class="jh-detail-label">Bonus:</span>
          <span class="jh-detail-value" id="jh-bonus">--</span>
        </div>

        <!-- Equity -->
        <div class="jh-detail-item" id="jh-equity-item" style="display: none;">
          <span class="jh-detail-label">Equity:</span>
          <span class="jh-detail-value" id="jh-equity">--</span>
        </div>

        <!-- Benefits -->
        <div class="jh-detail-item" id="jh-benefits-item" style="display: none;">
          <span class="jh-detail-label">Benefits:</span>
          <span class="jh-detail-value" id="jh-benefits">--</span>
        </div>

        <!-- Workplace Type -->
        <div class="jh-detail-item" id="jh-workplace-item">
          <span class="jh-detail-label">Workplace Type:</span>
          <span class="jh-detail-value" id="jh-workplace">--</span>
        </div>

        <!-- Employment Type -->
        <div class="jh-detail-item" id="jh-employment-item">
          <span class="jh-detail-label">Employment Type:</span>
          <span class="jh-detail-value" id="jh-employment">--</span>
        </div>

        <!-- Company Size -->
        <div class="jh-detail-item" id="jh-company-size-item" style="display: none;">
          <span class="jh-detail-label">Company Size:</span>
          <span class="jh-detail-value" id="jh-company-size">--</span>
        </div>
      </div>

      <!-- Job Description -->
      <div class="jh-description-container">
        <h3 class="jh-description-heading">JOB DESCRIPTION</h3>
        <div class="jh-description-text" id="jh-description">
          Loading job description...
        </div>
      </div>
    </section>

    <!-- Footer: Action Buttons -->
    <footer class="jh-modal-footer">
      <button type="button" class="jh-btn jh-btn-secondary" id="jh-btn-edit-profile">
        Edit Profile
      </button>
      <button type="button" class="jh-btn jh-btn-secondary" id="jh-btn-cancel">
        Close
      </button>
      <button type="button" class="jh-btn jh-btn-primary" id="jh-btn-send">
        Send to Job Hunter
      </button>
    </footer>
  </div>
</div>
  `;
}

/**
 * Get the modal CSS styles (loaded from separate CSS file via content.js)
 * This function is a placeholder - actual styles come from results-dashboard.css
 */
function getModalStyles() {
  // The CSS is injected separately by content.js, so we return an empty string
  // This ensures the modal works even if the CSS hasn't loaded yet
  return '';
}

/**
 * Get criterion modal styles
 */
function getCriterionModalStyles() {
  return `
    .jh-criterion-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .jh-criterion-modal {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      position: relative;
    }

    .jh-criterion-modal h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      padding-right: 32px;
    }

    .jh-criterion-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6b7280;
      line-height: 1;
      padding: 0;
      width: 24px;
      height: 24px;
    }

    .jh-criterion-close:hover {
      color: #1f2937;
    }

    .jh-criterion-score-box {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .jh-criterion-score-value {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      display: block;
      margin-bottom: 12px;
    }

    .jh-criterion-score-max {
      font-size: 18px;
      font-weight: 400;
      color: #6b7280;
    }

    .jh-progress-bar-large {
      height: 12px;
      margin-top: 8px;
    }

    .jh-criterion-section {
      margin-bottom: 20px;
    }

    .jh-criterion-section h3 {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 8px 0;
    }

    .jh-criterion-section p {
      font-size: 14px;
      color: #4b5563;
      margin: 0 0 8px 0;
      line-height: 1.5;
    }

    .jh-criterion-actual {
      color: #6b7280 !important;
      font-size: 13px !important;
    }

    .jh-matched-skills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
      align-items: center;
    }

    .jh-matched-skills strong {
      font-size: 13px;
      color: #374151;
      margin-right: 4px;
    }

    .jh-skill-badge {
      display: inline-block;
      padding: 4px 8px;
      background: #e7f5ff;
      color: #1971c2;
      border: 1px solid #a5d8ff;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .jh-criterion-section ul {
      margin: 0;
      padding-left: 20px;
    }

    .jh-criterion-section li {
      font-size: 13px;
      color: #4b5563;
      margin: 6px 0;
      line-height: 1.4;
    }
  `;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.JobHunterResults = {
    showResultsModal,
    removeResultsModal
  };
}
