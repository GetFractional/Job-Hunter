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

  // Salary
  if (salaryEl) {
    const salary = jobData.salary || jobData.salaryRange;
    if (salary && salary !== 'Not specified') {
      salaryEl.textContent = salary;
      salaryEl.classList.add('jh-fp-has-value');
    } else {
      salaryEl.textContent = '💰 --';
      salaryEl.classList.remove('jh-fp-has-value');
    }
  }

  // Workplace type
  if (workplaceEl) {
    const workplace = jobData.workplaceType || jobData.locationType;
    if (workplace) {
      const isRemote = workplace.toLowerCase().includes('remote');
      const isHybrid = workplace.toLowerCase().includes('hybrid');
      if (isRemote) {
        workplaceEl.textContent = '🏠 Remote';
        workplaceEl.classList.add('jh-fp-good');
      } else if (isHybrid) {
        workplaceEl.textContent = '🏢 Hybrid';
        workplaceEl.classList.add('jh-fp-neutral');
      } else {
        workplaceEl.textContent = '🏢 On-site';
        workplaceEl.classList.add('jh-fp-bad');
      }
    } else {
      workplaceEl.textContent = '📍 --';
    }
  }

  // Bonus - check score breakdown
  if (bonusEl) {
    const bonusInfo = findCriteriaInfo(scoreResult, 'bonus');
    if (bonusInfo && bonusInfo.detected) {
      bonusEl.innerHTML = '👍 <span>Bonus</span>';
      bonusEl.classList.add('jh-fp-good');
    } else {
      bonusEl.textContent = '💵 --';
      bonusEl.classList.remove('jh-fp-good');
    }
  }

  // Equity - check score breakdown
  if (equityEl) {
    const equityInfo = findCriteriaInfo(scoreResult, 'equity');
    if (equityInfo && equityInfo.detected) {
      equityEl.innerHTML = '👍 <span>Equity</span>';
      equityEl.classList.add('jh-fp-good');
    } else {
      equityEl.textContent = '📈 --';
      equityEl.classList.remove('jh-fp-good');
    }
  }
}

/**
 * Find criteria info in score breakdown
 */
function findCriteriaInfo(scoreResult, keyword) {
  const allBreakdown = [
    ...(scoreResult.job_to_user_fit?.breakdown || []),
    ...(scoreResult.user_to_job_fit?.breakdown || [])
  ];

  for (const item of allBreakdown) {
    if (item.criteria?.toLowerCase().includes(keyword)) {
      return {
        detected: item.score > 0 || item.details?.toLowerCase().includes('detected') ||
                  item.details?.toLowerCase().includes('mentioned') ||
                  item.details?.toLowerCase().includes('offers'),
        score: item.score,
        details: item.details
      };
    }
  }
  return null;
}

function updateExpandedContent(scoreResult) {
  const panel = document.getElementById('jh-floating-panel');
  if (!panel) return;

  const j2uSection = panel.querySelector('.jh-fp-j2u-score');
  const u2jSection = panel.querySelector('.jh-fp-u2j-score');
  const criteriaList = panel.querySelector('.jh-fp-criteria-list');
  const actionText = panel.querySelector('.jh-fp-action');

  if (j2uSection) {
    j2uSection.textContent = `${scoreResult.job_to_user_fit.score}/50`;
  }

  if (u2jSection) {
    u2jSection.textContent = `${scoreResult.user_to_job_fit.score}/50`;
  }

  if (actionText && scoreResult.interpretation) {
    actionText.textContent = scoreResult.interpretation.action || 'Review details';
  }

  // Render top criteria (limiting to key ones for compact view)
  if (criteriaList) {
    const allCriteria = [
      ...scoreResult.job_to_user_fit.breakdown,
      ...scoreResult.user_to_job_fit.breakdown
    ].sort((a, b) => b.score - a.score);

    // Show top 4 most relevant criteria
    const topCriteria = allCriteria.slice(0, 4);

    criteriaList.innerHTML = topCriteria.map(c => {
      const percentage = Math.round((c.score / c.max_score) * 100);
      return `
        <div class="jh-fp-criterion">
          <span class="jh-fp-criterion-name">${escapeHtml(c.criteria)}</span>
          <span class="jh-fp-criterion-score ${getScoreClass(percentage)}">${c.score}/${c.max_score}</span>
        </div>
      `;
    }).join('');
  }
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

        <div class="jh-fp-scores-row">
          <div class="jh-fp-score-col">
            <span class="jh-fp-score-type">Job Fit</span>
            <span class="jh-fp-j2u-score">--/50</span>
          </div>
          <div class="jh-fp-score-col">
            <span class="jh-fp-score-type">Your Match</span>
            <span class="jh-fp-u2j-score">--/50</span>
          </div>
        </div>

        <div class="jh-fp-criteria-list">
          <!-- Populated dynamically -->
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
      min-width: 260px;
      max-width: 320px;
      overflow: hidden;
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
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      flex-shrink: 0;
    }

    .jh-fp-score-number {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
    }

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
      background: #ffe3e3;
      border-color: #ffa8a8;
      color: #c92a2a;
    }

    .jh-fp-highlight span {
      font-weight: 600;
    }

    /* Expand hint */
    .jh-fp-expand-hint {
      text-align: center;
      font-size: 10px;
      color: #868e96;
      padding: 6px;
      cursor: pointer;
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

    .jh-fp-scores-row {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }

    .jh-fp-score-col {
      flex: 1;
      background: #f8f9fa;
      padding: 8px;
      border-radius: 6px;
      text-align: center;
    }

    .jh-fp-score-type {
      display: block;
      font-size: 10px;
      color: #868e96;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .jh-fp-j2u-score,
    .jh-fp-u2j-score {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a2e;
    }

    .jh-fp-criteria-list {
      margin-bottom: 10px;
    }

    .jh-fp-criterion {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px solid #f1f3f5;
    }

    .jh-fp-criterion:last-child {
      border-bottom: none;
    }

    .jh-fp-criterion-name {
      font-size: 11px;
      color: #495057;
    }

    .jh-fp-criterion-score {
      font-size: 11px;
      letter-spacing: -1px;
    }

    .jh-fp-criterion-score.jh-fp-score-strong,
    .jh-fp-criterion-score.jh-fp-score-good { color: #2b8a3e; }
    .jh-fp-criterion-score.jh-fp-score-moderate { color: #e67700; }
    .jh-fp-criterion-score.jh-fp-score-weak,
    .jh-fp-criterion-score.jh-fp-score-poor { color: #c92a2a; }

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
