/**
 * Job Filter - Skill Normalizer Unit Tests
 *
 * Tests for the skill-normalizer.js module with dynamic thresholds
 * Run with: npm test
 */

// Import the module
const SkillNormalizer = require('../skills/skill-normalizer');

// Mock taxonomy for testing
const testTaxonomy = [
  { name: 'SQL', canonical: 'sql', aliases: ['structured query language'], category: 'Technical' },
  { name: 'Python', canonical: 'python', aliases: ['py'], category: 'Programming' },
  { name: 'HubSpot', canonical: 'hubspot', aliases: ['hub spot'], category: 'Marketing Automation' },
  { name: 'Salesforce', canonical: 'salesforce', aliases: ['sfdc', 'sf'], category: 'CRM' },
  { name: 'Google Analytics 4', canonical: 'google_analytics_4', aliases: ['ga4', 'google analytics'], category: 'Analytics' },
  { name: 'lifecycle marketing', canonical: 'lifecycle_marketing', aliases: ['lifecycle'], category: 'Marketing' },
  { name: 'data analysis', canonical: 'data_analysis', aliases: ['data analytics'], category: 'Analytics' }
];

// Mock SKILL_ALIASES
const mockAliases = new Map([
  ['ga4', 'google analytics 4'],
  ['sfdc', 'salesforce'],
  ['sf', 'salesforce'],
  ['py', 'python'],
  ['cro', 'conversion rate optimization']
]);

// Setup global mocks before tests
beforeAll(() => {
  global.window = {
    SkillConstants: {
      SKILL_ALIASES: mockAliases,
      EXTRACTION_CONFIG: {
        FUZZY_THRESHOLD: 0.35,
        MIN_CONFIDENCE: 0.5
      }
    }
  };
});

describe('SkillNormalizer', () => {
  describe('getDynamicFuseOptions', () => {
    it('should use strict threshold for short strings (<5 chars)', () => {
      const options = SkillNormalizer.getDynamicFuseOptions('SQL');
      expect(options.threshold).toBe(0.2);
      expect(options.ignoreLocation).toBe(true);
    });

    it('should use strict threshold for GA4', () => {
      const options = SkillNormalizer.getDynamicFuseOptions('GA4');
      expect(options.threshold).toBe(0.2);
    });

    it('should use balanced threshold for medium strings (5-15 chars)', () => {
      const options = SkillNormalizer.getDynamicFuseOptions('HubSpot');
      expect(options.threshold).toBe(0.35);
      expect(options.ignoreLocation).toBe(true);
    });

    it('should use balanced threshold for Snowflake', () => {
      const options = SkillNormalizer.getDynamicFuseOptions('Snowflake');
      expect(options.threshold).toBe(0.35);
    });

    it('should use loose threshold for long phrases (>15 chars)', () => {
      const options = SkillNormalizer.getDynamicFuseOptions('lifecycle marketing strategy');
      expect(options.threshold).toBe(0.50);
      expect(options.ignoreLocation).toBe(false);
    });

    it('should handle empty string', () => {
      const options = SkillNormalizer.getDynamicFuseOptions('');
      expect(options.threshold).toBe(0.2); // Empty = 0 chars = short
    });
  });

  describe('resolveAlias', () => {
    it('should resolve GA4 to Google Analytics 4', () => {
      const result = SkillNormalizer.resolveAlias('ga4');
      expect(result).not.toBeNull();
      expect(result.resolvedTo).toBe('google analytics 4');
      expect(result.matchType).toBe('alias');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should resolve SFDC to Salesforce', () => {
      const result = SkillNormalizer.resolveAlias('sfdc');
      expect(result).not.toBeNull();
      expect(result.resolvedTo).toBe('salesforce');
    });

    it('should return null for non-aliased phrase', () => {
      const result = SkillNormalizer.resolveAlias('unknown skill');
      expect(result).toBeNull();
    });

    it('should be case-insensitive', () => {
      const result = SkillNormalizer.resolveAlias('GA4');
      expect(result).not.toBeNull();
      expect(result.resolvedTo).toBe('google analytics 4');
    });
  });

  describe('cleanSkillPhrase', () => {
    it('should convert to lowercase', () => {
      expect(SkillNormalizer.cleanSkillPhrase('SQL')).toBe('sql');
    });

    it('should remove "experience in" prefix', () => {
      expect(SkillNormalizer.cleanSkillPhrase('experience in Python')).toBe('python');
    });

    it('should remove "proficiency in" prefix', () => {
      expect(SkillNormalizer.cleanSkillPhrase('proficiency in SQL')).toBe('sql');
    });

    it('should remove trailing "skills"', () => {
      expect(SkillNormalizer.cleanSkillPhrase('Python skills')).toBe('python');
    });

    it('should remove trailing "experience"', () => {
      expect(SkillNormalizer.cleanSkillPhrase('SQL experience')).toBe('sql');
    });

    it('should normalize whitespace', () => {
      expect(SkillNormalizer.cleanSkillPhrase('  SQL   Python  ')).toBe('sql python');
    });

    it('should remove parenthetical content', () => {
      expect(SkillNormalizer.cleanSkillPhrase('Excel (advanced)')).toBe('excel');
    });
  });

  describe('toCanonicalKey', () => {
    it('should convert to lowercase', () => {
      expect(SkillNormalizer.toCanonicalKey('SQL')).toBe('sql');
    });

    it('should replace spaces with underscores', () => {
      expect(SkillNormalizer.toCanonicalKey('lifecycle marketing')).toBe('lifecycle_marketing');
    });

    it('should remove special characters', () => {
      expect(SkillNormalizer.toCanonicalKey('C#')).toBe('c');
      expect(SkillNormalizer.toCanonicalKey('Node.js')).toBe('nodejs');
    });

    it('should handle empty string', () => {
      expect(SkillNormalizer.toCanonicalKey('')).toBe('');
    });

    it('should handle null', () => {
      expect(SkillNormalizer.toCanonicalKey(null)).toBe('');
    });
  });

  describe('normalizeSkillConcept', () => {
    const options = {
      taxonomy: testTaxonomy,
      canonicalRules: new Map(),
      synonymGroups: new Map(),
      fuzzyMatcher: null
    };

    it('should find exact match in taxonomy', () => {
      const result = SkillNormalizer.normalizeSkillConcept('SQL', options);
      expect(result.matchType).toBe('exact');
      expect(result.normalized).toBe('SQL');
      expect(result.confidence).toBe(1.0);
    });

    it('should find alias match', () => {
      const result = SkillNormalizer.normalizeSkillConcept('ga4', options);
      expect(result.matchType).toBe('alias');
      expect(result.evidence).toContain('Alias match');
    });

    it('should return unmatched for unknown skill', () => {
      const result = SkillNormalizer.normalizeSkillConcept('unknown_skill_xyz', options);
      expect(result.matchType).toBe('unmatched');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should reject too-short phrases', () => {
      const result = SkillNormalizer.normalizeSkillConcept('a', options);
      expect(result.matchType).toBe('none');
      expect(result.confidence).toBe(0);
    });

    it('should include evidence in result', () => {
      const result = SkillNormalizer.normalizeSkillConcept('SQL', options);
      expect(result.evidence).toBeDefined();
      expect(typeof result.evidence).toBe('string');
    });
  });

  describe('normalizeAndDeduplicate', () => {
    const options = {
      taxonomy: testTaxonomy,
      canonicalRules: new Map(),
      synonymGroups: new Map(),
      fuzzyMatcher: null
    };

    it('should normalize and deduplicate skill list', () => {
      const phrases = ['SQL', 'sql', 'Python', 'python'];
      const result = SkillNormalizer.normalizeAndDeduplicate(phrases, options);
      // Should only have 2 unique skills
      expect(result.length).toBe(2);
    });

    it('should sort by confidence (highest first)', () => {
      const phrases = ['SQL', 'unknown_skill_xyz'];
      const result = SkillNormalizer.normalizeAndDeduplicate(phrases, options);
      expect(result[0].confidence).toBeGreaterThan(result[1].confidence);
    });

    it('should include original phrase in result', () => {
      const phrases = ['SQL'];
      const result = SkillNormalizer.normalizeAndDeduplicate(phrases, options);
      expect(result[0].original).toBe('SQL');
    });

    it('should skip null/undefined entries', () => {
      const phrases = ['SQL', null, undefined, 'Python'];
      const result = SkillNormalizer.normalizeAndDeduplicate(phrases, options);
      expect(result.length).toBe(2);
    });
  });

  describe('getConfidenceLabel', () => {
    it('should return "exact" for confidence >= 0.95', () => {
      expect(SkillNormalizer.getConfidenceLabel(1.0)).toBe('exact');
      expect(SkillNormalizer.getConfidenceLabel(0.95)).toBe('exact');
    });

    it('should return "high" for confidence >= 0.85', () => {
      expect(SkillNormalizer.getConfidenceLabel(0.90)).toBe('high');
      expect(SkillNormalizer.getConfidenceLabel(0.85)).toBe('high');
    });

    it('should return "medium" for confidence >= 0.7', () => {
      expect(SkillNormalizer.getConfidenceLabel(0.75)).toBe('medium');
    });

    it('should return "low" for confidence >= 0.5', () => {
      expect(SkillNormalizer.getConfidenceLabel(0.55)).toBe('low');
    });

    it('should return "uncertain" for confidence < 0.5', () => {
      expect(SkillNormalizer.getConfidenceLabel(0.3)).toBe('uncertain');
    });
  });
});
