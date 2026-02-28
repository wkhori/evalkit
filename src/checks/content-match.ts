import { ContentMatchResult } from './types';

export interface ContentMatchInput {
  responseText: string;
  mustContain: string[];
}

/**
 * Case-insensitive substring matching: all mustContain strings must appear in responseText.
 */
export function contentMatch(input: ContentMatchInput): ContentMatchResult {
  if (!input.mustContain || input.mustContain.length === 0) {
    return {
      key: 'content_match',
      passed: true,
      details: 'No content requirements',
      missing: [],
    };
  }

  const lower = input.responseText.toLowerCase();
  const missing = input.mustContain.filter((s) => !lower.includes(s.toLowerCase()));
  const passed = missing.length === 0;

  return {
    key: 'content_match',
    passed,
    details: passed
      ? 'All required content found'
      : `Missing: ${missing.join(', ')}`,
    missing,
  };
}

/**
 * Factory: creates a reusable contentMatch evaluator with fixed mustContain list.
 */
export function createContentMatchEvaluator(config: { mustContain: string[] }) {
  return (input: { responseText: string }): ContentMatchResult =>
    contentMatch({ responseText: input.responseText, mustContain: config.mustContain });
}
