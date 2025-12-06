# Job Hunter OS - Development Specification

**Version**: 1.0  
**Target Launch**: This Weekend  
**Developer**: Matt Dimock (w/ Claude Code assistance)  
**Tech Stack**: Chrome Extension + Airtable + n8n + AI APIs

---

## 🎯 PROJECT OVERVIEW

Job Hunter OS is a job application automation system that transforms the manual multiple-hours-per-application process into a 15-minute workflow. The system captures job data from LinkedIn/Indeed via a Chrome extension, stores it in Airtable, triggers n8n workflows to research companies and generate personalized assets (90-day plan, resume, cover letter, interview prep, outreach), and delivers everything to Google Drive for easy download.

**Target User**: Matt Dimock (Growth/RevOps/Lifecycle leader seeking a minimum $150k/yr remote role (ideally $200K+) with performance bonus, full benefits, and preferably equity or shares  
**Goal**: Process 5+ high-quality applications per day, 20-30 per month  
**Key Constraint**: Must launch immediately and need costs to be optimized as much as possible

---

## 🏗️ SYSTEM ARCHITECTURE

### Data Flow
```
LinkedIn/Indeed Job Page
    ↓ [User clicks "Send to Job Hunter"]
Chrome Extension (captures job data)
    ↓ [POST request]
Airtable (Jobs Pipeline table)
    ↓ [Airtable automation trigger]
n8n Workflow (orchestration)
    ↓ [Sequential workflows]
├─ Research Company (Perplexity API)
├─ Generate 90-Day Plan (OpenAI + research)
├─ Tailor Resume (OpenAI + Matt's profile)
├─ Write Cover Letter (OpenAI + research + plan)
├─ Create Interview Prep (OpenAI + research)
└─ Draft Outreach Message (OpenAI + research)
    ↓ [Upload assets]
Google Drive (/Job Hunter Assets/{Company}/{Date}/)
    ↓ [Log activity]
Airtable (update status + asset links)
    ↓ [User reviews]
Matt reviews assets → Applies to job
```

### Components

1. **Chrome Extension**
   - Detects LinkedIn/Indeed job pages
   - Extracts: title, company, location, salary, description, URL
   - Sends JSON to Airtable via API
   - Shows confirmation overlay

2. **Airtable Database**
   - Jobs Pipeline (main table)
   - Research Briefs (linked records)
   - Generated Assets (links to Drive files)
   - Application Tracking (status, outcomes)
   - Monthly Analytics (metrics)

3. **n8n Workflows** (hosted at Railway)
   - Master Orchestrator (triggers sub-workflows)
   - Research Workflow (Perplexity API)
   - Asset Generation Workflows (OpenAI API)
   - Storage Workflow (Google Drive)
   - Analytics Workflow (updates Airtable)

4. **AI APIs**
   - Perplexity: Company research
   - OpenAI GPT-4: Asset generation (6 assets per job)
   - Google Drive: File storage
   - Google Sheets: Optional tracking backup

---

## 📁 FILE STRUCTURE
```
Job-Hunter/
├── CLAUDE.md                          ← This file (dev spec)
├── README.md                          ← User documentation
│
├── docs/                              ← Strategy & Architecture
│   ├── Job-Hunter-OS-Strategic-Guidelines.md
│   ├── Matt-Dimock-Professional-Profile.md
│   ├── System-Architecture.md         ← Technical design details
│   ├── Data-Architecture.md           ← Airtable schema
│   ├── Implementation-Roadmap.md      ← Weekend execution plan
│   └── Asset-Generation-Template.md   ← Common structure for prompts
│
├── prompts/                           ← AI Prompt Templates
│   ├── asset-generation/
│   │   ├── 10-Research-Company.md
│   │   ├── 20-90-Day-Plan.md
│   │   ├── 30-Resume-Tailor.md
│   │   ├── 40-Cover-Letter.md
│   │   ├── 50-Interview-Prep.md
│   │   └── 60-Outreach-Message.md
│   │
│   ├── reference/                     ← Expert frameworks
│   │   ├── Reference-Hormozi-Value-Equation.md
│   │   ├── Reference-Alen-Ascension-Specificity.md
│   │   └── Reference-Rory-Psychologic.md
│   │
│   └── workflow/                      ← Orchestration logic
│       ├── Workflow-Orchestration-Master.md
│       └── Workflow-Iteration-Cycle.md
│
└── src/                               ← Code (YOU WILL BUILD THIS)
    ├── extension/                     ← Chrome extension
    │   ├── manifest.json
    │   ├── popup.html
    │   ├── popup.js
    │   ├── popup.css
    │   ├── content.js
    │   ├── background.js
    │   └── README.md
    │
    ├── n8n/                           ← n8n workflow exports
    │   ├── workflows/
    │   │   ├── 01-master-orchestrator.json
    │   │   ├── 02-research.json
    │   │   ├── 03-90-day-plan.json
    │   │   ├── 04-resume-tailor.json
    │   │   ├── 05-cover-letter.json
    │   │   ├── 06-interview-prep.json
    │   │   └── 07-outreach.json
    │   └── README.md
    │
    └── database/                      ← Airtable schema documentation
        └── airtable-schema.md
```

---

## 🔧 TECH STACK DETAILS

### Chrome Extension (Manifest V3)
- **Language**: Vanilla JavaScript (no frameworks)
- **Permissions**: `storage`, `scripting`, `activeTab`
- **Host Permissions**: `linkedin.com/*`, `indeed.com/*`
- **Key Files**:
  - `manifest.json`: Extension configuration
  - `content.js`: DOM scraping logic
  - `popup.html/js`: Settings UI
  - `background.js`: Event handling

### Airtable
- **Plan**: Free tier (1,200 records/base limit - sufficient for MVP)
- **API**: REST API with Personal Access Token
- **Tables**: 5 tables (see Data-Architecture.md for schema)
- **Automations**: Trigger n8n on new record creation

### n8n (Railway Deployment)
- **Hosting**: Railway (already running at getfractional.up.railway.app)
- **Database**: PostgreSQL (for n8n's internal state)
- **Cache**: Redis (for n8n performance)
- **Workers**: 1 primary + 1 worker process
- **API Credentials** (already configured in n8n):
  - Gmail OAuth2: `ubmyBEz8Fz3RcfQb`
  - Apify API: `R6XM0ZmRkdcraQ1S`
  - Perplexity API: `shB99Fe6YGSspGem`
  - OpenAI API: `f2WDaLaE9MFhKRuc`
  - Google Service Account: `PtMjNZkPLZjldH25`
  - Anthropic API: `vOODFGWWTnJt1jkd`

### APIs & Services
1. **Airtable API**
   - Create records (POST)
   - Update records (PATCH)
   - Query records (GET)

2. **Perplexity API** (Research)
   - Model: `llama-3.1-sonar-large-128k-online`
   - Usage: Company research, market analysis
   - Cost: ~$5/month (20 jobs)

3. **OpenAI API** (Asset Generation)
   - Model: `gpt-4-turbo-preview`
   - Usage: 6 assets per job (90-day plan, resume, cover letter, interview, outreach, research synthesis)
   - Cost: ~$15/month (20 jobs)

4. **Google Drive API** (Storage)
   - Folder structure: `/Job Hunter Assets/{Company Name}/{Date}/`
   - Files: `.md` format for all assets
   - Permissions: Private to Matt's account

---

## 🗓️ DEVELOPMENT ORDER

### (4 hours): Foundation
**Priority 1**: Airtable Database Setup
- Create 5 tables (Jobs Pipeline, Research Briefs, Generated Assets, Application Tracking, Monthly Analytics)
- Define fields, relationships, views
- Create automations to trigger n8n webhooks
- Test: Manually add record → verify webhook trigger

**Priority 2**: Chrome Extension - Basic Capture
- Build manifest.json
- Create content.js (detect job page, extract data)
- Create popup.html/js (settings UI)
- Test: Click extension on LinkedIn → see captured data

### (4 hours): Core Workflow
**Priority 3**: n8n Research Workflow
- Create workflow: Airtable trigger → Perplexity API → Update Airtable
- Use prompt from `/prompts/asset-generation/10-Research-Company.md`
- Test: Trigger workflow → research brief generated

**Priority 4**: n8n 90-Day Plan Workflow
- Create workflow: Use research brief → OpenAI API → Generate plan → Save to Drive → Update Airtable
- Use prompt from `/prompts/asset-generation/20-90-Day-Plan.md`
- Test: End-to-end (job capture → research → 90-day plan)

### (2 hours): Testing & Debugging
- Process 2 test jobs end-to-end
- Fix bugs, refine prompts
- Document issues

### (3 hours): Remaining Assets
**Priority 5**: Build workflows for:
- Resume Tailoring (30-Resume-Tailor.md)
- Cover Letter (40-Cover-Letter.md)
- Interview Prep (50-Interview-Prep.md)
- Outreach Message (60-Outreach-Message.md)

### (3 hours): Quality & Polish
- Process 5 real jobs
- Validate asset quality
- Tune prompts based on outputs
- Fix any workflow bugs

### (2 hours): Launch Prep
- Document any known issues
- Create user guide (how to use the system)
- Set up analytics tracking
- Deploy final version

**Total Time**: 14-18 hours

---

## 🧪 TESTING STRATEGY

### Unit Testing (Per Component)
1. **Chrome Extension**
   - Test on 5 different LinkedIn jobs
   - Test on 3 different Indeed jobs
   - Verify all fields captured correctly
   - Test error handling (missing data)

2. **Airtable**
   - Manually create record → verify fields
   - Test automation triggers → verify webhook fires
   - Test record updates → verify data integrity

3. **n8n Workflows**
   - Test each workflow independently
   - Mock API responses for faster iteration
   - Validate error handling (API timeout, bad data)

### Integration Testing
1. End-to-end: LinkedIn → Extension → Airtable → n8n → Drive
2. Test with 5 real jobs from different companies/industries
3. Validate asset quality against rubrics in prompts

### User Testing
- Process 5 real applications
- Measure time savings (target: 2 hours → 15 minutes)
- Validate hiring managers respond positively

---

## 📖 REFERENCE DOCUMENTATION

### WHERE TO FIND WHAT

**Strategy & Thinking**
- Master strategy: `/docs/Job-Hunter-OS-Strategic-Guidelines.md`
- Matt's profile: `/docs/Matt-Dimock-Professional-Profile.md`
- Technical design: `/docs/System-Architecture.md`
- Database schema: `/docs/Data-Architecture.md`
- Implementation plan: `/docs/Implementation-Roadmap.md`

**AI Prompts**
- Asset templates: `/prompts/asset-generation/[workflow].md`
- Expert frameworks: `/prompts/reference/[expert].md`
- Orchestration: `/prompts/workflow/Workflow-Orchestration-Master.md`

**Code**
- Chrome extension: `/src/extension/`
- n8n workflows: `/src/n8n/workflows/`
- Database docs: `/src/database/`

---

## 🎯 SUCCESS CRITERIA

### MVP Launch Checklist
- [ ] Chrome extension installed and working on LinkedIn + Indeed
- [ ] Airtable database created with 5 tables
- [ ] n8n workflows deployed (7 workflows total)
- [ ] End-to-end test: Process 1 job successfully
- [ ] Quality test: Process 5 jobs, validate assets score 45+ on rubrics
- [ ] Time test: Average time per application <20 minutes
- [ ] Cost test: Monthly API costs <$30

### Week 1 Validation
- [ ] Process 10 real applications
- [ ] Get 2+ responses from hiring managers
- [ ] Refine prompts based on quality feedback
- [ ] Document lessons learned

---

## ⚠️ CRITICAL CONSTRAINTS

1. **Time**: Must launch in <48 hours (no feature creep)
2. **Cost**: Keep API costs <$50/month
3. **Simplicity**: No over-engineering (MVP first, optimize later)
4. **Quality**: Every asset must score 45+ on rubric
5. **User Skill**: Matt is 2/5 n8n, 1/5 APIs, 1/5 JS - scaffold everything

---

## 🚀 GETTING STARTED WITH CLAUDE CODE

When starting development, use this prompt:
```
You are helping me build Job Hunter OS according to /CLAUDE.md specification.

CURRENT TASK: [Describe what you're building - e.g., "Create Chrome extension to capture LinkedIn job data"]

CONTEXT:
- Read /CLAUDE.md for system architecture
- Reference /docs/System-Architecture.md for technical details
- Reference /docs/Data-Architecture.md for Airtable schema
- Follow /docs/Implementation-Roadmap.md for build order

REQUIREMENTS:
- Tech stack: [Chrome Extension | Airtable | n8n | specific APIs]
- User skill level: Beginner (scaffold everything, add comments)
- Time constraint: Weekend launch (keep it simple)
- Quality: Follow best practices, but prioritize shipping over perfection

DELIVERABLE: [What specific output you need]
```

---

## 📝 NOTES

- This is an MVP - optimize after launch, not before
- Focus on core workflow (Research → 90-Day Plan) first
- Test incrementally - don't build everything before testing
- Document issues as you go (for future iterations)
- Launch is more important than perfection
- Validate everything is accurate

---

**Last Updated**: December 6, 2024  