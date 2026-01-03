# Job Hunter OS - Data Architecture

**Version**: 1.0  
**Database**: Airtable  
**Last Updated**: December 6, 2024

---

## 🎯 DATABASE STRATEGY

### Why Airtable?

**Chosen over PostgreSQL because:**
- ✅ Visual interface (Matt can see/edit data easily)
- ✅ Built-in views, filters, sorting (no SQL needed)
- ✅ Native n8n integration (simpler than raw SQL)
- ✅ Automations built-in (trigger n8n webhooks)
- ✅ Free tier sufficient for MVP (1,200 records/base)

**Trade-offs accepted:**
- ⚠️ 1,200 record limit on free tier (sufficient for 1,000+ jobs)
- ⚠️ Less flexible than PostgreSQL for complex queries
- ⚠️ Vendor lock-in (but easy to export to CSV later)

---

## 📊 TABLE SCHEMA

### TABLE 1: Companies (CRM Hub)

**Purpose**: Central repository for all companies - tracks organizations for job opportunities and networking

**Fields:**

| Field Name | Type | Description | Required | Example |
|------------|------|-------------|----------|---------|
| `Company Name` | Single Line Text | Company name (PRIMARY) | Yes | "TechCorp" |
| `Website` | URL | Company website | No | https://techcorp.com |
| `LinkedIn URL` | URL | Company LinkedIn page | No | https://linkedin.com/company/techcorp |
| `Industry` | Single Select | Industry/sector | No | SaaS, FinTech, E-commerce |
| `Location` | Single Line Text | HQ or primary location | No | "San Francisco, CA" |
| `Size` | Single Select | Company size | No | 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+ |
| `Type` | Single Select | Company stage/type | No | Startup, Growth, Enterprise, Public |
| `Company Description` | Long Text | Company overview | No | "Leading SaaS platform..." |
| `Job Listings` | Link to Records | Links to Jobs Pipeline | No | → Multiple job records |
| `Contacts` | Link to Records | Links to Contacts table | No | → Multiple contact records |
| `Outreach Log` | Link to Records | Links to Outreach Log | No | → Multiple outreach records |
| `Company Overview (AI)` | Long Text | AI-generated company analysis | No | [AI summary] |
| `Notes` | Long Text | Research notes | No | "Met founder at conference..." |
| `Created Time` | Created Time | Auto-populated | Yes | 2024-12-06 10:30 AM |
| `Last Modified` | Last Modified Time | Auto-populated | Yes | 2024-12-06 2:45 PM |

**Views:**
1. **All Companies** (Grid): All records, sorted by Created (newest first)
2. **Active Opportunities** (Grid): Companies with linked jobs in pipeline
3. **Target Companies** (Grid): Companies with notes or high interest

---

### TABLE 2: Contacts (Hiring Managers & Network)

**Purpose**: Track hiring managers, recruiters, and professional contacts for outreach and relationship management

**Fields:**

| Field Name | Type | Description | Required | Example |
|------------|------|-------------|----------|---------|
| `First Name` | Single Line Text | Contact first name (PRIMARY) | Yes | "Sarah" |
| `Last Name` | Single Line Text | Contact last name | No | "Johnson" |
| `Full Name` | Formula | `{First Name} & " " & {Last Name}` | Auto | "Sarah Johnson" |
| `Role / Title` | Single Line Text | Job title | No | "VP of Engineering" |
| `Company` | Link to Record | Link to Companies table | No | → Company record |
| `Contact Type` | Single Select | Type of contact | No | Hiring Manager, Recruiter, Referral, Network |
| `Status` | Single Select | Relationship status | No | New, Contacted, Responded, Meeting Scheduled, Connected |
| `Email` | Email | Contact email | No | sarah@techcorp.com |
| `Phone / WhatsApp` | Phone Number | Contact phone | No | +1-555-0123 |
| `LinkedIn URL` | URL | LinkedIn profile | No | https://linkedin.com/in/sarahjohnson |
| `Last Outreach Date` | Date | Last time contacted | No | 2024-12-06 |
| `Next Follow-Up Date` | Date | When to follow up next | No | 2024-12-13 |
| `Follow-Up Interval (Days)` | Number | Days between follow-ups | No | 7 |
| `Contacted Via` | Multiple Select | Communication channels used | No | Email, LinkedIn, Phone |
| `Relationship Strength` | Single Select | Connection strength | No | Cold, Warm, Hot, Connected |
| `Introduced By` | Single Line Text | Referral source | No | "John Smith" |
| `Hiring Influence Level` | Single Select | Decision-making power | No | Decision Maker, Influencer, Gatekeeper, Unknown |
| `Next Task / Action` | Long Text | Next steps | No | "Send follow-up email..." |
| `Generated Assets` | Link to Records | Links to Generated Assets | No | → Outreach messages, etc. |
| `Outreach Log` | Link to Records | Links to Outreach Log | No | → Multiple outreach records |
| `Created Time` | Created Time | Auto-populated | Yes | 2024-12-06 10:30 AM |
| `Last Modified` | Last Modified Time | Auto-populated | Yes | 2024-12-06 2:45 PM |
| `Days Since Last Outreach` | Formula | `DATETIME_DIFF(TODAY(), {Last Outreach Date}, 'days')` | Auto | 7 |
| `Next Follow-Up Trigger` | Formula | Trigger for follow-up reminders | Auto | Based on intervals |
| `Relationship Age` | Formula | Days since first contact | Auto | 30 |

**Views:**
1. **All Contacts** (Grid): All records, sorted by Last Modified
2. **Active Outreach** (Grid): Contacts with outreach in progress
3. **Follow-Up Due** (Grid): Filtered by Next Follow-Up Date ≤ TODAY()
4. **Hiring Managers** (Grid): Contact Type = "Hiring Manager"
5. **Hot Leads** (Grid): Relationship Strength = "Hot"

---

### TABLE 3: Outreach Log (Action Tracking)

**Purpose**: Track all outreach interactions with contacts - emails, messages, calls, follow-ups

**Fields:**

| Field Name | Type | Description | Required | Example |
|------------|------|-------------|----------|---------|
| `Outreach ID` | Autonumber | Primary key | Yes | 1, 2, 3... |
| `Contact` | Link to Record | Link to Contacts table | Yes | → Contact record |
| `First Name (from Outreach Message)` | Lookup | From Contact | Auto | "Sarah" |
| `Role / Title (from Outreach Message)` | Lookup | From Contact | Auto | "VP of Engineering" |
| `Company (from Outreach Message)` | Lookup | From Contact → Company | Auto | "TechCorp" |
| `Email (from Outreach Message)` | Lookup | From Contact | Auto | sarah@techcorp.com |
| `Phone / WhatsApp (from Outreach Message)` | Lookup | From Contact | Auto | +1-555-0123 |
| `LinkedIn URL (from Outreach Message)` | Lookup | From Contact | Auto | https://linkedin.com/in/sarah |
| `Last Outreach Date (from Outreach Message)` | Lookup | From Contact | Auto | 2024-12-06 |
| `Outreach Channel` | Single Select | How outreach was sent | Yes | Email, LinkedIn, Phone, InMail |
| `Outreach Status` | Single Select | Current status | Yes | Draft, Ready, Sent, Responded, No Response |
| `Outreach Message` | Long Text | Message content | Yes | "Hi Sarah, I noticed..." |
| `Sent Date` | Date | When message was sent | No | 2024-12-06 |
| `Response Date` | Date | When response received | No | 2024-12-08 |
| `Response` | Long Text | Response content | No | "Thanks for reaching out..." |
| `Open URL` | Button | Opens LinkedIn + outreachID param | Auto | Formula: `{LinkedIn URL} & "?outreachID=" & RECORD_ID()` |
| `Created Time` | Created Time | Auto-populated | Yes | 2024-12-06 10:30 AM |
| `Last Modified` | Last Modified Time | Auto-populated | Yes | 2024-12-06 2:45 PM |

**Views:**
1. **All Outreach** (Grid): All records, sorted by Created (newest first)
2. **Ready to Send** (Grid): Status = "Ready"
3. **Sent - Awaiting Response** (Grid): Status = "Sent", Response Date is empty
4. **Responded** (Grid): Status = "Responded"
5. **By Channel** (Grid): Grouped by Outreach Channel

**Special Feature: Open URL Button**
- The `Open URL` button field uses formula: `{LinkedIn URL (from Outreach Message)} & "?outreachID=" & RECORD_ID()`
- When clicked, opens LinkedIn profile with `?outreachID=recXXXXXXXXXXXXXXX` parameter
- Job Hunter extension detects this parameter and enters "Outreach Mode"
- Displays outreach message with copy button and "Mark as Sent" CTA

---

### TABLE 4: Jobs Pipeline (Primary Table)

**Purpose**: Core job records - one row per job opportunity

**Fields:**

| Field Name | Type | Description | Required | Example |
|------------|------|-------------|----------|---------|
| `Job ID` | Auto Number | Primary key | Yes | 1, 2, 3... |
| `Job Title` | Single Line Text | Role title | Yes | "VP of Growth" |
| `Company Name` | Link to Record | Link to Companies table | Yes | → Company record |
| `Companies` | Link to Record | Link to Companies (duplicate field) | No | → Company record |
| `Contacts` | Link to Record | Link to hiring manager in Contacts | No | → Contact record |
| `Contacts (Linked Jobs)` | Link to Record | Link to Contacts (alternate field name) | No | → Contact record |
| `Company Page` | URL | Company page on the job platform | No | https://linkedin.com/company/techcorp |
| `Job URL` | URL | Original job posting URL | Yes | https://linkedin.com/jobs/... |
| `Location` | Single Line Text | Job location | No | "San Francisco, CA" |
| `Workplace Type` | Single Line Text | Remote, hybrid, on-site work | No | "Remote" |
| `Employment Type` | Single Line Text | Type of employment being offered | No | "Full-time" |
| `Salary Min` | Number | Minimum salary | No | 180000 |
| `Salary Max` | Number | Maximum salary | No | 220000 |
| `Equity Mentioned` | Checkbox | Does posting mention equity? | No | ✓ |
| `Source` | Single Select | Where job was found | Yes | LinkedIn, Indeed |
| `Job Description` | Long Text | Full job posting text | Yes | [Full text] |
| `Status` | Single Select | Current stage | Yes | Captured, Researched, Applied, Interview, Offer, Rejected |
| `Research Brief` | Link to Record | Link to Research Briefs table | No | → Research record |
| `Generated Assets` | Link to Records | Links to Generated Assets table | No | → Multiple asset records |
| `Application Tracking` | Link to Records | Links to Application Tracking table | No | → Multiple asset records |
| `Outreach Log` | Link to Records | Links to Outreach Log table | No | → Multiple outreach records |
| `Applied Date` | Date | When application was submitted | No | 2024-12-10 |
| `Interview Date` | Date | When interview is scheduled | No | 2024-12-15 |
| `Outcome` | Single Select | Final result | No | Offer, No Response, Rejected |
| `Matt's Rating` | Rating (5 stars) | Matt's interest level | No | ⭐⭐⭐⭐⭐ |
| `Notes` | Long Text | Matt's notes | No | "Really like this one..." |
| `Created` | Created Time | Auto-populated | Yes | 2024-12-06 10:30 AM |
| `Last Modified` | Last Modified Time | Auto-populated | Yes | 2024-12-06 2:45 PM |

**Views:**
1. **All Jobs** (Grid): All records, sorted by Created (newest first)
2. **Needs Research** (Grid): Status = "Captured", shows jobs waiting for research
3. **Ready to Apply** (Grid): Status = "Researched", shows jobs with assets ready
4. **In Progress** (Kanban): Group by Status (Captured → Researched → Applied → Interview)
5. **High Priority** (Grid): Matt's Rating ≥ 4 stars, sorted by Created
6. **This Week** (Calendar): View by Applied Date

---

### TABLE 2: Research Briefs (Linked Records)

**Purpose**: Store company intelligence for each job

**Fields:**

| Field Name | Type | Description | Required |
|------------|------|-------------|----------|
| `Research ID` | Auto Number | Primary key | Yes |
| `Job` | Link to Record | Links to Jobs Pipeline | Yes |
| `Company Overview` | Long Text | Company stage, revenue, funding, product | Yes |
| `Role Analysis` | Long Text | Real requirements, team structure, success metrics | Yes |
| `Market Context` | Long Text | Industry trends, growth signals, competitive threats | Yes |
| `Hiring Manager Intel` | Long Text | Background, decision style, priorities | No |
| `Strategic Positioning` | Long Text | How Matt should position himself | Yes |
| `Key Insights` | Long Text | Bullet list of most important findings | Yes |
| `Research Sources` | Long Text | URLs of sources used | No |
| `Generated At` | Created Time | When research was completed | Yes |
| `Quality Score` | Number | Score from Research rubric (0-50) | No |

**Views:**
1. **All Research** (Grid): All research briefs, sorted by Generated At
2. **High Quality** (Grid): Quality Score ≥ 45

---

### TABLE 3: Generated Assets (Linked Records)

**Purpose**: Store links to generated documents in Google Drive

**Fields:**

| Field Name | Type | Description | Required |
|------------|------|-------------|----------|
| `Asset ID` | Auto Number | Primary key | Yes |
| `Job` | Link to Record | Links to Jobs Pipeline | Yes |
| `Asset Type` | Single Select | Type of asset | Yes |
| `Google Drive Link` | URL | Link to file in Drive | Yes |
| `Content (Full)` | Long Text | Display the final content for the asset | No |
| `Quality Score` | Number | Score from asset rubric (0-50) | No |
| `Score Breakdown` | Long Text | Breakdown of the quality score | No |
| `Generated At` | Created Time | When asset was created | Yes |
| `Reviewed` | Checkbox | Has Matt reviewed this? | No |
| `Needs Revision` | Checkbox | Flagged for improvement | No |
| `Revision Notes` | Long Text | What needs to be changed | No |
| `Version Number` | Long Text | Version of the asset generation prompt being used | No |
| `Prompt Used` | Long Text | Type of asset generation prompt being used | No |


**Asset Type Options:**
- Annual Growth Plan
- Resume (Tailored)
- Cover Letter
- Interview Prep
- Outreach Message
- Research Brief (PDF)
- Image
- Document
- Video
- Presentation
- Spreadsheet

**Views:**
1. **All Assets** (Grid): All assets, sorted by Generated At
2. **By Asset Type** (Grid): Grouped by Asset Type
3. **Needs Review** (Grid): Reviewed = unchecked
4. **High Quality** (Grid): Quality Score ≥ 45

---

### TABLE 4: Application Tracking (Linked Records)

**Purpose**: Track application journey milestones and outcomes

**Fields:**

| Field Name | Type | Description | Required |
|------------|------|-------------|----------|
| `Event ID` | Auto Number | Primary key | Yes |
| `Job` | Link to Record | Links to Jobs Pipeline | Yes |
| `Event Type` | Single Select | Type of event | Yes |
| `Event Date` | Date | Specific date and time | No |
| `Details` | Long Text | Additional context | No |
| `Attachments` | Attachments | Screenshots, emails, etc. | No |
| `Next Action` | Single Line Text | What to do next | No |
| `Next Action Date` | Date | When to do next action | No |

**Event Type Options:**
- Job Captured
- Research Completed
- Assets Generated
- Application Submitted
- Response Received
- Phone Screen Scheduled
- Interview Completed
- Offer Received
- Offer Accepted
- Rejected by Company
- Withdrew Application

**Views:**
1. **Timeline** (Grid): All events, sorted by Event Date (newest first)
2. **This Week** (Grid): Event Date in current week
3. **Next Actions** (Grid): Next Action Date is not empty, sorted by date

---

### TABLE 5: Monthly Analytics (Summary Table)

**Purpose**: Track monthly performance metrics

**Fields:**

| Field Name | Type | Description | Required |
|------------|------|-------------|----------|
| `Month` | Single Line Text | Month name | Yes |
| `Year` | Number | Year | Yes |
| `Applications Sent` | Number | Total applications submitted | Yes |
| `Responses Received` | Number | Companies that responded | Yes |
| `Response Rate` | Percent | Responses / Applications | Computed |
| `Phone Screens` | Number | Phone screens completed | Yes |
| `Interviews` | Number | Full interviews completed | Yes |
| `Offers` | Number | Offers received | Yes |
| `Avg Days to Response` | Number | Average days from apply to response | Computed |
| `Avg Quality Score` | Number | Average asset quality score | Computed |
| `Top Performing Asset` | Single Select | Which asset type correlated with responses | No |
| `Lessons Learned` | Long Text | What worked, what didn't | No |
| `% Application to Response Rate` | Percent | Applications that get responses | No |
| `% Response to Interview Rate` | Percent | Responses that get interviews | No |
| `% Interview to Offer RRate` | Percent | Interviews that get offers | No |

**Views:**
1. **All Months** (Grid): Sorted by Year, then Month
2. **Best Months** (Grid): Sorted by Response Rate (descending)

---

## 🔗 TABLE RELATIONSHIPS

### CRM Data Model (Companies, Contacts, Jobs)
```
Companies (Central Hub)
    ↓ (One-to-Many)
Contacts (Hiring Managers, Recruiters, Network)
    ↓ (One-to-Many)
Jobs Pipeline (Job Opportunities)
    ↓ (One-to-One)
Research Briefs
    ↓ (One-to-Many)
Generated Assets (6 assets per job)
    ↓ (One-to-Many)
Application Tracking (Multiple events per job)

Companies ↔ Outreach Log (Many-to-Many via Contacts)
Contacts ↔ Outreach Log (One-to-Many)
Jobs Pipeline ↔ Outreach Log (One-to-Many)
```

### Relational Structure
```
┌─────────────┐
│  Companies  │ (Central entity)
└─────┬───────┘
      │ 1:N
      ▼
┌─────────────┐         ┌──────────────┐
│  Contacts   │────────>│ Outreach Log │
└─────┬───────┘  1:N    └──────────────┘
      │ 1:N
      ▼
┌──────────────────┐
│  Jobs Pipeline   │
└────────┬─────────┘
         │ 1:1
         ▼
┌──────────────────┐
│ Research Briefs  │
└────────┬─────────┘
         │ 1:N
         ▼
┌──────────────────┐
│ Generated Assets │
└──────────────────┘
         │ 1:N
         ▼
┌─────────────────────┐
│ Application Tracking│
└─────────────────────┘
         │ Aggregates
         ▼
┌──────────────────┐
│ Monthly Analytics│
└──────────────────┘
```

**Link Field Behavior:**
- **Companies → Contacts**: One-to-many (company has multiple contacts)
- **Companies → Jobs Pipeline**: One-to-many (company has multiple job opportunities) via `Company Name` link field
- **Contacts → Companies**: Many-to-one (contact belongs to one company) via `Company` link field
- **Contacts → Jobs Pipeline**: One-to-many (contact is hiring manager for multiple jobs) via `Contacts` link field
- **Contacts → Outreach Log**: One-to-many (contact has multiple outreach interactions) via `Contact` link field
- **Jobs Pipeline → Companies**: Many-to-one via `Company Name` link field
- **Jobs Pipeline → Contacts**: Many-to-one via `Contacts` link field (hiring manager)
- **Jobs Pipeline → Research Briefs**: One-to-one (each job has one research brief)
- **Jobs Pipeline → Generated Assets**: One-to-many (each job has 6+ assets)
- **Jobs Pipeline → Application Tracking**: One-to-many (each job has multiple events)
- **Jobs Pipeline → Outreach Log**: One-to-many (job can have multiple outreach interactions)
- **Outreach Log → Contacts**: Many-to-one (outreach targets one contact) via `Contact` link field
- **Research Briefs → Jobs Pipeline**: Lookup field to pull company name, job title
- **Generated Assets → Jobs Pipeline**: Lookup field to pull company name, job title

---

## 🤖 AIRTABLE AUTOMATIONS

### Automation 1: Trigger n8n Research Workflow

**Trigger:** When record is created in Jobs Pipeline  
**Condition:** Status = "Captured"  
**Actions:**
1. Wait 5 seconds (let record fully populate)
2. Run script to POST to n8n webhook:
```javascript
// Automation Script
let jobRecord = input.config();
let webhookUrl = "https://getfractional.up.railway.app/webhook/job-research";

let payload = {
    jobId: jobRecord.id,
    jobTitle: jobRecord.jobTitle,
    companyName: jobRecord.companyName,
    jobUrl: jobRecord.jobUrl,
    jobDescription: jobRecord.jobDescription,
    source: jobRecord.source
};

let response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
});

console.log("n8n triggered:", response.status);
```

### Automation 2: Update Status After Research

**Trigger:** When record is created in Research Briefs  
**Condition:** Quality Score ≥ 40  
**Actions:**
1. Find linked Jobs Pipeline record
2. Update Status to "Researched"
3. Send notification (optional): "Research complete for [Company Name]"

### Automation 3: Update Status After Assets Generated

**Trigger:** When 6th asset is created for a job  
**Condition:** All 6 asset types present (Annual Growth Plan, Resume, Cover Letter, Interview, Outreach, Research)  
**Actions:**
1. Update Jobs Pipeline Status to "Ready to Apply"
2. Create record in Application Tracking: "Assets Generated" event

---

## 📥 DATA INPUT SOURCES

### 1. Chrome Extension → Jobs Pipeline
- **Method**: POST to Airtable PAT
- **Endpoint**: `https://api.airtable.com/v0/{BASE_ID}/Jobs%20Pipeline`
- **Auth**: Personal Access Token (stored in extension)
- **Frequency**: Manual (user clicks "Send to Job Hunter")
- **Fields Populated**: Job Title, Company Name, Job URL, Location, Salary, Source, Job Description, Status="Captured"

### 2. n8n Workflows → Research Briefs & Generated Assets
- **Method**: POST to PAT
- **Auth**: Airtable credential stored in n8n (`n8n credential ID: TBD`)
- **Frequency**: Automated (triggered by Airtable automation)
- **Fields Populated**: All research/asset fields

### 3. Matt Manual Input → Jobs Pipeline
- **Method**: Airtable web UI
- **Use Cases**: 
  - Update Status manually
  - Add Matt's Rating
  - Add Notes
  - Set Applied Date, Interview Date
  - Update Outcome

---

## 📊 SAMPLE DATA FLOW

### Example: Processing One Job

1. **User Action**: Matt finds VP Growth role at TechCorp on LinkedIn
2. **Chrome Extension**: Captures data, sends to Airtable
3. **Airtable**: New record created in Jobs Pipeline
```
   Job ID: 42
   Job Title: "VP of Growth"
   Company Name: "TechCorp"
   Status: "Captured"
   Created: 2024-12-06 10:30 AM
```

4. **Airtable Automation**: Waits 5 seconds, triggers n8n webhook
5. **n8n Research Workflow**: 
   - Calls Perplexity API with company name
   - Generates research brief
   - Creates record in Research Briefs table
   - Links to Job ID 42

6. **Research Briefs Table**:
```
   Research ID: 15
   Job: → Job ID 42 (TechCorp)
   Company Overview: "Series B SaaS, $45M raised..."
   Quality Score: 48
   Generated At: 2024-12-06 10:35 AM
```

7. **Airtable Automation**: Detects new research, updates Jobs Pipeline Status → "Researched"

8. **n8n Asset Generation Workflows**: (triggered by Status change)
   - Generate Annual Growth Plan → Upload to Drive → Create record in Generated Assets
   - Generate Resume → Upload to Drive → Create record in Generated Assets
   - Generate Cover Letter → Upload to Drive → Create record in Generated Assets
   - Generate Interview Prep → Upload to Drive → Create record in Generated Assets
   - Generate Outreach → Upload to Drive → Create record in Generated Assets
   - Generate Research PDF → Upload to Drive → Create record in Generated Assets

9. **Generated Assets Table**: 6 new records created, all linked to Job ID 42

10. **Airtable Automation**: Detects 6 assets created, updates Jobs Pipeline Status → "Ready to Apply"

11. **Matt Reviews**: Opens Airtable, sees Job ID 42 is "Ready to Apply", clicks Google Drive links, reviews assets

12. **Matt Applies**: Submits application, manually updates Status → "Applied", sets Applied Date

13. **Application Tracking**: Manual or automated record created: "Application Submitted" event for Job ID 42

---

## 🔐 SECURITY & PERMISSIONS

### API Access
- **Airtable Personal Access Token**: Stored in Chrome extension (local storage, encrypted)
- **n8n Credentials**: Stored in n8n (encrypted at rest)
- **Google Drive**: OAuth token (refresh token stored in n8n)

### Data Privacy
- All data stays within Matt's accounts (Airtable, Google Drive, n8n)
- No third-party data sharing
- Job descriptions may contain company confidential info → don't expose publicly

### Backup Strategy
- **Airtable**: Manual CSV export monthly (stored in Drive)
- **Google Drive**: Google's native backup/versioning
- **n8n**: Workflow exports stored in GitHub repo

---

## 📈 SCALING CONSIDERATIONS

### Current Capacity (Free Tier)
- **Max Jobs**: 1,200 records in Jobs Pipeline
- **Estimated Lifespan**: 1,000+ job applications (18+ months at 50 jobs/month)

### When to Upgrade
**Trigger**: Hit 1,000 records in Jobs Pipeline  
**Action**: Export old data (jobs from >6 months ago) to CSV, archive, delete from Airtable

**Or**: Upgrade to Airtable Plus ($10/user/month for 5,000 records/base)

### Multi-User Considerations (If Building SaaS)
- Each user gets their own Airtable base
- n8n workflows parameterized by `userId`
- Chrome extension stores user's Airtable credentials
- Cost scales linearly with users

---

## 🚀 IMPLEMENTATION CHECKLIST

### Step 1: Create Airtable Base
- [ ] Sign up for Airtable (free tier)
- [ ] Create new base: "Job Hunter OS"
- [ ] Create 5 tables with fields as specified above
- [ ] Set up table relationships (link fields)
- [ ] Create views for each table

### Step 2: Configure Automations
- [ ] Create Automation 1 (trigger n8n on new job)
- [ ] Create Automation 2 (update status after research)
- [ ] Create Automation 3 (update status after assets)
- [ ] Test each automation with dummy data

### Step 3: Generate API Credentials
- [ ] Create Personal Access Token in Airtable
- [ ] Copy Base ID from Airtable URL
- [ ] Store credentials securely (password manager)
- [ ] Add credentials to Chrome extension
- [ ] Add credentials to n8n

### Step 4: Test Data Flow
- [ ] Manually create test record in Jobs Pipeline
- [ ] Verify automation triggers
- [ ] Verify n8n receives webhook
- [ ] Verify research brief created
- [ ] Verify assets generated
- [ ] Verify Google Drive upload

---

**Last Updated**: December 6, 2024  
**Next Review**: After MVP launch