/**
 * Job Filter - Skill Classifier Unit Tests
 *
 * Tests for the skill-classifier.js module
 * Run with: npm test
 */

// Import the module
const SkillClassifier = require('../skills/skill-classifier');

// Mock data for testing
const mockSkillsTaxonomy = [
  { name: 'SQL', canonical: 'sql', category: 'Technical' },
  { name: 'Python', canonical: 'python', category: 'Programming' },
  { name: 'lifecycle marketing', canonical: 'lifecycle_marketing', category: 'Marketing' },
  { name: 'data analysis', canonical: 'data_analysis', category: 'Analytics' }
];

const mockToolsDictionary = [
  { name: 'HubSpot', canonical: 'hubspot', type: 'Marketing Automation', aliases: ['hub spot'] },
  { name: 'Salesforce', canonical: 'salesforce', type: 'CRM', aliases: ['sfdc', 'sf'] },
  { name: 'Google Analytics 4', canonical: 'google_analytics_4', type: 'Analytics', aliases: ['ga4'] },
  { name: 'Tableau', canonical: 'tableau', type: 'BI', aliases: [] }
];

const mockIgnoreRules = {
  softSkills: {
    exactMatches: [
      'communication',
      'leadership',
      'teamwork',
      'collaboration',
      'problem-solving',
      'detail-oriented'
    ]
  },
  junkPhrases: {
    exactMatches: ['etc', 'more', 'and more', 'blah'],
    patterns: [
      { pattern: '^\\d+\\s*years?$', description: 'Year patterns' },
      { pattern: '^strong.*background$', description: 'Generic background phrases' }
    ]
  },
  degreeAndEducation: {
    exactMatches: ['bachelor degree', 'masters degree', 'mba', 'phd']
  },
  tooGeneric: {
    exactMatches: ['experience', 'skills', 'knowledge']
  }
};

const mockForcedCoreSkills = new Set(['sql', 'python', 'r', 'javascript']);

const mockSoftSkillsPatterns = [
  /\b(communication|leadership|teamwork|collaboration)\b/i,
  /\b(motivated|enthusiastic|passionate|proactive)\b/i,
  /\b(detail[\s-]oriented|results[\s-]oriented)\b/i
];

const classificationOptions = {
  skillsTaxonomy: mockSkillsTaxonomy,
  toolsDictionary: mockToolsDictionary,
  ignoreRules: mockIgnoreRules,
  forcedCoreSkills: mockForcedCoreSkills,
  softSkillsPatterns: mockSoftSkillsPatterns
};

describe('SkillClassifier', () => {
  describe('checkSoftSkillRejection', () => {
    it('should reject "communication" as soft skill', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'communication',
        mockIgnoreRules,
        mockSoftSkillsPatterns
      );
      expect(result.rejected).toBe(true);
      expect(result.reason).toContain('Soft skill');
    });

    it('should reject "leadership" as soft skill', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'leadership',
        mockIgnoreRules,
        mockSoftSkillsPatterns
      );
      expect(result.rejected).toBe(true);
    });

    it('should reject "teamwork" as soft skill', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'teamwork',
        mockIgnoreRules,
        mockSoftSkillsPatterns
      );
      expect(result.rejected).toBe(true);
    });

    it('should reject "etc" as junk phrase', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'etc',
        mockIgnoreRules,
        mockSoftSkillsPatterns
      );
      expect(result.rejected).toBe(true);
      expect(result.reason).toContain('Junk phrase');
    });

    it('should reject "bachelor degree" as education phrase', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'bachelor degree',
        mockIgnoreRules,
        mockSoftSkillsPatterns
      );
      expect(result.rejected).toBe(true);
    });

    it('should NOT reject "SQL" (valid skill)', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'sql',
        mockIgnoreRules,
        mockSoftSkillsPatterns
      );
      expect(result.rejected).toBe(false);
    });

    it('should NOT reject "Python" (valid skill)', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'python',
        mockIgnoreRules,
        mockSoftSkillsPatterns
      );
      expect(result.rejected).toBe(false);
    });
  });

  describe('checkExactDictionaryMatch', () => {
    it('should match HubSpot as TOOL', () => {
      const result = SkillClassifier.checkExactDictionaryMatch(
        'hubspot',
        mockSkillsTaxonomy,
        mockToolsDictionary
      );
      expect(result.matched).toBe(true);
      expect(result.type).toBe('TOOL');
      expect(result.canonical).toBe('hubspot');
    });

    it('should match Salesforce alias "sfdc" as TOOL', () => {
      const result = SkillClassifier.checkExactDictionaryMatch(
        'sfdc',
        mockSkillsTaxonomy,
        mockToolsDictionary
      );
      expect(result.matched).toBe(true);
      expect(result.type).toBe('TOOL');
      expect(result.canonical).toBe('salesforce');
    });

    it('should match SQL as CORE_SKILL', () => {
      const result = SkillClassifier.checkExactDictionaryMatch(
        'sql',
        mockSkillsTaxonomy,
        mockToolsDictionary
      );
      expect(result.matched).toBe(true);
      expect(result.type).toBe('CORE_SKILL');
    });

    it('should match "lifecycle marketing" as CORE_SKILL', () => {
      const result = SkillClassifier.checkExactDictionaryMatch(
        'lifecycle marketing',
        mockSkillsTaxonomy,
        mockToolsDictionary
      );
      expect(result.matched).toBe(true);
      expect(result.type).toBe('CORE_SKILL');
    });

    it('should return not matched for unknown phrase', () => {
      const result = SkillClassifier.checkExactDictionaryMatch(
        'unknown_skill_xyz',
        mockSkillsTaxonomy,
        mockToolsDictionary
      );
      expect(result.matched).toBe(false);
    });
  });

  describe('checkForcedCoreSkills', () => {
    it('should match "sql" as forced core skill', () => {
      const result = SkillClassifier.checkForcedCoreSkills('sql', mockForcedCoreSkills);
      expect(result.matched).toBe(true);
      expect(result.canonical).toBe('sql');
    });

    it('should match "python" as forced core skill', () => {
      const result = SkillClassifier.checkForcedCoreSkills('python', mockForcedCoreSkills);
      expect(result.matched).toBe(true);
    });

    it('should match partial "sql queries" containing forced skill', () => {
      const result = SkillClassifier.checkForcedCoreSkills('sql queries', mockForcedCoreSkills);
      expect(result.matched).toBe(true);
    });

    it('should NOT match "hubspot" as forced core skill', () => {
      const result = SkillClassifier.checkForcedCoreSkills('hubspot', mockForcedCoreSkills);
      expect(result.matched).toBe(false);
    });
  });

  describe('checkPatternRules', () => {
    it('should classify brand name with number as TOOL (GA4)', () => {
      const result = SkillClassifier.checkPatternRules('ga4');
      expect(result.matched).toBe(true);
      expect(result.type).toBe('TOOL');
      expect(result.evidence).toContain('Brand name with number');
    });

    it('should classify gerund ending as CORE_SKILL (marketing)', () => {
      const result = SkillClassifier.checkPatternRules('digital marketing');
      expect(result.matched).toBe(true);
      expect(result.type).toBe('CORE_SKILL');
    });

    it('should classify "X strategy" as CORE_SKILL', () => {
      const result = SkillClassifier.checkPatternRules('growth strategy');
      expect(result.matched).toBe(true);
      expect(result.type).toBe('CORE_SKILL');
      expect(result.evidence).toContain('Strategy');
    });

    it('should classify "X operations" as CORE_SKILL', () => {
      const result = SkillClassifier.checkPatternRules('revenue operations');
      expect(result.matched).toBe(true);
      expect(result.type).toBe('CORE_SKILL');
    });
  });

  describe('checkContextHeuristics', () => {
    it('should classify short acronym as CANDIDATE', () => {
      const result = SkillClassifier.checkContextHeuristics('crm', 'CRM');
      expect(result.type).toBe('CANDIDATE');
      expect(result.evidence).toContain('acronym');
    });

    it('should classify phrase with special chars as CANDIDATE with inferred TOOL', () => {
      const result = SkillClassifier.checkContextHeuristics('node.js', 'Node.js');
      expect(result.type).toBe('CANDIDATE');
      expect(result.inferredType).toBe('TOOL');
    });

    it('should default to CANDIDATE with UNKNOWN type', () => {
      const result = SkillClassifier.checkContextHeuristics('something random', 'Something Random');
      expect(result.type).toBe('CANDIDATE');
      expect(result.inferredType).toBe('UNKNOWN');
    });
  });

  describe('classifySkillPhrase', () => {
    it('should reject soft skill "communication"', () => {
      const result = SkillClassifier.classifySkillPhrase('communication', classificationOptions);
      expect(result.type).toBe('REJECTED');
      expect(result.sourceLocation).toBe('layer_0_soft_skill_rejection');
    });

    it('should classify HubSpot as TOOL', () => {
      const result = SkillClassifier.classifySkillPhrase('HubSpot', classificationOptions);
      expect(result.type).toBe('TOOL');
      expect(result.confidence).toBe(1.0);
    });

    it('should classify SQL as CORE_SKILL via forced skills', () => {
      const result = SkillClassifier.classifySkillPhrase('SQL', classificationOptions);
      expect(result.type).toBe('CORE_SKILL');
    });

    it('should classify Python as CORE_SKILL', () => {
      const result = SkillClassifier.classifySkillPhrase('Python', classificationOptions);
      expect(result.type).toBe('CORE_SKILL');
    });

    it('should reject too-short phrases', () => {
      const result = SkillClassifier.classifySkillPhrase('a', classificationOptions);
      expect(result.type).toBe('REJECTED');
      expect(result.evidence).toContain('too short');
    });

    it('should include evidence for all classifications', () => {
      const result = SkillClassifier.classifySkillPhrase('HubSpot', classificationOptions);
      expect(result.evidence).toBeDefined();
      expect(typeof result.evidence).toBe('string');
    });
  });

  describe('classifyBatch', () => {
    it('should classify multiple phrases into buckets', () => {
      const phrases = ['SQL', 'HubSpot', 'communication', 'lifecycle marketing'];
      const result = SkillClassifier.classifyBatch(phrases, classificationOptions);

      expect(result.coreSkills.length).toBeGreaterThan(0);
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.rejected.length).toBeGreaterThan(0);
    });

    it('should put SQL in coreSkills bucket', () => {
      const phrases = ['SQL'];
      const result = SkillClassifier.classifyBatch(phrases, classificationOptions);
      expect(result.coreSkills.some(s => s.raw === 'SQL')).toBe(true);
    });

    it('should put HubSpot in tools bucket', () => {
      const phrases = ['HubSpot'];
      const result = SkillClassifier.classifyBatch(phrases, classificationOptions);
      expect(result.tools.some(t => t.raw === 'HubSpot')).toBe(true);
    });

    it('should put "communication" in rejected bucket', () => {
      const phrases = ['communication'];
      const result = SkillClassifier.classifyBatch(phrases, classificationOptions);
      expect(result.rejected.some(r => r.raw === 'communication')).toBe(true);
    });

    it('should include confidence and evidence in each item', () => {
      const phrases = ['SQL'];
      const result = SkillClassifier.classifyBatch(phrases, classificationOptions);
      const sql = result.coreSkills.find(s => s.raw === 'SQL');
      expect(sql.confidence).toBeDefined();
      expect(sql.evidence).toBeDefined();
    });
  });
});
