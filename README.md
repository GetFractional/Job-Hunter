# Job Hunter OS

**Automated job application system using AI to generate hyper-personalized assets at scale**

Transform hours of manual work per application → 15 minutes with consistent quality.

---

## 🎯 What This Is

Job Hunter OS is a systematized job search automation system designed to help land $200K+ remote Growth/RevOps/Lifecycle leadership roles. It combines:

- **Chrome Extension**: Captures job data from LinkedIn/Indeed with one click + Outreach Mode for hiring managers
- **Airtable CRM**: Relational database (8 tables) tracking Companies, Contacts, Jobs, and Outreach
- **n8n Workflows**: Automated research and asset generation pipelines
- **AI Integration**: Perplexity (research) + OpenAI (asset generation)
- **Google Drive**: Organized storage of all generated materials

**Output per job**: 6 personalized assets in <5 minutes (research brief, 90-day plan, tailored resume, cover letter, interview prep, outreach message)

**CRM Features**: Automatic company/contact record creation, hiring manager tracking, outreach workflow with LinkedIn integration

---

## 📁 Repository Structure Job-Hunter/
├── CLAUDE.md                          # System specification (for Claude Code)
├── README.md                          # This file
│
├── docs/                              # Core Documentation
│   ├── Job-Hunter-OS-Strategic-Guidelines.md    # Master strategy & MECE filtering
│   ├── Matt-Dimock-Professional-Profile.md      # Source of truth for achievements
│   ├── System-Architecture.md                    # Technical component design
│   ├── Data-Architecture.md                      # Airtable schema (5 tables)
│   ├── Implementation-Roadmap.md                 # Build checklist
│   ├── Asset-Generation-Template.md              # Common prompt structure
│   └── Job-Hunter-OS-Master-Blueprint.md         # Original design doc (archive)
│
├── prompts/                           # AI Prompt Templates
│   ├── asset-generation/              # 6 core asset generators
│   │   ├── 10-Research-Company.md     # Company intelligence (500-600 words)
│   │   ├── 20-90-Day-Plan.md          # Hero asset (800 words, phased approach)
│   │   ├── 30-Resume-Tailor.md        # ATS-optimized bullets
│   │   ├── 40-Cover-Letter.md         # Problem → Proof → Solution (300-400 words)
│   │   ├── 50-Interview-Prep.md       # STAR stories + objection handling
│   │   └── 60-Outreach-Message.md     # 3-sentence follow-up (40-60 words)
│   │
│   ├── reference/                     # Expert frameworks
│   │   ├── Reference-Hormozi-Value-Equation.md
│   │   ├── Reference-Alen-Ascension-Specificity.md
│   │   └── Reference-Rory-Psychologic.md
│   │
│   └── workflow/                      # Orchestration logic
│       ├── Workflow-Orchestration-Master.md
│       └── Workflow-Iteration-Cycle.md
│
└── src/                               # Implementation (to be built)
├── extension/                     # Chrome extension code
├── n8n/                           # n8n workflow JSONs
└── database/                      # Airtable documentation

---

## 🚀 Quick Start

### Prerequisites

- **Claude Desktop** (with Project access)
- **Claude Code** (for building the system)
- **Accounts**: Airtable, n8n (Railway), OpenAI, Perplexity, Google Drive
- **Tools**: Git, Node.js, Chrome browser

### Step 1: Set Up Claude Desktop

1. Open Claude Desktop
2. Create new Project: "Job Hunter OS"
3. Add all files from this repository to the project
4. Add Custom Instructions (see section below)

### Step 2: Review Documentation

Read in this order:
1. `/docs/Job-Hunter-OS-Strategic-Guidelines.md` - Understand the strategy
2. `/docs/System-Architecture.md` - Understand how components connect
3. `/docs/Implementation-Roadmap.md` - See what needs to be built

### Step 3: Start Building

Use Claude Code to build the system:

Navigate to project
cd ~/Documents/Jobs/Job-Hunter/Start Claude Code
claudeUse starter prompts from Implementation Roadmap

---

## 📖 How to Use (Once Built)

### Daily Workflow

1. **Find job on LinkedIn/Indeed**
2. **Click "Send to Job Hunter"** (Chrome extension)
3. **Wait 3-5 minutes** (automation runs)
4. **Review assets in Airtable/Drive**
5. **Apply with confidence**

### CRM & Outreach Mode

Job Hunter now includes a full CRM system for managing contacts and outreach:

#### Automatic Record Creation
When you capture a job, the extension automatically creates/updates:
- **Company record** in the Companies table
- **Contact record** for the hiring manager (if detected)
- **Job record** in Jobs Pipeline (linked to both)

#### Outreach Mode Workflow

1. **In Airtable Outreach Log table**: Create outreach records for hiring managers
2. **Add outreach message**: Write or paste your personalized outreach message
3. **Click "Open URL" button**: Opens the contact's LinkedIn profile with a special parameter
4. **Extension detects Outreach Mode**: Shows a special UI overlay with:
   - Contact details (name, title, company, email)
   - Your outreach message with a "Copy" button
   - "Mark as Sent" button to track status
5. **Send your message on LinkedIn**: Copy the message and send via LinkedIn
6. **Click "Mark as Sent"**: Updates both Outreach Log and Contact records with sent date
7. **Track responses**: Update the Response field when you hear back

#### Airtable Button Setup

To enable "Open URL" functionality in your Outreach Log table:

1. Add a **Button** field called `Open URL`
2. Use this formula:
   ```
   {LinkedIn URL (from Outreach Message)} & "?outreachID=" & RECORD_ID()
   ```
3. When clicked, it will open the LinkedIn profile in Outreach Mode

**Note**: The `outreachID` parameter must be ONLY the Airtable record ID (format: `recXXXXXXXXXXXXXXX`). Do not add any prefix like "1" before the record ID.

### Asset Quality

Every asset is scored against a 50-point rubric:
- ✅ Score ≥45 = Ready to use
- ⚠️ Score 40-44 = Needs minor refinement
- ❌ Score <40 = Regenerate

### Monthly Review

Last Friday of each month:
1. Analyze metrics (applications, response rate, interviews)
2. Identify patterns (what worked, what didn't)
3. Iterate on prompts/approach
4. Set goals for next month

---

## 🧠 Key Principles

### 1. Research Before Assets
**Never** generate 90-day plans, resumes, or cover letters without a research brief first. Research is the foundation.

### 2. Specificity is Credibility
- Exact metrics: "$45M revenue" not "significant growth"
- Exact timeframes: "8 weeks" not "quickly"
- Exact tactics: Use company-specific details, not generic language

### 3. MECE Job Filtering
**Hard Filters** (must pass ALL):
- Salary ≥$200K base
- Remote or hybrid
- Growth/RevOps/Lifecycle role
- Series B-D or growth-stage public

**Strong Preferences** (≥2 should pass):
- Manage ≥3 people
- Budget ≥$500K
- Equity ≥0.5%
- Bonus ≥25%

### 4. Quality Gates
Before delivering any asset:
- [ ] Uses company's exact terminology
- [ ] Includes specific metrics
- [ ] References past achievements with proof
- [ ] No vague language
- [ ] Scored ≥45/50 on rubric

---

## 🔧 Custom Instructions for Claude Desktop

Add these to Claude Desktop → Settings → Custom Instructions:
```
[See full custom instructions in project files - too long for README]

Key highlights:
Always use project_knowledge_search before answering
Reference 18 files organized in 5 tiers
Follow decision trees for different scenarios
Apply frameworks sequentially (Metacognition → Systems → MECE → Tactical)
Score every asset before delivery
Maintain specificity (no vague language)
```

**Full instructions**: See conversation history or `/docs/` folder

---

## 📊 System Metrics

### Target Performance
- **Volume**: 5+ applications/day, 20-30/month
- **Quality**: Average asset score ≥45/50
- **Efficiency**: <20 minutes per application (including review)
- **Cost**: <$3 per job ($55-60/month for 20 jobs)
- **Response Rate**: ≥15%

### Current Status
- [x] Documentation complete
- [x] Prompts optimized
- [x] Architecture designed
- [ ] Chrome extension (to be built)
- [ ] Airtable database (to be configured)
- [ ] n8n workflows (to be created)
- [ ] End-to-end testing (pending)

---

## 🗓️ Implementation Roadmap

### Phase 1: Foundation
- [ ] Create Airtable base (5 tables)
- [ ] Configure API credentials
- [ ] Set up Google Drive folder structure

### Phase 2: Data Capture
- [ ] Build Chrome extension
- [ ] Test on LinkedIn/Indeed
- [ ] Verify Airtable integration

### Phase 3: Research Automation
- [ ] Create n8n Research workflow
- [ ] Test Perplexity API integration
- [ ] Configure Airtable automation triggers

### Phase 4: Asset Generation
- [ ] Create 5 n8n asset workflows
- [ ] Test OpenAI API integration
- [ ] Configure Google Drive uploads

### Phase 5: Quality Validation
- [ ] Process 5 real jobs end-to-end
- [ ] Validate asset quality (score ≥45)
- [ ] Refine prompts based on results

### Phase 6: Launch
- [ ] Document daily workflow
- [ ] Create troubleshooting guide
- [ ] Begin production use

**Detailed tasks**: See `/docs/Implementation-Roadmap.md`

---

## 🚨 Troubleshooting

### Chrome Extension Issues
- **Can't capture jobs**: Check Airtable credentials in popup settings
- **Wrong data extracted**: LinkedIn may have changed layout, update selectors
- **API errors**: Verify Airtable Base ID and token are correct

### Workflow Issues
- **Research failed**: Check Perplexity API key, verify webhook URL
- **Low quality scores**: Review prompt, add more company-specific context
- **Assets not generating**: Check n8n execution logs, verify OpenAI API key

### General Issues
- **Files not in project**: Use `project_knowledge_search` in Claude Desktop
- **Claude Code not working**: Verify CLAUDE.md exists in root directory
- **API costs too high**: Review rate limits, check for duplicate calls

**Detailed troubleshooting**: See `/docs/Implementation-Roadmap.md` Contingency Plans

---

## 🤝 Contributing

This is a personal project, but key learnings:

### What Worked
- **Comprehensive documentation** before coding prevents scope creep
- **Rubric-based quality gates** ensure consistency
- **Sequential asset generation** (research → plan → resume → letter) maintains quality
- **Expert frameworks** (Hormozi, Alen, Rory) provide structure

### What to Avoid
- Don't skip research brief (foundation for everything)
- Don't use vague language (specificity = credibility)
- Don't generate assets in parallel without research context
- Don't bypass quality scoring (saves time debugging later)

---

## 📚 Additional Resources

### Key Files to Reference
- **Strategy**: `/docs/Job-Hunter-OS-Strategic-Guidelines.md`
- **Profile**: `/docs/Matt-Dimock-Professional-Profile.md`
- **Architecture**: `/docs/System-Architecture.md`, `/docs/Data-Architecture.md`
- **Roadmap**: `/docs/Implementation-Roadmap.md`

### Expert Frameworks
- **Hormozi**: Value = (Dream × Likelihood) / (Time × Effort)
- **Alen**: "How specifically?" - Drill down to exact details
- **Rory**: Psychological persuasion and reframing

### Claude Tools
- **Claude Desktop**: Asset generation, strategy, coaching
- **Claude Code**: Building extension, workflows, scripts
- **Project Knowledge**: Search across all documentation files

---

## 📝 License

MIT License - See LICENSE file for details

---

## 📧 Contact

**Matt Dimock**  
Email: matt@getfractional.co  
LinkedIn: [Your LinkedIn]  
GitHub: [@GetFractional](https://github.com/GetFractional)

---

## 🎯 Success Metrics

### Week 1 Goals
- [ ] System fully built and tested
- [ ] 5 jobs processed successfully
- [ ] All assets scoring ≥45
- [ ] Time per job <20 minutes

### Month 1 Goals
- [ ] 20+ applications submitted
- [ ] Response rate ≥15%
- [ ] 3+ phone screens
- [ ] 1+ full interview

### Ultimate Goal
- [ ] Land $200K+ remote leadership role
- [ ] Share learnings with others
- [ ] Refine system based on results

---

**Version**: 1.0  
**Last Updated**: December 6, 2024  
**Status**: Documentation complete, implementation in progress  
**Next Steps**: Begin building with Claude Code