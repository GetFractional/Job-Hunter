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

  // Update fit label and score card
  updateFitScoreCard(sidebar, scoreResult);

  // Update score breakdown with progress bars
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
  const locationEl = sidebar.querySelector('.jh-header-location');

  // Stats grid elements
  const employeesEl = sidebar.querySelector('.jh-stat-employees');
  const followersEl = sidebar.querySelector('.jh-stat-followers');
  const applicantsEl = sidebar.querySelector('.jh-stat-applicants');
  const applicants24hEl = sidebar.querySelector('.jh-stat-applicants-24h');
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
    applicantsEl.textContent = (count !== null && count !== undefined) ? `${count}+` : '--';
  }

  if (applicants24hEl) {
    // Premium-only data
    applicants24hEl.textContent = '--';
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
    tenureEl.textContent = (tenure !== null && tenure !== undefined) ? `${tenure} yrs` : '--';
  }

  if (hiringManagerEl) {
    const manager = jobData.hiringManagerDetails?.name;
    hiringManagerEl.textContent = manager || '--';
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

  // Update score circle
  const scoreCircle = sidebar.querySelector('.jh-score-circle');
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
function updateScoreBreakdown(sidebar, scoreResult) {
  // Job Fit section (job-to-user)
  const jobFitProgress = sidebar.querySelector('.jh-breakdown-job-fit .jh-section-progress');
  const jobFitList = sidebar.querySelector('.jh-breakdown-job-fit .jh-breakdown-list');

  if (jobFitProgress) {
    const score = scoreResult.job_to_user_fit?.score || 0;
    const percentage = (score / 50) * 100;
    jobFitProgress.querySelector('.jh-progress-fill').style.width = `${percentage}%`;
    jobFitProgress.querySelector('.jh-progress-text').textContent = `${score}/50`;
  }

  if (jobFitList && scoreResult.job_to_user_fit?.breakdown) {
    jobFitList.innerHTML = renderBreakdownItems(
      scoreResult.job_to_user_fit.breakdown,
      'j2u'
    );
  }

  // Your Fit section (user-to-job)
  const yourFitProgress = sidebar.querySelector('.jh-breakdown-your-fit .jh-section-progress');
  const yourFitList = sidebar.querySelector('.jh-breakdown-your-fit .jh-breakdown-list');

  if (yourFitProgress) {
    const score = scoreResult.user_to_job_fit?.score || 0;
    const percentage = (score / 50) * 100;
    yourFitProgress.querySelector('.jh-progress-fill').style.width = `${percentage}%`;
    yourFitProgress.querySelector('.jh-progress-text').textContent = `${score}/50`;
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
 */
function renderBreakdownItems(breakdown, type) {
  if (!breakdown || breakdown.length === 0) {
    return '<div class="jh-breakdown-empty">No data available</div>';
  }

  const maxScore = type === 'j2u' ? 50 : 50;

  return breakdown.map(item => {
    const score = item.score || 0;
    const criteriaMaxScore = item.max_score || 10;
    const percentage = (score / criteriaMaxScore) * 100;
    const isHigh = percentage >= 70;

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
      'Bonus': 'Bonus',
      'Equity': 'Equity',
      'Experience Level': 'Experience'
    };
    criteriaName = nameMap[criteriaName] || criteriaName;

    // Build extra content based on criteria type
    let extraHtml = '';

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

    // Benefits display with X/Y (Z%) format and blue badges for matches
    if (item.criteria === 'Benefits Package' || item.criteria === 'Benefits') {
      const matched = item.matched_count || 0;
      const total = item.total_preferred || item.total_count || 0;
      const pct = total > 0 ? Math.round((matched / total) * 100) : 0;

      if (total > 0) {
        extraHtml += `<div class="jh-benefits-summary">${matched}/${total} preferred (${pct}%)</div>`;
      }

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
        extraHtml += `
          <div class="jh-benefits-tags">
            ${matchedBenefits.map(b => `<span class="jh-benefit-tag jh-matched">${escapeHtml(b)}</span>`).join('')}
          </div>
        `;
      }
    }

    // Bonus display with detection status
    if (item.criteria === 'Bonus') {
      if (item.bonus_detected) {
        extraHtml += `<div class="jh-detection-status jh-detected">✓ Performance bonus mentioned</div>`;
      } else {
        extraHtml += `<div class="jh-detection-status jh-not-detected">No bonus mentioned</div>`;
      }
    }

    // Equity display with detection status
    if (item.criteria === 'Equity') {
      if (item.equity_detected) {
        extraHtml += `<div class="jh-detection-status jh-detected">✓ Equity/stock compensation mentioned</div>`;
      } else {
        extraHtml += `<div class="jh-detection-status jh-not-detected">No equity mentioned</div>`;
      }
    }

    // Actual value display for other criteria
    if (item.actual_value && !['Benefits Package', 'Benefits', 'Bonus', 'Equity', 'Skills Overlap'].includes(item.criteria)) {
      extraHtml += `<div class="jh-actual-value">${escapeHtml(item.actual_value)}</div>`;
    }

    return `
      <div class="jh-breakdown-item" title="${escapeHtml(item.rationale || '')}">
        <div class="jh-breakdown-row">
          <span class="jh-breakdown-name">${escapeHtml(criteriaName)}</span>
          <span class="jh-breakdown-score">${score}/${criteriaMaxScore}</span>
        </div>
        <div class="jh-progress-bar">
          <div class="jh-progress-fill ${isHigh ? 'jh-high' : 'jh-low'}" style="width: ${percentage}%"></div>
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
          <button class="jh-btn-settings" title="Edit Profile">⚙</button>
          <button class="jh-sidebar-close" title="Close">×</button>
        </div>
      </div>

      <!-- Fit Label Chip -->
      <div class="jh-fit-row">
        <span class="jh-fit-chip">ANALYZING...</span>
      </div>

      <!-- Score Card with Job Info -->
      <div class="jh-score-card">
        <div class="jh-score-section">
          <div class="jh-score-circle">
            <span class="jh-score-value">--</span>
          </div>
          <div class="jh-job-info">
            <div class="jh-header-company">Loading...</div>
            <div class="jh-header-title">Loading...</div>
            <div class="jh-header-location">--</div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="jh-stats-grid">
          <div class="jh-stat-item">
            <span class="jh-stat-label">Employees</span>
            <span class="jh-stat-value jh-stat-employees">--</span>
          </div>
          <div class="jh-stat-item">
            <span class="jh-stat-label">Followers</span>
            <span class="jh-stat-value jh-stat-followers">--</span>
          </div>
          <div class="jh-stat-item">
            <span class="jh-stat-label">Applicants</span>
            <span class="jh-stat-value jh-stat-applicants">--</span>
          </div>
          <div class="jh-stat-item">
            <span class="jh-stat-label">Last 24h</span>
            <span class="jh-stat-value jh-stat-applicants-24h">--</span>
          </div>
          <div class="jh-stat-item">
            <span class="jh-stat-label">Growth</span>
            <span class="jh-stat-value jh-stat-growth">--</span>
          </div>
          <div class="jh-stat-item">
            <span class="jh-stat-label">Tenure</span>
            <span class="jh-stat-value jh-stat-tenure">--</span>
          </div>
          <div class="jh-stat-item jh-stat-full">
            <span class="jh-stat-label">Hiring Manager</span>
            <span class="jh-stat-value jh-stat-hiring-manager">--</span>
          </div>
        </div>
      </div>

      <!-- Score Breakdown -->
      <div class="jh-score-breakdown">
        <!-- Job Fit Section -->
        <div class="jh-breakdown-section jh-breakdown-job-fit">
          <div class="jh-breakdown-section-header">
            <span class="jh-breakdown-section-title">Job Fit</span>
            <div class="jh-section-progress">
              <div class="jh-progress-bar-container">
                <div class="jh-progress-fill"></div>
              </div>
              <span class="jh-progress-text">--/50</span>
            </div>
          </div>
          <div class="jh-breakdown-list">
            <!-- Populated dynamically -->
          </div>
        </div>

        <!-- Your Fit Section -->
        <div class="jh-breakdown-section jh-breakdown-your-fit">
          <div class="jh-breakdown-section-header">
            <span class="jh-breakdown-section-title">Your Fit</span>
            <div class="jh-section-progress">
              <div class="jh-progress-bar-container">
                <div class="jh-progress-fill"></div>
              </div>
              <span class="jh-progress-text">--/50</span>
            </div>
          </div>
          <div class="jh-breakdown-list">
            <!-- Populated dynamically -->
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
          <button class="jh-sidebar-close" title="Close">×</button>
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
      background: #5856D6;
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
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .jh-breakdown-item {
      padding: 12px;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
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
      color: #6B7280;
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
       SKILL TAGS - Blue badges for matches
       ======================================== */

    .jh-skill-tags,
    .jh-benefits-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .jh-skill-tag,
    .jh-benefit-tag {
      font-size: 11px;
      font-weight: 500;
      padding: 4px 10px;
      background: #F3F4F6;
      color: #6B7280;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
    }

    .jh-skill-tag.jh-matched,
    .jh-benefit-tag.jh-matched {
      background: #5856D6;
      color: white;
      border: none;
    }

    .jh-benefits-summary {
      font-size: 12px;
      color: #6B7280;
      margin-top: 6px;
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
