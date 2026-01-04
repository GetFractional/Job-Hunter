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

// ===========================
// AIRTABLE DATA SANITIZATION
// ===========================

/**
 * Sanitize string values for Airtable - removes quotes and escapes that cause 422 errors
 * CRITICAL: Handles multiple levels of stringification (e.g., "\"MODERATE FIT\"" → "MODERATE FIT")
 * @param {string} value - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;

  // Remove ALL quote characters (both regular and escaped) recursively
  let sanitized = value;
  let previousValue;

  // Keep removing quotes until no more are found (handles nested stringification)
  do {
    previousValue = sanitized;
    sanitized = sanitized
      .replace(/^["']+|["']+$/g, '')  // Remove leading/trailing quotes
      .replace(/\\"/g, '')             // Remove escaped quotes \"
      .replace(/\\'/g, '')             // Remove escaped single quotes \'
      .trim();
  } while (sanitized !== previousValue && sanitized.length > 0);

  return sanitized;
}

/**
 * Convert headcount number to size category for Airtable Single Select
 * CRITICAL: Must return EXACT Airtable option values (no "employees" suffix, no commas)
 * Valid options: "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"
 * @param {number} headcount - Employee count
 * @returns {string|null} Size category matching Airtable dropdown options
 */
function mapHeadcountToSize(headcount) {
  if (!headcount || headcount <= 0) return null;
  if (headcount <= 10) return '1-10';
  if (headcount <= 50) return '11-50';
  if (headcount <= 200) return '51-200';
  if (headcount <= 500) return '201-500';
  if (headcount <= 1000) return '501-1000';
  if (headcount <= 5000) return '1001-5000';
  if (headcount <= 10000) return '5001-10000';
  return '10000+';
}

/**
 * Convert percentage string (e.g., "+11%") to decimal for Airtable Percent field
 * @param {string} percentString - Percentage string like "+11%" or "11%"
 * @returns {number|null} Decimal value (e.g., 0.11 for 11%)
 */
function parsePercentToDecimal(percentString) {
  if (!percentString || typeof percentString !== 'string') return null;
  const match = percentString.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;
  const percentage = parseFloat(match[1]);
  return percentage / 100; // Convert to decimal
}

/**
 * Ensure value is a proper number for Airtable Number field
 * @param {any} value - Value to convert
 * @returns {number|null} Number or null
 */
function ensureNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Ping check for service worker health
  if (request.action === 'jobHunter.ping') {
    sendResponse({ alive: true });
    return true;
  }

  // Handle job capture requests (with optional score data)
  if (request.action === 'jobHunter.createAirtableRecord') {
    console.log('[Job Hunter BG] ⚡ Received job capture request');

    // CRITICAL: Respond immediately to prevent timeout
    // Content script has 5-second timeout, but Airtable API calls can take longer
    sendResponse({
      success: null,
      processing: true,
      message: 'Processing job capture in background...'
    });

    // Process asynchronously in background (don't await)
    const startTime = Date.now();
    console.log('[Job Hunter BG] 🚀 Starting background processing at', new Date().toISOString());

    handleCreateTripleRecord(request.job, request.score)
      .then(result => {
        const elapsed = Date.now() - startTime;
        console.log('[Job Hunter BG] ✅ Background processing COMPLETE in', elapsed, 'ms');
        console.log('[Job Hunter BG] SUCCESS - Result:', result);

        // CRITICAL: Notify content script of SUCCESS so button can update
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'jobCaptureComplete',
          success: true,
          recordId: result.recordId,
          companyRecordId: result.companyRecordId,
          contactRecordId: result.contactRecordId,
          message: 'Job successfully captured to Airtable!'
        }).catch(err => {
          console.log('[Job Hunter BG] ⚠️ Could not notify content script of success (tab may be closed)');
        });
      })
      .catch(error => {
        const elapsed = Date.now() - startTime;
        console.error('[Job Hunter BG] ❌ Background processing FAILED in', elapsed, 'ms');
        console.error('[Job Hunter BG] ERROR:', error.message);

        // CRITICAL: Notify content script of FAILURE so button can show error
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'jobCaptureComplete',
          success: false,
          error: error.message || 'Failed to save job to Airtable'
        }).catch(err => {
          console.log('[Job Hunter BG] ⚠️ Could not notify content script of error (tab may be closed)');
        });
      });

    // Return true to indicate we handled the message
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
    console.log('[Job Hunter BG] ✓ Company record ID:', companyRecordId);

    // HUMAN-SPEED DELAY: Prevent LinkedIn throttling (critical for account safety)
    console.log('[Job Hunter BG] ⏳ Waiting 1.5s before next API call...');
    await delay(1500);

    // STEP B: Upsert Contact record (if hiring manager data exists)
    let contactRecordId = null;
    if (jobData.hiringManagerDetails?.name) {
      contactRecordId = await upsertContact(credentials, jobData, companyRecordId);
      if (contactRecordId) {
        console.log('[Job Hunter BG] ✓ Contact record ID:', contactRecordId);

        // HUMAN-SPEED DELAY: Prevent LinkedIn throttling
        console.log('[Job Hunter BG] ⏳ Waiting 1.5s before next API call...');
        await delay(1500);
      } else {
        console.log('[Job Hunter BG] ℹ️ Contact creation skipped (validation rejected fake contact)');
      }
    } else {
      console.log('[Job Hunter BG] ℹ️ No hiring manager data, skipping Contact creation');
    }

    // STEP C: Create Job record with links to Company and Contact
    const jobRecordId = await createJob(credentials, jobData, scoreData, companyRecordId, contactRecordId);
    console.log('[Job Hunter BG] ✓ Job record created:', jobRecordId);

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

  // Build company payload with ONLY fields that exist in Companies table schema
  const companyFields = {
    'Company Name': sanitizeString(companyName)
  };

  // CRITICAL: Only include fields that actually exist in your Companies Airtable schema
  // DO NOT send: Total Employees, Growth, Median Employee Tenure, Followers
  // Those fields don't exist in Companies table - they would cause 422 errors!

  // LinkedIn URL (exists in Companies schema)
  if (jobData.companyPageUrl) {
    companyFields['LinkedIn URL'] = sanitizeString(jobData.companyPageUrl);
    console.log('[Job Hunter BG] ✓ LinkedIn URL:', jobData.companyPageUrl);
  }

  // Location (exists in Companies schema)
  if (jobData.location) {
    companyFields['Location'] = sanitizeString(jobData.location);
    console.log('[Job Hunter BG] ✓ Location:', jobData.location);
  }

  // Industry (exists in Companies schema)
  if (jobData.industry) {
    companyFields['Industry'] = sanitizeString(jobData.industry);
    console.log('[Job Hunter BG] ✓ Industry:', jobData.industry);
  }

  // Website (exists in Companies schema)
  if (jobData.website) {
    companyFields['Website'] = sanitizeString(jobData.website);
    console.log('[Job Hunter BG] ✓ Website:', jobData.website);
  }

  // Company Type (exists in Companies schema - Single Select)
  // Valid options must match Airtable dropdown (e.g., "Public Company", "Privately Held", etc.)
  if (jobData.companyType) {
    companyFields['Type'] = sanitizeString(jobData.companyType);
    console.log('[Job Hunter BG] ✓ Company Type:', jobData.companyType);
  }

  // Company Description (exists in Companies schema - Long Text)
  if (jobData.companyDescription) {
    companyFields['Company Description'] = sanitizeString(jobData.companyDescription);
    console.log('[Job Hunter BG] ✓ Company Description:', jobData.companyDescription.substring(0, 100) + '...');
  }

  // Size (exists in Companies schema - Single Select)
  // Map from headcount if available
  const totalEmployees = ensureNumber(jobData.companyHeadcount || jobData.totalEmployees);
  if (totalEmployees !== null && totalEmployees > 0) {
    const sizeCategory = mapHeadcountToSize(totalEmployees);
    if (sizeCategory) {
      companyFields['Size'] = sizeCategory;
      console.log('[Job Hunter BG] ✓ Size:', sizeCategory, '(from', totalEmployees, 'employees)');
    }
  }

  console.log('[Job Hunter BG] === Companies Table Payload (schema-validated) ===');
  console.log(JSON.stringify(companyFields, null, 2));

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
      const errorBody = await updateResponse.json().catch(() => ({}));
      console.error('[Job Hunter BG] ❌ Company UPDATE failed (422):', {
        status: updateResponse.status,
        error: errorBody.error,
        sentPayload: companyFields
      });
      throw new Error(`Failed to update company: ${updateResponse.status} - ${JSON.stringify(errorBody.error)}`);
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
      const errorBody = await createResponse.json().catch(() => ({}));
      console.error('[Job Hunter BG] ❌ Company CREATE failed (422):', {
        status: createResponse.status,
        error: errorBody.error,
        sentPayload: companyFields
      });
      throw new Error(`Failed to create company: ${createResponse.status} - ${JSON.stringify(errorBody.error)}`);
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

  // CRITICAL: If no hiring manager found, return null - do NOT create fake "John Doe" contact
  if (!hiringManager?.name) {
    console.log('[Job Hunter BG] No hiring manager found - skipping contact creation');
    return null;
  }

  // CRITICAL: Validate this is a real person name, not a generic placeholder or company name
  const invalidNames = [
    'hiring manager',
    'hiring team',
    'recruiter',
    'hr manager',
    'human resources',
    'talent acquisition',
    'john doe',
    'jane doe',
    'unknown',
    'n/a',
    'na',
    'not available'
  ];

  const normalizedName = hiringManager.name.toLowerCase().trim();
  const normalizedCompanyName = jobData.companyName.toLowerCase().trim();

  // CRITICAL: Reject if hiring manager name equals company name (fake contact detection)
  if (normalizedName === normalizedCompanyName) {
    console.log('[Job Hunter BG] ❌ REJECTED fake contact - hiring manager name matches company name:', hiringManager.name);
    return null;
  }

  if (invalidNames.includes(normalizedName)) {
    console.log('[Job Hunter BG] ❌ REJECTED invalid hiring manager name:', hiringManager.name);
    return null;
  }

  // Parse actual hiring manager name
  const nameParts = hiringManager.name.trim().split(' ');
  const firstName = sanitizeString(nameParts[0] || '');
  const lastName = sanitizeString(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');

  // CRITICAL: Reject if no last name (likely a company name, not a person)
  if (!lastName || lastName.length === 0) {
    console.log('[Job Hunter BG] ❌ REJECTED potential fake contact - no last name (single word name):', hiringManager.name);
    return null;
  }

  // Validate we have at least a first name after sanitization
  if (!firstName || firstName.length < 2) {
    console.log('[Job Hunter BG] ❌ REJECTED invalid hiring manager name after parsing:', hiringManager.name);
    return null;
  }

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
    'Companies': [companyRecordId], // LINKED RECORD - Links to Companies table
    'Contact Type': 'Hiring Manager' // Always set to Hiring Manager by default
  };

  // Add optional fields (all sanitized)
  if (hiringManager?.title) {
    contactFields['Role / Title'] = sanitizeString(hiringManager.title);
  }
  if (jobData.hiringManagerLinkedInUrl) {
    contactFields['LinkedIn URL'] = sanitizeString(jobData.hiringManagerLinkedInUrl);
  }
  if (jobData.hiringManagerEmail) {
    contactFields['Email'] = sanitizeString(jobData.hiringManagerEmail);
  }
  if (jobData.hiringManagerPhone) {
    contactFields['Phone / WhatsApp'] = sanitizeString(jobData.hiringManagerPhone);
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
  // Build the Airtable record payload (all strings sanitized)
  // Field names must match exactly what's defined in Airtable
  const jobFields = {
    'Job Title': sanitizeString(jobData.jobTitle),
    'Company Name': sanitizeString(jobData.companyName), // TEXT field - company name as string
    'Companies': [companyRecordId], // LINKED RECORD field - array of record IDs
    'Job URL': sanitizeString(jobData.jobUrl || ''),
    'Location': sanitizeString(jobData.location || ''),
    'Source': sanitizeString(jobData.source || 'LinkedIn'),
    'Job Description': sanitizeString(jobData.descriptionText || ''),
    'Status': 'Captured'
  };

  // Link to Contact record if available (OPTIONAL - job can exist without contact)
  if (contactRecordId) {
    jobFields['Contacts'] = [contactRecordId];
    console.log('[Job Hunter BG] ✓ Linking job to contact:', contactRecordId);
  } else {
    console.log('[Job Hunter BG] ℹ️ No contact to link - job will be created without hiring manager');
  }

  // Add salary fields only if they have valid numeric values (OPTIONAL - job can exist without salary)
  try {
    if (jobData.salaryMin !== null && jobData.salaryMin !== undefined) {
      const salaryMin = typeof jobData.salaryMin === 'number'
        ? jobData.salaryMin
        : parseFloat(String(jobData.salaryMin).replace(/[^0-9.-]/g, ''));

      if (!isNaN(salaryMin) && salaryMin > 0) {
        jobFields['Salary Min'] = salaryMin;
        console.log('[Job Hunter BG] ✓ Salary Min:', salaryMin);
      }
    }
  } catch (e) {
    console.log('[Job Hunter BG] ⚠️ Failed to parse Salary Min:', e.message);
  }

  try {
    if (jobData.salaryMax !== null && jobData.salaryMax !== undefined) {
      const salaryMax = typeof jobData.salaryMax === 'number'
        ? jobData.salaryMax
        : parseFloat(String(jobData.salaryMax).replace(/[^0-9.-]/g, ''));

      if (!isNaN(salaryMax) && salaryMax > 0) {
        jobFields['Salary Max'] = salaryMax;
        console.log('[Job Hunter BG] ✓ Salary Max:', salaryMax);
      }
    }
  } catch (e) {
    console.log('[Job Hunter BG] ⚠️ Failed to parse Salary Max:', e.message);
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

  // Add score data if available (OPTIONAL - job can exist without scores)
  if (scoreData) {
    try {
      if (scoreData.overall_score !== undefined) {
        jobFields['Overall Fit Score'] = scoreData.overall_score;
        console.log('[Job Hunter BG] ✓ Overall Fit Score:', scoreData.overall_score);
      }
    } catch (e) {
      console.log('[Job Hunter BG] ⚠️ Failed to parse Overall Fit Score:', e.message);
    }

    try {
      if (scoreData.overall_label) {
        // CRITICAL: Sanitize FIRST to remove any quotes/escapes, then process
        let rawLabel = String(scoreData.overall_label);
        let fitLabel = sanitizeString(rawLabel).toUpperCase().trim();

        console.log('[Job Hunter BG] 🔍 Processing Fit Recommendation:', {
          raw: rawLabel,
          afterSanitization: fitLabel
        });

        // Map the label to valid Airtable select options
        const validFitOptions = ['STRONG FIT', 'GOOD FIT', 'MODERATE FIT', 'FAIR FIT', 'WEAK FIT', 'POOR FIT', 'HARD NO'];

        if (!validFitOptions.includes(fitLabel)) {
          if (fitLabel.includes('STRONG')) fitLabel = 'STRONG FIT';
          else if (fitLabel.includes('GOOD')) fitLabel = 'GOOD FIT';
          else if (fitLabel.includes('MODERATE')) fitLabel = 'MODERATE FIT';
          else if (fitLabel.includes('FAIR')) fitLabel = 'FAIR FIT';
          else if (fitLabel.includes('WEAK')) fitLabel = 'WEAK FIT';
          else if (fitLabel.includes('POOR')) fitLabel = 'POOR FIT';
          else if (fitLabel.includes('HARD') || fitLabel.includes('NO')) fitLabel = 'HARD NO';
          else fitLabel = 'GOOD FIT';
          console.log(`[Job Hunter BG] ℹ️ Mapped "${rawLabel}" → "${fitLabel}"`);
        }

        // CRITICAL: Do NOT sanitize again - it's already been sanitized above
        jobFields['Fit Recommendation'] = fitLabel;
        console.log('[Job Hunter BG] ✓ Fit Recommendation:', fitLabel);
      }
    } catch (e) {
      console.log('[Job Hunter BG] ⚠️ Failed to process Fit Recommendation:', e.message);
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
