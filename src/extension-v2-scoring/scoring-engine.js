/**
 * Job Hunter OS - Scoring Engine
 *
 * Bidirectional job fit scoring algorithm that calculates:
 * - Job-to-User Fit (0-50): Does this job meet the user's preferences?
 * - User-to-Job Fit (0-50): Does the user match the job's requirements?
 * - Overall Score (0-100): Combined probability of a mutually beneficial match
 *
 * ARCHITECTURE:
 * - All computation is local (no external API calls)
 * - Scoring runs in <500ms
 * - Results include detailed breakdowns for each criterion
 */

// ============================================================================
// CONFIGURATION - Adjust these values to tune the algorithm
// ============================================================================

/**
 * Weights for Job-to-User fit criteria (how well the JOB meets YOUR needs)
 * These determine how important each factor is in determining if a job meets user needs
 * Must sum to 1.0
 *
 * REORGANIZED: Now includes Business Lifecycle and Org Stability
 */
const JOB_TO_USER_WEIGHTS = {
  salary: 0.22,           // How well the salary meets user's floor/target
  workplaceType: 0.18,    // Remote/Hybrid/On-site alignment
  equityBonus: 0.15,      // Whether equity/bonus is present
  benefits: 0.12,         // Benefits package (health, 401k, PTO, etc.)
  // companyStage: 0.10,  // REMOVED - Company maturity level
  businessLifecycle: 0.10, // Company stage (Seed/Startup/Growth/Maturity)
  orgStability: 0.08,     // Headcount growth/decline trends - MOVED from User-to-Job
  hiringUrgency: 0.05     // Urgency signals from job posting
  // Note: Weights now sum to 0.90 (was 1.0) - this is intentional after removing companyStage
};

/**
 * Weights for User-to-Job fit criteria (how well YOU match the JOB requirements)
 * These determine how well the user matches the job's requirements
 * Must sum to 1.0
 */
const USER_TO_JOB_WEIGHTS = {
  roleType: 0.25,         // Title/seniority alignment with target roles
  // revOpsComponent: 0.25,  // REMOVED - Operations & Systems Focus criterion removed per user request
  skillMatch: 0.25,       // Keyword overlap with user's core skills
  industryAlignment: 0.15, // Industry match (exact/adjacent/new)
  experienceLevel: 0.10   // Years of experience alignment - REPLACES orgComplexity
  // Note: Weights now sum to 0.75 (was 1.0) - this is intentional after removing revOpsComponent
};

/**
 * Keywords used to detect RevOps focus in job descriptions
 * Used for calculating revOpsComponent score
 */
const REVOPS_KEYWORDS = [
  'revops', 'revenue operations', 'rev ops',
  'sales operations', 'sales ops', 'salesops',
  'marketing operations', 'marketing ops', 'mops',
  'gtm operations', 'go-to-market operations',
  'crm', 'salesforce', 'hubspot', 'zoho',
  'data infrastructure', 'data pipeline', 'data architecture',
  'automation', 'workflow automation', 'process automation',
  'analytics infrastructure', 'reporting infrastructure',
  'tech stack', 'systems integration', 'api integration',
  'lead scoring', 'attribution', 'funnel optimization'
];

/**
 * Keywords that suggest org complexity/chaos
 */
const ORG_COMPLEXITY_KEYWORDS = [
  'fast-paced', 'rapidly growing', 'hypergrowth',
  'startup', 'early-stage', 'series a', 'pre-series',
  'founder-led', 'scrappy', 'wear many hats',
  'ambiguity', 'undefined', 'build from scratch',
  'newly created role', 'first hire', 'greenfield'
];

/**
 * Keywords that suggest org stability
 */
const ORG_STABILITY_KEYWORDS = [
  'established', 'mature', 'profitable', 'enterprise',
  'fortune 500', 'f500', 'large', 'global',
  'well-defined', 'clear processes', 'documented',
  'cross-functional', 'collaborative', 'structured'
];

/**
 * Score thresholds for overall fit labels
 */
const SCORE_THRESHOLDS = {
  strongFit: 80,    // >= 80: STRONG FIT
  goodFit: 70,      // >= 70: GOOD FIT
  moderateFit: 50,  // >= 50: MODERATE FIT
  weakFit: 30       // >= 30: WEAK FIT, < 30: POOR FIT
};

/**
 * Sub-score thresholds for category labels
 */
const SUB_SCORE_THRESHOLDS = {
  good: 40,         // >= 40: GOOD (out of 50)
  moderate: 25      // >= 25: MODERATE, < 25: WEAK
};

// ============================================================================
// MAIN SCORING FUNCTIONS
// ============================================================================

/**
 * Main entry point: Calculate complete job fit score
 * @param {Object} jobPayload - Extracted job data from content.js
 * @param {Object} userProfile - User preferences from chrome.storage.local
 * @returns {Object} Complete score result with breakdowns and interpretation
 *
 * ARCHITECTURE: Always calculate ALL scores first, THEN apply dealbreaker check.
 * This ensures users see the detailed breakdown even when a dealbreaker is triggered.
 */
function calculateJobFitScore(jobPayload, userProfile) {
  const timestamp = new Date().toISOString();
  const scoreId = `score_${Date.now()}`;

  // STEP 1: Always calculate bidirectional scores FIRST (regardless of dealbreakers)
  const jobToUserFit = calculateJobToUserFit(jobPayload, userProfile);
  const userToJobFit = calculateUserToJobFit(jobPayload, userProfile);

  // STEP 2: Combine scores (each contributes 50% to overall 0-100 score)
  const overallResult = combineScores(jobToUserFit.score, userToJobFit.score);

  // STEP 3: Check deal-breakers AFTER calculating all scores
  const dealBreakerResult = checkDealBreakers(jobPayload, userProfile);

  // STEP 4: Generate interpretation (accounts for dealbreaker status)
  let interpretation;
  if (dealBreakerResult.triggered) {
    // Override interpretation for dealbreaker situations
    interpretation = {
      summary: `Deal-breaker triggered: ${dealBreakerResult.reason}. However, the detailed scoring is shown above for context.`,
      action: 'HARD NO - Deal-breaker detected. Review the breakdown to understand why this role doesn\'t fit.',
      conversation_starters: []
    };
  } else {
    interpretation = generateInterpretation(
      jobPayload,
      userProfile,
      jobToUserFit,
      userToJobFit,
      overallResult
    );
  }

  // Build the result - always include full breakdown
  const result = {
    score_id: scoreId,
    job_id: jobPayload.job_id || `${jobPayload.source}_${Date.now()}`,
    timestamp,
    overall_score: overallResult.score,
    overall_label: dealBreakerResult.triggered ? 'HARD NO' : overallResult.label,
    job_to_user_fit: jobToUserFit,
    user_to_job_fit: userToJobFit,
    interpretation
  };

  // Add dealbreaker info if triggered (but keep all scores visible)
  if (dealBreakerResult.triggered) {
    result.deal_breaker_triggered = dealBreakerResult.reason;
  }

  return result;
}

/**
 * Calculate how well a job meets the user's needs (0-50)
 * @param {Object} jobPayload - Extracted job data
 * @param {Object} userProfile - User preferences
 * @returns {Object} Score, label, and breakdown
 */
function calculateJobToUserFit(jobPayload, userProfile) {
  const criteria = [
    scoreSalary(jobPayload, userProfile),
    scoreWorkplaceType(jobPayload, userProfile),
    scoreEquityBonus(jobPayload, userProfile),
    scoreBenefits(jobPayload, userProfile),
    // scoreCompanyStage - REMOVED per user request
    scoreBusinessLifecycle(jobPayload, userProfile),
    scoreOrgStability(jobPayload, userProfile),
    scoreHiringUrgency(jobPayload, userProfile)
  ];

  // Calculate weighted average
  const weights = [
    JOB_TO_USER_WEIGHTS.salary,
    JOB_TO_USER_WEIGHTS.workplaceType,
    JOB_TO_USER_WEIGHTS.equityBonus,
    JOB_TO_USER_WEIGHTS.benefits,
    // JOB_TO_USER_WEIGHTS.companyStage - REMOVED per user request
    JOB_TO_USER_WEIGHTS.businessLifecycle,
    JOB_TO_USER_WEIGHTS.orgStability,
    JOB_TO_USER_WEIGHTS.hiringUrgency
  ];

  const score = criteria.reduce((sum, c, i) => sum + (c.score * weights[i]), 0);
  const roundedScore = Math.round(score);

  // Determine label based on score
  let label;
  if (roundedScore >= SUB_SCORE_THRESHOLDS.good) {
    label = 'GOOD';
  } else if (roundedScore >= SUB_SCORE_THRESHOLDS.moderate) {
    label = 'MODERATE';
  } else {
    label = 'WEAK';
  }

  // Add weight to each criterion for display
  criteria.forEach((c, i) => {
    c.weight = weights[i];
  });

  return {
    score: roundedScore,
    label,
    breakdown: criteria
  };
}

/**
 * Calculate how well the user matches the job's requirements (0-50)
 * @param {Object} jobPayload - Extracted job data
 * @param {Object} userProfile - User preferences/background
 * @returns {Object} Score, label, and breakdown
 */
function calculateUserToJobFit(jobPayload, userProfile) {
  const criteria = [
    scoreRoleType(jobPayload, userProfile),
    // scoreRevOpsComponent - REMOVED per user request (Operations & Systems Focus)
    scoreSkillMatch(jobPayload, userProfile),
    scoreIndustryAlignment(jobPayload, userProfile),
    scoreExperienceLevel(jobPayload, userProfile)
  ];

  // Calculate weighted average
  const weights = [
    USER_TO_JOB_WEIGHTS.roleType,
    // USER_TO_JOB_WEIGHTS.revOpsComponent - REMOVED per user request
    USER_TO_JOB_WEIGHTS.skillMatch,
    USER_TO_JOB_WEIGHTS.industryAlignment,
    USER_TO_JOB_WEIGHTS.experienceLevel
  ];

  const score = criteria.reduce((sum, c, i) => sum + (c.score * weights[i]), 0);
  const roundedScore = Math.round(score);

  // Determine label based on score
  let label;
  if (roundedScore >= SUB_SCORE_THRESHOLDS.good) {
    label = 'GOOD';
  } else if (roundedScore >= SUB_SCORE_THRESHOLDS.moderate) {
    label = 'MODERATE';
  } else {
    label = 'WEAK';
  }

  // Add weight to each criterion for display
  criteria.forEach((c, i) => {
    c.weight = weights[i];
  });

  return {
    score: roundedScore,
    label,
    breakdown: criteria
  };
}

/**
 * Combine both fit scores into an overall 0-100 score
 * @param {number} jobToUserScore - Score 0-50
 * @param {number} userToJobScore - Score 0-50
 * @returns {Object} Overall score and label
 */
function combineScores(jobToUserScore, userToJobScore) {
  // Each score is 0-50, so combined is 0-100
  const overall = jobToUserScore + userToJobScore;
  const roundedScore = Math.round(overall);

  // Determine label based on thresholds
  let label;
  if (roundedScore >= SCORE_THRESHOLDS.strongFit) {
    label = 'STRONG FIT';
  } else if (roundedScore >= SCORE_THRESHOLDS.goodFit) {
    label = 'GOOD FIT';
  } else if (roundedScore >= SCORE_THRESHOLDS.moderateFit) {
    label = 'MODERATE FIT';
  } else if (roundedScore >= SCORE_THRESHOLDS.weakFit) {
    label = 'WEAK FIT';
  } else {
    label = 'POOR FIT';
  }

  return { score: roundedScore, label };
}

// ============================================================================
// DEAL-BREAKER CHECKS
// ============================================================================

/**
 * Check if any hard deal-breakers are triggered
 * @param {Object} jobPayload - Extracted job data
 * @param {Object} userProfile - User preferences with deal_breakers array
 * @returns {Object} { triggered: boolean, reason: string }
 */
function checkDealBreakers(jobPayload, userProfile) {
  const dealBreakers = userProfile?.preferences?.deal_breakers || [];

  // Check: On-site when user requires remote
  if (dealBreakers.includes('on_site')) {
    const workplaceType = normalizeWorkplaceType(jobPayload.workplaceType || jobPayload.workplace_type);
    if (workplaceType === 'on_site') {
      return { triggered: true, reason: 'Position is on-site only (deal-breaker)' };
    }
  }

  // Check: Salary below floor
  if (dealBreakers.includes('less_than_150k_base')) {
    const salaryMax = jobPayload.salaryMax || jobPayload.salary_max;
    const salaryFloor = userProfile?.preferences?.salary_floor || 150000;
    // Only trigger if salary is explicitly stated AND below floor
    if (salaryMax !== null && salaryMax !== undefined && salaryMax > 0 && salaryMax < salaryFloor) {
      return { triggered: true, reason: `Maximum salary $${formatSalary(salaryMax)} is below your $${formatSalary(salaryFloor)} floor` };
    }
  }

  // Check: No equity when required
  if (dealBreakers.includes('no_equity')) {
    const equityRequired = userProfile?.preferences?.equity_preference === 'required' ||
                           userProfile?.preferences?.bonus_and_equity_preference === 'required';
    const equityMentioned = jobPayload.equityMentioned || jobPayload.equity_mentioned;
    if (equityRequired && equityMentioned === false) {
      return { triggered: true, reason: 'No equity mentioned (you require equity)' };
    }
  }

  // Check: Pre-revenue company
  if (dealBreakers.includes('pre_revenue')) {
    const revenue = jobPayload.company_revenue;
    if (revenue !== undefined && revenue !== null && revenue === 0) {
      return { triggered: true, reason: 'Pre-revenue company (deal-breaker)' };
    }
  }

  // Check: Declining company (negative growth)
  if (dealBreakers.includes('declining_company')) {
    const growthRate = jobPayload.company_growth_rate;
    if (growthRate !== undefined && growthRate !== null && growthRate < 0) {
      return { triggered: true, reason: 'Company is declining (negative growth rate)' };
    }
  }

  return { triggered: false, reason: '' };
}

// ============================================================================
// JOB-TO-USER SCORING CRITERIA
// ============================================================================

/**
 * Score salary alignment (0-50)
 * USES SALARY MAX (Glass Ceiling) for scoring - this represents the budget they can pay
 * @param {Object} jobPayload - Job data with salary_min, salary_max
 * @param {Object} userProfile - User preferences with salary_floor, salary_target
 * @returns {Object} Criterion score result
 */
function scoreSalary(jobPayload, userProfile) {
  const floor = userProfile?.preferences?.salary_floor || 150000;
  const target = userProfile?.preferences?.salary_target || 200000;
  const salaryMin = jobPayload.salaryMin || jobPayload.salary_min;
  const salaryMax = jobPayload.salaryMax || jobPayload.salary_max;

  // KEY: Use salaryMax (upper bound / glass ceiling) for scoring
  // This represents the maximum budget they're willing to pay
  const offeredSalary = salaryMax || salaryMin;

  // Handle missing salary data
  if (offeredSalary === null || offeredSalary === undefined) {
    return {
      criteria: 'Base Salary',
      criteria_description: `Whether the posted salary meets your $${formatSalary(floor)} minimum and $${formatSalary(target)} target`,
      actual_value: 'Not specified',
      score: 25, // Default to middle score when unknown
      rationale: 'Salary not disclosed; assuming moderate alignment',
      missing_data: true
    };
  }

  let score = 0;
  let rationale = '';

  // SCORING LOGIC using max salary (glass ceiling)
  if (offeredSalary >= target) {
    // Meets or exceeds target - perfect score
    score = 50;
    rationale = `Max $${formatSalary(offeredSalary)} meets/exceeds target of $${formatSalary(target)}`;
  } else if (offeredSalary >= (target * 0.95)) {
    // Within 5% of target (e.g., $190k when target is $200k)
    score = 48;
    rationale = `Max $${formatSalary(offeredSalary)} is within 5% of target`;
  } else if (offeredSalary >= (target * 0.90)) {
    // Within 10% of target
    score = 45;
    rationale = `Max $${formatSalary(offeredSalary)} is within 10% of target`;
  } else if (offeredSalary >= floor) {
    // Between floor and 90% of target - interpolate score from 35 to 45
    const range = (target * 0.90) - floor;
    const aboveFloor = offeredSalary - floor;
    const percentage = aboveFloor / range;
    score = 35 + (percentage * 10);
    rationale = `Max $${formatSalary(offeredSalary)} exceeds floor by $${formatSalary(aboveFloor)}; within target range`;
  } else if (offeredSalary >= (floor * 0.9)) {
    // Close to floor (within 10%)
    score = 15;
    rationale = `Max $${formatSalary(offeredSalary)} is close to but below your $${formatSalary(floor)} floor`;
  } else {
    // Significantly below floor
    const belowFloor = floor - offeredSalary;
    score = 5;
    rationale = `Max $${formatSalary(offeredSalary)} is $${formatSalary(belowFloor)} below your floor`;
  }

  // Build display salary string
  const displaySalary = salaryMax && salaryMin && salaryMax !== salaryMin
    ? `$${formatSalary(salaryMin)}-$${formatSalary(salaryMax)}`
    : `$${formatSalary(offeredSalary)}`;

  return {
    criteria: 'Base Salary',
    criteria_description: `Whether the posted max salary meets your $${formatSalary(floor)} minimum and $${formatSalary(target)} target`,
    actual_value: displaySalary,
    score: Math.round(score),
    rationale
  };
}

/**
 * Score workplace type alignment (0-50)
 * @param {Object} jobPayload - Job data with workplace_type
 * @param {Object} userProfile - User preferences with workplace_types_acceptable
 * @returns {Object} Criterion score result
 */
function scoreWorkplaceType(jobPayload, userProfile) {
  const rawWorkplaceType = jobPayload.workplaceType || jobPayload.workplace_type || '';
  const workplaceType = normalizeWorkplaceType(rawWorkplaceType);
  const acceptableTypes = userProfile?.preferences?.workplace_types_acceptable || ['remote'];
  const unacceptableTypes = userProfile?.preferences?.workplace_types_unacceptable || ['on_site'];

  // Handle missing data
  if (!workplaceType) {
    return {
      criteria: 'Work Location',
      criteria_description: 'Whether the job is remote, hybrid, or on-site based on your preferences',
      actual_value: 'Not specified',
      score: 25,
      rationale: 'Workplace type not disclosed; assuming moderate alignment',
      missing_data: true
    };
  }

  let score = 0;
  let rationale = '';

  // Check if it's unacceptable
  if (unacceptableTypes.includes(workplaceType)) {
    score = 0;
    rationale = `${formatWorkplaceType(workplaceType)} is in your unacceptable list`;
  }
  // Check if it's in acceptable types
  else if (acceptableTypes.includes(workplaceType)) {
    // Remote gets higher score than hybrid
    if (workplaceType === 'remote') {
      score = 50;
      rationale = 'Remote position matches your preference';
    } else if (workplaceType === 'hybrid') {
      score = 35;
      rationale = 'Hybrid is acceptable';
    } else {
      score = 25;
      rationale = `${formatWorkplaceType(workplaceType)} is acceptable`;
    }
  }
  // Default: moderate score for unknown types
  else {
    score = 20;
    rationale = `${formatWorkplaceType(workplaceType)} not in your preferred list`;
  }

  return {
    criteria: 'Work Location',
    criteria_description: 'Whether the job is remote, hybrid, or on-site based on your preferences',
    actual_value: formatWorkplaceType(workplaceType),
    score: Math.round(score),
    rationale
  };
}

/**
 * Score bonus and equity presence (0-50)
 * Scores bonus and equity based on user's separate preferences for each
 * @param {Object} jobPayload - Job data with equity_mentioned, bonus_mentioned
 * @param {Object} userProfile - User preferences with bonus_preference and equity_preference
 * @returns {Object} Criterion score result
 */
function scoreEquityBonus(jobPayload, userProfile) {
  const equityMentioned = jobPayload.equityMentioned || jobPayload.equity_mentioned || false;
  const bonusMentioned = jobPayload.bonusMentioned || jobPayload.bonus_mentioned || false;
  const bonusPercent = jobPayload.bonus_estimated_percent;

  // Get separate preferences (with fallback to old combined field for migration)
  const bonusPref = userProfile?.preferences?.bonus_preference ||
    userProfile?.preferences?.bonus_and_equity_preference || 'preferred';
  const equityPref = userProfile?.preferences?.equity_preference ||
    (userProfile?.preferences?.bonus_and_equity_preference === 'required' ? 'preferred' : 'optional');

  // Weight for each component (bonus slightly higher based on user preference patterns)
  const bonusWeight = 0.55;
  const equityWeight = 0.45;

  // Score bonus (0-50 scale for this component)
  // FIX: Score 0 when not mentioned - we can't assume bonus exists if not stated
  let bonusScore = 0;
  let bonusRationale = '';
  if (bonusMentioned) {
    bonusScore = 50;
    bonusRationale = bonusPercent ? `${Math.round(bonusPercent * 100)}% bonus mentioned` : 'Bonus mentioned';
  } else {
    // When not mentioned, score 0 regardless of preference
    // User's preference affects how they FEEL about 0, not the score itself
    bonusScore = 0;
    if (bonusPref === 'required') {
      bonusRationale = 'No bonus mentioned (you require it)';
    } else if (bonusPref === 'preferred') {
      bonusRationale = 'No bonus mentioned (you prefer it)';
    } else {
      bonusRationale = 'No bonus mentioned';
    }
  }

  // Score equity (0-50 scale for this component)
  // FIX: Score 0 when not mentioned - we can't assume equity exists if not stated
  let equityScore = 0;
  let equityRationale = '';
  if (equityMentioned) {
    equityScore = 50;
    equityRationale = 'Equity/stock options mentioned';
  } else {
    // When not mentioned, score 0 regardless of preference
    equityScore = 0;
    if (equityPref === 'required') {
      equityRationale = 'No equity mentioned (you require it)';
    } else if (equityPref === 'preferred') {
      equityRationale = 'No equity mentioned (you prefer it)';
    } else {
      equityRationale = 'No equity mentioned';
    }
  }

  // Combine scores based on weights
  const combinedScore = (bonusScore * bonusWeight) + (equityScore * equityWeight);

  // Build actual value string
  const parts = [];
  if (bonusMentioned) {
    parts.push(bonusPercent ? `${Math.round(bonusPercent * 100)}% bonus` : 'Bonus');
  }
  if (equityMentioned) {
    parts.push('Equity');
  }
  const actualValue = parts.length > 0 ? parts.join(' + ') : 'Neither mentioned';

  // Build combined rationale
  let rationale = '';
  if (bonusMentioned && equityMentioned) {
    rationale = 'Both bonus and equity mentioned - great total comp potential';
  } else if (bonusMentioned) {
    rationale = `Bonus: ${bonusRationale}. Equity: ${equityRationale}`;
  } else if (equityMentioned) {
    rationale = `Equity: ${equityRationale}. Bonus: ${bonusRationale}`;
  } else {
    rationale = `${bonusRationale}. ${equityRationale}`;
  }

  return {
    criteria: 'Bonus & Equity',
    criteria_description: 'Whether the job mentions performance bonuses and/or equity compensation based on your preferences',
    actual_value: actualValue,
    score: Math.round(combinedScore),
    rationale,
    bonus_score: Math.round(bonusScore),
    equity_score: Math.round(equityScore)
  };
}

/**
 * Score benefits package (0-50)
 * Detects mentions of health, 401k, PTO, and other common benefits
 * @param {Object} jobPayload - Job data with job_description_text
 * @param {Object} userProfile - User preferences
 * @returns {Object} Criterion score result
 */
function scoreBenefits(jobPayload, userProfile) {
  const description = (jobPayload.descriptionText || jobPayload.job_description_text || '').toLowerCase();

  // Individual benefits with detection patterns
  // Each benefit has a weight based on importance
  const individualBenefits = {
    medical: {
      patterns: [/medical\s*(insurance|coverage|benefits|plan)/i, /health\s*(insurance|coverage|benefits|plan)/i],
      weight: 12,
      label: 'Medical',
      icon: '🏥'
    },
    dental: {
      patterns: [/dental\s*(insurance|coverage|benefits|plan)/i],
      weight: 8,
      label: 'Dental',
      icon: '🦷'
    },
    vision: {
      patterns: [/vision\s*(insurance|coverage|benefits|plan)/i, /eye\s+care/i],
      weight: 6,
      label: 'Vision',
      icon: '👁️'
    },
    '401k': {
      patterns: [/401\s*\(?\s*k\)?/i, /retirement\s*(plan|match|matching|contribution)/i, /pension/i],
      weight: 12,
      label: '401k',
      icon: '💰'
    },
    hsa_fsa: {
      patterns: [/\bhsa\b/i, /\bfsa\b/i, /health\s+savings/i, /flexible\s+spending/i],
      weight: 6,
      label: 'HSA/FSA',
      icon: '💳'
    },
    pto: {
      patterns: [/\bpto\b/i, /paid\s+time\s+off/i, /unlimited\s+(pto|vacation)/i, /vacation\s+(days?|time|policy)/i, /flexible\s+pto/i],
      weight: 10,
      label: 'PTO',
      icon: '🏖️'
    },
    paid_parental: {
      patterns: [/parental\s+leave/i, /maternity\s+leave/i, /paternity\s+leave/i, /family\s+leave/i, /paid\s+(maternity|paternity)/i],
      weight: 8,
      label: 'Paid Parental',
      icon: '👶'
    },
    tuition: {
      patterns: [/tuition\s+(reimbursement|assistance|support)/i, /education\s+(reimbursement|assistance|benefit)/i],
      weight: 6,
      label: 'Tuition Reimbursement',
      icon: '🎓'
    },
    learning_stipend: {
      patterns: [/learning\s+(stipend|budget|allowance)/i, /professional\s+development/i, /training\s+(budget|stipend)/i, /conference\s+budget/i],
      weight: 6,
      label: 'Learning Stipend',
      icon: '📚'
    },
    wfh_reimbursement: {
      patterns: [/work\s+from\s+home\s+(stipend|reimbursement|budget)/i, /home\s+office\s+(stipend|reimbursement|setup)/i, /remote\s+work\s+(stipend|budget)/i, /equipment\s+allowance/i],
      weight: 6,
      label: 'WFH Reimbursement',
      icon: '🏡'
    },
    relocation: {
      patterns: [/relocation\s+(assistance|package|support|reimbursement)/i, /moving\s+(assistance|reimbursement)/i],
      weight: 8,
      label: 'Relocation',
      icon: '📦'
    }
  };

  // Detect which benefits are mentioned
  const matchedBenefits = [];
  const benefitBadges = [];
  let totalScore = 0;

  for (const [key, config] of Object.entries(individualBenefits)) {
    const hasMatch = config.patterns.some(pattern => pattern.test(description));
    if (hasMatch) {
      matchedBenefits.push(config.label);
      benefitBadges.push({ label: config.label, icon: config.icon });
      totalScore += config.weight;
    }
  }

  // Get user's preferred benefits (if available)
  const preferredBenefits = userProfile?.preferences?.benefits || [];
  const hasPreferences = preferredBenefits.length > 0;

  // If user has preferences, adjust score based on match percentage
  let finalScore = totalScore;
  if (hasPreferences && matchedBenefits.length > 0) {
    // Count how many preferred benefits are matched
    const preferredMatches = matchedBenefits.filter(b =>
      preferredBenefits.some(pref => b.toLowerCase().includes(pref.toLowerCase()))
    ).length;

    // Bonus for matching preferred benefits
    const matchPercentage = (preferredMatches / preferredBenefits.length) * 100;
    if (matchPercentage >= 80) {
      finalScore = Math.min(100, totalScore * 1.2); // 20% bonus
    } else if (matchPercentage >= 50) {
      finalScore = Math.min(100, totalScore * 1.1); // 10% bonus
    }
  }

  // Cap at 100 points (was 50)
  const normalizedScore = Math.min(100, Math.round(finalScore));

  // Build actual value
  let actualValue = 'Not specified';
  if (matchedBenefits.length > 0) {
    actualValue = matchedBenefits.join(', ');
  }

  // Build rationale
  let rationale = '';
  if (matchedBenefits.length >= 8) {
    rationale = `Excellent benefits package: ${matchedBenefits.length}/11 benefits mentioned`;
  } else if (matchedBenefits.length >= 5) {
    rationale = `Comprehensive benefits: ${matchedBenefits.length}/11 benefits mentioned`;
  } else if (matchedBenefits.length >= 3) {
    rationale = `Good benefits: ${matchedBenefits.length}/11 benefits mentioned`;
  } else if (matchedBenefits.length >= 1) {
    rationale = `Limited benefits: ${matchedBenefits.length}/11 benefits mentioned`;
  } else {
    rationale = 'No benefits information provided (common for job listings)';
  }

  return {
    criteria: 'Benefits Package',
    criteria_description: 'Health insurance, 401k, PTO, parental leave, and other benefits',
    actual_value: actualValue,
    score: normalizedScore,
    rationale,
    matched_benefits: matchedBenefits,
    benefit_badges: benefitBadges, // For UI display
    missing_data: matchedBenefits.length === 0
  };
}

/**
 * REMOVED: scoreCompanyStage function - "Company Maturity" criterion removed per user request
 * This criterion has been removed. Business lifecycle scoring is now handled by scoreBusinessLifecycle instead.
 */
// function scoreCompanyStage(jobPayload, userProfile) { ... } REMOVED

/**
 * Score business lifecycle stage (0-50)
 * What stage is the company? (Risk/opportunity profile)
 * @param {Object} jobPayload - Job data with job_description_text, company_headcount
 * @param {Object} userProfile - User preferences
 * @returns {Object} Criterion score result
 */
function scoreBusinessLifecycle(jobPayload, userProfile) {
  const description = (jobPayload.descriptionText || jobPayload.job_description_text || '').toLowerCase();
  const companyName = (jobPayload.companyName || jobPayload.company_name || '').toLowerCase();
  const companySize = jobPayload.company_headcount || jobPayload.companyHeadcount || 0;
  const companyStage = (jobPayload.company_stage || '').toLowerCase();

  // Enhanced detection keywords for each stage
  // IMPROVED: More comprehensive patterns for accurate lifecycle detection
  const seedKeywords = [
    'seed', 'pre-seed', 'pre seed', 'preseed', 'angel', 'angel-backed',
    'bootstrapped', 'self-funded', 'founder-funded', 'pre-revenue',
    'just launched', 'newly launched', 'stealth', 'stealth mode'
  ];

  const startupKeywords = [
    'startup', 'start-up', 'early stage', 'early-stage',
    'series a', 'series-a', 'series seed',
    'founded 2023', 'founded 2024', 'founded 2025', // Recent years
    'emerging company', 'young company', 'small but growing',
    'scrappy', 'nimble', 'agile team', 'small team',
    'first hire', 'founding team', 'early employee',
    'building from scratch', 'greenfield'
  ];

  const growthKeywords = [
    'series b', 'series-b', 'series c', 'series-c',
    'hypergrowth', 'hyper-growth', 'high-growth', 'high growth',
    'scaling', 'scaling rapidly', 'rapid growth', 'fast-growing',
    'growth stage', 'growth-stage', 'growth company',
    'doubling', 'tripling', '100% growth', '200% growth',
    'recently raised', 'just raised', 'backed by',
    'expanding rapidly', 'hiring aggressively'
  ];

  const maturityKeywords = [
    'series d', 'series-d', 'series e', 'series-e', 'series f',
    'late stage', 'late-stage', 'pre-ipo', 'pre ipo',
    'enterprise', 'established', 'mature', 'publicly traded',
    'fortune 500', 'fortune 1000', 'fortune 100', 'f500', 'f100',
    'global leader', 'market leader', 'industry leader',
    'decades of experience', 'over 20 years', 'over 30 years',
    'well-established', 'household name', 'iconic brand',
    'publicly held', 'nyse', 'nasdaq', 'stock symbol'
  ];

  const expansionKeywords = [
    'expanding', 'expansion', 'new markets', 'entering new',
    'international growth', 'global expansion', 'going global',
    'new territory', 'new region', 'opening offices',
    'launching in', 'expanding to', 'international presence',
    'multi-national', 'multinational'
  ];

  const declineKeywords = [
    'restructuring', 'wind down', 'winding down',
    'bankruptcy', 'chapter 11', 'chapter 7',
    'layoffs', 'downsizing', 'reduction in force', 'rif',
    'turnaround', 'turn around', 'pivot required',
    'cost cutting', 'budget cuts', 'financial difficulties'
  ];

  // Priority-based detection (most specific matches first)
  let detectedStage = 'unknown';
  let matchedKeyword = '';

  // Check explicit company stage from LinkedIn data first
  if (companyStage) {
    if (companyStage.includes('seed') || companyStage.includes('pre-')) {
      detectedStage = 'seed';
    } else if (companyStage.includes('series a')) {
      detectedStage = 'startup';
    } else if (companyStage.includes('series b') || companyStage.includes('series c')) {
      detectedStage = 'growth';
    } else if (companyStage.includes('series d') || companyStage.includes('late') || companyStage.includes('public')) {
      detectedStage = 'maturity';
    }
  }

  // Check keywords if not already detected
  if (detectedStage === 'unknown') {
    // Check decline first (important warning sign)
    for (const kw of declineKeywords) {
      if (description.includes(kw)) {
        detectedStage = 'decline';
        matchedKeyword = kw;
        break;
      }
    }
  }

  if (detectedStage === 'unknown') {
    // Check maturity (often larger companies with specific keywords)
    for (const kw of maturityKeywords) {
      if (description.includes(kw) || companyName.includes(kw)) {
        detectedStage = 'maturity';
        matchedKeyword = kw;
        break;
      }
    }
  }

  if (detectedStage === 'unknown') {
    // Check growth (common for scaling companies)
    for (const kw of growthKeywords) {
      if (description.includes(kw)) {
        detectedStage = 'growth';
        matchedKeyword = kw;
        break;
      }
    }
  }

  if (detectedStage === 'unknown') {
    // Check expansion
    for (const kw of expansionKeywords) {
      if (description.includes(kw)) {
        detectedStage = 'expansion';
        matchedKeyword = kw;
        break;
      }
    }
  }

  if (detectedStage === 'unknown') {
    // Check startup
    for (const kw of startupKeywords) {
      if (description.includes(kw)) {
        detectedStage = 'startup';
        matchedKeyword = kw;
        break;
      }
    }
  }

  if (detectedStage === 'unknown') {
    // Check seed
    for (const kw of seedKeywords) {
      if (description.includes(kw)) {
        detectedStage = 'seed';
        matchedKeyword = kw;
        break;
      }
    }
  }

  // Fallback to headcount-based estimation if no keywords matched
  if (detectedStage === 'unknown' && companySize > 0) {
    if (companySize > 1000) {
      detectedStage = 'maturity';
    } else if (companySize > 200) {
      detectedStage = 'growth';
    } else if (companySize > 50) {
      detectedStage = 'startup';
    } else {
      detectedStage = 'seed';
    }
  }

  // User preferences for company stages
  const userPreferredStages = userProfile?.preferences?.preferred_company_stages || ['growth', 'maturity', 'expansion'];

  // Scoring based on stage
  const stageScores = {
    'seed': 15,       // High risk
    'startup': 25,    // Below preference
    'growth': 45,     // Good stage
    'maturity': 50,   // Preferred (stable + growth opportunity)
    'expansion': 45,  // Growth + stability
    'decline': 5,     // Deal breaker risk
    'unknown': 25     // Moderate assumption
  };

  const score = stageScores[detectedStage] || 25;

  // Format display value
  const stageLabels = {
    'seed': 'Seed Stage',
    'startup': 'Early Stage/Startup',
    'growth': 'Growth Stage',
    'maturity': 'Mature/Enterprise',
    'expansion': 'Expansion Phase',
    'decline': 'Decline/Restructuring',
    'unknown': 'Unknown'
  };

  // Build detailed rationale
  let rationale = '';
  if (detectedStage === 'unknown') {
    rationale = 'Company lifecycle stage not determined from available info';
  } else if (matchedKeyword) {
    rationale = `Detected "${matchedKeyword}" indicating ${stageLabels[detectedStage]} phase`;
  } else if (companySize > 0) {
    rationale = `Based on company size (~${companySize} employees): ${stageLabels[detectedStage]}`;
  } else {
    rationale = `Company appears to be in ${stageLabels[detectedStage]} phase`;
  }

  return {
    criteria: 'Business Lifecycle',
    criteria_description: 'Company lifecycle stage (Seed → Startup → Growth → Maturity → Expansion)',
    actual_value: stageLabels[detectedStage] || 'Unknown',
    score: Math.round(score),
    rationale,
    detected_stage: detectedStage,
    matched_keyword: matchedKeyword || null,
    missing_data: detectedStage === 'unknown'
  };
}

/**
 * Score organizational stability (0-50)
 * Based on headcount growth/decline trends
 * @param {Object} jobPayload - Job data with company_headcount_growth
 * @param {Object} userProfile - User preferences
 * @returns {Object} Criterion score result
 */
function scoreOrgStability(jobPayload, userProfile) {
  const description = (jobPayload.descriptionText || jobPayload.job_description_text || '').toLowerCase();
  const headcountGrowthText = jobPayload.companyHeadcountGrowth || jobPayload.company_headcount_growth || '';

  console.log('[Scoring] Org Stability input:', {
    headcountGrowthText,
    headcountGrowthText_type: typeof headcountGrowthText,
    headcountGrowthText_value: JSON.stringify(headcountGrowthText),
    isNull: headcountGrowthText === null,
    isEmpty: headcountGrowthText === '',
    hasJobPayloadKeys: Object.keys(jobPayload).length
  });

  // Parse growth percentage from text like "+5% over last 6 months" or "-3% decline"
  let growthRate = null;
  if (headcountGrowthText && typeof headcountGrowthText === 'string') {
    const growthMatch = headcountGrowthText.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
    if (growthMatch) {
      growthRate = parseFloat(growthMatch[1]);
      console.log('[Scoring] ✓ Parsed growth rate from text:', growthRate, '%');
    } else {
      console.log('[Scoring] ⚠ Growth text provided but no percentage found:', headcountGrowthText);
    }
  } else {
    console.log('[Scoring] ℹ️ No headcount growth text available (null/empty/invalid)');
  }

  // Also check description for signals
  const growthKeywords = ['growing', 'expanding team', 'scaling', 'hiring', 'new positions'];
  const declineKeywords = ['layoffs', 'restructuring', 'downsizing', 'headcount reduction', 'cost cutting'];

  const hasGrowthSignals = growthKeywords.some(kw => description.includes(kw));
  const hasDeclineSignals = declineKeywords.some(kw => description.includes(kw));

  let score = 35; // Default moderate
  let rationale = 'Organizational stability unclear';
  let actualValue = 'Unknown';

  // Score based on growth rate if available
  if (growthRate !== null) {
    // More nuanced scoring based on 2-year company-wide growth
    if (growthRate >= 15) {
      score = 50;
      rationale = `Hyper-growth company (+${growthRate}% over 2 years)`;
      actualValue = `+${growthRate}% growth`;
    } else if (growthRate >= 10) {
      score = 45;
      rationale = `Strong growth company (+${growthRate}% over 2 years)`;
      actualValue = `+${growthRate}% growth`;
    } else if (growthRate >= 5) {
      score = 40;
      rationale = `Healthy growth (+${growthRate}% over 2 years)`;
      actualValue = `+${growthRate}% growth`;
    } else if (growthRate >= 2) {
      score = 35;
      rationale = `Moderate growth (+${growthRate}% over 2 years)`;
      actualValue = `+${growthRate}% growth`;
    } else if (growthRate >= 0) {
      score = 30;
      rationale = `Minimal growth (+${growthRate}% over 2 years)`;
      actualValue = `+${growthRate}% growth`;
    } else if (growthRate >= -2) {
      score = 20;
      rationale = `Stagnant/slight decline (${growthRate}% over 2 years)`;
      actualValue = `${growthRate}% change`;
    } else if (growthRate >= -5) {
      score = 10;
      rationale = `Concerning decline (${growthRate}% over 2 years)`;
      actualValue = `${growthRate}% decline`;
    } else {
      score = 5;
      rationale = `Significant decline (${growthRate}% over 2 years) - layoff risk`;
      actualValue = `${growthRate}% decline`;
    }
  }
  // Use description signals if no explicit data
  else if (hasDeclineSignals) {
    score = 15;
    rationale = 'Signs of restructuring or layoffs detected';
    actualValue = 'Concerning';
  } else if (hasGrowthSignals) {
    score = 40;
    rationale = 'Company appears to be growing/hiring';
    actualValue = 'Growing';
  }

  const result = {
    criteria: 'Org Stability',
    criteria_description: 'Company headcount growth/decline trends (growing = more stable)',
    actual_value: actualValue,
    score: Math.round(score),
    rationale,
    growth_rate: growthRate,
    missing_data: growthRate === null && !hasGrowthSignals && !hasDeclineSignals
  };

  console.log('[Scoring] Org Stability result:', {
    growthRate,
    score: result.score,
    rationale,
    actualValue
  });

  return result;
}

/**
 * Score hiring urgency signals (0-50)
 * Higher urgency = better opportunity (company is motivated)
 * @param {Object} jobPayload - Job data with hiring_urgency, inflection_point
 * @param {Object} userProfile - User preferences
 * @returns {Object} Criterion score result
 */
function scoreHiringUrgency(jobPayload, userProfile) {
  const urgency = jobPayload.hiring_urgency || '';
  const inflectionPoint = jobPayload.inflection_point || '';
  const description = (jobPayload.descriptionText || jobPayload.job_description_text || '').toLowerCase();

  let score = 25; // Default to moderate
  let rationale = 'Standard hiring process assumed';
  let actualValue = 'Normal';

  // Check explicit urgency signals
  if (urgency === 'high' || urgency === 'urgent') {
    score = 50;
    rationale = inflectionPoint || 'High urgency indicated';
    actualValue = 'High';
  } else if (urgency === 'moderate') {
    score = 35;
    rationale = 'Moderate urgency';
    actualValue = 'Moderate';
  } else if (urgency === 'low' || urgency === 'exploratory') {
    score = 15;
    rationale = 'Exploratory hire - lower priority';
    actualValue = 'Low';
  }
  // Check description for urgency signals
  else {
    const urgencyKeywords = [
      'immediately', 'urgent', 'asap', 'right away',
      'fast-growing', 'rapid growth', 'scaling quickly',
      'new role', 'newly created', 'just opened',
      'backfill', 'immediate start', 'start date asap'
    ];

    const hasUrgency = urgencyKeywords.some(kw => description.includes(kw));

    if (hasUrgency) {
      score = 40;
      rationale = 'Urgency signals detected in job description';
      actualValue = 'Elevated';
    }
  }

  return {
    criteria: 'Hiring Urgency',
    criteria_description: 'How motivated the company appears to fill this role quickly (higher urgency = better chance)',
    actual_value: actualValue,
    score: Math.round(score),
    rationale,
    missing_data: !urgency && !inflectionPoint
  };
}

// ============================================================================
// USER-TO-JOB SCORING CRITERIA
// ============================================================================

/**
 * Score role type/title alignment (0-50)
 * @param {Object} jobPayload - Job data with job_title
 * @param {Object} userProfile - User preferences with target_roles
 * @returns {Object} Criterion score result
 */
function scoreRoleType(jobPayload, userProfile) {
  const jobTitle = (jobPayload.jobTitle || jobPayload.job_title || '').toLowerCase();
  const targetRoles = userProfile?.background?.target_roles || [];

  let score = 25;
  let rationale = 'Role type assessment needed';

  // VP/C-level keywords (highest value)
  const vpKeywords = ['vp', 'vice president', 'cro', 'cmo', 'cgo', 'chief'];
  const headKeywords = ['head of', 'head,'];
  const directorKeywords = ['director', 'senior director'];
  const managerKeywords = ['manager', 'lead'];

  // Check title seniority
  const isVpLevel = vpKeywords.some(kw => jobTitle.includes(kw));
  const isHeadLevel = headKeywords.some(kw => jobTitle.includes(kw));
  const isDirectorLevel = directorKeywords.some(kw => jobTitle.includes(kw));
  const isManagerLevel = managerKeywords.some(kw => jobTitle.includes(kw)) && !isDirectorLevel;

  // Check if it matches any target roles
  const matchesTargetRole = targetRoles.some(role => {
    const normalizedRole = role.toLowerCase().replace(/[_-]/g, ' ');
    return jobTitle.includes(normalizedRole) || normalizedRole.includes(jobTitle.split(' ')[0]);
  });

  // Score based on seniority and match
  if (isVpLevel || jobTitle.includes('chief growth') || jobTitle.includes('chief revenue')) {
    score = 50;
    rationale = 'VP/C-level role aligns with your target seniority';
  } else if (isHeadLevel) {
    score = 45;
    rationale = 'Head-level role is strong match';
  } else if (isDirectorLevel) {
    if (jobTitle.includes('senior')) {
      score = 40;
      rationale = 'Senior Director role - strong match for your experience';
    } else {
      score = 35;
      rationale = 'Director role - may be lateral or slight step down';
    }
  } else if (isManagerLevel) {
    score = 20;
    rationale = 'Manager-level may be below your target seniority';
  } else if (matchesTargetRole) {
    score = 35;
    rationale = 'Role matches one of your target positions';
  }

  // Check for growth/revops focus
  const growthKeywords = ['growth', 'revenue', 'revops', 'gtm', 'go-to-market'];
  const hasGrowthFocus = growthKeywords.some(kw => jobTitle.includes(kw));
  if (hasGrowthFocus && score < 50) {
    score = Math.min(50, score + 5);
    rationale += '; growth/revenue focus is a plus';
  }

  return {
    criteria: 'Title & Seniority Match',
    criteria_description: 'How well the job title and level align with your target roles (VP, Director, Head of, etc.)',
    actual_value: jobPayload.jobTitle || jobPayload.job_title || 'Unknown',
    score: Math.round(score),
    rationale
  };
}

/**
 * REMOVED: scoreRevOpsComponent function - "Operations & Systems Focus" criterion removed per user request
 * This criterion has been removed as it's no longer needed for scoring.
 */
// function scoreRevOpsComponent(jobPayload, userProfile) { ... } REMOVED

/**
 * Score skill match (0-50)
 * Counts overlap between user's core skills and JD requirements
 * @param {Object} jobPayload - Job data with job_description_text, role_requirements
 * @param {Object} userProfile - User background with core_skills
 * @returns {Object} Criterion score result
 */
function scoreSkillMatch(jobPayload, userProfile) {
  const description = (jobPayload.descriptionText || jobPayload.job_description_text || '').toLowerCase();
  const roleRequirements = jobPayload.researchBrief?.role_requirements || [];
  const userSkills = userProfile?.background?.core_skills || [];

  if (userSkills.length === 0) {
    return {
      criteria: 'Skills Overlap',
      criteria_description: 'How many of your skills are mentioned in the job description requirements',
      actual_value: 'No skills defined',
      score: 25,
      rationale: 'Please configure your core skills in profile',
      missing_data: true
    };
  }

  // Normalize user skills for matching
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase().replace(/[_-]/g, ' '));

  // Check matches in description
  let matchedSkills = [];
  normalizedUserSkills.forEach(skill => {
    // Create variations of the skill for matching
    const variations = [skill, skill.replace(/\s+/g, ''), skill.replace(/\s+/g, '-')];
    const hasMatch = variations.some(v => description.includes(v));
    if (hasMatch) {
      matchedSkills.push(skill);
    }
  });

  // Also check role requirements if available
  if (roleRequirements.length > 0) {
    const reqText = roleRequirements.join(' ').toLowerCase();
    normalizedUserSkills.forEach(skill => {
      if (!matchedSkills.includes(skill) && reqText.includes(skill)) {
        matchedSkills.push(skill);
      }
    });
  }

  // Calculate score based on match count
  const matchCount = matchedSkills.length;
  const totalSkills = normalizedUserSkills.length;
  const matchPercentage = (matchCount / totalSkills) * 100;

  // Proportional scoring: score = (matchPercentage / 100) * 50
  // This makes it truly proportional: 50% match = 25 points, 100% match = 50 points
  let score = (matchPercentage / 100) * 50;
  let rationale = '';

  if (matchPercentage >= 80) {
    rationale = `Excellent match: ${matchCount}/${totalSkills} skills (${Math.round(matchPercentage)}%)`;
  } else if (matchPercentage >= 60) {
    rationale = `Strong match: ${matchCount}/${totalSkills} skills (${Math.round(matchPercentage)}%)`;
  } else if (matchPercentage >= 40) {
    rationale = `Good match: ${matchCount}/${totalSkills} skills (${Math.round(matchPercentage)}%)`;
  } else if (matchPercentage >= 20) {
    rationale = `Moderate match: ${matchCount}/${totalSkills} skills (${Math.round(matchPercentage)}%)`;
  } else if (matchCount >= 1) {
    rationale = `Limited match: ${matchCount}/${totalSkills} skills (${Math.round(matchPercentage)}%)`;
  } else {
    score = 0; // No match = 0 points
    rationale = 'No skill overlap detected';
  }

  // Calculate unmatched skills (user's skills not found in the job)
  const unmatchedSkills = normalizedUserSkills.filter(skill => !matchedSkills.includes(skill));

  return {
    criteria: 'Skills Overlap',
    criteria_description: 'How many of your skills are mentioned in the job description requirements',
    actual_value: matchCount > 0 ? `${matchCount}/${totalSkills} skills (${Math.round(matchPercentage)}%)` : 'No matches',
    score: Math.round(score),
    rationale,
    matched_skills: matchedSkills,
    unmatched_skills: unmatchedSkills,
    match_percentage: Math.round(matchPercentage)
  };
}

/**
 * Score industry alignment (0-50)
 * @param {Object} jobPayload - Job data with company_name, job_description_text
 * @param {Object} userProfile - User background with industries
 * @returns {Object} Criterion score result
 */
function scoreIndustryAlignment(jobPayload, userProfile) {
  const description = (jobPayload.descriptionText || jobPayload.job_description_text || '').toLowerCase();
  const companyName = (jobPayload.companyName || jobPayload.company_name || '').toLowerCase();
  const userIndustries = userProfile?.background?.industries || [];

  if (userIndustries.length === 0) {
    return {
      criteria: 'Industry Experience',
      criteria_description: 'Whether the company\'s industry matches your background (exact match, adjacent, or new vertical)',
      actual_value: 'No industries defined',
      score: 25,
      rationale: 'Please configure your industry experience in profile',
      missing_data: true
    };
  }

  // Industry keyword mapping for detection
  const industryKeywords = {
    'telecom': ['telecom', 'telecommunications', 'wireless', 'mobile network', '5g', 'carrier'],
    'insurance': ['insurance', 'insurtech', 'underwriting', 'claims', 'policy'],
    'consumer_electronics': ['consumer electronics', 'hardware', 'devices', 'gadgets', 'electronics'],
    'saas': ['saas', 'software as a service', 'b2b software', 'enterprise software', 'cloud software'],
    'd2c_ecommerce': ['d2c', 'dtc', 'ecommerce', 'e-commerce', 'retail', 'consumer goods', 'cpg'],
    'fintech': ['fintech', 'financial technology', 'payments', 'banking', 'lending'],
    'healthtech': ['healthtech', 'healthcare', 'health tech', 'medical', 'wellness'],
    'edtech': ['edtech', 'education', 'learning', 'training'],
    'martech': ['martech', 'marketing technology', 'adtech', 'advertising']
  };

  // Detect industry from description
  let detectedIndustry = 'Unknown';
  let isExactMatch = false;
  let isAdjacentMatch = false;

  // Check each user industry
  for (const userIndustry of userIndustries) {
    const normalizedIndustry = userIndustry.toLowerCase().replace(/[_-]/g, ' ');
    const keywords = industryKeywords[userIndustry] || [normalizedIndustry];

    for (const keyword of keywords) {
      if (description.includes(keyword) || companyName.includes(keyword)) {
        detectedIndustry = normalizedIndustry;
        isExactMatch = true;
        break;
      }
    }
    if (isExactMatch) break;
  }

  // Check for adjacent industries if no exact match
  if (!isExactMatch) {
    const adjacentPairs = [
      ['saas', 'b2b software', 'enterprise'],
      ['d2c_ecommerce', 'retail', 'cpg'],
      ['fintech', 'insurance', 'banking'],
      ['healthtech', 'wellness', 'medical']
    ];

    for (const pair of adjacentPairs) {
      const userHasInPair = userIndustries.some(ui => pair.includes(ui.toLowerCase()));
      const descHasInPair = pair.some(p => description.includes(p));

      if (userHasInPair && descHasInPair) {
        isAdjacentMatch = true;
        detectedIndustry = 'Adjacent industry';
        break;
      }
    }
  }

  let score = 0;
  let rationale = '';

  if (isExactMatch) {
    score = 50;
    rationale = `Exact industry match: ${detectedIndustry}`;
  } else if (isAdjacentMatch) {
    score = 35;
    rationale = 'Adjacent industry - transferable experience applies';
  } else {
    score = 20;
    rationale = 'Different industry - may require adaptation';
    detectedIndustry = 'New vertical';
  }

  return {
    criteria: 'Industry Experience',
    criteria_description: 'Whether the company\'s industry matches your background (exact match, adjacent, or new vertical)',
    actual_value: detectedIndustry.charAt(0).toUpperCase() + detectedIndustry.slice(1),
    score: Math.round(score),
    rationale
  };
}

/**
 * Score organizational complexity (0-50)
 * Lower complexity = higher score (stable orgs preferred)
 * @param {Object} jobPayload - Job data with job_description_text, hiring_urgency
 * @param {Object} userProfile - User preferences
 * @returns {Object} Criterion score result
 */
function scoreOrgComplexity(jobPayload, userProfile) {
  const description = (jobPayload.descriptionText || jobPayload.job_description_text || '').toLowerCase();
  const inflectionPoint = jobPayload.inflection_point || '';
  const hiringUrgency = jobPayload.hiring_urgency || '';

  // Count complexity vs stability signals
  let complexitySignals = 0;
  let stabilitySignals = 0;

  ORG_COMPLEXITY_KEYWORDS.forEach(kw => {
    if (description.includes(kw)) complexitySignals++;
  });

  ORG_STABILITY_KEYWORDS.forEach(kw => {
    if (description.includes(kw)) stabilitySignals++;
  });

  // Check for recent leadership changes (from research brief)
  if (inflectionPoint && /new (cro|cmo|ceo|coo|cfo)/i.test(inflectionPoint)) {
    complexitySignals += 2;
  }

  let score = 25; // Default moderate
  let rationale = '';
  let actualValue = 'Moderate';

  // Calculate based on signal balance
  const netStability = stabilitySignals - complexitySignals;

  if (netStability >= 3) {
    score = 50;
    rationale = 'Strong stability signals; clear organizational structure';
    actualValue = 'Stable';
  } else if (netStability >= 1) {
    score = 40;
    rationale = 'Generally stable org with some growth dynamics';
    actualValue = 'Mostly stable';
  } else if (netStability >= -1) {
    score = 30;
    rationale = 'Mixed signals - moderate organizational complexity';
    actualValue = 'Mixed';
  } else if (netStability >= -3) {
    score = 20;
    rationale = 'Elevated complexity - rapid growth or transition phase';
    actualValue = 'Complex';
  } else {
    score = 10;
    rationale = 'High complexity signals - possible chaos or undefined structure';
    actualValue = 'High complexity';
  }

  return {
    criteria: 'Organizational Stability',
    criteria_description: 'How stable/structured the organization appears vs. chaotic/undefined (stable = higher score)',
    actual_value: actualValue,
    score: Math.round(score),
    rationale
  };
}

/**
 * Score experience level alignment (0-50)
 * How well the user's experience matches the job's requirements
 * @param {Object} jobPayload - Job data with job_description_text
 * @param {Object} userProfile - User background with years_of_experience
 * @returns {Object} Criterion score result
 */
function scoreExperienceLevel(jobPayload, userProfile) {
  const description = (jobPayload.descriptionText || jobPayload.job_description_text || '').toLowerCase();
  const userExperience = userProfile?.background?.years_of_experience || 15; // Default to 15 for experienced professionals

  // Extract required years from job description
  const experiencePatterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/gi,
    /experience\s*:\s*(\d+)\+?\s*years?/gi,
    /minimum\s+(\d+)\s*years?/gi,
    /at\s+least\s+(\d+)\s*years?/gi
  ];

  let requiredYears = null;
  for (const pattern of experiencePatterns) {
    const match = description.match(pattern);
    if (match) {
      // Extract the number from the match
      const numMatch = match[0].match(/(\d+)/);
      if (numMatch) {
        const years = parseInt(numMatch[1]);
        if (requiredYears === null || years > requiredYears) {
          requiredYears = years;
        }
      }
    }
  }

  // Detect seniority signals
  const seniorSignals = ['senior', 'principal', 'lead', 'head of', 'director', 'vp', 'vice president'];
  const juniorSignals = ['junior', 'entry level', 'entry-level', 'associate', 'trainee'];

  const hasSeniorSignals = seniorSignals.some(s => description.includes(s));
  const hasJuniorSignals = juniorSignals.some(s => description.includes(s));

  let score = 30; // Default moderate
  let rationale = 'Experience alignment unclear';
  let actualValue = 'Unknown';

  if (requiredYears !== null) {
    actualValue = `${requiredYears}+ years required`;

    if (userExperience >= requiredYears + 5) {
      // Overqualified but good
      score = 45;
      rationale = `You exceed requirements (${userExperience} years vs ${requiredYears}+ required)`;
    } else if (userExperience >= requiredYears) {
      // Perfect match
      score = 50;
      rationale = `Experience matches requirements (${userExperience} years vs ${requiredYears}+ required)`;
    } else if (userExperience >= requiredYears - 2) {
      // Close to requirements
      score = 35;
      rationale = `Slightly below requirements (${userExperience} vs ${requiredYears}+ years)`;
    } else {
      // Underqualified
      score = 15;
      rationale = `Below experience requirements (${userExperience} vs ${requiredYears}+ years)`;
    }
  } else if (hasSeniorSignals && !hasJuniorSignals) {
    // Senior role detected
    if (userExperience >= 10) {
      score = 45;
      actualValue = 'Senior-level role';
      rationale = 'Senior role matches your experience level';
    } else {
      score = 25;
      actualValue = 'Senior-level role';
      rationale = 'Senior role may require more experience';
    }
  } else if (hasJuniorSignals && !hasSeniorSignals) {
    // Junior role - probably not a good fit for experienced professional
    score = 15;
    actualValue = 'Entry/Junior-level role';
    rationale = 'Role may be below your experience level';
  } else {
    // Default for mid-level or unclear
    score = 35;
    actualValue = 'Mid-level or unclear';
    rationale = 'Experience level not clearly specified';
  }

  return {
    criteria: 'Experience Level',
    criteria_description: 'How well your years of experience match the job requirements',
    actual_value: actualValue,
    score: Math.round(score),
    rationale,
    required_years: requiredYears,
    user_years: userExperience,
    missing_data: requiredYears === null && !hasSeniorSignals && !hasJuniorSignals
  };
}

// ============================================================================
// INTERPRETATION GENERATOR
// ============================================================================

/**
 * Generate human-readable interpretation of scores
 * @param {Object} jobPayload - Original job data
 * @param {Object} userProfile - User preferences
 * @param {Object} jobToUserFit - Job-to-user fit result
 * @param {Object} userToJobFit - User-to-job fit result
 * @param {Object} overallResult - Combined score result
 * @returns {Object} Interpretation with summary, action, and conversation starters
 */
function generateInterpretation(jobPayload, userProfile, jobToUserFit, userToJobFit, overallResult) {
  const summary = [];
  const risks = [];
  const conversationStarters = [];

  // Analyze strengths from breakdowns
  const strengths = [];
  const concerns = [];

  // Check job-to-user breakdown for highlights
  jobToUserFit.breakdown.forEach(item => {
    if (item.score >= 45) {
      strengths.push(item.criteria.split('(')[0].trim());
    } else if (item.score <= 20) {
      concerns.push(item.criteria.split('(')[0].trim());
    }
  });

  // Check user-to-job breakdown
  userToJobFit.breakdown.forEach(item => {
    if (item.score >= 45) {
      strengths.push(item.criteria);
    } else if (item.score <= 20) {
      concerns.push(item.criteria);
      risks.push(item.rationale);
    }
  });

  // Build summary
  if (strengths.length > 0) {
    summary.push(`Strong alignment on: ${strengths.slice(0, 3).join(', ')}.`);
  }
  if (concerns.length > 0) {
    summary.push(`Areas of concern: ${concerns.slice(0, 2).join(', ')}.`);
  }

  // Generate action recommendation
  let action = '';
  if (overallResult.score >= SCORE_THRESHOLDS.strongFit) {
    action = 'PURSUE - Strong match, prioritize this application';
    conversationStarters.push('What does success look like in the first 90 days?');
    conversationStarters.push('What are the biggest challenges the team is facing right now?');
  } else if (overallResult.score >= SCORE_THRESHOLDS.goodFit) {
    action = 'PURSUE - Good match, worth applying with tailored materials';
    conversationStarters.push('Can you tell me more about the team structure?');
    conversationStarters.push('What are the key metrics this role will be responsible for?');
  } else if (overallResult.score >= SCORE_THRESHOLDS.moderateFit) {
    action = 'CONSIDER - Moderate match, research further before applying';
    conversationStarters.push('What skills are most critical for success in this role?');
    conversationStarters.push("How does this role fit into the company's growth plans?");
  } else if (overallResult.score >= SCORE_THRESHOLDS.weakFit) {
    action = 'LOW PRIORITY - Weak match, only pursue if other criteria are compelling';
  } else {
    action = 'SKIP - Poor fit, focus on better-aligned opportunities';
  }

  // Add role-specific questions
  if (concerns.includes('Role Type vs. Target Roles')) {
    conversationStarters.push('What is the growth path for this role?');
  }
  if (concerns.includes('Org Complexity')) {
    conversationStarters.push('How is the reporting structure organized?');
    conversationStarters.push('What recent changes has the team gone through?');
  }

  return {
    summary: summary.join(' ') || 'Analysis complete.',
    action,
    conversation_starters: conversationStarters.slice(0, 3)
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format salary number for display (e.g., 150000 -> "150K")
 * @param {number} salary - Salary amount
 * @returns {string} Formatted salary string
 */
function formatSalary(salary) {
  if (salary >= 1000000) {
    return (salary / 1000000).toFixed(1) + 'M';
  }
  if (salary >= 1000) {
    return Math.round(salary / 1000) + 'K';
  }
  return salary.toString();
}

/**
 * Normalize workplace type to consistent format
 * @param {string} workplaceType - Raw workplace type string
 * @returns {string} Normalized type
 */
function normalizeWorkplaceType(workplaceType) {
  const type = (workplaceType || '').toLowerCase().trim();

  if (type.includes('remote')) return 'remote';
  if (type.includes('hybrid')) return 'hybrid';
  if (type.includes('on-site') || type.includes('onsite') || type.includes('on site')) return 'on_site';

  return type;
}

/**
 * Format workplace type for display
 * @param {string} type - Normalized workplace type
 * @returns {string} Human-readable format
 */
function formatWorkplaceType(type) {
  const formats = {
    'remote': 'Remote',
    'hybrid': 'Hybrid',
    'on_site': 'On-site'
  };
  return formats[type] || type;
}

/**
 * Format company stage for display
 * @param {string} stage - Raw stage string
 * @returns {string} Formatted stage
 */
function formatCompanyStage(stage) {
  const formats = {
    'late_stage_private': 'Late-stage Private',
    'public': 'Public Company',
    'enterprise': 'Enterprise',
    'series_d': 'Series D',
    'series_c': 'Series C',
    'series_b': 'Series B',
    'series_a': 'Series A',
    'seed': 'Seed Stage',
    'pre_seed': 'Pre-Seed',
    'pre_revenue': 'Pre-Revenue',
    'growth': 'Growth Stage'
  };
  return formats[stage] || stage;
}

// ============================================================================
// EXPORTS (for use in background.js)
// ============================================================================

// Export functions for use in other scripts
// In Chrome extension context, these are accessed via the global scope
if (typeof window !== 'undefined') {
  window.JobHunterScoring = {
    calculateJobFitScore,
    calculateJobToUserFit,
    calculateUserToJobFit,
    combineScores,
    checkDealBreakers,
    // Configuration exports for customization
    JOB_TO_USER_WEIGHTS,
    USER_TO_JOB_WEIGHTS,
    SCORE_THRESHOLDS,
    SUB_SCORE_THRESHOLDS
  };
}

// For module environments (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateJobFitScore,
    calculateJobToUserFit,
    calculateUserToJobFit,
    combineScores,
    checkDealBreakers,
    JOB_TO_USER_WEIGHTS,
    USER_TO_JOB_WEIGHTS,
    SCORE_THRESHOLDS,
    SUB_SCORE_THRESHOLDS
  };
}
