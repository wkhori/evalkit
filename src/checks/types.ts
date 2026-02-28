/** Standard result returned by every evaluator. */
export interface EvalResult {
  /** Evaluator identifier */
  key: string;
  /** Binary pass/fail */
  passed: boolean;
  /** Human-readable explanation */
  details: string;
}

/** Result for tool selection check. */
export interface ToolSelectionResult extends EvalResult {
  key: 'tool_selection';
  expected: string[];
  actual: string[];
}

/** Result for content match check. */
export interface ContentMatchResult extends EvalResult {
  key: 'content_match';
  missing: string[];
}

/** Result for negative match check. */
export interface NegativeMatchResult extends EvalResult {
  key: 'negative_match';
  found: string[];
}

/** Result for latency check. */
export interface LatencyResult extends EvalResult {
  key: 'latency';
  ms: number;
  threshold: number;
}

/** Result for JSON validity check. */
export interface JsonValidResult extends EvalResult {
  key: 'json_valid';
}

/** Result for schema match check. */
export interface SchemaMatchResult extends EvalResult {
  key: 'schema_match';
  missingKeys: string[];
  typeErrors: string[];
}

/** Result for non-empty check. */
export interface NonEmptyResult extends EvalResult {
  key: 'non_empty';
}

/** Result for length bounds check. */
export interface LengthBoundsResult extends EvalResult {
  key: 'length_bounds';
  length: number;
  min?: number;
  max?: number;
}

/** Result for regex match check. */
export interface RegexMatchResult extends EvalResult {
  key: 'regex_match';
  failedPatterns: string[];
}

/** Result for tool call count check. */
export interface ToolCallCountResult extends EvalResult {
  key: 'tool_call_count';
  count: number;
  min?: number;
  max?: number;
}

/** Result for cost budget check. */
export interface CostBudgetResult extends EvalResult {
  key: 'cost_budget';
  actual: number;
  budget: number;
}

/** Summary result from runChecks(). */
export interface CheckSuiteResult {
  passed: boolean;
  results: EvalResult[];
  summary: string;
}
