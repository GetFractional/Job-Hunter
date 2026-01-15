/**
 * Job Filter - Popup Script
 *
 * Handles the settings popup UI:
 * - Tab navigation between Airtable and Profile settings
 * - Load/save Airtable credentials from Chrome local storage
 * - Test connection to Airtable API
 * - Display and manage user profile status
 * - Display success/error feedback to user
 */

// Storage keys for Airtable credentials and user profile
const STORAGE_KEYS = {
  BASE_ID: 'jh_airtable_base_id',
  PAT: 'jh_airtable_pat',
  PROFILE: 'jh_user_profile'
};

// DOM element references (populated on DOMContentLoaded)
let elements = {};

/**
 * Initialize the popup when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM element references
  elements = {
    // Airtable tab elements
    form: document.getElementById('settings-form'),
    baseIdInput: document.getElementById('base-id'),
    apiTokenInput: document.getElementById('api-token'),
    statusMessage: document.getElementById('status-message'),
    saveBtn: document.getElementById('save-btn'),
    testBtn: document.getElementById('test-btn'),
    // Tab elements
    tabs: document.querySelectorAll('.popup-tab'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    // Profile tab elements
    profileStatusText: document.getElementById('profile-status-text'),
    profileDetails: document.getElementById('profile-details'),
    profileSalary: document.getElementById('profile-salary'),
    profileWorkplace: document.getElementById('profile-workplace'),
    profileSkills: document.getElementById('profile-skills'),
    profileUpdated: document.getElementById('profile-updated'),
    setupProfileBtn: document.getElementById('setup-profile-btn'),
    editProfileBtn: document.getElementById('edit-profile-btn')
  };

  // Set up tab navigation
  setupTabNavigation();

  // Load saved settings from storage
  loadSettings();

  // Load profile status
  loadProfileStatus();

  // Attach event listeners
  elements.form.addEventListener('submit', handleSave);
  elements.testBtn.addEventListener('click', handleTestConnection);

  // Profile button handlers
  if (elements.setupProfileBtn) {
    elements.setupProfileBtn.addEventListener('click', openProfileSetup);
  }
  if (elements.editProfileBtn) {
    elements.editProfileBtn.addEventListener('click', openProfileSetup);
  }
});

// ============================================================================
// TAB NAVIGATION
// ============================================================================

/**
 * Set up tab navigation click handlers
 */
function setupTabNavigation() {
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      switchTab(targetTab);
    });
  });
}

/**
 * Switch to a specific tab
 * @param {string} tabId - The tab ID to switch to
 */
function switchTab(tabId) {
  // Update tab buttons
  elements.tabs.forEach(tab => {
    if (tab.dataset.tab === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update tab panels
  elements.tabPanels.forEach(panel => {
    if (panel.id === `tab-${tabId}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
}

// ============================================================================
// PROFILE MANAGEMENT
// ============================================================================

/**
 * Load and display profile status
 */
async function loadProfileStatus() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.PROFILE]);
    const profile = result[STORAGE_KEYS.PROFILE];

    if (profile && profile.preferences) {
      // Profile exists - show details
      elements.profileStatusText.textContent = 'Configured';
      elements.profileStatusText.style.color = '#2b8a3e';

      // Show details section
      elements.profileDetails.classList.remove('hidden');

      // Populate profile details
      const floor = profile.preferences.salary_floor || 0;
      const target = profile.preferences.salary_target || 0;
      elements.profileSalary.textContent = `$${formatNumber(floor)} - $${formatNumber(target)}`;

      const workplace = profile.preferences.remote_requirement || 'Not set';
      elements.profileWorkplace.textContent = formatWorkplaceType(workplace);

      const skills = profile.background?.core_skills || [];
      elements.profileSkills.textContent = skills.length > 0
        ? `${skills.length} skills configured`
        : 'No skills set';

      if (profile.last_updated) {
        const date = new Date(profile.last_updated);
        elements.profileUpdated.textContent = date.toLocaleDateString();
      } else {
        elements.profileUpdated.textContent = 'Unknown';
      }

      // Show Edit button, hide Setup button
      elements.setupProfileBtn.classList.add('hidden');
      elements.editProfileBtn.classList.remove('hidden');

    } else {
      // No profile - show setup prompt
      elements.profileStatusText.textContent = 'Not configured';
      elements.profileStatusText.style.color = '#e67700';

      // Hide details, show setup button
      elements.profileDetails.classList.add('hidden');
      elements.setupProfileBtn.classList.remove('hidden');
      elements.editProfileBtn.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error loading profile status:', error);
    elements.profileStatusText.textContent = 'Error loading';
    elements.profileStatusText.style.color = '#c92a2a';
  }
}

/**
 * Open the profile setup page
 */
function openProfileSetup() {
  const profileUrl = chrome.runtime.getURL('profile-setup.html');
  chrome.tabs.create({ url: profileUrl });
}

/**
 * Format a number with commas (e.g., 150000 -> "150,000")
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format workplace type for display
 * @param {string} type - Raw workplace type
 * @returns {string} Formatted type
 */
function formatWorkplaceType(type) {
  const formats = {
    'remote_only': 'Remote Only',
    'remote_first': 'Remote First',
    'flexible': 'Flexible',
    'hybrid': 'Hybrid',
    'on_site': 'On-site'
  };
  return formats[type] || type;
}

/**
 * Load saved credentials from Chrome local storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.BASE_ID,
      STORAGE_KEYS.PAT
    ]);

    // Populate input fields with saved values (if any)
    if (result[STORAGE_KEYS.BASE_ID]) {
      elements.baseIdInput.value = result[STORAGE_KEYS.BASE_ID];
    }
    if (result[STORAGE_KEYS.PAT]) {
      elements.apiTokenInput.value = result[STORAGE_KEYS.PAT];
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Failed to load saved settings', 'error');
  }
}

/**
 * Save credentials to Chrome local storage
 * @param {Event} event - Form submit event
 */
async function handleSave(event) {
  event.preventDefault();

  const baseId = elements.baseIdInput.value.trim();
  const apiToken = elements.apiTokenInput.value.trim();

  // Basic validation
  if (!baseId) {
    showStatus('Please enter your Airtable Base ID', 'error');
    elements.baseIdInput.focus();
    return;
  }

  if (!apiToken) {
    showStatus('Please enter your Airtable Personal Access Token', 'error');
    elements.apiTokenInput.focus();
    return;
  }

  // Validate Base ID format (should start with "app")
  if (!baseId.startsWith('app')) {
    showStatus('Base ID should start with "app"', 'error');
    elements.baseIdInput.focus();
    return;
  }

  // Validate PAT format (should start with "pat")
  if (!apiToken.startsWith('pat')) {
    showStatus('Personal Access Token should start with "pat"', 'error');
    elements.apiTokenInput.focus();
    return;
  }

  // Disable button and show loading state
  setButtonLoading(elements.saveBtn, true);

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.BASE_ID]: baseId,
      [STORAGE_KEYS.PAT]: apiToken
    });

    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Failed to save settings', 'error');
  } finally {
    setButtonLoading(elements.saveBtn, false);
  }
}

/**
 * Test connection to Airtable API using saved credentials
 */
async function handleTestConnection() {
  const baseId = elements.baseIdInput.value.trim();
  const apiToken = elements.apiTokenInput.value.trim();

  // Validate inputs are present
  if (!baseId || !apiToken) {
    showStatus('Please enter both Base ID and API Token first', 'error');
    return;
  }

  // Disable button and show loading state
  setButtonLoading(elements.testBtn, true);
  showStatus('Testing connection...', 'info');

  try {
    // Make a GET request to list records from Jobs Pipeline table
    // This validates both the Base ID and API Token are correct
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Jobs%20Pipeline?maxRecords=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      showStatus('Connection successful! Your credentials are valid.', 'success');
    } else if (response.status === 401) {
      showStatus('Invalid API Token. Please check your Personal Access Token.', 'error');
    } else if (response.status === 404) {
      showStatus('Base or table not found. Check Base ID and ensure "Jobs Pipeline" table exists.', 'error');
    } else if (response.status === 403) {
      showStatus('Access denied. Ensure your token has read/write permissions.', 'error');
    } else {
      const errorData = await response.json().catch(() => ({}));
      showStatus(
        `Connection failed: ${errorData.error?.message || response.statusText}`,
        'error'
      );
    }
  } catch (error) {
    console.error('Connection test error:', error);
    // Handle network errors (no internet, CORS issues, etc.)
    showStatus('Network error. Please check your internet connection.', 'error');
  } finally {
    setButtonLoading(elements.testBtn, false);
  }
}

/**
 * Display a status message to the user
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'success', 'error', or 'info'
 */
function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
}

/**
 * Toggle loading state on a button
 * @param {HTMLButtonElement} button - Button element to modify
 * @param {boolean} isLoading - Whether to show loading state
 */
function setButtonLoading(button, isLoading) {
  button.disabled = isLoading;
  if (isLoading) {
    button.classList.add('loading');
  } else {
    button.classList.remove('loading');
  }
}
