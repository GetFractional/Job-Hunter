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
  // Handle job capture requests
  if (request.action === 'jobHunter.createAirtableRecord') {
    handleCreateRecord(request.job)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));

    // Return true to indicate we'll send response asynchronously
    return true;
  }
});

/**
 * Create a new record in Airtable Jobs Pipeline table
 * @param {Object} jobData - Job data extracted from the page
 * @returns {Promise<Object>} Result with success status and record ID or error
 */
async function handleCreateRecord(jobData) {
  console.log('[Job Hunter BG] Creating Airtable record:', jobData);

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

  // Make the API request
  try {
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

    if (response.ok) {
      const data = await response.json();
      console.log('[Job Hunter BG] Record created successfully:', data.id);
      return {
        success: true,
        recordId: data.id
      };
    }

    // Handle specific error cases
    const errorData = await response.json().catch(() => ({}));
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
      error: errorData.error?.message || `API error: ${response.status}`
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
