/**
 * Job Filter - Special Requirements Detector
 *
 * Detects special application requirements and job conditions that are
 * important for job seekers to know upfront:
 * - Email submission requirements (e.g., "Send resume to careers@company.com")
 * - Video/recording requirements (e.g., "Include a video introduction")
 * - Travel requirements (e.g., "25% travel required")
 * - Office/hybrid requirements (e.g., "3 days in office per week")
 * - Portfolio/samples requirements
 * - Cover letter requirements
 * - References requirements
 * - Background check / drug test requirements
 */

// ============================================================================
// MAIN DETECTION FUNCTION
// ============================================================================

/**
 * Detect special requirements from job description
 * @param {string} jobDescriptionText - Full job posting text
 * @returns {Object} Special requirements object
 */
function detectSpecialRequirements(jobDescriptionText) {
  if (!jobDescriptionText || typeof jobDescriptionText !== 'string') {
    return {
      hasSpecialRequirements: false,
      alerts: [],
      details: {}
    };
  }

  const text = jobDescriptionText;
  const alerts = [];
  const details = {};

  // Detect email submission requirements
  const emailReq = detectEmailSubmission(text);
  if (emailReq.detected) {
    alerts.push({
      type: 'EMAIL_SUBMISSION',
      severity: 'high',
      message: emailReq.message,
      details: emailReq.details
    });
    details.emailSubmission = emailReq;
  }

  // Detect video/recording requirements
  const videoReq = detectVideoRequirement(text);
  if (videoReq.detected) {
    alerts.push({
      type: 'VIDEO_REQUIRED',
      severity: 'medium',
      message: videoReq.message,
      details: videoReq.details
    });
    details.videoRequirement = videoReq;
  }

  // Detect travel requirements
  const travelReq = detectTravelRequirement(text);
  if (travelReq.detected) {
    alerts.push({
      type: 'TRAVEL_REQUIRED',
      severity: travelReq.percentage > 25 ? 'high' : 'medium',
      message: travelReq.message,
      details: travelReq.details
    });
    details.travelRequirement = travelReq;
  }

  // Detect office/hybrid requirements
  const officeReq = detectOfficeRequirement(text);
  if (officeReq.detected) {
    alerts.push({
      type: 'OFFICE_DAYS',
      severity: officeReq.daysPerWeek >= 4 ? 'high' : 'medium',
      message: officeReq.message,
      details: officeReq.details
    });
    details.officeRequirement = officeReq;
  }

  // Detect portfolio/samples requirements
  const portfolioReq = detectPortfolioRequirement(text);
  if (portfolioReq.detected) {
    alerts.push({
      type: 'PORTFOLIO_REQUIRED',
      severity: 'medium',
      message: portfolioReq.message,
      details: portfolioReq.details
    });
    details.portfolioRequirement = portfolioReq;
  }

  // Detect cover letter requirements
  const coverLetterReq = detectCoverLetterRequirement(text);
  if (coverLetterReq.detected) {
    alerts.push({
      type: 'COVER_LETTER_REQUIRED',
      severity: 'low',
      message: coverLetterReq.message,
      details: coverLetterReq.details
    });
    details.coverLetterRequirement = coverLetterReq;
  }

  // Detect background check / drug test
  const backgroundReq = detectBackgroundCheck(text);
  if (backgroundReq.detected) {
    alerts.push({
      type: 'BACKGROUND_CHECK',
      severity: 'info',
      message: backgroundReq.message,
      details: backgroundReq.details
    });
    details.backgroundCheck = backgroundReq;
  }

  // Detect security clearance requirements
  const securityReq = detectSecurityClearance(text);
  if (securityReq.detected) {
    alerts.push({
      type: 'SECURITY_CLEARANCE',
      severity: 'high',
      message: securityReq.message,
      details: securityReq.details
    });
    details.securityClearance = securityReq;
  }

  // Detect relocation requirements
  const relocationReq = detectRelocationRequirement(text);
  if (relocationReq.detected) {
    alerts.push({
      type: 'RELOCATION',
      severity: 'high',
      message: relocationReq.message,
      details: relocationReq.details
    });
    details.relocationRequirement = relocationReq;
  }

  return {
    hasSpecialRequirements: alerts.length > 0,
    alerts,
    details,
    alertCount: alerts.length,
    highSeverityCount: alerts.filter(a => a.severity === 'high').length
  };
}

// ============================================================================
// INDIVIDUAL DETECTORS
// ============================================================================

/**
 * Detect email submission requirements
 */
function detectEmailSubmission(text) {
  const patterns = [
    /(?:send|submit|email|forward)\s+(?:your\s+)?(?:resume|cv|application)\s+(?:to\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*(?:with|include|along)/gi,
    /apply\s+(?:by\s+)?(?:sending|emailing)\s+(?:to\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    /email\s+(?:applications?\s+)?(?:to\s+)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const email = match[1] || match[0].match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
      return {
        detected: true,
        message: `Email application required: ${email}`,
        details: { email, requiresEmailSubmission: true }
      };
    }
    pattern.lastIndex = 0;
  }

  return { detected: false };
}

/**
 * Detect video/recording requirements
 */
function detectVideoRequirement(text) {
  const patterns = [
    /(?:video|recording|recorded)\s+(?:introduction|intro|cover\s+letter|application|presentation)/gi,
    /(?:include|submit|send)\s+(?:a\s+)?(?:short\s+)?video/gi,
    /(?:loom|youtube|vimeo)\s+(?:video|link|recording)/gi,
    /video\s+(?:is\s+)?(?:required|mandatory|expected)/gi,
    /record\s+(?:a\s+)?(?:short\s+)?(?:video|introduction|yourself)/gi
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return {
        detected: true,
        message: 'Video submission required',
        details: { requiresVideo: true }
      };
    }
    pattern.lastIndex = 0;
  }

  return { detected: false };
}

/**
 * Detect travel requirements
 */
function detectTravelRequirement(text) {
  const patterns = [
    /(\d{1,3})\s*%\s*(?:travel|traveling)/gi,
    /(?:travel|traveling)\s+(?:up\s+to\s+)?(\d{1,3})\s*%/gi,
    /(?:travel|traveling)\s+(?:required|expected|necessary)/gi,
    /(?:frequent|regular|occasional|extensive)\s+travel/gi,
    /(?:domestic|international|regional)\s+travel\s+(?:required|expected)/gi,
    /travel\s+(\d{1,2})\s*(?:days?|times?)\s+(?:per|a)\s+(?:month|quarter|year)/gi
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const percentage = match[1] ? parseInt(match[1], 10) : null;
      return {
        detected: true,
        percentage,
        message: percentage ? `Travel required: ${percentage}%` : 'Travel required',
        details: { requiresTravel: true, travelPercentage: percentage }
      };
    }
    pattern.lastIndex = 0;
  }

  return { detected: false };
}

/**
 * Detect office/hybrid requirements
 */
function detectOfficeRequirement(text) {
  const patterns = [
    /(\d)\s*(?:days?|x)\s*(?:per|a|\/)\s*week\s*(?:in[\s-]?office|on[\s-]?site|onsite)/gi,
    /(?:in[\s-]?office|on[\s-]?site|onsite)\s*(\d)\s*(?:days?|x)\s*(?:per|a|\/)\s*week/gi,
    /hybrid\s*(?:\(|:)?\s*(\d)\s*(?:days?|x)\s*(?:in[\s-]?office|on[\s-]?site)/gi,
    /(?:must|required\s+to)\s+(?:be\s+)?(?:in[\s-]?office|on[\s-]?site)\s*(\d)\s*days?/gi,
    /(\d)\s*days?\s+(?:remote|wfh|work\s+from\s+home)/gi
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const days = parseInt(match[1], 10);
      // If we found "X days remote", the office days are 5 - X
      const officeDays = pattern.source.includes('remote') ? 5 - days : days;
      return {
        detected: true,
        daysPerWeek: officeDays,
        message: `Office: ${officeDays} days/week`,
        details: { requiresOffice: true, officeDaysPerWeek: officeDays }
      };
    }
    pattern.lastIndex = 0;
  }

  // Check for full-time in-office
  if (/\b(?:fully?\s+)?(?:in[\s-]?office|on[\s-]?site|onsite)\s+(?:only|required|position)\b/i.test(text)) {
    return {
      detected: true,
      daysPerWeek: 5,
      message: 'Full-time in office required',
      details: { requiresOffice: true, officeDaysPerWeek: 5 }
    };
  }

  return { detected: false };
}

/**
 * Detect portfolio/samples requirements
 */
function detectPortfolioRequirement(text) {
  const patterns = [
    /(?:portfolio|work\s+samples?|writing\s+samples?)\s+(?:required|mandatory|expected)/gi,
    /(?:include|submit|send|share)\s+(?:your\s+)?(?:portfolio|work\s+samples?|writing\s+samples?)/gi,
    /(?:link\s+to|provide)\s+(?:your\s+)?(?:portfolio|samples?|previous\s+work)/gi,
    /portfolio\s+(?:is\s+)?(?:a\s+)?must/gi
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return {
        detected: true,
        message: 'Portfolio/samples required',
        details: { requiresPortfolio: true }
      };
    }
    pattern.lastIndex = 0;
  }

  return { detected: false };
}

/**
 * Detect cover letter requirements
 */
function detectCoverLetterRequirement(text) {
  const patterns = [
    /cover\s+letter\s+(?:is\s+)?(?:required|mandatory|expected)/gi,
    /(?:include|submit|send)\s+(?:a\s+)?cover\s+letter/gi,
    /cover\s+letter\s+(?:that|explaining|describing)/gi,
    /must\s+(?:include|submit|provide)\s+(?:a\s+)?cover\s+letter/gi
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return {
        detected: true,
        message: 'Cover letter required',
        details: { requiresCoverLetter: true }
      };
    }
    pattern.lastIndex = 0;
  }

  return { detected: false };
}

/**
 * Detect background check / drug test requirements
 */
function detectBackgroundCheck(text) {
  const patterns = [
    /background\s+(?:check|screening|investigation)/gi,
    /(?:drug|substance)\s+(?:test|screening)/gi,
    /(?:pre[\s-]?employment|criminal)\s+(?:background|screening)/gi,
    /subject\s+to\s+(?:a\s+)?(?:background|drug)/gi
  ];

  const types = [];
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      if (pattern.source.includes('drug')) {
        types.push('drug_test');
      } else {
        types.push('background_check');
      }
    }
    pattern.lastIndex = 0;
  }

  if (types.length > 0) {
    return {
      detected: true,
      message: `Requires: ${[...new Set(types)].join(', ').replace(/_/g, ' ')}`,
      details: { types: [...new Set(types)] }
    };
  }

  return { detected: false };
}

/**
 * Detect security clearance requirements
 */
function detectSecurityClearance(text) {
  const patterns = [
    /(?:security|government)\s+clearance\s+(?:required|necessary|needed)/gi,
    /(?:must|required\s+to)\s+(?:have|obtain|hold)\s+(?:a\s+)?(?:security|government)\s+clearance/gi,
    /(?:secret|top\s+secret|ts\/sci|confidential)\s+clearance/gi,
    /clearance\s+(?:is\s+)?(?:required|mandatory)/gi
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return {
        detected: true,
        message: 'Security clearance required',
        details: { requiresClearance: true }
      };
    }
    pattern.lastIndex = 0;
  }

  return { detected: false };
}

/**
 * Detect relocation requirements
 */
function detectRelocationRequirement(text) {
  const patterns = [
    /(?:must|willing\s+to)\s+relocate/gi,
    /relocation\s+(?:required|necessary|expected)/gi,
    /(?:no|not)\s+(?:remote|wfh|work\s+from\s+home)/gi,
    /local\s+candidates?\s+(?:only|preferred)/gi,
    /must\s+(?:be\s+)?(?:located|based)\s+in/gi,
    /relocation\s+(?:assistance|package)\s+(?:not\s+)?(?:available|offered|provided)/gi
  ];

  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return {
        detected: true,
        message: 'Relocation may be required',
        details: { mayRequireRelocation: true }
      };
    }
    pattern.lastIndex = 0;
  }

  return { detected: false };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SpecialRequirements = {
    detectSpecialRequirements,
    detectEmailSubmission,
    detectVideoRequirement,
    detectTravelRequirement,
    detectOfficeRequirement,
    detectPortfolioRequirement,
    detectCoverLetterRequirement,
    detectBackgroundCheck,
    detectSecurityClearance,
    detectRelocationRequirement
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectSpecialRequirements,
    detectEmailSubmission,
    detectVideoRequirement,
    detectTravelRequirement,
    detectOfficeRequirement,
    detectPortfolioRequirement,
    detectCoverLetterRequirement,
    detectBackgroundCheck,
    detectSecurityClearance,
    detectRelocationRequirement
  };
}
