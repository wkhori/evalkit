import { ToolSelectionResult } from './types';

export interface ToolSelectionInput {
  expected: string[];
  actual: string[];
}

/**
 * Strict set equality between expected and actual tool names.
 * Order-independent, deduplicates. Reports missing and unexpected tools.
 */
export function toolSelection(input: ToolSelectionInput): ToolSelectionResult {
  const expectedSet = new Set(input.expected);
  const actualSet = new Set(input.actual);

  const missing = [...expectedSet].filter((t) => !actualSet.has(t));
  const extra = [...actualSet].filter((t) => !expectedSet.has(t));
  const passed = missing.length === 0 && extra.length === 0;

  let details = passed ? 'All expected tools matched' : '';

  if (missing.length > 0) {
    details += `Missing: ${missing.join(', ')}`;
  }

  if (extra.length > 0) {
    details += `${missing.length > 0 ? '. ' : ''}Unexpected: ${extra.join(', ')}`;
  }

  return {
    key: 'tool_selection',
    passed,
    details,
    expected: input.expected,
    actual: [...actualSet],
  };
}

/**
 * Factory: creates a reusable toolSelection evaluator with fixed expected tools.
 */
export function createToolSelectionEvaluator(config: { expected: string[] }) {
  return (input: { actual: string[] }): ToolSelectionResult =>
    toolSelection({ expected: config.expected, actual: input.actual });
}
