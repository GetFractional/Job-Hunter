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
  const hiringManagerEl = sidebar.querySelector('.jh-header-hiring-manager');

  if (companyEl) companyEl.textContent = jobData.companyName || 'Unknown Company';
  if (titleEl) titleEl.textContent = jobData.jobTitle || 'Unknown Role';

  // Total employees
  if (employeesEl) {
    const headcount = jobData.companyHeadcount || jobData.totalEmployees;
    if (headcount) {
      employeesEl.textContent = `${formatNumber(headcount)} employees`;
      employeesEl.classList.add('jh-has-value');
    } else {
      employeesEl.textContent = 'Employees: N/A';
    }
  }

  // Growth percentage
  if (growthEl) {
    const growth = jobData.companyHeadcountGrowth;
    if (growth) {
      growthEl.textContent = `${growth} (24 mo.)`;
      growthEl.classList.add('jh-has-value');
      // Color code growth
      if (growth.includes('+')) {
        growthEl.classList.add('jh-positive');
      } else if (growth.includes('-')) {
        growthEl.classList.add('jh-negative');
      }
    } else {
      growthEl.textContent = 'Growth: N/A';
    }
  }

  // Total applicants
  if (applicantsEl) {
    const count = jobData.applicantCount;
    if (count !== null && count !== undefined) {
      applicantsEl.textContent = `${count}+ Total Jobs`;
      applicantsEl.classList.add('jh-has-value');
    } else {
      applicantsEl.textContent = '';
      applicantsEl.style.display = 'none';
    }
  }

  // Applicants in last 24h (if available - often Premium only)
  if (applicants24hEl) {
    // This data is rarely available, hide if not
    applicants24hEl.style.display = 'none';
  }

  // Hiring Manager
  if (hiringManagerEl) {
    const managerDetails = jobData.hiringManagerDetails;
    if (managerDetails?.name) {
      hiringManagerEl.textContent = managerDetails.name;
      hiringManagerEl.classList.add('jh-has-value');
      if (managerDetails.title) {
        hiringManagerEl.title = `${managerDetails.name} - ${managerDetails.title}`;
      }
    } else {
      hiringManagerEl.textContent = 'Not listed';
    }
  }
}

/**
 * Update the primary card with fit score and chips
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

  // Update salary chip
  const salaryChip = sidebar.querySelector('.jh-chip-salary');
  if (salaryChip) {
    let salaryText = 'Salary N/A';
    if (jobData.salaryMin !== null && jobData.salaryMin !== undefined) {
      const min = formatSalary(jobData.salaryMin);
      const max = formatSalary(jobData.salaryMax);
      salaryText = max && max !== min ? `${min}-${max}/yr` : `${min}/yr`;
    }
    salaryChip.textContent = salaryText;
  }

  // Update workplace chip
  const workplaceChip = sidebar.querySelector('.jh-chip-workplace');
  if (workplaceChip) {
    const workplace = jobData.workplaceType || 'N/A';
    workplaceChip.textContent = workplace;
    workplaceChip.className = 'jh-chip jh-chip-workplace ' + getWorkplaceClass(workplace);
  }

  // Update bonus chip
  const bonusChip = sidebar.querySelector('.jh-chip-bonus');
  if (bonusChip) {
    if (jobData.bonusMentioned) {
      bonusChip.innerHTML = '<span class="jh-check">&#10003;</span> Bonus';
      bonusChip.classList.add('jh-chip-positive');
    } else {
      bonusChip.innerHTML = 'Bonus';
      bonusChip.classList.remove('jh-chip-positive');
    }
  }

  // Update equity chip
  const equityChip = sidebar.querySelector('.jh-chip-equity');
  if (equityChip) {
    if (jobData.equityMentioned) {
      equityChip.innerHTML = '<span class="jh-check">&#10003;</span> Equity';
      equityChip.classList.add('jh-chip-positive');
    } else {
      equityChip.innerHTML = 'Equity';
      equityChip.classList.remove('jh-chip-positive');
    }
  }

  // Update benefits badge - X/Y format
  updateBenefitsBadge(sidebar, jobData, scoreResult);
}

/**
 * Update the benefits badge with X/Y format
 * X = matched preferred benefits, Y = total preferred benefits
 */
function updateBenefitsBadge(sidebar, jobData, scoreResult) {
  const benefitsChip = sidebar.querySelector('.jh-chip-benefits');
  if (!benefitsChip) return;

  // Find benefits breakdown from scoring result
  const benefitsBreakdown = scoreResult.job_to_user_fit?.breakdown?.find(
    b => b.criteria === 'Benefits Package'
  );

  let matched = 0;
  let total = 0;
  let display = 'Benefits: --';

  if (benefitsBreakdown) {
    // Get from benefits_count if available (format: "X/Y")
    if (benefitsBreakdown.benefits_count) {
      display = `Benefits: ${benefitsBreakdown.benefits_count}`;
    } else if (benefitsBreakdown.benefit_badges) {
      // Count matched benefits
      matched = benefitsBreakdown.benefit_badges.length;
      // Get total from user profile preferred benefits
      total = benefitsBreakdown.total_preferred || matched;
      display = total > 0 ? `Benefits: ${matched}/${total}` : 'Benefits: --';
    }
  }

  benefitsChip.textContent = display;

  // Color based on match ratio
  benefitsChip.classList.remove('jh-chip-positive', 'jh-chip-neutral', 'jh-chip-negative');
  if (matched > 0 && total > 0) {
    const ratio = matched / total;
    if (ratio >= 0.6) {
      benefitsChip.classList.add('jh-chip-positive');
    } else if (ratio >= 0.3) {
      benefitsChip.classList.add('jh-chip-neutral');
    }
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
      'Benefits Package': 'Benefits',
      'Business Lifecycle': 'Lifecycle',
      'Base Salary': 'Base Salary',
      'Work Location': 'Work Location',
      'Bonus & Equity': 'Bonus',
      'Experience Level': 'Experience'
    };
    criteriaName = nameMap[criteriaName] || criteriaName;

    // Additional info (skill tags, benefits, etc.)
    let extraHtml = '';
    if (item.actual_value) {
      extraHtml += `<span class="jh-breakdown-value">${escapeHtml(item.actual_value)}</span>`;
    }
    if (item.matched_skills && item.matched_skills.length > 0) {
      const maxShow = 3;
      const displaySkills = item.matched_skills.slice(0, maxShow);
      const remaining = item.matched_skills.length - maxShow;
      extraHtml += `
        <div class="jh-skill-tags">
          ${displaySkills.map(s => `<span class="jh-skill-tag">${escapeHtml(s)}</span>`).join('')}
          ${remaining > 0 ? `<span class="jh-skill-more">+${remaining} more</span>` : ''}
        </div>
      `;
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

  // Show all toggle for score breakdown
  const showAllBtn = sidebar.querySelector('.jh-show-all-btn');
  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      const breakdownLists = sidebar.querySelectorAll('.jh-breakdown-list');
      breakdownLists.forEach(list => {
        list.classList.toggle('jh-show-all');
      });
      showAllBtn.textContent = showAllBtn.textContent === 'Show all' ? 'Show less' : 'Show all';
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
          <span class="jh-logo">&#127919;</span>
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

        <!-- Company metadata -->
        <div class="jh-company-meta">
          <span class="jh-header-employees">Employees: N/A</span>
          <span class="jh-header-growth">Growth: N/A</span>
          <span class="jh-header-applicants"></span>
          <span class="jh-header-applicants-24h"></span>
          <span class="jh-header-hiring-manager-label">Hiring Manager:</span>
          <span class="jh-header-hiring-manager">Not listed</span>
        </div>

        <!-- Chips row -->
        <div class="jh-chips-row">
          <span class="jh-chip jh-chip-salary">Salary N/A</span>
          <span class="jh-chip jh-chip-workplace">Location N/A</span>
          <span class="jh-chip jh-chip-bonus">Bonus</span>
          <span class="jh-chip jh-chip-equity">Equity</span>
          <span class="jh-chip jh-chip-benefits">Benefits: --</span>
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

          <button class="jh-show-all-btn">Show all</button>
        </div>
      </div>

      <!-- Dealbreakers -->
      <div class="jh-dealbreakers" style="display: none;"></div>

      <!-- Actions -->
      <div class="jh-actions">
        <button class="jh-btn jh-btn-hunt jh-btn-primary">Hunt Job</button>
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
          <span class="jh-logo">&#127919;</span>
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
       LinkedIn-native docked right sidebar
       ======================================== */

    #jh-sidebar-rail {
      position: fixed;
      top: 52px; /* Below LinkedIn nav */
      right: 0;
      width: 320px;
      height: calc(100vh - 52px);
      background: #ffffff;
      border-left: 1px solid #e0e0e0;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      color: #191919;
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
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f3f4 100%);
      flex-shrink: 0;
    }

    .jh-header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .jh-logo {
      font-size: 20px;
    }

    .jh-brand-text {
      font-weight: 600;
      font-size: 15px;
      color: #191919;
    }

    .jh-mode-badge {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 8px;
      background: #0A66C2;
      color: white;
      border-radius: 10px;
    }

    .jh-header-controls {
      display: flex;
      gap: 4px;
    }

    .jh-header-controls button {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      color: #666;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s ease;
    }

    .jh-header-controls button:hover {
      background: rgba(0, 0, 0, 0.08);
      color: #191919;
    }

    /* ========================================
       RECOMMENDATION CHIP
       ======================================== */

    .jh-recommendation-row {
      padding: 12px 16px;
      text-align: center;
      flex-shrink: 0;
    }

    .jh-recommendation-chip {
      display: inline-block;
      padding: 6px 16px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 16px;
    }

    .jh-chip-strong {
      background: #057642;
      color: white;
    }

    .jh-chip-good {
      background: #0A66C2;
      color: white;
    }

    .jh-chip-moderate {
      background: #915907;
      color: white;
    }

    .jh-chip-weak {
      background: #B24020;
      color: white;
    }

    .jh-chip-poor {
      background: #666666;
      color: white;
    }

    /* ========================================
       PRIMARY CARD
       ======================================== */

    .jh-primary-card {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      flex-shrink: 0;
    }

    .jh-score-section {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .jh-score-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f6f8;
      border: 3px solid #e0e0e0;
      flex-shrink: 0;
    }

    .jh-score-circle.jh-score-strong { border-color: #057642; background: #e8f4ec; }
    .jh-score-circle.jh-score-good { border-color: #0A66C2; background: #e8f0f9; }
    .jh-score-circle.jh-score-moderate { border-color: #915907; background: #fdf4e8; }
    .jh-score-circle.jh-score-weak { border-color: #B24020; background: #fce8e3; }
    .jh-score-circle.jh-score-poor { border-color: #666; background: #f3f3f3; }

    .jh-score-value {
      font-size: 20px;
      font-weight: 700;
    }

    .jh-score-circle.jh-score-strong .jh-score-value { color: #057642; }
    .jh-score-circle.jh-score-good .jh-score-value { color: #0A66C2; }
    .jh-score-circle.jh-score-moderate .jh-score-value { color: #915907; }
    .jh-score-circle.jh-score-weak .jh-score-value { color: #B24020; }
    .jh-score-circle.jh-score-poor .jh-score-value { color: #666; }

    .jh-job-info {
      flex: 1;
      min-width: 0;
    }

    .jh-header-company {
      display: block;
      font-weight: 600;
      font-size: 15px;
      color: #191919;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .jh-header-title {
      display: block;
      font-size: 13px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .jh-company-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
      font-size: 12px;
      color: #666;
      margin-bottom: 12px;
    }

    .jh-company-meta span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .jh-company-meta .jh-has-value {
      color: #191919;
    }

    .jh-company-meta .jh-positive {
      color: #057642;
    }

    .jh-company-meta .jh-negative {
      color: #B24020;
    }

    .jh-header-hiring-manager-label {
      color: #666;
    }

    /* ========================================
       CHIPS ROW
       ======================================== */

    .jh-chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .jh-chip {
      font-size: 11px;
      padding: 4px 10px;
      background: #f3f6f8;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      color: #666;
      white-space: nowrap;
    }

    .jh-chip.jh-chip-positive {
      background: #e8f4ec;
      border-color: #b5d4c0;
      color: #057642;
    }

    .jh-chip.jh-chip-neutral {
      background: #fdf4e8;
      border-color: #e8d5b5;
      color: #915907;
    }

    .jh-chip.jh-chip-workplace.jh-workplace-remote {
      background: #e8f4ec;
      border-color: #b5d4c0;
      color: #057642;
    }

    .jh-chip.jh-chip-workplace.jh-workplace-hybrid {
      background: #fdf4e8;
      border-color: #e8d5b5;
      color: #915907;
    }

    .jh-chip.jh-chip-workplace.jh-workplace-onsite {
      background: #f3f3f3;
      border-color: #d0d0d0;
      color: #666;
    }

    .jh-check {
      color: #057642;
      margin-right: 2px;
    }

    /* ========================================
       SCORE BREAKDOWN
       ======================================== */

    .jh-score-breakdown {
      flex: 1;
      overflow-y: auto;
      border-bottom: 1px solid #e0e0e0;
    }

    .jh-breakdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f8fafc;
      border-bottom: 1px solid #e0e0e0;
      position: sticky;
      top: 0;
    }

    .jh-breakdown-title {
      font-weight: 600;
      font-size: 13px;
      color: #191919;
    }

    .jh-collapse-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      color: #666;
    }

    .jh-collapse-btn:hover {
      background: #d0d0d0;
    }

    .jh-breakdown-content {
      padding: 12px 16px;
    }

    .jh-breakdown-section {
      margin-bottom: 16px;
    }

    .jh-breakdown-section:last-of-type {
      margin-bottom: 8px;
    }

    .jh-breakdown-section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      border-radius: 6px;
      margin-bottom: 8px;
    }

    .jh-breakdown-job-fit .jh-breakdown-section-header {
      background: linear-gradient(135deg, #e8f0f9 0%, #d0e4f9 100%);
    }

    .jh-breakdown-your-fit .jh-breakdown-section-header {
      background: linear-gradient(135deg, #fdf4e8 0%, #fde8cc 100%);
    }

    .jh-breakdown-section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .jh-breakdown-job-fit .jh-breakdown-section-title {
      color: #0A66C2;
    }

    .jh-breakdown-your-fit .jh-breakdown-section-title {
      color: #915907;
    }

    .jh-breakdown-score {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.6);
    }

    .jh-breakdown-score.jh-score-high { color: #057642; }
    .jh-breakdown-score.jh-score-mid { color: #915907; }
    .jh-breakdown-score.jh-score-low { color: #B24020; }

    .jh-breakdown-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .jh-breakdown-list:not(.jh-show-all) .jh-breakdown-item:nth-child(n+5) {
      display: none;
    }

    .jh-breakdown-item {
      padding: 8px 10px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #e0e0e0;
    }

    .jh-breakdown-item.jh-score-high {
      border-left-color: #057642;
    }

    .jh-breakdown-item.jh-score-mid {
      border-left-color: #915907;
    }

    .jh-breakdown-item.jh-score-low {
      border-left-color: #B24020;
    }

    .jh-breakdown-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .jh-breakdown-name {
      font-size: 12px;
      font-weight: 500;
      color: #191919;
    }

    .jh-breakdown-item-score {
      font-size: 12px;
      font-weight: 700;
      min-width: 24px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      color: white;
    }

    .jh-score-high .jh-breakdown-item-score { background: #057642; }
    .jh-score-mid .jh-breakdown-item-score { background: #915907; }
    .jh-score-low .jh-breakdown-item-score { background: #B24020; }

    .jh-breakdown-value {
      display: block;
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }

    .jh-skill-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }

    .jh-skill-tag {
      font-size: 10px;
      padding: 2px 6px;
      background: #e8f0f9;
      color: #0A66C2;
      border-radius: 8px;
    }

    .jh-skill-more {
      font-size: 10px;
      color: #666;
    }

    .jh-show-all-btn {
      display: block;
      width: 100%;
      padding: 8px;
      margin-top: 8px;
      background: transparent;
      border: 1px dashed #d0d0d0;
      border-radius: 6px;
      font-size: 12px;
      color: #666;
      cursor: pointer;
    }

    .jh-show-all-btn:hover {
      background: #f8fafc;
      color: #191919;
    }

    .jh-breakdown-empty {
      padding: 16px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    /* ========================================
       DEALBREAKERS
       ======================================== */

    .jh-dealbreakers {
      padding: 12px 16px;
      flex-shrink: 0;
    }

    .jh-dealbreaker-alert {
      display: flex;
      gap: 10px;
      padding: 12px;
      background: #fce8e3;
      border: 1px solid #f5c6ba;
      border-radius: 8px;
    }

    .jh-dealbreaker-icon {
      font-size: 20px;
      color: #B24020;
    }

    .jh-dealbreaker-content strong {
      display: block;
      font-size: 13px;
      color: #B24020;
      margin-bottom: 4px;
    }

    .jh-dealbreaker-list {
      margin: 0;
      padding-left: 16px;
      font-size: 12px;
      color: #666;
    }

    .jh-dealbreaker-list li {
      margin: 4px 0;
    }

    /* ========================================
       ACTIONS
       ======================================== */

    .jh-actions {
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid #e0e0e0;
      background: #f8fafc;
      flex-shrink: 0;
    }

    .jh-btn {
      flex: 1;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .jh-btn-primary {
      background: #0A66C2;
      color: white;
    }

    .jh-btn-primary:hover {
      background: #004182;
    }

    .jh-btn-primary.jh-loading {
      opacity: 0.7;
      cursor: wait;
    }

    .jh-btn-primary.jh-success {
      background: #057642;
    }

    .jh-btn-details {
      background: #f3f6f8;
      color: #191919;
      border: 1px solid #d0d0d0;
    }

    .jh-btn-details:hover {
      background: #e9ecef;
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
      color: #915907;
    }

    .jh-sync-synced {
      color: #057642;
    }

    .jh-sync-error {
      color: #B24020;
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
      background: #fdf4e8;
      color: #915907;
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
