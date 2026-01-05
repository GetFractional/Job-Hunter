/**
 * Job Hunter OS - Docked Sidebar Rail
 *
 * A LinkedIn-native docked right sidebar that displays:
 * - Jobs Mode: Job scoring, company metadata, and actions
 * - Outreach Mode: Contact info, outreach history, and compose
 *
 * Features:
 * - Fixed right sidebar (doesn't cover job description)
 * - LinkedIn-style design language
 * - Mode switching (Jobs <-> Outreach)
 * - Scrollable content area
 * - Sticky action buttons
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const sidebarState = {
  mode: null, // 'jobs' | 'outreach' | null
  isVisible: false,
  currentScore: null,
  currentJobData: null,
  currentContactData: null,
  outreachHistory: [],
  isExpanded: true
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
function updateSidebarScore(scoreResult, jobData) {
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

  // Update header section
  updateHeaderSection(sidebar, jobData, scoreResult);

  // Update primary card (fit score + chips)
  updatePrimaryCard(sidebar, jobData, scoreResult);

  // Update score breakdown
  updateScoreBreakdown(sidebar, scoreResult);

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
  const employeesEl = sidebar.querySelector('.jh-header-employees');
  const growthEl = sidebar.querySelector('.jh-header-growth');
  const applicantsEl = sidebar.querySelector('.jh-header-applicants');
  const applicants24hEl = sidebar.querySelector('.jh-header-applicants-24h');
  const locationEl = sidebar.querySelector('.jh-header-location');
  const tenureEl = sidebar.querySelector('.jh-header-tenure');

  if (companyEl) companyEl.textContent = jobData.companyName || 'Unknown Company';
  if (titleEl) titleEl.textContent = jobData.jobTitle || 'Unknown Role';

  // Total employees
  if (employeesEl) {
    const headcount = jobData.companyHeadcount || jobData.totalEmployees;
    if (headcount) {
      employeesEl.textContent = formatNumber(headcount);
    } else {
      employeesEl.textContent = '--';
    }
  }

  // Growth percentage
  if (growthEl) {
    const growth = jobData.companyHeadcountGrowth;
    if (growth) {
      growthEl.textContent = growth;
      // Color code growth
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

  // Total applicants
  if (applicantsEl) {
    const count = jobData.applicantCount;
    if (count !== null && count !== undefined) {
      applicantsEl.textContent = `${count}+`;
    } else {
      applicantsEl.textContent = '--';
    }
  }

  // Applicants in last 24h (if available - often Premium only)
  if (applicants24hEl) {
    // This data is rarely available from LinkedIn standard
    // Could be populated from Premium insights if available
    applicants24hEl.textContent = '--';
  }

  // Location (combine city/state with workplace type)
  if (locationEl) {
    let locationText = '--';
    if (jobData.location) {
      locationText = jobData.location;
    }
    if (jobData.workplaceType) {
      if (locationText !== '--') {
        locationText = `${jobData.workplaceType}`;
      } else {
        locationText = jobData.workplaceType;
      }
    }
    locationEl.textContent = locationText;

    // Color code remote as positive
    locationEl.classList.remove('jh-positive');
    if (jobData.workplaceType?.toLowerCase() === 'remote') {
      locationEl.classList.add('jh-positive');
    }
  }

  // Employee Tenure
  if (tenureEl) {
    const tenure = jobData.medianEmployeeTenure;
    if (tenure !== null && tenure !== undefined) {
      tenureEl.textContent = `${tenure} yrs`;
    } else {
      tenureEl.textContent = '--';
    }
  }
}

/**
 * Update the primary card with fit score and recommendation
 */
function updatePrimaryCard(sidebar, jobData, scoreResult) {
  // Update fit score circle
  const scoreCircle = sidebar.querySelector('.jh-score-circle');
  const scoreValue = sidebar.querySelector('.jh-score-value');
  const recommendationChip = sidebar.querySelector('.jh-recommendation-chip');

  if (scoreValue) {
    const score = scoreResult.overall_score || 0;
    scoreValue.textContent = score;

    // Update circle color based on score
    if (scoreCircle) {
      scoreCircle.className = 'jh-score-circle ' + getScoreColorClass(score);
    }
  }

  // Update recommendation chip
  if (recommendationChip) {
    const label = scoreResult.overall_label || 'Analyzing...';
    let chipText = '';
    let chipClass = '';

    switch (label) {
      case 'STRONG FIT':
        chipText = 'WORTH HUNTING';
        chipClass = 'jh-chip-strong';
        break;
      case 'GOOD FIT':
        chipText = 'WORTH HUNTING';
        chipClass = 'jh-chip-good';
        break;
      case 'MODERATE FIT':
        chipText = 'CONSIDER';
        chipClass = 'jh-chip-moderate';
        break;
      case 'WEAK FIT':
        chipText = 'LOW FIT';
        chipClass = 'jh-chip-weak';
        break;
      case 'POOR FIT':
      case 'HARD NO':
        chipText = 'SKIP';
        chipClass = 'jh-chip-poor';
        break;
      default:
        chipText = label;
        chipClass = 'jh-chip-moderate';
    }

    recommendationChip.textContent = chipText;
    recommendationChip.className = 'jh-recommendation-chip ' + chipClass;
  }
}


/**
 * Update the score breakdown section
 */
function updateScoreBreakdown(sidebar, scoreResult) {
  // Job Fit section (job-to-user)
  const jobFitScore = sidebar.querySelector('.jh-breakdown-job-fit .jh-breakdown-score');
  const jobFitList = sidebar.querySelector('.jh-breakdown-job-fit .jh-breakdown-list');

  if (jobFitScore) {
    const score = scoreResult.job_to_user_fit?.score || 0;
    jobFitScore.textContent = `${score}/50`;
    jobFitScore.className = 'jh-breakdown-score ' + getSubScoreClass(score);
  }

  if (jobFitList && scoreResult.job_to_user_fit?.breakdown) {
    jobFitList.innerHTML = renderBreakdownItems(
      scoreResult.job_to_user_fit.breakdown,
      'j2u'
    );
  }

  // Your Fit section (user-to-job)
  const yourFitScore = sidebar.querySelector('.jh-breakdown-your-fit .jh-breakdown-score');
  const yourFitList = sidebar.querySelector('.jh-breakdown-your-fit .jh-breakdown-list');

  if (yourFitScore) {
    const score = scoreResult.user_to_job_fit?.score || 0;
    yourFitScore.textContent = `${score}/50`;
    yourFitScore.className = 'jh-breakdown-score ' + getSubScoreClass(score);
  }

  if (yourFitList && scoreResult.user_to_job_fit?.breakdown) {
    yourFitList.innerHTML = renderBreakdownItems(
      scoreResult.user_to_job_fit.breakdown,
      'u2j'
    );
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
        <span class="jh-dealbreaker-icon">&#9888;</span>
        <div class="jh-dealbreaker-content">
          <strong>Triggered Dealbreakers</strong>
          <ul class="jh-dealbreaker-list">
            ${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
    dealbreakersSection.style.display = 'block';
  } else {
    dealbreakersSection.style.display = 'none';
  }
}

/**
 * Render breakdown items as HTML
 */
function renderBreakdownItems(breakdown, type) {
  if (!breakdown || breakdown.length === 0) {
    return '<div class="jh-breakdown-empty">No data available</div>';
  }

  const thresholds = type === 'j2u'
    ? { high: 35, mid: 15 }
    : { high: 25, mid: 10 };

  return breakdown.map(item => {
    const score = item.score || 0;
    const scoreClass = score >= thresholds.high ? 'jh-score-high' :
                       score >= thresholds.mid ? 'jh-score-mid' : 'jh-score-low';

    // Shorten criteria names
    let criteriaName = item.criteria || '';
    const nameMap = {
      'Operations & Systems Focus': 'Ops & Systems',
      'Title & Seniority Match': 'Title Match',
      'Organizational Stability': 'Org Stability',
      'Industry Experience': 'Industry',
      'Skills Overlap': 'Skills',
      'Benefits Package': 'Benefits Package',
      'Business Lifecycle': 'Lifecycle',
      'Base Salary': 'Base Salary',
      'Work Location': 'Work Location',
      'Bonus': 'Bonus',
      'Equity': 'Equity',
      'Experience Level': 'Experience'
    };
    criteriaName = nameMap[criteriaName] || criteriaName;

    // Additional info (skill tags, benefits, etc.)
    let extraHtml = '';
    if (item.actual_value) {
      extraHtml += `<span class="jh-breakdown-value">${escapeHtml(item.actual_value)}</span>`;
    }

    // Skills display with matched skills as blue badges
    if (item.matched_skills && item.matched_skills.length > 0) {
      const allSkills = item.all_skills || item.matched_skills;
      const matchedSet = new Set(item.matched_skills.map(s => s.toLowerCase()));

      extraHtml += `
        <div class="jh-skill-tags">
          ${allSkills.map(s => {
            const isMatched = matchedSet.has(s.toLowerCase());
            return `<span class="jh-skill-tag ${isMatched ? 'jh-matched' : ''}">${escapeHtml(s)}</span>`;
          }).join('')}
        </div>
      `;
    }

    // Benefits Package display with X/Y (Z%) format and badges
    if (item.criteria === 'Benefits Package') {
      const matched = item.matched_count || 0;
      const total = item.total_preferred || item.total_count || 0;
      const percentage = total > 0 ? Math.round((matched / total) * 100) : 0;

      // Summary line with X/Y (Z%) format
      if (total > 0) {
        extraHtml += `<span class="jh-benefits-summary">${matched}/${total} preferred benefits (${percentage}%)</span>`;
      }

      // Display all benefits with matched ones highlighted as blue badges
      const allBenefits = item.all_benefits || [];
      const matchedBenefits = item.matched_benefits || item.benefit_badges || [];
      const matchedSet = new Set(matchedBenefits.map(b => b.toLowerCase()));

      if (allBenefits.length > 0) {
        extraHtml += `
          <div class="jh-benefits-tags">
            ${allBenefits.map(b => {
              const isMatched = matchedSet.has(b.toLowerCase());
              return `<span class="jh-benefit-tag ${isMatched ? 'jh-matched' : ''}">${escapeHtml(b)}</span>`;
            }).join('')}
          </div>
        `;
      } else if (matchedBenefits.length > 0) {
        // Fallback: just show matched benefits if all_benefits not available
        extraHtml += `
          <div class="jh-benefits-tags">
            ${matchedBenefits.map(b => `<span class="jh-benefit-tag jh-matched">${escapeHtml(b)}</span>`).join('')}
          </div>
        `;
      }
    }

    // Bonus display
    if (item.criteria === 'Bonus') {
      if (item.bonus_detected) {
        extraHtml += `<span class="jh-breakdown-value">✓ Performance bonus mentioned</span>`;
      } else {
        extraHtml += `<span class="jh-breakdown-value">No bonus mentioned</span>`;
      }
    }

    // Equity display
    if (item.criteria === 'Equity') {
      if (item.equity_detected) {
        extraHtml += `<span class="jh-breakdown-value">✓ Equity/stock compensation mentioned</span>`;
      } else {
        extraHtml += `<span class="jh-breakdown-value">No equity mentioned</span>`;
      }
    }

    return `
      <div class="jh-breakdown-item ${scoreClass}" title="${escapeHtml(item.rationale || '')}">
        <div class="jh-breakdown-row">
          <span class="jh-breakdown-name">${escapeHtml(criteriaName)}</span>
          <span class="jh-breakdown-item-score">${score}</span>
        </div>
        ${extraHtml}
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

  // Update contact mini-card
  const nameEl = sidebar.querySelector('.jh-contact-name');
  const roleEl = sidebar.querySelector('.jh-contact-role');
  const companyEl = sidebar.querySelector('.jh-contact-company');
  const locationEl = sidebar.querySelector('.jh-contact-location');

  if (nameEl) nameEl.textContent = contactData.fullName || 'Unknown';
  if (roleEl) roleEl.textContent = contactData.roleTitle || 'Role not specified';
  if (companyEl) companyEl.textContent = contactData.companyName || 'Company not found';
  if (locationEl) locationEl.textContent = contactData.location || '';

  // Update sync status
  updateSyncStatus(sidebar, 'ready');

  console.log('[Job Hunter Sidebar] Contact data loaded:', contactData.fullName);
}

/**
 * Update sync status indicator
 * @param {HTMLElement} sidebar
 * @param {string} status - 'ready' | 'syncing' | 'synced' | 'error'
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
      statusEl.innerHTML = '&#10003; Synced';
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
 * @param {Array} history - Array of outreach log entries
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
          ${entry.message && entry.message.length > 100 ? '<button class="jh-btn-link jh-show-more">Show more</button>' : ''}
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
        // Fallback for older browsers
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

  // Show more buttons
  container.querySelectorAll('.jh-show-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const entry = btn.closest('.jh-outreach-entry');
      const entryId = entry.getAttribute('data-id');
      const fullEntry = sidebarState.outreachHistory.find(e => e.id === entryId);
      if (fullEntry) {
        showFullMessageModal(fullEntry);
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
          // Update local state
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
 * Show full message in modal
 */
function showFullMessageModal(entry) {
  const existingModal = document.getElementById('jh-message-modal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'jh-message-modal';
  modal.className = 'jh-modal-overlay';
  modal.innerHTML = `
    <div class="jh-modal">
      <button class="jh-modal-close">&times;</button>
      <h3>${escapeHtml(entry.channel || 'Message')}</h3>
      <div class="jh-modal-meta">
        <span class="jh-outreach-status ${entry.status === 'Sent' ? 'jh-status-sent' : 'jh-status-not-sent'}">
          ${entry.status || 'Not Sent'}
        </span>
        ${entry.sentDate ? `<span>Sent: ${formatDate(entry.sentDate)}</span>` : ''}
      </div>
      <div class="jh-modal-message">
        ${escapeHtml(entry.message || '').replace(/\n/g, '<br>')}
      </div>
      <div class="jh-modal-actions">
        <button class="jh-btn jh-btn-copy-modal">Copy Message</button>
      </div>
    </div>
  `;

  // Close handler
  modal.querySelector('.jh-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Copy handler
  modal.querySelector('.jh-btn-copy-modal').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(entry.message || '');
      modal.querySelector('.jh-btn-copy-modal').textContent = 'Copied!';
    } catch (err) {
      console.error('Copy failed:', err);
    }
  });

  document.body.appendChild(modal);
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

  // Settings button
  const settingsBtn = sidebar.querySelector('.jh-btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (window.openProfileSetup) {
        window.openProfileSetup();
      }
    });
  }

  // Collapse/expand toggle
  const collapseBtn = sidebar.querySelector('.jh-collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      sidebarState.isExpanded = !sidebarState.isExpanded;
      sidebar.classList.toggle('jh-collapsed', !sidebarState.isExpanded);
      collapseBtn.textContent = sidebarState.isExpanded ? '−' : '+';
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
        console.error('[Job Hunter Sidebar] Hunt error:', error);
        huntBtn.textContent = 'Error';
        huntBtn.classList.remove('jh-loading');

        setTimeout(() => {
          huntBtn.textContent = 'Hunt Job';
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

  // Send to Airtable button (footer)
  const airtableBtn = sidebar.querySelector('.jh-btn-airtable');
  if (airtableBtn) {
    airtableBtn.addEventListener('click', async () => {
      if (!sidebarState.currentJobData || !sidebarState.currentScore) return;

      airtableBtn.disabled = true;
      airtableBtn.textContent = 'Sending...';
      airtableBtn.classList.add('jh-loading');

      try {
        await window.sendJobToAirtable(sidebarState.currentJobData, sidebarState.currentScore);
        airtableBtn.textContent = '✓ Sent to Airtable';
        airtableBtn.classList.remove('jh-loading');
        airtableBtn.classList.add('jh-success');

        setTimeout(() => {
          airtableBtn.textContent = 'Send to Airtable';
          airtableBtn.classList.remove('jh-success');
          airtableBtn.disabled = false;
        }, 3000);
      } catch (error) {
        console.error('[Job Hunter Sidebar] Airtable error:', error);
        airtableBtn.textContent = 'Error - Try Again';
        airtableBtn.classList.remove('jh-loading');

        setTimeout(() => {
          airtableBtn.textContent = 'Send to Airtable';
          airtableBtn.disabled = false;
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

          // Fetch outreach history after sync
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

          // Refresh history
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
// HTML TEMPLATES
// ============================================================================

/**
 * Get Jobs Mode sidebar HTML
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
          <button class="jh-btn-settings" title="Edit Profile">&#9881;</button>
          <button class="jh-sidebar-close" title="Close">&times;</button>
        </div>
      </div>

      <!-- Recommendation chip -->
      <div class="jh-recommendation-row">
        <span class="jh-recommendation-chip">Analyzing...</span>
      </div>

      <!-- Primary card with score -->
      <div class="jh-primary-card">
        <div class="jh-score-section">
          <div class="jh-score-circle">
            <span class="jh-score-value">--</span>
          </div>
          <div class="jh-job-info">
            <span class="jh-header-company">Loading...</span>
            <span class="jh-header-title">Loading...</span>
          </div>
        </div>

        <!-- Company metadata grid -->
        <div class="jh-company-meta-grid">
          <div class="jh-meta-row">
            <span class="jh-meta-label">Employees</span>
            <span class="jh-meta-value jh-header-employees">--</span>
          </div>
          <div class="jh-meta-row">
            <span class="jh-meta-label">Growth (24 mo.)</span>
            <span class="jh-meta-value jh-header-growth">--</span>
          </div>
          <div class="jh-meta-row">
            <span class="jh-meta-label">Total Applicants</span>
            <span class="jh-meta-value jh-header-applicants">--</span>
          </div>
          <div class="jh-meta-row">
            <span class="jh-meta-label">Applicants (24h)</span>
            <span class="jh-meta-value jh-header-applicants-24h">--</span>
          </div>
          <div class="jh-meta-row">
            <span class="jh-meta-label">Location</span>
            <span class="jh-meta-value jh-header-location">--</span>
          </div>
          <div class="jh-meta-row">
            <span class="jh-meta-label">Avg. Tenure</span>
            <span class="jh-meta-value jh-header-tenure">--</span>
          </div>
        </div>
      </div>

      <!-- Score breakdown -->
      <div class="jh-score-breakdown">
        <div class="jh-breakdown-header">
          <span class="jh-breakdown-title">Score Breakdown</span>
          <button class="jh-collapse-btn" title="Collapse">−</button>
        </div>

        <div class="jh-breakdown-content">
          <!-- Job Fit -->
          <div class="jh-breakdown-section jh-breakdown-job-fit">
            <div class="jh-breakdown-section-header">
              <span class="jh-breakdown-section-title">JOB FIT</span>
              <span class="jh-breakdown-score">--/50</span>
            </div>
            <div class="jh-breakdown-list">
              <!-- Populated dynamically -->
            </div>
          </div>

          <!-- Your Fit -->
          <div class="jh-breakdown-section jh-breakdown-your-fit">
            <div class="jh-breakdown-section-header">
              <span class="jh-breakdown-section-title">YOUR FIT</span>
              <span class="jh-breakdown-score">--/50</span>
            </div>
            <div class="jh-breakdown-list">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>
      </div>

      <!-- Dealbreakers -->
      <div class="jh-dealbreakers" style="display: none;"></div>

      <!-- Actions -->
      <div class="jh-actions">
        <button class="jh-btn jh-btn-hunt jh-btn-primary">Hunt Job</button>
        <button class="jh-btn jh-btn-details">View Details</button>
      </div>

      <!-- Send to Airtable footer -->
      <div class="jh-airtable-footer">
        <button class="jh-btn-airtable">Send to Airtable</button>
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
          <button class="jh-sidebar-close" title="Close">&times;</button>
        </div>
      </div>

      <!-- Contact mini-card -->
      <div class="jh-contact-card">
        <div class="jh-contact-info">
          <span class="jh-contact-name">Loading...</span>
          <span class="jh-contact-role">Role not specified</span>
          <span class="jh-contact-company">Company not found</span>
          <span class="jh-contact-location"></span>
        </div>
        <div class="jh-sync-row">
          <button class="jh-btn jh-btn-sync jh-btn-primary">Capture / Sync Contact</button>
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
            <p class="jh-outreach-hint">Sync the contact first, then compose a message below.</p>
          </div>
        </div>
      </div>

      <!-- Compose area -->
      <div class="jh-compose">
        <div class="jh-section-header">
          <span class="jh-section-title">Compose Message</span>
        </div>
        <div class="jh-compose-form">
          <select class="jh-channel-select">
            <option value="LinkedIn Message">LinkedIn Message</option>
            <option value="Email">Email</option>
            <option value="Phone">Phone</option>
            <option value="In-Person">In-Person</option>
            <option value="Other">Other</option>
          </select>
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
// STYLES
// ============================================================================

/**
 * Get sidebar CSS styles
 */
function getSidebarStyles() {
  return `
    /* ========================================
       JOB HUNTER SIDEBAR RAIL
       Premium docked right sidebar with standout styling
       ======================================== */

    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&display=swap');

    #jh-sidebar-rail {
      position: fixed;
      top: 52px; /* Below LinkedIn nav */
      right: 0;
      width: 406px;
      height: calc(100vh - 52px);
      background: linear-gradient(180deg, #f0f9ff 0%, #e8f4fc 50%, #f5fbff 100%);
      border-left: 2px solid #0ea5e9;
      box-shadow: -4px 0 20px rgba(14, 165, 233, 0.15), -1px 0 4px rgba(0, 0, 0, 0.05);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #0f172a;
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
      padding: 14px 18px;
      border-bottom: 1px solid rgba(14, 165, 233, 0.2);
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      flex-shrink: 0;
    }

    .jh-header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .jh-brand-text {
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      font-weight: 700;
      font-size: 20px;
      color: #ffffff;
      letter-spacing: -0.5px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .jh-mode-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border-radius: 12px;
      backdrop-filter: blur(4px);
    }

    .jh-header-controls {
      display: flex;
      gap: 6px;
    }

    .jh-header-controls button {
      width: 30px;
      height: 30px;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.9);
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .jh-header-controls button:hover {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }

    /* ========================================
       RECOMMENDATION CHIP
       ======================================== */

    .jh-recommendation-row {
      padding: 14px 18px;
      text-align: center;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.5);
    }

    .jh-recommendation-chip {
      display: inline-block;
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .jh-chip-strong {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
    }

    .jh-chip-good {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
    }

    .jh-chip-moderate {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
    }

    .jh-chip-weak {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }

    .jh-chip-poor {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      color: white;
    }

    /* ========================================
       PRIMARY CARD
       ======================================== */

    .jh-primary-card {
      padding: 16px 18px;
      border-bottom: 1px solid rgba(14, 165, 233, 0.15);
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.6);
    }

    .jh-score-section {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
    }

    .jh-score-circle {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 4px solid #e0e7ff;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .jh-score-circle.jh-score-strong { border-color: #059669; background: #ecfdf5; }
    .jh-score-circle.jh-score-good { border-color: #0ea5e9; background: #f0f9ff; }
    .jh-score-circle.jh-score-moderate { border-color: #f59e0b; background: #fffbeb; }
    .jh-score-circle.jh-score-weak { border-color: #ef4444; background: #fef2f2; }
    .jh-score-circle.jh-score-poor { border-color: #6b7280; background: #f9fafb; }

    .jh-score-value {
      font-size: 22px;
      font-weight: 700;
    }

    .jh-score-circle.jh-score-strong .jh-score-value { color: #059669; }
    .jh-score-circle.jh-score-good .jh-score-value { color: #0ea5e9; }
    .jh-score-circle.jh-score-moderate .jh-score-value { color: #f59e0b; }
    .jh-score-circle.jh-score-weak .jh-score-value { color: #ef4444; }
    .jh-score-circle.jh-score-poor .jh-score-value { color: #6b7280; }

    .jh-job-info {
      flex: 1;
      min-width: 0;
    }

    .jh-header-company {
      display: block;
      font-weight: 600;
      font-size: 16px;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }

    .jh-header-title {
      display: block;
      font-size: 13px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ========================================
       COMPANY METADATA GRID
       ======================================== */

    .jh-company-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background: #ffffff;
      border-radius: 10px;
      padding: 12px;
      border: 1px solid rgba(14, 165, 233, 0.15);
    }

    .jh-meta-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .jh-meta-label {
      font-size: 10px;
      font-weight: 500;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .jh-meta-value {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }

    .jh-meta-value.jh-positive {
      color: #059669;
    }

    .jh-meta-value.jh-negative {
      color: #ef4444;
    }

    /* ========================================
       SCORE BREAKDOWN
       ======================================== */

    .jh-score-breakdown {
      flex: 1;
      overflow-y: auto;
      border-bottom: 1px solid rgba(14, 165, 233, 0.15);
    }

    .jh-breakdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      background: rgba(255, 255, 255, 0.7);
      border-bottom: 1px solid rgba(14, 165, 233, 0.1);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .jh-breakdown-title {
      font-weight: 600;
      font-size: 14px;
      color: #0f172a;
    }

    .jh-collapse-btn {
      width: 26px;
      height: 26px;
      border: none;
      background: rgba(14, 165, 233, 0.1);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      color: #0ea5e9;
      transition: all 0.15s ease;
    }

    .jh-collapse-btn:hover {
      background: rgba(14, 165, 233, 0.2);
    }

    .jh-breakdown-content {
      padding: 14px 18px;
    }

    .jh-breakdown-section {
      margin-bottom: 18px;
    }

    .jh-breakdown-section:last-of-type {
      margin-bottom: 0;
    }

    .jh-breakdown-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      border-radius: 8px;
      margin-bottom: 10px;
    }

    .jh-breakdown-job-fit .jh-breakdown-section-header {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      border: 1px solid #93c5fd;
    }

    .jh-breakdown-your-fit .jh-breakdown-section-header {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      border: 1px solid #6ee7b7;
    }

    .jh-breakdown-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .jh-breakdown-job-fit .jh-breakdown-section-title {
      color: #1d4ed8;
    }

    .jh-breakdown-your-fit .jh-breakdown-section-title {
      color: #059669;
    }

    .jh-breakdown-score {
      font-size: 13px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.8);
    }

    .jh-breakdown-score.jh-score-high { color: #059669; }
    .jh-breakdown-score.jh-score-mid { color: #f59e0b; }
    .jh-breakdown-score.jh-score-low { color: #ef4444; }

    .jh-breakdown-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Show all items by default - no show more/less */
    .jh-breakdown-item {
      padding: 10px 12px;
      background: #ffffff;
      border-radius: 8px;
      border-left: 4px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .jh-breakdown-item.jh-score-high {
      border-left-color: #059669;
    }

    .jh-breakdown-item.jh-score-mid {
      border-left-color: #f59e0b;
    }

    .jh-breakdown-item.jh-score-low {
      border-left-color: #ef4444;
    }

    .jh-breakdown-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .jh-breakdown-name {
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }

    .jh-breakdown-item-score {
      font-size: 12px;
      font-weight: 700;
      min-width: 28px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      color: white;
    }

    .jh-score-high .jh-breakdown-item-score { background: linear-gradient(135deg, #059669 0%, #047857 100%); }
    .jh-score-mid .jh-breakdown-item-score { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
    .jh-score-low .jh-breakdown-item-score { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }

    .jh-breakdown-value {
      display: block;
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }

    /* ========================================
       SKILL TAGS - Blue badges for matches
       ======================================== */

    .jh-skill-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }

    .jh-skill-tag {
      font-size: 10px;
      font-weight: 500;
      padding: 3px 8px;
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #1d4ed8;
      border-radius: 10px;
      border: 1px solid #93c5fd;
    }

    .jh-skill-tag.jh-matched {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
      border: none;
      box-shadow: 0 1px 3px rgba(14, 165, 233, 0.3);
    }

    .jh-skill-more {
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
    }

    /* ========================================
       BENEFITS DISPLAY
       ======================================== */

    .jh-benefits-summary {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
    }

    .jh-benefits-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 8px;
    }

    .jh-benefit-tag {
      font-size: 10px;
      font-weight: 500;
      padding: 3px 8px;
      background: #f1f5f9;
      color: #64748b;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }

    .jh-benefit-tag.jh-matched {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
      border: none;
      box-shadow: 0 1px 3px rgba(14, 165, 233, 0.3);
    }

    .jh-breakdown-empty {
      padding: 20px;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      background: #ffffff;
      border-radius: 8px;
    }

    /* ========================================
       DEALBREAKERS
       ======================================== */

    .jh-dealbreakers {
      padding: 12px 18px;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.5);
    }

    .jh-dealbreaker-alert {
      display: flex;
      gap: 10px;
      padding: 12px;
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 1px solid #fca5a5;
      border-radius: 10px;
    }

    .jh-dealbreaker-icon {
      font-size: 20px;
      color: #ef4444;
    }

    .jh-dealbreaker-content strong {
      display: block;
      font-size: 13px;
      color: #dc2626;
      margin-bottom: 4px;
    }

    .jh-dealbreaker-list {
      margin: 0;
      padding-left: 16px;
      font-size: 12px;
      color: #64748b;
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
      padding: 14px 18px;
      border-top: 1px solid rgba(14, 165, 233, 0.15);
      background: rgba(255, 255, 255, 0.8);
      flex-shrink: 0;
    }

    .jh-btn {
      flex: 1;
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .jh-btn-primary {
      background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
      color: white;
      box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
    }

    .jh-btn-primary:hover {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
    }

    .jh-btn-primary.jh-loading {
      opacity: 0.7;
      cursor: wait;
    }

    .jh-btn-primary.jh-success {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }

    .jh-btn-details {
      background: #ffffff;
      color: #334155;
      border: 1px solid rgba(14, 165, 233, 0.3);
    }

    .jh-btn-details:hover {
      background: #f0f9ff;
      border-color: #0ea5e9;
    }

    /* ========================================
       AIRTABLE FOOTER
       ======================================== */

    .jh-airtable-footer {
      padding: 12px 18px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-top: 1px solid rgba(14, 165, 233, 0.1);
      flex-shrink: 0;
    }

    .jh-btn-airtable {
      width: 100%;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 500;
      background: transparent;
      color: #64748b;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .jh-btn-airtable:hover {
      background: #ffffff;
      border-color: #0ea5e9;
      color: #0ea5e9;
    }

    .jh-btn-airtable.jh-loading {
      opacity: 0.7;
      cursor: wait;
    }

    .jh-btn-airtable.jh-success {
      background: #ecfdf5;
      border-color: #059669;
      border-style: solid;
      color: #059669;
    }

    .jh-btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 14px;
    }

    .jh-btn-link {
      background: none;
      border: none;
      color: #0A66C2;
      font-size: 12px;
      cursor: pointer;
      padding: 0;
    }

    .jh-btn-link:hover {
      text-decoration: underline;
    }

    /* ========================================
       OUTREACH MODE - CONTACT CARD
       ======================================== */

    .jh-contact-card {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      flex-shrink: 0;
    }

    .jh-contact-info {
      margin-bottom: 12px;
    }

    .jh-contact-name {
      display: block;
      font-size: 16px;
      font-weight: 600;
      color: #191919;
    }

    .jh-contact-role {
      display: block;
      font-size: 13px;
      color: #666;
      margin-top: 2px;
    }

    .jh-contact-company {
      display: block;
      font-size: 13px;
      color: #191919;
      margin-top: 4px;
    }

    .jh-contact-location {
      display: block;
      font-size: 12px;
      color: #666;
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

    .jh-sync-syncing {
      color: #f59e0b;
    }

    .jh-sync-synced {
      color: #059669;
    }

    .jh-sync-error {
      color: #ef4444;
    }

    /* ========================================
       OUTREACH MODE - HISTORY
       ======================================== */

    .jh-outreach-history {
      flex: 1;
      overflow-y: auto;
      border-bottom: 1px solid #e0e0e0;
    }

    .jh-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: #f8fafc;
      border-bottom: 1px solid #e0e0e0;
      position: sticky;
      top: 0;
    }

    .jh-section-title {
      font-weight: 600;
      font-size: 13px;
      color: #191919;
    }

    .jh-outreach-history-list {
      padding: 12px 16px;
    }

    .jh-outreach-empty {
      text-align: center;
      padding: 24px 16px;
      color: #666;
    }

    .jh-outreach-empty p {
      margin: 0 0 8px 0;
    }

    .jh-outreach-hint {
      font-size: 12px;
      color: #999;
    }

    .jh-outreach-entry {
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 10px;
      border-left: 3px solid #e0e0e0;
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
      color: #0A66C2;
    }

    .jh-outreach-status {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 10px;
    }

    .jh-status-sent {
      background: #e8f4ec;
      color: #057642;
    }

    .jh-status-not-sent {
      background: #fef3c7;
      color: #d97706;
    }

    .jh-outreach-date {
      font-size: 11px;
      color: #999;
      margin-left: auto;
    }

    .jh-outreach-entry-message {
      margin-bottom: 8px;
    }

    .jh-outreach-text {
      font-size: 13px;
      color: #191919;
      margin: 0;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
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
      border-top: 1px solid #e0e0e0;
    }

    .jh-compose-form {
      padding: 12px 16px;
    }

    .jh-channel-select {
      width: 100%;
      padding: 8px 12px;
      font-size: 13px;
      border: 1px solid #d0d0d0;
      border-radius: 8px;
      margin-bottom: 10px;
      background: white;
    }

    .jh-compose-textarea {
      width: 100%;
      height: 80px;
      padding: 10px 12px;
      font-size: 13px;
      border: 1px solid #d0d0d0;
      border-radius: 8px;
      resize: vertical;
      font-family: inherit;
      margin-bottom: 10px;
    }

    .jh-compose-textarea:focus {
      outline: none;
      border-color: #0A66C2;
    }

    .jh-compose-actions {
      display: flex;
      gap: 8px;
    }

    .jh-btn-copy-draft {
      background: #f3f6f8;
      color: #191919;
      border: 1px solid #d0d0d0;
    }

    /* ========================================
       MODAL
       ======================================== */

    .jh-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100001;
    }

    .jh-modal {
      background: white;
      border-radius: 12px;
      padding: 20px;
      max-width: 450px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      position: relative;
    }

    .jh-modal-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      font-size: 24px;
      color: #666;
      cursor: pointer;
    }

    .jh-modal h3 {
      margin: 0 0 12px 0;
      padding-right: 30px;
      font-size: 16px;
    }

    .jh-modal-meta {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .jh-modal-message {
      font-size: 14px;
      line-height: 1.6;
      color: #191919;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .jh-modal-actions {
      display: flex;
      justify-content: flex-end;
    }

    .jh-btn-copy-modal {
      padding: 10px 20px;
      background: #0A66C2;
      color: white;
      border: none;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    /* ========================================
       COLLAPSED STATE
       ======================================== */

    #jh-sidebar-rail.jh-collapsed .jh-breakdown-content {
      display: none;
    }

    #jh-sidebar-rail.jh-collapsed .jh-collapse-btn {
      transform: rotate(0deg);
    }

    /* ========================================
       RESPONSIVE / SCROLL
       ======================================== */

    .jh-score-breakdown::-webkit-scrollbar,
    .jh-outreach-history::-webkit-scrollbar {
      width: 6px;
    }

    .jh-score-breakdown::-webkit-scrollbar-thumb,
    .jh-outreach-history::-webkit-scrollbar-thumb {
      background: #d0d0d0;
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

function formatSalary(val) {
  if (!val) return null;
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${Math.round(val / 1000)}K`;
  return `$${val}`;
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

function getScoreColorClass(score) {
  if (score >= 80) return 'jh-score-strong';
  if (score >= 70) return 'jh-score-good';
  if (score >= 50) return 'jh-score-moderate';
  if (score >= 30) return 'jh-score-weak';
  return 'jh-score-poor';
}

function getSubScoreClass(score) {
  if (score >= 35) return 'jh-score-high';
  if (score >= 15) return 'jh-score-mid';
  return 'jh-score-low';
}

function getWorkplaceClass(workplace) {
  if (!workplace) return '';
  const wp = workplace.toLowerCase();
  if (wp.includes('remote')) return 'jh-workplace-remote';
  if (wp.includes('hybrid')) return 'jh-workplace-hybrid';
  if (wp.includes('on-site') || wp.includes('onsite')) return 'jh-workplace-onsite';
  return '';
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
