import { ToolCallCountResult } from './types';

export interface ToolCallCountInput {
  count: number;
  min?: number;
  max?: number;
}

/**
 * Checks that the number of tool calls falls within expected min/max bounds.
 */
export function toolCallCount(input: ToolCallCountInput): ToolCallCountResult {
  let passed = true;
  const problems: string[] = [];

  if (input.min !== undefined && input.count < input.min) {
    passed = false;
    problems.push(`${input.count} calls below minimum ${input.min}`);
  }

  if (input.max !== undefined && input.count > input.max) {
    passed = false;
    problems.push(`${input.count} calls above maximum ${input.max}`);
  }

  return {
    key: 'tool_call_count',
    passed,
    details: passed
      ? `${input.count} tool calls within bounds`
      : problems.join('. '),
    count: input.count,
    min: input.min,
    max: input.max,
  };
}

/**
 * Factory: creates a reusable toolCallCount evaluator with fixed bounds.
 */
export function createToolCallCountEvaluator(config: { min?: number; max?: number }) {
  return (input: { count: number }): ToolCallCountResult =>
    toolCallCount({ count: input.count, min: config.min, max: config.max });
}
