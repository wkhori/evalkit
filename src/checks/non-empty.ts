import { NonEmptyResult } from './types';

const DEFAULT_COP_OUT_PHRASES = [
  "i don't know",
  "n/a",
  "no information",
  "i'm not sure",
  "i cannot",
  "i can't",
  "no data available",
];

export interface NonEmptyInput {
  responseText: string;
  /** Custom cop-out phrases to check against (case-insensitive exact match after trim). */
  copOutPhrases?: string[];
}

/**
 * Checks that the response is not empty, not just whitespace, and not a cop-out phrase.
 */
export function nonEmpty(input: NonEmptyInput): NonEmptyResult {
  const trimmed = input.responseText.trim();

  if (trimmed.length === 0) {
    return {
      key: 'non_empty',
      passed: false,
      details: 'Response is empty',
    };
  }

  const phrases = input.copOutPhrases ?? DEFAULT_COP_OUT_PHRASES;
  const lower = trimmed.toLowerCase();
  const matchedPhrase = phrases.find((p) => lower === p.toLowerCase());

  if (matchedPhrase) {
    return {
      key: 'non_empty',
      passed: false,
      details: `Response is a cop-out phrase: "${matchedPhrase}"`,
    };
  }

  return {
    key: 'non_empty',
    passed: true,
    details: 'Response is non-empty',
  };
}

/**
 * Factory: creates a reusable nonEmpty evaluator with fixed cop-out phrases.
 */
export function createNonEmptyEvaluator(config?: { copOutPhrases?: string[] }) {
  return (input: { responseText: string }): NonEmptyResult =>
    nonEmpty({ responseText: input.responseText, copOutPhrases: config?.copOutPhrases });
}
