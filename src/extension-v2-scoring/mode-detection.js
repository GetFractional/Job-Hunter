/**
 * Job Hunter OS - Mode Detection & SPA Navigation Handler
 *
 * Handles robust mode switching between Jobs Mode and Outreach Mode.
 * LinkedIn uses SPA (Single Page Application) architecture, so we need to
 * listen for URL changes via multiple mechanisms.
 *
 * MODES:
 * - jobs: Activates on /jobs/* pages - shows job scoring sidebar
 * - outreach: Activates on /in/* pages - shows contact/outreach sidebar
 * - null: Any other page - hides sidebar
 */

// ============================================================================
// STATE
// ============================================================================

let currentMode = null;
let lastUrl = location.href;
let isInitialized = false;
let observers = [];

// ============================================================================
// MODE DETECTION
// ============================================================================

/**
 * Detect the current mode based on URL
 * @returns {string|null} 'jobs' | 'outreach' | null
 */
function detectMode() {
  const url = location.href;

  // Jobs Mode: LinkedIn job pages
  if (url.includes('linkedin.com/jobs/')) {
    return 'jobs';
  }

  // Outreach Mode: LinkedIn profile pages
  if (url.match(/linkedin\.com\/in\/[^\/]+/)) {
    return 'outreach';
  }

  // Indeed job pages (Jobs Mode)
  if (url.includes('indeed.com') && (url.includes('/viewjob') || url.includes('vjk='))) {
    return 'jobs';
  }

  return null;
}

/**
 * Handle mode change
 * Calls teardown for previous mode, setup for new mode
 */
function handleModeChange() {
  const url = location.href;

  // Skip if URL hasn't changed
  if (url === lastUrl && isInitialized) {
    return;
  }

  lastUrl = url;
  const newMode = detectMode();

  // Skip if mode hasn't changed
  if (newMode === currentMode && isInitialized) {
    return;
  }

  console.log('[Job Hunter Mode] Detected change:', currentMode, '->', newMode, 'URL:', url);

  // Teardown previous mode
  if (currentMode) {
    teardownMode(currentMode);
  }

  // Setup new mode
  currentMode = newMode;
  if (newMode) {
    // Small delay to let LinkedIn's DOM settle
    setTimeout(() => {
      setupMode(newMode);
    }, 500);
  }

  isInitialized = true;
}

/**
 * Teardown mode - cleanup UI elements
 * @param {string} mode - Mode to teardown
 */
function teardownMode(mode) {
  console.log('[Job Hunter Mode] Teardown:', mode);

  // Remove sidebar
  if (window.JobHunterSidebar) {
    window.JobHunterSidebar.remove();
  }

  // Legacy: Remove floating panel if exists
  const floatingPanel = document.getElementById('jh-floating-panel');
  if (floatingPanel) {
    floatingPanel.remove();
  }

  // Remove any modal overlays
  const modals = document.querySelectorAll('.jh-modal-overlay, .jh-criterion-modal-overlay');
  modals.forEach(m => m.remove());
}

/**
 * Setup mode - initialize UI for mode
 * @param {string} mode - Mode to setup
 */
function setupMode(mode) {
  console.log('[Job Hunter Mode] Setup:', mode);

  if (mode === 'jobs') {
    setupJobsMode();
  } else if (mode === 'outreach') {
    setupOutreachMode();
  }
}

/**
 * Setup Jobs Mode
 * Creates sidebar and triggers job scoring
 */
function setupJobsMode() {
  // Check if we have profile setup first
  checkProfileAndProceed(() => {
    // Create sidebar in jobs mode
    if (window.JobHunterSidebar) {
      window.JobHunterSidebar.create('jobs');
    }

    // Trigger job extraction and scoring
    if (window.triggerJobScoring) {
      window.triggerJobScoring();
    }

    // Set up mutation observer to detect job changes within the page
    observeJobChanges();
  });
}

/**
 * Setup Outreach Mode
 * Creates sidebar and extracts contact data
 */
function setupOutreachMode() {
  // Create sidebar in outreach mode
  if (window.JobHunterSidebar) {
    window.JobHunterSidebar.create('outreach');
  }

  // Extract contact data from profile page
  const contactData = extractContactData();
  if (contactData && window.JobHunterSidebar) {
    window.JobHunterSidebar.updateContact(contactData);
  }

  // Set up observer for profile page changes (LinkedIn lazy loads some sections)
  observeProfileChanges();
}

/**
 * Check if user has profile set up, prompt if not
 */
function checkProfileAndProceed(callback) {
  chrome.runtime.sendMessage({ action: 'jobHunter.checkProfile' }, (response) => {
    if (response && response.hasProfile) {
      callback();
    } else {
      console.log('[Job Hunter Mode] No profile found, prompting setup');
      if (window.showProfileSetupPrompt) {
        window.showProfileSetupPrompt();
      } else {
        // Proceed anyway, scoring will use defaults
        callback();
      }
    }
  });
}

// ============================================================================
// CONTACT DATA EXTRACTION (for Outreach Mode)
// ============================================================================

/**
 * Extract contact data from LinkedIn profile page
 * @returns {Object} Contact data
 */
function extractContactData() {
  const url = window.location.href;

  // Full Name
  const fullNameEl = document.querySelector('h1.text-heading-xlarge');
  const fullName = fullNameEl?.textContent?.trim() || '';
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Role / Title (headline)
  const roleEl = document.querySelector('div.text-body-medium.break-words');
  const roleTitle = roleEl?.textContent?.trim() || '';

  // Location
  const locationEl = document.querySelector('span.text-body-small.inline.t-black--light.break-words');
  const location = locationEl?.textContent?.trim() || '';

  // Company Name - try multiple selectors
  let companyName = '';

  // Try: Current position in experience section
  const experienceSection = document.querySelector('section[data-section="experience"]');
  if (experienceSection) {
    const firstExperience = experienceSection.querySelector('li.artdeco-list__item');
    if (firstExperience) {
      const companyEl = firstExperience.querySelector('.t-14.t-normal:not(.t-black--light)');
      companyName = companyEl?.textContent?.trim().split('·')[0]?.trim() || '';
    }
  }

  // Fallback: Try headline parsing (often "Title at Company")
  if (!companyName && roleTitle.includes(' at ')) {
    companyName = roleTitle.split(' at ').pop()?.trim() || '';
  }

  // LinkedIn URL (cleaned)
  const linkedinUrl = url.split('?')[0]; // Remove query params

  // Email (requires contact info modal to be open - usually not available)
  let email = '';
  const emailLink = document.querySelector('a[href^="mailto:"]');
  if (emailLink) {
    email = emailLink.href.replace('mailto:', '');
  }

  // Phone (requires contact info modal - usually not available)
  let phone = '';
  const phoneSection = document.querySelector('section.pv-contact-info__contact-type');
  if (phoneSection) {
    const phoneEl = phoneSection.querySelector('span.t-14.t-black');
    phone = phoneEl?.textContent?.trim() || '';
  }

  console.log('[Job Hunter Mode] Extracted contact:', { fullName, companyName, location });

  return {
    firstName,
    lastName,
    fullName,
    roleTitle,
    companyName,
    location,
    linkedinUrl,
    email,
    phone
  };
}

// ============================================================================
// MUTATION OBSERVERS
// ============================================================================

/**
 * Observe job page changes (when user clicks different job in list)
 */
function observeJobChanges() {
  // Disconnect existing observer
  disconnectObservers();

  // LinkedIn job pages: Watch for job details panel changes
  const jobDetailsContainer = document.querySelector('.jobs-search__job-details') ||
                              document.querySelector('.job-view-layout') ||
                              document.querySelector('main');

  if (!jobDetailsContainer) {
    console.log('[Job Hunter Mode] Job details container not found, will retry');
    setTimeout(observeJobChanges, 1000);
    return;
  }

  const observer = new MutationObserver((mutations) => {
    // Check if the URL changed (job ID changed)
    if (location.href !== lastUrl) {
      handleModeChange();
    }
  });

  observer.observe(jobDetailsContainer, {
    childList: true,
    subtree: true
  });

  observers.push(observer);
  console.log('[Job Hunter Mode] Job observer attached');
}

/**
 * Observe profile page changes (for lazy-loaded content)
 */
function observeProfileChanges() {
  // Disconnect existing observer
  disconnectObservers();

  const profileMain = document.querySelector('main');
  if (!profileMain) return;

  const observer = new MutationObserver((mutations) => {
    // Re-extract contact data if significant changes
    let shouldUpdate = false;
    mutations.forEach(m => {
      if (m.type === 'childList' && m.addedNodes.length > 0) {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1 && (
            node.classList?.contains('pv-top-card') ||
            node.querySelector?.('.pv-top-card')
          )) {
            shouldUpdate = true;
          }
        });
      }
    });

    if (shouldUpdate) {
      const contactData = extractContactData();
      if (contactData && window.JobHunterSidebar) {
        window.JobHunterSidebar.updateContact(contactData);
      }
    }
  });

  observer.observe(profileMain, {
    childList: true,
    subtree: true
  });

  observers.push(observer);
  console.log('[Job Hunter Mode] Profile observer attached');
}

/**
 * Disconnect all observers
 */
function disconnectObservers() {
  observers.forEach(obs => obs.disconnect());
  observers = [];
}

// ============================================================================
// SPA NAVIGATION HANDLERS
// ============================================================================

/**
 * Initialize SPA navigation listeners
 */
function initNavigationListeners() {
  // Listen for popstate (browser back/forward)
  window.addEventListener('popstate', handleModeChange);

  // Intercept pushState
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    handleModeChange();
  };

  // Intercept replaceState
  const originalReplaceState = history.replaceState;
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    handleModeChange();
  };

  // Fallback: Poll for URL changes (some edge cases)
  setInterval(() => {
    if (location.href !== lastUrl) {
      handleModeChange();
    }
  }, 1000);

  console.log('[Job Hunter Mode] Navigation listeners initialized');
}

/**
 * Initialize mode detection system
 */
function initModeDetection() {
  console.log('[Job Hunter Mode] Initializing...');

  // Set up navigation listeners
  initNavigationListeners();

  // Initial mode detection
  handleModeChange();
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.JobHunterModeDetection = {
    init: initModeDetection,
    getCurrentMode: () => currentMode,
    forceRefresh: handleModeChange,
    extractContactData: extractContactData
  };
}

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initModeDetection);
} else {
  initModeDetection();
}
