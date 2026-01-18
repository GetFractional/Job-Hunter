/**
 * Job Filter - Skill Extraction Constants
 *
 * Contains:
 * - Tools/Platforms deny-list for filtering
 * - Generic/noise phrases to exclude
 * - Section detection patterns for required vs desired skills
 * - Configuration constants
 */

// ============================================================================
// TOOLS & PLATFORMS DENY-LIST
// These are NOT skill concepts - they are software tools and platforms
// ============================================================================

const TOOLS_DENY_LIST = new Set([
  // CRM & Sales Tools
  "salesforce", "hubspot", "zoho", "pipedrive", "dynamics 365", "microsoft dynamics",
  "freshsales", "copper", "insightly", "close.io", "close", "zendesk sell",
  "sugar crm", "sugarcrm", "keap", "infusionsoft", "nimble", "nutshell",
  "salesforce.com", "sf", "sfdc",

  // Marketing Automation
  "marketo", "eloqua", "pardot", "mailchimp", "klaviyo", "braze", "iterable",
  "customer.io", "customerio", "sendgrid", "activecampaign", "drip", "convertkit",
  "constant contact", "sendinblue", "brevo", "mailerlite", "aweber", "getresponse",
  "campaign monitor", "moosend", "omnisend", "autopilot", "moengage",
  "onesignal", "pushwoosh", "airship", "leanplum", "clevertap",

  // Analytics Platforms
  "google analytics", "ga4", "google analytics 4", "universal analytics",
  "adobe analytics", "mixpanel", "amplitude", "heap", "pendo", "fullstory",
  "hotjar", "crazy egg", "mouseflow", "lucky orange", "clicktale", "quantum metric",
  "contentsquare", "glassbox", "logrocket", "smartlook", "inspectlet",

  // BI & Visualization Tools
  "tableau", "power bi", "powerbi", "looker", "metabase", "mode", "sisense",
  "domo", "qlik", "qlikview", "qlik sense", "thoughtspot", "sigma",
  "periscope data", "chartio", "redash", "superset", "apache superset",
  "google data studio", "looker studio", "databox",

  // Data Platforms & Warehouses
  "snowflake", "bigquery", "redshift", "databricks", "fivetran", "stitch",
  "segment", "rudderstack", "mparticle", "tealium", "google cloud platform",
  "gcp", "aws", "amazon web services", "azure", "microsoft azure",
  "dbt", "airflow", "apache airflow", "prefect", "dagster", "census", "hightouch",

  // A/B Testing Tools
  "optimizely", "vwo", "visual website optimizer", "ab tasty", "abtasty",
  "google optimize", "split.io", "launchdarkly", "statsig", "eppo",
  "kameleoon", "convert", "omniconvert",

  // Social Media Platforms
  "facebook", "meta", "instagram", "linkedin", "twitter", "x", "tiktok",
  "pinterest", "snapchat", "youtube", "reddit", "threads",

  // Social Media Management
  "hootsuite", "sprout social", "sprinklr", "buffer", "later", "planoly",
  "socialbee", "agorapulse", "sendible", "brandwatch", "talkwalker",
  "mention", "meltwater", "cision", "muck rack",

  // Ad Platforms
  "google ads", "facebook ads", "meta ads", "linkedin ads", "twitter ads",
  "tiktok ads", "pinterest ads", "snapchat ads", "amazon ads",
  "dv360", "display & video 360", "the trade desk", "ttd", "mediamath",
  "criteo", "taboola", "outbrain", "adroll", "perfect audience",

  // E-commerce Platforms
  "shopify", "shopify plus", "magento", "adobe commerce", "bigcommerce",
  "woocommerce", "squarespace", "wix", "weebly", "volusion", "prestashop",
  "salesforce commerce cloud", "demandware", "commercetools", "vtex",
  "shopware", "sap commerce", "hybris", "episerver", "optimizely commerce",

  // Payment & Fintech
  "stripe", "square", "paypal", "braintree", "adyen", "worldpay",
  "authorize.net", "checkout.com", "plaid", "finicity", "yodlee",
  "affirm", "klarna", "afterpay", "sezzle", "zip",

  // Customer Support
  "zendesk", "intercom", "freshdesk", "helpscout", "help scout", "kayako",
  "zoho desk", "happyfox", "groove", "front", "gorgias", "kustomer", "gladly",
  "dixa", "ada", "drift", "qualified", "chili piper",

  // Project Management
  "jira", "asana", "monday.com", "monday", "trello", "basecamp", "clickup",
  "notion", "airtable", "smartsheet", "wrike", "teamwork", "podio",
  "linear", "shortcut", "productboard", "aha!", "aha", "roadmunk",

  // Design Tools
  "figma", "sketch", "adobe xd", "invision", "zeplin", "marvel", "framer",
  "canva", "adobe creative suite", "photoshop", "illustrator", "indesign",
  "after effects", "premiere pro",

  // Communication Tools
  "slack", "microsoft teams", "teams", "zoom", "google meet", "webex",
  "discord", "workplace", "yammer", "miro", "mural", "figjam", "lucidchart",
  "loom", "vidyard", "wistia", "vimeo",

  // Survey & Feedback Tools
  "qualtrics", "surveymonkey", "typeform", "google forms", "delighted",
  "medallia", "usertesting", "usabilla", "userzoom", "userlytics",

  // CDP & Identity
  "treasure data", "blueconic", "lytics", "zeotap", "amperity",
  "twilio", "auth0", "okta",

  // AI/ML Platforms (tools, not skills)
  "chatgpt", "openai", "anthropic", "claude", "bard", "gemini", "gpt-4", "gpt-3",
  "midjourney", "dall-e", "stable diffusion", "jasper ai", "jasper", "copy.ai",
  "writesonic", "grammarly",

  // Developer Tools
  "github", "gitlab", "bitbucket", "jira software", "confluence",
  "docker", "kubernetes", "jenkins", "circleci", "travis ci",
  "vercel", "netlify", "heroku", "render",

  // Document & Productivity
  "google docs", "google sheets", "microsoft office", "word", "excel", "powerpoint",
  "google workspace", "g suite", "dropbox", "box", "google drive", "onedrive",
  "evernote", "onenote",

  // ABM & Sales Intelligence
  "zoominfo", "clearbit", "6sense", "demandbase", "terminus", "rollworks",
  "bombora", "madison logic", "intentsify", "leadiq", "apollo.io", "apollo",
  "outreach", "salesloft", "gong", "chorus", "clari", "people.ai",
  "seismic", "highspot", "showpad", "guru",

  // Attribution Tools
  "rockerbox", "northbeam", "triple whale", "triplewhale", "measured",
  "windsor.ai", "funnel.io", "funnel", "supermetrics", "agency analytics",

  // Affiliate & Partner
  "impact", "impact.com", "partnerstack", "partnerize", "tune", "everflow",
  "refersion", "leaddyno", "post affiliate pro",

  // SMS & Mobile
  "twilio", "bandwidth", "plivo", "vonage", "sinch", "attentive", "postscript",
  "yotpo sms", "smsbump", "recart",

  // Reviews & UGC
  "yotpo", "bazaarvoice", "powerreviews", "trustpilot", "g2", "capterra",
  "okendo", "loox", "stamped.io", "junip",

  // Misc Tools
  "zapier", "workato", "tray.io", "make", "integromat", "automate.io",
  "n8n", "power automate", "pabbly connect"
]);

// ============================================================================
// GENERIC/NOISE PHRASES TO EXCLUDE
// These are too vague or not actual skills
// ============================================================================

const GENERIC_PHRASES_DENY_LIST = new Set([
  // Generic business terms
  "experience", "years of experience", "strong communication", "communication skills",
  "team player", "detail oriented", "detail-oriented", "problem solving", "problem-solving",
  "fast paced", "fast-paced", "self starter", "self-starter", "motivated",
  "enthusiastic", "passionate", "proactive", "driven", "results oriented",
  "results-oriented", "excellent written", "verbal communication", "interpersonal skills",
  "organizational skills", "time management", "multitasking", "deadline driven",
  "collaborative", "work independently", "attention to detail", "customer focused",
  "customer-focused", "ability to", "strong understanding", "excellent communication",
  "good communication", "great communication",

  // Vague job requirements
  "bachelor's degree", "bachelor degree", "master's degree", "mba", "degree required",
  "years experience", "minimum years", "equivalent experience", "related field",
  "fast learner", "quick learner", "eager to learn", "growth mindset",
  "analytical mindset", "creative thinker", "strategic thinker", "big picture",
  "hands on", "hands-on", "roll up sleeves", "ownership mentality",
  "entrepreneurial", "startup mentality", "comfortable with ambiguity",
  "ambiguous environment", "dynamic environment", "agile environment",

  // Common filler words
  "and", "or", "the", "with", "for", "from", "including", "such as",
  "e.g.", "etc.", "i.e.", "using", "through", "across", "within",
  "related", "relevant", "similar", "other", "various", "multiple",

  // Job title fragments
  "manager", "director", "lead", "senior", "junior", "associate",
  "head of", "vp of", "vice president", "specialist", "analyst", "coordinator",

  // Time-related
  "full time", "full-time", "part time", "part-time", "contract", "temporary",
  "permanent", "hybrid", "remote", "on-site", "onsite",

  // Benefits/compensation (not skills)
  "competitive salary", "equity", "stock options", "health insurance", "401k",
  "unlimited pto", "vacation", "benefits", "bonus", "commission"
]);

// ============================================================================
// SECTION DETECTION PATTERNS
// Used to classify skills as required vs desired
// ============================================================================

const REQUIRED_SECTION_PATTERNS = [
  /required\s*(skills?|qualifications?|experience)/i,
  /must\s+have/i,
  /requirements?\s*:/i,
  /what\s+you('ll)?\s+need/i,
  /what\s+we('re)?\s+looking\s+for/i,
  /minimum\s+qualifications?/i,
  /basic\s+qualifications?/i,
  /essential\s+(skills?|requirements?|qualifications?)/i,
  /you\s+should\s+have/i,
  /you\s+must\s+have/i,
  /must\s+possess/i
];

const DESIRED_SECTION_PATTERNS = [
  /preferred\s*(skills?|qualifications?|experience)/i,
  /nice\s+to\s+have/i,
  /bonus\s+(points?|if)/i,
  /preferred\s*:/i,
  /desired\s*(skills?|qualifications?|experience)/i,
  /plus\s+(if|points?)/i,
  /ideal(ly)?/i,
  /a\s+plus/i,
  /advantageous/i,
  /additional\s*(skills?|qualifications?)/i,
  /it('s|s)\s+a\s+plus/i
];

// ============================================================================
// EXTRACTION CONFIGURATION
// ============================================================================

const EXTRACTION_CONFIG = {
  // Fuse.js fuzzy matching threshold (0 = exact, 1 = match anything)
  // Lower = stricter matching
  FUZZY_THRESHOLD: 0.42,

  // Minimum confidence to include a skill
  MIN_CONFIDENCE: 0.45,

  // Maximum skills to extract per job
  // Set to 0 for no cap
  MAX_SKILLS_PER_JOB: 0,

  // Minimum phrase length to consider (characters)
  MIN_PHRASE_LENGTH: 2,

  // Maximum phrase length to consider (words)
  MAX_PHRASE_WORDS: 7,

  // Cache settings
  CACHE_MAX_SIZE: 50,
  CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes

  // Performance targets
  TARGET_EXECUTION_MS: 500
};

// ============================================================================
// FIT SCORE CONFIGURATION (v2 Upgrade)
// Configurable weights for dual-bucket scoring system
// ============================================================================

const FIT_SCORE_CONFIG = {
  // Weight distribution between core skills and tools
  CORE_SKILLS_WEIGHT: 0.70,  // 70% of overall score
  TOOLS_WEIGHT: 0.30,         // 30% of overall score

  // Multipliers for required vs desired items
  REQUIRED_MULTIPLIER: 2.0,   // Required items count 2x
  DESIRED_MULTIPLIER: 1.0,    // Desired items count 1x

  // Penalty values for missing items
  PENALTY_MISSING_REQUIRED_SKILL: -0.10,
  PENALTY_MISSING_REQUIRED_TOOL_EXPERT: -0.15,  // When "expert required" language detected
  PENALTY_MISSING_REQUIRED_TOOL_STANDARD: -0.12,
  PENALTY_MISSING_DESIRED_TOOL: -0.05,

  // Maximum total penalty cap
  MAX_TOTAL_PENALTY: -0.50,

  // Confidence thresholds for classification
  HIGH_CONFIDENCE_THRESHOLD: 0.85,
  MEDIUM_CONFIDENCE_THRESHOLD: 0.65,
  LOW_CONFIDENCE_THRESHOLD: 0.45
};

// ============================================================================
// FORCED CORE SKILLS
// These are ALWAYS classified as CORE_SKILLS, never tools
// ============================================================================

const FORCED_CORE_SKILLS = new Set([
  "sql",
  "python",
  // REMOVED: "r" - single char causes too many false positives
  // R programming is handled with explicit context matching in skill-extractor.js
  "javascript",
  "java",
  "c++",
  "c#",
  "ruby",
  "go",
  "rust",
  "scala",
  "kotlin",
  "swift",
  "typescript",
  "php",
  "html",
  "css",
  "data analysis",
  "data modeling",
  "statistical analysis",
  "machine learning",
  "deep learning",
  "natural language processing",
  "nlp",
  "computer vision",
  "experimentation",
  "a/b testing",
  "lifecycle marketing",
  "customer segmentation",
  "funnel optimization",
  "conversion rate optimization",
  "growth strategy",
  "product strategy",
  "go-to-market strategy",
  "revenue operations",
  "revops",
  "salesops",
  "marketing operations",
  "crm strategy"
]);

// ============================================================================
// SOFT SKILLS PATTERNS (v2 Upgrade)
// Regex patterns to identify and reject soft skills
// ============================================================================

const SOFT_SKILLS_PATTERNS = [
  // Generic soft skills - including compound forms
  /\b(communication|leadership|teamwork|collaboration|problem[\s-]solving)\b/i,
  /\bteam\s+leadership\b/i,  // Explicitly catch "Team Leadership"
  /\b(motivated|enthusiastic|passionate|proactive|driven)\b/i,
  /\b(detail[\s-]oriented|results[\s-]oriented|goal[\s-]oriented)\b/i,
  /\b(team\s+player|self[\s-]starter|fast[\s-]learner|quick[\s-]learner)\b/i,
  /\b(interpersonal|organizational)\b/i,

  // Ability/skills phrases
  /\b(strong|excellent|good|great)\s+(communication|interpersonal|organizational)\b/i,
  /\bability\s+to\s+/i,
  /\b\w+\s+skills?$/i,  // Generic "X skills"

  // Thinking/mindset phrases
  /\b(analytical|critical|strategic|creative)\s+thinking\b/i,
  /\b(growth|entrepreneurial|startup)\s+mindset\b/i,

  // Work style phrases
  /\bwork\s+(independently|under\s+pressure)\b/i,
  /\b(attention\s+to\s+detail|time\s+management|multitasking)\b/i,
  /\b(flexible|adaptable|resilient)\b/i,

  // Additional soft skills commonly leaking through
  /\b(relationship\s+building|relationship\s+management)\b/i,
  /\b(people\s+management|stakeholder\s+management)\b/i,
  /\b(written\s+communication|verbal\s+communication|oral\s+communication)\b/i,
  /\b(negotiation|conflict\s+resolution|decision[\s-]making)\b/i,
  /\b(mentoring|coaching|training)\b/i,
  /\b(influencing|persuasion|diplomacy)\b/i,
  /\b(accountability|ownership|initiative)\b/i,
  /\b(prioritization|delegation|coordination)\b/i
];

// ============================================================================
// SKILL ALIASES (v2 Upgrade)
// Maps common abbreviations and variations to canonical skill names
// ============================================================================

const SKILL_ALIASES = new Map([
  // Analytics & BI Tools
  ["ga4", "google analytics 4"],
  ["ga", "google analytics"],
  ["gtm", "google tag manager"],

  // CRM Systems
  ["sfdc", "salesforce"],
  ["sf", "salesforce"],
  ["hubspot crm", "hubspot"],

  // Data Platforms
  ["bq", "bigquery"],
  ["aws", "amazon web services"],
  ["gcp", "google cloud platform"],

  // Programming & Databases
  ["js", "javascript"],
  ["ts", "typescript"],
  ["py", "python"],
  ["postgres", "postgresql"],
  ["mongo", "mongodb"],

  // Marketing Automation
  ["sfmc", "salesforce marketing cloud"],
  ["mcae", "marketing cloud account engagement"],

  // Skills & Concepts
  ["cro", "conversion rate optimization"],
  ["seo", "search engine optimization"],
  ["sem", "search engine marketing"],
  ["ppc", "pay per click"],
  ["cpa", "cost per acquisition"],
  ["ltv", "lifetime value"],
  ["cac", "customer acquisition cost"],
  ["mrr", "monthly recurring revenue"],
  ["arr", "annual recurring revenue"],
  ["kpi", "key performance indicator"],
  ["okr", "objectives and key results"],
  ["roi", "return on investment"],
  ["roas", "return on ad spend"],
  ["abm", "account based marketing"],
  ["plg", "product led growth"],
  ["slg", "sales led growth"],
  ["gtm", "go to market"],
  ["mvp", "minimum viable product"],
  ["pmf", "product market fit"],

  // Data & Analytics
  ["etl", "extract transform load"],
  ["elt", "extract load transform"],
  ["cdp", "customer data platform"],
  ["dwh", "data warehouse"],
  ["bi", "business intelligence"],
  ["ml", "machine learning"],
  ["ai", "artificial intelligence"],
  ["nlp", "natural language processing"],

  // Operations
  ["revops", "revenue operations"],
  ["salesops", "sales operations"],
  ["marketingops", "marketing operations"],
  ["bizops", "business operations"],
  ["devops", "development operations"],
  ["secops", "security operations"],

  // Business Concepts
  ["b2b", "business to business"],
  ["b2c", "business to consumer"],
  ["d2c", "direct to consumer"],
  ["saas", "software as a service"],
  ["paas", "platform as a service"],
  ["iaas", "infrastructure as a service"]
]);

// ============================================================================
// SKILL PHRASE PATTERNS
// Regex patterns to extract potential skill phrases from text
// ============================================================================

const SKILL_PHRASE_PATTERNS = [
  // Direct skill mentions after common indicators
  /experience\s+(?:in|with)\s+([a-z][a-z\s\/&-]{2,40})/gi,
  /proficiency\s+(?:in|with)\s+([a-z][a-z\s\/&-]{2,40})/gi,
  /expertise\s+(?:in|with)\s+([a-z][a-z\s\/&-]{2,40})/gi,
  /knowledge\s+of\s+([a-z][a-z\s\/&-]{2,40})/gi,
  /skilled?\s+(?:in|at|with)\s+([a-z][a-z\s\/&-]{2,40})/gi,
  /background\s+in\s+([a-z][a-z\s\/&-]{2,40})/gi,
  /understanding\s+of\s+([a-z][a-z\s\/&-]{2,40})/gi,
  /responsible\s+for\s+([a-z][a-z\s\/&-]{2,40})/gi,
  /accountable\s+for\s+([a-z][a-z\s\/&-]{2,40})/gi,
  /experience\s+(?:scaling|building|owning)\s+([a-z][a-z\s\/&-]{2,40})/gi,

  // Bullet point skill patterns (common in job descriptions)
  /^[\s•\-\*\d.)\]]+([A-Z][a-z][a-z\s\/&-]{2,40})(?:\s*(?:\(|\/|,|;|$))/gm,

  // Skills after action verbs
  /(?:drive|lead|manage|develop|implement|execute|optimize|analyze|build|scale|own|launch|design|define|partner|collaborate)\s+([a-z][a-z\s\/&-]{2,40})/gi
];

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillConstants = {
    TOOLS_DENY_LIST,
    GENERIC_PHRASES_DENY_LIST,
    REQUIRED_SECTION_PATTERNS,
    DESIRED_SECTION_PATTERNS,
    EXTRACTION_CONFIG,
    SKILL_PHRASE_PATTERNS,
    FIT_SCORE_CONFIG,
    FORCED_CORE_SKILLS,
    SOFT_SKILLS_PATTERNS,
    SKILL_ALIASES
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TOOLS_DENY_LIST,
    GENERIC_PHRASES_DENY_LIST,
    REQUIRED_SECTION_PATTERNS,
    DESIRED_SECTION_PATTERNS,
    EXTRACTION_CONFIG,
    SKILL_PHRASE_PATTERNS,
    FIT_SCORE_CONFIG,
    FORCED_CORE_SKILLS,
    SOFT_SKILLS_PATTERNS,
    SKILL_ALIASES
  };
}
