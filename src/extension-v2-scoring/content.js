/**
 * Job Hunter OS - Content Script
 *
 * Runs on LinkedIn and Indeed job detail pages to:
 * - Detect when user is viewing a job posting
 * - Extract job data from the page DOM
 * - Inject "Send to Job Hunter" and "Score This Job" overlay buttons
 * - Calculate job fit scores using the scoring engine
 * - Display results in a modal overlay
 * - Send extracted data to background script for Airtable submission
 */

// Storage key for user profile (must match profile-setup.js)
const PROFILE_STORAGE_KEY = 'jh_user_profile';

// Auto-scoring state (declared at top to avoid hoisting issues)
let autoScoreDebounceTimer = null;
let lastScoredUrl = '';

/**
 * Check if extension context is still valid
 * Returns false if extension was reloaded/updated
 */
function isExtensionContextValid() {
  try {
    // Try to access chrome.runtime - will throw if context invalidated
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    console.warn('[Job Hunter] Extension context invalidated - extension was likely reloaded');
    return false;
  }
}

/**
 * Show user-friendly message when extension context is invalidated
 */
function handleInvalidContext() {
  console.log('[Job Hunter] Extension was reloaded. Please refresh this page to re-enable Job Hunter.');
  // Optional: Show a subtle notification to the user
  if (typeof window.JobHunterFloatingPanel !== 'undefined') {
    try {
      window.JobHunterFloatingPanel.remove();
    } catch (e) {
      // Ignore errors during cleanup
    }
  }
}

// Prevent multiple injections
if (window.jobHunterInjected) {
  console.log('[Job Hunter] Already injected, skipping');
} else {
  window.jobHunterInjected = true;
  initJobHunter();
  // Initialize Outreach Mode if on LinkedIn profile with outreachID parameter
  if (typeof window.JobHunterOutreach !== 'undefined') {
    window.JobHunterOutreach.init();
  }
}

/**
 * Main initialization function
 */
function initJobHunter() {
  console.log('[Job Hunter] Content script loaded');

  // Determine which site we're on
  const hostname = window.location.hostname;

  if (hostname.includes('linkedin.com')) {
    handleLinkedIn();
  } else if (hostname.includes('indeed.com')) {
    handleIndeed();
  }
}

// ============================================================================
// LINKEDIN HANDLER
// ============================================================================

/**
 * Safely initialize a MutationObserver with defensive error handling
 * Prevents "Failed to execute 'observe' on 'MutationObserver'" errors
 * @param {Element|null} targetElement - The element to observe
 * @param {Function} callback - MutationObserver callback
 * @param {Object} config - Observer configuration
 * @param {string} label - Label for logging
 * @returns {MutationObserver|null} The observer or null if failed
 */
function safeInitMutationObserver(targetElement, callback, config, label = 'unnamed') {
  try {
    // Validate target exists
    if (!targetElement) {
      console.log(`[Job Hunter] MutationObserver target not found for ${label}`);
      return null;
    }

    // Validate target is a valid Node (not a disconnected element or iframe content)
    if (!(targetElement instanceof Node)) {
      console.log(`[Job Hunter] MutationObserver target is not a valid Node for ${label}:`, typeof targetElement);
      return null;
    }

    // Check if the node is connected to the document
    if (!targetElement.isConnected) {
      console.log(`[Job Hunter] MutationObserver target is not connected to document for ${label}`);
      return null;
    }

    // Additional check: ensure it's not inside an iframe
    if (targetElement.ownerDocument !== document) {
      console.log(`[Job Hunter] MutationObserver target is in different document (possibly iframe) for ${label}`);
      return null;
    }

    const observer = new MutationObserver(callback);
    observer.observe(targetElement, config);
    console.log(`[Job Hunter] MutationObserver initialized successfully for ${label}`);
    return observer;
  } catch (error) {
    console.error(`[Job Hunter] Failed to initialize MutationObserver for ${label}:`, error.message);
    return null;
  }
}

/**
 * Initialize LinkedIn job page handling
 */
function handleLinkedIn() {
  // LinkedIn uses client-side routing, so we need to watch for URL changes
  let lastUrl = location.href;
  let lastJobId = extractLinkedInJobId(location.href);
  let contentChangeDebounce = null;

  // Check immediately if we're on a job page
  if (isLinkedInJobPage()) {
    injectOverlay('LinkedIn');
  }

  // Watch for URL changes (LinkedIn is a SPA)
  const urlCallback = () => {
    const currentUrl = location.href;
    const currentJobId = extractLinkedInJobId(currentUrl);

    if (currentUrl !== lastUrl || currentJobId !== lastJobId) {
      lastUrl = currentUrl;
      lastJobId = currentJobId;
      // Reset the scored URL so we re-score the new job
      lastScoredUrl = '';

      // Check if new page is a job page
      if (isLinkedInJobPage()) {
        // Small delay to let page content load
        setTimeout(() => {
          triggerAutoScore('LinkedIn');
        }, 500);
      }
    }
  };

  // Safely observe document.body with validation
  const urlObserver = safeInitMutationObserver(
    document.body,
    urlCallback,
    { childList: true, subtree: true },
    'URL observer'
  );

  // Watch for job card clicks - LinkedIn loads job details in-place
  document.addEventListener('click', (e) => {
    const jobCard = e.target.closest('.jobs-search-results__list-item, .job-card-container, .scaffold-layout__list-item, [data-job-id]');
    if (jobCard) {
      // Reset scored URL to force re-scoring
      lastScoredUrl = '';
      // Delay to let the job detail panel update and avoid LinkedIn 999 rate limiting
      // Increased from 800ms to 1200ms for more reliable DOM rendering
      setTimeout(() => {
        if (isLinkedInJobPage()) {
          triggerAutoScore('LinkedIn');
        }
      }, 1200);
    }
  });

  // Watch for changes in the job detail panel content
  const jobDetailSelectors = [
    '.jobs-details',
    '.job-details-jobs-unified-top-card',
    '.jobs-unified-top-card',
    '.jobs-description'
  ];

  // Track if we already have a detail observer attached
  let detailObserverActive = false;

  const setupDetailObserver = () => {
    // Don't set up multiple observers
    if (detailObserverActive) return;

    const detailContainer = document.querySelector(jobDetailSelectors.join(', '));

    // Use the safe observer initialization function
    const detailCallback = (mutations) => {
      // Check if meaningful content changed (not just minor DOM updates)
      const hasSignificantChange = mutations.some(m =>
        m.addedNodes.length > 0 ||
        m.removedNodes.length > 0 ||
        (m.type === 'characterData' && m.target.textContent?.length > 20)
      );

      if (hasSignificantChange) {
        // Debounce to avoid excessive re-scoring and LinkedIn 999 rate limiting
        // Increased from 600ms to 1000ms for better stability
        if (contentChangeDebounce) clearTimeout(contentChangeDebounce);
        contentChangeDebounce = setTimeout(() => {
          const currentJobId = extractLinkedInJobId(location.href);
          if (currentJobId && currentJobId !== lastJobId) {
            lastJobId = currentJobId;
            lastScoredUrl = '';
            triggerAutoScore('LinkedIn');
          }
        }, 1000);
      }
    };

    const detailObserver = safeInitMutationObserver(
      detailContainer,
      detailCallback,
      { childList: true, subtree: true, characterData: true },
      'Detail observer'
    );

    if (detailObserver) {
      detailObserverActive = true;
    }
  };

  // Try to set up detail observer after a delay
  setTimeout(setupDetailObserver, 1000);
  // Also retry when URL changes (but only if not already active)
  setInterval(() => {
    if (!detailObserverActive) {
      setupDetailObserver();
    }
  }, 3000);
}

/**
 * Extract LinkedIn job ID from URL
 * @param {string} url - The URL to parse
 * @returns {string|null} Job ID or null
 */
function extractLinkedInJobId(url) {
  // Match /jobs/view/123456/ pattern
  const viewMatch = url.match(/\/jobs\/view\/(\d+)/);
  if (viewMatch) return viewMatch[1];

  // Match currentJobId=123456 query param
  const urlObj = new URL(url);
  const currentJobId = urlObj.searchParams.get('currentJobId');
  if (currentJobId) return currentJobId;

  return null;
}

/**
 * Check if current LinkedIn page is a job detail page
 * @returns {boolean}
 */
function isLinkedInJobPage() {
  const url = window.location.href;
  // LinkedIn job URLs typically contain /jobs/view/ or /jobs/search/ with a currentJobId
  return url.includes('/jobs/view/') ||
         (url.includes('/jobs/') && url.includes('currentJobId='));
}

/**
 * Extract job data from LinkedIn job detail page
 * @returns {Object} Extracted job data
 */
function extractLinkedInJobData() {
  const data = {
    jobTitle: '',
    companyName: '',
    companyPageUrl: '',
    location: '',
    salaryMin: null,
    salaryMax: null,
    workplaceType: '',
    employmentType: '',
    equityMentioned: false,
    bonusMentioned: false,
    descriptionText: '',
    jobUrl: window.location.href,
    source: 'LinkedIn',
    // New extraction fields
    hiringManager: null,
    hiringManagerDetails: null, // { name, title }
    postedDate: null,
    applicantCount: null
  };

  try {
    // Job Title - try multiple possible selectors
    const titleSelectors = [
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '.t-24.t-bold.inline',
      'h1.topcard__title',
      '.jobs-details-top-card__job-title'
    ];
    data.jobTitle = getTextFromSelectors(titleSelectors) || '';

    // Company Name - try multiple possible selectors
    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.topcard__org-name-link',
      '.jobs-details-top-card__company-url',
      '.job-details-jobs-unified-top-card__primary-description-container a',
      '.jobs-unified-top-card__subtitle-1 .app-aware-link'
    ];
    data.companyName = getTextFromSelectors(companySelectors) || '';
    const companyLinkSelectors = [
      '.job-details-jobs-unified-top-card__company-name a[href*="/company/"]',
      '.jobs-unified-top-card__company-name a[href*="/company/"]',
      '.jobs-details-top-card__company-url a[href*="/company/"]',
      'a[href*="linkedin.com/company/"]'
    ];
    const companyLinkEl = document.querySelector(companyLinkSelectors.join(','));
    if (companyLinkEl?.href) {
      data.companyPageUrl = cleanCompanyUrl(companyLinkEl.href);
    }
    if (!data.companyName) {
      // Wider fallbacks: any company link in the top card area
      const topCard = document.querySelector('.job-details-jobs-unified-top-card, .jobs-unified-top-card, .job-details-jobs-unified-top-card__primary-description-container');
      const companyLink = topCard?.querySelector(
        'a[href*="/company/"], a[data-tracking-control-name*="org-name"], a[data-tracking-control-name*="company-name"]'
      );
      if (companyLink?.textContent?.trim()) {
        data.companyName = companyLink.textContent.trim();
        if (!data.companyPageUrl && companyLink.href) {
          data.companyPageUrl = cleanCompanyUrl(companyLink.href);
        }
      }
    }
    if (!data.companyName) {
      // Final fallback: scan all obvious company links (company URLs / app-aware links) and pick the first non-empty text/aria-label
      const linkCandidates = Array.from(document.querySelectorAll('a[href*="linkedin.com/company/"], a[href*="/company/"][data-test-app-aware-link]'));
      for (const link of linkCandidates) {
        const text = link.textContent?.trim();
        const aria = link.getAttribute('aria-label')?.replace(/ logo$/i, '').trim();
        if (text) {
          data.companyName = text;
          if (!data.companyPageUrl && link.href) {
            data.companyPageUrl = cleanCompanyUrl(link.href);
          }
          break;
        }
        if (!text && aria) {
          data.companyName = aria;
          if (!data.companyPageUrl && link.href) {
            data.companyPageUrl = cleanCompanyUrl(link.href);
          }
          break;
        }
      }
    }

    // Location - try multiple possible selectors
    const locationSelectors = [
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__workplace-type',
      '.topcard__flavor--bullet',
      '.jobs-details-top-card__bullet',
      '.jobs-unified-top-card__primary-description'
    ];
    data.location = getTextFromSelectors(locationSelectors) || '';

    // Salary - LinkedIn sometimes shows salary in insights section
    const salarySelectors = [
      '.job-details-jobs-unified-top-card__job-insight span',
      '.compensation__salary',
      '.salary-main-rail__data-item',
      '.job-details-fit-level-preferences button'
    ];
    const structuredSalaryText = getTextFromSelectors(salarySelectors) || '';

    // Job Description - the main description content
    const descriptionSelectors = [
      '.jobs-description__content',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '.description__text',
      '#job-details'
    ];
    data.descriptionText = getTextFromSelectors(descriptionSelectors, true) || '';

    // Multi-pass salary extraction with confidence levels
    const salaryResult = extractSalaryWithConfidence({
      structuredSalary: structuredSalaryText,
      descriptionText: data.descriptionText
    });
    data.salaryMin = salaryResult.min;
    data.salaryMax = salaryResult.max;
    data.salaryConfidence = salaryResult.confidence;
    data.salarySource = salaryResult.source;

    // Extract workplace type / job type / salary hints from preference buttons
    const preferenceButtons = Array.from(document.querySelectorAll('.job-details-fit-level-preferences button'));
    for (const btn of preferenceButtons) {
      const text = btn.innerText?.trim() || '';
      if (!text) continue;

      // Workplace type (Remote / Hybrid / On-site)
      if (/remote/i.test(text)) {
        data.workplaceType = 'Remote';
      } else if (/hybrid/i.test(text)) {
        data.workplaceType = 'Hybrid';
      } else if (/on[-\s]?site|onsite/i.test(text)) {
        data.workplaceType = 'On-site';
      }

      // Employment type (Full-time / Part-time / Contract)
      if (/full[-\s]?time/i.test(text)) {
        data.employmentType = 'Full-time';
      } else if (/part[-\s]?time/i.test(text)) {
        data.employmentType = 'Part-time';
      } else if (/contract/i.test(text)) {
        data.employmentType = 'Contract';
      } else if (/intern/i.test(text)) {
        data.employmentType = 'Internship';
      }

      // Salary from preference button (HIGH confidence - structured field)
      if (data.salaryConfidence !== SALARY_CONFIDENCE.HIGH) {
        const prefSalary = parseSalaryRange(text);
        if (prefSalary.min !== null && prefSalary.max !== null) {
          data.salaryMin = prefSalary.min;
          data.salaryMax = prefSalary.max;
          data.salaryConfidence = SALARY_CONFIDENCE.HIGH;
          data.salarySource = 'preference_button';
        }
      }
    }

    // If no location but we know workplace type, use that (e.g., Remote)
    if (!data.location && data.workplaceType) {
      data.location = data.workplaceType;
    }

    // Flag if equity is mentioned using contextual detection
    if (data.descriptionText) {
      data.equityMentioned = detectEquityWithContext(data.descriptionText);
    }

    // Flag if bonus is mentioned in the description using 15-word proximity rule
    if (data.descriptionText) {
      data.bonusMentioned = detectBonusWithProximityRule(data.descriptionText);
    }

    // Extract Hiring Manager with name and job title from "Meet the hiring team" section
    // CRITICAL: First scope to the right-hand job detail pane ONLY
    // This prevents pulling data from left-hand search results
    const jobDetailPaneSelectors = [
      '.jobs-search__job-details',  // Primary right-hand detail pane
      '.jobs-details',               // Fallback detail container
      '.job-details-jobs-unified-top-card',
      '.jobs-unified-top-card'
    ];

    let jobDetailPane = null;
    for (const selector of jobDetailPaneSelectors) {
      jobDetailPane = document.querySelector(selector);
      if (jobDetailPane) {
        console.log('[Job Hunter] ✓ Found job detail pane:', selector);
        break;
      }
    }

    // Now search for hiring team container within the job detail pane ONLY
    const hiringTeamContainerSelectors = [
      '.hirer-card__hirer-information',
      '.jobs-poster',
      '.hiring-team',
      '[data-test-hiring-team-card]',
      '.job-details-jobs-unified-top-card__hiring-team',
      '.jobs-hiring-team',
      '.job-details-hiring-team',
      '.hiring-insights',
      '[data-test-hiring-team]'
    ];

    let hiringTeamContainer = null;
    const searchScope = jobDetailPane || document; // Fallback to document if pane not found
    for (const selector of hiringTeamContainerSelectors) {
      hiringTeamContainer = searchScope.querySelector(selector);
      if (hiringTeamContainer) break;
    }

    // Hiring Manager Name selectors - expanded list with more robust patterns
    const hiringManagerNameSelectors = [
      // Primary selectors - LinkedIn's most common patterns
      '.hirer-card__hirer-information a',
      '.jobs-poster__name',
      '.jobs-poster__name a',
      '.jobs-poster a.app-aware-link',

      // Hiring team card patterns
      '.hiring-team__title a',
      '[data-test-hiring-team-card] a',
      '.job-details-jobs-unified-top-card__hiring-team-member-name',
      '.hiring-team-card-container__link',
      '.jobs-hiring-team__name a',
      '.hiring-team-member__name',
      '.hirer-info__name',
      'a[data-test-hiring-team-member-link]',

      // Additional fallback patterns
      '.jobs-poster-name',
      '.hiring-team-member a',
      '.job-poster__name',
      '[class*="hiring-team"] a[href*="/in/"]',
      '[class*="poster"] a[href*="/in/"]',
      '.artdeco-entity-lockup__title a',
      '.hirer-name',
      '.job-details-hiring-manager-name'
    ];

    // Hiring Manager Title selectors - expanded list with more robust patterns
    const hiringManagerTitleSelectors = [
      // Primary selectors - matching actual LinkedIn HTML structure
      '.hirer-card__hirer-information .linked-area .text-body-small',
      '.linked-area .text-body-small.t-black',
      '.hirer-card__hirer-information .t-14',
      '.jobs-poster__headline',
      '.jobs-poster .t-14',
      '.jobs-poster .t-12',

      // Hiring team card patterns
      '.hiring-team__subtitle',
      '.job-details-jobs-unified-top-card__hiring-team-member-subtitle',
      '.hiring-team-card-container__headline',
      '.jobs-hiring-team__subtitle',
      '.hiring-team-member__subtitle',
      '.hirer-info__subtitle',
      '[data-test-hiring-team-member-subtitle]',

      // Additional fallback patterns
      '.jobs-poster-subtitle',
      '.hiring-team-member .t-14',
      '.job-poster__headline',
      '.artdeco-entity-lockup__subtitle',
      '.hirer-subtitle',
      '.linked-area div',
      '[class*="hiring-team"] [class*="subtitle"]',
      '[class*="poster"] [class*="headline"]'
    ];

    let nameEl = null;
    let titleEl = null;

    // Try to find name and title within the container first
    if (hiringTeamContainer) {
      for (const selector of hiringManagerNameSelectors) {
        nameEl = hiringTeamContainer.querySelector(selector);
        if (nameEl && nameEl.textContent?.trim()) break;
      }

      for (const selector of hiringManagerTitleSelectors) {
        titleEl = hiringTeamContainer.querySelector(selector);
        if (titleEl && titleEl.textContent?.trim()) break;
      }
    }

    // Fallback: search within job detail pane scope (not entire document)
    if (!nameEl || !nameEl.textContent?.trim()) {
      for (const selector of hiringManagerNameSelectors) {
        nameEl = searchScope.querySelector(selector);
        if (nameEl && nameEl.textContent?.trim()) break;
      }
    }

    if (!titleEl || !titleEl.textContent?.trim()) {
      for (const selector of hiringManagerTitleSelectors) {
        titleEl = searchScope.querySelector(selector);
        if (titleEl && titleEl.textContent?.trim()) break;
      }
    }

    let hiringManagerName = nameEl?.textContent?.trim() || null;
    let hiringManagerTitle = titleEl?.textContent?.trim() || null;

    // CRITICAL: Validate that we extracted a person's name, not company info
    if (hiringManagerName) {
      const isValidPersonName = (name) => {
        if (!name) return false;

        // Reject if contains "followers" (company info)
        if (/followers?/i.test(name)) {
          console.log('[Job Hunter] ⚠ Rejected hiring manager name (contains "followers"):', name);
          return false;
        }

        // Reject if contains large numbers with commas (like "51,078" from follower counts)
        if (/\d{1,3}(?:,\d{3})+/.test(name)) {
          console.log('[Job Hunter] ⚠ Rejected hiring manager name (contains large numbers):', name);
          return false;
        }

        // Reject if contains K/M suffix (follower counts like "1.2M")
        if (/\d+(?:\.\d+)?[KM]\b/i.test(name)) {
          console.log('[Job Hunter] ⚠ Rejected hiring manager name (contains K/M suffix):', name);
          return false;
        }

        // Reject if too long (person names rarely exceed 50 chars)
        if (name.length > 50) {
          console.log('[Job Hunter] ⚠ Rejected hiring manager name (too long):', name);
          return false;
        }

        // Reject if contains "employees" (company headcount info)
        if (/employees?/i.test(name)) {
          console.log('[Job Hunter] ⚠ Rejected hiring manager name (contains "employees"):', name);
          return false;
        }

        return true;
      };

      if (!isValidPersonName(hiringManagerName)) {
        hiringManagerName = null;
        titleEl = null;
        hiringManagerTitle = null;
      }
    }

    // Clean up hiring manager title - remove connection degree text
    if (hiringManagerTitle) {
      hiringManagerTitle = cleanHiringManagerTitle(hiringManagerTitle);
    }

    // CRITICAL: Extract LinkedIn URL from hiring manager link element
    let hiringManagerLinkedInUrl = null;
    if (nameEl && nameEl.tagName === 'A' && nameEl.href) {
      // Clean the LinkedIn profile URL
      const linkedInUrlMatch = nameEl.href.match(/linkedin\.com\/in\/([^/?]+)/);
      if (linkedInUrlMatch) {
        hiringManagerLinkedInUrl = `https://www.linkedin.com/in/${linkedInUrlMatch[1]}/`;
        console.log('[Job Hunter] ✓ Hiring Manager LinkedIn URL extracted:', hiringManagerLinkedInUrl);
      }
    }

    // Store as structured object
    if (hiringManagerName) {
      data.hiringManager = hiringManagerTitle
        ? `${hiringManagerName}, ${hiringManagerTitle}`
        : hiringManagerName;
      data.hiringManagerDetails = {
        name: hiringManagerName,
        title: hiringManagerTitle
      };
      data.hiringManagerLinkedInUrl = hiringManagerLinkedInUrl; // NEW: Store LinkedIn URL
      console.log('[Job Hunter] ✓ Hiring Manager extracted:', data.hiringManager);
      console.log('[Job Hunter] Hiring Manager Details:', {
        name: hiringManagerName,
        title: hiringManagerTitle,
        linkedInUrl: hiringManagerLinkedInUrl,
        foundInContainer: !!hiringTeamContainer,
        nameSelector: nameEl?.className || 'unknown',
        titleSelector: titleEl?.className || 'unknown'
      });
    } else {
      console.log('[Job Hunter] ⚠ Hiring Manager not found on page');
      console.log('[Job Hunter] Debug info:', {
        hiringTeamContainerFound: !!hiringTeamContainer,
        hiringTeamContainerClass: hiringTeamContainer?.className || 'none',
        nameElementFound: !!nameEl,
        titleElementFound: !!titleEl,
        pageURL: window.location.href
      });
      // Try to help debug by logging any elements that might contain hiring manager info
      const possibleElements = document.querySelectorAll('[class*="hiring"], [class*="poster"], [class*="hirer"]');
      if (possibleElements.length > 0) {
        console.log('[Job Hunter] Possible hiring-related elements found:', possibleElements.length);
        possibleElements.forEach((el, idx) => {
          if (idx < 3) { // Log first 3 to avoid spam
            console.log(`  [${idx}] ${el.className}:`, el.textContent?.trim().substring(0, 100));
          }
        });
      }
    }

    // Extract Posted Date from job card metadata
    const postedSelectors = [
      '.job-details-jobs-unified-top-card__primary-description-container time',
      '.jobs-unified-top-card__posted-date',
      '.posted-time-ago__text',
      '.jobs-details-top-card__time-badge',
      '.job-details-jobs-unified-top-card__job-insight span'
    ];
    for (const selector of postedSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        // Match patterns like "Posted 2 days ago", "Reposted 1 week ago", "3 hours ago"
        const postedMatch = text.match(/(?:posted|reposted)?\s*(\d+)\s+(hour|day|week|month)s?\s+ago/i);
        if (postedMatch) {
          data.postedDate = text;
          break;
        }
      }
      if (data.postedDate) break;
    }

    // Extract Applicant Count (often Premium-only)
    const applicantSelectors = [
      '.jobs-unified-top-card__applicant-count',
      '.job-details-jobs-unified-top-card__job-insight span',
      '.jobs-details-top-card__bullet',
      '[data-test-job-applicant-count]'
    ];
    for (const selector of applicantSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        // Match patterns like "25 applicants", "Over 100 applicants", "Be among the first 25 applicants"
        const applicantMatch = text.match(/(?:over\s+)?(\d+)\s+applicants?|be\s+among\s+the\s+first\s+(\d+)/i);
        if (applicantMatch) {
          const count = applicantMatch[1] || applicantMatch[2];
          data.applicantCount = parseInt(count, 10);
          break;
        }
      }
      if (data.applicantCount) break;
    }

    // Clean up the job URL - remove unnecessary parameters
    data.jobUrl = cleanLinkedInUrl(window.location.href);

    // Extract Company Headcount, Growth, and Tenure Data
    const companyHeadcountData = extractCompanyHeadcountData();
    if (companyHeadcountData.currentHeadcount !== null) {
      data.companyHeadcount = companyHeadcountData.currentHeadcount;
      data.totalEmployees = companyHeadcountData.currentHeadcount; // Alias for Airtable
      console.log('[Job Hunter] ✓ Total Employees extracted:', companyHeadcountData.currentHeadcount);
    }
    if (companyHeadcountData.headcountGrowthRate !== null) {
      data.companyHeadcountGrowth = `${companyHeadcountData.headcountGrowthRate >= 0 ? '+' : ''}${companyHeadcountData.headcountGrowthRate}%`;
      console.log('[Job Hunter] ✓ Growth rate extracted:', data.companyHeadcountGrowth, '(2-year company-wide)');
    } else {
      // Explicitly set to null when no growth data exists
      data.companyHeadcountGrowth = null;
      console.log('[Job Hunter] ⚠ No growth data found - companyHeadcountGrowth set to null');
    }
    if (companyHeadcountData.medianEmployeeTenure !== null) {
      data.medianEmployeeTenure = companyHeadcountData.medianEmployeeTenure;
      console.log('[Job Hunter] ✓ Median Employee Tenure extracted:', data.medianEmployeeTenure, 'years');
    }

    // Extract Industry from footer "About the company" section
    const industryFooter = document.querySelector('.jobs-company__company-description .t-14.mt5');
    if (industryFooter) {
      const industryText = industryFooter.textContent?.trim() || '';
      // Skip if it's "Staffing and Recruiting" - we'll infer from job description instead
      if (industryText && !industryText.toLowerCase().includes('staffing and recruiting')) {
        data.industry = industryText;
        console.log('[Job Hunter] ✓ Industry extracted:', data.industry);
      } else if (industryText.toLowerCase().includes('staffing and recruiting')) {
        console.log('[Job Hunter] ⚠ Detected recruiting firm - industry will need inference from JD');
      }
    }

    // Extract company metadata from "About the company" section
    const aboutCompanySection = document.querySelector('.jobs-company__company-description');
    if (aboutCompanySection) {
      const aboutText = aboutCompanySection.textContent || '';

      // Extract Followers
      const followersMatch = aboutText.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:K|M)?\s*followers?/i);
      if (followersMatch) {
        let followersValue = followersMatch[1].replace(/,/g, '');
        // Handle K (thousands) and M (millions) suffixes
        if (aboutText.match(/\d+\s*K\s*followers?/i)) {
          followersValue = parseFloat(followersValue) * 1000;
        } else if (aboutText.match(/\d+\s*M\s*followers?/i)) {
          followersValue = parseFloat(followersValue) * 1000000;
        }
        data.companyFollowers = parseInt(followersValue, 10);
        console.log('[Job Hunter] ✓ Followers extracted:', data.companyFollowers);
      }

      // Extract Company Type (Public, Private, etc.)
      // LinkedIn shows company type like "Public Company", "Privately Held", "Partnership", etc.
      const typePatterns = [
        /\b(Public Company|Publicly Traded)\b/i,
        /\b(Privately Held|Private Company)\b/i,
        /\b(Self-Owned|Self-employed)\b/i,
        /\b(Government Agency)\b/i,
        /\b(Nonprofit|Non-profit)\b/i,
        /\b(Educational Institution|Educational)\b/i,
        /\b(Partnership)\b/i,
        /\b(Sole Proprietorship)\b/i
      ];

      for (const pattern of typePatterns) {
        const typeMatch = aboutText.match(pattern);
        if (typeMatch) {
          data.companyType = typeMatch[1];
          console.log('[Job Hunter] ✓ Company Type extracted:', data.companyType);
          break;
        }
      }

      // Extract Company Description (usually the first paragraph in the about section)
      const descriptionEl = aboutCompanySection.querySelector('p, div.inline-show-more-text');
      if (descriptionEl) {
        const description = descriptionEl.textContent?.trim();
        if (description && description.length > 30) { // Only capture if substantive
          data.companyDescription = description;
          console.log('[Job Hunter] ✓ Company Description extracted:', description.substring(0, 100) + '...');
        }
      }
    }

    // Extract Website from company page link (if we have company page URL)
    if (data.companyPageUrl) {
      // Try to find website link in the "About" section or company card
      const websiteSelectors = [
        '.jobs-company__company-description a[href*="http"]:not([href*="linkedin.com"])',
        '.org-top-card-secondary-content__website a',
        'a[data-tracking-control-name="organization_guest_web-site-link"]'
      ];

      for (const selector of websiteSelectors) {
        const websiteEl = document.querySelector(selector);
        if (websiteEl && websiteEl.href && !websiteEl.href.includes('linkedin.com')) {
          data.website = websiteEl.href;
          console.log('[Job Hunter] ✓ Website extracted:', data.website);
          break;
        }
      }
    }

  } catch (error) {
    console.error('[Job Hunter] Error extracting LinkedIn data:', error);
  }

  return data;
}

/**
 * Extract company headcount, growth, and tenure data from LinkedIn premium widget
 * CRITICAL: Extracts specific fields from .jobs-premium-company-growth container:
 *  - Total Employees: First .t-16 element
 *  - Growth: "Company-wide" percentage (not department-specific)
 *  - Median Employee Tenure: decimal from strong tag
 * @returns {Object} { currentHeadcount, headcountGrowthRate, medianEmployeeTenure, headcountDataFound }
 */
function extractCompanyHeadcountData() {
  const result = {
    currentHeadcount: null,
    headcountGrowthRate: null,
    headcountGrowthText: null,
    medianEmployeeTenure: null,
    headcountDataFound: false
  };

  try {
    // CRITICAL: LinkedIn Premium Company Growth Widget (.jobs-premium-company-growth)
    // This widget contains Total Employees, Growth %, and Median Tenure
    console.log('[Job Hunter] Looking for LinkedIn premium company growth widget...');
    const growthWidget = document.querySelector('.jobs-premium-company-growth');

    if (growthWidget) {
      console.log('[Job Hunter] ✓ Found premium company growth widget');

      // Extract Total Employees from the first .t-16 element
      const employeeCountEl = growthWidget.querySelector('p.t-16');
      if (employeeCountEl) {
        const employeeText = employeeCountEl.textContent?.trim() || '';
        const employeeMatch = employeeText.match(/(\d{1,3}(?:,\d{3})*)/);
        if (employeeMatch) {
          result.currentHeadcount = parseInt(employeeMatch[1].replace(/,/g, ''), 10);
          console.log('[Job Hunter] ✓ Total Employees:', result.currentHeadcount);
          result.headcountDataFound = true;
        }
      }

      // Extract Growth from "Company-wide" stat (NOT department-specific)
      const companyGrowthItems = growthWidget.querySelectorAll('.jobs-premium-company-growth__stat-item');
      console.log('[Job Hunter] Found', companyGrowthItems.length, 'growth stat items');

      for (const item of companyGrowthItems) {
        const labels = item.querySelectorAll('p');
        let isCompanyWide = false;

        // Check if this is the "Company-wide" growth stat (not department-specific)
        labels.forEach(label => {
          const text = label.textContent?.trim() || '';
          if (text.toLowerCase() === 'company-wide') {
            isCompanyWide = true;
          }
        });

        if (isCompanyWide) {
          // Extract the percentage from the bold text
          const percentageEl = item.querySelector('.t-16.t-black--light.t-bold');
          if (percentageEl) {
            const growthText = percentageEl.textContent?.trim() || '';
            const percentMatch = growthText.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
            if (percentMatch) {
              const rate = parseFloat(percentMatch[1]);
              // Check if it's an increase or decrease based on CSS class
              const hasIncrease = item.querySelector('.jobs-premium-company-growth__number-with-arrow--increase');
              const hasDecrease = item.querySelector('.jobs-premium-company-growth__number-with-arrow--decrease');

              result.headcountGrowthRate = hasDecrease ? -Math.abs(rate) : rate;
              result.headcountGrowthText = `Company-wide ${result.headcountGrowthRate >= 0 ? '+' : ''}${result.headcountGrowthRate}% (2yr)`;
              result.headcountDataFound = true;
              console.log('[Job Hunter] ✓ Company-wide Growth:', result.headcountGrowthRate + '%');
              break;
            }
          }
        }
      }

      // Extract Median Employee Tenure from strong tag
      const tenureElements = growthWidget.querySelectorAll('strong');
      for (const strong of tenureElements) {
        const tenureText = strong.textContent?.trim() || '';
        const tenureMatch = tenureText.match(/(\d+(?:\.\d+)?)\s*(?:years?)?/);
        if (tenureMatch) {
          // Check if this is within a tenure context
          const parentText = strong.closest('div')?.textContent?.toLowerCase() || '';
          if (parentText.includes('tenure') || parentText.includes('employee')) {
            result.medianEmployeeTenure = parseFloat(tenureMatch[1]);
            console.log('[Job Hunter] ✓ Median Employee Tenure:', result.medianEmployeeTenure, 'years');
            break;
          }
        }
      }
    } else {
      console.log('[Job Hunter] ⚠ Premium company growth widget not found on page');
    }

    // FALLBACK METHODS: Only run if widget didn't find data
    // Method 1: Try LinkedIn company sidebar / insights section on job posting (FALLBACK ONLY)
    if (!result.currentHeadcount || !result.headcountGrowthRate) {
      console.log('[Job Hunter] Using fallback methods for missing data...');

      const companyInfoSelectors = [
        '[data-testid="company-info"]',
        '.job-details-jobs-unified-top-card__company-size',
        '.jobs-unified-top-card__company-size',
        '.jobs-company__company-description',
        '.job-details-premium-company-insights',
        '.job-details-company-insights',
        '.company-size',
        '.jobs-company-info',
        '.job-details-about-company',
        '[data-test-company-size]',
        '.jobs-unified-top-card__job-insight',
        '.job-details-jobs-unified-top-card__job-insight',
        '.t-14.t-black--light.t-normal' // Company size text on some pages
      ];

      let companySidebarText = '';
      for (const selector of companyInfoSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el?.innerText) {
            companySidebarText += ' ' + el.innerText;
          }
        });
      }

      // Method 2: Also check the full page text for company data
      const pageText = document.body.innerText || '';

      // Combined text to search
      const combinedText = companySidebarText + ' ' + pageText;

      // Pattern 1: "1,001-5,000 employees" or "1,001 - 5,000 employees"
      const rangePattern = /(\d{1,3}(?:,\d{3})*)\s*(?:-|to)\s*(\d{1,3}(?:,\d{3})*)\s+employees?/i;
      const rangeMatch = combinedText.match(rangePattern);

      // Pattern 2: "500+ employees" or "250 employees"
      const singlePattern = /(\d{1,3}(?:,\d{3})*)\+?\s+employees?/i;
      const singleMatch = combinedText.match(singlePattern);

      // Extract headcount (use midpoint for ranges) - ONLY if not already found
      if (!result.currentHeadcount) {
        if (rangeMatch) {
          const lower = parseInt(rangeMatch[1].replace(/,/g, ''), 10);
          const upper = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
          result.currentHeadcount = Math.floor((lower + upper) / 2);
          result.headcountDataFound = true;
          console.log('[Job Hunter] Fallback: Extracted headcount from range:', result.currentHeadcount);
        } else if (singleMatch) {
          result.currentHeadcount = parseInt(singleMatch[1].replace(/,/g, ''), 10);
          result.headcountDataFound = true;
          console.log('[Job Hunter] Fallback: Extracted headcount from single:', result.currentHeadcount);
        }
      }

      // Pattern 3: Growth rate patterns - ONLY if not already found
      if (!result.headcountGrowthRate) {
        const growthPatterns = [
          /([+-]?\d+(?:\.\d+)?)\s*%\s+(?:employee\s+)?growth/i,
          /([+-]?\d+(?:\.\d+)?)\s*%\s+(?:increase|growth|over)/i,
          /headcount[:\s]+([+-]?\d+(?:\.\d+)?)\s*%/i,
          /growing\s+(?:at\s+)?([+-]?\d+(?:\.\d+)?)\s*%/i,
          /([+-]?\d+(?:\.\d+)?)\s*%\s+(?:yoy|year.over.year)/i,
          /employee\s+growth[:\s]+([+-]?\d+(?:\.\d+)?)\s*%/i
        ];

        for (const pattern of growthPatterns) {
          const match = combinedText.match(pattern);
          if (match) {
            const rate = parseFloat(match[1]);
            if (!isNaN(rate) && rate >= -100 && rate <= 500) { // Reasonable growth range
              result.headcountGrowthRate = rate;
              result.headcountGrowthText = match[0];
              result.headcountDataFound = true;
              console.log('[Job Hunter] Fallback: Extracted growth rate:', result.headcountGrowthRate + '%');
              break;
            }
          }
        }
      }
    } // End of fallback methods conditional

  } catch (error) {
    console.error('[Job Hunter] Error extracting headcount data:', error);
  }

  return result;
}

/**
 * Clean LinkedIn URL to just the essential parts
 * @param {string} url - Full URL
 * @returns {string} Cleaned URL
 */
function cleanLinkedInUrl(url) {
  try {
    const urlObj = new URL(url);
    // Keep only the job view path
    if (url.includes('/jobs/view/')) {
      const jobId = url.match(/\/jobs\/view\/(\d+)/)?.[1];
      if (jobId) {
        return `https://www.linkedin.com/jobs/view/${jobId}/`;
      }
    }
    // For search pages with currentJobId, extract the job ID
    const currentJobId = urlObj.searchParams.get('currentJobId');
    if (currentJobId) {
      return `https://www.linkedin.com/jobs/view/${currentJobId}/`;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Normalize LinkedIn company URLs by stripping trailing "/life" or tracking params
 * @param {string} url - Full company URL
 * @returns {string} Cleaned URL
 */
function cleanCompanyUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove query/hash
    urlObj.search = '';
    urlObj.hash = '';

    // Strip trailing /life segment (LinkedIn sometimes links to the "Life" subpage)
    let pathname = urlObj.pathname.replace(/\/+$/, '');
    pathname = pathname.replace(/\/life\/?$/i, '');

    // Ensure trailing slash for canonical company URL
    urlObj.pathname = pathname.endsWith('/') ? pathname : `${pathname}/`;

    return urlObj.toString();
  } catch {
    return url;
  }
}

// ============================================================================
// INDEED HANDLER (Basic implementation - can be extended)
// ============================================================================

/**
 * Initialize Indeed job page handling
 */
function handleIndeed() {
  // Indeed often keeps you on the same page and swaps the job in-place.
  // Use a URL-aware poller so we only inject on actual job detail URLs.
  let lastUrl = location.href;

  const checkAndInject = () => {
    const isJob = isIndeedJobPage();
    if (isJob && !document.getElementById('job-hunter-overlay')) {
      // Small delay to let the right-rail job detail render
      setTimeout(() => {
        if (isIndeedJobPage() && !document.getElementById('job-hunter-overlay')) {
          injectOverlay('Indeed');
        }
      }, 300);
    } else if (!isJob) {
      removeOverlay();
    }
  };

  // Initial check
  checkAndInject();

  // Poll for URL changes that indicate a new job selection
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      removeOverlay();
      checkAndInject();
    } else {
      // Even without URL change, ensure overlay exists when on a job
      checkAndInject();
    }
  }, 1000);
}

/**
 * Check if current Indeed page is a job detail page
 * @returns {boolean}
 */
function isIndeedJobPage() {
  const url = window.location.href;
  return /\/viewjob/i.test(url) || /[?&]vjk=/i.test(url);
}

/**
 * Extract job data from Indeed job detail page
 * @returns {Object} Extracted job data
 */
function extractIndeedJobData() {
  const data = {
    jobTitle: '',
    companyName: '',
    companyPageUrl: '',
    location: '',
    salaryMin: null,
    salaryMax: null,
    descriptionText: '',
    workplaceType: '',
    employmentType: '',
    equityMentioned: false,
    bonusMentioned: false,
    jobUrl: window.location.href,
    source: 'Indeed',
    // New extraction fields
    hiringManager: null,
    postedDate: null,
    applicantCount: null
  };

  try {
    // Job Title: prefer modern data-testid selectors, then legacy class fallbacks (Indeed DOM changes frequently)
    const titleSelectors = [
      'h1[data-testid="jobDetailTitle"]',
      'h1[data-testid="jobTitle"]',
      '.jobsearch-JobInfoHeader-title',
      'h1.icl-u-xs-mb--xs',
      '.jobsearch-JobInfoHeader h1'
    ];
    data.jobTitle = getTextFromSelectors(titleSelectors) || '';

    // Company Name: data-testid first, then legacy company rating links
    const companySelectors = [
      'div[data-testid="company-name"]',
      'div[data-testid="inlineHeader-companyName"]',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.icl-u-lg-mr--sm a'
    ];
    data.companyName = getTextFromSelectors(companySelectors) || '';
    const companyLinkEl = document.querySelector('div[data-testid="inlineHeader-companyName"] a, div[data-testid="company-name"] a, [data-company-name="true"] a');
    if (companyLinkEl?.href) {
      data.companyPageUrl = companyLinkEl.href;
    }

    // Location: data-testid location first, then legacy subtitle items
    const locationSelectors = [
      'div[data-testid="text-location"]',
      'div[data-testid="inlineHeader-location"]',
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-subtitle > div:nth-child(2)',
      '.icl-u-xs-mt--xs'
    ];
    const rawLocation = getTextFromSelectors(locationSelectors) || '';
    const normalizedLocation = normalizeIndeedLocation(rawLocation);
    if (normalizedLocation.location) {
      data.location = normalizedLocation.location;
    }
    if (normalizedLocation.workplaceType && !data.workplaceType) {
      data.workplaceType = normalizedLocation.workplaceType;
    }

    // Salary: data-testid salary first, then legacy metadata items
    const salarySelectors = [
      'div[data-testid="jobDetailSalary"]',
      '[data-testid="attribute_snippet_testid"]',
      '.jobsearch-JobMetadataHeader-item',
      '#salaryInfoAndJobType span'
    ];
    const structuredSalaryText = getTextFromSelectors(salarySelectors) || '';

    // Job Description
    const descriptionSelectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText'
    ];
    data.descriptionText = getTextFromSelectors(descriptionSelectors, true) || '';

    // Multi-pass salary extraction with confidence levels
    const salaryResult = extractSalaryWithConfidence({
      structuredSalary: structuredSalaryText,
      descriptionText: data.descriptionText
    });
    data.salaryMin = salaryResult.min;
    data.salaryMax = salaryResult.max;
    data.salaryConfidence = salaryResult.confidence;
    data.salarySource = salaryResult.source;

    // Employment type: often near salary info
    const employmentSelectors = [
      '#salaryInfoAndJobType',
      'div[data-testid="jobsearch-OtherJobDetailsContainer"]',
      'div[data-testid="jobsearch-JobInfoHeader-title"] + div'
    ];
    const employmentText = getTextFromSelectors(employmentSelectors) || '';
    if (/full[-\s]?time/i.test(employmentText)) data.employmentType = 'Full-time';
    else if (/part[-\s]?time/i.test(employmentText)) data.employmentType = 'Part-time';
    else if (/contract/i.test(employmentText)) data.employmentType = 'Contract';
    else if (/intern/i.test(employmentText)) data.employmentType = 'Internship';

    // Workspace type from description if not already set
    if (!data.workplaceType) {
      if (/remote/i.test(employmentText)) data.workplaceType = 'Remote';
      else if (/hybrid/i.test(employmentText)) data.workplaceType = 'Hybrid';
      else if (/on[-\s]?site|onsite/i.test(employmentText)) data.workplaceType = 'On-site';
    }

    // Flag if equity is mentioned using contextual detection
    if (data.descriptionText) {
      data.equityMentioned = detectEquityWithContext(data.descriptionText);
    }

    // Flag if bonus is mentioned in the description using 15-word proximity rule
    if (data.descriptionText) {
      data.bonusMentioned = detectBonusWithProximityRule(data.descriptionText);
    }

    // Extract Posted Date from Indeed job metadata
    const postedSelectors = [
      '[data-testid="posted-date"]',
      '.jobsearch-JobMetadataFooter .date-span',
      '.date'
    ];
    for (const selector of postedSelectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        const text = el.textContent.trim();
        // Match patterns like "Posted 2 days ago", "Today", "Just posted"
        if (/posted|ago|today|just/i.test(text)) {
          data.postedDate = text;
          break;
        }
      }
    }

    // Indeed doesn't typically show hiring manager or applicant count prominently
    // But we can check for any available metadata
    const applicantSelectors = [
      '[data-testid="applicants-count"]',
      '.jobsearch-JobMetadataHeader-item'
    ];
    for (const selector of applicantSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        const applicantMatch = text.match(/(\d+)\s+applicants?/i);
        if (applicantMatch) {
          data.applicantCount = parseInt(applicantMatch[1], 10);
          break;
        }
      }
      if (data.applicantCount) break;
    }

  } catch (error) {
    console.error('[Job Hunter] Error extracting Indeed data:', error);
  }

  return data;
}

// ============================================================================
// SHARED UTILITIES
// ============================================================================

/**
 * Clean up hiring manager title text by removing connection degree and other noise
 * Removes: "1st", "2nd", "3rd" degree connection, "• Hiring" badge, etc.
 * @param {string} rawTitle - The raw title text
 * @returns {string|null} Cleaned title or null if empty
 */
function cleanHiringManagerTitle(rawTitle) {
  if (!rawTitle) return null;

  let title = rawTitle.trim();

  // Remove connection degree patterns (1st, 2nd, 3rd, etc.)
  title = title.replace(/\b\d+(?:st|nd|rd|th)\s*(?:degree\s*)?(?:connection)?\b/gi, '');

  // Remove "• Hiring" or "Hiring" badge text
  title = title.replace(/[•·]\s*hiring\b/gi, '');
  title = title.replace(/\bhiring\s*$/gi, '');

  // Remove "at Company Name" suffix (we already have company separately)
  title = title.replace(/\s+at\s+[^|]+$/i, '');

  // Remove common LinkedIn artifacts
  title = title.replace(/^\s*[•·|-]\s*/, ''); // Leading bullets
  title = title.replace(/\s*[•·|-]\s*$/, ''); // Trailing bullets
  title = title.replace(/\s*\|\s*$/, ''); // Trailing pipes

  // Clean up extra whitespace
  title = title.replace(/\s+/g, ' ').trim();

  // If empty after cleaning, return null
  return title.length > 0 ? title : null;
}

/**
 * Try multiple selectors and return the first matching text content
 * @param {string[]} selectors - Array of CSS selectors to try
 * @param {boolean} preserveWhitespace - Whether to preserve paragraph breaks
 * @returns {string|null} Text content or null
 */
function getTextFromSelectors(selectors, preserveWhitespace = false) {
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = preserveWhitespace
        ? element.innerText?.trim()
        : element.textContent?.trim();
      if (text) {
        return text;
      }
    }
  }
  return null;
}

/**
 * Detect if bonus is mentioned in text using 15-word proximity rule
 * Excludes sign-on, referral, signing, hiring, and relocation bonuses
 * @param {string} text - Job description text
 * @returns {boolean} True if performance/annual bonus is mentioned
 */
function detectBonusWithProximityRule(text) {
  if (!text) return false;

  const lowerText = text.toLowerCase();

  // Positive patterns that strongly indicate performance/annual bonus
  const positivePatterns = [
    /performance\s+bonus/i,
    /annual\s+bonus/i,
    /yearly\s+bonus/i,
    /target\s+bonus/i,
    /discretionary\s+bonus/i,
    /quarterly\s+bonus/i,
    /bonus\s+(of|up\s+to|target|structure|plan|program|eligibility)/i,
    /(\d+%|\d+\s*percent)\s+bonus/i,
    /bonus\s+(\d+%|\d+\s*percent)/i,
    /variable\s+(compensation|pay)/i,
    /incentive\s+bonus/i,
    /bonus\s+incentive/i,
    /bonus\s+compensation/i
  ];

  // Check for positive patterns first
  for (const pattern of positivePatterns) {
    if (pattern.test(lowerText)) {
      return true;
    }
  }

  // If no clear positive match, look for "bonus" and apply 15-word proximity rule
  const bonusMatches = [...lowerText.matchAll(/\bbonus\b/gi)];
  if (bonusMatches.length === 0) return false;

  // Exclusionary words that invalidate a bonus mention if within 15 words
  const exclusionWords = ['sign-on', 'signon', 'sign on', 'signing', 'referral', 'hiring', 'relocation', 'new hire', 'joining'];

  for (const match of bonusMatches) {
    const bonusIndex = match.index;
    // Extract up to 15 words before the bonus mention
    const textBefore = lowerText.substring(Math.max(0, bonusIndex - 150), bonusIndex);
    const wordsBefore = textBefore.split(/\s+/).slice(-15).join(' ');

    // Check if any exclusion word appears within the 15 words before "bonus"
    let isExcluded = false;
    for (const exclusion of exclusionWords) {
      if (wordsBefore.includes(exclusion)) {
        isExcluded = true;
        break;
      }
    }

    // If this "bonus" instance is not excluded by proximity, it's valid
    if (!isExcluded) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if equity/stock compensation is mentioned using contextual analysis
 * Only returns true for genuine compensation-related equity mentions
 * Excludes DEI/EEO "equity" and words like "pursuing" that contain "rsu"
 * @param {string} text - Job description text
 * @returns {boolean} True if compensation equity is mentioned
 */
function detectEquityWithContext(text) {
  if (!text) return false;

  const lowerText = text.toLowerCase();

  // STRONG positive patterns - these are unambiguous compensation terms
  const strongPatterns = [
    /stock\s+options?/i,
    /\brestricted\s+stock\s+units?\b/i,
    /\brsu\b/i,  // Standalone RSU only (not inside words)
    /\brsus\b/i, // Plural RSUs only
    /\bespp\b/i,  // Employee Stock Purchase Plan
    /employee\s+stock\s+purchase/i,
    /stock\s+(grant|award|compensation|package)/i,
    /equity\s+(grant|package|compensation|award|incentive|stake)/i,
    /ownership\s+(stake|interest|percentage)/i,
    /vesting\s+schedule/i,
    /(\d+\.?\d*)\s*%?\s*(equity|ownership)/i,  // "0.5% equity"
    /equity\s+in\s+the\s+company/i,
    /shares?\s+(of|in)\s+(the\s+)?company/i,
    /four[-\s]?year\s+vest/i,
    /cliff\s+(period|vesting)/i
  ];

  // Check strong patterns first - these are unambiguous
  for (const pattern of strongPatterns) {
    if (pattern.test(lowerText)) {
      return true;
    }
  }

  // WEAK pattern: generic "equity" - requires compensation context
  if (/\bequity\b/i.test(lowerText)) {
    // Must NOT have DEI/EEO context
    const deiPatterns = [
      /diversity[^.]{0,60}equity[^.]{0,60}inclusion/i,
      /equity[^.]{0,30}inclusion[^.]{0,30}diversity/i,
      /equal\s+opportunity/i,
      /equity\s+in\s+(hiring|employment|workplace|opportunity|opportunities)/i,
      /promote\s+equity/i,
      /commitment\s+to\s+equity/i,
      /dei\b/i,
      /equity\s+and\s+(inclusion|diversity)/i
    ];

    const hasDeiContext = deiPatterns.some(p => p.test(lowerText));
    if (hasDeiContext) {
      return false;
    }

    // Must HAVE compensation context nearby for generic "equity"
    const compensationKeywords = [
      'compensation', 'stock', 'vesting', 'vest', 'shares', 'ownership',
      'options', 'grant', 'package', 'salary', 'total comp', 'offer',
      '%', 'percent', 'fully diluted', 'cap table'
    ];

    // Find each "equity" mention and check for compensation context within 100 chars
    const equityMatches = [...lowerText.matchAll(/\bequity\b/gi)];
    for (const match of equityMatches) {
      const start = Math.max(0, match.index - 100);
      const end = Math.min(lowerText.length, match.index + 100);
      const context = lowerText.substring(start, end);

      const hasCompContext = compensationKeywords.some(kw => context.includes(kw));
      if (hasCompContext) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Salary extraction confidence levels
 */
const SALARY_CONFIDENCE = {
  HIGH: 'HIGH',       // Explicit structured field from job site
  MEDIUM: 'MEDIUM',   // Salary keyword + $ in description
  LOW: 'LOW',         // Inferred from description without keyword
  NONE: 'NONE'        // No salary data found
};

/**
 * Multi-pass salary extraction with confidence levels
 * Tries multiple sources in priority order and returns best match
 * @param {Object} options - Extraction options
 * @param {string} options.structuredSalary - Salary from structured UI elements (highest priority)
 * @param {string} options.descriptionText - Full job description text
 * @returns {{min: number|null, max: number|null, confidence: string, source: string}}
 */
function extractSalaryWithConfidence(options) {
  const { structuredSalary, descriptionText } = options;

  // Pass 1: Structured salary field (HIGH confidence)
  if (structuredSalary) {
    const parsed = parseSalaryRange(structuredSalary);
    if (parsed.min !== null && parsed.max !== null) {
      return {
        ...parsed,
        confidence: SALARY_CONFIDENCE.HIGH,
        source: 'structured_field'
      };
    }
  }

  // Pass 2: Keyword-gated search in description (MEDIUM confidence)
  if (descriptionText) {
    const mediumResult = findSalaryWithKeyword(descriptionText);
    if (mediumResult.min !== null && mediumResult.max !== null) {
      return {
        ...mediumResult,
        confidence: SALARY_CONFIDENCE.MEDIUM,
        source: 'description_keyword'
      };
    }
  }

  // Pass 3: Any salary-like pattern in description (LOW confidence)
  if (descriptionText) {
    const lowResult = findAnySalaryPattern(descriptionText);
    if (lowResult.min !== null && lowResult.max !== null) {
      return {
        ...lowResult,
        confidence: SALARY_CONFIDENCE.LOW,
        source: 'description_pattern'
      };
    }
  }

  // No salary found
  return {
    min: null,
    max: null,
    confidence: SALARY_CONFIDENCE.NONE,
    source: 'none'
  };
}

/**
 * Find salary information using keyword-gated search (MEDIUM confidence)
 * Requires salary-related keyword near the dollar amount
 * @param {string} text - Full description text
 * @returns {{min: number|null, max: number|null}}
 */
function findSalaryWithKeyword(text) {
  const result = { min: null, max: null };
  if (!text) return result;

  const keywordRegex = /(salary|compensation|pay|base|range|total rewards|total comp|annual|per year|\/yr)/i;
  const currencyRegex = /\$|usd/i;

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const tryParse = raw => {
    if (!raw || !currencyRegex.test(raw)) return null;
    const parsed = parseSalaryRange(raw);
    if (parsed.min !== null && parsed.max !== null) {
      // Validate it's a reasonable annual salary (>$40K, <$2M)
      if (parsed.min >= 40000 && parsed.max <= 2000000) {
        return parsed;
      }
    }
    return null;
  };

  // Pass 1: keyword line plus following context (handles multi-line labels + amounts)
  for (let i = 0; i < lines.length; i++) {
    if (!keywordRegex.test(lines[i])) continue;
    const block = [lines[i]];
    if (lines[i + 1]) block.push(lines[i + 1]);
    if (lines[i + 2]) block.push(lines[i + 2]);
    if (lines[i + 3]) block.push(lines[i + 3]);
    const parsed = tryParse(block.join(' '));
    if (parsed) return parsed;
  }

  // Pass 2: bullet lines that include keyword + currency
  for (const line of lines) {
    if (!/^[-•*]/.test(line)) continue;
    if (!keywordRegex.test(line)) continue;
    const parsed = tryParse(line);
    if (parsed) return parsed;
  }

  // Pass 3: any single line containing keyword + currency
  for (const line of lines) {
    if (!keywordRegex.test(line)) continue;
    const parsed = tryParse(line);
    if (parsed) return parsed;
  }

  return result;
}

/**
 * Find any salary-like pattern (LOW confidence)
 * More permissive - finds $XXX,XXX patterns without requiring keywords
 * @param {string} text - Full description text
 * @returns {{min: number|null, max: number|null}}
 */
function findAnySalaryPattern(text) {
  const result = { min: null, max: null };
  if (!text) return result;

  // Look for dollar amounts that look like annual salaries
  // Match: $150,000 - $200,000, $150K-$200K, $150,000/year
  const patterns = [
    // Range pattern: $150,000 - $200,000
    /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:k|K)?\s*[-–to]+\s*\$?\s*([\d,]+(?:\.\d{2})?)\s*(?:k|K)?/g,
    // Single value with /yr or /year: $180,000/yr
    /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:k|K)?\s*(?:\/\s*(?:yr|year|annually))/gi
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      let min = parseFloat(match[1].replace(/,/g, ''));
      let max = match[2] ? parseFloat(match[2].replace(/,/g, '')) : min;

      // Handle K suffix
      if (match[0].toLowerCase().includes('k')) {
        if (min < 1000) min *= 1000;
        if (max < 1000) max *= 1000;
      }

      // Validate reasonable annual salary range
      if (min >= 40000 && max <= 2000000 && max >= min) {
        return { min, max };
      }
    }
  }

  return result;
}

/**
 * Find salary information in descriptive text, gated by salary-related keywords to avoid false positives
 * @param {string} text - Full description text
 * @returns {{min: number|null, max: number|null}}
 * @deprecated Use extractSalaryWithConfidence for better results
 */
function findSalaryInText(text) {
  const result = extractSalaryWithConfidence({ descriptionText: text });
  return { min: result.min, max: result.max };
}

/**
 * Parse salary range from text
 * @param {string} text - Text potentially containing salary info
 * @returns {Object} { min: number|null, max: number|null }
 */
function parseSalaryRange(text) {
  const result = { min: null, max: null };

  if (!text) return result;

  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\/?yr\.?|per year|a year/gi, '')
    .replace(/\b(usd|cad|gbp|eur|aud)\b/gi, '') // strip trailing currency words
    .replace(/[()]/g, '')
    .trim();

  // Match patterns like "$150,000 - $200,000", "$150K–$200K", or "$150K to $200K"
  const rangeMatch = cleaned.match(
    /\$?\s*([\d.,]+)\s*(K|k|M|m)?\s*(?:-|–|to)\s*\$?\s*([\d.,]+)\s*(K|k|M|m)?/i
  );
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1].replace(/,/g, ''));
    let max = parseFloat(rangeMatch[3].replace(/,/g, ''));

    const minSuffix = rangeMatch[2]?.toLowerCase();
    const maxSuffix = rangeMatch[4]?.toLowerCase();

    if (minSuffix === 'k') min *= 1000;
    if (maxSuffix === 'k') max *= 1000;
    if (minSuffix === 'm') min *= 1000000;
    if (maxSuffix === 'm') max *= 1000000;

    result.min = min;
    result.max = max;
    return result;
  }

  // Match single salary like "$180,000" or "$180K" (guarded by currency and reasonable length)
  const singleMatch = cleaned.match(/\$\s*([\d.,]{3,})\s*(K|k|M|m)?/);
  if (singleMatch) {
    let salary = parseFloat(singleMatch[1].replace(/,/g, ''));
    const suffix = singleMatch[2]?.toLowerCase();
    if (suffix === 'k') salary *= 1000;
    if (suffix === 'm') salary *= 1000000;
    result.min = salary;
    result.max = salary;
  }

  return result;
}

/**
 * Normalize Indeed location strings to "City, ST" and detect workplace type
 * @param {string} rawLocation
 * @returns {{ location: string, workplaceType: string }}
 */
function normalizeIndeedLocation(rawLocation) {
  const result = { location: '', workplaceType: '' };
  if (!rawLocation) return result;

  let text = rawLocation
    .replace(/\s+/g, ' ')
    .replace(/•/g, ' ')
    .trim();

  // Detect workplace type from the location string
  if (/remote/i.test(text)) result.workplaceType = 'Remote';
  else if (/hybrid/i.test(text)) result.workplaceType = 'Hybrid';
  else if (/on[-\s]?site|onsite/i.test(text)) result.workplaceType = 'On-site';

  // Drop leading workplace phrases like "Remote in", "Hybrid in", "On-site in"
  text = text.replace(/^(remote|hybrid|on[-\s]?site|onsite)\s+in\s+/i, '');

  // Remove trailing country tokens commonly appended
  text = text.replace(/,\s*United States( of America)?$/i, '');

  // Remove ZIP codes (5-digit or ZIP+4)
  text = text.replace(/\s+\d{5}(?:-\d{4})?$/, '');

  // If the string still contains multiple tokens, take the first city, ST pair
  const match = text.match(/([A-Za-z .'-]+,\s*[A-Z]{2})(?:\b|$)/);
  if (match) {
    result.location = match[1].trim();
    return result;
  }

  // Fallback: if there is a comma-separated city/state without uppercase state
  const parts = text.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    result.location = `${parts[0]}, ${parts[1]}`;
    return result;
  }

  // Final fallback: return cleaned text
  result.location = text;
  return result;
}

// ============================================================================
// OVERLAY UI
// ============================================================================

/**
 * Initialize auto-scoring for a job page
 * The floating panel handles all UI - no overlay buttons needed
 * @param {string} source - 'LinkedIn' or 'Indeed'
 */
function injectOverlay(source) {
  // Don't inject if already initialized
  if (document.getElementById('jh-floating-panel')) {
    return;
  }

  console.log('[Job Hunter] Initializing auto-scoring...');

  // Trigger auto-scoring via floating panel (if profile exists)
  triggerAutoScore(source);
}

// ============================================================================
// SCORING INTEGRATION
// ============================================================================

/**
 * Handle click on the "Score This Job" button
 * @param {string} source - 'LinkedIn' or 'Indeed'
 * @param {HTMLButtonElement} button - The button element
 */
async function handleScoreClick(source, button) {
  // Prevent double-clicks
  if (button.disabled) return;

  // Show loading state
  button.disabled = true;
  button.classList.add('loading');
  button.querySelector('span').textContent = 'Scoring...';

  try {
    // Extract job data based on source
    const jobData = source === 'LinkedIn'
      ? extractLinkedInJobData()
      : extractIndeedJobData();

    console.log('[Job Hunter] Extracted job data for scoring:', jobData);

    // Validate we got essential data
    if (!jobData.jobTitle || !jobData.companyName) {
      throw new Error('Could not extract job title or company name');
    }

    // Get user profile from storage
    const userProfile = await getUserProfile();

    // Check if profile exists
    if (!userProfile || !userProfile.preferences) {
      // Prompt user to set up profile
      showProfileSetupPrompt();
      button.classList.remove('loading');
      button.querySelector('span').textContent = 'Score This Job';
      button.disabled = false;
      return;
    }

    // Calculate score using the scoring engine
    // The scoring engine is loaded as a content script (scoring-engine.js)
    if (typeof window.JobHunterScoring === 'undefined') {
      throw new Error('Scoring engine not loaded');
    }

    const scoreResult = window.JobHunterScoring.calculateJobFitScore(jobData, userProfile);
    console.log('[Job Hunter] Score result:', scoreResult);

    // Reset button state
    button.classList.remove('loading');
    button.querySelector('span').textContent = 'Score This Job';
    button.disabled = false;

    // Display results modal
    if (typeof window.JobHunterResults !== 'undefined') {
      window.JobHunterResults.showResultsModal(
        scoreResult,
        jobData,
        // onSendToAirtable callback
        async (job, score) => {
          return sendJobToAirtable(job, score);
        },
        // onEditProfile callback
        () => {
          openProfileSetup();
        }
      );
    } else {
      // Fallback: show basic alert with score
      alert(`Job Fit Score: ${scoreResult.overall_score}/100 (${scoreResult.overall_label})`);
    }

  } catch (error) {
    console.error('[Job Hunter] Scoring error:', error);

    // Show error state
    button.classList.remove('loading');
    button.classList.add('error');
    button.querySelector('span').textContent = error.message || 'Error - Try Again';

    // Reset button after 3 seconds
    setTimeout(() => {
      button.classList.remove('error');
      button.querySelector('span').textContent = 'Score This Job';
      button.disabled = false;
    }, 3000);
  }
}

/**
 * Get user profile from Chrome storage
 * @returns {Promise<Object|null>} User profile or null
 */
async function getUserProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get([PROFILE_STORAGE_KEY], (result) => {
      resolve(result[PROFILE_STORAGE_KEY] || null);
    });
  });
}

/**
 * Show prompt to set up profile
 */
function showProfileSetupPrompt() {
  // Create a simple modal prompt
  const promptHtml = `
    <div id="jh-profile-prompt" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 400px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <h3 style="margin: 0 0 12px 0; font-size: 18px; color: #1a1a2e;">Set Up Your Profile</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #6c757d;">
          To score jobs against your preferences, please set up your Job Hunter profile first. It only takes 3 minutes!
        </p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button id="jh-prompt-cancel" style="
            padding: 10px 20px;
            font-size: 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            background: #e9ecef;
            color: #495057;
          ">Cancel</button>
          <button id="jh-prompt-setup" style="
            padding: 10px 20px;
            font-size: 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            background: #4361ee;
            color: white;
          ">Set Up Profile</button>
        </div>
      </div>
    </div>
  `;

  const promptContainer = document.createElement('div');
  promptContainer.innerHTML = promptHtml;
  document.body.appendChild(promptContainer);

  // Add event handlers
  document.getElementById('jh-prompt-cancel').addEventListener('click', () => {
    document.getElementById('jh-profile-prompt').remove();
  });

  document.getElementById('jh-prompt-setup').addEventListener('click', () => {
    document.getElementById('jh-profile-prompt').remove();
    openProfileSetup();
  });
}

/**
 * Open the profile setup page
 */
function openProfileSetup() {
  if (!isExtensionContextValid()) {
    handleInvalidContext();
    alert('Extension was reloaded. Please refresh this page to continue.');
    return;
  }
  const profileUrl = chrome.runtime.getURL('profile-setup.html');
  window.open(profileUrl, '_blank');
}

// Make functions available globally for floating panel
window.openProfileSetup = openProfileSetup;

// ============================================================================
// AUTO-SCORING FUNCTIONALITY
// ============================================================================

/**
 * Trigger auto-scoring for the current job page
 * Uses a debounce to avoid scoring too frequently
 * @param {string} source - 'LinkedIn' or 'Indeed'
 */
async function triggerAutoScore(source) {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    console.log('[Job Hunter] Extension context invalidated, skipping auto-score');
    handleInvalidContext();
    return;
  }

  const currentUrl = window.location.href;

  // Don't re-score the same job
  if (currentUrl === lastScoredUrl) {
    console.log('[Job Hunter] Already scored this job, skipping');
    return;
  }

  // Clear any pending auto-score
  if (autoScoreDebounceTimer) {
    clearTimeout(autoScoreDebounceTimer);
  }

  // Debounce to avoid scoring during rapid navigation
  autoScoreDebounceTimer = setTimeout(async () => {
    try {
      // Double-check context is still valid after timeout
      if (!isExtensionContextValid()) {
        console.log('[Job Hunter] Extension context invalidated during debounce');
        handleInvalidContext();
        return;
      }

      console.log('[Job Hunter] Auto-scoring job...');

      // Extract job data
      const jobData = source === 'LinkedIn'
        ? extractLinkedInJobData()
        : extractIndeedJobData();

      // Validate we got essential data
      if (!jobData.jobTitle || !jobData.companyName) {
        console.log('[Job Hunter] Not enough data to auto-score');
        return;
      }

      // Get user profile
      const userProfile = await getUserProfile();

      // If no profile, don't auto-score (user needs to set up profile first)
      if (!userProfile || !userProfile.preferences) {
        console.log('[Job Hunter] No profile found, skipping auto-score');
        return;
      }

      // Check if scoring engine is available
      if (typeof window.JobHunterScoring === 'undefined') {
        console.error('[Job Hunter] Scoring engine not loaded');
        return;
      }

      // Calculate score
      const scoreResult = window.JobHunterScoring.calculateJobFitScore(jobData, userProfile);
      console.log('[Job Hunter] Auto-score result:', scoreResult);

      // Update floating panel
      if (typeof window.JobHunterFloatingPanel !== 'undefined') {
        window.JobHunterFloatingPanel.updateScore(scoreResult, jobData);
      }

      // Remember this URL was scored
      lastScoredUrl = currentUrl;

    } catch (error) {
      // Check if error is due to extension context invalidation
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.log('[Job Hunter] Extension was reloaded. Please refresh the page.');
        handleInvalidContext();
      } else {
        console.error('[Job Hunter] Auto-score error:', error);
      }
    }
  }, 800); // 800ms debounce
}

/**
 * Send job data to Airtable (used by both direct send and from results modal)
 * @param {Object} jobData - Extracted job data
 * @param {Object} scoreResult - Optional score result to include
 * @returns {Promise<Object>} Response from background script
 */
window.sendJobToAirtable = async function sendJobToAirtable(jobData, scoreResult = null) {
  return new Promise((resolve, reject) => {
    let timeoutId = null;
    let isResolved = false;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const safeResolve = (value) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve(value);
    };

    const safeReject = (error) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      reject(error);
    };

    timeoutId = setTimeout(() => {
      safeReject(new Error('Timed out talking to background script'));
    }, 8000);

    // Include score data if available
    const payload = {
      action: 'jobHunter.createAirtableRecord',
      job: jobData
    };

    if (scoreResult) {
      payload.score = scoreResult;
    }

    try {
      // Check if extension context is still valid before making API call
      if (!isExtensionContextValid()) {
        handleInvalidContext();
        safeReject(new Error('Extension context invalidated. Please reload this page.'));
        return;
      }

      chrome.runtime.sendMessage(payload, (resp) => {
        // Check for Chrome runtime errors first
        const lastErr = chrome.runtime.lastError;
        if (lastErr) {
          console.error('[Job Hunter] Runtime error:', lastErr.message);
          safeReject(new Error(lastErr.message || 'Message failed'));
          return;
        }

        // Handle undefined response (background script didn't respond)
        if (resp === undefined) {
          safeReject(new Error('No response from background script'));
          return;
        }

        // Handle "processing in background" response (async processing)
        if (resp && resp.processing) {
          console.log('[Job Hunter] Job capture processing in background...');
          // Resolve immediately - actual result will come via jobCaptureComplete message
          safeResolve({ success: true, processing: true, message: resp.message });
          return;
        }

        // Handle immediate success/failure response (legacy path)
        if (resp && resp.success) {
          safeResolve(resp);
        } else {
          safeReject(new Error(resp?.error || 'Failed to save job'));
        }
      });
    } catch (err) {
      safeReject(new Error(`Send message error: ${err.message}`));
    }
  });
}

/**
 * Remove the overlay from the page
 */
function removeOverlay() {
  const overlay = document.getElementById('job-hunter-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Handle click on the capture button
 * @param {string} source - 'LinkedIn' or 'Indeed'
 * @param {HTMLButtonElement} button - The button element
 */
async function handleCaptureClick(source, button) {
  // Prevent double-clicks
  if (button.disabled) return;

  // Show loading state
  button.disabled = true;
  button.classList.add('loading');
  button.querySelector('span').textContent = 'Capturing...';

  try {
    // Extract job data based on source
    const jobData = source === 'LinkedIn'
      ? extractLinkedInJobData()
      : extractIndeedJobData();

    console.log('[Job Hunter] Extracted job data:', jobData);

    // Validate we got essential data
    if (!jobData.jobTitle || !jobData.companyName) {
      throw new Error('Could not extract job title or company name');
    }

    // Send to background script for Airtable submission with explicit error handling + timeout
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out talking to background script'));
      }, 8000);

      chrome.runtime.sendMessage(
        {
          action: 'jobHunter.createAirtableRecord',
          job: jobData
        },
        resp => {
          clearTimeout(timeout);
          const lastErr = chrome.runtime.lastError;
          if (lastErr) {
            reject(new Error(lastErr.message || 'Message failed'));
            return;
          }
          resolve(resp);
        }
      );
    });

    if (response && response.success) {
      console.log('[Job Hunter] Airtable saved:', {
        recordId: response.recordId,
        baseId: response.baseId,
        table: response.table
      });
      // Show success state
      button.classList.remove('loading');
      button.classList.add('success');
      button.querySelector('span').textContent = 'Job Captured!';

      // Reset button after 3 seconds
      setTimeout(() => {
        button.classList.remove('success');
        button.querySelector('span').textContent = 'Send to Job Hunter';
        button.disabled = false;
      }, 3000);
    } else {
      const statusNote = response?.status ? ` (status ${response.status})` : '';
      throw new Error((response && response.error ? `${response.error}${statusNote}` : 'Failed to save job'));
    }

  } catch (error) {
    console.error('[Job Hunter] Capture error:', error);

    // Show error state
    button.classList.remove('loading');
    button.classList.add('error');
    button.querySelector('span').textContent = error.message || 'Error - Try Again';

    // Reset button after 3 seconds
    setTimeout(() => {
      button.classList.remove('error');
      button.querySelector('span').textContent = 'Send to Job Hunter';
      button.disabled = false;
    }, 3000);
  }
}
