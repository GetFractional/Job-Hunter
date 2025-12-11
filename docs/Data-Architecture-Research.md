# Job Hunter OS - Data Architecture (Research)

**Version**: 2.3  
**Database**: Airtable  
**Last Updated**: December 10, 2025

---

## DATABASE STRATEGY

### Why Airtable?

Chosen over PostgreSQL because:
- Visual interface (Matt can see/edit data easily)
- Built-in views, filters, sorting (no SQL needed)
- Native n8n integration (simpler than raw SQL)
- Automations built-in (trigger n8n webhooks)
- Free tier sufficient for MVP (1,200 records/base)

Trade-offs accepted:
- 1,200 record limit on free tier (sufficient for 1,000+ jobs)
- Less flexible than PostgreSQL for complex queries
- Vendor lock-in (but easy to export to CSV later)

---

## TABLE SCHEMA

### TABLE 1: Jobs Pipeline (Primary Table)

**Purpose**: Core job records – one row per job opportunity. **Created first via job hunting**, then linked to Research Briefs when research is conducted.

**Fields:**

| Field Name        | Type               | Description                                   | Required | Example                                  |
|-------------------|--------------------|-----------------------------------------------|----------|------------------------------------------|
| `Job Title`       | Single line text   | Role title                                    | Yes      | `VP of Growth`                           |
| `Company Name`    | Single line text   | Company name                                  | Yes      | `TechCorp`                               |
| `Company Page`    | URL                | Company page on the job platform              | No       | https://linkedin.com/company/techcorp    |
| `Job URL`         | URL                | Original job posting URL                      | Yes      | https://linkedin.com/jobs/...            |
| `Location`        | Single line text   | Job location                                  | No       | `San Francisco, CA`                      |
| `Workplace Type`  | Single line text   | Remote, hybrid, on-site work                  | No       | `Remote`                                 |
| `Employment Type` | Single line text   | Type of employment being offered              | No       | `Full-time`                              |
| `Salary Min`      | Number             | Minimum salary                                | No       | 180000                                   |
| `Salary Max`      | Number             | Maximum salary                                | No       | 220000                                   |
| `Equity Mentioned`| Checkbox           | Does posting mention equity?                  | No       | ✓                                        |
| `Source`          | Single select      | Where job was found                           | Yes      | `LinkedIn`, `Indeed`                     |
| `Job Description` | Long text          | Full job posting text                         | Yes      | [Full text]                              |
| `Status`          | Single select      | Current stage                                 | Yes      | `Captured`, `Researched`, `Applied`, `Interview`, `Offer`, `Rejected` |
| `Research Brief`  | Link to record     | Link to Research Briefs table                 | No       | → Research record                        |
| `Generated Assets`| Link to records    | Links to Generated Assets table               | No       | → Multiple asset records                 |
| `Application Tracking` | Link to records | Links to Application Tracking table          | No       | → Multiple event records                 |
| `Applied Date`    | Date               | When application was submitted                | No       | 2024-12-10                               |
| `Interview Date`  | Date               | When interview is scheduled                   | No       | 2024-12-15                               |
| `Outcome`         | Single select      | Final result                                  | No       | `Offer`, `No Response`, `Rejected`       |
| `Matt's Rating`   | Rating (5 stars)   | Matt's interest level                         | No       | ⭐⭐⭐⭐⭐                                    |
| `Notes`           | Long text          | Matt's notes                                  | No       | `Really like this one...`                |
| `Created`         | Created time       | Auto-populated                                | Yes      | 2024-12-06 10:30 AM                      |
| `Last Modified`   | Last modified time | Auto-populated                                | Yes      | 2024-12-06 2:45 PM                       |

**Important**: Airtable also assigns an **internal record ID** to each row (e.g., `recOSOd4PiXiNr3Mq`).  
- This is **not a visible field**, but:
  - It appears in the URL when you open a record  
    `https://airtable.com/appHFrk9vapCY39F1/tblcY5odzvocdPMc6/viw30RRl4XRp2ogXg/recOSOd4PiXiNr3Mq?blocks=hide`
  - It is what the API uses in link fields (like `job` in Research Briefs)

**Views:**

1. **All Jobs** (Grid): All records, sorted by `Created` (newest first).  
2. **Needs Research** (Grid): `Status = "Captured"`, shows jobs waiting for research.  
3. **Ready to Apply** (Grid): `Status = "Researched"`, shows jobs with assets ready.  
4. **In Progress** (Kanban): Group by `Status` (Captured → Researched → Applied → Interview).  
5. **High Priority** (Grid): `Matt's Rating ≥ 4` stars, sorted by `Created`.  
6. **This Week** (Calendar): View by `Applied Date`.

---

### TABLE 2: Research Briefs (Linked Records)

**Purpose**: Store fully structured company and role intelligence for each job, with one research brief per job. Every leaf node from the research JSON gets its own column for maximum control and context access.

**Fields:**

| Field Name                      | Type               | Description                                                         | Required |
|---------------------------------|--------------------|---------------------------------------------------------------------|----------|
| `research_id`                  | Auto number        | Primary key                                                         | Yes      |
| `job`                          | Link to record     | Links to Jobs Pipeline (one-to-one). **MUST be an existing Jobs Pipeline record ID (`rec...`)** | Yes      |
| `job_title`                    | Lookup (from job)  | Job title from Jobs Pipeline                                       | No       |
| `company_name`                 | Lookup (from job)  | Company name from Jobs Pipeline                                    | No       |
| `fit_label`                    | Single select      | Overall fit label: `reject`, `caution`, `pursue`                   | No       |
| `fit_score`                    | Number (0–50)      | Fit score (0–50)                                                   | No       |
| `fit_summary`                  | Long text          | Narrative summary of fit assessment                                | No       |
| `reasons_to_pursue`            | Long text          | Bullet list of reasons to pursue                                   | No       |
| `risks_or_flags`               | Long text          | Bullet list of risks or red flags                                  | No       |
| `company_summary`              | Long text          | High-level company overview summary                                | Yes      |
| `stage`                        | Single line text   | Company stage (e.g., Series B, late-stage private, public)         | No       |
| `revenue_range`                | Single line text   | Revenue range or estimate (e.g., "$20–30M ARR")                    | No       |
| `funding`                      | Single line text   | Recent funding status / investors (e.g., "$45M Series B led by…")  | No       |
| `headcount`                    | Single line text   | Approximate headcount (e.g., "~250 FTEs")                          | No       |
| `products_services`            | Long text          | Key products/services and categories                               | No       |
| `revenue_model`                | Single line text   | Revenue model (e.g., SaaS, transactional, marketplace, hybrid)     | No       |
| `gtm_motion`                   | Long text          | Go-to-market motion (e.g., PLG + mid-market sales + partner)       | No       |
| `mission`                      | Long text          | Company mission statement                                          | No       |
| `vision`                       | Long text          | Company long-term vision                                           | No       |
| `icp_summary`                  | Long text          | Ideal customer profile summary (segments, buyers, use cases)       | No       |
| `reported_cac`                 | Long text          | Company-reported CAC: $X (Year, Source)                            | Yes      |
| `estimated_cac_range`          | Long text          | Estimated CAC: $A–$B based on assumptions (list them)              | Yes      |
| `role_summary`                 | Long text          | High-level summary of the role                                     | Yes      |
| `role_requirements`            | Long text          | Bullet list of real requirements (not just JD bullets)             | Yes      |
| `team_structure`               | Long text          | Reporting line and team composition                                | No       |
| `success_metrics`              | Long text          | Bullet list of Year 1+ success metrics                             | No       |
| `pain_points`                  | Long text          | Bullet list of pains this role must solve                          | No       |
| `inflection_point`             | Long text          | Why they are hiring now / key inflection point signaling urgency   | No       |
| `market_summary`               | Long text          | High-level market context summary                                  | Yes      |
| `industry_trends`              | Long text          | Bullet list of key industry trends and tailwinds/headwinds         | No       |
| `growth_signals`               | Long text          | Bullet list of growth signals (hiring, launches, expansion)        | No       |
| `competitive_threats`          | Long text          | Bullet list of competitive threats and positioning context         | No       |
| `hiring_manager_intel_summary` | Long text          | Summary of hiring manager background and decision style            | No       |
| `hiring_manager_name`          | Single line text   | Name of the hiring manager I would likely direct report to         | No       |
| `hiring_manager_title`         | Single line text   | Title of the hiring manager                                        | No       |
| `hiring_manager_priority`      | Single line text   | Priority/focus area of the hiring manager                          | No       |
| `hiring_manager_decision_gate` | Single line text   | Decision criteria for the hiring manager                           | No       |
| `stakeholder_1_name`           | Single line text   | Name of primary stakeholder                                        | No       |
| `stakeholder_1_title`          | Single line text   | Title of stakeholder 1 (often COO, CMO, CRO, or VP Ops)            | No       |
| `stakeholder_1_priority`       | Long text          | Priority/focus area of stakeholder 1                               | No       |
| `stakeholder_1_decision_gate`  | Long text          | Decision criteria for stakeholder 1                                | No       |
| `stakeholder_2_name`           | Single line text   | Name of secondary stakeholder (often Head of Sales, VP Product)    | No       |
| `stakeholder_2_title`          | Single line text   | Title of stakeholder 2                                             | No       |
| `stakeholder_2_priority`       | Long text          | Priority/focus area of stakeholder 2                               | No       |
| `stakeholder_2_decision_gate`  | Long text          | Decision criteria for stakeholder 2                                | No       |
| `stakeholder_3_name`           | Single line text   | Name of tertiary stakeholder (often CFO, CTO, VP People)           | No       |
| `stakeholder_3_title`          | Single line text   | Title of stakeholder 3                                             | No       |
| `stakeholder_3_priority`       | Long text          | Priority/focus area of stakeholder 3                               | No       |
| `stakeholder_3_decision_gate`  | Long text          | Decision criteria for stakeholder 3                                | No       |
| `hiring_priorities`            | Long text          | Aggregated list of all hiring priorities across stakeholders       | No       |
| `strategic_positioning_summary`| Long text          | Summary of how Matt should position himself for this role          | Yes      |
| `best_angle`                   | Long text          | Best angle or narrative for Matt (how to frame his expertise)      | No       |
| `proof_points`                 | Long text          | Bullet list of Matt's most relevant proof points                   | No       |
| `quick_win_opportunities`      | Long text          | Bullet list of 30–90 day quick wins Matt could deliver             | No       |
| `risks_to_address`             | Long text          | Bullet list of risks/objections Matt must proactively address      | No       |
| `key_insights`                 | Long text          | Bullet list of most important insights distilled from research     | Yes      |
| `research_sources`             | Long text          | Newline-separated URLs of sources used                             | No       |
| `quality_score`                | Number (0–50)      | Research quality score from rubric (0–50)                          | No       |
| `Generated At`                 | Created time       | When research record was created (auto-populated)                  | Yes      |

**Views:**

1. **All Research** (Grid): All research briefs, sorted by `Generated At` (newest first).  
2. **High Quality** (Grid): `quality_score ≥ 45`.  
3. **High Fit** (Grid): `fit_label = "pursue"` and `fit_score ≥ 40`.  
4. **By Fit Label** (Grid): Group by `fit_label` to see reject / caution / pursue buckets.

---

### TABLE 3: Generated Assets (Linked Records)

**Purpose**: Store links and content for generated documents (annual plan, resume, cover letter, interview prep, outreach).

**Fields:**

| Field Name        | Type            | Description                                         | Required |
|-------------------|-----------------|-----------------------------------------------------|----------|
| `Asset ID`        | Auto number     | Primary key                                         | Yes      |
| `Job`             | Link to record  | Links to Jobs Pipeline                              | Yes      |
| `Asset Type`      | Single select   | `Annual Plan`, `Resume Tailored`, `Cover Letter`, `Interview Prep`, `Outreach Message` | Yes |
| `Google Drive Link` | URL           | Link to file in Drive                               | Yes      |
| `Content (Full)`  | Long text       | Final content for the asset                         | No       |
| `Quality Score`   | Number (0–50)   | Score from asset rubric (0–50)                      | No       |
| `Score Breakdown` | Long text       | Breakdown of quality score                          | No       |
| `Generated At`    | Created time    | When asset record was created                       | Yes      |
| `Reviewed`        | Checkbox        | Checked when Matt has reviewed and approved         | No       |
| `Needs Revision`  | Checkbox        | Flag for assets needing improvement                 | No       |
| `Revision Notes`  | Long text       | Notes on what needs to be changed                   | No       |
| `Version Number`  | Long text       | Version tag for the asset generation prompt used    | No       |
| `Prompt Used`     | Long text       | Which asset prompt template was used                | No       |

**Views:**

1. **All Assets** (Grid): All assets, sorted by `Generated At` (newest first).  
2. **By Asset Type** (Grid): Group by `Asset Type`.  
3. **Needs Review** (Grid): `Reviewed = unchecked`.  
4. **High Quality** (Grid): `Quality Score ≥ 45`.

---

## Research JSON Contract (for AI agents)

The Research Briefs table is populated from a **Research JSON** object. This JSON is produced by a research agent (Perplexity, custom GPT, or n8n) and then mapped 1:1 into the Airtable fields above. Every leaf node in this JSON maps directly to a corresponding field.

### ⚠️ CRITICAL: `jobMeta.job_id` (Record ID)

The **single source of truth** for linking a Research Brief to a Job is the **Airtable record ID** of the job in the Jobs Pipeline table.

- This ID is **not** a visible column; it is the internal Airtable record identifier.
- It is always of the form `recXXXXXXXXXXXXXX` (starts with `rec`).
- It appears in the job URL when opened in Airtable:
  - `https://airtable.com/appHFrk9vapCY39F1/tblcY5odzvocdPMc6/viw30RRl4XRp2ogXg/recOSOd4PiXiNr3Mq?blocks=hide`
- The `job` link field in Research Briefs **must** receive this value in the API payload:
  - `"job": ["recOSOd4PiXiNr3Mq"]`

Therefore:

**`jobMeta.job_id` in the Research JSON must always equal the Airtable record ID of the job in Jobs Pipeline.**

### Workflow: How to Ensure `jobMeta.job_id` is Correct

This is the **Option 2** fully-automated linking workflow.

#### Step 1: Capture Job into Jobs Pipeline

- Use your Chrome extension / capture flow to create a job record in Jobs Pipeline.
- That record is now the **source of truth** for this job.
- Open the record in Airtable and copy the record ID from the URL (the `rec...` part).

Example:

- Job Title: `Head of RevOps + Growth Infrastructure`  
- Company Name: `TalentLayer`  
- Airtable URL:  
  `https://airtable.com/appHFrk9vapCY39F1/tblcY5odzvocdPMc6/viw30RRl4XRp2ogXg/recOSOd4PiXiNr3Mq?blocks=hide`  
- Record ID (what you need): `recOSOd4PiXiNr3Mq`

#### Step 2: Pass Record ID into Perplexity

When you ask Perplexity (or any research agent) to generate Research JSON, you must provide:

- The job details (job title, company name, job URL, etc.)
- The **Airtable record ID** for this job

Example instruction to Perplexity:

Research this job and produce Research JSON that includes this Airtable record ID:

Airtable Record ID: recOSOd4PiXiNr3Mq
Job Title: Head of RevOps + Growth Infrastructure
Company: TalentLayer
Job URL: https://www.linkedin.com/jobs/view/12345/

[Paste full job description here]

text

Perplexity must then:

- Use the **exact value** `recOSOd4PiXiNr3Mq` in `jobMeta.job_id`
- Never invent or change a record ID
- Never guess or generate IDs that are not provided

Add this to any Research JSON–generation prompt:

> - `jobMeta.job_id` MUST be set to the exact Airtable Record ID provided by the user (string starting with `rec`).  
> - Never guess or fabricate record IDs. If none is provided, ask explicitly.

#### Step 3: Research JSON Shape (with Correct ID)

Example structure:

{
"jobMeta": {
"job_id": "recOSOd4PiXiNr3Mq",
"job_title": "Head of RevOps + Growth Infrastructure",
"company_name": "TalentLayer",
"job_url": "https://www.linkedin.com/jobs/view/12345/",
"source": "LinkedIn",
"location": "Remote",
"workplace_type": "Remote",
"employment_type": "Full-time",
"salary_range": "$150,000 - $200,000",
"equity_mentioned": true,
"seniority": "Director/VP level"
},

"fitAssessment": {
"fit_label": "pursue",
"fit_score": 47,
"fit_summary": "High-growth SaaS company with clear Series B inflection point, seeking RevOps and GTM infrastructure maturity—ideal match for Matt's Mechanic profile.",
"reasons_to_pursue": [
"Series B with $20M+ ARR and recent $25M raise signals growth momentum",
"Painfully manual GTM systems—Matt's RevOps architecture skills are highly relevant",
"Direct CEO visibility and mandate for growth efficiency",
"ICP matches Matt's past verticals (HR tech, B2B SaaS, marketplaces)"
],
"risks_or_flags": [
"No clear RevOps head—might signal early GTM chaos",
"Velocity over precision culture may misalign with Matt's perfectionist systems style"
]
},

"researchBrief": {
"company_overview": {
"company_summary": "TalentLayer is a Series B HR-tech platform ($20–25M ARR) enabling companies to hire verified freelancers across global marketplaces via API and shared identity graphs. Recently raised $25M Series B led by a16z.",
"stage": "Series B",
"revenue_range": "$20M–$25M ARR",
"funding": "$25M Series B (2025, a16z)",
"headcount": "80–120",
"products_services": "TalentLayer Core (freelancer identity protocol), Hiring API, integrations with Upwork, Toptal, Deel, and others",
"revenue_model": "Usage-based SaaS (per-hire + monthly API access)",
"gtm_motion": "Product-led + BD hybrid; API-first distribution via marketplace partners",
"mission": "Create an open talent economy by unifying freelance identity and access across platforms",
"vision": "A unified global labor graph that removes friction from hiring the best talent anywhere",
"icp_summary": "Mid-market and enterprise companies hiring technical contractors; HR-tech platforms and marketplaces seeking freelancer verification",
"reported_cac": "Unknown; not publicly disclosed.",
"estimated_cac_range": "Estimated CAC: $500–$1500 based on enterprise sales motion with 3–6 month cycles."
},

text
"role_analysis": {
  "role_summary": "Head of RevOps + Growth Infrastructure: Own the full GTM stack—CRM, attribution, dashboards, billing logic, sales enablement, lifecycle automations.",
  "role_requirements": [
    "Architect RevOps infrastructure (HubSpot, Segment, Metabase, Chargebee)",
    "Stand up attribution model for marketing",
    "Automate lifecycle comms",
    "Create reporting for CEO visibility",
    "Integrate with API billing + usage data",
    "Build GTM playbooks across CS, Sales, Marketing"
  ],
  "team_structure": "Reports to CEO; dotted line to Head of Sales. Team includes 2 SDRs, 1 lifecycle marketer, 1 ops analyst.",
  "success_metrics": [
    "Reduce CAC by 30% in 2 quarters",
    "Increase demo-to-close from 12% → 20%",
    "Launch lifecycle flows for reactivation (target: $1M ARR lift)",
    "Stand up exec dashboard with 100% data completeness"
  ],
  "pain_points": [
    "Disconnected tools (HubSpot + Segment + Chargebee + Metabase) = broken data flow",
    "No attribution = inefficient spend",
    "Lifecycle emails entirely manual",
    "No GTM playbooks = team inconsistencies"
  ],
  "inflection_point": "Post-Series B pressure to grow efficiently; must prove CAC payback and retention before Series C."
},

"market_context": {
  "market_summary": "HR-tech market growing 14% YoY; shift to freelance/contractor workforce accelerating post-COVID; demand for API-native infrastructure up.",
  "industry_trends": [
    "Rise of API-native HR platforms",
    "Cross-platform identity standardization",
    "Embedded hiring in SaaS products"
  ],
  "growth_signals": [
    "Series B with top-tier VC",
    "4 recent GTM hires on LinkedIn",
    "Job posts for data/RevOps roles",
    "Website traffic up 40% YoY (SimilarWeb)"
  ],
  "competitive_threats": [
    "Deel and Oyster building overlapping infrastructure",
    "Upwork investing in own identity layer",
    "Winner likely to be embedded across platforms—winner-take-most dynamics"
  ]
},

"hiring_manager_intel": {
  "hiring_manager_intel_summary": "CEO Josh Yang is hiring. Background in growth-stage startups (ex-Stripe, ex-Airbnb). Values data visibility and systems-thinking. Wants builder, not just operator. Decision style: data-driven, collaborative, values speed + precision balance.",
  "hiring_manager_name": "Josh Yang",
  "hiring_manager_title": "CEO",
  "hiring_manager_priority": "Growth efficiency, investor reporting, hiring system-builder, data visibility for board",
  "hiring_manager_decision_gate": "Final hire approval; will interview directly; values execution + systems thinking + cultural fit",
  "stakeholders": [
    {
      "stakeholder_name": "Lena Morales",
      "stakeholder_title": "Head of Sales",
      "stakeholder_priority": "Enablement systems, cleaner attribution, better close rates, pipeline visibility",
      "stakeholder_decision_gate": "Key influencer; wants RevOps support fast; will interview and provide input on hire"
    },
    {
      "stakeholder_name": "Unknown (VP Product or CTO, if exists)",
      "stakeholder_title": "VP Product",
      "stakeholder_priority": "Product analytics integration, usage data visibility, API billing accuracy",
      "stakeholder_decision_gate": "Likely interview; wants RevOps to bridge product + GTM data"
    },
    {
      "stakeholder_name": "Unknown (CFO or Finance Lead, if exists)",
      "stakeholder_title": "CFO",
      "stakeholder_priority": "Budget control, ROI justification, financial forecasting, comp approval for senior hires >$200k",
      "stakeholder_decision_gate": "Budget approval for roles >$200k total comp; will review financial projections and CAC payback"
    }
  ],
  "hiring_priorities": [
    "Data clarity (dashboards, attribution)",
    "Scalable GTM systems",
    "Fast onboarding and enablement",
    "Lifecycle automation to lift expansion revenue",
    "Cross-functional alignment (sales + product + finance)"
  ]
},

"strategic_positioning_for_matt": {
  "strategic_positioning_summary": "Matt = systems architect who thrives in chaos and makes data flow. Replaces duct tape with infrastructure. Can prove ROI to CEO fast. Perfect fit for post-Series B company needing RevOps maturity.",
  "best_angle": "RevOps infrastructure builder who's scaled exactly this stack (Segment, Metabase, Chargebee, HubSpot) before—can get data flowing and CAC down fast. Proven track record of reducing CAC 30% in 60 days.",
  "proof_points": [
    "Built $45M RevOps engine at Prosper (Segment + Metabase)",
    "Cut CAC 30% in 60 days at Affordable Insurance",
    "Deployed end-to-end funnel visibility + dashboards",
    "Replaced duct-taped tools with automated OS at HireHawk"
  ],
  "quick_win_opportunities": [
    "Audit data flow Week 1, present fixes by Week 2",
    "Launch 2 lifecycle flows = $500K ARR lift in Month 2–3",
    "Build first exec dashboard (CAC, funnel, retention) in 30 days"
  ],
  "risks_to_address": [
    "Misalignment on speed vs. precision—clarify expectations in interviews",
    "Early-stage chaos could distract from infra build—get CEO commitment to protect build time",
    "Need to set expectations around what's possible in 90 days (no miracles, but clear ROI)"
  ]
},

"key_insights": [
  "CEO wants RevOps maturity but hasn't hired a lead before—opportunity to define the role",
  "Data exists but doesn't flow—huge leverage point for Matt's skills",
  "Lifecycle = untapped revenue; email infra is there but unused",
  "Attribution and dashboards = top priority for leadership and board reporting"
],

"research_sources": [
  "https://www.crunchbase.com/organization/talentlayer",
  "https://www.linkedin.com/company/talentlayer/",
  "https://a16z.com/portfolio/talentlayer/",
  "https://www.linkedin.com/jobs/view/12345/"
],

"quality_score": 47
}
}

text

### Field Mapping

Every leaf node in the JSON above maps 1:1 to the corresponding Airtable field in Research Briefs:

- `jobMeta.job_id` → `job` (link field) **MUST BE VALID EXISTING JOB RECORD ID (`rec...`)**
- `jobMeta.job_title` → `job_title` (lookup, read-only)
- `jobMeta.company_name` → `company_name` (lookup, read-only)
- `fitAssessment.fit_label` → `fit_label`
- `fitAssessment.fit_score` → `fit_score`
- `fitAssessment.fit_summary` → `fit_summary`
- `fitAssessment.reasons_to_pursue[]` → `reasons_to_pursue` (bullet-separated text)
- `fitAssessment.risks_or_flags[]` → `risks_or_flags` (bullet-separated text)
- `researchBrief.company_overview.company_summary` → `company_summary`
- `researchBrief.company_overview.stage` → `stage`
- `researchBrief.company_overview.revenue_range` → `revenue_range`
- `researchBrief.company_overview.funding` → `funding`
- `researchBrief.company_overview.headcount` → `headcount`
- `researchBrief.company_overview.products_services` → `products_services`
- `researchBrief.company_overview.revenue_model` → `revenue_model`
- `researchBrief.company_overview.gtm_motion` → `gtm_motion`
- `researchBrief.company_overview.mission` → `mission`
- `researchBrief.company_overview.vision` → `vision`
- `researchBrief.company_overview.icp_summary` → `icp_summary`
- `researchBrief.company_overview.reported_cac` → `reported_cac`
- `researchBrief.company_overview.estimated_cac_range` → `estimated_cac_range`
- `researchBrief.role_analysis.role_summary` → `role_summary`
- `researchBrief.role_analysis.role_requirements[]` → `role_requirements` (bullet-separated)
- `researchBrief.role_analysis.team_structure` → `team_structure`
- `researchBrief.role_analysis.success_metrics[]` → `success_metrics` (bullet-separated)
- `researchBrief.role_analysis.pain_points[]` → `pain_points` (bullet-separated)
- `researchBrief.role_analysis.inflection_point` → `inflection_point`
- `researchBrief.market_context.market_summary` → `market_summary`
- `researchBrief.market_context.industry_trends[]` → `industry_trends` (bullet-separated)
- `researchBrief.market_context.growth_signals[]` → `growth_signals` (bullet-separated)
- `researchBrief.market_context.competitive_threats[]` → `competitive_threats` (bullet-separated)
- `researchBrief.hiring_manager_intel.hiring_manager_intel_summary` → `hiring_manager_intel_summary`
- `researchBrief.hiring_manager_intel.hiring_manager_name` → `hiring_manager_name`
- `researchBrief.hiring_manager_intel.hiring_manager_title` → `hiring_manager_title`
- `researchBrief.hiring_manager_intel.hiring_manager_priority` → `hiring_manager_priority`
- `researchBrief.hiring_manager_intel.hiring_manager_decision_gate` → `hiring_manager_decision_gate`
- `researchBrief.hiring_manager_intel.stakeholders[0].stakeholder_name` → `stakeholder_1_name`
- `researchBrief.hiring_manager_intel.stakeholders[0].stakeholder_title` → `stakeholder_1_title`
- `researchBrief.hiring_manager_intel.stakeholders[0].stakeholder_priority` → `stakeholder_1_priority`
- `researchBrief.hiring_manager_intel.stakeholders[0].stakeholder_decision_gate` → `stakeholder_1_decision_gate`
- `researchBrief.hiring_manager_intel.stakeholders[1].stakeholder_name` → `stakeholder_2_name`
- `researchBrief.hiring_manager_intel.stakeholders[1].stakeholder_title` → `stakeholder_2_title`
- `researchBrief.hiring_manager_intel.stakeholders[1].stakeholder_priority` → `stakeholder_2_priority`
- `researchBrief.hiring_manager_intel.stakeholders[1].stakeholder_decision_gate` → `stakeholder_2_decision_gate`
- `researchBrief.hiring_manager_intel.stakeholders[2].stakeholder_name` → `stakeholder_3_name`
- `researchBrief.hiring_manager_intel.stakeholders[2].stakeholder_title` → `stakeholder_3_title`
- `researchBrief.hiring_manager_intel.stakeholders[2].stakeholder_priority` → `stakeholder_3_priority`
- `researchBrief.hiring_manager_intel.stakeholders[2].stakeholder_decision_gate` → `stakeholder_3_decision_gate`
- `researchBrief.hiring_manager_intel.hiring_priorities[]` → `hiring_priorities` (bullet-separated)
- `researchBrief.strategic_positioning_for_matt.strategic_positioning_summary` → `strategic_positioning_summary`
- `researchBrief.strategic_positioning_for_matt.best_angle` → `best_angle`
- `researchBrief.strategic_positioning_for_matt.proof_points[]` → `proof_points` (bullet-separated)
- `researchBrief.strategic_positioning_for_matt.quick_win_opportunities[]` → `quick_win_opportunities` (bullet-separated)
- `researchBrief.strategic_positioning_for_matt.risks_to_address[]` → `risks_to_address` (bullet-separated)
- `researchBrief.key_insights[]` → `key_insights` (bullet-separated)
- `researchBrief.research_sources[]` → `research_sources` (URL-separated)
- `researchBrief.quality_score` → `quality_score`

---

## Integration Points

### Data Flow

1. **Capture**  
   - Job is discovered and created in Jobs Pipeline table via capture flow.  
   - Airtable assigns an internal record ID (`rec…`).

2. **Research (Perplexity)**  
   - You copy the Airtable record ID from the job URL.  
   - You pass this record ID into Perplexity along with the job description.  
   - Perplexity outputs Research JSON where:
     - `jobMeta.job_id` = that exact record ID.

3. **Persist Research (Custom GPT)**  
   - You paste the Research JSON into your custom GPT.  
   - The GPT:
     - Parses `jobMeta.job_id`  
     - Calls `write_research_brief` with `"job": ["<jobMeta.job_id>"]` in the `fields.job` array  
     - All other fields are mapped according to the Field Mapping above.  
   - Result: Research Brief is created and **linked directly** to the pre-existing job.

4. **Asset Generation**  
   - Custom GPT calls `fetch_context` using the job record ID filter: `{job} = 'recXXXXXXXXXXXXXX'`.  
   - GPT uses the Research Brief to generate assets.  
   - GPT calls `write_generated_asset` with:
     - `job` = `["recXXXXXXXXXXXXXX"]`  
     - `asset_type`, `asset_title`, `content`, `quality_score`, etc.

5. **Automation**  
   - Airtable automations or n8n listen for:
     - New Research Briefs  
     - New Generated Assets  
     - Status changes (e.g., `Captured` → `Researched` → `Applied`)  
   - They can trigger secondary workflows (Google Drive export, email, calendar blocks, etc.).

### Custom Actions (Contract Expectations)

- **write_research_brief**  
  - Expects JSON body with `records[0].fields` including:
    - `job`: `["recXXXXXXXXXXXXXX"]` (derived from `jobMeta.job_id`)  
    - All required research fields (fit, summaries, etc.).  
  - If `job` refers to a non-existent record, Airtable returns `ROW_DOES_NOT_EXIST`.

- **fetch_context**  
  - Expects `filterByFormula` built with the job ID:
    - Example: `{job} = 'recOSOd4PiXiNr3Mq'`.

- **write_generated_asset**  
  - Expects `job`: `["recXXXXXXXXXXXXXX"]`, aligning assets to the same job record.

---

## Scaling & Maintenance

- **Current capacity**: 1,200 records/base on free tier. At 5–10 jobs/week, this supports ~4–8 months of active use.  
- **When to upgrade**: Upgrade to Airtable Plus ($10/user/month) for 5,000 records/base.  
- **Backups**: Export Research Briefs and Generated Assets as CSV monthly and store in Google Drive.  
- **Views refresh**: Review filters quarterly as new patterns emerge.