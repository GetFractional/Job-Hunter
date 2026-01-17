/**
 * Job Filter - Skill Splitter Unit Tests
 *
 * Tests for the skill-splitter.js module
 * Run with: npm test
 */

// Import the module
const SkillSplitter = require('../skills/skill-splitter');

describe('SkillSplitter', () => {
  describe('splitMultiSkills', () => {
    it('should split comma-separated skills', () => {
      const result = SkillSplitter.splitMultiSkills('SQL, Python, R');
      expect(result).toContain('SQL');
      expect(result).toContain('Python');
      expect(result).toContain('R');
      expect(result.length).toBe(3);
    });

    it('should split semicolon-separated skills (highest priority)', () => {
      const result = SkillSplitter.splitMultiSkills('HubSpot; Salesforce; Marketo');
      expect(result).toContain('HubSpot');
      expect(result).toContain('Salesforce');
      expect(result).toContain('Marketo');
      expect(result.length).toBe(3);
    });

    it('should split by " and "', () => {
      const result = SkillSplitter.splitMultiSkills('lifecycle marketing and segmentation');
      expect(result).toContain('lifecycle marketing');
      expect(result).toContain('segmentation');
      expect(result.length).toBe(2);
    });

    it('should split by " or "', () => {
      const result = SkillSplitter.splitMultiSkills('Python or R');
      expect(result).toContain('Python');
      expect(result).toContain('R');
      expect(result.length).toBe(2);
    });

    it('should handle "and/or" patterns', () => {
      const result = SkillSplitter.splitMultiSkills('SQL and/or Python');
      // After handleEdgeCases converts and/or to comma
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return single skill for non-composite phrase', () => {
      const result = SkillSplitter.splitMultiSkills('lifecycle marketing');
      expect(result).toContain('lifecycle marketing');
      expect(result.length).toBe(1);
    });

    it('should return empty array for empty input', () => {
      const result = SkillSplitter.splitMultiSkills('');
      expect(result).toEqual([]);
    });

    it('should return empty array for null input', () => {
      const result = SkillSplitter.splitMultiSkills(null);
      expect(result).toEqual([]);
    });

    it('should handle mixed separators (semicolon takes priority)', () => {
      const result = SkillSplitter.splitMultiSkills('SQL, Python; R and JavaScript');
      // Semicolon splits first: ['SQL, Python', 'R and JavaScript']
      expect(result.length).toBe(2);
      expect(result[0]).toBe('SQL, Python');
    });
  });

  describe('extractParentheticalVariants', () => {
    it('should extract both main term and parenthetical content', () => {
      const result = SkillSplitter.extractParentheticalVariants('GA4 (Google Analytics 4)');
      expect(result).toContain('GA4');
      expect(result).toContain('Google Analytics 4');
      expect(result.length).toBe(2);
    });

    it('should return single item for non-parenthetical phrase', () => {
      const result = SkillSplitter.extractParentheticalVariants('SQL');
      expect(result).toEqual(['SQL']);
    });

    it('should handle nested parentheses correctly', () => {
      const result = SkillSplitter.extractParentheticalVariants('CRM (Customer Relationship Management)');
      expect(result).toContain('CRM');
      expect(result).toContain('Customer Relationship Management');
    });
  });

  describe('cleanSkillFragment', () => {
    it('should remove leading conjunctions', () => {
      expect(SkillSplitter.cleanSkillFragment('and Python')).toBe('Python');
      expect(SkillSplitter.cleanSkillFragment('or JavaScript')).toBe('JavaScript');
    });

    it('should remove trailing conjunctions', () => {
      expect(SkillSplitter.cleanSkillFragment('Python and')).toBe('Python');
    });

    it('should trim whitespace', () => {
      expect(SkillSplitter.cleanSkillFragment('  SQL  ')).toBe('SQL');
    });

    it('should remove leading punctuation', () => {
      expect(SkillSplitter.cleanSkillFragment('- Python')).toBe('Python');
      expect(SkillSplitter.cleanSkillFragment('• SQL')).toBe('SQL');
    });
  });

  describe('deduplicateSkills', () => {
    it('should remove case-insensitive duplicates', () => {
      const result = SkillSplitter.deduplicateSkills(['SQL', 'sql', 'Python', 'PYTHON']);
      expect(result.length).toBe(2);
      expect(result).toContain('SQL');
      expect(result).toContain('Python');
    });

    it('should preserve first occurrence', () => {
      const result = SkillSplitter.deduplicateSkills(['Python', 'PYTHON']);
      expect(result[0]).toBe('Python');
    });
  });

  describe('handleEdgeCases', () => {
    it('should remove year patterns', () => {
      const result = SkillSplitter.handleEdgeCases('3+ years of SQL');
      expect(result[0]).toBe('SQL');
    });

    it('should remove proficiency levels', () => {
      const result = SkillSplitter.handleEdgeCases('Excel (advanced)');
      expect(result[0]).toBe('Excel');
    });

    it('should convert and/or to comma', () => {
      const result = SkillSplitter.handleEdgeCases('SQL and/or Python');
      expect(result[0]).toContain(',');
    });
  });

  describe('splitBatch', () => {
    it('should flatten split results from multiple phrases', () => {
      const phrases = ['SQL, Python', 'JavaScript and TypeScript'];
      const result = SkillSplitter.splitBatch(phrases);
      expect(result).toContain('SQL');
      expect(result).toContain('Python');
      expect(result).toContain('JavaScript');
      expect(result).toContain('TypeScript');
    });

    it('should deduplicate across phrases', () => {
      const phrases = ['SQL, Python', 'Python, R'];
      const result = SkillSplitter.splitBatch(phrases);
      const pythonCount = result.filter(s => s.toLowerCase() === 'python').length;
      expect(pythonCount).toBe(1);
    });
  });
});
