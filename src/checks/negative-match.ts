import { NegativeMatchResult } from './types';

export interface NegativeMatchInput {
  responseText: string;
  mustNotContain: string[];
}

/**
 * Case-insensitive substring matching: no mustNotContain strings may appear in responseText.
 */
export function negativeMatch(input: NegativeMatchInput): NegativeMatchResult {
  if (!input.mustNotContain || input.mustNotContain.length === 0) {
    return {
      key: 'negative_match',
      passed: true,
      details: 'No negative requirements',
      found: [],
    };
  }

  const lower = input.responseText.toLowerCase();
  const found = input.mustNotContain.filter((s) => lower.includes(s.toLowerCase()));
  const passed = found.length === 0;

  return {
    key: 'negative_match',
    passed,
    details: passed
      ? 'No forbidden content found'
      : `Found: ${found.join(', ')}`,
    found,
  };
}

/**
 * Factory: creates a reusable negativeMatch evaluator with fixed mustNotContain list.
 */
export function createNegativeMatchEvaluator(config: { mustNotContain: string[] }) {
  return (input: { responseText: string }): NegativeMatchResult =>
    negativeMatch({ responseText: input.responseText, mustNotContain: config.mustNotContain });
}
