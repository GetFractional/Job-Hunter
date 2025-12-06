# Research Company Prompt (Foundation Asset)

> **Reference**: This prompt follows `/docs/Asset-Generation-Template.md` structure.

## 📌 PURPOSE
Generate comprehensive company intelligence to inform all downstream assets (90-day plan, resume, cover letter, interview prep, outreach).

**When Used**: First step after job is captured  
**Input**: Job posting + company name + LinkedIn URL  
**Output**: 500-600 word research brief with 5 sections  
**Success Metric**: Every downstream asset references at least 3 specific insights from this brief

---

## 🧠 CORE PRINCIPLES

### Principle 1: Specificity Over Surface-Level Research
- **Definition**: Find details ONLY true of THIS company (not "companies like this")
- **Why It Matters**: Generic research → generic assets → no competitive advantage
- **How To Apply**: Use Alen's Specificity framework - dig until you find unique signals
- **Example**: 
  - ❌ "Series B SaaS company focused on growth"
  - ✅ "Series B SaaS ($45M raised, Sequoia lead) expanding from SMB to enterprise (50+ employee customers now 30% of ARR), hiring first demand gen leader because founder-led marketing can't scale"
- **Anti-Pattern**: Stopping at Crunchbase surface data
- **Source**: Reference-Alen-Ascension-Specificity.md

### Principle 2: Diagnose Their Inflection Point
- **Definition**: Identify the specific growth constraint they're facing RIGHT NOW
- **Why It Matters**: The 90-day plan must solve their current problem, not a generic one
- **How To Apply**: Look for signals: funding round + hiring spike = scaling challenge; layoffs + restructure = efficiency focus
- **Example**: "They raised $30M in Q2 but revenue grew only 20% (below SaaS median 40%). Likely issue: CAC too high or sales cycle too long. Hiring a VP Growth signals they know it."
- **Anti-Pattern**: Describing what they do, not what problem they face
- **Source**: Job-Hunter-OS-Strategic-Guidelines.md (Design Thinking)

### Principle 3: Competitive Positioning Context
- **Definition**: Understand where they sit vs. competitors (feature parity, pricing, market share)
- **Why It Matters**: Influences what growth strategy will work
- **How To Apply**: Porter's Five Forces - who are they really competing with? What's their differentiation?
- **Example**: "Competing with HubSpot (800lb gorilla) and Marketo (enterprise), but positioning as 'easier than Marketo, more powerful than HubSpot' for mid-market. That's a tough middle position - neither cheapest nor most feature-rich."
- **Anti-Pattern**: Not researching competitors at all
- **Source**: Job-Hunter-OS-Strategic-Guidelines.md (Porter's Five Forces)

### Principle 4: Hiring Manager Context (If Available)
- **Definition**: Research the hiring manager's background, priorities, decision style
- **Why It Matters**: Informs tone, level of detail, what to emphasize in cover letter
- **How To Apply**: LinkedIn profile - what's their background? Technical or commercial? Recent posts - what are they focused on?
- **Example**: "Hiring manager is CRO with 3 years at company, ex-Salesforce. Posts frequently about sales enablement, pipeline velocity. Likely values: speed, execution, sales-marketing alignment."
- **Anti-Pattern**: Ignoring the person who'll interview you
- **Source**: Design Thinking (Empathize phase)

---

## ⚙️ TACTICAL RULES

### Rule 1: Use Primary Sources
- Prioritize: Company blog, press releases, CEO LinkedIn, earnings calls (if public)
- Avoid: Generic "company review" sites, old news
- Formula: 70% primary sources, 30% secondary analysis

### Rule 2: Time-Box Research
- 5-10 minutes max for initial research
- If you can't find key data in 10 minutes, note what's missing and move forward
- Don't let perfect research block asset generation

### Rule 3: Structure Around Their Problem
- Don't just describe the company
- Diagnose: What growth problem are they trying to solve by hiring this role?
- Formula: Current State → Problem Hypothesis → Evidence → Implication for Role

---

## 📋 RESEARCH BRIEF TEMPLATE
```markdown
# Research Brief: [COMPANY NAME] - [ROLE TITLE]

## COMPANY OVERVIEW (150 words max)
- **Stage**: [Series A/B/C, Public, Bootstrapped]
- **Revenue**: [If known: $XM ARR]
- **Funding**: [Most recent round, investors]
- **Employees**: [Headcount, growth rate]
- **Product**: [What they sell, to whom]
- **Market Position**: [Where they sit vs. competitors]
- **Recent News**: [Funding, product launch, leadership change in last 6 months]

## ROLE ANALYSIS (150 words max)
- **Real Requirements**: [What job posting says vs. what they actually need]
- **Team Structure**: [Who this role reports to, team size]
- **Success Metrics**: [How they'll measure this role in Year 1]
- **Pain Points**: [Specific problems this hire should solve]
- **Inflection Point**: [Why are they hiring NOW? What triggered this?]

## MARKET CONTEXT (100 words max)
- **Industry Trends**: [Tailwinds or headwinds in their sector]
- **Growth Signals**: [Hiring 10+ roles, expanding team, new product launch]
- **Competitive Threats**: [Who's winning market share, why]
- **Economic Context**: [Macro factors affecting their business]

## HIRING MANAGER INTEL (100 words max - if available)
- **Background**: [Previous companies, expertise]
- **Decision Style**: [Data-driven vs. intuition, fast vs. deliberate]
- **Likely Priorities**: [Based on LinkedIn posts, company focus]
- **Communication Preference**: [Formal vs. casual, detail vs. high-level]

## STRATEGIC POSITIONING FOR MATT (150 words max)
- **Best Angle**: [How Matt should frame his experience for THIS company]
- **Proof Points**: [Which past wins are most relevant]
- **Differentiation**: [What makes Matt uniquely suited vs. other candidates]
- **Quick Win Opportunity**: [Something Matt could improve in first 30-60 days]
- **Risk to Address**: [Potential objection and how to preempt it]
```

---

## 📊 SUCCESS METRICS

Research quality scorecard (50 points):

- [ ] **Specificity** (10 pts): Contains 5+ details unique to THIS company
- [ ] **Diagnosis** (10 pts): Identifies their specific growth constraint
- [ ] **Competitive** (5 pts): References 2+ competitors with positioning context
- [ ] **Timing** (5 pts): Explains WHY they're hiring NOW (inflection point)
- [ ] **Hiring Manager** (5 pts): Includes intel on decision-maker (if available)
- [ ] **Quantified** (5 pts): Includes revenue, funding, employee count, or growth rates
- [ ] **Recent** (5 pts): Cites news/events from last 6 months
- [ ] **Strategic Angle** (5 pts): Clear recommendation on how Matt should position

**Scoring**: 40+ = Excellent foundation for downstream assets

---

## 🚫 CONSTRAINTS & GUARDRAILS

**DO:**
✅ Use web_search tool for real-time company data  
✅ Check Crunchbase, LinkedIn, company blog, recent news  
✅ Time-box research to 5-10 minutes  
✅ Note what you DON'T know (honest about data gaps)  
✅ Focus on growth constraints, not generic description  

**DON'T:**
❌ Spend >10 minutes researching  
❌ Copy-paste from company "About Us" page  
❌ Guess if you don't have data  
❌ Ignore the hiring manager's profile  
❌ Skip competitive analysis  

---

## 🔗 CROSS-REFERENCES

- **Depends on**: Job posting data (from extension)
- **Complements**: Matt-Dimock-Professional-Profile.md (to identify relevant proof points)
- **Used by**: All downstream assets (90-day plan, cover letter, interview prep, outreach)
- **Triggers**: 20-90-Day-Plan.md (uses this research as foundation)
- **Source Frameworks**: Alen Specificity, Porter's Five Forces, Design Thinking