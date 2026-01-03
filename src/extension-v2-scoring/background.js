/**
 * Job Hunter OS - Background Service Worker
 *
 * Handles communication between content scripts and Airtable API:
 * - Listens for messages from content.js
 * - Retrieves credentials from Chrome local storage
 * - Creates/updates records in Companies, Contacts, and Jobs Pipeline tables (CRM model)
 * - Handles Outreach Mode record fetching and updates
 * - Returns success/failure response to content script
 */

// Storage keys (must match popup.js)
const STORAGE_KEYS = {
  BASE_ID: 'jh_airtable_base_id',
  PAT: 'jh_airtable_pat'
};

// Airtable API base URL
const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

// Table names in Airtable (URL encoded)
const TABLES = {
  JOBS_PIPELINE: 'Jobs%20Pipeline',
  COMPANIES: 'Companies',
  CONTACTS: 'Contacts',
  OUTREACH_LOG: 'Outreach%20Log'
};

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle job capture requests (with optional score data)
  if (request.action === 'jobHunter.createAirtableRecord') {
    console.log('[Job Hunter BG] Received message:', request.action);
    handleCreateTripleRecord(request.job, request.score)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handle Outreach Log record fetch
  if (request.action === 'jobHunter.fetchOutreachRecord') {
    console.log('[Job Hunter BG] Fetching Outreach Log record:', request.recordId);
    handleFetchOutreachRecord(request.recordId)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Handle Outreach Log "Mark as Sent" update
  if (request.action === 'jobHunter.markOutreachSent') {
    console.log('[Job Hunter BG] Marking outreach as sent:', request.recordId);
    handleMarkOutreachSent(request.recordId, request.contactRecordId)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
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
 * Create triple records in Airtable: Company, Contact (if hiring manager exists), and Job
 * Implements CRM-style relational data model
 *
 * @param {Object} jobData - Job data extracted from the page
 * @param {Object} scoreData - Optional score data from scoring engine
 * @returns {Promise<Object>} Result with success status and record IDs
 */
async function handleCreateTripleRecord(jobData, scoreData = null) {
  console.log('[Job Hunter BG] Creating triple record (Company, Contact, Job):', jobData);
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

  try {
    // STEP A: Upsert Company record
    const companyRecordId = await upsertCompany(credentials, jobData);
    console.log('[Job Hunter BG] Company record ID:', companyRecordId);

    // STEP B: Upsert Contact record (if hiring manager data exists)
    let contactRecordId = null;
    if (jobData.hiringManagerDetails?.name) {
      contactRecordId = await upsertContact(credentials, jobData, companyRecordId);
      console.log('[Job Hunter BG] Contact record ID:', contactRecordId);
    } else {
      console.log('[Job Hunter BG] No hiring manager data, skipping Contact creation');
    }

    // STEP C: Create Job record with links to Company and Contact
    const jobRecordId = await createJob(credentials, jobData, scoreData, companyRecordId, contactRecordId);
    console.log('[Job Hunter BG] Job record created:', jobRecordId);

    return {
      success: true,
      recordId: jobRecordId,
      companyRecordId,
      contactRecordId,
      baseId: credentials.baseId,
      table: 'Jobs Pipeline'
    };

  } catch (error) {
    console.error('[Job Hunter BG] Error creating triple record:', error);
    return {
      success: false,
      error: error.message || 'Failed to create records'
    };
  }
}

/**
 * Upsert (create or update) a Company record in Airtable
 * Uses Company Name as the unique identifier for upsert logic
 *
 * @param {Object} credentials - Airtable credentials
 * @param {Object} jobData - Job data containing company info
 * @returns {Promise<string>} Company record ID
 */
async function upsertCompany(credentials, jobData) {
  const companyName = jobData.companyName.trim();

  // First, search for existing company by name
  const searchUrl = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.COMPANIES}?filterByFormula=${encodeURIComponent(`{Company Name}='${companyName.replace(/'/g, "\\'")}'`)}`;

  const searchResponse = await fetchWithRetry(searchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${credentials.pat}`,
      'Content-Type': 'application/json'
    }
  });

  if (!searchResponse.ok) {
    throw new Error(`Failed to search for company: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const existingRecord = searchData.records?.[0];

  // Build company payload
  const companyFields = {
    'Company Name': companyName
  };

  // Add optional fields if available
  if (jobData.companyPageUrl) {
    companyFields['LinkedIn URL'] = jobData.companyPageUrl;
  }
  if (jobData.location) {
    companyFields['Location'] = jobData.location;
  }
  // Note: Industry, Size, Type, Website would need to be extracted from job description or company page
  // For now, we'll leave them empty and they can be enriched later

  if (existingRecord) {
    // Update existing company record
    console.log('[Job Hunter BG] Updating existing company:', existingRecord.id);
    const updateUrl = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.COMPANIES}/${existingRecord.id}`;

    const updateResponse = await fetchWithRetry(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${credentials.pat}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: companyFields })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update company: ${updateResponse.status}`);
    }

    const updateData = await updateResponse.json();
    return updateData.id;

  } else {
    // Create new company record
    console.log('[Job Hunter BG] Creating new company');
    const createUrl = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.COMPANIES}`;

    // DEBUG: Log payload before sending to Airtable
    console.log('[Job Hunter BG] Payload being sent to Airtable (Companies):', JSON.stringify({ fields: companyFields }, null, 2));

    const createResponse = await fetchWithRetry(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.pat}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: companyFields })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create company: ${createResponse.status}`);
    }

    const createData = await createResponse.json();
    return createData.id;
  }
}

/**
 * Upsert (create or update) a Contact record in Airtable
 * Uses LinkedIn URL as unique identifier, falls back to First Name + Last Name + Company
 *
 * @param {Object} credentials - Airtable credentials
 * @param {Object} jobData - Job data containing hiring manager info
 * @param {string} companyRecordId - ID of the linked Company record
 * @returns {Promise<string>} Contact record ID
 */
async function upsertContact(credentials, jobData, companyRecordId) {
  const hiringManager = jobData.hiringManagerDetails;

  if (!hiringManager?.name) {
    throw new Error('Hiring manager name is required for contact creation');
  }

  // Parse first and last name
  const nameParts = hiringManager.name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  // Search for existing contact by LinkedIn URL (if available) or by name + company
  let searchFormula;
  if (jobData.hiringManagerLinkedInUrl) {
    searchFormula = `{LinkedIn URL}='${jobData.hiringManagerLinkedInUrl.replace(/'/g, "\\'")}'`;
  } else {
    // Search by first name + last name + company link
    searchFormula = `AND({First Name}='${firstName.replace(/'/g, "\\'")}', {Last Name}='${lastName.replace(/'/g, "\\'")}')`;
  }

  const searchUrl = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.CONTACTS}?filterByFormula=${encodeURIComponent(searchFormula)}`;

  const searchResponse = await fetchWithRetry(searchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${credentials.pat}`,
      'Content-Type': 'application/json'
    }
  });

  if (!searchResponse.ok) {
    throw new Error(`Failed to search for contact: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const existingRecord = searchData.records?.[0];

  // Build contact payload
  const contactFields = {
    'First Name': firstName,
    'Last Name': lastName,
    'Companies': [companyRecordId] // LINKED RECORD - Links to Companies table
  };

  // Add optional fields
  if (hiringManager.title) {
    contactFields['Role / Title'] = hiringManager.title;
  }
  if (jobData.hiringManagerLinkedInUrl) {
    contactFields['LinkedIn URL'] = jobData.hiringManagerLinkedInUrl;
  }
  if (jobData.hiringManagerEmail) {
    contactFields['Email'] = jobData.hiringManagerEmail;
  }
  if (jobData.hiringManagerPhone) {
    contactFields['Phone / WhatsApp'] = jobData.hiringManagerPhone;
  }

  if (existingRecord) {
    // Update existing contact record
    console.log('[Job Hunter BG] Updating existing contact:', existingRecord.id);
    const updateUrl = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.CONTACTS}/${existingRecord.id}`;

    const updateResponse = await fetchWithRetry(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${credentials.pat}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: contactFields })
    });

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.json().catch(() => ({}));
      console.error('[Job Hunter BG] ❌ Contact update failed:', {
        status: updateResponse.status,
        statusText: updateResponse.statusText,
        errorMessage: errorBody.error?.message || 'No error message',
        invalidFields: errorBody.error?.invalidFieldsByName || {},
        sentPayload: contactFields
      });
      throw new Error(`Failed to update contact: ${updateResponse.status} - ${errorBody.error?.message || 'Unknown error'}`);
    }

    const updateData = await updateResponse.json();
    return updateData.id;

  } else {
    // Create new contact record
    console.log('[Job Hunter BG] Creating new contact');
    const createUrl = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.CONTACTS}`;

    // DEBUG: Log payload before sending to Airtable
    console.log('[Job Hunter BG] Payload being sent to Airtable (Contacts):', JSON.stringify({ fields: contactFields }, null, 2));

    const createResponse = await fetchWithRetry(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.pat}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: contactFields })
    });

    if (!createResponse.ok) {
      const errorBody = await createResponse.json().catch(() => ({}));
      console.error('[Job Hunter BG] ❌ Contact creation failed:', {
        status: createResponse.status,
        statusText: createResponse.statusText,
        errorMessage: errorBody.error?.message || 'No error message',
        invalidFields: errorBody.error?.invalidFieldsByName || {},
        sentPayload: contactFields
      });
      throw new Error(`Failed to create contact: ${createResponse.status} - ${errorBody.error?.message || 'Unknown error'}`);
    }

    const createData = await createResponse.json();
    return createData.id;
  }
}

/**
 * Create a Job record in Jobs Pipeline table with links to Company and Contact
 *
 * @param {Object} credentials - Airtable credentials
 * @param {Object} jobData - Job data
 * @param {Object} scoreData - Score data
 * @param {string} companyRecordId - ID of linked Company record
 * @param {string|null} contactRecordId - ID of linked Contact record (optional)
 * @returns {Promise<string>} Job record ID
 */
async function createJob(credentials, jobData, scoreData, companyRecordId, contactRecordId) {
  // Build the Airtable record payload
  // Field names must match exactly what's defined in Airtable
  const jobFields = {
    'Job Title': jobData.jobTitle,
    'Company Name': jobData.companyName, // TEXT field - company name as string
    'Companies': [companyRecordId], // LINKED RECORD field - array of record IDs
    'Job URL': jobData.jobUrl || '',
    'Location': jobData.location || '',
    'Source': jobData.source || 'LinkedIn',
    'Job Description': jobData.descriptionText || '',
    'Status': 'Captured'
  };

  // Link to Contact record if available
  if (contactRecordId) {
    jobFields['Contacts'] = [contactRecordId];
  }

  // Add salary fields only if they have values
  if (jobData.salaryMin !== null && jobData.salaryMin !== undefined) {
    jobFields['Salary Min'] = jobData.salaryMin;
  }
  if (jobData.salaryMax !== null && jobData.salaryMax !== undefined) {
    jobFields['Salary Max'] = jobData.salaryMax;
  }
  if (jobData.workplaceType) {
    jobFields['Workplace Type'] = jobData.workplaceType;
  }
  if (jobData.employmentType) {
    jobFields['Employment Type'] = jobData.employmentType;
  }
  if (jobData.equityMentioned !== undefined) {
    jobFields['Equity Mentioned'] = !!jobData.equityMentioned;
  }
  if (jobData.bonusMentioned !== undefined) {
    jobFields['Bonus Mentioned'] = !!jobData.bonusMentioned;
  }
  if (jobData.companyPageUrl) {
    jobFields['Company Page'] = jobData.companyPageUrl;
  }

  // Add score data if available
  if (scoreData) {
    if (scoreData.overall_score !== undefined) {
      jobFields['Overall Fit Score'] = scoreData.overall_score;
    }
    if (scoreData.overall_label) {
      // Map the label to valid Airtable select options
      const validFitOptions = ['STRONG FIT', 'GOOD FIT', 'MODERATE FIT', 'FAIR FIT', 'WEAK FIT', 'POOR FIT', 'HARD NO'];
      let fitLabel = scoreData.overall_label.toUpperCase().trim();

      if (!validFitOptions.includes(fitLabel)) {
        if (fitLabel.includes('STRONG')) fitLabel = 'STRONG FIT';
        else if (fitLabel.includes('GOOD')) fitLabel = 'GOOD FIT';
        else if (fitLabel.includes('MODERATE') || fitLabel.includes('FAIR')) fitLabel = 'GOOD FIT';
        else if (fitLabel.includes('WEAK')) fitLabel = 'WEAK FIT';
        else if (fitLabel.includes('POOR')) fitLabel = 'POOR FIT';
        else if (fitLabel.includes('HARD') || fitLabel.includes('NO')) fitLabel = 'HARD NO';
        else fitLabel = 'GOOD FIT';
        console.log(`[Job Hunter BG] Mapped "${scoreData.overall_label}" to "${fitLabel}" for Airtable`);
      }

      jobFields['Fit Recommendation'] = fitLabel;
    }
    if (scoreData.job_to_user_fit?.score !== undefined) {
      jobFields['Preference Fit Score'] = scoreData.job_to_user_fit.score;
    }
    if (scoreData.user_to_job_fit?.score !== undefined) {
      jobFields['Role Fit Score'] = scoreData.user_to_job_fit.score;
    }

    // Extract matched and missing skills from breakdown
    const skillsBreakdown = scoreData.user_to_job_fit?.breakdown?.find(b => b.criteria === 'Skills Overlap');
    if (skillsBreakdown?.matched_skills && skillsBreakdown.matched_skills.length > 0) {
      // Convert array to comma-separated string for Long text field
      jobFields['Matched Skills'] = skillsBreakdown.matched_skills.join(', ');
    }
    if (skillsBreakdown?.unmatched_skills && skillsBreakdown.unmatched_skills.length > 0) {
      // Convert array to comma-separated string for Long text field
      jobFields['Missing Skills'] = skillsBreakdown.unmatched_skills.join(', ');
    }

    // Store deal-breaker reason if triggered
    if (scoreData.deal_breaker_triggered) {
      // Convert to comma-separated string for Long text field
      const dealbreakers = Array.isArray(scoreData.deal_breaker_triggered)
        ? scoreData.deal_breaker_triggered
        : [scoreData.deal_breaker_triggered];
      jobFields['Triggered Dealbreakers'] = dealbreakers.join(', ');
    }
  }

  // Create the job record
  const createUrl = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.JOBS_PIPELINE}`;

  // DEBUG: Log payload before sending to Airtable
  console.log('[Job Hunter BG] Payload being sent to Airtable (Jobs Pipeline):', JSON.stringify({ fields: jobFields }, null, 2));

  const createResponse = await fetchWithRetry(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.pat}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: jobFields })
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('[Job Hunter BG] Job creation error:', errorText);
    throw new Error(`Failed to create job: ${createResponse.status}`);
  }

  const createData = await createResponse.json();
  return createData.id;
}

/**
 * Fetch an Outreach Log record by ID
 * Used in Outreach Mode to display outreach message
 *
 * @param {string} recordId - Airtable record ID
 * @returns {Promise<Object>} Outreach Log record data
 */
async function handleFetchOutreachRecord(recordId) {
  const credentials = await getCredentials();

  if (!credentials.baseId || !credentials.pat) {
    return { success: false, error: 'Airtable credentials not configured' };
  }

  try {
    const url = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.OUTREACH_LOG}/${recordId}`;

    const response = await fetchWithRetry(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.pat}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch outreach record: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      record: data
    };

  } catch (error) {
    console.error('[Job Hunter BG] Error fetching outreach record:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Mark an Outreach Log record as sent
 * Updates both Outreach Log and linked Contact record
 *
 * @param {string} outreachRecordId - Outreach Log record ID
 * @param {string} contactRecordId - Contact record ID (from linked Contact field)
 * @returns {Promise<Object>} Success status
 */
async function handleMarkOutreachSent(outreachRecordId, contactRecordId) {
  const credentials = await getCredentials();

  if (!credentials.baseId || !credentials.pat) {
    return { success: false, error: 'Airtable credentials not configured' };
  }

  try {
    const now = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Update Outreach Log record
    const outreachUrl = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.OUTREACH_LOG}/${outreachRecordId}`;

    const outreachResponse = await fetchWithRetry(outreachUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${credentials.pat}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Outreach Status': 'Sent',
          'Sent Date': now
        }
      })
    });

    if (!outreachResponse.ok) {
      throw new Error(`Failed to update outreach record: ${outreachResponse.status}`);
    }

    // Update Contact record if contactRecordId is provided
    if (contactRecordId) {
      const contactUrl = `${AIRTABLE_API_BASE}/${credentials.baseId}/${TABLES.CONTACTS}/${contactRecordId}`;

      const contactResponse = await fetchWithRetry(contactUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${credentials.pat}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: {
            'Last Outreach Date': now
            // Note: Next Follow-Up Date could be calculated based on Follow-Up Interval if needed
          }
        })
      });

      if (!contactResponse.ok) {
        console.warn('[Job Hunter BG] Failed to update contact record, but outreach was marked as sent');
      }
    }

    return {
      success: true,
      message: 'Outreach marked as sent'
    };

  } catch (error) {
    console.error('[Job Hunter BG] Error marking outreach as sent:', error);
    return {
      success: false,
      error: error.message
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
console.log('[Job Hunter BG] Background service worker initialized with CRM support');
