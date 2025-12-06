# JOB HUNTER™ OPERATING SYSTEM – COMPLETE MASTER BLUEPRINT

**Version 2.0 – Production Ready**
**Last Updated: November 29, 2025**
**Status: Ready for Immediate Execution**

---

## TABLE OF CONTENTS

1. **Executive Summary**
2. **System Architecture (Complete Diagram)**
3. **Data Model & Schema (jobPayload JSON)**
4. **Chrome Extension (All 6 Files – Copy/Paste Ready)**
5. **Backend Infrastructure (Node.js Webhook)**
6. **PostgreSQL Schema**
7. **n8n Master Workflow (Complete Configuration)**
8. **AI Asset Generation Strategy**
9. **Google Sheets & Drive Integration**
10. **Personal Profile System**
11. **Resume Strategy & Content Framework**
12. **Implementation Timeline (Immediate)**
13. **Cost Forecast & SaaS Pricing**
14. **Troubleshooting & Common Errors**
15. **Final Checklist & Launch**

---

# PART 1: EXECUTIVE SUMMARY

## Mission
Help Matt Dimock land a **$200K+ base, remote leadership role** in Growth/Lifecycle/RevOps/Demand Gen by building a **thin, safe Chrome extension** that captures rich job data, triggers an **intelligent n8n backend** to research companies, generate **personalized assets** (resume, cover letter, 90-day plan, interview prep, outreach), and **tracks everything** in Google Sheets & Drive.

## Key Outcomes
- **Per Job**: 2 hours → 15 minutes (87% time saving)
- **Per Month**: 5–10 apps → 20–30 apps (3–6x increase)
- **Asset Quality**: Generic → Highly personalized & proof-backed
- **Monthly Cost**: $30–$50 (scales to $140 at 100+ jobs/month)

## Constraints (Hard Rules)
✅ No auto-submit, auto-navigate, or mass scraping  
✅ User initiates every action ("Send to Job Hunter" button)  
✅ Zero LinkedIn ban risk (reads public pages only)  
✅ Single user focus (Matt), but SaaS-ready architecture  
✅ Costs under $50/month MVP  

---

# PART 2: COMPLETE SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│             JOB HUNTER OPERATING SYSTEM                      │
│                    (Matt Dimock)                             │
└─────────────────────────────────────────────────────────────┘

1. FRONTEND (Chrome Extension)
   ├─ Content Script (content.js)
   │  ├─ Detects LinkedIn/Indeed job detail pages
   │  ├─ Extracts DOM elements → jobPayload JSON
   │  ├─ Shows "Job Captured ✓" overlay
   │  └─ POSTs to n8n webhook on manual "Hunt" click
   └─ Popup UI (popup.html/js)
      ├─ Quick settings (webhook URL, auto-save to Sheets)
      ├─ Saves checkboxes to Chrome storage
      └─ Clean, minimal interface (no strategy doc mentions)

2. WEBHOOK INTAKE (Node.js on Railway)
   ├─ Receives jobPayload JSON
   ├─ Validates against schema
   ├─ Checks for duplicates (URL hash)
   ├─ Writes to PostgreSQL jobs table
   └─ Triggers n8n master workflow

3. n8n ORCHESTRATION (Railway)
   ├─ Workflow 01: Intake & Validation
   ├─ Workflow 02: Research (Perplexity)
   ├─ Workflow 03: Asset Generation (OpenAI)
   │  ├─ Sub 3a: 90-Day Plan (using research insights)
   │  ├─ Sub 3b: Resume Tailoring
   │  ├─ Sub 3c: Cover Letter
   │  ├─ Sub 3d: Interview Prep
   │  └─ Sub 3e: Outreach Messages
   ├─ Workflow 04: File Upload (Google Drive)
   ├─ Workflow 05: Tracking Update (Google Sheets)
   └─ Workflow 06: Error Handling & Retry

4. DATA LAYER
   ├─ PostgreSQL (Railway)
   │  ├─ jobs table (core job records)
   │  ├─ assets table (links to generated files)
   │  ├─ research table (company intel)
   │  └─ application_log table (metrics)
   ├─ Google Sheets
   │  └─ Job Hunter Tracker (real-time job log)
   └─ Google Drive
      └─ /Job Hunter Assets/{Company Name}/{Date}/...

5. PERSONAL PROFILE SYSTEM
   ├─ Storage: Chrome local storage + PostgreSQL
   ├─ Data: Skills, experience, preferences, salary target
   ├─ Usage: Influences every AI call (research, prompts, 90-day plan)
   └─ Update: Manual edit via "Profile" button in extension

HIRING JOURNEY MAPPING
─────────────────────

Stage 1: DISCOVERY (You)
  Action: Browse LinkedIn/Indeed, find job you like
  System: Nothing (you're in control)

Stage 2: CAPTURE (Extension)
  Action: Click "Send to Job Hunter" on job detail page
  System: Content.js extracts data → POSTs to webhook
  Data: jobPayload JSON created

Stage 3: INTAKE (n8n Workflow 01)
  Action: Webhook receives payload
  System: Validates, deduplicates, writes to Postgres
  Data: Job record created in DB

Stage 4: RESEARCH (n8n Workflow 02 + Perplexity)
  Action: (Automatic)
  System: Calls Perplexity with jobPayload + Matt's profile
  Data: Company research, market and competitor analysis, role expectations, growth/revenue stage signals, industry trends, etc

Stage 5: ASSET GENERATION (n8n Workflow 03 + OpenAI)
  Action: (Automatic)
  System: Calls OpenAI with research + Matt's profile
  Data: 90-day plan, resume tailoring, cover letter, outreach messaging, interview prep

Stage 6: STORAGE (n8n Workflows 04 & 05)
  Action: (Automatic)
  System: Uploads to Drive, links in Sheets
  Data: All assets organized, trackable

Stage 7: REVIEW & APPLY (You)
  Action: Check Sheets for new job, review assets in Drive, apply manually
  System: Tracks application date/status in Sheets

Stage 8: ERROR HANDLING, RETRY LOGIC, & FEEDBACK
  Action: Update Sheets with interview/offer outcomes, and manage error handling and retry logic
  System: Logs metrics for future optimization, determines how to manage and notify of errors as they arise, and indicates retry logic parameters
```

---

# PART 3: JOBPAYLOAD JSON SCHEMA

**This is the canonical data structure from extension → webhook.**

```json
{
  "// IDENTIFICATION": "─────────────────────",
  "jobId": "uuid-string-unique",
  "huntTimestamp": "2025-11-29T14:30:00Z",
  "source": "linkedin|indeed",
  "rawUrl": "https://www.linkedin.com/jobs/view/1234567890",
  "normalizedUrl": "https://www.linkedin.com/jobs/view/1234567890",

  "// CORE JOB DATA": "─────────────────────",
  "jobTitle": "Vice President of Growth",
  "companyName": "TechCorp Inc",
  "companyLinkedInUrl": "https://www.linkedin.com/company/techcorp-inc",
  "location": "San Francisco, CA (Remote)",
  "remoteType": "remote|hybrid|onsite",
  "employmentType": "Full-time",
  "postedAt": "2025-11-27T00:00:00Z",
  "applicantsCount": 150,

  "// COMPENSATION & BENEFITS": "─────────────────────",
  "compensation": {
    "salaryMin": 180000,
    "salaryMax": 220000,
    "currency": "USD",
    "bonus": {
      "mentioned": true,
      "percentage": 25,
      "range": "20-30%",
      "type": "performance|discretionary"
    },
    "equity": {
      "mentioned": true,
      "type": "stock_options|rsus|both",
      "percentage": null,
      "vestingSchedule": null
    },
    "benefits": [
      "health_insurance",
      "dental",
      "401k_match",
      "pto_unlimited",
      "professional_development",
      "work_from_home"
    ]
  },

  "// ROLE REQUIREMENTS": "─────────────────────",
  "seniority": "VP|Head|Director|Senior Manager|Manager",
  "yearsExperienceRequired": 10,
  "desiredSkills": [
    "B2B SaaS",
    "Demand Generation",
    "Product Marketing",
    "SQL/Analytics",
    "Team Leadership"
  ],
  "responsibilities": [
    "Build and execute go-to-market strategy",
    "Lead demand generation programs",
    "Manage and grow marketing team",
    "Oversee marketing budget ($2M ARR)"
  ],
  "niceToHaves": [
    "Experience with venture-backed SaaS",
    "Product marketing background",
    "Sales enablement experience"
  ],

  "// COMPANY INFORMATION": "─────────────────────",
  "company": {
    "stage": "Series C|Series D|Growth|Late Stage|Public",
    "fundingRound": "Series C - $50M",
    "approximateRevenue": "$50M-$100M ARR",
    "employeeCount": 200,
    "industry": "SaaS|FinTech|AI|Healthcare",
    "headquarters": "San Francisco, CA",
    "description": "TechCorp is a leading B2B SaaS platform...",
    "linkedInFollowers": 45000
  },

  "// JOB POSTER & RECRUITER": "─────────────────────",
  "jobPoster": {
    "name": "Jane Smith",
    "title": "VP People",
    "linkedInUrl": "https://www.linkedin.com/in/janesmith",
    "linkedInHeadline": "VP People @ TechCorp | Hiring Leaders",
    "relationship": "2nd degree|3rd degree|recruiter|company"
  },

  "// JOB DESCRIPTION (RAW)": "─────────────────────",
  "description": {
    "aboutCompany": "TechCorp is reinventing B2B SaaS...",
    "aboutRole": "We are looking for a VP of Growth to...",
    "aboutCandidate": "You bring 10+ years of B2B SaaS GTM experience...",
    "responsibilities": ["Build GTM...", "Lead demand gen...", "Manage team..."],
    "requirements": ["10+ years B2B SaaS", "Team leadership", "Demand gen proven ROI"],
    "niceToHaves": ["Venture-backed startup", "Product marketing"],
    "html": "<html>...</html>",
    "rawText": "Extracted plain text of job description"
  },

  "// MATT'S PROFILE (INJECTED BY EXTENSION)": "─────────────────────",
  "mattProfile": {
    "profileCompleteness": 0.85,
    "linkedInUrl": "https://www.linkedin.com/in/matt-dimock",
    "yearsExperience": 18,
    "currentRole": "Head of Growth",
    "targetRole": "VP Growth|VP Marketing|CMO",
    "targetCompensation": {
      "salaryMin": 200000,
      "salaryMax": 300000,
      "bonusTarget": 0.25
    },
    "preferredIndustries": ["SaaS", "FinTech", "AI"],
    "preferredStage": ["Series B", "Series C", "Series D"],
    "dealbreakers": ["On-site NYC", "No equity", "Startup < 50 people"],
    "mustHaves": ["Remote", "Team of 5+", "Marketing budget $1M+"]
  },

  "// METADATA": "─────────────────────",
  "userAgent": "Mozilla/5.0...",
  "extractedFields": {
    "totalFieldsAttempted": 28,
    "totalFieldsSuccessful": 26,
    "fallbacksUsed": ["salaryMin from description", "bonus from benefits"]
  },
  "flags": {
    "isRecruiterPosted": false,
    "visaSponsored": true,
    "fastMoving": true,
    "justPosted": false
  }
}
```

---

# PART 4: CHROME EXTENSION (All Files – Production Ready)

## File 1: manifest.json

```json
{
  "manifest_version": 3,
  "name": "Job Hunter",
  "version": "1.0.0",
  "description": "Capture job postings → research, generate assets, track applications",

  "permissions": [
    "storage",
    "scripting",
    "activeTab"
  ],

  "host_permissions": [
    "https://www.linkedin.com/*",
    "https://www.indeed.com/*"
  ],

  "action": {
    "default_popup": "popup.html",
    "default_title": "Job Hunter"
  },

  "background": {
    "service_worker": "background.js"
  },

  "content_scripts": [
    {
      "matches": [
        "https://www.linkedin.com/*",
        "https://www.indeed.com/*"
      ],
      "js": [
        "fitScore.js",
        "content.js"
      ],
      "run_at": "document_end"
    }
  ],

  "icons": {
    "16": "images/icon-16.png",
    "48": "images/icon-48.png",
    "128": "images/icon-128.png"
  }
}
```

## File 2: content.js (Job Capture & Overlay)

```javascript
/**
 * Job Hunter - Content Script
 * Detects LinkedIn/Indeed job pages, extracts data, shows overlay
 * NO complex scoring here – that happens in backend
 */

const JOB_CAPTURE_CONFIG = {
  LINKEDIN_SELECTORS: {
    jobTitle: [
      '.t-24.t-bold',
      'h1.t-24',
      '[data-test-id="job-title"]',
      '.job-title'
    ],
    company: [
      'a[data-view-name="job-details-about-company-name-link"]',
      '.company-name',
      '[data-test-id="job-card-container-link"]'
    ],
    location: [
      '[class*="t-14 t-normal t-black text--truncate"]',
      '.location'
    ],
    description: [
      '[class*="show-more-less-html__markup"]',
      '.description',
      '[id="job-details"]'
    ]
  },
  INDEED_SELECTORS: {
    jobTitle: ['h1', '.jobsearch-JobTitle', '[class*="job-title"]'],
    company: ['[data-company-name]', '.companyName'],
    location: ['[data-testid="jobsearch-Location"]', '.location'],
    description: ['#jobDescription', '[class*="description"]']
  }
};

// Global state
let currentJobData = null;
let overlayVisible = false;

// ===== PAGE DETECTION & INITIALIZATION =====

function init() {
  const source = detectJobSource();
  if (!source) {
    console.log('[Job Hunter] Not on a job posting page');
    return;
  }

  console.log(`[Job Hunter] Detected ${source} job page`);

  // Wait for page to fully load, then extract
  setTimeout(() => {
    const jobData = extractJobData(source);
    if (jobData && jobData.jobTitle) {
      currentJobData = jobData;
      showOverlay(jobData);
    } else {
      console.warn('[Job Hunter] Failed to extract job data');
    }
  }, 1500);
}

function detectJobSource() {
  const url = window.location.href;
  if (url.includes('linkedin.com/jobs')) return 'linkedin';
  if (url.includes('indeed.com/jobs')) return 'indeed';
  return null;
}

// ===== DOM EXTRACTION =====

function extractJobData(source) {
  const data = {
    jobId: generateUUID(),
    huntTimestamp: new Date().toISOString(),
    source: source,
    rawUrl: window.location.href,
    mattProfile: {}
  };

  if (source === 'linkedin') {
    Object.assign(data, extractLinkedInData());
  } else if (source === 'indeed') {
    Object.assign(data, extractIndeedData());
  }

  return data;
}

function extractLinkedInData() {
  const data = {};

  // Job Title
  data.jobTitle = selectOne(JOB_CAPTURE_CONFIG.LINKEDIN_SELECTORS.jobTitle)?.textContent.trim() || '';

  // Company
  const companyEl = selectOne(JOB_CAPTURE_CONFIG.LINKEDIN_SELECTORS.company);
  data.companyName = companyEl?.textContent.trim() || '';
  data.companyLinkedInUrl = companyEl?.href || '';

  // Location
  data.location = selectOne(JOB_CAPTURE_CONFIG.LINKEDIN_SELECTORS.location)?.textContent.trim() || 'Not specified';

  // Compensation (from buttons with salary info)
  const compButtons = Array.from(document.querySelectorAll('[class*="job-details-fit-level-preferences"] button'));
  const salaryButton = compButtons.find(btn => btn.textContent.includes('K') || btn.textContent.includes('$'));
  data.compensation = { salaryText: salaryButton?.textContent.trim() || '' };

  // Benefits badges (Remote, Full-time, etc.)
  const benefitBadges = Array.from(document.querySelectorAll('[class*="job-details-fit-level-preferences"] button'))
    .map(btn => btn.textContent.trim())
    .filter(txt => ['Remote', 'Full-time', 'Part-time', 'Contract', 'Hybrid'].some(type => txt.includes(type)));
  data.employmentType = benefitBadges.find(b => ['Full-time', 'Part-time', 'Contract'].some(t => b.includes(t))) || 'Not specified';
  data.remoteType = benefitBadges.includes('Remote') ? 'remote' : (benefitBadges.includes('Hybrid') ? 'hybrid' : 'onsite');

  // Job Description
  const descEl = selectOne(JOB_CAPTURE_CONFIG.LINKEDIN_SELECTORS.description);
  data.description = {
    html: descEl?.innerHTML || '',
    text: descEl?.textContent.trim() || ''
  };

  // Job Poster Card
  const posterCard = document.querySelector('[class*="job-details-jobs-unified-top-card"]');
  if (posterCard) {
    const posterLink = posterCard.querySelector('a[href*="/in/"]');
    const posterName = posterCard.querySelector('[class*="visually-hidden"]');
    data.jobPoster = {
      name: posterName?.textContent.trim() || 'Unknown',
      linkedInUrl: posterLink?.href || ''
    };
  }

  // Company Metadata
  const companyAboutEl = document.querySelector('[class*="description-about-the-company"]');
  data.company = {
    description: companyAboutEl?.textContent.trim() || '',
    followers: null,
    employeeCount: null
  };

  return data;
}

function extractIndeedData() {
  const data = {};

  data.jobTitle = selectOne(JOB_CAPTURE_CONFIG.INDEED_SELECTORS.jobTitle)?.textContent.trim() || '';
  data.companyName = selectOne(JOB_CAPTURE_CONFIG.INDEED_SELECTORS.company)?.textContent.trim() || '';
  data.location = selectOne(JOB_CAPTURE_CONFIG.INDEED_SELECTORS.location)?.textContent.trim() || 'Not specified';

  const descEl = selectOne(JOB_CAPTURE_CONFIG.INDEED_SELECTORS.description);
  data.description = {
    html: descEl?.innerHTML || '',
    text: descEl?.textContent.trim() || ''
  };

  // Compensation from metadata
  const salaryEl = document.querySelector('[data-salary-snippet-target]');
  data.compensation = { salaryText: salaryEl?.textContent.trim() || '' };

  data.remoteType = data.description.text.toLowerCase().includes('remote') ? 'remote' : 'onsite';
  data.employmentType = 'Full-time';

  return data;
}

// ===== HELPER FUNCTIONS =====

function selectOne(selectors) {
  for (let selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ===== OVERLAY UI =====

function showOverlay(jobData) {
  if (overlayVisible) return;
  overlayVisible = true;

  const overlay = document.createElement('div');
  overlay.id = 'job-hunter-overlay';
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      border-top: 4px solid #2180a1;
    ">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">
            ${jobData.jobTitle}
          </h3>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #666;">
            ${jobData.companyName}
          </p>
        </div>
        <button id="jh-close" style="
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #999;
          padding: 0;
        ">×</button>
      </div>

      <div style="background: #f5f5f5; padding: 10px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; color: #333;">
        <strong>Location:</strong> ${jobData.location} | <strong>Type:</strong> ${jobData.employmentType}
      </div>

      <div style="
        display: flex;
        gap: 8px;
      ">
        <button id="jh-hunt" style="
          flex: 1;
          padding: 10px;
          background: #2180a1;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        ">
          📌 Send to Job Hunter
        </button>
        <button id="jh-skip" style="
          flex: 1;
          padding: 10px;
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 14px;
        ">
          Skip
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event listeners
  document.getElementById('jh-close').addEventListener('click', () => {
    overlay.remove();
    overlayVisible = false;
  });

  document.getElementById('jh-skip').addEventListener('click', () => {
    overlay.remove();
    overlayVisible = false;
  });

  document.getElementById('jh-hunt').addEventListener('click', () => {
    sendToWebhook(jobData);
  });
}

// ===== WEBHOOK SUBMISSION =====

async function sendToWebhook(jobData) {
  const webhookUrl = localStorage.getItem('jh_webhook_url');
  if (!webhookUrl) {
    alert('Please configure your webhook URL in the extension settings.');
    return;
  }

  const huntBtn = document.getElementById('jh-hunt');
  huntBtn.textContent = 'Sending...';
  huntBtn.disabled = true;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jobData)
    });

    const result = await response.json();

    if (result.success) {
      huntBtn.textContent = '✓ Sent!';
      huntBtn.style.background = '#22c55e';
      showToast('Job captured! Processing now...', 'success');
      setTimeout(() => {
        document.getElementById('job-hunter-overlay')?.remove();
        overlayVisible = false;
      }, 2000);
    } else {
      showToast('Error: ' + (result.error || 'Unknown error'), 'error');
      huntBtn.textContent = '📌 Send to Job Hunter';
      huntBtn.disabled = false;
    }
  } catch (error) {
    console.error('[Job Hunter] Webhook error:', error);
    showToast('Connection error. Check webhook URL.', 'error');
    huntBtn.textContent = '📌 Send to Job Hunter';
    huntBtn.disabled = false;
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    padding: 12px 16px;
    background: ${bgColor};
    color: white;
    border-radius: 8px;
    z-index: 10001;
    font-family: system-ui;
    font-size: 13px;
    font-weight: 500;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ===== START =====

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

## File 3: fitScore.js (Stub – Optional)

```javascript
/**
 * fitScore.js
 * Currently minimal – scoring logic can move to backend if needed
 * For now, this file can stay as a placeholder or be removed entirely
 */

const FIT_SCORE_CONFIG = {
  version: '1.0.0',
  enabled: false // Scoring happens in backend now
};
```

## File 4: background.js (Service Worker)

```javascript
/**
 * Background Service Worker
 * Minimal – mostly for future expansion
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Job hunter] Installed');
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getWebhookUrl') {
    chrome.storage.local.get('jh_webhook_url', (result) => {
      sendResponse({ webhookUrl: result.jh_webhook_url || '' });
    });
    return true;
  }

  if (request.action === 'saveWebhookUrl') {
    chrome.storage.local.set({ jh_webhook_url: request.url }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
```

## File 5: popup.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job hunter</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Job hunter</h1>
        <small class="version">v1.0.0</small>
      </div>
    </div>

    <div class="status">
      ✅ Ready to capture job postings from LinkedIn & Indeed
    </div>

    <div class="section">
      <h2>Integration</h2>
      <label class="field">
        <span>Webhook URL</span>
        <input type="text" id="webhook-url" placeholder="https://.../webhook/job-hunt">
        <small class="hint">Get this from your Job Hunter dashboard</small>
      </label>
    </div>

    <div class="section">
      <h2>Settings</h2>
      <label>
        <input type="checkbox" id="auto-save-sheets" checked>
        Auto-save to Google Sheets
      </label>
      <label>
        <input type="checkbox" id="notify-on-complete" checked>
        Notify when assets are ready
      </label>
    </div>

    <div class="buttons">
      <button class="btn btn-primary" id="save-btn">Save Settings</button>
      <button class="btn btn-secondary" id="view-sheet-btn">View Tracker</button>
    </div>

    <div class="footer">
      Status: <span id="status-text" style="color: #2180a1; font-weight: 600;">Connected</span>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

## File 6: popup.js

```javascript
/**
 * Popup Script
 * Handles user settings for webhook URL and notification preferences
 */

document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.local.get(['jh_webhook_url', 'jh_auto_save_sheets', 'jh_notify_complete'], (result) => {
    document.getElementById('webhook-url').value = result.jh_webhook_url || '';
    document.getElementById('auto-save-sheets').checked = result.jh_auto_save_sheets !== false;
    document.getElementById('notify-on-complete').checked = result.jh_notify_complete !== false;
  });

  // Save button
  document.getElementById('save-btn').addEventListener('click', () => {
    const webhookUrl = document.getElementById('webhook-url').value.trim();

    if (!webhookUrl) {
      alert('Please enter a webhook URL');
      return;
    }

    chrome.storage.local.set({
      jh_webhook_url: webhookUrl,
      jh_auto_save_sheets: document.getElementById('auto-save-sheets').checked,
      jh_notify_complete: document.getElementById('notify-on-complete').checked
    }, () => {
      document.getElementById('status-text').textContent = 'Saved ✓';
      document.getElementById('status-text').style.color = '#22c55e';
      setTimeout(() => {
        document.getElementById('status-text').textContent = 'Connected';
        document.getElementById('status-text').style.color = '#2180a1';
      }, 2000);
    });
  });

  // View tracker button
  document.getElementById('view-sheet-btn').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit'
    });
  });

  // Save on checkbox change
  document.getElementById('auto-save-sheets').addEventListener('change', (e) => {
    chrome.storage.local.set({ jh_auto_save_sheets: e.target.checked });
  });

  document.getElementById('notify-on-complete').addEventListener('change', (e) => {
    chrome.storage.local.set({ jh_notify_complete: e.target.checked });
  });
});
```

## File 7: popup.css

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  width: 380px;
}

.container {
  padding: 16px;
  background: #ffffff;
  min-height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  border-bottom: 2px solid #2180a1;
  padding-bottom: 10px;
}

.header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #2180a1;
  margin: 0;
}

.version {
  font-size: 11px;
  color: #999;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  display: block;
  margin-top: 2px;
}

.status {
  background: #f0f8ff;
  border-left: 4px solid #2180a1;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  margin-bottom: 14px;
}

.section {
  margin-bottom: 14px;
}

.section h2 {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #666;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.section label {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #333;
  padding: 6px 0;
  cursor: pointer;
}

.section input[type="checkbox"] {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  cursor: pointer;
}

.field {
  flex-direction: column;
  align-items: flex-start !important;
}

.field span {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #555;
  display: block;
}

.field input[type="text"] {
  width: 100%;
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 13px;
  font-family: monospace;
  margin-bottom: 4px;
}

.field input[type="text"]:focus {
  outline: none;
  border-color: #2180a1;
  box-shadow: 0 0 0 3px rgba(33, 128, 161, 0.1);
}

.hint {
  font-size: 11px;
  color: #777;
  display: block;
}

.buttons {
  display: flex;
  gap: 8px;
  margin: 14px 0;
}

.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #2180a1;
  color: white;
}

.btn-primary:hover {
  background: #1a6682;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.footer {
  border-top: 1px solid #e0e0e0;
  padding-top: 10px;
  font-size: 12px;
  color: #777;
  text-align: center;
}
```

---

# PART 5: BACKEND INFRASTRUCTURE

## Phase 5A: Node.js Webhook Server

**File: webhook.js** (Deploy to Railway)

```javascript
/**
 * Job hunter Webhook Server
 * Node.js Express + PostgreSQL
 * Deployed on Railway
 */

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

// PostgreSQL Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Middleware
app.use(express.json({ limit: '10mb' }));

// ===== ROUTES =====

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Main Webhook Endpoint
app.post('/webhook/job-hunt', async (req, res) => {
  console.log('[Webhook] Job hunt received');

  try {
    const jobPayload = req.body;

    // 1. Validate payload
    if (!jobPayload.jobId || !jobPayload.jobTitle || !jobPayload.companyName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: jobId, jobTitle, companyName'
      });
    }

    // 2. Check for duplicates
    const existing = await pool.query(
      'SELECT id FROM jobs WHERE raw_url = $1',
      [jobPayload.rawUrl]
    );

    if (existing.rows.length > 0) {
      console.log('[Webhook] Job already hunted:', jobPayload.jobId);
      return res.json({
        success: false,
        message: 'Job already hunted',
        jobId: existing.rows[0].id
      });
    }

    // 3. Parse compensation
    const compensationData = parseCompensation(jobPayload.compensation?.salaryText || '');

    // 4. Store in Postgres
    const insertResult = await pool.query(
      `INSERT INTO jobs 
        (job_id, title, company_name, company_linkedin_url, location, 
         remote_type, employment_type, raw_url, source, 
         salary_min, salary_max, job_description_text, 
         job_poster_name, job_poster_url, status, created_at)
       VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
       RETURNING id, job_id`,
      [
        jobPayload.jobId,
        jobPayload.jobTitle,
        jobPayload.companyName,
        jobPayload.companyLinkedInUrl || null,
        jobPayload.location,
        jobPayload.remoteType,
        jobPayload.employmentType,
        jobPayload.rawUrl,
        jobPayload.source,
        compensationData.min,
        compensationData.max,
        jobPayload.description?.text || '',
        jobPayload.jobPoster?.name || null,
        jobPayload.jobPoster?.linkedInUrl || null,
        'captured'
      ]
    );

    const dbJobId = insertResult.rows[0].id;
    console.log('[Webhook] Job stored in DB:', dbJobId);

    // 5. Trigger n8n workflow (async, fire-and-forget)
    triggerN8nWorkflow(dbJobId, jobPayload).catch(err => {
      console.error('[Webhook] Failed to trigger n8n:', err.message);
    });

    // 6. Return success
    res.json({
      success: true,
      jobId: dbJobId,
      message: 'Job captured! Processing now...'
    });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== HELPER FUNCTIONS =====

function parseCompensation(salaryText) {
  if (!salaryText) return { min: null, max: null };

  // Example: "$170K/yr - $215K/yr" or "$170,000 - $215,000"
  const matches = salaryText.match(/\$?([\d,]+).*?\$?([\d,]+)/);
  if (matches) {
    const min = parseInt(matches[1].replace(/,/g, '')) * (matches[1].toLowerCase().includes('k') ? 1000 : 1);
    const max = parseInt(matches[2].replace(/,/g, '')) * (matches[2].toLowerCase().includes('k') ? 1000 : 1);
    return { min, max };
  }

  return { min: null, max: null };
}

async function triggerN8nWorkflow(dbJobId, jobPayload) {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nWebhookUrl) {
    console.warn('[Webhook] N8N_WEBHOOK_URL not configured');
    return;
  }

  const payload = {
    dbJobId,
    jobPayload,
    timestamp: new Date().toISOString()
  };

  await axios.post(n8nWebhookUrl, payload, { timeout: 5000 });
  console.log('[Webhook] n8n workflow triggered for job:', dbJobId);
}

// ===== START SERVER =====

app.listen(port, () => {
  console.log(`[Webhook] Server listening on port ${port}`);
  console.log(`[Webhook] Health: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Webhook] Shutting down...');
  pool.end();
  process.exit(0);
});
```

**File: package.json**

```json
{
  "name": "job-hunter-webhook",
  "version": "1.0.0",
  "description": "Job Hunter webhook receiver and orchestrator",
  "main": "webhook.js",
  "scripts": {
    "start": "node webhook.js",
    "dev": "nodemon webhook.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": "18.x"
  }
}
```

**File: .env.example**

```
DATABASE_URL=postgresql://user:password@host:5432/job_hunter
N8N_WEBHOOK_URL=https://your-n8n-instance/webhook/job-research
PORT=3000
NODE_ENV=production
```

---

# PART 6: POSTGRESQL SCHEMA

**File: schema.sql**

```sql
-- Job Hunter Database Schema

-- Jobs Table (Core Records)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_linkedin_url TEXT,
  location VARCHAR(255),
  remote_type VARCHAR(50), -- 'remote', 'hybrid', 'onsite'
  employment_type VARCHAR(50), -- 'Full-time', 'Part-time', 'Contract'
  raw_url TEXT UNIQUE,
  source VARCHAR(50), -- 'linkedin', 'indeed'
  
  -- Compensation
  salary_min INTEGER,
  salary_max INTEGER,
  bonus_percentage DECIMAL(5, 2),
  equity_mentioned BOOLEAN DEFAULT FALSE,
  
  -- Job Details
  job_description_text TEXT,
  job_poster_name VARCHAR(255),
  job_poster_url TEXT,
  
  -- Company
  company_stage VARCHAR(50),
  company_industry VARCHAR(100),
  
  -- Status & Tracking
  status VARCHAR(50) DEFAULT 'captured', -- 'captured', 'researched', 'assets_generated', 'applied', 'rejected'
  matt_rating SMALLINT,
  applied_at TIMESTAMP,
  interview_date TIMESTAMP,
  outcome VARCHAR(50), -- 'offer', 'rejected', 'no_response'
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_company (company_name),
  INDEX idx_status (status),
  INDEX idx_created (created_at DESC)
);

-- Assets Table (Generated Documents)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  asset_type VARCHAR(50), -- 'resume', 'cover_letter', '90_day_plan', 'interview_prep', 'outreach'
  gdrive_id TEXT,
  gdrive_url TEXT,
  content TEXT,
  generated_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_job_asset (job_id, asset_type)
);

-- Research Table (Company Intelligence)
CREATE TABLE research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_website TEXT,
  funding_round VARCHAR(50),
  employee_count INTEGER,
  key_products TEXT,
  key_challenges TEXT,
  recent_news JSONB,
  competitors JSONB,
  market_position VARCHAR(500),
  generated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_job_research (job_id)
);

-- Personal Profile Table
CREATE TABLE personal_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100),
  full_name VARCHAR(255),
  linkedin_url TEXT,
  years_experience INTEGER,
  current_role VARCHAR(255),
  target_roles TEXT[], -- Array of roles
  target_compensation_min INTEGER,
  target_compensation_max INTEGER,
  preferred_industries TEXT[],
  preferred_company_stages TEXT[],
  must_haves TEXT[], -- JSON array of must-haves
  dealbreakers TEXT[], -- JSON array of dealbreakers
  skills TEXT[],
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user (user_id)
);

-- Application Log (Metrics & Feedback)
CREATE TABLE application_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  action VARCHAR(50), -- 'hunted', 'researched', 'applied', 'rejected', 'interviewed', 'offered'
  timestamp TIMESTAMP DEFAULT NOW(),
  details JSONB,
  
  INDEX idx_job_log (job_id, timestamp DESC)
);

-- Create indexes
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX idx_jobs_company ON jobs(company_name);
CREATE INDEX idx_jobs_status ON jobs(status);
```

---

# PART 7: n8n MASTER WORKFLOW

**Configure in n8n Dashboard at: https://getfractional.up.railway.app/workflows**

## n8n Workflow Design (Text Description)

```
WORKFLOW: Job Hunter - Master Research & Asset Generation

TRIGGER
├─ Webhook node: Receives job data from webhook server
│  ├─ Input: { dbJobId, jobPayload }
│  └─ Output: Parsed data ready for processing

RESEARCH PHASE
├─ Perplexity API Call: Research company, market, competitors
│  ├─ Prompt: "Research [Company] in [Industry]..."
│  ├─ Context: Company name, industry, size
│  └─ Output: research_results (JSON)

ASSET GENERATION PHASE
├─ 90-Day Plan (OpenAI)
│  ├─ Input: jobPayload + research_results + Matt's profile
│  ├─ Prompt: "Create a 90-day plan for [Role] at [Company]..."
│  └─ Output: ninety_day_plan (markdown)
│
├─ Resume Tailoring (OpenAI)
│  ├─ Input: jobPayload + Matt's resume + research
│  ├─ Prompt: "Tailor these resume bullets for [Role]..."
│  └─ Output: resume_bullets (markdown)
│
├─ Cover Letter (OpenAI)
│  ├─ Input: jobPayload + research + 90-day plan insights
│  ├─ Prompt: "Write a compelling cover letter..."
│  └─ Output: cover_letter (markdown)
│
├─ Interview Prep (OpenAI)
│  ├─ Input: jobPayload + role requirements
│  ├─ Prompt: "Create interview prep: STAR stories, objection handling..."
│  └─ Output: interview_prep (markdown)
│
└─ Outreach Message (OpenAI)
   ├─ Input: jobPayload + job poster info
   ├─ Prompt: "Write a compelling outreach message..."
   └─ Output: outreach_message (text)

STORAGE PHASE
├─ Upload to Google Drive
│  ├─ Create folder: "/Job Hunter Assets/{Company}/{Date}"
│  ├─ Upload all 5 documents
│  └─ Output: drive_links (JSON)
│
└─ Update Google Sheets
   ├─ Append row with: job title, company, URL, assets links, timestamp
   └─ Status: "Assets Ready"

ERROR HANDLING
├─ On API failure: Retry 3x with exponential backoff
├─ On rate limit: Queue and retry later
└─ Log all errors to Postgres + notify via email
```


## n8n Workflow Details

### Sub-Workflow 1: RESEARCH (Perplexity)
Prompt Engineering (Hormozi: Problem Research)

text
You are researching a job opportunity for an elite growth professional.

COMPANY ANALYSIS FOR: [Company Name]
Industry: [Industry]
Stage: [Stage from job posting]
Recent funding: [If available]

Your research must uncover:

1. MARKET CONTEXT
   - Is this market growing or shrinking?
   - What are the top 3 tailwinds?
   - What are the top 3 headwinds?
   
2. COMPANY POSITIONING
   - What is their clear differentiation?
   - Who do they compete against? (Top 3)
   - What is their market share estimate?
   - Are they gaining or losing share?
   
3. REVENUE SIGNALS
   - What's their likely revenue model?
   - Are they likely scaling or flat?
   - What indicates their growth trajectory?
   - Why might they be hiring NOW for growth role?
   
4. STRATEGIC OPPORTUNITIES
   - What is their biggest growth bottleneck likely to be?
   - If you were brought in as a growth leader, what would be your first 3 hypotheses?
   - What data would you want to see first?
   
5. COMPETITIVE THREAT ANALYSIS
   - What are the top competitors doing differently?
   - What is this company doing RIGHT vs. competitors?
   - Where is the gap in their positioning?

Format as structured JSON with section headers and bullet points.
Include confidence level (high/medium/low) for each assertion.
n8n Configuration:

Node Type: HTTP Request (POST to Perplexity API)

Model: sonar-medium-online (best for research, cheaper)

Temperature: 0.3 (factual, research mode)

Max Tokens: 2000

Timeout: 30 seconds (Perplexity can be slow)

Rate Limit Handling:

Retry: 3x with exponential backoff (2s, 4s, 8s)

On failure: Queue job for retry in 5 minutes (save to Postgres first)

### Sub-Workflow 2: 90-DAY PLAN (OpenAI – THE OFFER)
This is your most important asset. It's your OFFER to the company.

Prompt Architecture (Hormozi + Sultanic Framework):

text
You are writing a 90-day plan for Matt Dimock, an elite growth leader.

CONTEXT:
- Role: [Job Title]
- Company: [Company Name]
- Company Stage: [Stage]
- Your Background: Matt has 18 years scaling growth systems across D2C ecommerce 
  ($20.5M→$45M), Insurance ($290K→$2M), Telecom ($45M→$120M), and most recently 
  built an AI recruiting engine reducing TTF from 60+ days to <21 days.
- Key Skills: GTM architecture, demand gen, lifecycle management, RevOps, 
  CRM/automation stack design, team building

RESEARCH FROM PREVIOUS STEP: [Insert Perplexity output]

YOUR 90-DAY FRAMEWORK:

DAYS 1-30: CLARITY (Diagnose)
├─ Objective: Understand the current machine
├─ Hypothesis 1: [Company's growth is limited by X (fill in from research)]
├─ Hypothesis 2: [Acquisition is inefficient because Y]
├─ Hypothesis 3: [Retention/LTV optimization is at Z% of potential]
├─ Key Actions:
│  ├─ Audit current funnel (top to bottom)
│  ├─ Interview 10 customers (why they bought, barriers)
│  ├─ Interview 5 churned customers (why they left)
│  ├─ Analyze last 12 months of marketing/sales metrics
│  ├─ Build a single-page dashboard of key metrics
│  └─ Present findings & get alignment with exec team
└─ Success Metric: Clear picture of growth machine (high/low performers)

DAYS 31-60: STRATEGY (Plan)
├─ Objective: Build the roadmap
├─ Based on Days 1-30 findings:
│  ├─ Identify top 3 growth levers (highest impact, lowest effort)
│  ├─ Quantify each lever (revenue potential, timeline to impact)
│  ├─ Design experiments (what will we test, success criteria)
│  ├─ Align on which lever to tackle first
│  └─ Build quarterly growth plan with team
└─ Success Metric: Board/exec alignment on growth plan

DAYS 61-90: EXECUTION (Execute & Prove)
├─ Objective: Deliver proof of concept on fastest lever
├─ Actions:
│  ├─ Launch 2-3 targeted experiments
│  ├─ Implement tracking & real-time dashboards
│  ├─ Weekly wins review (what's working, pivot what's not)
│  ├─ Build case study of early wins
│  └─ Hire/organize team structure for scale
└─ Success Metric: 1-3 proven tactics showing 20%+ uplift
└─ Expected Outcomes: $XXX additional pipeline / YY% improved LTV

BEYOND 90 DAYS (Your Roadmap):
- Month 4-6: Scale winning experiments, build demand gen engine
- Month 6-9: Expand to adjacent segments, team scaling
- Month 12: 50-100% growth on top funnel, retention improvements driving LTV gains

CRITICAL SUCCESS FACTORS:
1. Access to real-time data (not reports, live dashboards)
2. Decision-making authority (no committee delays)
3. Cross-functional alignment (sales, product, ops)
4. Budget flexibility (to run experiments)
5. Executive sponsorship from [CEO/COO]

RISKS & MITIGATION:
- Risk: Misalignment with product roadmap → Mitigation: Weekly syncs with CPO
- Risk: Sales team skepticism → Mitigation: Co-design with VP Sales, prove ROI
- Risk: Data quality issues → Mitigation: Audit data infrastructure week 1

FORMAT: Write this as a persuasive, professional 90-day plan document that 
[Company Name]'s exec team would want to execute.
Include specific numbers where you can infer them from research.
Make it obvious that you understand their business deeply.
n8n Configuration:

Node Type: OpenAI Chat Completion

Model: gpt-4o (best for long-form, strategic thinking)

Temperature: 0.7 (creative but grounded)

Max Tokens: 2500

Timeout: 45 seconds

Output Handling:

Save as .txt first (for markdown conversion)

Upload to Google Drive as .gdoc

Store raw text in Postgres assets table

### Sub-Workflow 3: RESUME TAILORING (OpenAI)
Prompt Architecture (Using 90-Day Plan As Foundation):

text
You are tailoring resume bullets for Matt Dimock for a specific role.

ROLE: [Job Title] at [Company]
COMPANY CONTEXT: [Industry, Stage, Size]

90-DAY PLAN INSIGHTS FROM PREVIOUS STEP: 
[Key opportunities, growth levers, pain points identified]

ORIGINAL EXPERIENCE (MOST RELEVANT ROLES):
- Current: Director of Growth & RevOps at HireHawk
  Designed AI recruiting engine, RevOps architecture, GTM strategy
  
- Previous: Director of Growth at Prosper Wireless
  Scaled ACP/LifeLine program from 0 to 600K households, Braze lifecycle
  
- Previous: CMO/COO at Affordable Insurance Quotes
  Built from $290K to $2M revenue, 30K leads at 55% CR, $5M LOI

- Previous: Director of Marketing at Bob's Watches
  Grew $20.5M to $45M revenue (120%), 32% order increase, 76% organic growth

YOUR TASK:
Rewrite the 3-4 most relevant resume bullets for this specific role.

RULES:
1. Start each bullet with IMPACT (revenue, efficiency, team growth, etc.)
2. Include specific metrics (%, $, time reduction, scale)
3. Highlight skills that directly map to the 90-day plan opportunities
4. Use action verbs (architected, scaled, implemented, generated, etc.)
5. Each bullet should be 1-2 lines max
6. Assume the reader skims (70% should understand value in first 10 words)

EXAMPLE FORMAT:
✓ "Architected GTM strategy for ACP program, activating 600K+ low-income 
  households and scaling revenue from $45M to $120M in 12 months while 
  reducing customer acquisition cost by 40%"
  
✗ "Responsible for growth marketing and lifecycle engagement"

CRITICAL: Your bullets should make the hiring manager think:
"This person already understands our biggest challenge and has proven experience solving it."

After the bullets, provide:
- Which of Matt's skills map to their top 3 needs (inferred from 90-day plan)
- 1-2 sentence narrative connecting Matt's background to this role
n8n Configuration:

Node Type: OpenAI Chat Completion

Model: gpt-4o

Temperature: 0.6 (precise, less creative)

Max Tokens: 1200

### Sub-Workflow 4: COVER LETTER (OpenAI)
Prompt (Hormozi: Problem, Agitation, Solution):

text
You are writing a cover letter for Matt Dimock for [Company] role.

THIS IS NOT A GENERIC COVER LETTER. It is a targeted problem-solution argument.

CONTEXT:
- Company: [Company Name], [Stage], [Industry]
- Role: [Job Title]
- Research insights: [From 90-day plan research]
- 90-day plan opportunity: [Main growth lever identified]
- Resume bullets: [From previous step]

THE STRUCTURE (Hormozi Framework):
┌─ PARAGRAPH 1: CREDIBILITY (Prove you understand their situation)
│  "You're in [industry], growing [trajectory]. Your biggest challenge right now 
│   is likely [X, because Y]. I know this because I've solved this exact problem 
│   twice before at [Company A] and [Company B]."
│
├─ PARAGRAPH 2: PROOF (Specific example that matches their situation)
│  "When I joined [similar company], they were [same situation]. Here's what I did: 
│   [specific tactic]. Result: [metric]. Timeline: [how fast]. This directly applies 
│   to your [specific company opportunity]."
│
├─ PARAGRAPH 3: YOUR OFFER (90-day plan, but conversational)
│  "In my first 90 days, I would [action 1], [action 2], [action 3]. My goal: 
│   [specific outcome]. Here's why I'm confident: [reason]."
│
└─ PARAGRAPH 4: CTA (Urgency, next steps)
   "I'd love to dig deeper into [specific question about their business]. 
    Can we grab 20 minutes this week?"

TONE: 
- Smart but humble (not arrogant)
- Problem-focused (not self-focused)
- Specific (not generic)
- Confident (not desperate)

LENGTH: 3-4 paragraphs max, <250 words

Your job: Write this cover letter so that the hiring manager reads it and thinks:
"This person already has the job half-done mentally. We need to talk to them."
n8n Configuration:

Node Type: OpenAI Chat Completion

Model: gpt-4o

Temperature: 0.7

Max Tokens: 1000

### Sub-Workflow 5: OUTREACH MESSAGE (OpenAI)
This is DIFFERENT from the cover letter. It's a LinkedIn DM or email to the hiring manager or recruiter.

Prompt (Sultanic: Specific, Social Proof, Scarcity/Urgency):

text
You are writing a 3-sentence outreach message for Matt to send to the hiring manager 
or recruiter at [Company] for [Role].

CONTEXT:
- Recipient: [Name, Title, Company context if available]
- Your angle: [One specific skill or win that matches their need]
- Differentiation: Not "I'm interested in this role" but "I think you should know this"

THE STRUCTURE (Sultanic):

SENTENCE 1: Hook (Why they should care about you, not why you care about the role)
"I noticed [Company] is scaling [specific initiative]. I've done this twice—grew 
[Prev Co 1] from $X to $Y and [Prev Co 2] from $A to $B in [timeframe]."

SENTENCE 2: Specificity (Show you understand THEIR challenge, not general industry)
"Your main challenge right now is likely [specific insight]. Most [role title]s solve 
this with [generic approach]. I have a different approach that's worked across 3 companies."

SENTENCE 3: CTA + Scarcity (Not desperate, but they should act)
"I'm being very selective about my next role—only [specific type]. Your situation fits 
perfectly. Could we schedule 20 minutes this week?"

TONE:
- Confident (not needy)
- Specific (not generic)
- Direct (no fluff)
- Respectful (of their time)

LENGTH: Exactly 3 sentences, <100 words total

This is what you send BEFORE applying formally. Goal: Get a meeting.
n8n Configuration:

Node Type: OpenAI Chat Completion

Model: gpt-4o

Temperature: 0.6

Max Tokens: 500

### Sub-Workflow 6: INTERVIEW PREP (OpenAI)
This is the FINAL asset. They're already interested. This is execution insurance.

Prompt (STAR Framework + Objection Handling):

text
You are building interview prep for Matt Dimock for [Company], [Role].

This is NOT generic "common interview questions." This is targeted prep for THIS company.

PART 1: STORY BANK (STAR Framework)
Generate 5-6 STAR stories Matt can use to answer predictable questions:

Story 1: "Tell me about a time you scaled revenue quickly"
├─ Situation: [Set context]
├─ Task: [What was the challenge?]
├─ Action: [What specifically did you do?]
└─ Result: [Metric, timeline, proof]

Repeat for:
- Story 2: "Tell me about a time you led a big team change"
- Story 3: "Tell me about a time you failed and recovered"
- Story 4: "Tell me about a time you prioritized when resources were limited"
- Story 5: "Tell me about a time you drove adoption of a new tool/process"
- Story 6: "Tell me about a time you improved something by X%"

Each story should:
- Reference real wins from resume/90-day plan
- Be 1-2 minutes when spoken aloud
- Highlight the specific skill relevant to [Role]

PART 2: ROLE-SPECIFIC QUESTIONS & ANSWERS
Based on [Company], [Role], [90-day plan research]:

Q1: "Why are you interested in [Company]?"
A: [Specific opportunity you identified + how you'd solve it]

Q2: "What's your approach to [specific challenge we researched]?"
A: [Your framework from 90-day plan]

Q3: "How would you measure success in this role in 90 days?"
A: [Your 90-day plan outcomes]

Q4: "Tell us about your experience with [specific tool/process needed]"
A: [Your expertise]

PART 3: OBJECTION HANDLING
Likely objections they might raise + your response:

Objection 1: "You've changed roles/companies a lot"
└─ Response: [Reframe as strategic growth moves, not job hopping]

Objection 2: "You haven't worked in [their specific industry]"
└─ Response: [How your growth system works ACROSS industries]

Objection 3: "This role might be too operational/strategic for your background"
└─ Response: [Proof of balance from your experience]

PART 4: QUESTIONS FOR THEM (Critical—shows you've done research)
Ask them 3-4 smart questions that show you understand their business:
- "What does your growth trajectory look like for [next 12 months]?"
- "What's the biggest bottleneck in your [specific process]?"
- "How are you thinking about [competitive threat/market opportunity]?"

PART 5: CLOSE FRAMEWORK
When they ask "Do you have any questions?"
└─ Ask 1 smart question (from Part 4)
└─ Then: "I'm genuinely excited about this opportunity because [specific reason]. 
   What's the next step in your process?"
n8n Configuration:

Node Type: OpenAI Chat Completion

Model: gpt-4o

Temperature: 0.7

Max Tokens: 2000

PART 5: FILE GENERATION & STORAGE (n8n)
Step 1: Create Google Drive Folder Structure
n8n Node Sequence:

Google Drive → Create Folder (Main)

Name: Job Hunter Assets

Check if exists (avoid duplicates)

Google Drive → Create Folder (Company-level)

Name: {company_name} - {job_title} - {date}

Parent: Job Hunter Assets

Create Sub-folders:

_Generated Assets (all 5 files)

_Research (raw research output)

_Notes (your personal notes, if any)

Step 2: Upload Generated Assets
For each asset (90-day plan, resume, cover letter, outreach, interview prep):

Convert to Google Doc

Node: Google Docs → Create Document

Title: [Company] - [Asset Type]

Body: [Markdown converted to formatted text]

Move to Folder

Node: Google Drive → Move File

Target: {company_name}.../_Generated Assets/

Store Link in Postgres

Node: Postgres Query

Insert into assets table:

sql
INSERT INTO assets 
(job_id, asset_type, gdrive_id, gdrive_url, content)
VALUES ($1, $2, $3, $4, $5)
Step 3: Update Google Sheets (Tracking)
Append new row to "Job Tracker" sheet:

text
Columns (in order):
- Date Hunted (today)
- Company Name
- Job Title
- Job URL
- Your Rating (1-10, manually updated later)
- Status (Assets Ready)
- 90-Day Plan Link
- Resume Link
- Cover Letter Link
- Outreach Template Link
- Interview Prep Link
- Applied? (Y/N, manual)
- Interview Date (manual)
- Outcome (manual)
- Notes (manual)
n8n Node:

Google Sheets → Append Row

Include: All links from Step 2

PART 6: ERROR HANDLING & RETRY LOGIC
Critical for production reliability:

text
Error Scenarios & Handling:

1. PERPLEXITY API TIMEOUT
   └─ Retry 3x with exponential backoff (2s, 4s, 8s)
   └─ If still fails: Save job as "RESEARCH_PENDING", notify you
   
2. OPENAI RATE LIMIT (Too many requests)
   └─ n8n has built-in rate limit handling
   └─ Queue job to retry in 5 minutes
   └─ Max retries: 5x before notifying you
   
3. GOOGLE DRIVE QUOTA EXCEEDED
   └─ Store files in Postgres temporarily
   └─ Retry Drive upload next day
   └─ Notify you to clean up Drive
   
4. INVALID JOB DATA (Missing required fields)
   └─ Reject payload with clear error message
   └─ Log to error_log table in Postgres
   └─ Return 400 Bad Request to webhook
   
5. DUPLICATE JOB (Already hunted)
   └─ Return 409 Conflict with existing job ID
   └─ Don't re-process
   
6. GENERAL API FAILURE
   └─ Log full error stack to Postgres
   └─ Email you with: job ID, error, timestamp
   └─ Mark job as "ERROR_PENDING" for manual review
Postgres Error Logging Table:

sql
CREATE TABLE error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  error_type VARCHAR(100),
  error_message TEXT,
  full_stack_trace TEXT,
  failed_at_step VARCHAR(100),
  retry_count SMALLINT DEFAULT 0,
  next_retry_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

## PART 7: RESUME TEMPLATE GUIDANCE (For Canva)
Strategic Framework (Psychology + CRO + ATS + Recruiter Brain)
Core Principle: Your resume is a sales pitch to bypass gatekeepers and prove you're the solution.

Page 1: Above-the-Fold (First 6 seconds)
HEADER (Spacing, visual hierarchy)

text
MATT DIMOCK                                    [LEFT-ALIGNED, Bold, 24pt]
Director of Growth & Revenue Operations       [Subtitle, 14pt, lighter color]
mattdim805@gmail.com | linkedin.com/in/mattdimock | 323.555.0123
Rule: Your name should be 2-3x larger than anything else. Recruiters scan resumes horizontally; make your name the anchor.

PROFESSIONAL HEADLINE (1 line, powerful)

text
Growth Systems Architect | $200M+ In Revenue Scaled | 
VP/Head/CRO-Track | Remote-First
Why this works:

Specific ("Growth Systems Architect" = different from "Marketing Manager")

Proof ("$200M+ scaled" = proof immediately)

Target role signal ("VP/Head/CRO track" = I know where I'm going)

Constraint-aware ("Remote-first" = your dealbreaker)

EXECUTIVE SUMMARY (3 lines, packed)

text
Growth leader who builds repeatable systems connecting strategy, data, and 
execution. Track record: $20.5M→$45M (D2C), $290K→$2M (Insurance), 
$45M→$120M (Telecom). Expertise: GTM architecture, demand gen, RevOps, 
team building, AI/automation. Seeking CRO/VP Growth role with $200K+ base.
Why this works:

Immediately answers: "Who are you?" + "Proof?"

Uses numbers (Hormozi: specific beats vague)

Lists competencies relevant to your target roles

Salary transparency (filters out low-ball offers)

Page 1: Core Experience (Current Role First)
Format:

text
DIRECTOR OF GROWTH & REVOPS | HireHawk | Sept 2024 – Present | Remote

✓ Designed and deployed AI-driven recruiting engine connecting custom 
  GPTs, n8n, and CrewAI to reduce time-to-fill from 60+ days to <21 days 
  (65% improvement), enabling sub-$1k CAC outbound at scale.

✓ Architected complete RevOps infrastructure using Zoho One: sales pipeline, 
  data model, automations, e-sign, billing, and real-time BI dashboards 
  enabling leadership visibility into pipeline health and revenue trajectory.

✓ Built brand positioning and GTM strategy including ICP research, 
  competitor analysis, website copy optimized for SEO/AEO/CRO targeting 
  $X00K revenue cohort. [Your number here]

✓ Implemented Lean Startup-inspired Notion framework (OKR → Hypothesis → 
  Experiment → Metric → Decision) giving leadership clear prioritization 
  and iteration velocity for shipping, iterating, or cutting initiatives.
Why this format:

✓ symbol = visual scanning (stands out vs. bullet points)

Action verbs = "Designed," "Architected," "Built," "Implemented"

Metrics first = "$X in CAC," "65% improvement," "21 days"

Business impact last = "enabling...," "giving leadership..."

ATS-friendly = plain text, no special formatting

Rule: Assume the recruiter has 6 seconds per role. Make impact obvious in first 10 words.

Page 1: Previous Roles (STAR Condensed)
text
DIRECTOR OF GROWTH | Prosper Wireless | Sept 2023 – April 2025 | Remote

✓ Architected and scaled ACP→LifeLine acquisition funnel, activating 600K+ 
  low-income households for subsidized internet program in 12 months, 
  becoming country's fastest-growing ACP provider.

✓ Deployed Braze lifecycle campaigns, rewards program (Prosper Perks), and 
  monthly sweepstakes driving revenue growth and reducing churn by [X]%.

✓ Negotiated and onboarded 20+ affiliate partners (Spectrum, Frontier, 
  Comcast) via TUNE/Impact, securing CPA rates up to $300/order and 
  scaling partnership channel to [X]% of new customer acquisition.

✓ Built and trained sales enablement system via LearnDash/WordPress, 
  automating ~50% of agent onboarding and reducing time-to-productivity.


CMO / COO | Affordable Insurance Quotes | June 2020 – Dec 2021 | Nashville

✓ Scaled non-standard auto insurance agency from $290K to $2M revenue 
  (586% growth) in 18 months by designing custom system for 1→16 state 
  expansion and affiliate infrastructure.

✓ Generated 30,000+ qualified leads at 55% conversion rate via affiliate 
  partnerships, strategic positioning, and sales ops. Secured $5M letter of intent 
  from PE buyer based on unit economics and systemization.

✓ Designed and deployed Zoho One cloud ecosystem (CRM, billing, automations) 
  enabling non-technical teams (marketing, sales, ops) to execute repeatable 
  processes without single points of failure.
Page 2: Earlier Roles (Condensed, Emphasizing Progression)
text
DIRECTOR OF MARKETING | Bob's Watches | Jan 2017 – Dec 2018 | Orange County

✓ Grew revenue 120% from $20.5M to $45M in 24 months (company now $120M+) 
  while increasing orders 32%, AOV 7%, and site sessions 50%.

✓ Led 7-person marketing team across omnichannel: organic (76% growth), 
  paid search/social (14-45% growth), email (66% growth), partnerships.

✓ Designed and implemented Dynamics 365 for marketing automation and sales 
  pipeline management, increasing SQLs for sales team by 35%.


MARKETING OPERATIONS MANAGER | Breakthrough Academy | Aug 2019 – June 2021 | Remote

✓ Implemented multi-partner live webinar strategy surpassing prior top 
  channel with 30%+ conversion rate.

✓ Helped grow active members 200→500+ via lead gen, member retention, 
  sub-brand launch (ContractorEvolution.com: 2K+ FB group, blog, podcast, YT).

✓ Led CRM transition from Keap to Zoho One, building cloud-based business 
  ecosystem for marketing, sales, HR, support, and reporting.


[Additional roles can be listed in collapsed/summary format for space]
Page 2: Skills & Tools (ATS + Scanning Optimization)
Format: Organized by category, scannable:

text
CORE COMPETENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Growth Strategy & Execution
├─ Go-to-Market (GTM) Strategy & Execution
├─ Demand Generation & Customer Acquisition
├─ Customer Lifecycle Management & Retention
├─ Revenue Operations (RevOps) Architecture
├─ Funnel Design & Conversion Rate Optimization

Team Leadership & Organizational Design
├─ Team Building & Scaling (Teams: 1→7 to 1→16 people)
├─ Cross-Functional Leadership & Collaboration
├─ Training, Onboarding & SOPs
└─ Performance Management & Accountability

Technology & Automation Stack
├─ CRM Systems: Zoho One, Dynamics 365, Keap, HubSpot
├─ Marketing Automation: Braze, Klaviyo, ActiveCampaign
├─ Data & Analytics: Metabase, ClickUp, Notion, Amplitude, Mixpanel
├─ Project Management: Asana, Jira, ClickUp
├─ Automation: Zapier, Make, n8n, AI agents (GPT, CrewAI)
├─ Infrastructure: PostgreSQL, Google Workspace, Stripe, Shopify

Marketing Execution
├─ Affiliate & Partnership Programs
├─ Email Marketing & Lifecycle Campaigns
├─ Paid Advertising (Google Ads, Facebook, LinkedIn)
├─ Organic Search (SEO) & Content Strategy
├─ Social Media Marketing & Community Building
├─ Website Development & Optimization (A/B testing, CRO)

Data-Driven Decision Making
├─ Analytics & Business Intelligence
├─ Dashboard Design & Reporting
├─ Experiment Design & Hypothesis Testing
├─ Market Research & Competitive Analysis
└─ KPI Definition & Performance Tracking

EDUCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
High School Diploma | El Camino Real High School | 2003
[Add certifications if any: Google Analytics, HubSpot, etc.]

PROFICIENCY LANGUAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
English (Native) | [Add any others]
Why this works:

ATS Scanning: Keywords like "Go-to-Market," "Revenue Operations," "Demand Generation" match job descriptions

Recruiter Scanning: Clear categories mean quick comprehension

Hierarchy: Most relevant skills first

Proof by Association: Lists tools you've mastered (Zoho, Braze, n8n = credibility)

Design Tips for Canva
Color & Typography:

Accent Color: Teal (#2180a1 – matches your Job Hunter brand)

Font: Use 2 fonts max

Headers: Bold, clean sans-serif (Montserrat, Poppins)

Body: Readable sans-serif (Roboto, Open Sans)

White Space: Critical. Cramped resumes feel chaotic. Use breathing room.

ATS Compliance:

Avoid: Tables, graphics, columns (PDFs break in ATS)

Use: Simple bullet points, clean hierarchy

Export: Always PDF, not image

Visual Hierarchy:

text
Your Name                    [Largest, 24-26pt]
Your Headline                [18pt, color accent]
Contact Info                 [12pt, gray]

SECTION HEADER               [14pt, bold, accent color]
─────────────────────────────
Role | Company | Dates       [12pt bold]
✓ Achievement               [11pt, regular]
✓ Achievement               [11pt, regular]
Length Guidelines:

Current role (HireHawk): 3-4 bullets (detailed, your entry point)

Previous 2 roles: 3-4 bullets each (mid-level detail)

Earlier roles: 2-3 bullets each (condensed, shows trajectory)

Total bullets: 12-15 across all roles (not 20+)

How n8n Will Tailor This Resume Per Job
Once your base template is live in Canva, here's the workflow:

text
For each new job you hunt:

1. n8n extracts job posting requirements
2. OpenAI analyzes: skills needed, keywords, role emphasis
3. OpenAI returns: "Emphasize RevOps here, hide insurance background"
4. You export your Canva template as PDF
5. You use OpenAI output to manually edit bullets (15 min, not 2 hours)
6. Result: Tailored resume with keywords + proof + emphasis

LONG-TERM (For SaaS): 
- Build workflow to generate resume in Google Docs directly
- Use Google Docs → PDF export
- Fully automated, 0 manual touch needed

---

## n8n Workflow JSON (Simplified Export)

Due to space, here's the **configuration template**:

```json
{
  "name": "Job Hunter Master",
  "active": true,
  "nodes": [
    {
      "name": "Webhook In",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [100, 100],
      "webhookId": "job-hunter-webhook"
    },
    {
      "name": "Perplexity Research",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [300, 100],
      "parameters": {
        "url": "https://api.perplexity.ai/chat/completions",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer {{ $env.PERPLEXITY_API_KEY }}"
        },
        "body": {
          "model": "sonar-medium-online",
          "messages": [
            {
              "role": "user",
              "content": "Research {{ $node[\"Webhook In\"].json.jobPayload.companyName }} company. Provide: stage, recent news, challenges, market position."
            }
          ]
        }
      }
    },
    {
      "name": "OpenAI - 90 Day Plan",
      "type": "n8n-nodes-base.openai",
      "typeVersion": 3,
      "position": [500, 100],
      "parameters": {
        "model": "gpt-4",
        "prompt": "Create a 90-day plan for a {{ $node[\"Webhook In\"].json.jobPayload.jobTitle }} role at {{ $node[\"Webhook In\"].json.jobPayload.companyName }}. Use the company research and focus on: Month 1 (Foundation), Month 2 (Scale), Month 3 (Optimize). Include KPIs and tactics."
      }
    },
    {
      "name": "OpenAI - Resume",
      "type": "n8n-nodes-base.openai",
      "typeVersion": 3,
      "position": [500, 200],
      "parameters": {
        "model": "gpt-4",
        "prompt": "Tailor these resume bullets for {{ $node[\"Webhook In\"].json.jobPayload.jobTitle }}. Use STAR format. Focus on: demand generation, team scaling, revenue impact."
      }
    },
    {
      "name": "Google Drive Upload",
      "type": "n8n-nodes-base.googleDrive",
      "typeVersion": 2,
      "position": [700, 100],
      "parameters": {
        "resource": "file",
        "operation": "upload",
        "parentId": "{{ $env.GOOGLE_DRIVE_FOLDER_ID }}",
        "fileName": "{{ $node[\"Webhook In\"].json.jobPayload.companyName }}_{{ now.format('YYYY-MM-DD') }}"
      }
    },
    {
      "name": "Google Sheets Append",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 3,
      "position": [700, 200],
      "parameters": {
        "spreadsheetId": "{{ $env.GOOGLE_SHEETS_ID }}",
        "range": "A1",
        "operation": "appendRow",
        "columns": [
          "Date Hunted",
          "Job Title",
          "Company",
          "Location",
          "Salary",
          "Status",
          "Assets"
        ]
      }
    }
  ],
  "connections": {
    "Webhook In": {
      "main": [
        [
          { "node": "Perplexity Research", "type": "main", "index": 0 }
        ]
      ]
    },
    "Perplexity Research": {
      "main": [
        [
          { "node": "OpenAI - 90 Day Plan", "type": "main", "index": 0 },
          { "node": "OpenAI - Resume", "type": "main", "index": 0 }
        ]
      ]
    },
    "OpenAI - 90 Day Plan": {
      "main": [
        [
          { "node": "Google Drive Upload", "type": "main", "index": 0 }
        ]
      ]
    },
    "Google Drive Upload": {
      "main": [
        [
          { "node": "Google Sheets Append", "type": "main", "index": 0 }
        ]
      ]
    }
  }
}
```

---

# PART 8: GOOGLE SHEETS TRACKER SCHEMA

**Create a Google Sheet named "Job Hunter Tracker"** with these columns (A–T):

| Column | Name | Type | Formula/Notes |
| :-- | :-- | :-- | :-- |
| A | Date Hunted | Date | AUTO from n8n |
| B | Job ID | Text | From jobPayload |
| C | Job Title | Text | From DOM |
| D | Company | Text | From DOM |
| E | Company LinkedIn | URL | Hyperlink to company profile |
| F | Location | Text | From DOM |
| G | Remote Type | Text | remote/hybrid/onsite |
| H | Job URL | URL | Hyperlink to job posting |
| I | Salary Min | Currency | Parsed from compensation |
| J | Salary Max | Currency | Parsed from compensation |
| K | Bonus % | Number | From description |
| L | Equity Mentioned | Checkbox | TRUE/FALSE |
| M | Job Poster Name | Text | Recruiter/hiring manager |
| N | Research Status | Dropdown | "Pending", "Complete" |
| O | Resume Assets | URL | Link to Google Drive resume |
| P | Cover Letter | URL | Link to Google Drive letter |
| Q | 90 Day Plan | URL | Link to Drive plan |
| R | Interview Prep | URL | Link to Drive prep |
| S | Application Status | Dropdown | "Hunted", "Applied", "Interview", "Offer", "Rejected" |
| T | Notes | Text | Your personal notes |

---

# PART 9: PERSONAL PROFILE SYSTEM

Users should be able to upload their profile once, which then informs all AI calls.

### Personal Profile JSON Schema

```json
{
  "userId": "matt-dimock",
  "profile": {
    "fullName": "Matt Dimock",
    "linkedInUrl": "https://www.linkedin.com/in/matt-dimock",
    "yearsExperience": 18,
    "currentRole": "Head of Growth",
    "professionalSummary": "B2B SaaS growth leader with 18 years experience scaling companies from $5M to $50M ARR...",
    
    "targetRole": {
      "titles": ["VP of Growth", "CMO", "Chief Revenue Officer", "VP RevOps"],
      "seniority": "VP|Head|Director",
      "industries": ["SaaS", "FinTech", "AI"],
      "companyStages": ["Series B", "Series C", "Series D", "Late Stage"],
      "companySize": "50-500 employees"
    },
    
    "compensation": {
      "salaryMin": 200000,
      "salaryMax": 350000,
      "bonusTarget": 0.25,
      "equityExpectation": "0.25-0.5% at Series B-D"
    },
    
    "workPreferences": {
      "remoteRequired": true,
      "asyncFirstCulture": true,
      "autonomyLevel": "high",
      "teamSizeToManage": "5-20 people",
      "budgetToOwn": "$1M-$5M marketing budget"
    },
    
    "skills": [
      "B2B Go-to-Market Strategy",
      "Demand Generation",
      "Product Marketing",
      "Revenue Operations",
      "Team Leadership & Scaling",
      "Analytics & SQL",
      "Sales Enablement",
      "Marketing Automation"
    ],
    
    "keyWins": [
      {
        "company": "Previous Company 1",
        "achievement": "Scaled pipeline from $5M to $50M ARR over 3 years",
        "metrics": "500% growth, built demand gen team from 2 to 12 people"
      },
      {
        "company": "Previous Company 2",
        "achievement": "Launched new product line generating $10M ARR within 18 months",
        "metrics": "$2M invested in marketing, 5:1 ROI"
      }
    ],
    
    "dealbreakers": [
      "100% on-site (non-negotiable)",
      "No marketing budget or autonomy",
      "Startup stage with < 30 employees (too risky)",
      "Industries: Tobacco, weapons, gambling"
    ],
    
    "mustHaves": [
      "Remote work flexibility",
      "Equity or shares",
      "Team of at least 5 people to manage",
      "Marketing budget ownership ($500K+)",
      "Reporting directly to C-suite"
    ],
    
    "niceToHaves": [
      "International expansion opportunity",
      "Public company upside",
      "Executive coaching budget",
      "Conferences & professional development"
    ]
  }
}
```

**How to Implement:**

1. Create a simple form in the Chrome extension popup where users fill out their profile.
2. Store in `chrome.storage.sync` and also send to Postgres.
3. Include the profile in every `jobPayload` sent to n8n.
4. Reference profile in every OpenAI/Perplexity prompt so AI personalizes assets.

---

# PART 10: RESUME STRATEGY & CONTENT FRAMEWORK

## The Matt Dimock Resume Challenge

**Your situation:**
- 18 years experience (2007–2025)
- Currently can only fit 3 jobs in 1-page resume
- Actually have 5–6 roles worth highlighting

## Solution: Modular, Role-Focused Resumes

Instead of a chronological 1-page resume, create **targeted 1.5–2 page variants** per job:

### Resume Structure

```
HEADER (4 lines)
├─ Name: MATT DIMOCK
├─ LinkedIn URL + email
├─ Professional headline (tailored to target role)
└─ Location: San Francisco, CA (Remote)

PROFESSIONAL SUMMARY (3–4 lines)
├─ Tailored to the specific role you're applying for
├─ Highlight 2–3 most relevant wins
└─ Include key metrics ($ARR scaled, team size, revenue influenced)

CORE COMPETENCIES (6–8 bullets)
├─ Hand-picked skills most relevant to THIS job
└─ Use keywords from job posting

EXPERIENCE (Select 3–4 most relevant roles)
├─ Job Title | Company | Dates
├─ 3–4 STAR bullets per role (Situation-Task-Action-Result)
├─ Focus on outcomes, not activities
└─ Include: revenue/pipeline impact, team scaled, systems built

EDUCATION & CERTIFICATIONS (2–3 lines)
└─ Degree, school, year | Key certifications

OPTIONAL: BOARD / ADVISORY ROLES (if applicable)
└─ Shows continued influence post-career
```

### Why This Works

✅ **1.5–2 pages is acceptable** for experienced leaders (not junior roles)  
✅ **Tailored variants per job** (each role gets the 3–4 most relevant achievements)  
✅ **Keyword-rich** (matches job posting language)  
✅ **Proof-backed** (every bullet has a metric)  
✅ **Scannable** (ATS-friendly, readable by recruiters)  

### STAR Bullet Formula

```
[Action Verb] + [What You Did] + [For Whom/Where] + [Result: $X or Y% or Z people]

Example:
❌ "Responsible for marketing at TechCorp"

✅ "Launched demand generation program generating $5M pipeline ARR, 
   scaling program from 0 to $5M in 18 months with team of 5 marketers"
```

### Content Framework for Matt (Use as Template)

```
PROFESSIONAL SUMMARY
────────────────────
B2B SaaS growth leader with 18 years scaling venture-backed companies from early stage to $50M+ ARR.
Proven expertise building and leading world-class demand generation and go-to-market teams.
Skilled at translating company strategy into measurable marketing outcomes (pipeline, velocity, CAC).
Most recent focus: [Tailored to this job's emphasis – e.g., "RevOps & marketing automation" if applying to RevOps role]

CORE COMPETENCIES
────────────────────
Go-to-Market Strategy | Demand Generation | Product Marketing | 
Revenue Operations | Team Leadership & Scaling | B2B SaaS | 
Sales Enablement | Marketing Analytics | SQL & Data-Driven Decision Making


EXPERIENCE
────────────────────

VP of Growth | TechCorp Inc. | 2022–Present
• Scaled marketing pipeline from $5M to $20M ARR in 18 months by launching 
  new demand gen program targeting enterprise segment (5:1 ROI on $2M spend).
• Built and managed demand gen team from 2 to 12 people; established repeatable 
  hiring, training, and performance management playbooks.
• Implemented marketing automation platform (HubSpot) + analytics infrastructure; 
  reduced customer acquisition cost 35% while increasing lead quality 40%.

Head of Growth | Previous Company | 2018–2022
• Led cross-functional growth initiatives; increased annual revenue from $10M to $40M ARR (4x growth).
• Owned $500K annual marketing budget and drove go-to-market strategy for 3 new product launches 
  (collectively generating $12M ARR).
• Managed team of 5 marketers and 2 sales developers; mentored 3 direct reports into promotions.

Senior Marketing Manager | Earlier Company | 2015–2018
• Spearheaded first formal demand generation program, generating $3M pipeline in year 1 
  (later scaled to $8M).
• Implemented marketing analytics dashboard and SQL-based attribution model; 
  provided weekly insights to exec team.
• Led product marketing function for SaaS platform, managing go-to-market for 2 major releases.

[Additional roles summarized or omitted depending on target job]

EDUCATION & CERTIFICATIONS
────────────────────
BS in Business Administration | State University | 2007
Certified in Inbound Marketing (HubSpot)
Google Analytics Certified
```

### How to Make This Work in Job Hunter

**Step 1: Create Master Resume**
- Build a comprehensive "Master Resume" with all 6 jobs listed (2–3 pages, for your eyes only).
- Store in notion or Google Docs as reference.

**Step 2: AI-Powered Variant Generation**
- Use n8n + OpenAI to create **tailored resume variants** per job:
  - Input: job posting + master resume
  - AI selects the 3–4 most relevant roles + reorders bullets
  - Output: tailored 1.5-page resume PDF
  - Store in Drive: `/Job Hunter Assets/{Company}/{Date}/resume_tailored.md`

**Step 3: Optional Canva Export**
- If you want visual polish:
  - Generate markdown → copy to Canva "Resume" template
  - Export as PDF
  - Store alongside markdown version
- *Note:* Canva API is complex; easier to use markdown + let recruiters handle PDF export, OR create one master Canva template you duplicate + edit manually.

---

# PART 11: IMPLEMENTATION TIMELINE (Immediate)

## Week 1: Foundation

### Day 1 (4 hours)
- [ ] Clone this playbook
- [ ] Set up Chrome extension locally (copy 7 files, load unpacked)
- [ ] Test extension on LinkedIn job page (see "Job Captured" overlay)
- [ ] Create Railway account + PostgreSQL database
- [ ] Run schema.sql in PostgreSQL

### Day 2 (3 hours)
- [ ] Create Node.js webhook repo on GitHub
- [ ] Deploy webhook to Railway (paste code, set env vars)
- [ ] Get public webhook URL
- [ ] Update extension popup to accept and save webhook URL
- [ ] Test: "Send to Job Hunter" → watch webhook logs

### Day 3 (4 hours)
- [ ] Set up n8n (already running at getfractional.up.railway.app)
- [ ] Create master workflow (follow n8n template from Part 7)
- [ ] Set OpenAI + Perplexity API keys in Railway secrets
- [ ] Test workflow with sample job data

### Day 4 (2 hours)
- [ ] Create Google Sheets tracker (copy schema from Part 9)
- [ ] Set up Google Drive folder structure (`/Job Hunter Assets/`)
- [ ] Configure n8n Google Drive + Sheets nodes
- [ ] Test full end-to-end: Click "Hunt" → Job in Sheets + Assets in Drive

### Day 5 (3 hours)
- [ ] Fine-tune AI prompts (90-day plan, resume, cover letter)
- [ ] Upload Matt's profile data to Postgres
- [ ] Verify personalization is working
- [ ] Create documentation + troubleshooting guide

**Week 1 Total: 16 hours**

---

# PART 12: COST FORECAST & SaaS PRICING

## MVP Cost Breakdown (Matt's Usage)

**One-time Setup:**
- Chrome extension: $0 (free)
- Railway PostgreSQL: $0 (included with n8n)
- Google Workspace: $0 (already have)
- **Total one-time: $0**

**Monthly Recurring (20 jobs/month):**

| Service | Cost | Usage | Notes |
| :-- | :-- | :-- | :-- |
| OpenAI (GPT-4) | $15 | 80 API calls (4 per job) | Resume, cover letter, plan, interview |
| Perplexity API | $5 | 20 calls (1 per job) | Company research |
| Railway (n8n + Postgres) | $7 | Baseline tier | 1 worker, shared Postgres |
| **Total | $27/month** | | |

**At Scale (100 jobs/month, multi-user SaaS):**

| Service | Cost | Usage | Notes |
| :-- | :-- | :-- | :-- |
| OpenAI | $75 | 400 calls | Bulk pricing |
| Perplexity | $25 | 100 calls | Volume discount |
| Railway (upgraded) | $40 | 2 workers, dedicated Postgres | Scale for load |
| **Total | $140/month** | | |

## SaaS Pricing Model (Future)

```
TIER 1: STARTER (Individual)
Price: $49/month
Includes:
  - 20 job hunts/month
  - All asset types (resume, letter, plan, interview)
  - Google Drive + Sheets integration
  - Email support
Margin: ~80% (cost $10, sell $49)

TIER 2: PROFESSIONAL (Teams of 2–5)
Price: $99/month
Includes:
  - 100 job hunts/month
  - Shared workspace
  - API access (integrate with ATS)
  - Priority support + Slack channel
Margin: ~75%

TIER 3: ENTERPRISE (Teams 5+, Departments)
Price: $500+/month
Includes:
  - Unlimited hunts
  - Advanced analytics + AI refinement
  - White-label option
  - Custom integrations (Salesforce, etc.)
  - Dedicated onboarding

PROJECTED SaaS REVENUE (Year 1)
──────────────────────────────
Q1: 50 Starter + 10 Pro = ~$2,500/month = $7,500
Q2: 150 Starter + 30 Pro + 2 Enterprise = ~$9,000/month = $27,000
Q3: 300 Starter + 75 Pro + 5 Enterprise = ~$20,000/month = $60,000
Q4: 500 Starter + 150 Pro + 10 Enterprise = ~$38,000/month = $114,000
TOTAL YEAR 1 REVENUE: ~$208,500

Cost: ~$1,500/month (ops, customer support, infrastructure)
Gross margin: ~65%
```

---

# PART 13: TROUBLESHOOTING & COMMON ERRORS

## Chrome Extension Errors

### Error: "Cannot read properties of null"
**Cause:** Element selector failed to find job data on page  
**Fix:**
1. Open DevTools (F12) → Console tab
2. Run: `document.querySelector('[selector-here]')`
3. If returns null, selector is wrong
4. Use browser DevTools element inspector to find correct selector
5. Update selector in content.js

### Error: "Webhook connection timeout"
**Cause:** Webhook URL unreachable  
**Fix:**
1. Verify URL in popup settings (should be like `https://your-app.railway.app/webhook/job-hunt`)
2. Test in terminal: `curl -X POST https://your-app.railway.app/health`
3. Check Railway logs for errors
4. Restart Railway service

### Error: "CORS error when posting to webhook"
**Cause:** Webhook server not allowing cross-origin requests  
**Fix:**
Add CORS middleware to webhook.js:
```javascript
const cors = require('cors');
app.use(cors({ origin: 'https://getfractional.up.railway.app' }));
```

---

# PART 14: FINAL LAUNCH CHECKLIST

### Chrome Extension
- [ ] manifest.json valid (check with `chrome --check-extension`)
- [ ] All 7 files present (manifest, content.js, background.js, fitScore.js, popup.html, popup.js, popup.css)
- [ ] Icons in `/images/` folder
- [ ] Extension loads in Chrome without errors
- [ ] Overlay appears on LinkedIn/Indeed job pages
- [ ] "Send to Job Hunter" button sends data to webhook
- [ ] Popup settings page works (can save webhook URL)

### Webhook Server
- [ ] Deployed to Railway
- [ ] Environment variables set (DATABASE_URL, N8N_WEBHOOK_URL)
- [ ] Health endpoint responds: `GET /health`
- [ ] Can receive POST requests: `POST /webhook/job-hunt`
- [ ] Data stored in PostgreSQL
- [ ] Logs show successful job captures

### PostgreSQL
- [ ] Schema created (all 5 tables: jobs, assets, research, profile, application_log)
- [ ] Can insert/query records
- [ ] No connection errors

### n8n Workflow
- [ ] Master workflow created and active
- [ ] Receives jobs from webhook trigger
- [ ] Calls Perplexity API (test with dummy call)
- [ ] Calls OpenAI API (test resume generation)
- [ ] Uploads to Google Drive
- [ ] Appends rows to Google Sheets

### Google Sheets
- [ ] "Job Hunter Tracker" sheet created
- [ ] All 20 columns labeled (A–T)
- [ ] Google Drive API enabled
- [ ] Service account or OAuth configured for n8n

### End-to-End Test
- [ ] Navigate to LinkedIn job
- [ ] Click "Send to Job Hunter"
- [ ] Check webhook logs → job received
- [ ] Check PostgreSQL → job stored
- [ ] Wait 2 minutes → n8n processes job
- [ ] Check Google Drive → assets uploaded
- [ ] Check Google Sheets → row appended with links
- [ ] ✅ Everything works!