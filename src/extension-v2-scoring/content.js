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

// Prevent multiple injections
if (window.jobHunterInjected) {
  console.log('[Job Hunter] Already injected, skipping');
} else {
  window.jobHunterInjected = true;
  initJobHunter();
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
 * Initialize LinkedIn job page handling
 */
function handleLinkedIn() {
  // LinkedIn uses client-side routing, so we need to watch for URL changes
  let lastUrl = location.href;

  // Check immediately if we're on a job page
  if (isLinkedInJobPage()) {
    injectOverlay('LinkedIn');
  }

  // Watch for navigation changes (LinkedIn is a SPA)
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Remove existing overlay if present
      removeOverlay();
      // Check if new page is a job page
      if (isLinkedInJobPage()) {
        // Small delay to let page content load
        setTimeout(() => injectOverlay('LinkedIn'), 500);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
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
    descriptionText: '',
    jobUrl: window.location.href,
    source: 'LinkedIn'
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
    const salaryText = getTextFromSelectors(salarySelectors) || '';
    const salaryRange = parseSalaryRange(salaryText);
    data.salaryMin = salaryRange.min;
    data.salaryMax = salaryRange.max;

    // Job Description - the main description content
    const descriptionSelectors = [
      '.jobs-description__content',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '.description__text',
      '#job-details'
    ];
    data.descriptionText = getTextFromSelectors(descriptionSelectors, true) || '';

    // Fallback: parse salary from description when top-card insights are empty
    if (data.salaryMin === null && data.salaryMax === null && data.descriptionText) {
      const parsedFromDesc = findSalaryInText(data.descriptionText);
      if (parsedFromDesc.min !== null && parsedFromDesc.max !== null) {
        data.salaryMin = parsedFromDesc.min;
        data.salaryMax = parsedFromDesc.max;
      }
    }

    // Fallback: parse salary from description when top-card insights are empty
    if (data.salaryMin === null && data.salaryMax === null && data.descriptionText) {
      const descSalary = findSalaryInText(data.descriptionText);
      if (descSalary.min !== null && descSalary.max !== null) {
        data.salaryMin = descSalary.min;
        data.salaryMax = descSalary.max;
      }
    }

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

      // Salary fallback: if main selectors missed, try parsing here
      if (data.salaryMin === null || data.salaryMax === null) {
        const prefSalary = parseSalaryRange(text);
        if (prefSalary.min !== null && prefSalary.max !== null) {
          data.salaryMin = prefSalary.min;
          data.salaryMax = prefSalary.max;
        }
      }
    }

    // If no location but we know workplace type, use that (e.g., Remote)
    if (!data.location && data.workplaceType) {
      data.location = data.workplaceType;
    }

    // Flag if equity is mentioned in the description
    if (/equity|stock options?|rsus?/i.test(data.descriptionText || '')) {
      data.equityMentioned = true;
    }

    // Clean up the job URL - remove unnecessary parameters
    data.jobUrl = cleanLinkedInUrl(window.location.href);

  } catch (error) {
    console.error('[Job Hunter] Error extracting LinkedIn data:', error);
  }

  return data;
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
    jobUrl: window.location.href,
    source: 'Indeed'
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
    const salaryText = getTextFromSelectors(salarySelectors) || '';
    const salaryRange = parseSalaryRange(salaryText);
    data.salaryMin = salaryRange.min;
    data.salaryMax = salaryRange.max;

    // Job Description
    const descriptionSelectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText'
    ];
    data.descriptionText = getTextFromSelectors(descriptionSelectors, true) || '';

    // Salary fallback from description if primary fields are empty
    if (data.salaryMin === null && data.salaryMax === null && data.descriptionText) {
      const descSalary = findSalaryInText(data.descriptionText);
      if (descSalary.min !== null && descSalary.max !== null) {
        data.salaryMin = descSalary.min;
        data.salaryMax = descSalary.max;
      }
    }

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

    // Equity flag: avoid EEO/DEI boilerplate false positives
    if (data.descriptionText) {
      const desc = data.descriptionText.toLowerCase();
      const mentionsEquity = /equity|stock options?|rsus?/i.test(desc);
      const isDeiBoilerplate = /diversity[^.]{0,80}equity|equal opportunity employer/i.test(desc);
      if (mentionsEquity && !isDeiBoilerplate) {
        data.equityMentioned = true;
      }
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
 * Find salary information in descriptive text, gated by salary-related keywords to avoid false positives
 * @param {string} text - Full description text
 * @returns {{min: number|null, max: number|null}}
 */
function findSalaryInText(text) {
  const result = { min: null, max: null };
  if (!text) return result;

  const keywordRegex = /(salary|compensation|pay|base|range|total rewards)/i;
  const currencyRegex = /\$|usd/i;

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const tryParse = raw => {
    if (!raw || !currencyRegex.test(raw)) return null;
    const parsed = parseSalaryRange(raw);
    if (parsed.min !== null && parsed.max !== null) {
      return parsed;
    }
    return null;
  };

  // Pass 1: keyword line plus following context (handles multi-line labels + amounts)
  for (let i = 0; i < lines.length; i++) {
    if (!keywordRegex.test(lines[i])) continue;
    const block = [lines[i]];
    if (lines[i + 1]) block.push(lines[i + 1]);
    if (lines[i + 2]) block.push(lines[i + 2]);
    if (lines[i + 3]) block.push(lines[i + 3]); // allow two lines after header in case of blank separators
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
      console.error('[Job Hunter] Auto-score error:', error);
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
    const timeout = setTimeout(() => {
      reject(new Error('Timed out talking to background script'));
    }, 8000);

    // Include score data if available
    const payload = {
      action: 'jobHunter.createAirtableRecord',
      job: jobData
    };

    if (scoreResult) {
      payload.score = scoreResult;
    }

    chrome.runtime.sendMessage(payload, resp => {
      clearTimeout(timeout);
      const lastErr = chrome.runtime.lastError;
      if (lastErr) {
        reject(new Error(lastErr.message || 'Message failed'));
        return;
      }
      if (resp && resp.success) {
        resolve(resp);
      } else {
        reject(new Error(resp?.error || 'Failed to save job'));
      }
    });
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
