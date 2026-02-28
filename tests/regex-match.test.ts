import { describe, it, expect } from 'vitest';
import { regexMatch, createRegexMatchEvaluator } from '../src/checks/regex-match';

describe('regexMatch', () => {
  it('passes when all patterns match (default mode)', () => {
    const result = regexMatch({
      responseText: 'Contact: user@example.com, joined 2024-01-15',
      patterns: [/\S+@\S+\.\S+/, /\d{4}-\d{2}-\d{2}/],
    });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('regex_match');
    expect(result.failedPatterns).toEqual([]);
    expect(result.details).toBe('All patterns matched');
  });

  it('fails when a pattern does not match (all mode)', () => {
    const result = regexMatch({
      responseText: 'No email here',
      patterns: [/\S+@\S+\.\S+/, /\bhere\b/],
      mode: 'all',
    });
    expect(result.passed).toBe(false);
    expect(result.failedPatterns).toHaveLength(1);
    expect(result.details).toContain('Failed patterns');
  });

  it('passes in any mode when at least one matches', () => {
    const result = regexMatch({
      responseText: 'The date is 2024-01-15',
      patterns: [/\S+@\S+/, /\d{4}-\d{2}-\d{2}/],
      mode: 'any',
    });
    expect(result.passed).toBe(true);
    expect(result.details).toBe('At least one pattern matched');
  });

  it('fails in any mode when none match', () => {
    const result = regexMatch({
      responseText: 'No matches here',
      patterns: [/\S+@\S+/, /\d{4}-\d{2}-\d{2}/],
      mode: 'any',
    });
    expect(result.passed).toBe(false);
    expect(result.details).toBe('No patterns matched');
  });

  it('accepts string patterns', () => {
    const result = regexMatch({
      responseText: 'Hello World 123',
      patterns: ['\\d+', '[A-Z]\\w+'],
    });
    expect(result.passed).toBe(true);
  });

  it('works with a single pattern', () => {
    const result = regexMatch({
      responseText: 'test@email.com',
      patterns: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/],
    });
    expect(result.passed).toBe(true);
  });
});

describe('createRegexMatchEvaluator', () => {
  it('creates a reusable evaluator', () => {
    const evaluator = createRegexMatchEvaluator({
      patterns: [/\d{4}-\d{2}-\d{2}/],
    });

    expect(evaluator({ responseText: 'Date: 2024-01-15' }).passed).toBe(true);
    expect(evaluator({ responseText: 'No date here' }).passed).toBe(false);
  });
});
