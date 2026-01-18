/**
 * Job Filter - Skill Extractor Unit Tests
 *
 * Tests for the skill-extractor.js module (v2).
 */

const SkillExtractor = require('../skills/skill-extractor');

const buildMockNlp = () => (text) => ({
  nouns: () => [
    {
      text: () => (text.includes('lifecycle marketing') ? 'lifecycle marketing' : '')
    },
    {
      text: () => (text.includes('customer segmentation') ? 'customer segmentation' : '')
    }
  ].filter(noun => noun.text()),
  match: () => ({
    forEach: () => {}
  })
});

const buildMockClassifier = () => ({
  loadToolsDictionary: async () => [],
  loadIgnoreRules: async () => ({
    softSkills: { exactMatches: ['communication', 'leadership'] },
    junkPhrases: { exactMatches: [] },
    degreeAndEducation: { exactMatches: [] },
    tooGeneric: { exactMatches: [] }
  }),
  classifyBatch: (phrases, options) => {
    const coreSkills = [];
    const tools = [];
    const candidates = [];
    const rejected = [];
    const softPatterns = options.softSkillsPatterns || [];
    const softExact = options.ignoreRules?.softSkills?.exactMatches || [];

    phrases.forEach((phrase) => {
      const lower = String(phrase || '').toLowerCase();
      const isSoft =
        softExact.includes(lower) ||
        softPatterns.some(pattern => pattern.test(lower));

      if (isSoft) {
        rejected.push({
          raw: phrase,
          reason: 'Soft skill'
        });
        return;
      }

      if (lower.includes('hubspot')) {
        tools.push({
          raw: phrase,
          canonical: 'hubspot',
          confidence: 0.9,
          evidence: 'Tool dictionary match',
          sourceLocation: 'test'
        });
        return;
      }

      if (lower.includes('sql')) {
        coreSkills.push({
          raw: phrase,
          canonical: 'sql',
          confidence: 1.0,
          evidence: 'Forced core skill',
          sourceLocation: 'test'
        });
        return;
      }

      if (lower.includes('python')) {
        coreSkills.push({
          raw: phrase,
          canonical: 'python',
          confidence: 1.0,
          evidence: 'Forced core skill',
          sourceLocation: 'test'
        });
        return;
      }

      candidates.push({
        raw: phrase,
        inferredType: 'UNKNOWN',
        confidence: 0.4,
        evidence: 'Unclassified phrase',
        sourceLocation: 'test'
      });
    });

    return {
      coreSkills,
      tools,
      candidates,
      rejected
    };
  }
});

beforeEach(() => {
  global.window = {
    nlp: buildMockNlp(),
    SkillConstants: {
      FORCED_CORE_SKILLS: new Set(['sql', 'python']),
      SOFT_SKILLS_PATTERNS: [/communication/i, /leadership/i]
    },
    SkillTaxonomy: {
      SKILL_TAXONOMY: []
    },
    SkillSplitter: {
      splitMultiSkills: (phrase) => {
        if (!phrase || typeof phrase !== 'string') return [];
        return phrase.split(/\s+and\s+/i).map(part => part.trim()).filter(Boolean);
      }
    },
    SkillClassifier: buildMockClassifier()
  };
});

afterEach(() => {
  delete global.window;
});

describe('SkillExtractor', () => {
  it('should extract bullet-pointed skills', () => {
    const text = '- SQL and Python expertise\n• JavaScript development\n* Advanced analytics';
    const phrases = SkillExtractor.extractPhrases(text);
    expect(phrases).toEqual(
      expect.arrayContaining([
        'SQL',
        'Python expertise',
        'JavaScript development',
        'Advanced analytics'
      ])
    );
  });

  it('should extract from indicator keywords', () => {
    const text = 'Experience with HubSpot CRM and Salesforce';
    const phrases = SkillExtractor.extractPhrases(text);
    expect(phrases).toEqual(expect.arrayContaining(['HubSpot CRM', 'Salesforce']));
  });

  it('should extract noun phrases from paragraphs', () => {
    const text = 'You will work on lifecycle marketing campaigns and customer segmentation projects.';
    const phrases = SkillExtractor.extractPhrases(text);
    expect(phrases.map(p => p.toLowerCase())).toEqual(
      expect.arrayContaining(['lifecycle marketing', 'customer segmentation'])
    );
  });

  it('should NOT extract soft skills into output buckets', async () => {
    const text = 'Strong communication skills and leadership abilities required';
    const result = await SkillExtractor.extractAndClassifySkills(text);
    const combined = [
      ...result.requiredCoreSkills,
      ...result.desiredCoreSkills,
      ...result.requiredTools,
      ...result.desiredTools,
      ...result.candidates
    ].map(item => item.raw || item.canonical);

    expect(combined.map(v => String(v).toLowerCase())).not.toContain('communication');
    expect(combined.map(v => String(v).toLowerCase())).not.toContain('leadership');
    expect(result.rejected.length).toBeGreaterThanOrEqual(1);
  });
});
