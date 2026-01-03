/**
 * Job Hunter OS - Outreach Mode
 *
 * Handles LinkedIn profile page outreach workflow:
 * - Detects ?outreachID=recXXX parameter
 * - Fetches Outreach Log record from Airtable
 * - Displays outreach message UI with copy functionality
 * - Handles "Mark as Sent" CTA
 */

// Track current outreach mode state
let outreachModeActive = false;
let currentOutreachData = null;

/**
 * Initialize Outreach Mode if URL contains outreachID parameter
 */
function initOutreachMode() {
  // Only run on LinkedIn profile pages (/in/ URLs)
  if (!window.location.hostname.includes('linkedin.com') || !window.location.pathname.includes('/in/')) {
    return;
  }

  // Check for outreachID parameter
  const urlParams = new URLSearchParams(window.location.search);
  const outreachID = urlParams.get('outreachID');

  if (!outreachID) {
    return;
  }

  console.log('[Outreach Mode] Detected outreachID:', outreachID);

  // Validate format - Airtable record IDs start with 'rec'
  if (!outreachID.startsWith('rec')) {
    console.error('[Outreach Mode] Invalid outreach ID format:', outreachID);
    return;
  }

  // Fetch outreach record and display UI
  fetchAndDisplayOutreach(outreachID);
}

/**
 * Fetch Outreach Log record from Airtable and display UI
 * @param {string} recordId - Airtable Outreach Log record ID
 */
async function fetchAndDisplayOutreach(recordId) {
  try {
    // Show loading state
    showOutreachLoadingState();

    // Fetch record via background script
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'jobHunter.fetchOutreachRecord',
          recordId: recordId
        },
        (resp) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            reject(new Error(lastErr.message));
            return;
          }
          resolve(resp);
        }
      );
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to fetch outreach record');
    }

    console.log('[Outreach Mode] Fetched outreach record:', response.record);

    // Extract data from record
    const record = response.record;
    const fields = record.fields;

    // Get contact record ID from linked Contact field
    const contactRecordId = fields['Contact']?.[0] || null;

    // Build outreach data object
    currentOutreachData = {
      recordId: record.id,
      contactRecordId: contactRecordId,
      outreachMessage: fields['Outreach Message'] || '',
      outreachStatus: fields['Outreach Status'] || 'Draft',
      sentDate: fields['Sent Date'] || null,
      // Lookup fields from Contact
      firstName: fields['First Name (from Outreach Message)']?.[0] || '',
      lastName: fields['Role / Title (from Outreach Message)']?.[0] || '',
      roleTitle: fields['Role / Title (from Outreach Message)']?.[0] || '',
      company: fields['Company (from Outreach Message)']?.[0] || '',
      email: fields['Email (from Outreach Message)']?.[0] || '',
      linkedInUrl: fields['LinkedIn URL (from Outreach Message)']?.[0] || '',
      lastOutreachDate: fields['Last Outreach Date (from Outreach Message)']?.[0] || null
    };

    outreachModeActive = true;

    // Display outreach UI
    displayOutreachUI(currentOutreachData);

  } catch (error) {
    console.error('[Outreach Mode] Error fetching outreach:', error);
    showOutreachError(error.message);
  }
}

/**
 * Display the Outreach Mode UI overlay
 * @param {Object} data - Outreach data
 */
function displayOutreachUI(data) {
  // Remove any existing outreach UI
  removeOutreachUI();

  const fullName = `${data.firstName} ${data.lastName}`.trim() || 'Hiring Manager';

  const container = document.createElement('div');
  container.id = 'jh-outreach-panel';
  container.className = 'jh-outreach-panel';
  container.innerHTML = `
    <div class="jh-outreach-container">
      <!-- Header -->
      <div class="jh-outreach-header">
        <div class="jh-outreach-icon">📤</div>
        <div class="jh-outreach-title">
          <h2>Outreach Mode</h2>
          <p class="jh-outreach-status ${getStatusClass(data.outreachStatus)}">
            ${data.outreachStatus}
          </p>
        </div>
        <button class="jh-outreach-close" id="jh-outreach-close">×</button>
      </div>

      <!-- Contact Info -->
      <div class="jh-outreach-contact">
        <div class="jh-outreach-contact-name">${escapeHtml(fullName)}</div>
        ${data.roleTitle ? `<div class="jh-outreach-contact-title">${escapeHtml(data.roleTitle)}</div>` : ''}
        ${data.company ? `<div class="jh-outreach-contact-company">${escapeHtml(data.company)}</div>` : ''}
        ${data.email ? `<div class="jh-outreach-contact-email">📧 ${escapeHtml(data.email)}</div>` : ''}
        ${data.lastOutreachDate ? `<div class="jh-outreach-last-contact">Last contact: ${data.lastOutreachDate}</div>` : ''}
      </div>

      <!-- Outreach Message -->
      <div class="jh-outreach-message-section">
        <div class="jh-outreach-message-header">
          <label>Outreach Message</label>
          <button class="jh-outreach-copy-btn" id="jh-outreach-copy-btn">
            <span class="jh-copy-icon">📋</span> Copy
          </button>
        </div>
        <div class="jh-outreach-message" id="jh-outreach-message">
          ${escapeHtml(data.outreachMessage).replace(/\n/g, '<br>')}
        </div>
      </div>

      <!-- Primary CTA -->
      <div class="jh-outreach-actions">
        ${data.outreachStatus !== 'Sent' ? `
          <button class="jh-outreach-btn-primary" id="jh-mark-as-sent">
            <span class="jh-btn-icon">✓</span> Mark as Sent
          </button>
          <button class="jh-outreach-btn-secondary" id="jh-edit-message">
            <span class="jh-btn-icon">✏️</span> Edit Message
          </button>
        ` : `
          <div class="jh-outreach-sent-notice">
            ✓ Marked as sent on ${data.sentDate}
          </div>
        `}
      </div>

      <!-- Optional: Best Man Summary section (placeholder) -->
      <div class="jh-outreach-summary-section" id="jh-summary-section" style="display: none;">
        <div class="jh-outreach-summary-header">
          <label>Best Man Summary</label>
        </div>
        <div class="jh-outreach-summary" id="jh-outreach-summary">
          <!-- Will be populated if available -->
        </div>
      </div>
    </div>
  `;

  // Add styles
  if (!document.getElementById('jh-outreach-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'jh-outreach-styles';
    styleEl.textContent = getOutreachStyles();
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(container);

  // Set up event listeners
  setupOutreachEventListeners(data);

  console.log('[Outreach Mode] UI displayed');
}

/**
 * Set up event listeners for Outreach UI
 * @param {Object} data - Outreach data
 */
function setupOutreachEventListeners(data) {
  // Close button
  const closeBtn = document.getElementById('jh-outreach-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      removeOutreachUI();
      // Optionally remove the outreachID parameter from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('outreachID');
      window.history.replaceState({}, '', url.toString());
    });
  }

  // Copy button
  const copyBtn = document.getElementById('jh-outreach-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(data.outreachMessage);
        copyBtn.innerHTML = '<span class="jh-copy-icon">✓</span> Copied!';
        copyBtn.classList.add('jh-copied');

        setTimeout(() => {
          copyBtn.innerHTML = '<span class="jh-copy-icon">📋</span> Copy';
          copyBtn.classList.remove('jh-copied');
        }, 2000);
      } catch (error) {
        console.error('[Outreach Mode] Copy failed:', error);
        // Fallback: select text
        const messageEl = document.getElementById('jh-outreach-message');
        if (messageEl) {
          const range = document.createRange();
          range.selectNodeContents(messageEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    });
  }

  // Mark as Sent button
  const markSentBtn = document.getElementById('jh-mark-as-sent');
  if (markSentBtn) {
    markSentBtn.addEventListener('click', async () => {
      await handleMarkAsSent(data, markSentBtn);
    });
  }

  // Edit Message button (placeholder - could open Airtable record)
  const editBtn = document.getElementById('jh-edit-message');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      // Open Airtable record in new tab
      const baseId = localStorage.getItem('jh_airtable_base_id');
      if (baseId && data.recordId) {
        const airtableUrl = `https://airtable.com/${baseId}/Outreach%20Log/${data.recordId}`;
        window.open(airtableUrl, '_blank');
      } else {
        alert('Unable to open Airtable. Please check your settings.');
      }
    });
  }
}

/**
 * Handle "Mark as Sent" button click
 * @param {Object} data - Outreach data
 * @param {HTMLElement} button - The button element
 */
async function handleMarkAsSent(data, button) {
  if (!data.recordId) {
    alert('Error: No outreach record ID');
    return;
  }

  // Disable button and show loading state
  button.disabled = true;
  button.innerHTML = '<span class="jh-btn-spinner">⏳</span> Marking as sent...';

  try {
    // Send update request to background script
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'jobHunter.markOutreachSent',
          recordId: data.recordId,
          contactRecordId: data.contactRecordId
        },
        (resp) => {
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            reject(new Error(lastErr.message));
            return;
          }
          resolve(resp);
        }
      );
    });

    if (!response || !response.success) {
      throw new Error(response?.error || 'Failed to mark as sent');
    }

    console.log('[Outreach Mode] Marked as sent');

    // Update UI to show success
    button.innerHTML = '<span class="jh-btn-icon">✓</span> Sent!';
    button.classList.add('jh-btn-success');

    // Update status badge
    const statusEl = document.querySelector('.jh-outreach-status');
    if (statusEl) {
      statusEl.textContent = 'Sent';
      statusEl.className = 'jh-outreach-status jh-status-sent';
    }

    // Update local data
    data.outreachStatus = 'Sent';
    data.sentDate = new Date().toISOString().split('T')[0];

    // Replace actions section after a delay
    setTimeout(() => {
      const actionsSection = document.querySelector('.jh-outreach-actions');
      if (actionsSection) {
        actionsSection.innerHTML = `
          <div class="jh-outreach-sent-notice">
            ✓ Marked as sent on ${data.sentDate}
          </div>
        `;
      }
    }, 1500);

  } catch (error) {
    console.error('[Outreach Mode] Error marking as sent:', error);
    button.innerHTML = '<span class="jh-btn-icon">✗</span> Error - Try Again';
    button.classList.add('jh-btn-error');
    button.disabled = false;

    setTimeout(() => {
      button.innerHTML = '<span class="jh-btn-icon">✓</span> Mark as Sent';
      button.classList.remove('jh-btn-error');
    }, 3000);
  }
}

/**
 * Show loading state while fetching outreach data
 */
function showOutreachLoadingState() {
  const container = document.createElement('div');
  container.id = 'jh-outreach-panel';
  container.className = 'jh-outreach-panel';
  container.innerHTML = `
    <div class="jh-outreach-container jh-loading">
      <div class="jh-outreach-spinner">⏳</div>
      <p>Loading outreach details...</p>
    </div>
  `;

  if (!document.getElementById('jh-outreach-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'jh-outreach-styles';
    styleEl.textContent = getOutreachStyles();
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(container);
}

/**
 * Show error state
 * @param {string} message - Error message
 */
function showOutreachError(message) {
  const container = document.getElementById('jh-outreach-panel');
  if (!container) return;

  container.innerHTML = `
    <div class="jh-outreach-container jh-error">
      <div class="jh-outreach-error-icon">⚠️</div>
      <p class="jh-outreach-error-message">Error: ${escapeHtml(message)}</p>
      <button class="jh-outreach-btn-secondary" onclick="location.reload()">Refresh Page</button>
    </div>
  `;
}

/**
 * Remove Outreach UI from page
 */
function removeOutreachUI() {
  const panel = document.getElementById('jh-outreach-panel');
  if (panel) {
    panel.remove();
  }
  outreachModeActive = false;
  currentOutreachData = null;
}

/**
 * Get CSS class for outreach status
 * @param {string} status - Outreach status
 * @returns {string} CSS class name
 */
function getStatusClass(status) {
  const statusMap = {
    'Draft': 'jh-status-draft',
    'Ready': 'jh-status-ready',
    'Sent': 'jh-status-sent',
    'Responded': 'jh-status-responded'
  };
  return statusMap[status] || 'jh-status-draft';
}

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

/**
 * Get CSS styles for Outreach Mode UI
 * @returns {string} CSS string
 */
function getOutreachStyles() {
  return `
    .jh-outreach-panel {
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 999998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }

    .jh-outreach-container {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06);
      width: 420px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 120px);
      overflow-y: auto;
    }

    .jh-outreach-container.jh-loading,
    .jh-outreach-container.jh-error {
      padding: 40px;
      text-align: center;
    }

    .jh-outreach-spinner {
      font-size: 32px;
      margin-bottom: 12px;
    }

    .jh-outreach-error-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .jh-outreach-error-message {
      color: #d9480f;
      margin: 0 0 20px 0;
    }

    .jh-outreach-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px 12px 0 0;
    }

    .jh-outreach-icon {
      font-size: 32px;
      flex-shrink: 0;
    }

    .jh-outreach-title {
      flex: 1;
      min-width: 0;
    }

    .jh-outreach-title h2 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1a1a2e;
    }

    .jh-outreach-status {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 10px;
    }

    .jh-status-draft {
      background: #e9ecef;
      color: #495057;
    }

    .jh-status-ready {
      background: #fff3bf;
      color: #e67700;
    }

    .jh-status-sent {
      background: #d3f9d8;
      color: #2b8a3e;
    }

    .jh-status-responded {
      background: #d0ebff;
      color: #1971c2;
    }

    .jh-outreach-close {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(0,0,0,0.05);
      border-radius: 8px;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      color: #495057;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jh-outreach-close:hover {
      background: rgba(0,0,0,0.1);
    }

    .jh-outreach-contact {
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
    }

    .jh-outreach-contact-name {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 6px;
    }

    .jh-outreach-contact-title {
      font-size: 14px;
      color: #495057;
      margin-bottom: 4px;
    }

    .jh-outreach-contact-company {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 8px;
    }

    .jh-outreach-contact-email {
      font-size: 13px;
      color: #4361ee;
      margin-bottom: 4px;
    }

    .jh-outreach-last-contact {
      font-size: 12px;
      color: #868e96;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px dashed #dee2e6;
    }

    .jh-outreach-message-section {
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
    }

    .jh-outreach-message-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .jh-outreach-message-header label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #495057;
    }

    .jh-outreach-copy-btn {
      padding: 6px 12px;
      font-size: 12px;
      border: 1px solid #dee2e6;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
      color: #495057;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s ease;
    }

    .jh-outreach-copy-btn:hover {
      background: #f8f9fa;
      border-color: #adb5bd;
    }

    .jh-outreach-copy-btn.jh-copied {
      background: #d3f9d8;
      border-color: #8ce99a;
      color: #2b8a3e;
    }

    .jh-copy-icon {
      font-size: 14px;
    }

    .jh-outreach-message {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a2e;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .jh-outreach-actions {
      padding: 20px;
      display: flex;
      gap: 10px;
    }

    .jh-outreach-btn-primary,
    .jh-outreach-btn-secondary {
      flex: 1;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .jh-outreach-btn-primary {
      background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
      color: #fff;
    }

    .jh-outreach-btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #3a56d4 0%, #324bc0 100%);
      box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
    }

    .jh-outreach-btn-primary:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .jh-outreach-btn-primary.jh-btn-success {
      background: linear-gradient(135deg, #2b8a3e 0%, #228b22 100%);
    }

    .jh-outreach-btn-primary.jh-btn-error {
      background: linear-gradient(135deg, #c92a2a 0%, #a61e1e 100%);
    }

    .jh-outreach-btn-secondary {
      background: #e9ecef;
      color: #495057;
    }

    .jh-outreach-btn-secondary:hover {
      background: #dee2e6;
    }

    .jh-btn-icon,
    .jh-btn-spinner {
      font-size: 16px;
    }

    .jh-outreach-sent-notice {
      width: 100%;
      text-align: center;
      padding: 12px;
      background: #d3f9d8;
      color: #2b8a3e;
      border-radius: 8px;
      font-weight: 500;
    }

    .jh-outreach-summary-section {
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }

    .jh-outreach-summary-header label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #495057;
      margin-bottom: 12px;
      display: block;
    }

    .jh-outreach-summary {
      font-size: 13px;
      line-height: 1.6;
      color: #495057;
    }
  `;
}

// Export functions for use in content.js
if (typeof window !== 'undefined') {
  window.JobHunterOutreach = {
    init: initOutreachMode,
    isActive: () => outreachModeActive,
    remove: removeOutreachUI
  };
}
