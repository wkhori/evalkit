import { LengthBoundsResult } from './types';

export interface LengthBoundsInput {
  responseText: string;
  min?: number;
  max?: number;
}

/**
 * Checks that the response length (character count) falls within min and/or max bounds.
 */
export function lengthBounds(input: LengthBoundsInput): LengthBoundsResult {
  const length = input.responseText.length;
  let passed = true;
  const problems: string[] = [];

  if (input.min !== undefined && length < input.min) {
    passed = false;
    problems.push(`${length} chars below minimum ${input.min}`);
  }

  if (input.max !== undefined && length > input.max) {
    passed = false;
    problems.push(`${length} chars above maximum ${input.max}`);
  }

  return {
    key: 'length_bounds',
    passed,
    details: passed
      ? `${length} chars within bounds`
      : problems.join('. '),
    length,
    min: input.min,
    max: input.max,
  };
}

/**
 * Factory: creates a reusable lengthBounds evaluator with fixed bounds.
 */
export function createLengthBoundsEvaluator(config: { min?: number; max?: number }) {
  return (input: { responseText: string }): LengthBoundsResult =>
    lengthBounds({ responseText: input.responseText, min: config.min, max: config.max });
}
