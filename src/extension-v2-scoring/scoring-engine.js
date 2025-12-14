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
 * Weights for Job-to-User fit criteria
 * These determine how important each factor is in determining if a job meets user needs
 * Must sum to 1.0
 */
const JOB_TO_USER_WEIGHTS = {
  salary: 0.25,           // How well the salary meets user's floor/target
  workplaceType: 0.25,    // Remote/Hybrid/On-site alignment
  equityBonus: 0.20,      // Whether equity/bonus is present
  companyStage: 0.15,     // Company maturity level
  hiringUrgency: 0.15     // Urgency signals from job posting
};

/**
 * Weights for User-to-Job fit criteria
 * These determine how well the user matches the job's requirements
 * Must sum to 1.0
 */
const USER_TO_JOB_WEIGHTS = {
  roleType: 0.25,         // Title/seniority alignment with target roles
  revOpsComponent: 0.20,  // Percentage of JD about RevOps/infrastructure
  skillMatch: 0.20,       // Keyword overlap with user's core skills
  industryAlignment: 0.15, // Industry match (exact/adjacent/new)
  orgComplexity: 0.20     // Organizational stability assessment
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
 */
function calculateJobFitScore(jobPayload, userProfile) {
  const timestamp = new Date().toISOString();
  const scoreId = `score_${Date.now()}`;

  // Check deal-breakers first - if any match, return 0 immediately
  const dealBreakerResult = checkDealBreakers(jobPayload, userProfile);
  if (dealBreakerResult.triggered) {
    return {
      score_id: scoreId,
      job_id: jobPayload.job_id || `${jobPayload.source}_${Date.now()}`,
      timestamp,
      overall_score: 0,
      overall_label: 'HARD NO',
      deal_breaker_triggered: dealBreakerResult.reason,
      job_to_user_fit: { score: 0, label: 'HARD NO', breakdown: [] },
      user_to_job_fit: { score: 0, label: 'N/A', breakdown: [] },
      interpretation: {
        summary: `This job was automatically rejected: ${dealBreakerResult.reason}`,
        action: 'SKIP - Deal-breaker detected',
        conversation_starters: []
      }
    };
  }

  // Calculate bidirectional scores
  const jobToUserFit = calculateJobToUserFit(jobPayload, userProfile);
  const userToJobFit = calculateUserToJobFit(jobPayload, userProfile);

  // Combine scores (each contributes 50% to overall 0-100 score)
  const overallResult = combineScores(jobToUserFit.score, userToJobFit.score);

  // Generate interpretation
  const interpretation = generateInterpretation(
    jobPayload,
    userProfile,
    jobToUserFit,
    userToJobFit,
    overallResult
  );

  return {
    score_id: scoreId,
    job_id: jobPayload.job_id || `${jobPayload.source}_${Date.now()}`,
    timestamp,
    overall_score: overallResult.score,
    overall_label: overallResult.label,
    job_to_user_fit: jobToUserFit,
    user_to_job_fit: userToJobFit,
    interpretation
  };
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
    scoreCompanyStage(jobPayload, userProfile),
    scoreHiringUrgency(jobPayload, userProfile)
  ];

  // Calculate weighted average
  const weights = [
    JOB_TO_USER_WEIGHTS.salary,
    JOB_TO_USER_WEIGHTS.workplaceType,
    JOB_TO_USER_WEIGHTS.equityBonus,
    JOB_TO_USER_WEIGHTS.companyStage,
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
    scoreRevOpsComponent(jobPayload, userProfile),
    scoreSkillMatch(jobPayload, userProfile),
    scoreIndustryAlignment(jobPayload, userProfile),
    scoreOrgComplexity(jobPayload, userProfile)
  ];

  // Calculate weighted average
  const weights = [
    USER_TO_JOB_WEIGHTS.roleType,
    USER_TO_JOB_WEIGHTS.revOpsComponent,
    USER_TO_JOB_WEIGHTS.skillMatch,
    USER_TO_JOB_WEIGHTS.industryAlignment,
    USER_TO_JOB_WEIGHTS.orgComplexity
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
    const equityRequired = userProfile?.preferences?.bonus_and_equity_preference === 'required';
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
 * @param {Object} jobPayload - Job data with salary_min, salary_max
 * @param {Object} userProfile - User preferences with salary_floor, salary_target
 * @returns {Object} Criterion score result
 */
function scoreSalary(jobPayload, userProfile) {
  const floor = userProfile?.preferences?.salary_floor || 150000;
  const target = userProfile?.preferences?.salary_target || 200000;
  const salaryMin = jobPayload.salaryMin || jobPayload.salary_min;
  const salaryMax = jobPayload.salaryMax || jobPayload.salary_max;

  // Handle missing salary data
  if (salaryMin === null || salaryMin === undefined) {
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

  if (salaryMin >= target) {
    // At or above target - perfect score
    score = 50;
    rationale = `Base $${formatSalary(salaryMin)} exceeds target of $${formatSalary(target)}`;
  } else if (salaryMin >= floor) {
    // Between floor and target - interpolate score from 35 to 50
    const range = target - floor;
    const aboveFloor = salaryMin - floor;
    score = 35 + (aboveFloor / range) * 15;
    rationale = `Base $${formatSalary(salaryMin)} exceeds floor by $${formatSalary(aboveFloor)}; within target range`;
  } else {
    // Below floor - score drops quickly
    const belowFloor = floor - salaryMin;
    const percentBelow = belowFloor / floor;
    score = Math.max(0, 35 * (1 - percentBelow * 2));
    rationale = `Base $${formatSalary(salaryMin)} is $${formatSalary(belowFloor)} below your floor`;
  }

  const displaySalary = salaryMax && salaryMax !== salaryMin
    ? `$${formatSalary(salaryMin)}-$${formatSalary(salaryMax)}`
    : `$${formatSalary(salaryMin)}`;

  return {
    criteria: 'Base Salary',
    criteria_description: `Whether the posted salary meets your $${formatSalary(floor)} minimum and $${formatSalary(target)} target`,
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
  let bonusScore = 0;
  let bonusRationale = '';
  if (bonusMentioned) {
    bonusScore = 50;
    bonusRationale = bonusPercent ? `${Math.round(bonusPercent * 100)}% bonus mentioned` : 'Bonus mentioned';
  } else {
    if (bonusPref === 'required') {
      bonusScore = 0;
      bonusRationale = 'No bonus (required)';
    } else if (bonusPref === 'preferred') {
      bonusScore = 15;
      bonusRationale = 'No bonus mentioned';
    } else {
      bonusScore = 30;
      bonusRationale = 'No bonus (not important to you)';
    }
  }

  // Score equity (0-50 scale for this component)
  let equityScore = 0;
  let equityRationale = '';
  if (equityMentioned) {
    equityScore = 50;
    equityRationale = 'Equity/stock options mentioned';
  } else {
    if (equityPref === 'required') {
      equityScore = 0;
      equityRationale = 'No equity (required)';
    } else if (equityPref === 'preferred') {
      equityScore = 15;
      equityRationale = 'No equity mentioned';
    } else {
      equityScore = 30;
      equityRationale = 'No equity (not important to you)';
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
 * Score company stage/maturity (0-50)
 * Uses headcount as proxy when revenue/funding data unavailable
 * @param {Object} jobPayload - Job data with company_stage, company_headcount, company_revenue
 * @param {Object} userProfile - User preferences with must_haves
 * @returns {Object} Criterion score result
 */
function scoreCompanyStage(jobPayload, userProfile) {
  const stage = jobPayload.company_stage || '';
  const headcount = jobPayload.company_headcount;
  const revenue = jobPayload.company_revenue;
  const mustHaves = userProfile?.preferences?.must_haves || [];
  const requiresSeriesBPlus = mustHaves.includes('series_b_or_later');

  let score = 0;
  let rationale = '';
  let actualValue = 'Unknown';

  // Determine company stage from available data
  if (stage) {
    actualValue = formatCompanyStage(stage);

    // Score based on explicit stage
    if (['late_stage_private', 'public', 'enterprise'].includes(stage)) {
      score = 50;
      rationale = 'Late-stage or enterprise company';
    } else if (['series_c', 'series_d', 'growth'].includes(stage)) {
      score = 45;
      rationale = 'Growth-stage company (Series C+)';
    } else if (stage === 'series_b') {
      score = 40;
      rationale = 'Series B company - meets minimum threshold';
    } else if (stage === 'series_a') {
      score = requiresSeriesBPlus ? 20 : 30;
      rationale = requiresSeriesBPlus
        ? 'Series A - below your Series B+ requirement'
        : 'Series A company';
    } else if (['seed', 'pre_seed', 'pre_revenue'].includes(stage)) {
      score = requiresSeriesBPlus ? 5 : 15;
      rationale = 'Early-stage company - higher risk';
    }
  }
  // Fallback: use headcount as proxy
  else if (headcount !== null && headcount !== undefined) {
    actualValue = `~${headcount} employees`;

    if (headcount >= 500) {
      score = 45;
      rationale = 'Large company (500+ employees) suggests maturity';
    } else if (headcount >= 200) {
      score = 40;
      rationale = 'Mid-size company (200-500) suggests established';
    } else if (headcount >= 50) {
      score = 30;
      rationale = 'Growth company (50-200 employees)';
    } else {
      score = 15;
      rationale = 'Small company (<50 employees) - early stage';
    }
  }
  // Fallback: use revenue
  else if (revenue !== null && revenue !== undefined) {
    if (revenue >= 100000000) {
      actualValue = `$${formatSalary(revenue)} ARR`;
      score = 50;
      rationale = 'High revenue ($100M+) indicates stability';
    } else if (revenue >= 10000000) {
      actualValue = `$${formatSalary(revenue)} ARR`;
      score = 40;
      rationale = 'Solid revenue ($10M+) indicates traction';
    } else {
      actualValue = `$${formatSalary(revenue)} ARR`;
      score = 25;
      rationale = 'Lower revenue - earlier stage';
    }
  }
  // No data available
  else {
    score = 25;
    rationale = 'Company stage unknown; assuming moderate';
    actualValue = 'Not available';
  }

  return {
    criteria: 'Company Maturity',
    criteria_description: 'The company\'s growth stage and stability (startup vs. established enterprise)',
    actual_value: actualValue,
    score: Math.round(score),
    rationale,
    missing_data: !stage && !headcount && !revenue
  };
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
 * Score RevOps component strength (0-50)
 * Measures what % of JD focuses on RevOps/infrastructure vs. brand/content
 * @param {Object} jobPayload - Job data with job_description_text
 * @param {Object} userProfile - User preferences
 * @returns {Object} Criterion score result
 */
function scoreRevOpsComponent(jobPayload, userProfile) {
  const description = (jobPayload.descriptionText || jobPayload.job_description_text || '').toLowerCase();
  const mustHaves = userProfile?.preferences?.must_haves || [];
  const preferRevOps = mustHaves.includes('growth_revops_lifecycle_focus');

  if (!description) {
    return {
      criteria: 'Operations & Systems Focus',
      criteria_description: 'How much of the role involves RevOps, marketing ops, data/CRM systems vs. pure creative/brand work',
      actual_value: 'Cannot assess',
      score: 25,
      rationale: 'No job description available to analyze',
      missing_data: true
    };
  }

  // Count RevOps keyword matches
  const words = description.split(/\s+/);
  const totalWords = words.length;

  let revOpsMatches = 0;
  REVOPS_KEYWORDS.forEach(keyword => {
    // Count occurrences (case-insensitive)
    const regex = new RegExp(keyword.replace(/[-]/g, '[-\\s]?'), 'gi');
    const matches = (description.match(regex) || []).length;
    revOpsMatches += matches;
  });

  // Calculate percentage (normalize by word count)
  const revOpsPercentage = Math.min(100, (revOpsMatches / Math.max(1, totalWords / 20)) * 100);

  let score = 0;
  let rationale = '';
  let actualValue = '';

  if (revOpsPercentage >= 30) {
    score = 50;
    rationale = 'Strong RevOps focus (30%+ of JD)';
    actualValue = 'High (30%+)';
  } else if (revOpsPercentage >= 20) {
    score = 40;
    rationale = 'Good RevOps component (20-30%)';
    actualValue = 'Good (20-30%)';
  } else if (revOpsPercentage >= 10) {
    score = 30;
    rationale = 'Moderate RevOps mentions (10-20%)';
    actualValue = 'Moderate (10-20%)';
  } else if (revOpsPercentage > 0) {
    score = preferRevOps ? 15 : 20;
    rationale = 'Limited RevOps focus (<10%)';
    actualValue = 'Low (<10%)';
  } else {
    score = preferRevOps ? 10 : 15;
    rationale = 'No clear RevOps component detected';
    actualValue = 'None detected';
  }

  return {
    criteria: 'Operations & Systems Focus',
    criteria_description: 'How much of the role involves RevOps, marketing ops, data/CRM systems vs. pure creative/brand work',
    actual_value: actualValue,
    score: Math.round(score),
    rationale
  };
}

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

  let score = 0;
  let rationale = '';

  if (matchCount >= 5 || matchPercentage >= 50) {
    score = 50;
    rationale = `Strong match: ${matchCount} skills overlap (${Math.round(matchPercentage)}%)`;
  } else if (matchCount >= 3 || matchPercentage >= 30) {
    score = 40;
    rationale = `Good match: ${matchCount} skills overlap`;
  } else if (matchCount >= 1) {
    score = 25;
    rationale = `Limited match: only ${matchCount} skill(s) overlap`;
  } else {
    score = 10;
    rationale = 'No clear skill overlap detected';
  }

  return {
    criteria: 'Skills Overlap',
    criteria_description: 'How many of your skills are mentioned in the job description requirements',
    actual_value: matchCount > 0 ? `${matchCount}/${totalSkills} skills (${Math.round(matchPercentage)}%)` : 'No matches',
    score: Math.round(score),
    rationale,
    matched_skills: matchedSkills,
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
