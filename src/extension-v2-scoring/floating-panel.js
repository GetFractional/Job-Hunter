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
      // Add confidence indicator to title
      const confidenceTitles = {
        'HIGH': 'Salary from job posting',
        'MEDIUM': 'Salary from description (keyword match)',
        'LOW': 'Salary inferred from description',
        'NONE': 'Salary'
      };
      salaryEl.title = confidenceTitles[salaryConfidence] || 'Salary Range';

      // Visual confidence indicator - slightly dim if low confidence
      salaryEl.classList.remove('jh-fp-confidence-low');
      if (salaryConfidence === 'LOW') {
        salaryEl.classList.add('jh-fp-confidence-low');
      }
    } else {
      salaryEl.textContent = 'Salary N/A';
      salaryEl.classList.remove('jh-fp-has-value');
      salaryEl.title = 'Salary not specified';
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
      } else if (wpLower.includes('hybrid')) {
        workplaceEl.textContent = 'Hybrid';
        workplaceEl.classList.add('jh-fp-neutral');
      } else if (wpLower.includes('on-site') || wpLower.includes('onsite')) {
        workplaceEl.textContent = 'On-site';
        workplaceEl.classList.add('jh-fp-bad');
      } else {
        workplaceEl.textContent = workplace;
      }
    } else {
      workplaceEl.textContent = 'Location N/A';
    }
  }

  // Bonus - check score breakdown for detection
  if (bonusEl) {
    const bonusDetected = checkBonusEquityDetected(scoreResult, 'bonus');
    bonusEl.classList.remove('jh-fp-good', 'jh-fp-bad');
    if (bonusDetected) {
      bonusEl.innerHTML = '<span class="jh-fp-thumb jh-fp-thumb-up">▲</span> Bonus';
      bonusEl.classList.add('jh-fp-good');
      bonusEl.title = 'Bonus mentioned in job posting';
    } else {
      bonusEl.innerHTML = '<span class="jh-fp-thumb jh-fp-thumb-down">▼</span> Bonus';
      bonusEl.classList.add('jh-fp-bad');
      bonusEl.title = 'No bonus mentioned';
    }
  }

  // Equity - check score breakdown for detection
  if (equityEl) {
    const equityDetected = checkBonusEquityDetected(scoreResult, 'equity');
    equityEl.classList.remove('jh-fp-good', 'jh-fp-bad');
    if (equityDetected) {
      equityEl.innerHTML = '<span class="jh-fp-thumb jh-fp-thumb-up">▲</span> Equity';
      equityEl.classList.add('jh-fp-good');
      equityEl.title = 'Equity/stock mentioned in job posting';
    } else {
      equityEl.innerHTML = '<span class="jh-fp-thumb jh-fp-thumb-down">▼</span> Equity';
      equityEl.classList.add('jh-fp-bad');
      equityEl.title = 'No equity mentioned';
    }
  }
}

/**
 * Check if bonus or equity was detected in the job posting
 */
function checkBonusEquityDetected(scoreResult, keyword) {
  const allBreakdown = [
    ...(scoreResult.job_to_user_fit?.breakdown || []),
    ...(scoreResult.user_to_job_fit?.breakdown || [])
  ];

  for (const item of allBreakdown) {
    const criteriaLower = (item.criteria || '').toLowerCase();
    const detailsLower = (item.details || item.rationale || '').toLowerCase();

    if (criteriaLower.includes(keyword) || detailsLower.includes(keyword)) {
      // Check if it was actually detected/mentioned
      if (detailsLower.includes('detected') ||
          detailsLower.includes('mentioned') ||
          detailsLower.includes('offers') ||
          detailsLower.includes('includes') ||
          detailsLower.includes('provides') ||
          (item.score && item.score > 0)) {
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
  const actionText = panel.querySelector('.jh-fp-action');

  // Update Job→You score
  if (j2uScoreEl) {
    const j2uScore = scoreResult.job_to_user_fit?.score || 0;
    j2uScoreEl.textContent = `${j2uScore}/50`;
    j2uScoreEl.className = 'jh-fp-j2u-score ' + getSubScoreClass(j2uScore);
  }

  // Update You→Job score
  if (u2jScoreEl) {
    const u2jScore = scoreResult.user_to_job_fit?.score || 0;
    u2jScoreEl.textContent = `${u2jScore}/50`;
    u2jScoreEl.className = 'jh-fp-u2j-score ' + getSubScoreClass(u2jScore);
  }

  // Update action text
  if (actionText && scoreResult.interpretation) {
    actionText.textContent = scoreResult.interpretation.action || 'Review details';
  }

  // Render Job→You criteria (left column)
  if (j2uCriteriaList) {
    const j2uCriteria = (scoreResult.job_to_user_fit?.breakdown || [])
      .filter(c => !c.criteria?.toLowerCase().includes('hiring urgency'));
    j2uCriteriaList.innerHTML = renderCriteriaItems(j2uCriteria);
  }

  // Render You→Job criteria (right column)
  if (u2jCriteriaList) {
    const u2jCriteria = scoreResult.user_to_job_fit?.breakdown || [];
    u2jCriteriaList.innerHTML = renderCriteriaItems(u2jCriteria);
  }
}

/**
 * Render criteria items as HTML
 * @param {Array} criteria - Array of criterion objects
 * @returns {string} HTML string
 */
function renderCriteriaItems(criteria) {
  return criteria.map(c => {
    const maxScore = c.max_score || 50;
    const score = c.score || 0;
    const percentage = Math.round((score / maxScore) * 100);
    const scoreClass = percentage >= 70 ? 'jh-fp-criterion-high' :
                       percentage >= 40 ? 'jh-fp-criterion-mid' : 'jh-fp-criterion-low';

    // Show matched skills as tags if available
    let skillTagsHtml = '';
    if (c.matched_skills && c.matched_skills.length > 0) {
      skillTagsHtml = `
        <div class="jh-fp-skill-tags">
          ${c.matched_skills.slice(0, 3).map(skill =>
            `<span class="jh-fp-skill-tag">${escapeHtml(skill)}</span>`
          ).join('')}
          ${c.matched_skills.length > 3 ? `<span class="jh-fp-skill-more">+${c.matched_skills.length - 3}</span>` : ''}
        </div>
      `;
    }

    return `
      <div class="jh-fp-criterion ${scoreClass}" title="${escapeHtml(c.rationale || '')}">
        <div class="jh-fp-criterion-row">
          <span class="jh-fp-criterion-name">${escapeHtml(c.criteria)}</span>
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

  // Minimize button
  const minimizeBtn = panel.querySelector('.jh-fp-minimize');
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanelMinimized();
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

  // Dragging functionality
  setupDragging(panel);
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
          <button class="jh-fp-minimize" title="Minimize">−</button>
          <button class="jh-fp-close" title="Dismiss">×</button>
        </div>
      </div>

      <div class="jh-fp-job-highlights">
        <span class="jh-fp-highlight jh-fp-salary" title="Salary Range">--</span>
        <span class="jh-fp-highlight jh-fp-workplace" title="Work Location">--</span>
        <span class="jh-fp-highlight jh-fp-bonus" title="Bonus">--</span>
        <span class="jh-fp-highlight jh-fp-equity" title="Equity">--</span>
      </div>

      <div class="jh-fp-meter">
        <div class="jh-fp-meter-fill"></div>
      </div>

      <div class="jh-fp-expanded-content">
        <div class="jh-fp-title-row">
          <span class="jh-fp-title">Loading role...</span>
        </div>

        <!-- Side-by-side columns for expanded view -->
        <div class="jh-fp-columns">
          <!-- Left Column: Job → You -->
          <div class="jh-fp-column jh-fp-column-left">
            <div class="jh-fp-column-header">
              <span class="jh-fp-column-title">Job → You</span>
              <span class="jh-fp-j2u-score">--/50</span>
            </div>
            <div class="jh-fp-criteria-list jh-fp-j2u-criteria">
              <!-- Populated dynamically -->
            </div>
          </div>

          <!-- Right Column: You → Job -->
          <div class="jh-fp-column jh-fp-column-right">
            <div class="jh-fp-column-header">
              <span class="jh-fp-column-title">You → Job</span>
              <span class="jh-fp-u2j-score">--/50</span>
            </div>
            <div class="jh-fp-criteria-list jh-fp-u2j-criteria">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>

        <div class="jh-fp-action-row">
          <span class="jh-fp-action">Analyzing...</span>
        </div>

        <div class="jh-fp-buttons">
          <button class="jh-fp-btn jh-fp-details-btn">View Details</button>
          <button class="jh-fp-btn jh-fp-send-btn jh-fp-primary">Hunt Job</button>
        </div>
      </div>

      <div class="jh-fp-expand-hint">Click to expand ▼</div>
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

    /* Job highlights row */
    .jh-fp-job-highlights {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 8px 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }

    .jh-fp-highlight {
      font-size: 11px;
      padding: 3px 8px;
      background: #fff;
      border: 1px solid #dee2e6;
      border-radius: 12px;
      color: #495057;
      white-space: nowrap;
    }

    .jh-fp-highlight.jh-fp-has-value {
      font-weight: 600;
      color: #1a1a2e;
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
      padding: 1px 4px;
      border-radius: 3px;
      margin-left: 6px;
      flex-shrink: 0;
    }

    .jh-fp-criterion.jh-fp-criterion-high .jh-fp-criterion-score {
      background: #d3f9d8;
      color: #2b8a3e;
    }

    .jh-fp-criterion.jh-fp-criterion-mid .jh-fp-criterion-score {
      background: #fff3bf;
      color: #e67700;
    }

    .jh-fp-criterion.jh-fp-criterion-low .jh-fp-criterion-score {
      background: #ffe3e3;
      color: #c92a2a;
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

    .jh-fp-action-row {
      background: #f8f9fa;
      padding: 8px;
      border-radius: 6px;
      margin-bottom: 10px;
    }

    .jh-fp-action {
      font-size: 11px;
      color: #495057;
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
