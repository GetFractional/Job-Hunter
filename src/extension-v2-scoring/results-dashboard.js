/**
 * Job Hunter OS - Results Dashboard Script
 *
 * Handles rendering and interaction for the score results modal.
 * This script is injected into the page alongside results-dashboard.html
 * by content.js when a user clicks "Score This Job".
 *
 * Functions exported to window.JobHunterResults for use by content.js
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
function showResultsModal(scoreResult, jobData, onSendToAirtable, onEditProfile) {
  // Remove existing modal if present
  removeResultsModal();

  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.id = 'jh-results-container';

  // Inject the modal HTML
  modalContainer.innerHTML = getModalHTML();

  // Inject the styles
  const styleEl = document.createElement('style');
  styleEl.id = 'jh-results-styles';
  styleEl.textContent = getModalStyles();
  document.head.appendChild(styleEl);

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

  if (container) container.remove();
  if (styles) styles.remove();

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

  // Handle deal-breaker case
  if (scoreResult.deal_breaker_triggered) {
    modal.querySelector('.jh-modal-content').classList.add('jh-deal-breaker-triggered');
    // Insert deal-breaker notice
    const notice = document.createElement('div');
    notice.className = 'jh-deal-breaker-notice';
    notice.textContent = scoreResult.deal_breaker_triggered;
    modal.querySelector('.jh-score-header').after(notice);
  }

  // Update job metadata section
  if (jobData) {
    updateJobMetadata(jobData);
  }

  // Update overall score
  updateOverallScore(scoreResult.overall_score, scoreResult.overall_label);

  // Update summary
  const summaryEl = document.getElementById('jh-score-summary');
  if (summaryEl) {
    summaryEl.textContent = scoreResult.interpretation?.summary || 'Score calculated.';
  }

  // Update Job-to-User fit section
  const j2uScoreEl = document.getElementById('jh-j2u-score');
  if (j2uScoreEl) {
    j2uScoreEl.textContent = `${scoreResult.job_to_user_fit.score}/50`;
  }
  renderCriteriaList('jh-j2u-criteria', scoreResult.job_to_user_fit.breakdown);

  // Update User-to-Job fit section
  const u2jScoreEl = document.getElementById('jh-u2j-score');
  if (u2jScoreEl) {
    u2jScoreEl.textContent = `${scoreResult.user_to_job_fit.score}/50`;
  }
  renderCriteriaList('jh-u2j-criteria', scoreResult.user_to_job_fit.breakdown);

  // Update interpretation section
  updateInterpretation(scoreResult.interpretation);
}

/**
 * Update the overall score display with animation
 * @param {number} score - Score 0-100
 * @param {string} label - Score label (e.g., "STRONG FIT")
 */
function updateOverallScore(score, label) {
  const scoreNumber = document.getElementById('jh-score-number');
  const scoreLabel = document.getElementById('jh-score-label');
  const scoreRing = document.getElementById('jh-score-ring');
  const scoreProgress = document.getElementById('jh-score-progress');

  if (scoreNumber) {
    // Animate score number
    animateValue(scoreNumber, 0, score, 1000);
  }

  if (scoreLabel) {
    scoreLabel.textContent = label;
    // Add label class for styling
    const labelClass = label.toLowerCase().replace(/\s+/g, '-');
    scoreLabel.classList.add(`jh-${labelClass}`);
  }

  if (scoreRing) {
    const ringClass = label.toLowerCase().replace(/\s+/g, '-');
    scoreRing.classList.add(`jh-${ringClass}`);
  }

  if (scoreProgress) {
    // Animate the progress circle
    // Full circle = 339.292 (2 * PI * 54)
    const circumference = 339.292;
    const offset = circumference - (score / 100) * circumference;
    setTimeout(() => {
      scoreProgress.style.strokeDashoffset = offset;
    }, 100);
  }
}

/**
 * Animate a number value
 * @param {HTMLElement} element - Element to update
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} duration - Animation duration in ms
 */
function animateValue(element, start, end, duration) {
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out quad
    const easeProgress = 1 - (1 - progress) * (1 - progress);
    const current = Math.round(start + (end - start) * easeProgress);

    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * Render a list of criteria with scores
 * @param {string} containerId - ID of the container element
 * @param {Array} criteria - Array of criterion objects
 */
function renderCriteriaList(containerId, criteria) {
  const container = document.getElementById(containerId);
  if (!container || !criteria) return;

  // Filter out Hiring Urgency - it doesn't provide value
  const filteredCriteria = criteria.filter(c =>
    !c.criteria?.toLowerCase().includes('hiring urgency')
  );

  container.innerHTML = filteredCriteria.map(criterion => {
    const scorePercentage = Math.round((criterion.score / (criterion.max_score || 50)) * 100);
    const scoreClass = criterion.score >= 40 ? 'jh-score-high' : criterion.score <= 20 ? 'jh-score-low' : '';

    // For Skills Overlap, show matching skills as tags
    let skillTagsHtml = '';
    if (criterion.criteria?.toLowerCase().includes('skill') && criterion.matched_skills && criterion.matched_skills.length > 0) {
      skillTagsHtml = `
        <div class="jh-skill-tags">
          ${criterion.matched_skills.map(skill => `<span class="jh-skill-tag">${escapeHtml(skill)}</span>`).join('')}
        </div>
      `;
    }

    return `
      <div class="jh-criterion ${scoreClass}">
        <div class="jh-criterion-score-badge">
          <span class="jh-score-number">${criterion.score}</span>
          <span class="jh-score-max">/${criterion.max_score || 50}</span>
        </div>
        <div class="jh-criterion-content">
          <div class="jh-criterion-header">
            <span class="jh-criterion-name">${escapeHtml(criterion.criteria)}</span>
            <span class="jh-criterion-value">${escapeHtml(criterion.actual_value || '')}</span>
          </div>
          <p class="jh-criterion-rationale">${escapeHtml(criterion.rationale)}</p>
          ${skillTagsHtml}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Generate star rating HTML based on score percentage
 * Stars correlate directly with the score: 0-10% = 0-1 star, 10-30% = 1-2 stars, etc.
 * @param {number} score - Score 0-50 (representing a criterion score)
 * @returns {string} HTML for star rating
 */
function getStarRating(score) {
  // Convert 0-50 score to percentage, then to 0-5 stars
  // Score 0-10 = 0-1 star, 10-20 = 1-2 stars, 20-30 = 2-3 stars, 30-40 = 3-4 stars, 40-50 = 4-5 stars
  const percentage = (score / 50) * 100;
  let filledStars;

  if (percentage <= 10) {
    filledStars = percentage >= 5 ? 1 : 0;
  } else if (percentage <= 30) {
    filledStars = percentage >= 20 ? 2 : 1;
  } else if (percentage <= 50) {
    filledStars = percentage >= 40 ? 3 : 2;
  } else if (percentage <= 70) {
    filledStars = percentage >= 60 ? 4 : 3;
  } else {
    filledStars = percentage >= 90 ? 5 : 4;
  }

  const starSVG = `<svg class="jh-star" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

  let html = '';
  for (let i = 0; i < 5; i++) {
    const filled = i < filledStars ? 'jh-filled' : '';
    html += starSVG.replace('class="jh-star"', `class="jh-star ${filled}"`);
  }
  return html;
}

/**
 * Update the job metadata section (Posted, Applicants, Hiring Manager)
 * @param {Object} jobData - Job data
 */
function updateJobMetadata(jobData) {
  // Posted Date
  const postedRow = document.getElementById('jh-posted-row');
  const postedValue = document.getElementById('jh-posted-value');
  if (postedValue) {
    const posted = jobData.postedDate;
    if (posted) {
      postedValue.textContent = posted;
      postedValue.classList.add('jh-has-value');
    } else {
      postedValue.textContent = 'Not listed';
      if (postedRow) postedRow.style.display = 'none';
    }
  }

  // Applicant Count
  const applicantsRow = document.getElementById('jh-applicants-row');
  const applicantsValue = document.getElementById('jh-applicants-value');
  if (applicantsValue) {
    const count = jobData.applicantCount;
    if (count !== null && count !== undefined) {
      applicantsValue.textContent = `${count}`;
      applicantsValue.classList.add('jh-has-value');
      // Color code based on competition level
      applicantsValue.classList.remove('jh-good', 'jh-neutral', 'jh-bad');
      if (count < 25) {
        applicantsValue.classList.add('jh-good');
      } else if (count < 100) {
        applicantsValue.classList.add('jh-neutral');
      } else {
        applicantsValue.classList.add('jh-bad');
      }
    } else {
      applicantsValue.textContent = 'Not listed';
      if (applicantsRow) applicantsRow.style.display = 'none';
    }
  }

  // Hiring Manager
  const hiringManagerRow = document.getElementById('jh-hiring-manager-row');
  const hiringManagerValue = document.getElementById('jh-hiring-manager-value');
  if (hiringManagerValue) {
    const manager = jobData.hiringManager;
    if (manager) {
      hiringManagerValue.textContent = manager;
      hiringManagerValue.classList.add('jh-has-value');
    } else {
      hiringManagerValue.textContent = 'Not listed';
      if (hiringManagerRow) hiringManagerRow.style.display = 'none';
    }
  }
}

/**
 * Update the interpretation section
 * @param {Object} interpretation - Interpretation object
 */
function updateInterpretation(interpretation) {
  if (!interpretation) return;

  // Update action badge
  const actionBadge = document.getElementById('jh-action-badge');
  const actionText = document.getElementById('jh-action-text');

  if (actionBadge && actionText) {
    actionText.textContent = interpretation.action || 'Review score details';

    // Set badge style based on action
    if (interpretation.action?.includes('PURSUE') || interpretation.action?.includes('STRONG')) {
      actionBadge.classList.add('jh-pursue');
    } else if (interpretation.action?.includes('CONSIDER') || interpretation.action?.includes('MODERATE')) {
      actionBadge.classList.add('jh-consider');
    } else {
      actionBadge.classList.add('jh-skip');
    }
  }

  // Update conversation starters
  const startersContainer = document.getElementById('jh-conversation-starters');
  if (startersContainer && interpretation.conversation_starters?.length > 0) {
    startersContainer.innerHTML = `
      <span class="jh-conversation-starters-label">Questions to Ask</span>
      ${interpretation.conversation_starters.map(q =>
        `<div class="jh-conversation-starter">${escapeHtml(q)}</div>`
      ).join('')}
    `;
  } else if (startersContainer) {
    startersContainer.innerHTML = '';
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Set up event handlers for modal buttons
 * @param {Object} scoreResult - Score result
 * @param {Object} jobData - Job data
 * @param {Function} onSendToAirtable - Callback for send button
 * @param {Function} onEditProfile - Callback for edit profile button
 */
function setupModalEventHandlers(scoreResult, jobData, onSendToAirtable, onEditProfile) {
  const modal = document.getElementById('jh-results-modal');
  if (!modal) return;

  // Close button
  const closeBtn = modal.querySelector('.jh-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', removeResultsModal);
  }

  // Close on backdrop click
  const backdrop = modal.querySelector('.jh-modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', removeResultsModal);
  }

  // Close button in footer
  const footerCloseBtn = document.getElementById('jh-btn-close');
  if (footerCloseBtn) {
    footerCloseBtn.addEventListener('click', removeResultsModal);
  }

  // Escape key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      removeResultsModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Edit Profile button
  const editProfileBtn = document.getElementById('jh-btn-edit-profile');
  if (editProfileBtn && onEditProfile) {
    editProfileBtn.addEventListener('click', () => {
      onEditProfile();
    });
  }

  // Send to Job Hunter button
  const sendBtn = document.getElementById('jh-btn-send');
  if (sendBtn && onSendToAirtable) {
    sendBtn.addEventListener('click', async () => {
      sendBtn.disabled = true;
      sendBtn.classList.add('jh-loading');
      sendBtn.textContent = '';

      try {
        await onSendToAirtable(jobData, scoreResult);
        sendBtn.classList.remove('jh-loading');
        sendBtn.classList.add('jh-success');
        sendBtn.textContent = 'Sent!';

        // Close modal after success
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
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// MODAL HTML TEMPLATE
// ============================================================================

/**
 * Get the modal HTML template
 * @returns {string} HTML string
 */
function getModalHTML() {
  return `
<div id="jh-results-modal" class="jh-modal">
  <div class="jh-modal-backdrop"></div>
  <div class="jh-modal-content">
    <button type="button" class="jh-modal-close" title="Close">&times;</button>

    <header class="jh-score-header">
      <div class="jh-score-ring" id="jh-score-ring">
        <svg viewBox="0 0 120 120" class="jh-score-svg">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#e9ecef" stroke-width="8"/>
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="#4361ee"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="339.292"
            stroke-dashoffset="339.292"
            transform="rotate(-90 60 60)"
            class="jh-score-progress"
            id="jh-score-progress"
          />
        </svg>
        <div class="jh-score-value">
          <span class="jh-score-number" id="jh-score-number">--</span>
          <span class="jh-score-max">/100</span>
        </div>
      </div>
      <div class="jh-score-info">
        <span class="jh-score-label" id="jh-score-label">Calculating...</span>
        <p class="jh-score-summary" id="jh-score-summary">Analyzing job fit...</p>
      </div>
    </header>

    <section class="jh-fit-section">
      <div class="jh-section-header">
        <h3>Job Meets Your Needs</h3>
        <span class="jh-section-score" id="jh-j2u-score">--/50</span>
      </div>
      <div class="jh-criteria-list" id="jh-j2u-criteria">
        <div class="jh-loading">Loading criteria...</div>
      </div>
    </section>

    <section class="jh-fit-section">
      <div class="jh-section-header">
        <h3>You Match This Role</h3>
        <span class="jh-section-score" id="jh-u2j-score">--/50</span>
      </div>
      <div class="jh-criteria-list" id="jh-u2j-criteria">
        <div class="jh-loading">Loading criteria...</div>
      </div>
    </section>

    <section class="jh-interpretation-section">
      <h3>Next Steps</h3>
      <div class="jh-action-badge" id="jh-action-badge">
        <span class="jh-action-icon"></span>
        <span class="jh-action-text" id="jh-action-text">Analyzing...</span>
      </div>
      <div class="jh-conversation-starters" id="jh-conversation-starters"></div>
    </section>

    <footer class="jh-modal-footer">
      <button type="button" class="jh-btn jh-btn-secondary" id="jh-btn-edit-profile">Edit Profile</button>
      <button type="button" class="jh-btn jh-btn-secondary" id="jh-btn-close">Close</button>
      <button type="button" class="jh-btn jh-btn-primary" id="jh-btn-send">Send to Job Hunter</button>
    </footer>
  </div>
</div>
  `;
}

/**
 * Get the modal styles
 * Note: This is a subset of the full CSS, inlined for injection
 * @returns {string} CSS string
 */
function getModalStyles() {
  // Return the CSS content - this is loaded from results-dashboard.css
  // For inline injection, we include the essential styles here
  return `
.jh-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999998;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1a1a2e;
  box-sizing: border-box;
}
.jh-modal * { box-sizing: border-box; }
.jh-modal-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}
.jh-modal-content {
  position: relative;
  width: 90%;
  max-width: 520px;
  max-height: 90vh;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  animation: jh-modal-appear 0.3s ease;
}
@keyframes jh-modal-appear {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.jh-modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f3f5;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  color: #495057;
  cursor: pointer;
  transition: all 0.15s ease;
  z-index: 10;
}
.jh-modal-close:hover { background: #e9ecef; color: #1a1a2e; }
.jh-score-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px 16px 0 0;
}
.jh-score-ring {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}
.jh-score-svg { width: 100%; height: 100%; }
.jh-score-progress { transition: stroke-dashoffset 1s ease, stroke 0.3s ease; }
.jh-score-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
.jh-score-number {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1;
}
.jh-score-max { font-size: 12px; color: #868e96; }
.jh-score-info { flex: 1; }
.jh-score-label {
  display: inline-block;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 20px;
  margin-bottom: 8px;
}
.jh-score-label.jh-strong-fit { background: #d3f9d8; color: #2b8a3e; }
.jh-score-label.jh-good-fit { background: #c3fae8; color: #087f5b; }
.jh-score-label.jh-moderate-fit { background: #fff3bf; color: #e67700; }
.jh-score-label.jh-weak-fit { background: #ffe8cc; color: #d9480f; }
.jh-score-label.jh-poor-fit { background: #ffe3e3; color: #c92a2a; }
.jh-score-label.jh-hard-no { background: #495057; color: #fff; }
.jh-score-summary { font-size: 13px; color: #495057; margin: 0; }
.jh-fit-section { padding: 16px 24px; border-bottom: 1px solid #e9ecef; }
.jh-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.jh-section-header h3 { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 0; }
.jh-section-score {
  font-size: 13px;
  font-weight: 600;
  color: #495057;
  background: #f1f3f5;
  padding: 2px 8px;
  border-radius: 4px;
}
.jh-criteria-list { display: flex; flex-direction: column; gap: 8px; }
.jh-loading { text-align: center; color: #868e96; padding: 16px; font-size: 13px; }
.jh-criterion {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
}
.jh-criterion-score-badge {
  display: flex;
  align-items: baseline;
  padding: 4px 8px;
  background: #e9ecef;
  border-radius: 6px;
  flex-shrink: 0;
}
.jh-criterion-score-badge .jh-score-number { font-size: 14px; font-weight: 700; color: #1a1a2e; }
.jh-criterion-score-badge .jh-score-max { font-size: 11px; color: #868e96; }
.jh-criterion.jh-score-high .jh-criterion-score-badge { background: #d3f9d8; }
.jh-criterion.jh-score-high .jh-criterion-score-badge .jh-score-number { color: #2b8a3e; }
.jh-criterion.jh-score-low .jh-criterion-score-badge { background: #ffe3e3; }
.jh-criterion.jh-score-low .jh-criterion-score-badge .jh-score-number { color: #c92a2a; }
.jh-criterion-content { flex: 1; min-width: 0; }
.jh-skill-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.jh-skill-tag {
  font-size: 10px;
  padding: 2px 6px;
  background: #e7f5ff;
  color: #1971c2;
  border-radius: 10px;
  border: 1px solid #a5d8ff;
}
.jh-criterion-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 2px;
}
.jh-criterion-name { font-size: 12px; font-weight: 500; color: #1a1a2e; }
.jh-criterion-value {
  font-size: 11px;
  color: #495057;
  background: #e9ecef;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}
.jh-criterion-rationale { font-size: 11px; color: #868e96; margin: 0; }
.jh-criterion.jh-score-high .jh-criterion-name { color: #2b8a3e; }
.jh-criterion.jh-score-low .jh-criterion-name { color: #c92a2a; }
.jh-interpretation-section { padding: 16px 24px; border-bottom: 1px solid #e9ecef; }
.jh-interpretation-section h3 { font-size: 14px; font-weight: 600; color: #1a1a2e; margin: 0 0 12px 0; }
.jh-action-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 16px;
}
.jh-action-badge.jh-pursue { background: #d3f9d8; color: #2b8a3e; }
.jh-action-badge.jh-consider { background: #fff3bf; color: #e67700; }
.jh-action-badge.jh-skip { background: #ffe3e3; color: #c92a2a; }
.jh-action-icon { font-size: 16px; }
.jh-action-badge.jh-pursue .jh-action-icon::before { content: '✓'; }
.jh-action-badge.jh-consider .jh-action-icon::before { content: '?'; }
.jh-action-badge.jh-skip .jh-action-icon::before { content: '✗'; }
.jh-conversation-starters { display: flex; flex-direction: column; gap: 8px; }
.jh-conversation-starters-label {
  font-size: 11px;
  font-weight: 500;
  color: #868e96;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.jh-conversation-starter {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 12px;
  color: #495057;
}
.jh-conversation-starter::before { content: '💬'; font-size: 14px; flex-shrink: 0; }
.jh-modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  background: #f8f9fa;
  border-radius: 0 0 16px 16px;
}
.jh-btn {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.jh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.jh-btn-primary {
  flex: 1;
  background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
  color: #fff;
}
.jh-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #3a56d4 0%, #324bc0 100%); }
.jh-btn-secondary { background: #e9ecef; color: #495057; }
.jh-btn-secondary:hover:not(:disabled) { background: #dee2e6; }
.jh-btn-primary.jh-success { background: linear-gradient(135deg, #2b8a3e 0%, #228b22 100%); }
.jh-btn.jh-loading { position: relative; color: transparent; }
.jh-btn.jh-loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border: 2px solid transparent;
  border-top-color: #fff;
  border-radius: 50%;
  animation: jh-spin 0.8s linear infinite;
}
@keyframes jh-spin { to { transform: rotate(360deg); } }
.jh-score-ring.jh-strong-fit .jh-score-progress { stroke: #2b8a3e; }
.jh-score-ring.jh-good-fit .jh-score-progress { stroke: #087f5b; }
.jh-score-ring.jh-moderate-fit .jh-score-progress { stroke: #e67700; }
.jh-score-ring.jh-weak-fit .jh-score-progress { stroke: #d9480f; }
.jh-score-ring.jh-poor-fit .jh-score-progress { stroke: #c92a2a; }
.jh-score-ring.jh-hard-no .jh-score-progress { stroke: #495057; }
.jh-modal-content.jh-deal-breaker-triggered { border: 2px solid #c92a2a; }
.jh-modal-content.jh-deal-breaker-triggered .jh-score-header {
  background: linear-gradient(135deg, #ffe3e3 0%, #ffc9c9 100%);
}
.jh-deal-breaker-notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #ffe3e3;
  border-bottom: 1px solid #ffa8a8;
  color: #c92a2a;
  font-size: 13px;
}
.jh-deal-breaker-notice::before { content: '⚠️'; font-size: 18px; }
@media (max-width: 480px) {
  .jh-modal-content { width: 95%; max-height: 95vh; border-radius: 12px; }
  .jh-score-header { flex-direction: column; text-align: center; padding: 20px; }
  .jh-fit-section, .jh-interpretation-section { padding: 12px 16px; }
  .jh-modal-footer { flex-wrap: wrap; padding: 12px 16px; }
  .jh-btn { flex: 1 1 45%; }
  .jh-btn-primary { flex: 1 1 100%; order: -1; margin-bottom: 8px; }
}
  `;
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export functions for use by content.js
if (typeof window !== 'undefined') {
  window.JobHunterResults = {
    showResultsModal,
    removeResultsModal
  };
}
