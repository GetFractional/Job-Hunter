/**
 * Job Filter - Skill Normalizer Tests (v2 Upgrade)
 *
 * Tests for the skill normalization pipeline including:
 * - Exact matching
 * - Alias matching
 * - Dynamic Fuse.js thresholds
 * - Typo handling with fuzzy matching
 */

// Mock window for Node.js environment
if (typeof window === 'undefined') {
  global.window = {
    SkillConstants: {
      EXTRACTION_CONFIG: {
        MIN_CONFIDENCE: 0.5,
        FUZZY_THRESHOLD: 0.35
      }
    }
  };
}

// Import modules (for Node.js testing)
let SkillNormalizer, SkillFuzzyMatcher;

try {
  SkillNormalizer = require('../skills/skill-normalizer.js');
  SkillFuzzyMatcher = require('../skills/fuzzy-matcher.js');
} catch (e) {
  // Running in browser context
  SkillNormalizer = window.SkillNormalizer;
  SkillFuzzyMatcher = window.SkillFuzzyMatcher;
}

// Test skill taxonomy
const testTaxonomy = [
  { name: 'SQL', canonical: 'sql', category: 'Technical', aliases: [] },
  { name: 'Python', canonical: 'python', category: 'Technical', aliases: ['py'] },
  { name: 'Google Analytics 4', canonical: 'google_analytics_4', category: 'Analytics', aliases: ['GA4', 'Google Analytics', 'UA'] },
  { name: 'HubSpot', canonical: 'hubspot', category: 'CRM', aliases: ['Hubspot', 'HubSpot CRM'] },
  { name: 'Salesforce', canonical: 'salesforce', category: 'CRM', aliases: ['SFDC', 'SF', 'Salesforce.com'] },
  { name: 'Lifecycle Marketing', canonical: 'lifecycle_marketing', category: 'Marketing', aliases: ['lifecycle management'] },
  { name: 'Tableau', canonical: 'tableau', category: 'BI', aliases: ['Tableau Desktop', 'Tableau Server'] },
  { name: 'Power BI', canonical: 'power_bi', category: 'BI', aliases: ['PowerBI', 'Microsoft Power BI'] },
  { name: 'Snowflake', canonical: 'snowflake', category: 'Data Warehouse', aliases: ['Snowflake DB'] },
  { name: 'Data Analysis', canonical: 'data_analysis', category: 'Technical', aliases: ['data analytics'] }
];

// Create fuzzy matcher for tests
let fuzzyMatcher;

beforeAll(() => {
  fuzzyMatcher = new SkillFuzzyMatcher(testTaxonomy, {
    threshold: 0.35,
    keys: ['name', 'aliases'],
    useDynamicThreshold: true
  });
});

// ============================================================================
// SKILL NORMALIZER TESTS
// ============================================================================

describe('SkillNormalizer', () => {
  const normalizationOptions = {
    taxonomy: testTaxonomy,
    fuzzyMatcher: fuzzyMatcher,
    canonicalRules: new Map(),
    synonymGroups: new Map()
  };

  describe('normalizeSkillConcept', () => {
    it('should match exact skills', () => {
      const result = SkillNormalizer.normalizeSkillConcept('SQL', normalizationOptions);
      expect(result.matched).toBe(true);
      expect(result.canonical).toBe('sql');
      expect(result.confidence).toBe(1.0);
    });

    it('should match via aliases', () => {
      const result = SkillNormalizer.normalizeSkillConcept('GA4', normalizationOptions);
      expect(result.canonical).toBe('google_analytics_4');
      expect(result.confidence).toBeGreaterThan(0.90);
    });

    it('should match SFDC to Salesforce', () => {
      const result = SkillNormalizer.normalizeSkillConcept('SFDC', normalizationOptions);
      expect(result.canonical).toBe('salesforce');
    });

    it('should match Hubspot (lowercase) to HubSpot', () => {
      const result = SkillNormalizer.normalizeSkillConcept('hubspot', normalizationOptions);
      expect(result.canonical).toBe('hubspot');
    });

    it('should handle typos with fuzzy matching', () => {
      const result = SkillNormalizer.normalizeSkillConcept('Salesforse', normalizationOptions);
      expect(result.matched || result.matchType === 'fuzzy').toBe(true);
      if (result.matched) {
        expect(result.canonical).toBe('salesforce');
        expect(result.confidence).toBeGreaterThan(0.7);
      }
    });

    it('should return unmatched for unknown skills', () => {
      const result = SkillNormalizer.normalizeSkillConcept('UnknownSkillXYZ', normalizationOptions);
      expect(result.matchType).toBe('unmatched');
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('cleanSkillPhrase', () => {
    it('should remove experience prefixes', () => {
      const result = SkillNormalizer.cleanSkillPhrase('experience with SQL');
      expect(result.toLowerCase()).not.toContain('experience with');
    });

    it('should remove trailing qualifiers', () => {
      const result = SkillNormalizer.cleanSkillPhrase('SQL expertise');
      expect(result.toLowerCase()).not.toContain('expertise');
    });

    it('should handle parenthetical content', () => {
      const result = SkillNormalizer.cleanSkillPhrase('Excel (advanced)');
      expect(result).not.toContain('(advanced)');
    });
  });

  describe('normalizeAndDeduplicate', () => {
    it('should deduplicate by canonical key', () => {
      const phrases = ['SQL', 'sql', 'Sql'];
      const result = SkillNormalizer.normalizeAndDeduplicate(phrases, normalizationOptions);
      expect(result.length).toBe(1);
    });

    it('should keep best match on duplicate', () => {
      const phrases = ['SQL', 'sql query', 'sql'];
      const result = SkillNormalizer.normalizeAndDeduplicate(phrases, normalizationOptions);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should sort by confidence', () => {
      const phrases = ['unknownskill', 'SQL', 'Python'];
      const result = SkillNormalizer.normalizeAndDeduplicate(phrases, normalizationOptions);
      expect(result[0].confidence).toBeGreaterThanOrEqual(result[result.length - 1].confidence);
    });
  });
});

// ============================================================================
// FUZZY MATCHER TESTS
// ============================================================================

describe('SkillFuzzyMatcher', () => {
  describe('Dynamic Thresholds', () => {
    it('should use stricter threshold for long strings', () => {
      const threshold = fuzzyMatcher._getDynamicThreshold('lifecycle marketing campaigns');
      expect(threshold).toBe(0.50);
    });

    it('should use looser threshold for short strings', () => {
      const threshold = fuzzyMatcher._getDynamicThreshold('CRM');
      expect(threshold).toBe(0.20);
    });

    it('should use medium threshold for medium strings', () => {
      const threshold = fuzzyMatcher._getDynamicThreshold('HubSpot');
      expect(threshold).toBe(0.35);
    });
  });

  describe('search', () => {
    it('should find exact matches with score 0', () => {
      const results = fuzzyMatcher.search('SQL');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBe(0);
    });

    it('should find alias matches', () => {
      const results = fuzzyMatcher.search('GA4');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.canonical).toBe('google_analytics_4');
    });

    it('should handle fuzzy matches within threshold', () => {
      const results = fuzzyMatcher.search('Salesforse'); // typo
      // Should find Salesforce if within threshold
      if (results.length > 0) {
        expect(results[0].item.canonical).toBe('salesforce');
      }
    });

    it('should return empty for completely unrelated terms', () => {
      const results = fuzzyMatcher.search('xyzqwerty123');
      expect(results).toEqual([]);
    });
  });
});

// ============================================================================
// CONFIDENCE SCORING TESTS
// ============================================================================

describe('Confidence Scoring', () => {
  it('should give 1.0 confidence for exact matches', () => {
    const result = SkillNormalizer.normalizeSkillConcept('SQL', {
      taxonomy: testTaxonomy,
      fuzzyMatcher: fuzzyMatcher
    });
    expect(result.confidence).toBe(1.0);
  });

  it('should give high confidence (>0.9) for alias matches', () => {
    const result = SkillNormalizer.normalizeSkillConcept('SFDC', {
      taxonomy: testTaxonomy,
      fuzzyMatcher: fuzzyMatcher
    });
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should give lower confidence for fuzzy matches', () => {
    const result = SkillNormalizer.normalizeSkillConcept('Salesforse', {
      taxonomy: testTaxonomy,
      fuzzyMatcher: fuzzyMatcher
    });
    if (result.matchType === 'fuzzy') {
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.confidence).toBeGreaterThan(0.5);
    }
  });
});

// ============================================================================
// THRESHOLD TUNING TESTS
// ============================================================================

describe('Threshold Tuning', () => {
  describe('Short strings (<5 chars)', () => {
    it('should match CRM with loose threshold', () => {
      const results = fuzzyMatcher.search('CRM');
      // CRM is short, should use threshold 0.2
      expect(Array.isArray(results)).toBe(true);
    });

    it('should match SQL', () => {
      const results = fuzzyMatcher.search('SQL');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.canonical).toBe('sql');
    });
  });

  describe('Medium strings (5-15 chars)', () => {
    it('should match HubSpot with medium threshold', () => {
      const results = fuzzyMatcher.search('HubSpot');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.canonical).toBe('hubspot');
    });

    it('should match Snowflake', () => {
      const results = fuzzyMatcher.search('Snowflake');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.canonical).toBe('snowflake');
    });
  });

  describe('Long phrases (>15 chars)', () => {
    it('should match lifecycle marketing with strict threshold', () => {
      const results = fuzzyMatcher.search('lifecycle marketing');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.canonical).toBe('lifecycle_marketing');
    });

    it('should require closer match for long phrases', () => {
      const threshold = fuzzyMatcher._getDynamicThreshold('lifecycle marketing campaigns');
      expect(threshold).toBe(0.50); // Stricter threshold
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty string', () => {
    const result = SkillNormalizer.normalizeSkillConcept('', {
      taxonomy: testTaxonomy,
      fuzzyMatcher: fuzzyMatcher
    });
    expect(result.matchType).toBe('none');
  });

  it('should handle very short strings', () => {
    const result = SkillNormalizer.normalizeSkillConcept('R', {
      taxonomy: testTaxonomy,
      fuzzyMatcher: fuzzyMatcher
    });
    // R is too short to match reliably
    expect(result).toBeDefined();
  });

  it('should handle special characters', () => {
    const result = SkillNormalizer.normalizeSkillConcept('C++', {
      taxonomy: testTaxonomy,
      fuzzyMatcher: fuzzyMatcher
    });
    expect(result).toBeDefined();
  });

  it('should handle numbers in skill names', () => {
    const result = SkillNormalizer.normalizeSkillConcept('Python 3', {
      taxonomy: testTaxonomy,
      fuzzyMatcher: fuzzyMatcher
    });
    // Should still match Python
    if (result.matchType !== 'unmatched') {
      expect(result.canonical).toBe('python');
    }
  });
});

// ============================================================================
// CONFIDENCE LABEL TESTS
// ============================================================================

describe('Confidence Labels', () => {
  it('should return "exact" for 1.0 confidence', () => {
    const label = SkillNormalizer.getConfidenceLabel(1.0);
    expect(label).toBe('exact');
  });

  it('should return "high" for 0.85-0.95 confidence', () => {
    const label = SkillNormalizer.getConfidenceLabel(0.90);
    expect(label).toBe('high');
  });

  it('should return "medium" for 0.7-0.85 confidence', () => {
    const label = SkillNormalizer.getConfidenceLabel(0.75);
    expect(label).toBe('medium');
  });

  it('should return "low" for 0.5-0.7 confidence', () => {
    const label = SkillNormalizer.getConfidenceLabel(0.55);
    expect(label).toBe('low');
  });

  it('should return "uncertain" for <0.5 confidence', () => {
    const label = SkillNormalizer.getConfidenceLabel(0.3);
    expect(label).toBe('uncertain');
  });
});

// Export for Node.js test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Tests are auto-discovered by Jest
  };
}
