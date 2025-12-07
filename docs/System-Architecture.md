# Job Hunter OS - System Architecture

**Version**: 1.0  
**Last Updated**: December 6, 2024  
**Status**: Design Complete, Implementation In Progress

---

## 🎯 ARCHITECTURAL OVERVIEW

Job Hunter OS is a **capture → research → generate → deliver** automation system that transforms manual job application workflows into a semi-automated pipeline. The system reduces time-per-application from 2 hours to 15 minutes while maintaining high quality through AI-powered personalization.

### Design Principles

1. **User-Initiated Actions**: No automatic job scraping or mass application. Matt manually triggers every job capture.
2. **Quality Over Quantity**: Every asset scores ≥45/50 on quality rubrics before delivery.
3. **Transparency**: Matt reviews all generated assets before applying.
4. **Fail-Safe**: System errors never block Matt from applying manually.
5. **Cost-Conscious**: API costs stay under $50/month.

---

## 🏗️ COMPONENT ARCHITECTURE

### High-Level System Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                     USER LAYER (Matt)                           │
│  LinkedIn/Indeed → Browse Jobs → Click "Send to Job Hunter"    │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                  CAPTURE LAYER (Chrome Extension)               │
│  • Detects job page (LinkedIn/Indeed)                          │
│  • Extracts: title, company, location, salary, description     │
│  • Validates data                                               │
│  • POSTs JSON to Airtable API                                  │
│  • Shows confirmation overlay                                   │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   STORAGE LAYER (Airtable)                      │
│  • Jobs Pipeline table (primary)                               │
│  • Research Briefs table (linked)                              │
│  • Generated Assets table (linked)                             │
│  • Application Tracking table (events)                         │
│  • Monthly Analytics table (metrics)                           │
│  • Automations: Trigger n8n webhooks                           │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              ORCHESTRATION LAYER (n8n @ Railway)                │
│  Master Workflow:                                               │
│    1. Receive webhook from Airtable                            │
│    2. Route to Research Workflow                               │
│    3. Wait for research completion                             │
│    4. Route to Asset Generation Workflows (parallel)           │
│    5. Upload all assets to Google Drive                        │
│    6. Update Airtable with links and status                    │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AI LAYER (External APIs)                     │
│  • Perplexity API: Company research, market analysis           │
│  • OpenAI GPT-4: Asset generation (6 assets per job)          │
│  • Google Drive API: File storage and organization             │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   DELIVERY LAYER (Google Drive)                 │
│  /Job Hunter Assets/                                            │
│    ├── {Company Name}/                                          │
│    │   ├── {Date}/                                              │
│    │   │   ├── 01-Research-Brief.md                            │
│    │   │   ├── 02-90-Day-Plan.md                               │
│    │   │   ├── 03-Resume-Tailored.md                           │
│    │   │   ├── 04-Cover-Letter.md                              │
│    │   │   ├── 05-Interview-Prep.md                            │
│    │   │   └── 06-Outreach-Message.md                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                     USER LAYER (Matt)                           │
│  • Reviews assets in Airtable/Drive                            │
│  • Applies to job manually                                      │
│  • Updates status in Airtable                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 COMPONENT DETAILS

### Component 1: Chrome Extension

**Technology**: Manifest V3, Vanilla JavaScript  
**Hosting**: Local (user's browser)  
**Purpose**: Capture job data from LinkedIn/Indeed and send to Airtable

**Key Files:**
- `manifest.json`: Extension configuration
- `content.js`: DOM scraping and data extraction
- `popup.html/js`: Settings UI (store Airtable credentials)
- `background.js`: Event handling and API requests

**Data Flow:**
1. User visits LinkedIn/Indeed job page
2. Content script detects page type
3. Content script extracts job data via DOM selectors
4. User clicks "Send to Job Hunter" button (injected overlay)
5. Background script POSTs JSON to Airtable API
6. Success: Show "✓ Job Captured" message
7. Error: Show error message, log to console

**Error Handling:**
- Missing fields: Use defaults or mark as null
- API timeout: Retry once after 3 seconds
- Network error: Show "Check internet connection" message
- Invalid credentials: Show "Check Airtable settings"

**Security:**
- Airtable token stored in Chrome local storage (encrypted)
- HTTPS-only API requests
- No data sent to third parties

---

### Component 2: Airtable Database

**Technology**: Airtable (cloud-hosted SaaS)  
**Purpose**: Central data store and workflow orchestrator

**Tables**: 5 (see Data-Architecture.md for detailed schema)
1. Jobs Pipeline (primary)
2. Research Briefs (linked)
3. Generated Assets (linked)
4. Application Tracking (events)
5. Monthly Analytics (summary)

**Automations**:
1. Trigger n8n research workflow on new job
2. Update status after research completes
3. Update status after all assets generated

**API Usage:**
- Chrome Extension → Airtable: `POST /Jobs Pipeline` (create new job)
- n8n → Airtable: `POST /Research Briefs`, `POST /Generated Assets` (create linked records)
- n8n → Airtable: `PATCH /Jobs Pipeline/{recordId}` (update status)

**Performance:**
- Average API latency: <200ms
- Rate limit: 5 requests/second
- Webhook response time: <1 second

---

### Component 3: n8n Workflows (Railway)

**Technology**: n8n (open-source workflow automation)  
**Hosting**: Railway (https://getfractional.up.railway.app)  
**Infrastructure**: PostgreSQL (state), Redis (cache), 2 workers

**Workflows** (7 total):

#### 1. Master Orchestrator
- **Trigger**: Webhook from Airtable automation
- **Purpose**: Route to sub-workflows
- **Steps**:
  1. Receive webhook payload (jobId, jobTitle, companyName, etc.)
  2. Validate payload
  3. Call Research Workflow (async)
  4. Wait for research completion signal
  5. Call Asset Generation Workflows (parallel):
     - 90-Day Plan
     - Resume Tailor
     - Cover Letter
     - Interview Prep
     - Outreach Message
  6. Upload all assets to Google Drive
  7. Update Airtable with Drive links
  8. Send completion notification (optional)

#### 2. Research Workflow
- **Trigger**: Called by Master Orchestrator
- **Purpose**: Generate company research brief
- **Steps**:
  1. Load prompt from `/prompts/asset-generation/10-Research-Company.md`
  2. Call Perplexity API with company name + job description
  3. Parse response (500-600 word research brief)
  4. Score quality against rubric
  5. If score ≥40: Create record in Airtable Research Briefs table
  6. If score <40: Retry with refined prompt (max 2 retries)
  7. Signal completion to Master Orchestrator

#### 3. 90-Day Plan Workflow
- **Trigger**: Called by Master Orchestrator (after research completes)
- **Purpose**: Generate hyper-specific 90-day plan
- **Steps**:
  1. Fetch research brief from Airtable
  2. Load Matt's profile from Airtable/file
  3. Load prompt from `/prompts/asset-generation/20-90-Day-Plan.md`
  4. Call OpenAI GPT-4 with research + profile + prompt
  5. Parse response (800-word 90-day plan)
  6. Score quality against rubric
  7. If score ≥45: Upload to Google Drive as markdown
  8. If score <45: Retry with "refine for specificity" instruction
  9. Create record in Generated Assets table with Drive link

#### 4-7. Asset Generation Workflows (Resume, Cover Letter, Interview, Outreach)
- **Similar structure to 90-Day Plan Workflow**
- Each loads its own prompt from `/prompts/asset-generation/[30-60]-*.md`
- Each generates specific asset type
- All run in parallel after research completes

**Error Handling:**
- API timeout: Retry after 5 seconds (max 3 retries)
- API error (4xx/5xx): Log error, send notification, mark workflow as failed
- Quality score <40: Retry with refined prompt (max 2 retries)
- All retries failed: Mark as "Manual Review Required" in Airtable

**Monitoring:**
- n8n dashboard: View workflow execution history
- Airtable: Track success/failure rates
- Cost tracking: Log API token usage per workflow

---

### Component 4: AI APIs

#### Perplexity API
- **Model**: `llama-3.1-sonar-large-128k-online`
- **Purpose**: Real-time web search and company research
- **Cost**: ~$0.25 per research query
- **Usage**: 1 call per job (research only)
- **Rate Limit**: 50 requests/minute
- **Latency**: 5-15 seconds per call

**Prompt Structure:**
```
Research [Company Name] in [Industry]:
1. Company overview: stage, revenue, funding, employees
2. Recent news: funding rounds, product launches, leadership changes (last 6 months)
3. Market position: competitors, differentiation
4. Growth signals: hiring trends, market expansion
5. Key challenges: based on industry analysis and company stage

Provide a 500-600 word research brief formatted as markdown with headers:
## Company Overview
## Role Analysis
## Market Context
## Strategic Positioning for Candidate
```

#### OpenAI API
- **Model**: `gpt-4-turbo-preview` (128k context)
- **Purpose**: Generate personalized job assets
- **Cost**: ~$2.50 per job (6 assets × $0.40 per asset)
- **Usage**: 6 calls per job
- **Rate Limit**: 500 requests/minute
- **Latency**: 10-30 seconds per asset

**Prompt Structure:**
Each asset prompt includes:
1. System message: "You are an expert executive coach..."
2. Context: Research brief + Matt's profile
3. Task: Specific asset to generate
4. Format: Exact structure/template
5. Constraints: Word count, tone, quality criteria
6. Examples: Good vs. bad examples

#### Google Drive API
- **Purpose**: Store generated assets
- **Cost**: Free (within Google Workspace quota)
- **Usage**: 6 uploads per job + folder creation
- **Rate Limit**: 1,000 requests/100 seconds
- **Latency**: <1 second per upload

**Folder Structure:**
```
/Job Hunter Assets/
  ├── TechCorp/
  │   ├── 2024-12-06_[Job-Title]/
  │   │   ├── 01-Research-Brief.md
  │   │   ├── 02-90-Day-Plan.md
  │   │   ├── 03-Resume-Tailored.md
  │   │   ├── 04-Cover-Letter.md
  │   │   ├── 05-Interview-Prep.md
  │   │   └── 06-Outreach-Message.md
  │   └── 2024-12-15_Job-Title/
  │       └── [assets for second TechCorp role]
  └── SaasCo/
      └── 2024-12-07_[Job-Title]/
          └── [assets]
```

---

## 📊 DATA FLOW DIAGRAMS

### Sequence Diagram: Processing One Job
```
Matt                Chrome Ext       Airtable        n8n             Perplexity      OpenAI          Google Drive
 |                      |               |             |                  |              |                  |
 |--Browse LinkedIn---->|               |             |                  |              |                  |
 |                      |               |             |                  |              |                  |
 |--Click "Capture"---->|               |             |                  |              |                  |
 |                      |--Extract Data |             |                  |              |                  |
 |                      |               |             |                  |              |                  |
 |                      |--POST /Jobs-->|             |                  |              |                  |
 |<----"Job Captured"---|               |             |                  |              |                  |
 |                      |               |             |                  |              |                  |
 |                      |         [Automation Triggers]                  |              |                  |
 |                      |               |--Webhook--->|                  |              |                  |
 |                      |               |             |--Research Req--->|              |                  |
 |                      |               |             |<---Research------|              |                  |
 |                      |               |<--Create----|                  |              |                  |
 |                      |               |   Research  |                  |              |                  |
 |                      |               |   Record    |                  |              |                  |
 |                      |               |             |--90-Day Plan-------------------->|                  |
 |                      |               |             |                  |        [GPT-4 generates]        |
 |                      |               |             |<----90-Day Plan--------------------|                |
 |                      |               |             |----Upload----------------------------------->|     |
 |                      |               |<--Create----|                  |              |            |     |
 |                      |               |   Asset Rec |                  |              |            |     |
 |                      |               |             |                  |              |            |     |
 |<----Email: Assets Ready------------- |             |                  |              |            |     |
 |                      |               |             |                  |              |            |     |
 |--Review in Drive--------------------- |             |                  |              |      ----->|     |
 |<----View Assets------------------------------------|                  |              |      <-----|     |
```

### Error Flow: Handling API Failures
```
n8n Workflow
     ↓
[Call Perplexity API]
     ↓
┌────┴────┐
│ Success │ → Continue to asset generation
└─────────┘
     ↓
┌────┴────┐
│  Error  │
└────┬────┘
     ↓
[Wait 5 seconds]
     ↓
[Retry #1]
     ↓
┌────┴────┐
│ Success │ → Continue
└─────────┘
     ↓
┌────┴────┐
│  Error  │
└────┬────┘
     ↓
[Wait 10 seconds]
     ↓
[Retry #2]
     ↓
┌────┴────┐
│ Success │ → Continue
└─────────┘
     ↓
┌────┴────┐
│  Error  │
└────┬────┘
     ↓
[Mark as "Manual Review Required" in Airtable]
     ↓
[Send notification to Matt]
     ↓
[Log error details]
     ↓
[End workflow]
```

---

## ⚡ PERFORMANCE CHARACTERISTICS

### Latency (Time per Job)

| Component | Time | Notes |
|-----------|------|-------|
| Chrome Extension | <1 sec | Data extraction + API call |
| Airtable Record Creation | <1 sec | Simple POST request |
| Airtable Automation Trigger | 5 sec | Built-in delay to ensure data is ready |
| n8n Webhook Receipt | <1 sec | Immediate processing |
| Perplexity Research | 10-15 sec | Real-time web search |
| OpenAI 90-Day Plan | 20-30 sec | Longest asset (800 words) |
| OpenAI Other Assets | 10-15 sec each | Shorter content |
| Google Drive Upload | 1-2 sec per file | 6 files total |
| Airtable Status Update | <1 sec | Simple PATCH request |
| **Total End-to-End** | **3-5 minutes** | From capture to assets ready |

### Throughput

- **Max Jobs/Hour**: 12 (5 minutes per job)
- **Max Jobs/Day**: ~50 (limited by Matt's review capacity, not system)
- **Target**: 5 jobs/day = 25 minutes of Matt's time

### Cost (Per Job)

| Service | Cost | Usage |
|---------|------|-------|
| Perplexity | $0.25 | 1 research query |
| OpenAI GPT-4 | $2.50 | 6 asset generations |
| Airtable | $0.00 | Free tier (1,200 records) |
| Google Drive | $0.00 | Free tier (15 GB storage) |
| n8n | $7.00/month | Railway hosting (amortized) |
| **Total per Job** | **$2.75** | |
| **Monthly (20 jobs)** | **$55 + $7** | = **$62/month** |

**Note**: Slightly over $50 target, but acceptable for MVP. Optimize later.

### Reliability

- **Expected Uptime**: 99%+ (limited by Railway, Airtable, API uptime)
- **Error Rate**: <5% (most errors are retryable API timeouts)
- **Data Loss Risk**: Minimal (Airtable stores all job data before processing)

---

## 🔐 SECURITY ARCHITECTURE

### Authentication & Authorization

**Airtable:**
- Personal Access Token (PAT) with scopes: `data.records:read`, `data.records:write`
- Stored in Chrome extension local storage (encrypted by browser)
- Rotatable (can generate new token if compromised)

**n8n:**
- Self-hosted on Railway (Matt owns infrastructure)
- Basic auth for web UI (username + password)
- API credentials stored in n8n encrypted credential storage

**Google APIs:**
- OAuth 2.0 with refresh tokens
- Scopes: `drive.file` (limited to files created by this app)
- Stored in n8n credential storage

### Data Privacy

- **No data leaves Matt's control**: Airtable account, Google Drive account, Railway hosting
- **AI APIs**: Perplexity and OpenAI process data but don't store it long-term (per their policies)
- **Chrome Extension**: No telemetry, no data sent to third parties

### Threat Model

**Threat**: Chrome extension credentials stolen  
**Mitigation**: Token scoped to one Airtable base, can be revoked immediately

**Threat**: n8n instance compromised  
**Mitigation**: Railway security + 2FA on Railway account, all credentials encrypted at rest

**Threat**: API keys exposed in code  
**Mitigation**: All keys stored as environment variables, never in source code

---

## 🚀 DEPLOYMENT ARCHITECTURE

### Chrome Extension
- **Environment**: User's local browser
- **Distribution**: Load unpacked (development), Chrome Web Store (future)
- **Updates**: Manual (reload extension)

### Airtable
- **Environment**: Cloud (Airtable's infrastructure)
- **Backup**: Manual CSV export weekly
- **Updates**: Schema changes via Airtable UI

### n8n (Railway)
- **Environment**: Railway cloud hosting
- **Region**: US (closest to Matt)
- **Services**: 
  - Primary service (n8n)
  - PostgreSQL (state storage)
  - Redis (caching)
- **Scaling**: Vertical (upgrade Railway plan if needed)
- **Monitoring**: Railway dashboard + n8n execution logs

### Google Drive
- **Environment**: Cloud (Google's infrastructure)
- **Organization**: `/Job Hunter Assets/` folder in Matt's Drive
- **Sharing**: Private (only Matt has access)

---

## 📈 FUTURE OPTIMIZATIONS (Post-MVP)

### Phase 2: Performance
- Cache company research (reuse for same company)
- Batch asset generation (parallel OpenAI calls)
- Optimize prompts for shorter generation time

### Phase 3: Features
- Add job fit scoring (auto-rate jobs 1-5 stars)
- Add application tracking (scrape email for responses)
- Add analytics dashboard (conversion rates, best-performing assets)

### Phase 4: Scale
- Multi-user support (SaaS)
- Team collaboration (share research briefs)
- Custom branding (white-label for recruiters)

---

**Last Updated**: December 6, 2024  
**Next Review**: After MVP launch