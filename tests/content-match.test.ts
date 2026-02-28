import { describe, it, expect } from 'vitest';
import { contentMatch, createContentMatchEvaluator } from '../src/checks/content-match';

describe('contentMatch', () => {
  it('passes when all required strings are found', () => {
    const result = contentMatch({
      responseText: 'Your portfolio has 15 holdings worth $50,000',
      mustContain: ['portfolio', 'holdings'],
    });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('content_match');
    expect(result.missing).toEqual([]);
  });

  it('is case-insensitive', () => {
    const result = contentMatch({
      responseText: 'PORTFOLIO has Holdings',
      mustContain: ['portfolio', 'holdings'],
    });
    expect(result.passed).toBe(true);
  });

  it('fails when strings are missing', () => {
    const result = contentMatch({
      responseText: 'Your portfolio is diversified',
      mustContain: ['portfolio', 'allocation', 'bonds'],
    });
    expect(result.passed).toBe(false);
    expect(result.missing).toEqual(['allocation', 'bonds']);
    expect(result.details).toContain('Missing: allocation, bonds');
  });

  it('passes vacuously when mustContain is empty', () => {
    const result = contentMatch({
      responseText: 'anything',
      mustContain: [],
    });
    expect(result.passed).toBe(true);
    expect(result.details).toBe('No content requirements');
  });

  it('handles substring matching', () => {
    const result = contentMatch({
      responseText: 'The unemployment rate is 3.5%',
      mustContain: ['employment'],
    });
    expect(result.passed).toBe(true);
  });
});

describe('createContentMatchEvaluator', () => {
  it('creates a reusable evaluator', () => {
    const evaluator = createContentMatchEvaluator({
      mustContain: ['portfolio', 'holdings'],
    });

    const pass = evaluator({ responseText: 'portfolio with 10 holdings' });
    expect(pass.passed).toBe(true);

    const fail = evaluator({ responseText: 'no relevant data' });
    expect(fail.passed).toBe(false);
  });
});
