/**
 * Job Filter - Skill Taxonomy
 *
 * A curated taxonomy of skill concepts for job description analysis.
 * Based on Lightcast Open Skills (trimmed to ~300 relevant skills for Growth/Marketing/RevOps roles).
 *
 * IMPORTANT: This taxonomy contains SKILL CONCEPTS only, NOT tools/platforms.
 * Tools/platforms are filtered out via the deny-list in skill-constants.js
 *
 * Structure:
 * - name: Human-readable skill name (e.g., "Conversion Rate Optimization")
 * - canonical: Normalized key for deduplication (e.g., "conversion_rate_optimization")
 * - category: Skill category for grouping
 * - aliases: Alternative names/abbreviations for fuzzy matching
 */

// ============================================================================
// SKILL TAXONOMY - Curated for Growth/Marketing/RevOps roles
// ============================================================================

const SKILL_TAXONOMY = [
  // ============================================================================
  // GROWTH & ACQUISITION
  // ============================================================================
  {
    name: "Conversion Rate Optimization",
    canonical: "conversion_rate_optimization",
    category: "Growth",
    aliases: ["CRO", "conversion optimization", "conversion improvement", "conversion analysis"]
  },
  {
    name: "A/B Testing",
    canonical: "ab_testing",
    category: "Growth",
    aliases: ["split testing", "multivariate testing", "MVT", "experimentation", "test and learn"]
  },
  {
    name: "Funnel Optimization",
    canonical: "funnel_optimization",
    category: "Growth",
    aliases: ["funnel analysis", "funnel management", "conversion funnel", "sales funnel optimization"]
  },
  {
    name: "Growth Strategy",
    canonical: "growth_strategy",
    category: "Growth",
    aliases: ["growth planning", "growth initiatives", "growth roadmap", "scaling strategy"]
  },
  {
    name: "User Acquisition",
    canonical: "user_acquisition",
    category: "Growth",
    aliases: ["customer acquisition", "UA", "acquisition strategy", "new user growth"]
  },
  {
    name: "Growth Hacking",
    canonical: "growth_hacking",
    category: "Growth",
    aliases: ["growth marketing", "viral growth"]
  },
  {
    name: "Landing Page Optimization",
    canonical: "landing_page_optimization",
    category: "Growth",
    aliases: ["LPO", "landing page design", "page optimization", "conversion pages"]
  },
  {
    name: "Lead Generation",
    canonical: "lead_generation",
    category: "Growth",
    aliases: ["lead gen", "demand generation", "demand gen", "pipeline generation", "inbound leads"]
  },
  {
    name: "Demand Generation Strategy",
    canonical: "demand_generation_strategy",
    category: "Growth",
    aliases: ["demand gen strategy", "demand generation strategy", "pipeline strategy", "pipeline growth"]
  },
  {
    name: "Product-Led Growth",
    canonical: "product_led_growth",
    category: "Growth",
    aliases: ["product led growth", "product-led growth", "PLG motion", "PLG strategy"]
  },
  {
    name: "Sales-Led Growth",
    canonical: "sales_led_growth",
    category: "Growth",
    aliases: ["sales led growth", "sales-led growth", "sales-led motion", "sales-led strategy"]
  },
  {
    name: "Customer Journey Mapping",
    canonical: "customer_journey_mapping",
    category: "Growth",
    aliases: ["journey mapping", "user journey", "customer experience mapping", "CX mapping"]
  },
  {
    name: "Go-to-Market Strategy",
    canonical: "go_to_market_strategy",
    category: "Growth",
    aliases: ["GTM", "GTM strategy", "market entry", "launch strategy", "market launch"]
  },
  {
    name: "Market Expansion",
    canonical: "market_expansion",
    category: "Growth",
    aliases: ["new market entry", "geographic expansion", "market development", "international expansion"]
  },
  {
    name: "Pricing Strategy",
    canonical: "pricing_strategy",
    category: "Growth",
    aliases: ["pricing optimization", "price modeling", "monetization strategy", "revenue pricing"]
  },
  {
    name: "Product-Market Fit",
    canonical: "product_market_fit",
    category: "Growth",
    aliases: ["PMF", "market fit", "product fit analysis"]
  },
  {
    name: "Viral Marketing",
    canonical: "viral_marketing",
    category: "Growth",
    aliases: ["viral loops", "referral loops", "viral coefficient", "K-factor optimization"]
  },

  // ============================================================================
  // MARKETING
  // ============================================================================
  {
    name: "Digital Marketing",
    canonical: "digital_marketing",
    category: "Marketing",
    aliases: ["online marketing", "internet marketing", "web marketing"]
  },
  {
    name: "Content Marketing",
    canonical: "content_marketing",
    category: "Marketing",
    aliases: ["content strategy", "content creation", "editorial strategy", "content development"]
  },
  {
    name: "SEO",
    canonical: "seo",
    category: "Marketing",
    aliases: ["search engine optimization", "organic search", "search optimization", "SEO strategy"]
  },
  {
    name: "SEM",
    canonical: "sem",
    category: "Marketing",
    aliases: ["search engine marketing", "paid search", "PPC", "pay per click", "search advertising"]
  },
  {
    name: "Social Media Marketing",
    canonical: "social_media_marketing",
    category: "Marketing",
    aliases: ["social marketing", "SMM", "social media strategy", "social advertising"]
  },
  {
    name: "Email Marketing",
    canonical: "email_marketing",
    category: "Marketing",
    aliases: ["email campaigns", "email strategy", "email automation", "newsletter marketing"]
  },
  {
    name: "Performance Marketing",
    canonical: "performance_marketing",
    category: "Marketing",
    aliases: ["paid media", "paid acquisition", "digital advertising", "media buying"]
  },
  {
    name: "Brand Marketing",
    canonical: "brand_marketing",
    category: "Marketing",
    aliases: ["brand strategy", "brand development", "brand management", "branding"]
  },
  {
    name: "Marketing Strategy",
    canonical: "marketing_strategy",
    category: "Marketing",
    aliases: ["marketing planning", "marketing roadmap", "marketing leadership", "marketing strategy"]
  },
  {
    name: "Influencer Marketing",
    canonical: "influencer_marketing",
    category: "Marketing",
    aliases: ["influencer partnerships", "creator marketing", "KOL marketing", "ambassador programs"]
  },
  {
    name: "Affiliate Marketing",
    canonical: "affiliate_marketing",
    category: "Marketing",
    aliases: ["affiliate programs", "partner marketing", "referral marketing", "affiliate management"]
  },
  {
    name: "Product Marketing",
    canonical: "product_marketing",
    category: "Marketing",
    aliases: ["PMM", "product positioning", "product messaging", "go-to-market"]
  },
  {
    name: "Messaging & Positioning",
    canonical: "messaging_positioning",
    category: "Marketing",
    aliases: ["messaging", "positioning", "value proposition", "market positioning"]
  },
  {
    name: "Marketing Automation",
    canonical: "marketing_automation",
    category: "Marketing",
    aliases: ["automated marketing", "marketing workflows", "drip campaigns", "nurture campaigns", "automation motions", "automated workflows"]
  },
  {
    name: "B2B Marketing",
    canonical: "b2b_marketing",
    category: "Marketing",
    aliases: ["B2B", "B2B SaaS", "B2B SaaS marketing", "enterprise marketing", "business-to-business"]
  },
  {
    name: "Campaign Management",
    canonical: "campaign_management",
    category: "Marketing",
    aliases: ["campaign planning", "campaign execution", "campaign optimization", "marketing campaigns"]
  },
  {
    name: "Event Marketing",
    canonical: "event_marketing",
    category: "Marketing",
    aliases: ["event planning", "trade shows", "webinars", "conference marketing"]
  },
  {
    name: "Field Marketing",
    canonical: "field_marketing",
    category: "Marketing",
    aliases: ["regional marketing", "field programs", "local marketing"]
  },
  {
    name: "Community Marketing",
    canonical: "community_marketing",
    category: "Marketing",
    aliases: ["community building", "community strategy", "community-led growth", "community programs"]
  },
  {
    name: "Account-Based Marketing",
    canonical: "account_based_marketing",
    category: "Marketing",
    aliases: ["ABM", "account based marketing", "account-based strategy", "account-based programs"]
  },
  {
    name: "Outbound Marketing",
    canonical: "outbound_marketing",
    category: "Marketing",
    aliases: ["outbound campaigns", "outbound motion", "outbound strategy", "cold outreach"]
  },
  {
    name: "Partner Marketing",
    canonical: "partner_marketing",
    category: "Marketing",
    aliases: ["partner-led growth", "ecosystem marketing", "alliances marketing", "co-marketing"]
  },
  {
    name: "Paid Social Advertising",
    canonical: "paid_social_advertising",
    category: "Marketing",
    aliases: ["paid social", "social ads", "paid social campaigns", "social advertising"]
  },
  {
    name: "Paid Search Advertising",
    canonical: "paid_search_advertising",
    category: "Marketing",
    aliases: ["paid search", "search ads", "search advertising", "PPC"]
  },
  {
    name: "Out-of-Home Advertising",
    canonical: "out_of_home_advertising",
    category: "Marketing",
    aliases: ["OOH", "out of home", "out-of-home", "outdoor advertising"]
  },
  {
    name: "Answer Engine Optimization",
    canonical: "answer_engine_optimization",
    category: "Marketing",
    aliases: ["AEO", "answer engine optimization", "AI search optimization", "LLM optimization"]
  },
  {
    name: "Public Relations",
    canonical: "public_relations",
    category: "Marketing",
    aliases: ["PR", "media relations", "press relations", "communications"]
  },
  {
    name: "Copywriting",
    canonical: "copywriting",
    category: "Marketing",
    aliases: ["content writing", "ad copy", "marketing copy", "persuasive writing"]
  },
  {
    name: "Market Research",
    canonical: "market_research",
    category: "Marketing",
    aliases: ["market analysis", "competitive research", "market intelligence", "consumer research"]
  },
  {
    name: "Competitive Analysis",
    canonical: "competitive_analysis",
    category: "Marketing",
    aliases: ["competitor analysis", "competitive intelligence", "market positioning"]
  },

  // ============================================================================
  // ANALYTICS & DATA
  // ============================================================================
  {
    name: "Data Analysis",
    canonical: "data_analysis",
    category: "Analytics",
    aliases: ["data analytics", "analytical skills", "data interpretation", "data-driven decision making"]
  },
  {
    name: "SQL",
    canonical: "sql",
    category: "Analytics",
    aliases: ["structured query language", "database querying", "SQL queries", "data querying"]
  },
  {
    name: "Customer Segmentation",
    canonical: "customer_segmentation",
    category: "Analytics",
    aliases: ["audience segmentation", "market segmentation", "user segmentation", "cohort analysis"]
  },
  {
    name: "Attribution Modeling",
    canonical: "attribution_modeling",
    category: "Analytics",
    aliases: ["marketing attribution", "multi-touch attribution", "MTA", "attribution analysis"]
  },
  {
    name: "Predictive Analytics",
    canonical: "predictive_analytics",
    category: "Analytics",
    aliases: ["predictive modeling", "forecasting", "propensity modeling", "predictive intelligence"]
  },
  {
    name: "Business Intelligence",
    canonical: "business_intelligence",
    category: "Analytics",
    aliases: ["BI", "reporting", "dashboarding", "data visualization"]
  },
  {
    name: "Statistical Analysis",
    canonical: "statistical_analysis",
    category: "Analytics",
    aliases: ["statistics", "statistical modeling", "quantitative analysis", "statistical methods"]
  },
  {
    name: "KPI Development",
    canonical: "kpi_development",
    category: "Analytics",
    aliases: ["metrics development", "KPI tracking", "performance metrics", "OKRs"]
  },
  {
    name: "Market Sizing",
    canonical: "market_sizing",
    category: "Analytics",
    aliases: ["TAM", "SAM", "SOM", "total addressable market", "market sizing analysis"]
  },
  {
    name: "Pipeline Analytics",
    canonical: "pipeline_analytics",
    category: "Analytics",
    aliases: ["pipeline analysis", "pipeline metrics", "pipeline velocity", "pipeline health"]
  },
  {
    name: "Web Analytics",
    canonical: "web_analytics",
    category: "Analytics",
    aliases: ["website analytics", "digital analytics", "site analytics", "traffic analysis"]
  },
  {
    name: "Data Modeling",
    canonical: "data_modeling",
    category: "Analytics",
    aliases: ["data architecture", "data schema", "database design", "data structures"]
  },
  {
    name: "Regression Analysis",
    canonical: "regression_analysis",
    category: "Analytics",
    aliases: ["regression modeling", "linear regression", "logistic regression"]
  },
  {
    name: "Cohort Analysis",
    canonical: "cohort_analysis",
    category: "Analytics",
    aliases: ["cohort studies", "user cohorts", "behavioral cohorts"]
  },
  {
    name: "ROI Analysis",
    canonical: "roi_analysis",
    category: "Analytics",
    aliases: ["return on investment", "profitability analysis", "cost-benefit analysis", "ROAS"]
  },
  {
    name: "CAC Analysis",
    canonical: "cac_analysis",
    category: "Analytics",
    aliases: ["customer acquisition cost", "CAC", "acquisition cost analysis", "cost per acquisition"]
  },
  {
    name: "LTV Analysis",
    canonical: "ltv_analysis",
    category: "Analytics",
    aliases: ["lifetime value", "CLV", "customer lifetime value", "LTV modeling"]
  },
  {
    name: "Unit Economics",
    canonical: "unit_economics",
    category: "Analytics",
    aliases: ["unit profitability", "contribution margin", "margin analysis"]
  },

  // ============================================================================
  // LIFECYCLE & RETENTION
  // ============================================================================
  {
    name: "Customer Retention",
    canonical: "customer_retention",
    category: "Lifecycle",
    aliases: ["retention strategy", "user retention", "churn reduction", "retention marketing"]
  },
  {
    name: "Churn Analysis",
    canonical: "churn_analysis",
    category: "Lifecycle",
    aliases: ["churn prediction", "churn modeling", "attrition analysis", "churn prevention"]
  },
  {
    name: "Lifecycle Marketing",
    canonical: "lifecycle_marketing",
    category: "Lifecycle",
    aliases: ["customer lifecycle", "lifecycle campaigns", "lifecycle strategy", "CRM marketing"]
  },
  {
    name: "Lead Nurturing",
    canonical: "lead_nurturing",
    category: "Lifecycle",
    aliases: ["lead nurture", "nurture programs", "nurture campaigns", "lead nurturing"]
  },
  {
    name: "Onboarding Optimization",
    canonical: "onboarding_optimization",
    category: "Lifecycle",
    aliases: ["user onboarding", "customer onboarding", "activation", "first-time user experience"]
  },
  {
    name: "Customer Success",
    canonical: "customer_success",
    category: "Lifecycle",
    aliases: ["CS", "customer success management", "client success", "account management"]
  },
  {
    name: "Loyalty Programs",
    canonical: "loyalty_programs",
    category: "Lifecycle",
    aliases: ["rewards programs", "customer loyalty", "loyalty marketing", "retention programs"]
  },
  {
    name: "Re-engagement Campaigns",
    canonical: "re_engagement_campaigns",
    category: "Lifecycle",
    aliases: ["win-back campaigns", "reactivation", "dormant user campaigns", "lapsed customer marketing"]
  },
  {
    name: "NPS Management",
    canonical: "nps_management",
    category: "Lifecycle",
    aliases: ["net promoter score", "customer satisfaction", "CSAT", "customer feedback"]
  },
  {
    name: "Customer Experience",
    canonical: "customer_experience",
    category: "Lifecycle",
    aliases: ["CX", "user experience", "UX", "experience design", "experience optimization"]
  },
  {
    name: "Upselling",
    canonical: "upselling",
    category: "Lifecycle",
    aliases: ["upsell strategy", "expansion revenue", "account expansion"]
  },
  {
    name: "Cross-selling",
    canonical: "cross_selling",
    category: "Lifecycle",
    aliases: ["cross-sell strategy", "product cross-sell", "bundle selling"]
  },
  {
    name: "Personalization",
    canonical: "personalization",
    category: "Lifecycle",
    aliases: ["personalized marketing", "1:1 marketing", "dynamic content", "recommendation engines"]
  },

  // ============================================================================
  // TECHNICAL SKILLS
  // ============================================================================
  {
    name: "Python",
    canonical: "python",
    category: "Technical",
    aliases: ["python programming", "python scripting", "python development"]
  },
  {
    name: "R",
    canonical: "r_programming",
    category: "Technical",
    aliases: ["R programming", "R language", "R statistics"]
  },
  {
    name: "Excel",
    canonical: "excel",
    category: "Technical",
    aliases: ["Microsoft Excel", "spreadsheets", "advanced Excel", "Excel modeling"]
  },
  {
    name: "Data Visualization",
    canonical: "data_visualization",
    category: "Technical",
    aliases: ["data viz", "charting", "visual analytics", "dashboard design"]
  },
  {
    name: "ETL",
    canonical: "etl",
    category: "Technical",
    aliases: ["extract transform load", "data pipelines", "data integration", "data engineering"]
  },
  {
    name: "API Integration",
    canonical: "api_integration",
    category: "Technical",
    aliases: ["API management", "REST APIs", "integrations", "system integration"]
  },
  {
    name: "HTML/CSS",
    canonical: "html_css",
    category: "Technical",
    aliases: ["HTML", "CSS", "web development basics", "front-end basics"]
  },
  {
    name: "JavaScript",
    canonical: "javascript",
    category: "Technical",
    aliases: ["JS", "JavaScript development", "front-end development"]
  },
  {
    name: "Machine Learning",
    canonical: "machine_learning",
    category: "Technical",
    aliases: ["ML", "AI", "artificial intelligence", "deep learning"]
  },
  {
    name: "Data Science",
    canonical: "data_science",
    category: "Technical",
    aliases: ["data scientist skills", "applied data science", "quantitative methods"]
  },
  {
    name: "Database Management",
    canonical: "database_management",
    category: "Technical",
    aliases: ["database administration", "DBA", "DBMS", "database design"]
  },
  {
    name: "Technical Writing",
    canonical: "technical_writing",
    category: "Technical",
    aliases: ["documentation", "technical documentation", "API documentation"]
  },

  // ============================================================================
  // REVENUE OPERATIONS (RevOps)
  // ============================================================================
  {
    name: "Revenue Operations",
    canonical: "revenue_operations",
    category: "Operations",
    aliases: ["RevOps", "revenue ops", "rev ops"]
  },
  {
    name: "Sales Operations",
    canonical: "sales_operations",
    category: "Operations",
    aliases: ["sales ops", "salesops", "sales enablement"]
  },
  {
    name: "Marketing Operations",
    canonical: "marketing_operations",
    category: "Operations",
    aliases: ["marketing ops", "MOps", "marops"]
  },
  {
    name: "CRM Administration",
    canonical: "crm_administration",
    category: "Operations",
    aliases: ["CRM management", "CRM setup", "CRM optimization"]
  },
  {
    name: "Process Optimization",
    canonical: "process_optimization",
    category: "Operations",
    aliases: ["process improvement", "workflow optimization", "operational efficiency"]
  },
  {
    name: "Lead Scoring",
    canonical: "lead_scoring",
    category: "Operations",
    aliases: ["lead qualification", "lead prioritization", "MQL scoring", "SQL scoring"]
  },
  {
    name: "Pipeline Management",
    canonical: "pipeline_management",
    category: "Operations",
    aliases: ["pipeline management", "pipeline operations", "pipeline strategy", "pipeline health"]
  },
  {
    name: "ICP Definition",
    canonical: "icp_definition",
    category: "Operations",
    aliases: ["ICP", "ideal customer profile", "ICP definition", "customer profile definition"]
  },
  {
    name: "Sales Forecasting",
    canonical: "sales_forecasting",
    category: "Operations",
    aliases: ["revenue forecasting", "pipeline forecasting", "demand forecasting"]
  },
  {
    name: "Territory Planning",
    canonical: "territory_planning",
    category: "Operations",
    aliases: ["territory management", "sales territories", "account assignment"]
  },
  {
    name: "Quota Management",
    canonical: "quota_management",
    category: "Operations",
    aliases: ["quota planning", "quota setting", "sales quotas"]
  },
  {
    name: "Commission Planning",
    canonical: "commission_planning",
    category: "Operations",
    aliases: ["compensation planning", "incentive compensation", "sales compensation"]
  },
  {
    name: "Data Governance",
    canonical: "data_governance",
    category: "Operations",
    aliases: ["data quality", "data management", "data hygiene", "data stewardship"]
  },
  {
    name: "Tech Stack Management",
    canonical: "tech_stack_management",
    category: "Operations",
    aliases: ["martech stack", "sales tech stack", "tool administration"]
  },

  // ============================================================================
  // LEADERSHIP & STRATEGY
  // ============================================================================
  {
    name: "Strategic Planning",
    canonical: "strategic_planning",
    category: "Leadership",
    aliases: ["strategy development", "business strategy", "strategic thinking"]
  },
  {
    name: "Team Leadership",
    canonical: "team_leadership",
    category: "Leadership",
    aliases: ["people management", "team management", "leadership", "managing teams"]
  },
  {
    name: "Cross-functional Collaboration",
    canonical: "cross_functional_collaboration",
    category: "Leadership",
    aliases: ["cross-team collaboration", "stakeholder management", "interdepartmental work"]
  },
  {
    name: "Budget Management",
    canonical: "budget_management",
    category: "Leadership",
    aliases: ["budget planning", "financial management", "P&L management", "cost management"]
  },
  {
    name: "Vendor Management",
    canonical: "vendor_management",
    category: "Leadership",
    aliases: ["vendor relations", "agency management", "partner management", "supplier management"]
  },
  {
    name: "Project Management",
    canonical: "project_management",
    category: "Leadership",
    aliases: ["PM", "program management", "project planning", "project execution"]
  },
  {
    name: "Executive Presentation",
    canonical: "executive_presentation",
    category: "Leadership",
    aliases: ["executive communication", "board presentations", "C-suite reporting"]
  },
  {
    name: "Change Management",
    canonical: "change_management",
    category: "Leadership",
    aliases: ["organizational change", "transformation", "change leadership"]
  },
  {
    name: "Hiring",
    canonical: "hiring",
    category: "Leadership",
    aliases: ["recruiting", "talent acquisition", "team building", "interviewing"]
  },
  {
    name: "Mentoring",
    canonical: "mentoring",
    category: "Leadership",
    aliases: ["coaching", "developing talent", "career development"]
  },
  {
    name: "Performance Management",
    canonical: "performance_management",
    category: "Leadership",
    aliases: ["performance reviews", "goal setting", "employee development"]
  },

  // ============================================================================
  // E-COMMERCE & D2C
  // ============================================================================
  {
    name: "E-commerce Strategy",
    canonical: "ecommerce_strategy",
    category: "Ecommerce",
    aliases: ["ecommerce", "e-commerce", "online retail", "digital commerce"]
  },
  {
    name: "DTC/D2C",
    canonical: "dtc_d2c",
    category: "Ecommerce",
    aliases: ["direct to consumer", "DTC", "D2C", "consumer direct"]
  },
  {
    name: "Marketplace Management",
    canonical: "marketplace_management",
    category: "Ecommerce",
    aliases: ["Amazon", "marketplace optimization", "third-party marketplaces"]
  },
  {
    name: "Subscription Commerce",
    canonical: "subscription_commerce",
    category: "Ecommerce",
    aliases: ["subscription business", "recurring revenue", "subscription model"]
  },
  {
    name: "Cart Abandonment",
    canonical: "cart_abandonment",
    category: "Ecommerce",
    aliases: ["abandoned cart recovery", "checkout optimization", "cart recovery"]
  },
  {
    name: "Product Catalog Management",
    canonical: "product_catalog_management",
    category: "Ecommerce",
    aliases: ["catalog management", "product information management", "PIM"]
  },
  {
    name: "Inventory Management",
    canonical: "inventory_management",
    category: "Ecommerce",
    aliases: ["stock management", "inventory optimization", "supply chain"]
  },
  {
    name: "Fulfillment Operations",
    canonical: "fulfillment_operations",
    category: "Ecommerce",
    aliases: ["order fulfillment", "shipping logistics", "3PL management"]
  },

  // ============================================================================
  // PRODUCT & UX
  // ============================================================================
  {
    name: "Product Management",
    canonical: "product_management",
    category: "Product",
    aliases: ["product strategy", "product development", "product owner"]
  },
  {
    name: "User Research",
    canonical: "user_research",
    category: "Product",
    aliases: ["UX research", "customer research", "usability testing", "user interviews"]
  },
  {
    name: "Product Analytics",
    canonical: "product_analytics",
    category: "Product",
    aliases: ["product metrics", "feature analytics", "product data analysis"]
  },
  {
    name: "Roadmap Planning",
    canonical: "roadmap_planning",
    category: "Product",
    aliases: ["product roadmap", "feature prioritization", "backlog management"]
  },
  {
    name: "Wireframing",
    canonical: "wireframing",
    category: "Product",
    aliases: ["prototyping", "mockups", "UI design", "UX design"]
  },
  {
    name: "Feature Prioritization",
    canonical: "feature_prioritization",
    category: "Product",
    aliases: ["prioritization frameworks", "RICE scoring", "MoSCoW"]
  },
  {
    name: "A/B Testing for Product",
    canonical: "product_experimentation",
    category: "Product",
    aliases: ["product experiments", "feature testing", "product A/B testing"]
  }
];

// ============================================================================
// SYNONYM GROUPS - Map informal terms to canonical skills
// ============================================================================

const SKILL_SYNONYM_GROUPS = new Map([
  ["conversion_rate_optimization", ["CRO", "conversion opt", "conv optimization", "conversion rate opt"]],
  ["ab_testing", ["A/B test", "split test", "experiment design", "testing and optimization"]],
  ["funnel_optimization", ["funnel analysis", "funnel mgmt", "sales funnel", "marketing funnel"]],
  ["go_to_market_strategy", ["GTM", "go to market", "gtm strategy", "market launch"]],
  ["lead_generation", ["lead gen", "demand gen", "pipeline building", "top of funnel"]],
  ["demand_generation_strategy", ["demand generation strategy", "demand gen strategy", "pipeline strategy", "pipeline growth"]],
  ["product_led_growth", ["product led growth", "product-led growth", "plg motion", "plg strategy"]],
  ["sales_led_growth", ["sales led growth", "sales-led growth", "sales-led motion"]],
  ["account_based_marketing", ["abm", "account based marketing", "account-based marketing", "account-based programs"]],
  ["outbound_marketing", ["outbound marketing", "outbound motion", "outbound campaigns", "cold outreach"]],
  ["partner_marketing", ["partner marketing", "partner-led growth", "ecosystem marketing", "alliances marketing"]],
  ["community_marketing", ["community marketing", "community building", "community-led growth", "community programs"]],
  ["field_marketing", ["field marketing", "regional marketing", "field programs"]],
  ["paid_social_advertising", ["paid social", "social ads", "paid social campaigns"]],
  ["paid_search_advertising", ["paid search", "search ads", "ppc"]],
  ["out_of_home_advertising", ["ooh", "out of home", "out-of-home", "outdoor advertising"]],
  ["answer_engine_optimization", ["aeo", "answer engine optimization", "ai search optimization", "llm optimization"]],
  ["messaging_positioning", ["messaging", "positioning", "value proposition", "market positioning"]],
  ["b2b_marketing", ["b2b", "b2b saas", "b2b marketing", "business to business", "business-to-business"]],
  ["marketing_strategy", ["marketing strategy", "marketing planning", "marketing roadmap"]],
  ["market_sizing", ["tam", "sam", "som", "total addressable market", "market sizing"]],
  ["pipeline_analytics", ["pipeline analytics", "pipeline metrics", "pipeline velocity", "pipeline analysis"]],
  ["lead_nurturing", ["lead nurture", "lead nurturing", "nurture programs", "nurture campaigns"]],
  ["pipeline_management", ["pipeline management", "pipeline operations", "pipeline strategy"]],
  ["icp_definition", ["icp", "ideal customer profile", "customer profile definition"]],
  ["customer_segmentation", ["segmentation", "audience segments", "user segments"]],
  ["email_marketing", ["email", "email campaigns", "ESP", "email automation"]],
  ["seo", ["search optimization", "organic search", "search rankings"]],
  ["sem", ["paid search", "PPC", "Google Ads", "search ads"]],
  ["sql", ["database queries", "query writing", "data extraction"]],
  ["data_analysis", ["analytics", "data analytics", "analyzing data"]],
  ["customer_retention", ["retention", "churn reduction", "keeping customers"]],
  ["lifecycle_marketing", ["lifecycle", "CRM", "customer journey"]],
  ["revenue_operations", ["RevOps", "Rev Ops", "revenue ops"]],
  ["marketing_operations", ["MOps", "marketing ops", "marops"]],
  ["sales_operations", ["sales ops", "salesops"]],
  ["business_intelligence", ["BI", "reporting", "dashboards"]],
  ["machine_learning", ["ML", "AI", "artificial intelligence"]],
  ["ltv_analysis", ["LTV", "CLV", "lifetime value", "customer value"]],
  ["cac_analysis", ["CAC", "acquisition cost", "customer acquisition cost"]]
]);

// ============================================================================
// CANONICAL RULES - Direct mappings for common abbreviations
// ============================================================================

const CANONICAL_RULES = new Map([
  // Abbreviations
  ["cro", "conversion rate optimization"],
  ["gtm", "go-to-market strategy"],
  ["ppc", "sem"],
  ["seo", "seo"],
  ["sql", "sql"],
  ["mops", "marketing operations"],
  ["revops", "revenue operations"],
  ["bi", "business intelligence"],
  ["abm", "account-based marketing"],
  ["ooh", "out-of-home advertising"],
  ["aeo", "answer engine optimization"],
  ["icp", "icp definition"],
  ["tam", "market sizing"],
  ["sam", "market sizing"],
  ["som", "market sizing"],
  ["mql", "lead scoring"],
  ["plg", "product-led growth"],
  ["sales-led", "sales-led growth"],
  ["etl", "etl"],
  ["api", "api integration"],
  ["ml", "machine learning"],
  ["ai", "machine learning"],
  ["ltv", "ltv analysis"],
  ["clv", "ltv analysis"],
  ["cac", "cac analysis"],
  ["roas", "roi analysis"],
  ["kpi", "kpi development"],
  ["okr", "kpi development"],
  ["nps", "nps management"],
  ["csat", "nps management"],
  ["cx", "customer experience"],
  ["ux", "customer experience"],
  ["plg", "product-led growth"],
  ["pmf", "product-market fit"],
  ["pmm", "product marketing"],
  ["pr", "public relations"],
  ["cs", "customer success"],
  ["dtc", "dtc/d2c"],
  ["d2c", "dtc/d2c"],

  // Common variations
  ["a/b testing", "a/b testing"],
  ["split testing", "a/b testing"],
  ["multivariate testing", "a/b testing"],
  ["conversion optimization", "conversion rate optimization"],
  ["full funnel", "funnel optimization"],
  ["full-funnel", "funnel optimization"],
  ["demand generation", "demand generation strategy"],
  ["demand gen", "demand generation strategy"],
  ["lead gen", "lead generation"],
  ["account based marketing", "account-based marketing"],
  ["account-based marketing", "account-based marketing"],
  ["outbound", "outbound marketing"],
  ["partner-led growth", "partner marketing"],
  ["ecosystem marketing", "partner marketing"],
  ["field marketing", "field marketing"],
  ["paid social", "paid social advertising"],
  ["paid search", "paid search advertising"],
  ["pipeline management", "pipeline management"],
  ["pipeline analytics", "pipeline analytics"],
  ["pipeline velocity", "pipeline analytics"],
  ["market sizing", "market sizing"],
  ["ideal customer profile", "icp definition"],
  ["positioning", "messaging & positioning"],
  ["messaging", "messaging & positioning"],
  ["b2b", "b2b marketing"],
  ["b2b saas", "b2b marketing"],
  ["business to business", "b2b marketing"],
  ["business-to-business", "b2b marketing"],
  ["paid media", "performance marketing"],
  ["paid acquisition", "performance marketing"],
  ["lifecycle", "lifecycle marketing"],
  ["retention marketing", "customer retention"],
  ["user retention", "customer retention"],
  ["churn prevention", "churn analysis"],
  ["analytics", "data analysis"],
  ["data analytics", "data analysis"],
  ["segmentation", "customer segmentation"],
  ["audience segmentation", "customer segmentation"],
  ["attribution", "attribution modeling"],
  ["forecasting", "predictive analytics"],
  ["personalization", "personalization"],
  ["onboarding", "onboarding optimization"],
  ["user onboarding", "onboarding optimization"],
  ["growth marketing", "growth hacking"],
  ["viral marketing", "viral marketing"],
  ["referral marketing", "affiliate marketing"],
  ["partner marketing", "affiliate marketing"],
  ["content strategy", "content marketing"],
  ["email campaigns", "email marketing"],
  ["email automation", "email marketing"],
  ["marketing automation", "marketing automation"],
  ["automation motions", "marketing automation"],
  ["automated workflows", "marketing automation"],
  ["automation", "marketing automation"],
  ["crm", "crm administration"],
  ["process improvement", "process optimization"],
  ["workflow automation", "process optimization"],
  ["data viz", "data visualization"],
  ["dashboard", "business intelligence"],
  ["dashboarding", "business intelligence"],
  ["reporting", "business intelligence"],
  ["data pipelines", "etl"],
  ["data integration", "etl"],
  ["python", "python"],
  ["r", "r programming"],
  ["javascript", "javascript"],
  ["html", "html/css"],
  ["css", "html/css"],
  ["excel", "excel"],
  ["spreadsheets", "excel"]
]);

// ============================================================================
// CATEGORY DEFINITIONS
// ============================================================================

const SKILL_CATEGORIES = [
  { id: "Growth", label: "Growth & Acquisition", color: "#10B981" },
  { id: "Marketing", label: "Marketing", color: "#3B82F6" },
  { id: "Analytics", label: "Analytics & Data", color: "#8B5CF6" },
  { id: "Lifecycle", label: "Lifecycle & Retention", color: "#F59E0B" },
  { id: "Technical", label: "Technical Skills", color: "#EF4444" },
  { id: "Operations", label: "Revenue Operations", color: "#EC4899" },
  { id: "Leadership", label: "Leadership & Strategy", color: "#6366F1" },
  { id: "Ecommerce", label: "E-commerce & D2C", color: "#14B8A6" },
  { id: "Product", label: "Product & UX", color: "#F97316" }
];

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillTaxonomy = {
    SKILL_TAXONOMY,
    SKILL_SYNONYM_GROUPS,
    CANONICAL_RULES,
    SKILL_CATEGORIES
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SKILL_TAXONOMY,
    SKILL_SYNONYM_GROUPS,
    CANONICAL_RULES,
    SKILL_CATEGORIES
  };
}
