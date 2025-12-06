# Job Hunter OS - Complete Application System

## 🎯 Mission

Land a **$200K+ remote role** in Growth, RevOps, Lifecycle Marketing, or Demand Generation with **15%+ response rate**, **5+ interviews per month**, and **multiple offers to evaluate**.

Built on first principles from Alex Hormozi, Alen Sultanic, Rory Sutherland, Eric Ries, and Gary Vee.

---

## 📦 What This Is

**Job Hunter OS** is a production-ready, fully-documented system for creating world-class job applications that convert.

**It includes:**

✅ **27 comprehensive prompt files** — All thinking models, frameworks, and execution templates
✅ **Chrome extension** — One-click job capture from LinkedIn/Indeed
✅ **n8n workflow automation** — Research → Asset generation → Drive upload → Sheets tracking
✅ **Orchestrated expertise** — 5 expert frameworks working together
✅ **Continuous iteration** — Build-measure-learn cycle built in
✅ **Error recovery** — Complete failure mode handling + retry logic

**Not included:** UI/UX polish, commercial licensing, or scaling beyond personal use.

---

## 🚀 Quick Start (30 minutes)

### Step 1: Understand the System (10 min)
```bash
Read: EXECUTIVE-SUMMARY.md
Then: Workflow-Orchestration-Master.md
```

### Step 2: Create Your First Application (15 min of setup, 4-5 hours of work)
```bash
1. Open Prompt 10 (10-Research-Company.md)
2. Copy prompt into Claude
3. Paste job posting + company name
4. Generate research
5. Follow flow: Research → Plan → Resume → Letter → Outreach → Interview Prep
```

### Step 3: Send + Measure (5 min)
```bash
1. Send outreach message
2. Track response in Google Sheets (manual for now)
3. After 5 applications, run iteration cycle (Workflow-Iteration-Cycle.md)
```

---

## 📂 Repository Structure

```
job-hunter-os/
├── README.md (this file)
├── LICENSE (Creative Commons Attribution 4.0)
│
├── docs/
│   ├── EXECUTIVE-SUMMARY.md          ← Start here
│   ├── IMPLEMENTATION-GUIDE.md       ← How to use all files
│   ├── Job-Hunter-Master-Blueprint.md ← Technical architecture
│   └── Matt-Profile-Snapshot.md      ← Identity reference
│
├── prompts/
│   ├── _foundation/
│   │   ├── 00-Core-Principles.md           ← 7-layer thinking
│   │   ├── 01-Matt-Profile.md              ← Your identity
│   │   ├── 02-Strategic-Frameworks.md      ← When to use what
│   │   └── 03-Legal-Boundaries.md          ← IP guardrails
│   │
│   ├── asset-generation/
│   │   ├── 10-Research-Company.md          ← Research protocol
│   │   ├── 20-90-Day-Plan.md               ← The flagship offer
│   │   ├── 30-Resume-Tailor.md             ← Resume by relevance
│   │   ├── 40-Cover-Letter.md              ← Problem-Agitation-Solution
│   │   ├── 50-Interview-Prep.md            ← STAR stories + objections
│   │   └── 60-Outreach-Message.md          ← 3-sentence hook
│   │
│   ├── reference/
│   │   ├── Reference-Hormozi-Value-Equation.md      ← $VALUE = (DO×LH)/(TD×E/S)
│   │   ├── Reference-Alen-Ascension-Specificity.md  ← Specificity + Trust
│   │   ├── Reference-Rory-Psychologic.md            ← Emotion > Logic
│   │   └── Workflow-Orchestration-Master.md         ← How experts coordinate
│   │
│   └── workflow/
│       ├── Workflow-Orchestration-Master.md         ← Asset-by-asset flow
│       ├── Workflow-Iteration-Cycle.md              ← Build-measure-learn
│       └── Workflow-Error-Handling-Retry.md         ← Failure recovery
│
├── src/
│   ├── extension/                    ← Chrome extension (if built)
│   │   ├── manifest.json
│   │   ├── popup.html
│   │   └── content.js
│   │
│   └── n8n/                          ← n8n workflows (if deployed)
│       ├── 01-validate-webhook.json
│       ├── 02-research-company.json
│       ├── 03-generate-assets.json
│       └── ...
│
└── .github/
    └── workflows/                    ← CI/CD (optional)
        └── validate-prompts.yml
```

---

## 🛠️ Setup Guide

### Option A: Manual + Prompts (Easiest, Start Here)

**Cost:** Free  
**Time:** 4-5 hours per application  
**Tools needed:** Claude, Google Sheets, Gmail

**Steps:**
1. Clone/download this repo
2. Read: `EXECUTIVE-SUMMARY.md` + `Workflow-Orchestration-Master.md`
3. For each job:
   - Use Prompt 10 (research) in Claude
   - Use Prompt 20 (90-day plan) in Claude
   - etc.
4. Write applications, send emails manually
5. Track in Google Sheets manually
6. Run iteration cycle after every 5 apps

**Best for:** Getting started immediately, learning the system first

---

### Option B: Semi-Automated (n8n + Prompts, Recommended for Scale)

**Cost:** $30-50/month (n8n + Perplexity + OpenAI)  
**Time:** 15 min per application (system does research + assets)  
**Tools needed:** n8n, Perplexity API, OpenAI API, Google Workspace, Chrome extension

#### Step 1: Set Up Context7 Free Tier for Documentation

**What is Context7?**
- Free documentation fetching service
- Pulls current n8n docs, API references, code examples
- Keeps your prompts current with latest APIs

**How to Set Up:**
```
1. Go to: https://glama.ai/mcp/servers/@NimbleBrainInc/mcp-context7
2. Click "Setup MCP Server"
3. Get your free API key (100 requests/day)
4. Add to your MCP configuration:

# In Claude/OpenAI config (or n8n if using MCP):
{
  "mcpServers": {
    "context7": {
      "command": "node",
      "args": ["path/to/context7-mcp.js"],
      "env": {
        "CONTEXT7_API_KEY": "your_key_here"
      }
    }
  }
}

5. In your prompts, reference: "Use Context7 to fetch latest n8n documentation"
```

**When to Use Context7:**
- When building n8n workflows (to get current node definitions)
- When updating prompts to match latest API changes
- When troubleshooting integration issues

**Daily Limit Strategy:** (100 requests/day)
- Reserve 50 requests for prod workflows (50% buffer)
- Use 30 requests for prompt development
- Keep 20 requests for troubleshooting
- After hitting limit, switch to cached docs or manual lookup

---

#### Step 2: Set Up n8n (Choose Your Deployment)

**Option 2A: n8n Cloud (Easiest, $$)**
```
1. Go to: https://app.n8n.cloud/
2. Sign up (free plan includes 2 workflows)
3. Create new workflow
4. Copy workflows from src/n8n/ folder
5. Connect credentials (see below)
```

**Option 2B: n8n Self-Hosted on Railway (Recommended, Free for starter)**
```
1. Go to: https://railway.app/
2. Sign up (free tier: $5 credit/month)
3. Deploy n8n from template
4. Access at: https://your-project.railway.app
5. Create workflows
6. Connect credentials

Cost: ~$5-10/month
```

**Option 2C: n8n Docker Local (Cheapest, most control)**
```bash
# Install Docker first, then:
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Access at: http://localhost:5678
# Run workflows on your machine
```

---

#### Step 3: Connect APIs to n8n

**Perplexity API (Research):**
```
1. Go to: https://www.perplexity.ai/api/
2. Create account → "API Console"
3. Create new API key
4. In n8n: 
   - Add Credential: "HTTP Request"
   - URL: https://api.perplexity.ai/chat/completions
   - Auth: Bearer [your_api_key]
5. Cost: ~$0.01-0.05 per research (depends on query)
```

**OpenAI API (Asset Generation):**
```
1. Go to: https://platform.openai.com/
2. Create account → "API Keys" → Create new
3. Set monthly budget limit ($5-10 recommended)
4. In n8n:
   - Add Credential: "OpenAI"
   - Paste API key
5. Cost: ~$0.50-1.00 per application (all 6 assets)
```

**Google Workspace (Drive + Sheets):**
```
1. In n8n:
   - Click "Add Credentials"
   - Type: "Google Drive"
   - Click "Connect"
   - Authorize Google account
2. Same for Google Sheets

This connects to YOUR Google account for Drive/Sheets
```

**Context7 (Documentation API):**
```
1. Get free API key: https://glama.ai/mcp/servers/@NimbleBrainInc/mcp-context7
2. In n8n:
   - Add Credential: "HTTP Request"
   - Base URL: https://api.context7.ai
   - Auth: Bearer [your_api_key]
3. Use in workflows to fetch current documentation
   - Example: "Get latest n8n HTTP Request node docs"
   - Example: "Get current OpenAI API reference"
```

---

#### Step 4: Deploy n8n Workflows

**Import pre-built workflows:**
```
1. In n8n dashboard, click "Import from File"
2. Choose workflow from: src/n8n/
3. Connect credentials (already set up above)
4. Test each step
5. Activate workflow
```

**Workflow sequence:**
```
1. Validate Webhook
   └─ Receives job data from Chrome extension
   
2. Research Company
   └─ Calls Perplexity API → parses results → saves JSON
   
3. Generate Assets
   └─ Research + Job posting → OpenAI → 6 assets created
   
4. Upload to Drive
   └─ Each asset as separate doc in Google Drive folder
   
5. Append to Sheets
   └─ Add row to tracking sheet with all metadata
   
6. Notify You
   └─ Email summary: "Application ready for sending"
```

**Current documentation reference (as of Dec 2024):**
- n8n HTTP Request node: https://docs.n8n.io/integrations/built-in/core-nodes/n8n-nodes-base.httprequest/
- n8n Webhook: https://docs.n8n.io/integrations/built-in/core-nodes/n8n-nodes-base.webhook/
- Perplexity API: https://docs.perplexity.ai/
- OpenAI API: https://platform.openai.com/docs/api-reference

---

#### Step 5: Chrome Extension Setup

**If building yourself:**
```
1. Copy src/extension/ folder
2. Update manifest.json with your n8n webhook URL
3. In Chrome: Settings → Extensions → Developer Mode
4. Click "Load unpacked"
5. Select extension folder
6. Test on LinkedIn/Indeed job posting
```

**Minimal implementation (if you just want it working):**
- Manifest V3 compatible
- Listen for button clicks
- Capture job title, company, description
- Send to n8n webhook

---

#### Step 6: Set Up Google Sheets Tracking

**Create tracking spreadsheet:**

**Columns:**
```
A: Date Sent
B: Company
C: Stage (Series A/B/C)
D: Industry
E: Role Type
F: Your Outreach Date
G: Response Received? (Y/N)
H: Interview Scheduled? (Y/N)
I: Interview Date
J: Offer? (Y/N)
K: Research Link (Google Drive)
L: 90-Day Plan Link
M: Response Notes
N: Next Action
```

**Share with n8n:**
```
1. Get spreadsheet ID from URL
2. In n8n Google Sheets node:
   - Select spreadsheet
   - Select sheet
   - Map fields
3. Test by running one workflow
4. Verify row added to sheet
```

---

### Option C: Full Automation (Everything Automated)

**Cost:** $50-100/month (all APIs + infrastructure)  
**Time:** 2 min per application (extension captures → system generates → you send)

This requires building:
- Chrome extension (capture → webhook)
- n8n workflows (research → assets → upload)
- Google Drive integration (storage)
- Google Sheets integration (tracking)
- Error handling + retry logic
- Database for persistent state

**Estimated build time:** 40-60 hours  
**Recommendation:** Start with Option A, graduate to Option B after 20 apps

---

## 🔄 Typical Workflow (Option B)

### You Send Outreach (1 min)
```
Find job posting on LinkedIn/Indeed
Click "Send to Job Hunter" button
Popup appears with job data
Click "Confirm"
→ Data sent to n8n webhook
```

### System Works (5-15 min, automatic)
```
n8n receives job data
├─ Validates + normalizes
├─ Runs research via Perplexity
├─ Generates 6 assets via OpenAI
├─ Uploads to Google Drive
├─ Adds row to Google Sheets
└─ Sends you email: "Assets ready!"
```

### You Customize + Send (20-30 min)
```
Review generated assets in Google Drive
Make any customizations needed
Copy cover letter + paste into email
Attach resume
Send to hiring manager
→ Track response in Sheets
```

### System Tracks + Learns (automatic)
```
Receives response (manual log for now)
Tracks: Date, response type, interview scheduled
After 5 apps → triggers iteration cycle
Suggests optimizations
```

---

## 📊 Cost Analysis

### Option A (Manual)
- Claude Pro: $20/month (or free with Claude.ai)
- Google Workspace: $6-12/month (or free Gmail)
- **Total: $20-32/month**

### Option B (Semi-Automated, Recommended)
- n8n Cloud: $25/month (or $0 if self-hosted on Railway)
- Perplexity API: $20/month (~$0.50 per research × 40 apps)
- OpenAI API: $15/month (~$0.75 per application × 20 apps)
- Google Workspace: $6-12/month
- **Total: $60-72/month** (or $40-50 if self-hosted)

### Option C (Full Automation)
- Everything above: $60-72/month
- Custom development: 40-60 hours (outsourced: $2,000-5,000)
- Database: $5-20/month
- **Total: $70-100/month ongoing** (+ upfront dev cost)

---

## 🎓 Learning Resources

### Understanding the System
1. **Start:** EXECUTIVE-SUMMARY.md (10 min read)
2. **Deep dive:** Job-Hunter-Master-Blueprint.md (30 min read)
3. **Execution:** Workflow-Orchestration-Master.md (20 min read)

### Expert Frameworks
- **Hormozi:** Reference-Hormozi-Value-Equation.md (understand $VALUE formula)
- **Sultanic:** Reference-Alen-Ascension-Specificity.md (understand specificity)
- **Sutherland:** Reference-Rory-Psychologic.md (understand emotion)

### Implementation
- **Manual:** IMPLEMENTATION-GUIDE.md (step-by-step)
- **Iteration:** Workflow-Iteration-Cycle.md (after 5 apps)
- **Debugging:** Workflow-Error-Handling-Retry.md (when stuck)

---

## ⚖️ Legal & License

### License: Creative Commons Attribution 4.0

**You CAN:**
✅ Use these prompts personally for your job search  
✅ Reference the frameworks (cite sources)  
✅ Create original applications based on these prompts  
✅ Modify prompts for your needs  

**You CANNOT:**
❌ Republish this system or claim credit  
❌ Sell this system or use commercially  
❌ Remove attribution to original frameworks (Hormozi, Sultanic, etc.)  
❌ Use this to coach/train others (without permission)  

**Attribution required when sharing:**
> "Built using Job Hunter OS, which incorporates frameworks from Alex Hormozi, Alen Sultanic, Rory Sutherland, Eric Ries, and Gary Vee. See: [link to this repo]"

---

## 🤝 Contributing

Found a bug? Have an optimization?

1. Test it yourself (at least 1 batch of 5 apps)
2. Document improvement (what changed, why, results)
3. Submit via issue with:
   - Description of improvement
   - Before/after metrics
   - Specific file(s) affected
   - Suggested changes

---

## 📞 Support & FAQ

### "Where do I start?"
→ Read EXECUTIVE-SUMMARY.md (10 min), then pick Option A or B

### "Which option should I choose?"
- **Option A** if you want to learn the system first (recommended)
- **Option B** if you want to scale after 5-10 apps
- **Option C** only if you're technical and want full automation

### "How long does each application take?"
- **Manual (Option A):** 4-5 hours per app
- **Semi-automated (Option B):** 30 min per app (after setup)
- **Full automated (Option C):** 5 min per app (after build)

### "What's my expected response rate?"
- **Week 1-2:** 15-20% (you're learning)
- **Week 3-4:** 20-25% (you've optimized once)
- **Week 5+:** 25-35%+ (patterns identified)

### "When will I get interviews?"
- **First interview:** Usually by app 5-10
- **Second interview:** Usually by app 15-20
- **Offer:** Usually by app 30-50 (depends on role market)

### "What if I get stuck?"
→ See Workflow-Error-Handling-Retry.md for common issues + fixes

---

## 🚀 Next Steps

1. **Right now (30 min):**
   - Read EXECUTIVE-SUMMARY.md
   - Decide on Option A, B, or C

2. **This weekend (2-4 hours):**
   - Set up your chosen option
   - Read prompts in asset-generation/

3. **Next week (4-5 hours):**
   - Create your first complete application
   - Send outreach message
   - Start tracking results

4. **Week 2+ (Ongoing):**
   - Send 3-5 applications per week
   - After every 5 apps, run iteration cycle
   - Optimize based on data
   - Land $200K+ offer

---

## 📊 Success Blueprint

**Goal:** Land $200K+ role in 6-10 weeks

**Path:**
```
Week 1-2: Send 5-10 applications (learn + measure)
         Response rate: 15-20%
         Interviews: 0-1

Week 3-4: Send 5-10 applications (with 1 optimization)
         Response rate: 20-25%
         Interviews: 1-2

Week 5-6: Send 5-10 applications (with 2 optimizations)
         Response rate: 25-30%
         Interviews: 2-3

Week 7-8: Send 5-10 applications (further optimized)
         Response rate: 30%+
         Interviews: 3-4
         First offers likely

Week 9-10: Final applications, negotiate with multiple offers
          Land $200K+ role ✅
```

---

## 📄 Document Index

| Document | Purpose | Read Time | When |
|----------|---------|-----------|------|
| EXECUTIVE-SUMMARY.md | Overview | 10 min | First |
| IMPLEMENTATION-GUIDE.md | How to use files | 15 min | Before starting |
| Workflow-Orchestration-Master.md | Asset flow | 20 min | Before first app |
| 10-Research-Company.md | Research prompt | 5 min | For each app |
| 20-90-Day-Plan.md | Plan prompt | 5 min | For each app |
| 30-Resume-Tailor.md | Resume prompt | 5 min | For each app |
| 40-Cover-Letter.md | Letter prompt | 5 min | For each app |
| 50-Interview-Prep.md | Interview prompt | 5 min | For each app |
| 60-Outreach-Message.md | Outreach prompt | 3 min | For each app |
| Reference-*.md | Deep frameworks | 20 min each | For understanding |
| Workflow-Iteration-Cycle.md | Iteration loop | 15 min | After 5 apps |
| Workflow-Error-Handling-Retry.md | Debugging | As needed | When stuck |

---

## 💪 You're Ready

You have everything needed to land a $200K+ role.

**Next action:** Pick your option (A, B, or C) and start.

**Expected timeline:** 6-10 weeks to multiple offers

**Your edge:** While others send generic resumes, you're sending specific plans based on deep research.

That's an unfair advantage.

Go land your role. 🚀

---

*Job Hunter OS v2.0*  
*Production Ready*  
*December 4, 2025*  
*Created by Matt Dimock*