# Annual Growth Plan Prompt (Strategic Hero Asset)

> **Reference**: This prompt follows `/docs/Asset-Generation-Template.md` structure.

## 📌 PURPOSE

Generate a hyper-specific, research-validated annual growth plan that demonstrates Matt has deeply diagnosed the company's growth problem, understands the multi-year strategic context, and knows exactly how to architect sustainable systems for scale.

**When Used**: After research brief is complete  
**Input**: Research brief + Matt's profile + job description  
**Output**: 2,500-3,500 word annual plan with Year 1 quarterly breakdowns + Years 2-3 strategic themes  
**Success Metric**: Hiring manager says "This person thinks strategically AND can execute" + Finance/CEO see clear ROI path

---

## 🧠 CORE PRINCIPLES

### Principle 0: Research Traceability (CRITICAL - NEW)
- **Definition**: Every major recommendation must cite specific research findings
- **Why**: Builds credibility through evidence-based strategy; shows plan is not generic template
- **How**: Reference research brief fields directly: "The company's [pain_point] indicates [strategic implication]"
- **Example**: "Your lifecycle email is fully manual [from pain_points], leaving $2-3M in repeat revenue unrealized. At Prosper Wireless, I built automated lifecycle infrastructure using Braze, achieving 167% revenue growth."
- **Anti-Pattern**: Making strategic claims with no research backing; generic recommendations that could apply to any company
- **Source**: Data-Architecture-Research.md (Research JSON Contract), Job-Hunter-OS-Strategic-Guidelines.md (Systems Thinking)

### Principle 1: Lead with Diagnosis (Not Solution)
- **Definition**: First 300-400 words must articulate THEIR specific problem with evidence
- **Why**: Shows you understand before prescribing (Design Thinking: Empathize → Define)
- **How**: Reference research findings using exact data points from research brief
- **Example**: "Your revenue declined from [revenue_range] to [current state], a [X]% drop. Root cause analysis reveals: (1) [pain_point_1], (2) [pain_point_2], (3) [pain_point_3]. This stems from [inflection_point context]."
- **Anti-Pattern**: Jumping to solutions without proving you understand their unique problem
- **Source**: Design Thinking, Job-Hunter-OS-Strategic-Guidelines.md

### Principle 2: Multi-Year Vision with Near-Term Proof
- **Definition**: Year 1 must be detailed (quarterly), Years 2-3 thematic (strategic direction)
- **Why**: Shows strategic thinking while acknowledging need for validation
- **How**: Q1-Q4 = specific initiatives with metrics; Year 2-3 = strategic themes with conditional logic
- **Example**: "Year 1 Q1: Launch lifecycle automation targeting $500K incremental retention revenue. Year 2 Theme: Multi-channel expansion (conditional on Year 1 CAC efficiency gains validating market receptivity)."
- **Anti-Pattern**: Either too tactical (no vision) or too visionary (no near-term proof)
- **Source**: McKinsey Three Horizons, Lean Startup (Build-Measure-Learn)

### Principle 3: Assumption Documentation (CRITICAL - NEW)
- **Definition**: Every projection must explicitly state what needs validation
- **Why**: Shows intellectual honesty; protects against overpromising; builds trust
- **How**: Add "Key Assumptions to Validate in Discovery" section after each major initiative
- **Example**: "Projected $2M lifecycle revenue assumes: (1) [repeat_rate] holds [validate in data review], (2) Platform can integrate with existing stack [validate with CTO], (3) Team has bandwidth for weekly campaign ops [validate with hiring manager]."
- **Anti-Pattern**: Treating research-based projections as guaranteed outcomes
- **Source**: Rory Sutherland (Psycho-Logic), Job-Hunter-OS-Strategic-Guidelines.md (Second-Order Thinking)

### Principle 4: Connect to Matt's Proof Points
- **Definition**: Every major initiative must reference a past win with exact metrics
- **Why**: Credibility through pattern recognition + proof of repeatability
- **How**: "At [Company], I solved exactly this by [method] achieving [metric]"
- **Example**: "At Prosper Wireless, I built enterprise-scale lifecycle infrastructure using Braze, launching monthly campaigns to 600K customers. Result: $45M → $120M revenue in 12 months (167% growth) [PROOF: Matt-Dimock-Professional-Profile.md, Section 2.2]. I'll apply this playbook at [COMPANY_NAME], adapted for [industry] context."
- **Anti-Pattern**: Generic claims ("I have lifecycle expertise") without proof
- **Source**: Matt-Dimock-Professional-Profile.md

### Principle 5: Quantify Every Initiative with Ranges
- **Definition**: Every action must have projected business impact WITH best/base/worst case ranges
- **Why**: Shows financial rigor; acknowledges uncertainty; demonstrates ROI thinking
- **How**: Use formula: "(Expected Outcome Range - Current State) = Value Added"
- **Example**: "Lifecycle automation: Best case $3M (repeat rate +20%), Base case $2M (repeat rate +15%), Worst case $800K (repeat rate +8%). Assumes [AOV] AOV, [customer_volume] annual customers, 3-purchase LTV increase."
- **Anti-Pattern**: Single-point estimates ("Will deliver $2M") without ranges or assumptions
- **Source**: Reference-Hormozi-Value-Equation.md, Financial Modeling best practices

### Principle 6: Risk Acknowledgment with Mitigation
- **Definition**: Include 5-7 material risks with specific mitigation strategies
- **Why**: Shows you're not selling fairy tales; demonstrates strategic foresight
- **How**: Format as: "Risk: [specific scenario] | Likelihood: [H/M/L] | Impact: [H/M/L] | Mitigation: [action]"
- **Example**: "Risk: Revenue decline caused by product issues, not GTM | Likelihood: Medium | Impact: High | Mitigation: Validate root cause in Week 1-2 via cohort analysis + customer surveys; if product-driven, shift plan to product-market fit testing."
- **Anti-Pattern**: Generic risks ("Things might not work") or ignoring risks entirely
- **Source**: Inversion Thinking, Job-Hunter-OS-Strategic-Guidelines.md

---

## ⚙️ TACTICAL RULES

### Rule 1: Structure is Sacred (Multi-Year)
**Year 1 Structure:**
- Q1 (Months 1-3) = DIAGNOSE & STABILIZE (validate hypotheses, quick wins)
- Q2 (Months 4-6) = BUILD & PILOT (infrastructure, measurement)
- Q3 (Months 7-9) = OPTIMIZE & SCALE (double down on winners)
- Q4 (Months 10-12) = SYSTEMATIC GROWTH (repeatable playbooks)

**Year 2-3 Structure:**
- Year 2 Theme: [Strategic expansion based on Y1 learnings]
- Year 3 Theme: [Market leadership positioning]

### Rule 2: Use Their Exact Terminology
Mirror language from research brief:
- If research says "CAC payback," use that (not "customer acquisition cost recovery")
- If research says "ARR," use that (not "annual revenue")
- If hiring manager name is provided, use it (not "CEO")

### Rule 3: Extract and Reference Research Data
Pull data directly from research brief fields:
- Use `company_summary` for company description
- Use `pain_points` for problem identification
- Use `hiring_manager_name` and `hiring_manager_title` for personalization
- Use `competitive_threats` for market context
- Use `quick_win_opportunities` for Q1 initiatives
- Use `strategic_positioning_summary` for framing

### Rule 4: Granularity by Time Horizon
- **Q1**: Weekly-level detail ("Week 1-2: Audit current systems...")
- **Q2-Q4**: Monthly-level detail ("Month 5: Launch partnership pilot...")
- **Year 2-3**: Thematic-level detail ("Expand multi-channel acquisition...")

### Rule 5: Financial Projections Table Required
Must include:
- Baseline metrics (current state from research)
- Q2/Q4/Y2/Y3 targets
- % change calculation
- Assumptions documented

### Rule 6: Assumption Validation Checklist
After each major initiative, include:
- **Assumptions**: 3-5 specific things that must be true
- **Validation Method**: How to test (data review, interview, pilot)
- **Contingency**: What if assumption is wrong

---

## 📋 ANNUAL GROWTH PLAN TEMPLATE

---

# Annual Strategic Growth Plan: [JOB_TITLE] | [COMPANY_NAME]

**Prepared by**: Matt Dimock  
**Date**: [CURRENT_DATE]  
**Version**: 1.0 (Research-Based Initial Draft)

---

## 📌 PLAN DISCLAIMER & VALIDATION FRAMEWORK

> **Important Context**: This plan is based on publicly available research, industry benchmarks, and pattern recognition from similar growth challenges I've solved. All projections assume validation of key hypotheses during discovery interviews, data access, and stakeholder alignment. Strategic priorities will be refined based on:
> 
> - ✅ Confirmed internal data (actual CAC, LTV, cohort behavior, channel performance)
> - ✅ Leadership input ([HIRING_MANAGER_NAME]'s priorities, CFO budget constraints, team capabilities)
> - ✅ Market validation (customer research, competitive analysis, A/B testing)
> - ✅ Technology constraints (current martech stack, integration feasibility)
> 
> This document represents a **preliminary strategic roadmap**, not a fixed commitment. I present it to demonstrate:
> 1. Deep understanding of your growth problem
> 2. Systems-thinking approach to diagnosis
> 3. Track record of solving similar challenges
> 4. Clear hypothesis-testing methodology

---

## EXECUTIVE SUMMARY (1 page)

### Current Situation

[COMPANY_NAME] is a [STAGE] [INDUSTRY] company at a critical inflection point.

**Key Context**:
- Revenue: [REVENUE_RANGE]
- Funding: [FUNDING]
- Team: [HEADCOUNT], with leadership including [HIRING_MANAGER_NAME] ([HIRING_MANAGER_TITLE])
- Market Position: [COMPANY_SUMMARY - key highlights]

### Core Problem Diagnosed

Based on comprehensive research, your biggest growth constraint is **[PRIMARY_PAIN_POINT]**, costing approximately **$[ESTIMATED_IMPACT]M** in Year 1 opportunity cost.

**Evidence from Research**:
1. [PAIN_POINT_1] → Impact: $[X] unrealized revenue
2. [PAIN_POINT_2] → Impact: [Y]% efficiency loss
3. [PAIN_POINT_3] → Impact: [Z]% competitive disadvantage

**Root Cause Analysis**:

The [revenue decline/stagnation/growth challenge] stems from [INFLECTION_POINT context], which manifests as [observable symptoms from pain_points]. This challenge is addressable through systems architecture: replacing manual processes with automated infrastructure, unclear attribution with data-driven decision frameworks, and tactical execution with strategic playbooks.

### Strategic Solution: Systems Architecture Approach

I architect growth infrastructure that replaces chaos with repeatable systems. For [COMPANY_NAME], this means:

**Year 1 Focus**: Stabilize [revenue/operations], build measurement infrastructure, prove ROI on 2-3 high-leverage initiatives  
**Year 2 Focus**: Scale validated channels, expand GTM motion, build team capacity  
**Year 3 Focus**: [Market leadership positioning based on vision field]

**Year 1 Impact Forecast** (based on research + pattern recognition from similar companies):
- Revenue: [CURRENT_REVENUE] → [PROJECTED_REVENUE] (+[X]%)
- CAC: [CURRENT_CAC] → [TARGET_CAC] (-[Y]%)
- LTV: [CURRENT_LTV] → [TARGET_LTV] (+[Z]%)
- Team NPS: Baseline → 8+/10

---

## SECTION 1: SITUATION ANALYSIS (Research-Grounded Diagnosis)

### 1.1 Market Context

**Industry Landscape**:

The [INDUSTRY] market is experiencing [INDUSTRY_TRENDS summary]. Key dynamics include:
- [TREND_1 from industry_trends]
- [TREND_2 from industry_trends]
- [TREND_3 from industry_trends]

**Market Size & Growth**: [MARKET_SUMMARY]

**Competitive Threats**:

[COMPANY_NAME] faces pressure from:
- [COMPETITOR_1 from competitive_threats]
- [COMPETITOR_2 from competitive_threats]
- [COMPETITOR_3 from competitive_threats]

**Growth Signals**:

Despite competitive pressure, [COMPANY_NAME] has clear momentum indicators:
- [GROWTH_SIGNAL_1 from growth_signals]
- [GROWTH_SIGNAL_2 from growth_signals]
- [GROWTH_SIGNAL_3 from growth_signals]

**Strategic Implication**:

The market is [growing/consolidating/shifting based on market_summary], which means [COMPANY_NAME] must [strategic response based on strategic_positioning_summary] within [timeframe] to [maintain/capture] position.

### 1.2 Company Diagnosis

**Revenue/Growth Challenge Root Cause**:

**Hypothesis**: The [revenue decline/growth constraint] from [BASELINE] to [CURRENT_STATE] is driven by:

1. **Primary cause**: [PAIN_POINT with highest impact from pain_points]
2. **Contributing factors**: [2-3 additional pain_points]
3. **Market dynamics**: [relevant competitive_threats and industry_trends]

**Evidence Chain**:
- [Data point from research] → indicates [insight] → suggests [action]

**Validation Required**:
- [ ] [Assumption 1 based on research gaps]
- [ ] [Assumption 2 based on data availability]
- [ ] [Assumption 3 based on stakeholder access]

### 1.3 Organizational Assessment

**Current Team Structure**:

[TEAM_STRUCTURE details]. This role will [reporting relationship context].

**Leadership Context**:

[HIRING_MANAGER_NAME] ([HIRING_MANAGER_TITLE]) brings [HIRING_MANAGER_INTEL_SUMMARY]. Key priorities include:
- [HIRING_PRIORITY_1 from hiring_priorities]
- [HIRING_PRIORITY_2]
- [HIRING_PRIORITY_3]

Decision style: [HIRING_MANAGER_DECISION_GATE context]

**Infrastructure Gaps**:

Based on research, critical systems gaps include:
- [PAIN_POINT related to systems/tools]
- [PAIN_POINT related to data/analytics]
- [PAIN_POINT related to processes]

### 1.4 Strategic Hypothesis

> **Core Thesis**: Based on research, I believe the primary growth constraint is **[specific bottleneck from fit_summary or strategic_positioning_summary]**, evidenced by **[3 data points from pain_points/reasons_to_pursue]**, which can be addressed through **systems architecture** (replacing manual with automated, unclear with measured, tactical with strategic).

**My Three Testable Hypotheses**:
1. [Hypothesis 1 based on pain_points] → Test via: [method] → Timeline: Week 1-2
2. [Hypothesis 2 based on competitive_threats or market context] → Test via: [method] → Timeline: Week 2-3
3. [Hypothesis 3 based on inflection_point] → Test via: [method] → Timeline: Week 3-4

**Key Assumptions to Validate in Discovery**:
- [ ] [Assumption 1 requiring data access]
- [ ] [Assumption 2 requiring stakeholder confirmation]
- [ ] [Assumption 3 requiring market validation]
- [ ] [Assumption 4 requiring technical feasibility check]
- [ ] [Assumption 5 requiring budget approval]

---

## SECTION 2: YEAR 1 OPERATING PLAN (Quarterly Execution)

---

### Q1: DIAGNOSE & STABILIZE (Months 1-3)

**Objective**: [Halt revenue decline/Accelerate growth/Establish foundation], validate hypotheses, establish measurement infrastructure

**Success Criteria by End of Q1**:
- [Primary metric] stabilized or growing +5-10%
- 2 quick wins delivered ($[X]K incremental each, from quick_win_opportunities)
- Diagnostic dashboard live (funnel visibility, channel attribution)
- Strategic roadmap validated with [HIRING_MANAGER_NAME]

---

#### 🎯 INITIATIVE 1.1: Root Cause Audit & Diagnostic

**Research Evidence**: [Reference pain_points that indicate measurement/visibility gaps]

**What**: Comprehensive audit of [acquisition channels/retention cohorts/operational workflows based on pain_points] to diagnose [revenue decline/growth constraint] root cause.

**Why This First**: Can't prescribe solutions until we validate whether the challenge is:
- Acquisition problem (CAC rising, volume declining)
- Retention problem (churn increasing, LTV declining)
- Product-market fit problem (market saturation, competitive displacement)
- Operational problem (execution gaps, team capability)

**Week 1-2 Actions**:
- Day 1-3: Stakeholder interviews ([HIRING_MANAGER_NAME], CFO, team leads) to understand current hypotheses
- Day 4-7: Data audit ([existing analytics tools], CRM, finance reports)
- Day 8-10: [Cohort analysis/channel analysis/customer research based on context]
- Day 11-14: Competitive analysis ([COMPETITOR_1, COMPETITOR_2 from competitive_threats])

**Deliverable by Day 14**: Root Cause Diagnostic Report presented to [HIRING_MANAGER_NAME] with:
- Problem classification (acquisition vs. retention vs. product vs. operations)
- [Channel-by-channel/Segment-by-segment] ROI breakdown
- Top 3 leverage points ranked by impact/effort
- Recommended action plan for Q1-Q4

**Expected Outcome**: Validated strategic direction; exec alignment on priorities

**Matt's Proof Point**: [Reference relevant past win from Matt-Dimock-Professional-Profile.md that matches the context - e.g., Prosper for high-volume scaling, Bob's Watches for ecommerce, Affordable Insurance for systems from scratch]

**Assumptions to Validate**:
- [ ] Data exists and is accessible ([analytics platform], CRM, finance)
- [ ] [HIRING_MANAGER_NAME] + CFO will make time for stakeholder interviews (2 hours each)
- [ ] Current [attribution/tracking/measurement] allows [channel/segment/cohort]-level analysis

**Contingency Plan**:
- If data doesn't exist → Shift to "instrumentation sprint" (set up tracking Week 1, analyze Week 3-4)
- If [constraint identified] → [Alternative approach]

---

#### 🎯 INITIATIVE 1.2: Quick Win #1 — [QUICK_WIN_OPPORTUNITY_1]

**Research Evidence**: [Reference specific quick_win_opportunity from research brief, or derive from pain_points]

**What**: [Specific initiative based on quick_win_opportunities field or derived from pain_points - e.g., "Launch automated lifecycle email sequences" or "Optimize top-performing paid channel" or "Pilot partnership program"]

**Why High-Leverage**: 
- [Reason 1 tied to reported_cac or estimated_cac_range]
- [Reason 2 tied to revenue_model or gtm_motion]
- [Economic impact quantification]

**Week 3-4 Actions**:
- Day 15-17: [Setup/procurement/integration step]
- Day 18-21: [Build/design/configure step]
- Day 22-28: [QA/test/pilot step]
- Day 29-30: [Launch/measure/optimize step]

**Expected Impact**:
- **Best Case**: $[X]K incremental Q1 revenue ([assumptions])
- **Base Case**: $[Y]K incremental Q1 revenue ([assumptions])
- **Worst Case**: $[Z]K incremental Q1 revenue ([assumptions])

**Matt's Proof Point**: [Reference specific past win that matches this initiative - lifecycle → Prosper/Bob's Watches; paid optimization → Bob's Watches; partnerships → Prosper/Affordable Insurance]

**Assumptions to Validate**:
- [ ] [Technical assumption - e.g., "Email list quality >95% deliverability"]
- [ ] [Resource assumption - e.g., "Team has 10 hrs/week for campaign ops"]
- [ ] [Market assumption - e.g., "Customer segment receptive to [channel/offer]"]

**Contingency Plan**:
- If [blocker] → [Alternative approach]
- If [assumption invalid] → [Pivot plan]

---

#### 🎯 INITIATIVE 1.3: Quick Win #2 — [QUICK_WIN_OPPORTUNITY_2 or derive from pain_points]

[Follow same structure as Initiative 1.2, but for second quick win]

---

**Q1 END-STATE METRICS**:

| Metric | Baseline | Q1 Target | % Change |
|--------|----------|-----------|----------|
| [PRIMARY_METRIC - e.g., Revenue/ARR/MRR] | [CURRENT_STATE] | [Q1_TARGET] | +[X]% |
| [SECONDARY_METRIC - e.g., CAC] | [CURRENT_CAC] | [Q1_CAC_TARGET] | -[Y]% |
| [TERTIARY_METRIC - e.g., LTV/Conversion Rate] | [CURRENT_STATE] | [Q1_TARGET] | +[Z]% |
| [INFRASTRUCTURE_METRIC - e.g., Attribution visibility] | 0% (none) | 80% ([dashboard/tool]) | N/A |
| Team Confidence | Unknown | Survey: 7+/10 | N/A |

**Key Assumptions**:
- [Assumption 1 about market conditions]
- [Assumption 2 about team execution capacity]
- [Assumption 3 about budget/tools approval]

---

### Q2: BUILD & PILOT (Months 4-6)

**Objective**: Scale Q1 quick wins, launch 2nd-tier initiatives, build team/infrastructure capacity

**Success Criteria by End of Q2**:
- [Primary metric] growing [X]% YoY
- [Quick win 1] scaled: $[X]K-$[Y]K cumulative impact
- [2nd-tier initiative] pilot launched ($[Z]K+ test revenue)
- [Team expansion if applicable]: [N] new hires integrated

---

#### 🎯 INITIATIVE 2.1: [SECOND-TIER_INITIATIVE from quick_win_opportunities or strategic_positioning_summary]

**Research Evidence**: [Reference pain_points, hiring_priorities, or best_angle]

**What**: [Specific initiative - e.g., "Partnership/affiliate pilot," "Multi-channel expansion," "Product launch support," "B2B sales enablement"]

**Month 4-5 Actions**:
- [Specific steps based on initiative type]

**Month 6 Actions**:
- Measure results ([key metrics])
- Double down on top [N] performers
- Build playbook for [operations/scaling]

**Expected Impact**:
- **Best Case**: $[X]K revenue Q2, $[Y] CAC
- **Base Case**: $[A]K revenue Q2, $[B] CAC
- **Worst Case**: $[C]K revenue Q2, $[D] CAC

**Matt's Proof Point**: [Reference relevant past achievement from profile]

**Assumptions to Validate**:
- [ ] [Assumption 1]
- [ ] [Assumption 2]
- [ ] [Assumption 3]

---

[Continue similar structure for additional Q2 initiatives based on research brief priorities]

---

### Q3-Q4: OPTIMIZE & SCALE (Months 7-12)

**Objective**: Double down on validated winners, systematize operations, establish repeatable playbooks

[Follow similar structure: initiatives, expected outcomes, Matt's proof points, assumptions]

**Year 1 END-STATE METRICS**:

| Metric | Baseline | Q4 Target | % Change |
|--------|----------|-----------|----------|
| [PRIMARY_METRIC] | [CURRENT] | [TARGET] | +[X]% |
| [CAC_METRIC] | [CURRENT] | [TARGET] | -[Y]% |
| [LTV_METRIC] | [CURRENT] | [TARGET] | +[Z]% |
| [EFFICIENCY_METRIC - e.g., LTV:CAC] | [CURRENT] | [TARGET] | +[A]% |
| Team Size | [CURRENT_HEADCOUNT] | [TARGET_HEADCOUNT] | +[B] hires |

---

## SECTION 3: YEAR 2-3 STRATEGIC VISION (Thematic Roadmap)

### Year 2 Theme: "[STRATEGIC_THEME based on vision/strategic_positioning_summary]"

**Conditional on Year 1 Success**: If Q4 [primary metric] hits [target] and [secondary constraint - e.g., CAC] remains [acceptable range], proceed with expansion.

**Strategic Focus**:
- [Focus area 1 based on strategic_positioning_summary or market_summary]
- [Focus area 2]
- [Focus area 3]

**Expected Year 2 Outcomes**:
- Revenue: [Y1_END] → [Y2_TARGET] (+[X]%)
- [Secondary metric]: [Y1_END] → [Y2_TARGET] (+[Y]%)
- Team: [Y1_SIZE] → [Y2_SIZE] (+[Z] hires)

---

### Year 3 Theme: "[STRATEGIC_THEME based on vision field]"

**Conditional on Year 2 Success**: If revenue hits [target] and team scaling succeeded, shift to [market leadership/expansion/new GTM motion].

**Strategic Focus**:
- [Focus area 1 based on vision]
- [Focus area 2]
- [Focus area 3]

**Expected Year 3 Outcomes**:
- Revenue: [Y2_END] → [Y3_TARGET] (+[X]%)
- Market position: [Target position based on competitive_threats analysis]
- [Additional outcome based on mission/vision]

---

## SECTION 4: FINANCIAL PROJECTIONS & SENSITIVITY ANALYSIS

### Year 1 Pro Forma

| Metric | Current | Q2 | Q4 | YoY Change |
|--------|---------|----|----|------------|
| **[PRIMARY_REVENUE_METRIC]** | [CURRENT] | [Q2_TARGET] | [Q4_TARGET] | +[X]% |
| **[QUICK_WIN_REVENUE - e.g., Lifecycle]** | $0 (manual) | [Q2_IMPACT] | [Q4_IMPACT] | N/A |
| **CAC (Blended)** | [CURRENT_CAC] | [Q2_CAC] | [Q4_CAC] | -[Y]% |
| **LTV** | [CURRENT_LTV] | [Q2_LTV] | [Q4_LTV] | +[Z]% |
| **LTV:CAC Ratio** | [CURRENT_RATIO] | [Q2_RATIO] | [Q4_RATIO] | +[A]% |

**Key Assumptions**:
1. [Assumption 1 tied to quick_win_opportunities]
2. [Assumption 2 tied to strategic_positioning_summary]
3. [Assumption 3 tied to market conditions from market_summary]
4. [Assumption 4 tied to competitive landscape from competitive_threats]
5. [Assumption 5 tied to team execution from team_structure]

**Sensitivity Analysis**:

| Scenario | [Primary Metric] Q4 | Assumptions |
|----------|---------------------|-------------|
| **Best Case** | [TARGET] (+[X]%) | All 5 assumptions hold; team executes flawlessly; market conditions favorable |
| **Base Case** | [TARGET] (+[Y]%) | 3-4 assumptions validated; minor execution delays; market stable |
| **Worst Case** | [TARGET] (+[Z]%) | [Primary constraint from risks_or_flags]; GTM fixes have limited impact |

---

## SECTION 5: RISKS & MITIGATION STRATEGIES

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| **[RISK_1 from risks_or_flags]** | [H/M/L] | [H/M/L] | [Specific mitigation based on research context] |
| **[RISK_2 from risks_or_flags]** | [H/M/L] | [H/M/L] | [Specific mitigation] |
| **[RISK_3 from risks_or_flags or derived from pain_points]** | [H/M/L] | [H/M/L] | [Specific mitigation] |
| **Team capability gaps** | [H/M/L based on team_structure] | Medium | Aggressive hiring plan Q1-Q2 ([specific roles]). Upskill existing team via training. |
| **[Initiative X] ROI lower than projected** | Medium | Medium | Start with [pilot approach]; measure lift before full rollout. Contingency: reallocate budget to [alternative]. |
| **[HIRING_MANAGER_NAME] / [parent company or board] impose budget cuts** | [L/M based on funding/stage] | High | Build ROI case early (Q1 quick wins prove value). Propose self-funding model ([revenue source] funds [expense]). |
| **Competitive response ([COMPETITOR from competitive_threats])** | [M/H based on competitive_threats] | [M/H] | Focus on differentiation ([unique strength from icp_summary or products_services]) vs. price competition. Monitor competitor [metric] weekly. |

---

## SECTION 6: SUCCESS SCORECARD & CHECKPOINTS

### 30-Day Checkpoint (End of Month 1)
- [ ] Root cause diagnostic complete and validated with [HIRING_MANAGER_NAME]
- [ ] Executive alignment on Q1-Q4 priorities
- [ ] Quick Win #1 ([initiative name]) launched to [pilot group]
- [ ] [Measurement system] scoped ([tool/dashboard] build plan approved)
- [ ] Team 1-on-1s complete (morale baseline established)

### 90-Day Checkpoint (End of Q1)
- [ ] [Primary metric] [stabilized/growing] ([target])
- [ ] [Quick win 1] live ($[X]-[Y]K incremental revenue)
- [ ] [Measurement infrastructure] live ([channel/cohort/segment]-level visibility)
- [ ] Strategic roadmap validated and updated based on Q1 learnings

### Year 1 Success Criteria
- [ ] [Primary metric]: [TARGET] (+[X]% YoY)
- [ ] CAC reduction: [X]% (blended CAC $[TARGET])
- [ ] LTV increase: [Y]% ($[TARGET] LTV)
- [ ] Team NPS: 8+/10
- [ ] [Strategic outcome from strategic_positioning_summary]: $[X]-[Y]M
- [ ] Repeatable playbooks documented ([initiative 1], [initiative 2], [initiative 3])

---

## SECTION 7: WHY I'M CONFIDENT (Track Record + Pattern Recognition)

### Pattern Recognition: I've Solved This Exact Problem Before

**This challenge ([primary pain_point from research]) is similar to:**

[Select 1-2 most relevant past wins from Matt-Dimock-Professional-Profile.md based on pattern match]:

**At [RELEVANT_COMPANY]** ([REVENUE_GROWTH], [TIMEFRAME]):
- **Problem**: [Similar pain point]
- **Solution**: [Approach used]
- **Result**: [Quantified outcome]
- **Relevance to [COMPANY_NAME]**: [Why this applies - same industry, same bottleneck, same GTM motion, etc.]

**At [RELEVANT_COMPANY_2]** ([REVENUE_GROWTH], [TIMEFRAME]):
- **Problem**: [Similar pain point]
- **Solution**: [Approach used]
- **Result**: [Quantified outcome]
- **Relevance to [COMPANY_NAME]**: [Why this applies]

### This Plan Reflects:
✅ Deep research into [COMPANY_NAME]'s market, competitors ([list competitive_threats]), and internal challenges  
✅ Understanding of your GTM constraints ([list key pain_points])  
✅ Realistic roadmap respecting team size ([HEADCOUNT]) and budget (estimated [budget range])  
✅ Proof of repeatability ($170M in aggregate revenue driven across [N]+ companies)

---

## APPENDICES

### Appendix A: Research Sources
[List all URLs from research_sources field]

### Appendix B: Detailed Initiative Briefs
[3-5 page deep-dives on major initiatives: technical specs, process flows, success metrics]

### Appendix C: Technology Stack Recommendations
[Specific tools with cost-benefit analysis based on pain_points and current infrastructure]

### Appendix D: Organizational Design Proposal
[Team structure evolution based on team_structure field and growth projections]

### Appendix E: Matt Dimock Professional Profile
[Link: Matt-Dimock-Professional-Profile.md]

---

## 📊 SUCCESS METRICS: Annual Plan Quality Scorecard (50 points)

### SCORING CRITERIA:

**1. RESEARCH INTEGRATION (10 points)**
- [ ] Every major recommendation cites research finding (field name or specific insight) (3 pts)
- [ ] Assumptions clearly documented with validation methods (3 pts)
- [ ] Research sources listed in appendix (2 pts)
- [ ] Validates fit with company stage/context (2 pts)

**2. STRATEGIC CLARITY (10 points)**
- [ ] Clear problem diagnosis with evidence chain (3 pts)
- [ ] Hypothesis stated with testable assumptions (2 pts)
- [ ] Multi-year vision articulated (Year 1 detailed, Year 2-3 thematic) (3 pts)
- [ ] Prioritization logic transparent (impact/effort scoring) (2 pts)

**3. FINANCIAL RIGOR (10 points)**
- [ ] Revenue projections with best/base/worst case ranges (3 pts)
- [ ] CAC/LTV analysis with assumptions documented (3 pts)
- [ ] Sensitivity analysis included (2 pts)
- [ ] Budget allocation by initiative (2 pts)

**4. PROOF & CREDIBILITY (8 points)**
- [ ] References Matt's specific past wins (2+ examples matched to context) (3 pts)
- [ ] Uses exact metrics from Matt's profile (2 pts)
- [ ] Acknowledges 5-7 risks with mitigation strategies (3 pts)

**5. EXECUTIVE READINESS (7 points)**
- [ ] Executive summary <1 page, scannable (2 pts)
- [ ] Sections have clear headers and structure (2 pts)
- [ ] Appendices separate detail from overview (2 pts)
- [ ] Financial projections table included (1 pt)

**6. SPECIFICITY & PERSONALIZATION (5 points)**
- [ ] Uses company-specific details (hiring manager name, competitors, exact pain points) (3 pts)
- [ ] Avoids generic language ("drive growth," "best practices") (2 pts)

**TOTAL: /50**

**RATING SCALE**:
- **45-50**: Publish-ready, board-level strategic quality
- **40-44**: Strong plan, needs minor refinement
- **35-39**: Good foundation, needs deeper research integration or financial rigor
- **<35**: Requires major revision (missing research ties, weak financials, or generic recommendations)

---

## 🚫 CONSTRAINTS & GUARDRAILS

**DO:**
✅ Extract ALL company-specific details from research brief (company name, hiring manager, competitors, pain points)  
✅ Lead with 300-400 word problem diagnosis using research evidence  
✅ Include quick wins in Q1 (Month 1) derived from quick_win_opportunities field  
✅ Reference Matt's past wins (2+ examples) matched to this company's context  
✅ Use the company's exact terminology from research (CAC/CPA, ARR/MRR, their metric names)  
✅ Quantify every initiative with best/base/worst case ranges  
✅ Acknowledge 5-7 material risks (from risks_or_flags + inferred risks)  
✅ Document assumptions explicitly with validation methods  
✅ Include financial projections table with baseline → Q2 → Q4 → Y2-Y3  

**DON'T:**
❌ Use placeholder company names (StickerGiant, Beth Smith) - MUST extract from research brief  
❌ Start with solutions before diagnosing problem (must front-load diagnosis)  
❌ Defer all wins to Q2+ (need Month 1 momentum builders from quick_win_opportunities)  
❌ Use generic language ("drive growth," "synergy," "best practices," "passionate")  
❌ Promise outcomes without ranges ("Will deliver $3M") → Use ranges ("$2-4M depending on X, Y, Z")  
❌ Ignore research findings (every recommendation must reference research field)  
❌ Overpromise on timelines (acknowledge validation needs)  
❌ Skip assumption documentation (must state what needs confirmation)  
❌ Reference the wrong company or copy-paste from another plan  

---

## 🔗 CROSS-REFERENCES

- **Depends on**: Research Brief (must have complete research JSON first)
- **Complements**: 
  - `Matt-Dimock-Professional-Profile.md` (for proof points and past wins)
  - `Data-Architecture-Research.md` (for research field definitions)
  - `Job-Hunter-OS-Strategic-Guidelines.md` (for strategic frameworks)
- **Used by**: 
  - `40-Cover-Letter.md` (cover letter references plan highlights)
  - `50-Interview-Prep.md` (interview prep uses plan as discussion framework)
- **Output**: Saved to Airtable `Generated Assets` table via `write_generated_asset` action

---

**VERSION CONTROL**:
- Version: 2.1 (Fully Personalized - No Hardcoded Company Names)
- Last Updated: December 11, 2025
- Change Log: Removed all hardcoded references; added dynamic field extraction from research brief