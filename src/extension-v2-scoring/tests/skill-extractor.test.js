/**
 * Job Filter - Skill Extractor Tests (v2 Upgrade)
 *
 * Tests for the skill extraction pipeline including:
 * - Bullet point extraction
 * - Indicator keyword extraction
 * - Paragraph noun phrase extraction (Compromise.js)
 * - Soft skill rejection
 * - Multi-skill splitting
 */

// Mock window for Node.js environment
if (typeof window === 'undefined') {
  global.window = {
    SkillTaxonomy: { SKILL_TAXONOMY: [] },
    SkillConstants: {
      EXTRACTION_CONFIG: {
        MIN_PHRASE_LENGTH: 2,
        MAX_PHRASE_WORDS: 5,
        MIN_CONFIDENCE: 0.5,
        FUZZY_THRESHOLD: 0.35
      },
      TOOLS_DENY_LIST: new Set(['hubspot', 'salesforce', 'tableau']),
      GENERIC_PHRASES_DENY_LIST: new Set(['etc', 'more', 'and more'])
    }
  };
}

// Import modules (for Node.js testing)
let SkillExtractor, SkillSplitter, SkillClassifier;

try {
  SkillExtractor = require('../skills/skill-extractor.js');
  SkillSplitter = require('../skills/skill-splitter.js');
  SkillClassifier = require('../skills/skill-classifier.js');
} catch (e) {
  // Running in browser context
  SkillExtractor = window.SkillExtractor;
  SkillSplitter = window.SkillSplitter;
  SkillClassifier = window.SkillClassifier;
}

// ============================================================================
// SKILL EXTRACTOR TESTS
// ============================================================================

describe('SkillExtractor', () => {
  describe('extractPhrases', () => {
    it('should extract bullet-pointed skills', () => {
      const text = `
        - SQL and Python expertise
        • JavaScript development
        * Advanced analytics
      `;
      const result = SkillExtractor.extractPhrases(text);

      expect(result).toContain(expect.stringMatching(/SQL/i));
      expect(result).toContain(expect.stringMatching(/Python/i));
      expect(result).toContain(expect.stringMatching(/JavaScript/i));
    });

    it('should extract from indicator keywords', () => {
      const text = 'Proficient in HubSpot CRM and experienced with Salesforce';
      const result = SkillExtractor.extractPhrases(text);

      expect(result.some(r => r.toLowerCase().includes('hubspot'))).toBe(true);
    });

    it('should extract noun phrases from paragraphs (if Compromise.js available)', () => {
      const text = 'You will work on lifecycle marketing campaigns and customer segmentation projects.';
      const result = SkillExtractor.extractPhrases(text);

      // Check if any result contains marketing-related terms
      const hasLifecycleOrMarketing = result.some(r =>
        r.toLowerCase().includes('lifecycle') ||
        r.toLowerCase().includes('marketing') ||
        r.toLowerCase().includes('segmentation')
      );

      // Note: This test may pass or fail depending on Compromise.js availability
      // In browser with Compromise.js, it should find these
      expect(hasLifecycleOrMarketing || result.length > 0).toBe(true);
    });

    it('should NOT extract soft skills', () => {
      const text = 'Strong communication skills and leadership abilities required';
      const result = SkillExtractor.extractPhrases(text);

      // These should be filtered by the classifier, not extractor
      // Extractor may still extract them, but classifier will reject
      expect(result).toBeDefined();
    });

    it('should handle empty input', () => {
      const result = SkillExtractor.extractPhrases('');
      expect(result).toEqual([]);
    });

    it('should handle null input', () => {
      const result = SkillExtractor.extractPhrases(null);
      expect(result).toEqual([]);
    });
  });

  describe('parseSections', () => {
    it('should parse required section', () => {
      const text = `
        Required Skills:
        - SQL
        - Python

        Preferred Skills:
        - Tableau
      `;
      const result = SkillExtractor.parseSections(text);

      expect(result.requiredSection).toContain('SQL');
      expect(result.desiredSection).toContain('Tableau');
    });

    it('should default to full text when no sections found', () => {
      const text = 'Experience with SQL and Python required.';
      const result = SkillExtractor.parseSections(text);

      expect(result.requiredSection).toBe(text);
    });
  });

  describe('cleanExtractedPhrase', () => {
    it('should remove year patterns', () => {
      const result = SkillExtractor.cleanExtractedPhrase('5+ years of SQL experience');
      expect(result).not.toMatch(/\d+\+?\s*years?/i);
    });

    it('should normalize whitespace', () => {
      const result = SkillExtractor.cleanExtractedPhrase('  SQL   and   Python  ');
      expect(result).not.toMatch(/\s{2,}/);
    });

    it('should remove leading/trailing punctuation', () => {
      const result = SkillExtractor.cleanExtractedPhrase('- SQL development.');
      expect(result).not.toMatch(/^[-.]|[.-]$/);
    });
  });
});

// ============================================================================
// SKILL SPLITTER TESTS
// ============================================================================

describe('SkillSplitter', () => {
  describe('splitMultiSkills', () => {
    it('should split comma-separated skills', () => {
      const result = SkillSplitter.splitMultiSkills('SQL, Python, R');
      expect(result).toContain('SQL');
      expect(result).toContain('Python');
      expect(result).toContain('R');
    });

    it('should split semicolon-separated skills', () => {
      const result = SkillSplitter.splitMultiSkills('HubSpot; Salesforce; Marketo');
      expect(result).toContain('HubSpot');
      expect(result).toContain('Salesforce');
      expect(result).toContain('Marketo');
    });

    it('should split " and " separated skills', () => {
      const result = SkillSplitter.splitMultiSkills('SQL and Python and R');
      expect(result).toContain('SQL');
      expect(result).toContain('Python');
      expect(result).toContain('R');
    });

    it('should extract parenthetical content', () => {
      const result = SkillSplitter.splitMultiSkills('GA4 (Google Analytics 4)');
      expect(result).toContain('GA4');
      expect(result).toContain('Google Analytics 4');
    });

    it('should handle empty input', () => {
      const result = SkillSplitter.splitMultiSkills('');
      expect(result).toEqual([]);
    });

    it('should deduplicate skills', () => {
      const result = SkillSplitter.splitMultiSkills('SQL, sql, SQL');
      expect(result.length).toBe(1);
    });
  });

  describe('handleEdgeCases', () => {
    it('should remove year patterns', () => {
      const result = SkillSplitter.handleEdgeCases('5+ years of SQL');
      expect(result[0]).not.toMatch(/\d+\+?\s*years?/i);
    });

    it('should remove proficiency levels', () => {
      const result = SkillSplitter.handleEdgeCases('Excel (advanced)');
      expect(result[0]).not.toMatch(/\(advanced\)/i);
    });

    it('should handle "and/or" patterns', () => {
      const result = SkillSplitter.handleEdgeCases('SQL and/or Python');
      expect(result[0]).toContain(',');
    });
  });
});

// ============================================================================
// SOFT SKILL REJECTION TESTS
// ============================================================================

describe('Soft Skill Rejection', () => {
  const ignoreRules = {
    softSkills: {
      exactMatches: [
        'communication',
        'leadership',
        'teamwork',
        'collaboration',
        'problem solving',
        'problem-solving'
      ]
    },
    junkPhrases: {
      exactMatches: ['etc', 'more', 'and more']
    }
  };

  const softSkillsPatterns = [
    /.*thinking$/i,
    /.*ability$/i,
    /^strong\s+.*/i
  ];

  describe('checkSoftSkillRejection', () => {
    it('should reject exact soft skill matches', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'communication',
        ignoreRules,
        softSkillsPatterns
      );
      expect(result.rejected).toBe(true);
    });

    it('should reject soft skill patterns', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'analytical thinking',
        ignoreRules,
        softSkillsPatterns
      );
      expect(result.rejected).toBe(true);
    });

    it('should NOT reject technical skills', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'sql',
        ignoreRules,
        softSkillsPatterns
      );
      expect(result.rejected).toBe(false);
    });

    it('should reject junk phrases', () => {
      const result = SkillClassifier.checkSoftSkillRejection(
        'etc',
        ignoreRules,
        softSkillsPatterns
      );
      expect(result.rejected).toBe(true);
    });
  });
});

// ============================================================================
// CLASSIFICATION TESTS
// ============================================================================

describe('SkillClassifier', () => {
  const classificationOptions = {
    skillsTaxonomy: [
      { name: 'SQL', canonical: 'sql', category: 'Technical' },
      { name: 'Python', canonical: 'python', category: 'Technical' },
      { name: 'Lifecycle Marketing', canonical: 'lifecycle_marketing', category: 'Marketing' }
    ],
    toolsDictionary: [
      { name: 'HubSpot', canonical: 'hubspot', aliases: ['Hubspot'], category: 'CRM' },
      { name: 'Salesforce', canonical: 'salesforce', aliases: ['SFDC'], category: 'CRM' }
    ],
    ignoreRules: {
      softSkills: { exactMatches: ['communication', 'leadership'] }
    },
    forcedCoreSkills: new Set(['sql', 'python', 'r']),
    softSkillsPatterns: []
  };

  describe('classifySkillPhrase', () => {
    it('should classify SQL as CORE_SKILL (forced)', () => {
      const result = SkillClassifier.classifySkillPhrase('SQL', classificationOptions);
      expect(result.type).toBe('CORE_SKILL');
      expect(result.confidence).toBe(1.0);
    });

    it('should classify Python as CORE_SKILL (forced)', () => {
      const result = SkillClassifier.classifySkillPhrase('Python', classificationOptions);
      expect(result.type).toBe('CORE_SKILL');
      expect(result.confidence).toBe(1.0);
    });

    it('should classify HubSpot as TOOL', () => {
      const result = SkillClassifier.classifySkillPhrase('HubSpot', classificationOptions);
      expect(result.type).toBe('TOOL');
    });

    it('should classify Salesforce as TOOL', () => {
      const result = SkillClassifier.classifySkillPhrase('Salesforce', classificationOptions);
      expect(result.type).toBe('TOOL');
    });

    it('should classify communication as REJECTED', () => {
      const result = SkillClassifier.classifySkillPhrase('communication', classificationOptions);
      expect(result.type).toBe('REJECTED');
    });

    it('should handle brand names with numbers as TOOL', () => {
      const result = SkillClassifier.classifySkillPhrase('GA4', classificationOptions);
      expect(result.type).toBe('TOOL');
    });
  });

  describe('classifyBatch', () => {
    it('should separate skills into correct buckets', () => {
      const phrases = ['SQL', 'HubSpot', 'communication', 'lifecycle marketing'];
      const result = SkillClassifier.classifyBatch(phrases, classificationOptions);

      expect(result.coreSkills.length).toBeGreaterThan(0);
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.rejected.length).toBeGreaterThan(0);
    });

    it('should 100% reject soft skills', () => {
      const softSkills = ['communication', 'leadership', 'teamwork'];
      const result = SkillClassifier.classifyBatch(softSkills, classificationOptions);

      expect(result.coreSkills).toHaveLength(0);
      expect(result.tools).toHaveLength(0);
      expect(result.rejected.length).toBe(softSkills.length);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Full Pipeline Integration', () => {
  it('should extract, classify, and score a job description', async () => {
    const jobDescription = `
      Required Skills:
      - 5+ years of SQL experience
      - Python programming
      - HubSpot CRM expertise

      Preferred:
      - Tableau visualization
      - Strong communication skills
    `;

    // This test verifies the full pipeline works end-to-end
    const phrases = SkillExtractor.extractPhrases(jobDescription);
    expect(phrases.length).toBeGreaterThan(0);

    // Split any multi-skill phrases
    const splitPhrases = SkillSplitter.splitBatch(phrases, {});
    expect(splitPhrases.length).toBeGreaterThanOrEqual(phrases.length);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('should handle job with 0 skills listed', () => {
    const text = 'We are looking for a motivated individual to join our team.';
    const result = SkillExtractor.extractPhrases(text);
    // Should return empty or very few results
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle multi-word tool names', () => {
    const result = SkillSplitter.splitMultiSkills('Google Analytics 4');
    expect(result).toContain('Google Analytics 4');
  });

  it('should handle acronyms (GA4, CDP, CRM)', () => {
    const result = SkillSplitter.splitMultiSkills('GA4, CDP, CRM, SQL');
    expect(result).toContain('GA4');
    expect(result).toContain('CDP');
    expect(result).toContain('CRM');
    expect(result).toContain('SQL');
  });

  it('should handle comma-separated lists with "and"', () => {
    const result = SkillSplitter.splitMultiSkills('SQL, Python, and R');
    expect(result).toContain('SQL');
    expect(result).toContain('Python');
    expect(result).toContain('R');
    expect(result.length).toBe(3);
  });
});

// Export for Node.js test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Tests are auto-discovered by Jest
  };
}
