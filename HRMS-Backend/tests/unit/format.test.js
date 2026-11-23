const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const format = require('../../src/utils/format');

describe('Format Utility Unit Tests', () => {
  it('should format currency in Indian Rupees format', () => {
    const formatted = format.currency(50000);
    assert.ok(formatted.includes('50,000'), `Expected ₹50,000.00, got ${formatted}`);
  });

  it('should convert number into currency words', () => {
    const words = format.toWords(15000);
    assert.ok(words.toLowerCase().includes('fifteen thousand'), `Expected 'Fifteen Thousand', got ${words}`);
  });

  it('should format dates to medium string safely', () => {
    const formatted = format.date('2026-05-15');
    assert.ok(formatted.length > 0);
  });
});
