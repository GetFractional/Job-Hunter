# Asset Generation Template (Common Structure)

## PURPOSE
This template defines the common structure used across all asset-generation prompts (Research, 90-Day Plan, Resume, Cover Letter, Interview Prep, Outreach). Each asset file references this template to reduce redundancy.

---

## UNIVERSAL STRUCTURE

Every asset-generation prompt follows this pattern:

### 1. PURPOSE STATEMENT📌 PURPOSE
[What this asset does and why it exists]
When Used: [Trigger conditions]
Input: [What data is needed]
Output: [What gets generated]
Success Metric: [How to measure quality]

### 2. CORE PRINCIPLES (3-6 principles)
Each principle must include:
- **Definition**: What it is
- **Why It Matters**: Business/psychological reason
- **How To Apply**: Specific tactical guidance
- **Example**: Concrete illustration (good vs bad)
- **Anti-Pattern**: What NOT to do
- **Source**: Where this principle comes from

### 3. TACTICAL RULES
Numbered rules (Rule 1, Rule 2, etc.) with:
- Specific "Do this, not that" guidance
- Formula or structure to follow
- Example of correct application

### 4. TEMPLATE/STRUCTURE
The exact format or outline for the asset, using:
- Markdown code blocks for templates
- Section headers and subsections
- Placeholder variables in [BRACKETS]
- Word count targets where applicable

### 5. SUCCESS METRICS
Checklist format:
- [ ] Criterion 1 (how to measure)
- [ ] Criterion 2 (how to measure)
- [ ] Criterion 3 (how to measure)

### 6. CONSTRAINTS & GUARDRAILS
**DO:**
✅ Specific positive behaviors

**DON'T:**
❌ Specific negative behaviors to avoid

### 7. CROSS-REFERENCES
Depends on: [Which files must be read first]
Complements: [Which files enhance this one]
Used by: [Which workflows trigger this]
Output to: [Where this asset goes]


---

## STANDARD CROSS-REFERENCE STRUCTURE

All asset prompts reference:

**Strategy Layer:**
- `/docs/Job-Hunter-OS-Strategic-Guidelines.md` - Master strategy, frameworks, decision matrices
- `/docs/Matt-Dimock-Professional-Profile.md` - Source of truth for achievements and metrics

**Expert Frameworks:**
- `/prompts/reference/Reference-Hormozi-Value-Equation.md` - Economic value framing
- `/prompts/reference/Reference-Alen-Ascension-Specificity.md` - Specificity and trust-building
- `/prompts/reference/Reference-Rory-Psychologic.md` - Emotional resonance

**Workflow Orchestration:**
- `/prompts/workflow/Workflow-Orchestration-Master.md` - How experts work together

---

## QUALITY RUBRIC FORMAT

All assets use a 50-point scoring system:

| Criterion | Points | How to Score |
|-----------|--------|-------------|
| Specificity | 5 | References company-specific details (not generic) |
| Economics | 5 | Quantifies ROI or business impact |
| Proof | 5 | Includes metrics from Matt's past wins |
| Structure | 5 | Follows prescribed format/template |
| Tone | 5 | Specific + confident + humble (no fluff) |
| [Asset-specific criteria] | 5 each | [Unique to this asset] |

**Scoring:**
- 45-50: Ready to send
- 40-44: Good, minor refinement needed
- <40: Needs significant work

---

## COMMON ANTI-PATTERNS (Apply to All Assets)

❌ **Generic Language**
- "Drive growth", "best practices", "leverage synergies", "passionate about"
- FIX: Use specific company names, metrics, timelines

❌ **Vague Metrics**
- "Significant growth", "substantial improvement", "major impact"
- FIX: Exact numbers, percentages, dollar amounts

❌ **No Proof**
- Claims without evidence from Matt's background
- FIX: Reference specific past achievement with metrics

❌ **Wrong Audience**
- Writing for yourself instead of hiring manager
- FIX: Design thinking - what's their job-to-be-done?

❌ **Template Showing**
- Obvious copy-paste with [BRACKETS] still visible
- FIX: Every asset must be fully customized to THIS company

❌ **Ignoring Research**
- Not referencing company-specific intelligence
- FIX: Must cite insights from Research Brief

---

## TONE & VOICE STANDARDS

**Matt's Brand Voice:**
- Authoritative: "I architected..." not "I helped with..."
- Precise: Exact metrics, no vagueness
- No-nonsense: Lead with business outcome, skip fluff
- Complex made simple: Explain the "why" clearly

**Forbidden Vocabulary:**
- passionate, inspired, excited, great, awesome, hopefully
- drive, leverage (as generic verbs), synergy, best practices

**Required Elements:**
- Specific company details (proves research)
- Quantified outcomes (proves results)
- Timeline context (proves achievability)
- Method explanation (proves repeatability)

---

## INTEGRATION WITH STRATEGIC GUIDELINES

Every asset must apply the thinking stack from Strategic Guidelines:

**Layer 0: Metacognition** - Are we solving the right problem?  
**Layer 1: Systems Thinking** - How does this asset connect to others?  
**Layer 2: Inversion** - What would make this asset fail?  
**Layer 3: MECE** - Is the structure exhaustive and non-overlapping?  
**Layer 4: Design Thinking** - Does it solve the hiring manager's problem?  
**Layer 5: Analytical Frameworks** - Which framework applies here?  
**Layer 6: Expert Tactics** - Which expert's approach is most relevant?

Reference: `/docs/Job-Hunter-OS-Strategic-Guidelines.md` Section 3.

---

## VERSION CONTROL

**Current Version**: 1.0  
**Last Updated**: December 6, 2024  
**Change Log**:
- v1.0: Initial template structure extracted from asset-generation files