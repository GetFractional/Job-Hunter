/**
 * Job Hunter OS - Background Service Worker
 *
 * Handles communication between content scripts and Airtable API:
 * - Listens for messages from content.js
 * - Retrieves credentials from Chrome local storage
 * - POSTs job data to Airtable Jobs Pipeline table
 * - Returns success/failure response to content script
 */

// Storage keys (must match popup.js)
const STORAGE_KEYS = {
  BASE_ID: 'jh_airtable_base_id',
  PAT: 'jh_airtable_pat'
};

// Airtable API base URL
const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

// Table name in Airtable (URL encoded)
const TABLE_NAME = 'Jobs%20Pipeline';

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle job capture requests (with optional score data)
  if (request.action === 'jobHunter.createAirtableRecord') {
    console.log('[Job Hunter BG] Received message:', request.action);
    handleCreateRecord(request.job, request.score)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));

    // Return true to indicate we'll send response asynchronously
    return true;
  }

  // Handle profile check requests
  if (request.action === 'jobHunter.checkProfile') {
    chrome.storage.local.get(['jh_user_profile'], (result) => {
      sendResponse({
        hasProfile: !!result.jh_user_profile,
        profile: result.jh_user_profile || null
      });
    });
    return true;
  }
});

/**
 * Create a new record in Airtable Jobs Pipeline table
 * @param {Object} jobData - Job data extracted from the page
 * @param {Object} scoreData - Optional score data from scoring engine
 * @returns {Promise<Object>} Result with success status and record ID or error
 */
async function handleCreateRecord(jobData, scoreData = null) {
  console.log('[Job Hunter BG] Creating Airtable record:', jobData);
  if (scoreData) {
    console.log('[Job Hunter BG] Including score data:', scoreData.overall_score, scoreData.overall_label);
  }

  // Get credentials from storage
  const credentials = await getCredentials();

  if (!credentials.baseId || !credentials.pat) {
    console.error('[Job Hunter BG] Missing credentials');
    return {
      success: false,
      error: 'Please configure Airtable settings in the extension popup'
    };
  }

  // Validate required fields
  if (!jobData.jobTitle) {
    return { success: false, error: 'Job title is required' };
  }
  if (!jobData.companyName) {
    return { success: false, error: 'Company name is required' };
  }

  // Build the Airtable record payload
  // Field names must match exactly what's defined in Airtable
  const airtablePayload = {
    fields: {
      'Job Title': jobData.jobTitle,
      'Company Name': jobData.companyName,
      'Job URL': jobData.jobUrl || '',
      'Location': jobData.location || '',
      'Source': jobData.source || 'LinkedIn',
      'Job Description': jobData.descriptionText || '',
      'Status': 'Captured'
    }
  };

  // Add salary fields only if they have values
  // Airtable expects numbers for number fields, not empty strings
  if (jobData.salaryMin !== null && jobData.salaryMin !== undefined) {
    airtablePayload.fields['Salary Min'] = jobData.salaryMin;
  }
  if (jobData.salaryMax !== null && jobData.salaryMax !== undefined) {
    airtablePayload.fields['Salary Max'] = jobData.salaryMax;
  }
  if (jobData.workplaceType) {
    airtablePayload.fields['Workplace Type'] = jobData.workplaceType;
  }
  if (jobData.employmentType) {
    airtablePayload.fields['Employment Type'] = jobData.employmentType;
  }
  if (jobData.equityMentioned !== undefined) {
    airtablePayload.fields['Equity Mentioned'] = !!jobData.equityMentioned;
  }
  if (jobData.companyPageUrl) {
    airtablePayload.fields['Company Page'] = jobData.companyPageUrl;
  }

  // Add score data if available
  // Field mappings match the user's actual Airtable schema:
  // - "Overall Fit Score" (Number): Overall 0-100 score
  // - "Preference Fit Score" (Number): Job-to-User 0-50 score (how well job meets user's needs)
  // - "Role Fit Score" (Number): User-to-Job 0-50 score (how well user matches job)
  // - "Fit Recommendation" (Single Select): Must match existing options in Airtable
  // - "Matched Skills" (Long Text): Skills that matched between user and job
  // - "Missing Skills" (Long Text): Skills the job requires that user may lack
  // - "Triggered Dealbreakers" (Long Text): Any deal-breakers that were triggered
  if (scoreData) {
    if (scoreData.overall_score !== undefined) {
      airtablePayload.fields['Overall Fit Score'] = scoreData.overall_score;
    }
    if (scoreData.overall_label) {
      // Map the label to valid Airtable select options
      // Airtable select fields have predefined options that must match exactly
      const validFitOptions = ['STRONG FIT', 'GOOD FIT', 'MODERATE FIT', 'FAIR FIT', 'WEAK FIT', 'POOR FIT', 'HARD NO'];
      let fitLabel = scoreData.overall_label.toUpperCase().trim();

      // If the exact label isn't valid, map to a valid option
      if (!validFitOptions.includes(fitLabel)) {
        // Try to find the closest match
        if (fitLabel.includes('STRONG')) fitLabel = 'STRONG FIT';
        else if (fitLabel.includes('GOOD')) fitLabel = 'GOOD FIT';
        else if (fitLabel.includes('MODERATE') || fitLabel.includes('FAIR')) fitLabel = 'GOOD FIT'; // Safe fallback
        else if (fitLabel.includes('WEAK')) fitLabel = 'WEAK FIT';
        else if (fitLabel.includes('POOR')) fitLabel = 'POOR FIT';
        else if (fitLabel.includes('HARD') || fitLabel.includes('NO')) fitLabel = 'HARD NO';
        else fitLabel = 'GOOD FIT'; // Ultimate fallback
        console.log(`[Job Hunter BG] Mapped "${scoreData.overall_label}" to "${fitLabel}" for Airtable`);
      }

      airtablePayload.fields['Fit Recommendation'] = fitLabel;
    }
    if (scoreData.job_to_user_fit?.score !== undefined) {
      airtablePayload.fields['Preference Fit Score'] = scoreData.job_to_user_fit.score;
    }
    if (scoreData.user_to_job_fit?.score !== undefined) {
      airtablePayload.fields['Role Fit Score'] = scoreData.user_to_job_fit.score;
    }
    // Extract matched and missing skills from breakdown
    const skillsBreakdown = scoreData.user_to_job_fit?.breakdown?.find(b => b.criteria === 'Skills Overlap');
    if (skillsBreakdown?.matched_skills && skillsBreakdown.matched_skills.length > 0) {
      airtablePayload.fields['Matched Skills'] = skillsBreakdown.matched_skills.join(', ');
    }
    if (skillsBreakdown?.unmatched_skills && skillsBreakdown.unmatched_skills.length > 0) {
      airtablePayload.fields['Missing Skills'] = skillsBreakdown.unmatched_skills.join(', ');
    }
    // Store interpretation summary in a notes field if available
    if (scoreData.interpretation?.summary) {
      // Combine summary and action for a complete picture
      const summaryText = [
        scoreData.interpretation.summary,
        scoreData.interpretation.action ? `Action: ${scoreData.interpretation.action}` : ''
      ].filter(Boolean).join('\n');
      // Only add if there's a field for it (optional)
      // airtablePayload.fields['Score Summary'] = summaryText;
    }
    // Store deal-breaker reason if triggered
    if (scoreData.deal_breaker_triggered) {
      airtablePayload.fields['Triggered Dealbreakers'] = scoreData.deal_breaker_triggered;
    }
  }

  // Make the API request
  try {
    console.log('[Job Hunter BG] Sending request to Airtable...', {
      baseId: credentials.baseId,
      table: 'Jobs Pipeline'
    });
    const response = await fetchWithRetry(
      `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLE_NAME}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.pat}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(airtablePayload)
      }
    );

    console.log('[Job Hunter BG] Airtable response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('[Job Hunter BG] Record created successfully:', {
        recordId: data.id,
        baseId: credentials.baseId,
        table: 'Jobs Pipeline'
      });
      return {
        success: true,
        recordId: data.id,
        baseId: credentials.baseId,
        table: 'Jobs Pipeline'
      };
    }

    // Handle specific error cases
    let errorData = {};
    try {
      // Clone before reading to keep original response available if needed
      const cloned = response.clone();
      const text = await cloned.text();
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { error: { message: text || 'No error message returned' } };
      }
    } catch (parseErr) {
      console.warn('[Job Hunter BG] Could not parse Airtable error body:', parseErr);
    }

    console.error('[Job Hunter BG] Airtable API error:', response.status, errorData);

    if (response.status === 401) {
      return { success: false, error: 'Invalid API token. Check your settings.' };
    }
    if (response.status === 403) {
      return { success: false, error: 'Access denied. Check token permissions.' };
    }
    if (response.status === 404) {
      return { success: false, error: 'Table not found. Ensure "Jobs Pipeline" exists.' };
    }
    if (response.status === 422) {
      // Validation error - likely field name mismatch
      const fieldError = errorData.error?.message || 'Invalid field data';
      return { success: false, error: `Validation error: ${fieldError}` };
    }

    return {
      success: false,
      error: errorData.error?.message || `API error: ${response.status}`,
      status: response.status
    };

  } catch (error) {
    console.error('[Job Hunter BG] Network error:', error);
    return {
      success: false,
      error: 'Network error. Check your internet connection.'
    };
  }
}

/**
 * Retrieve Airtable credentials from Chrome local storage
 * @returns {Promise<Object>} { baseId: string, pat: string }
 */
async function getCredentials() {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.BASE_ID,
      STORAGE_KEYS.PAT
    ]);

    return {
      baseId: result[STORAGE_KEYS.BASE_ID] || '',
      pat: result[STORAGE_KEYS.PAT] || ''
    };
  } catch (error) {
    console.error('[Job Hunter BG] Error reading credentials:', error);
    return { baseId: '', pat: '' };
  }
}

/**
 * Fetch with automatic retry for transient failures
 * Implements exponential backoff: 1s, 2s, 4s
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry client errors (4xx) - they won't succeed on retry
      // Do retry server errors (5xx) and rate limits (429)
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }

      // Server error or rate limit - retry
      if (response.status === 429 || response.status >= 500) {
        console.log(`[Job Hunter BG] Retry ${attempt + 1}/${maxRetries} after ${response.status}`);
        await delay(Math.pow(2, attempt) * 1000); // 1s, 2s, 4s
        continue;
      }

      return response;

    } catch (error) {
      lastError = error;
      console.log(`[Job Hunter BG] Network error, retry ${attempt + 1}/${maxRetries}`);

      if (attempt < maxRetries - 1) {
        await delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Simple delay helper
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Log when service worker starts
console.log('[Job Hunter BG] Background service worker initialized');
