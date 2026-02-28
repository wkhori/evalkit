import { describe, it, expect } from 'vitest';
import { negativeMatch, createNegativeMatchEvaluator } from '../src/checks/negative-match';

describe('negativeMatch', () => {
  it('passes when no forbidden strings are found', () => {
    const result = negativeMatch({
      responseText: 'Based on your data, AAPL is your largest holding.',
      mustNotContain: ["I don't know", 'no information'],
    });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('negative_match');
    expect(result.found).toEqual([]);
  });

  it('fails when forbidden strings are found', () => {
    const result = negativeMatch({
      responseText: "I don't know the answer to that question.",
      mustNotContain: ["I don't know", 'no information'],
    });
    expect(result.passed).toBe(false);
    expect(result.found).toEqual(["I don't know"]);
    expect(result.details).toContain("Found: I don't know");
  });

  it('is case-insensitive', () => {
    const result = negativeMatch({
      responseText: "I DON'T KNOW",
      mustNotContain: ["i don't know"],
    });
    expect(result.passed).toBe(false);
  });

  it('passes vacuously when mustNotContain is empty', () => {
    const result = negativeMatch({
      responseText: 'anything',
      mustNotContain: [],
    });
    expect(result.passed).toBe(true);
    expect(result.details).toBe('No negative requirements');
  });

  it('reports multiple found forbidden strings', () => {
    const result = negativeMatch({
      responseText: "I don't know and there's no information available.",
      mustNotContain: ["I don't know", 'no information'],
    });
    expect(result.passed).toBe(false);
    expect(result.found).toHaveLength(2);
  });
});

describe('createNegativeMatchEvaluator', () => {
  it('creates a reusable evaluator', () => {
    const evaluator = createNegativeMatchEvaluator({
      mustNotContain: ["I don't know", 'N/A'],
    });

    const pass = evaluator({ responseText: 'Here is your data' });
    expect(pass.passed).toBe(true);

    const fail = evaluator({ responseText: 'N/A - no data found' });
    expect(fail.passed).toBe(false);
  });
});
