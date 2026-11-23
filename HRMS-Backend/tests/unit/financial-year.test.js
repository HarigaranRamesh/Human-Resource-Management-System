const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const financialYear = require('../../src/utils/financial-year');

describe('Financial Year Utility Tests', () => {
  it('should return correct FY for month after March (e.g. April 2026 -> 26-27)', () => {
    const fy = financialYear('2026-04-15');
    assert.equal(fy, '26-27');
  });

  it('should return correct FY for month before April (e.g. January 2026 -> 25-26)', () => {
    const fy = financialYear('2026-01-10');
    assert.equal(fy, '25-26');
  });

  it('should return correct FY for March (last month of FY: March 2026 -> 25-26)', () => {
    const fy = financialYear('2026-03-31');
    assert.equal(fy, '25-26');
  });

  it('should return correct FY for December (Dec 2026 -> 26-27)', () => {
    const fy = financialYear('2026-12-25');
    assert.equal(fy, '26-27');
  });
});
