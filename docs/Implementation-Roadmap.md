# Job Hunter OS - Implementation Roadmap

**Version**: 1.1  
**Purpose**: Task checklist organized by dependencies (not timeline)  
**Last Updated**: December 6, 2024

---

## 🎯 LAUNCH GOALS

### Success Criteria
- [ ] Process 1 job end-to-end successfully (capture → research → assets → Drive)
- [ ] All 6 asset types generate with quality score ≥45
- [ ] System produces usable assets (Matt can apply with them)
- [ ] API costs stay under $3 per job
- [ ] No critical bugs blocking usage

### MVP Scope (What We're Building)
✅ Chrome extension (capture job data from LinkedIn/Indeed)  
✅ Airtable database (5 tables with relationships)  
✅ n8n workflows (research + 6 asset generators)  
✅ AI integrations (Perplexity for research, OpenAI for assets)  
✅ Google Drive storage (organized folder structure)  
✅ End-to-end validation (5 real jobs)

### Out of Scope (Post-Launch)
❌ Job fit scoring/filtering automation  
❌ Email/LinkedIn response tracking  
❌ Analytics dashboard  
❌ Multi-user support  
❌ Chrome Web Store publication

---

## 📋 IMPLEMENTATION PHASES

### PHASE 1: FOUNDATION (Database & API Access)

**Objective**: Set up data storage and verify API connectivity before building automation

#### Task 1.1: Create Airtable Base
- [ ] Sign up for Airtable account (if needed)
- [ ] Create new base: "Job Hunter OS"
- [ ] Create table: Jobs Pipeline
  - [ ] Add all 20 fields per `/docs/Data-Architecture.md`
  - [ ] Set correct field types (Single Line Text, URL, Number, etc.)
  - [ ] Create 6 views: All Jobs, Needs Research, Ready to Apply, In Progress, High Priority, This Week
- [ ] Create table: Research Briefs
  - [ ] Add all 10 fields
  - [ ] Create link field to Jobs Pipeline
- [ ] Create table: Generated Assets
  - [ ] Add all 9 fields
  - [ ] Create link field to Jobs Pipeline
- [ ] Create table: Application Tracking
  - [ ] Add all 8 fields
  - [ ] Create link field to Jobs Pipeline
- [ ] Create table: Monthly Analytics
  - [ ] Add all 11 fields

**Validation Criteria:**
- [ ] All 5 tables exist with correct fields
- [ ] Link fields connect tables properly
- [ ] Can manually create test records
- [ ] Views display data correctly

---

#### Task 1.2: Configure Airtable API Access
- [ ] Generate Personal Access Token (PAT)
  - [ ] Go to Airtable account settings → Developer Hub
  - [ ] Create token with scopes: `data.records:read`, `data.records:write`, `schema.bases:read`
  - [ ] Store token securely (password manager)
- [ ] Get Base ID from Airtable URL
- [ ] Test API with curl:
```bash
  curl "https://api.airtable.com/v0/{BASE_ID}/Jobs%20Pipeline" \
    -H "Authorization: Bearer {YOUR_TOKEN}"
```
- [ ] Verify API returns data (empty array is success)
- [ ] Test creating a record via API
- [ ] Test updating a record via API
- [ ] Delete test records

**Validation Criteria:**
- [ ] API token works
- [ ] Can read records via API
- [ ] Can create records via API
- [ ] Can update records via API

**If Stuck**: Reference Airtable API docs at https://airtable.com/developers/web/api/introduction

---

#### Task 1.3: Verify n8n Access
- [ ] Log into n8n at https://getfractional.up.railway.app
- [ ] Verify existing credentials are present:
  - [ ] Airtable credential
  - [ ] Perplexity API credential
  - [ ] OpenAI API credential
  - [ ] Google Drive OAuth credential
- [ ] If any missing, add them:
  - [ ] Airtable: Use PAT from Task 1.2
  - [ ] Perplexity: Add API key
  - [ ] OpenAI: Add API key
  - [ ] Google Drive: Complete OAuth flow

**Validation Criteria:**
- [ ] Can access n8n dashboard
- [ ] All 4 required credentials configured
- [ ] Test credentials (use "Test" button in n8n)

---

#### Task 1.4: Set Up Google Drive Folder Structure
- [ ] Create root folder: `/Job Hunter Assets/`
- [ ] Share folder with service account email (from n8n Google credential)
- [ ] Test: Upload a test file via n8n
- [ ] Verify file appears in Drive
- [ ] Delete test file

**Validation Criteria:**
- [ ] Folder exists and is accessible
- [ ] n8n can upload files successfully
- [ ] Files are properly organized

---

### PHASE 2: DATA CAPTURE (Chrome Extension)

**Objective**: Build extension to capture job data from LinkedIn/Indeed

**Dependencies**: Phase 1 complete (Airtable API working)

#### Task 2.1: Create Extension Project Structure
- [ ] Create directory: `/src/extension/`
- [ ] Create files:
  - [ ] `manifest.json`
  - [ ] `popup.html`
  - [ ] `popup.js`
  - [ ] `popup.css`
  - [ ] `content.js`
  - [ ] `background.js`

---

#### Task 2.2: Build manifest.json
- [ ] Set manifest version: 3
- [ ] Define permissions: `storage`, `scripting`, `activeTab`
- [ ] Set host permissions: `*://linkedin.com/*`, `*://indeed.com/*`
- [ ] Define content scripts for LinkedIn and Indeed
- [ ] Define popup HTML
- [ ] Define background service worker

**Reference**: Chrome Extension Manifest V3 docs

---

#### Task 2.3: Build Settings UI (popup.html/js)
- [ ] Create form with inputs:
  - [ ] Airtable Base ID
  - [ ] Airtable PAT Token
- [ ] Add "Save" button
- [ ] Add "Test Connection" button
- [ ] Implement save to Chrome local storage
- [ ] Implement test connection (call Airtable PAT)
- [ ] Show success/error messages

**Validation Criteria:**
- [ ] Can save credentials
- [ ] Credentials persist after closing popup
- [ ] Test connection succeeds with valid credentials
- [ ] Test connection fails with invalid credentials

---

#### Task 2.4: Build LinkedIn Scraper (content.js)
- [ ] Detect LinkedIn job detail page (check URL pattern)
- [ ] Extract job data via DOM selectors:
  - [ ] Job Title
  - [ ] Company Name
  - [ ] Location
  - [ ] Salary (if present)
  - [ ] Job Description (full text)
  - [ ] Job URL
- [ ] Inject "Send to Job Hunter" overlay button
- [ ] On button click: send data to background.js
- [ ] Show loading state
- [ ] Show success/error message

**Validation Criteria:**
- [ ] Detects LinkedIn job pages correctly
- [ ] Extracts all available fields
- [ ] Handles missing fields gracefully (use null/empty string)
- [ ] Button appears in correct position
- [ ] UI feedback works

---

#### Task 2.5: Build Indeed Scraper (content.js - extend)
- [ ] Detect Indeed job detail page
- [ ] Extract job data (different selectors than LinkedIn)
- [ ] Reuse same overlay button UI
- [ ] Send to background.js

**Note**: Can defer Indeed support if LinkedIn works first

---

#### Task 2.6: Build API Handler (background.js)
- [ ] Listen for messages from content.js
- [ ] Get Airtable credentials from Chrome storage
- [ ] Validate data (required fields present)
- [ ] POST to Airtable API:
```javascript
  fetch(`https://api.airtable.com/v0/${baseId}/Jobs%20Pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        'Job Title': jobTitle,
        'Company Name': companyName,
        'Job URL': jobUrl,
        'Location': location,
        'Salary Min': salaryMin,
        'Salary Max': salaryMax,
        'Source': 'LinkedIn',
        'Job Description': description,
        'Status': 'Captured'
      }
    })
  })
```
- [ ] Handle API response (success/error)
- [ ] Send response back to content.js
- [ ] Log errors to console

**Validation Criteria:**
- [ ] Successfully creates Airtable record
- [ ] Handles API errors gracefully (timeout, network failure)
- [ ] Returns success/failure to content script
- [ ] Errors are logged for debugging

---

#### Task 2.7: Load Extension in Chrome
- [ ] Open `chrome://extensions/`
- [ ] Enable "Developer Mode"
- [ ] Click "Load unpacked"
- [ ] Select `/src/extension/` folder
- [ ] Verify extension loads without errors
- [ ] Check console for any warnings

**Validation Criteria:**
- [ ] Extension appears in Chrome
- [ ] No errors in extensions page
- [ ] Popup opens when clicked
- [ ] Can save settings

---

#### Task 2.8: Test Extension End-to-End
- [ ] Find real LinkedIn job posting
- [ ] Click "Send to Job Hunter"
- [ ] Verify success message
- [ ] Check Airtable: new record created
- [ ] Verify all fields populated correctly
- [ ] Test with 2-3 more jobs
- [ ] Test error cases:
  - [ ] No credentials saved
  - [ ] Invalid credentials
  - [ ] Network timeout (simulate)

**Validation Criteria:**
- [ ] Can capture LinkedIn jobs successfully
- [ ] Data appears correctly in Airtable
- [ ] Error handling works
- [ ] User feedback is clear

---

### PHASE 3: RESEARCH AUTOMATION (n8n Workflow)

**Objective**: Build workflow that researches companies via Perplexity API

**Dependencies**: Phase 1 complete (n8n + APIs configured), Phase 2 complete (jobs in Airtable)

#### Task 3.1: Create Research Workflow
- [ ] Open n8n dashboard
- [ ] Create new workflow: "02-Research-Workflow"
- [ ] Save workflow

---

#### Task 3.2: Add Webhook Trigger
- [ ] Drag "Webhook" node to canvas
- [ ] Configure:
  - [ ] HTTP Method: POST
  - [ ] Path: `/webhook/job-research`
  - [ ] Response Mode: "Last Node"
- [ ] Copy webhook URL (will use in Airtable automation)
- [ ] Test webhook with curl:
```bash
  curl -X POST {WEBHOOK_URL} \
    -H "Content-Type: application/json" \
    -d '{"jobId":"test123","companyName":"TestCorp"}'
```
- [ ] Verify webhook receives data in n8n execution log

**Validation Criteria:**
- [ ] Webhook activates successfully
- [ ] Receives test payload
- [ ] Logs show incoming data

---

#### Task 3.3: Add Airtable "Get Record" Node
- [ ] Drag "Airtable" node to canvas
- [ ] Connect to webhook node
- [ ] Configure:
  - [ ] Operation: Get
  - [ ] Base: Job Hunter OS
  - [ ] Table: Jobs Pipeline
  - [ ] Record ID: `{{ $json.jobId }}` (from webhook)
- [ ] Test execution
- [ ] Verify record data appears in output

**Validation Criteria:**
- [ ] Successfully fetches job record
- [ ] All fields visible in output
- [ ] No errors

---

#### Task 3.4: Add HTTP Request Node (Perplexity API)
- [ ] Drag "HTTP Request" node to canvas
- [ ] Connect to Airtable node
- [ ] Configure:
  - [ ] Method: POST
  - [ ] URL: `https://api.perplexity.ai/chat/completions`
  - [ ] Authentication: Header Auth
    - [ ] Name: `Authorization`
    - [ ] Value: `Bearer {PERPLEXITY_API_KEY}`
  - [ ] Body (JSON):
```json
    {
      "model": "llama-3.1-sonar-large-128k-online",
      "messages": [
        {
          "role": "system",
          "content": "You are a company research analyst. Provide detailed, factual research with sources."
        },
        {
          "role": "user",
          "content": "Research {{ $node['Airtable'].json.fields['Company Name'] }} in detail. Provide: 1) Company overview (stage, revenue, funding, employees), 2) Recent news (last 6 months), 3) Market position and competitors, 4) Growth signals, 5) Key challenges. Format as 500-600 word markdown with headers: ## Company Overview, ## Role Analysis, ## Market Context, ## Strategic Positioning. Be specific with numbers and dates."
        }
      ]
    }
```
- [ ] Test execution
- [ ] Verify Perplexity returns research

**Validation Criteria:**
- [ ] API call succeeds
- [ ] Response contains research text
- [ ] Research is 500-600 words
- [ ] No API errors

---

#### Task 3.5: Add Code Node (Parse & Score)
- [ ] Drag "Code" node to canvas
- [ ] Connect to HTTP Request node
- [ ] Add JavaScript code to:
  - [ ] Extract research text from Perplexity response
  - [ ] Parse into sections (Company Overview, Role Analysis, etc.)
  - [ ] Score quality:
    - Count company name mentions (1 point each, max 5)
    - Count specific numbers/metrics (1 point each, max 10)
    - Count recent dates (1 point each, max 5)
    - Check for all required sections (5 points each, max 20)
    - Total score 0-50
  - [ ] Output: `{ research: "...", sections: {...}, qualityScore: 45 }`

**Validation Criteria:**
- [ ] Successfully parses Perplexity response
- [ ] Extracts all sections
- [ ] Calculates quality score
- [ ] Score is reasonable (30-50 range)

---

#### Task 3.6: Add Conditional Branch
- [ ] Drag "IF" node to canvas
- [ ] Connect to Code node
- [ ] Configure:
  - [ ] Condition: `{{ $json.qualityScore }} >= 40`
  - [ ] True branch: Continue to create record
  - [ ] False branch: Retry or notify error

**Validation Criteria:**
- [ ] Routes correctly based on score
- [ ] Can test both branches

---

#### Task 3.7: Add Airtable "Create Record" Node (Research Brief)
- [ ] Drag "Airtable" node to canvas (under True branch)
- [ ] Configure:
  - [ ] Operation: Create
  - [ ] Base: Job Hunter OS
  - [ ] Table: Research Briefs
  - [ ] Fields:
    - [ ] Job: `{{ $node['Webhook'].json.jobId }}` (link to job)
    - [ ] Company Overview: `{{ $node['Code'].json.sections.companyOverview }}`
    - [ ] Role Analysis: `{{ $node['Code'].json.sections.roleAnalysis }}`
    - [ ] Market Context: `{{ $node['Code'].json.sections.marketContext }}`
    - [ ] Strategic Positioning: `{{ $node['Code'].json.sections.strategicPositioning }}`
    - [ ] Quality Score: `{{ $node['Code'].json.qualityScore }}`

**Validation Criteria:**
- [ ] Creates record successfully
- [ ] All sections populated
- [ ] Linked to correct job

---

#### Task 3.8: Add Airtable "Update Record" Node (Update Job Status)
- [ ] Drag "Airtable" node to canvas
- [ ] Connect after Create Record node
- [ ] Configure:
  - [ ] Operation: Update
  - [ ] Base: Job Hunter OS
  - [ ] Table: Jobs Pipeline
  - [ ] Record ID: `{{ $node['Webhook'].json.jobId }}`
  - [ ] Fields:
    - [ ] Status: "Researched"

**Validation Criteria:**
- [ ] Updates job status correctly
- [ ] Can see status change in Airtable

---

#### Task 3.9: Activate and Test Workflow
- [ ] Click "Activate" in n8n
- [ ] Test with curl (send real job ID)
- [ ] Monitor execution in n8n
- [ ] Check results:
  - [ ] Research brief created in Airtable
  - [ ] Quality score calculated
  - [ ] Job status updated to "Researched"
- [ ] Test with 2-3 more jobs
- [ ] Fix any issues

**Validation Criteria:**
- [ ] Workflow runs end-to-end successfully
- [ ] Research quality is good (score ≥40)
- [ ] No errors in execution log
- [ ] Airtable data is correct

---

#### Task 3.10: Add Error Handling
- [ ] Add retry logic for Perplexity API (max 2 retries)
- [ ] Add error notification path (email/webhook if all retries fail)
- [ ] Add logging for debugging
- [ ] Test error scenarios:
  - [ ] Invalid API key
  - [ ] Network timeout
  - [ ] Malformed response

**Validation Criteria:**
- [ ] Retries work correctly
- [ ] Errors are logged
- [ ] Failures don't crash workflow

---

### PHASE 4: AIRTABLE AUTOMATION (Trigger n8n)

**Objective**: Auto-trigger research workflow when new job is captured

**Dependencies**: Phase 2 complete (Chrome extension working), Phase 3 complete (Research workflow working)

#### Task 4.1: Create Airtable Automation
- [ ] Open Airtable base
- [ ] Click "Automations" in left sidebar
- [ ] Create new automation: "Trigger Research Workflow"
- [ ] Set trigger:
  - [ ] Type: "When record created"
  - [ ] Table: Jobs Pipeline
  - [ ] Condition: Status = "Captured"

---

#### Task 4.2: Add Script Action
- [ ] Add action: "Run script"
- [ ] Configure input variables:
  - [ ] recordId (from trigger)
  - [ ] jobTitle (from trigger)
  - [ ] companyName (from trigger)
  - [ ] jobDescription (from trigger)
- [ ] Add script:
```javascript
  let config = input.config();
  let webhookUrl = "https://getfractional.up.railway.app/webhook/job-research";
  
  let payload = {
    jobId: config.recordId,
    jobTitle: config.jobTitle,
    companyName: config.companyName,
    jobDescription: config.jobDescription
  };
  
  let response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.status}`);
  }
  
  console.log("Research workflow triggered successfully");
```

---

#### Task 4.3: Test Automation
- [ ] Manually create test job in Airtable
- [ ] Set Status = "Captured"
- [ ] Wait for automation to trigger
- [ ] Check automation execution log in Airtable
- [ ] Check n8n execution log
- [ ] Verify research brief created
- [ ] Verify job status updated to "Researched"

**Validation Criteria:**
- [ ] Automation triggers correctly
- [ ] n8n receives webhook
- [ ] Research completes successfully
- [ ] No errors in either system

---

#### Task 4.4: Test End-to-End (Extension → Airtable → n8n)
- [ ] Find new LinkedIn job
- [ ] Click "Send to Job Hunter" in extension
- [ ] Watch automation trigger (refresh Airtable)
- [ ] Wait for research to complete
- [ ] Verify all data is correct
- [ ] Test with 2-3 more jobs

**Validation Criteria:**
- [ ] Complete flow works automatically
- [ ] No manual intervention needed
- [ ] Data quality is good

---

### PHASE 5: ASSET GENERATION (n8n Workflows)

**Objective**: Build 5 workflows to generate job application assets

**Dependencies**: Phase 3 complete (Research workflow working)

#### Task 5.1: Create 90-Day Plan Workflow
- [ ] Create new workflow: "03-90-Day-Plan"
- [ ] Add webhook trigger: `/webhook/generate-90-day-plan`
- [ ] Add Airtable "Get Record" (Jobs Pipeline)
- [ ] Add Airtable "Get Record" (Research Briefs - linked)
- [ ] Add HTTP Request (OpenAI API):
  - [ ] Model: `gpt-4-turbo-preview`
  - [ ] System message: Load from `/prompts/asset-generation/20-90-Day-Plan.md`
  - [ ] User message: Combine research + Matt's profile + job description
- [ ] Add Code node (parse OpenAI response, score quality)
- [ ] Add Google Drive "Upload" node:
  - [ ] Folder: `/Job Hunter Assets/{{ companyName }}/{{ today }}/`
  - [ ] Filename: `02-90-Day-Plan.md`
- [ ] Add Airtable "Create Record" (Generated Assets)
- [ ] Activate and test

**Validation Criteria:**
- [ ] Generates 90-day plan successfully
- [ ] Plan is ~800 words
- [ ] Quality score ≥45
- [ ] File uploaded to Drive
- [ ] Airtable record created

---

#### Task 5.2: Create Resume Tailor Workflow
- [ ] Clone 90-Day Plan workflow
- [ ] Rename to "04-Resume-Tailor"
- [ ] Update webhook path: `/webhook/generate-resume`
- [ ] Update prompt: Load from `/prompts/asset-generation/30-Resume-Tailor.md`
- [ ] Update filename: `03-Resume-Tailored.md`
- [ ] Update asset type: "Resume (Tailored)"
- [ ] Test

**Validation Criteria:**
- [ ] Generates tailored resume bullets
- [ ] Includes relevant achievements
- [ ] Quality score ≥45

---

#### Task 5.3: Create Cover Letter Workflow
- [ ] Clone 90-Day Plan workflow
- [ ] Rename to "05-Cover-Letter"
- [ ] Update webhook path: `/webhook/generate-cover-letter`
- [ ] Update prompt: Load from `/prompts/asset-generation/40-Cover-Letter.md`
- [ ] Update filename: `04-Cover-Letter.md`
- [ ] Update asset type: "Cover Letter"
- [ ] Test

**Validation Criteria:**
- [ ] Generates cover letter
- [ ] 300-400 words
- [ ] Quality score ≥45

---

#### Task 5.4: Create Interview Prep Workflow
- [ ] Clone 90-Day Plan workflow
- [ ] Rename to "06-Interview-Prep"
- [ ] Update webhook path: `/webhook/generate-interview-prep`
- [ ] Update prompt: Load from `/prompts/asset-generation/50-Interview-Prep.md`
- [ ] Update filename: `05-Interview-Prep.md`
- [ ] Update asset type: "Interview Prep"
- [ ] Test

**Validation Criteria:**
- [ ] Generates STAR stories
- [ ] Includes objection handling
- [ ] Quality score ≥45

---

#### Task 5.5: Create Outreach Message Workflow
- [ ] Clone 90-Day Plan workflow
- [ ] Rename to "07-Outreach-Message"
- [ ] Update webhook path: `/webhook/generate-outreach`
- [ ] Update prompt: Load from `/prompts/asset-generation/60-Outreach-Message.md`
- [ ] Update filename: `06-Outreach-Message.md`
- [ ] Update asset type: "Outreach Message"
- [ ] Test

**Validation Criteria:**
- [ ] Generates 3-sentence message
- [ ] 40-60 words
- [ ] Quality score ≥45

---

#### Task 5.6: Create Master Orchestrator (Optional)
- [ ] Create workflow: "01-Master-Orchestrator"
- [ ] Add webhook trigger
- [ ] Call research workflow (wait for completion)
- [ ] Call all 5 asset workflows (parallel)
- [ ] Wait for all to complete
- [ ] Update Airtable job status to "Ready to Apply"
- [ ] Test

**Note**: Can skip this and call workflows individually for MVP

---

#### Task 5.7: Update Airtable Automation to Trigger Assets
- [ ] Edit "Trigger Research Workflow" automation
- [ ] Add second action: Trigger asset generation
- [ ] Wait for research to complete (check status)
- [ ] Call all 5 asset webhooks

**Alternative**: Create separate automation triggered by Status = "Researched"

---

### PHASE 6: QUALITY VALIDATION

**Objective**: Process real jobs and validate asset quality

**Dependencies**: All previous phases complete

#### Task 6.1: Process Job #1
- [ ] Find high-priority LinkedIn job
- [ ] Capture with extension
- [ ] Wait for automation to complete
- [ ] Review all 6 assets in Google Drive
- [ ] Score each asset manually (0-50):
  - [ ] Research: __/50
  - [ ] 90-Day Plan: __/50
  - [ ] Resume: __/50
  - [ ] Cover Letter: __/50
  - [ ] Interview Prep: __/50
  - [ ] Outreach: __/50
- [ ] Document issues/improvements needed
- [ ] Time tracking: Total time from capture to review: __ minutes

**Validation Criteria:**
- [ ] All assets generated
- [ ] Average score ≥45
- [ ] Assets are usable (Matt could apply with them)

---

#### Task 6.2: Process Jobs #2-5
- [ ] Repeat Task 6.1 for 4 more jobs
- [ ] Track patterns:
  - [ ] Which asset types score lowest?
  - [ ] What common issues appear?
  - [ ] Are there industry-specific problems?

**Validation Criteria:**
- [ ] 5 jobs processed successfully
- [ ] Consistent quality across jobs
- [ ] No blocking issues

---

#### Task 6.3: Refine Weak Assets
- [ ] Identify lowest-scoring asset type
- [ ] Review prompt in `/prompts/asset-generation/`
- [ ] Improve prompt with more specific instructions
- [ ] Retest with 2 jobs
- [ ] Verify improvement (score increases by ≥5 points)

---

#### Task 6.4: Document Issues and Fixes
- [ ] Create `KNOWN-ISSUES.md` in repo
- [ ] List any bugs or limitations
- [ ] Document workarounds
- [ ] Prioritize what to fix first

---

### PHASE 7: DOCUMENTATION & LAUNCH

**Objective**: Document system for Matt's use

#### Task 7.1: Create User Guide
- [ ] Create `README.md` in repo root
- [ ] Sections:
  - [ ] How to capture a job (Chrome extension)
  - [ ] How to review assets (Airtable + Drive)
  - [ ] How to update job status manually
  - [ ] How to track progress
  - [ ] Troubleshooting common issues

---

#### Task 7.2: Create Troubleshooting Guide
- [ ] Extension not working:
  - [ ] Check credentials in popup
  - [ ] Check browser console for errors
  - [ ] Reload extension
- [ ] Research failed:
  - [ ] Check Perplexity API key
  - [ ] Check n8n execution log
  - [ ] Retry manually
- [ ] Asset quality low:
  - [ ] Review prompt
  - [ ] Check if research quality was low
  - [ ] Regenerate manually

---

#### Task 7.3: Final System Check
- [ ] Chrome extension loads without errors
- [ ] Airtable database has all tables
- [ ] n8n workflows all activated
- [ ] All API credentials valid
- [ ] Google Drive folder structure correct
- [ ] Process 1 final test job end-to-end

---

#### Task 7.4: Launch!
- [ ] System ready for production use
- [ ] Begin applying to real jobs
- [ ] Track metrics:
  - [ ] Jobs captured: __
  - [ ] Assets generated: __
  - [ ] Applications submitted: __
  - [ ] Response rate: __%

---

## 📊 SUCCESS METRICS

### System Health
- [ ] Chrome extension functional
- [ ] All 7 n8n workflows activated
- [ ] All API integrations working
- [ ] No critical bugs

### Quality Metrics
- [ ] Average asset quality score: __/50 (target: ≥45)
- [ ] Research success rate: __% (target: ≥90%)
- [ ] Asset generation success rate: __% (target: ≥90%)

### Usage Metrics (Week 1)
- [ ] Jobs processed: __
- [ ] Time per job: __ minutes (target: <20)
- [ ] Cost per job: $__ (target: <$3)
- [ ] Applications submitted: __

---

## 🚨 CONTINGENCY PLANS

### If Chrome Extension Fails:
- **Fallback**: Use Airtable web form to manually enter job data
- **Impact**: Adds 2-3 minutes per job

### If Perplexity API Fails:
- **Fallback**: Use OpenAI with web search capability
- **Impact**: Higher cost (~$1 extra per job)

### If n8n Has Issues:
- **Fallback**: Run workflows manually via API calls
- **Impact**: Less automated, but still functional

### If Google Drive Upload Fails:
- **Fallback**: Store assets in Airtable Long Text fields
- **Impact**: Less organized, but accessible

---

**Last Updated**: December 6, 2024  
**Status**: Ready for execution - task-based, no time pressure