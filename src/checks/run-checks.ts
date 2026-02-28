import { CheckSuiteResult, EvalResult } from './types';
import { toolSelection } from './tool-selection';
import { contentMatch } from './content-match';
import { negativeMatch } from './negative-match';
import { latency } from './latency';
import { jsonValid } from './json-valid';
import { schemaMatch } from './schema-match';
import { nonEmpty } from './non-empty';
import { lengthBounds } from './length-bounds';
import { regexMatch } from './regex-match';
import { toolCallCount } from './tool-call-count';
import { costBudget } from './cost-budget';

export interface RunChecksInput {
  responseText?: string;
  expectedTools?: string[];
  actualTools?: string[];
  mustContain?: string[];
  mustNotContain?: string[];
  latencyMs?: number;
  thresholdMs?: number;
  json?: { text: string; requireObject?: boolean };
  schema?: { data: Record<string, unknown>; requiredKeys: string[]; typeChecks?: Record<string, string> };
  copOutPhrases?: string[];
  lengthMin?: number;
  lengthMax?: number;
  regexPatterns?: (string | RegExp)[];
  regexMode?: 'all' | 'any';
  toolCallCountValue?: number;
  toolCallMin?: number;
  toolCallMax?: number;
  costActual?: number;
  costBudget?: number;
}

/**
 * Runs any combination of checks at once and returns a summary.
 * Only runs checks for which the relevant inputs are provided.
 */
export function runChecks(input: RunChecksInput): CheckSuiteResult {
  const results: EvalResult[] = [];

  if (input.expectedTools !== undefined && input.actualTools !== undefined) {
    results.push(toolSelection({ expected: input.expectedTools, actual: input.actualTools }));
  }

  if (input.mustContain !== undefined && input.responseText !== undefined) {
    results.push(contentMatch({ responseText: input.responseText, mustContain: input.mustContain }));
  }

  if (input.mustNotContain !== undefined && input.responseText !== undefined) {
    results.push(negativeMatch({ responseText: input.responseText, mustNotContain: input.mustNotContain }));
  }

  if (input.latencyMs !== undefined) {
    results.push(latency({ latencyMs: input.latencyMs, thresholdMs: input.thresholdMs }));
  }

  if (input.json !== undefined) {
    results.push(jsonValid(input.json));
  }

  if (input.schema !== undefined) {
    results.push(schemaMatch(input.schema));
  }

  if (input.responseText !== undefined && (input.copOutPhrases !== undefined || input.responseText !== undefined) && input.mustContain === undefined && input.mustNotContain === undefined && input.regexPatterns === undefined && input.lengthMin === undefined && input.lengthMax === undefined) {
    // nonEmpty is only auto-run if explicitly requested via copOutPhrases
  }

  if (input.copOutPhrases !== undefined && input.responseText !== undefined) {
    results.push(nonEmpty({ responseText: input.responseText, copOutPhrases: input.copOutPhrases }));
  }

  if ((input.lengthMin !== undefined || input.lengthMax !== undefined) && input.responseText !== undefined) {
    results.push(lengthBounds({ responseText: input.responseText, min: input.lengthMin, max: input.lengthMax }));
  }

  if (input.regexPatterns !== undefined && input.responseText !== undefined) {
    results.push(regexMatch({ responseText: input.responseText, patterns: input.regexPatterns, mode: input.regexMode }));
  }

  if (input.toolCallCountValue !== undefined) {
    results.push(toolCallCount({ count: input.toolCallCountValue, min: input.toolCallMin, max: input.toolCallMax }));
  }

  if (input.costActual !== undefined && input.costBudget !== undefined) {
    results.push(costBudget({ actual: input.costActual, budget: input.costBudget }));
  }

  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = results.length > 0 && passedCount === results.length;

  return {
    passed: allPassed,
    results,
    summary: `${passedCount}/${results.length} checks passed`,
  };
}
