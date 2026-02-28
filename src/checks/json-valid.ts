import { JsonValidResult } from './types';

export interface JsonValidInput {
  text: string;
  /** If true, the parsed result must be an object or array (not a bare primitive). */
  requireObject?: boolean;
}

/**
 * Validates that a string is parseable JSON.
 * Optionally checks that the parsed result is an object or array.
 */
export function jsonValid(input: JsonValidInput): JsonValidResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.text);
  } catch {
    return {
      key: 'json_valid',
      passed: false,
      details: 'Invalid JSON',
    };
  }

  if (input.requireObject && (parsed === null || typeof parsed !== 'object')) {
    return {
      key: 'json_valid',
      passed: false,
      details: `Expected object or array, got ${parsed === null ? 'null' : typeof parsed}`,
    };
  }

  return {
    key: 'json_valid',
    passed: true,
    details: 'Valid JSON',
  };
}

/**
 * Factory: creates a reusable jsonValid evaluator with fixed options.
 */
export function createJsonValidEvaluator(config?: { requireObject?: boolean }) {
  return (input: { text: string }): JsonValidResult =>
    jsonValid({ text: input.text, requireObject: config?.requireObject });
}
