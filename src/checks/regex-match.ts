import { RegexMatchResult } from './types';

export interface RegexMatchInput {
  responseText: string;
  patterns: (string | RegExp)[];
  /** If 'all' (default), every pattern must match. If 'any', at least one must match. */
  mode?: 'all' | 'any';
}

/**
 * Tests the response against one or more regex patterns.
 */
export function regexMatch(input: RegexMatchInput): RegexMatchResult {
  const mode = input.mode ?? 'all';
  const failedPatterns: string[] = [];

  for (const pattern of input.patterns) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    if (!regex.test(input.responseText)) {
      failedPatterns.push(String(pattern));
    }
  }

  let passed: boolean;
  if (mode === 'all') {
    passed = failedPatterns.length === 0;
  } else {
    // 'any' mode: pass if at least one pattern matched
    passed = failedPatterns.length < input.patterns.length;
  }

  let details: string;
  if (passed) {
    details = mode === 'all'
      ? 'All patterns matched'
      : 'At least one pattern matched';
  } else {
    details = mode === 'all'
      ? `Failed patterns: ${failedPatterns.join(', ')}`
      : 'No patterns matched';
  }

  return {
    key: 'regex_match',
    passed,
    details,
    failedPatterns,
  };
}

/**
 * Factory: creates a reusable regexMatch evaluator with fixed patterns and mode.
 */
export function createRegexMatchEvaluator(config: {
  patterns: (string | RegExp)[];
  mode?: 'all' | 'any';
}) {
  return (input: { responseText: string }): RegexMatchResult =>
    regexMatch({ responseText: input.responseText, patterns: config.patterns, mode: config.mode });
}
