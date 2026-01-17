/**
 * Jest configuration for Job Filter Chrome Extension
 * Uses CommonJS to handle browser-style modules
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.cjs', '**/tests/**/*.test.js'],
  transform: {},
  moduleFileExtensions: ['js', 'cjs', 'json'],
  verbose: true,
  collectCoverage: false,
  testTimeout: 10000
};
