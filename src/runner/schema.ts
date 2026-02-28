/** TypeScript types for the YAML/JSON test case format. */

export interface TestCase {
  id: string;
  query: string;
  checks: TestCaseChecks;
  metadata?: Record<string, unknown>;
}

export interface TestCaseChecks {
  expectedTools?: string[];
  mustContain?: string[];
  mustNotContain?: string[];
  thresholdMs?: number;
  json?: { requireObject?: boolean };
  schema?: { requiredKeys: string[]; typeChecks?: Record<string, string> };
  copOutPhrases?: string[];
  lengthMin?: number;
  lengthMax?: number;
  regexPatterns?: string[];
  regexMode?: 'all' | 'any';
  toolCallMin?: number;
  toolCallMax?: number;
  costBudget?: number;
}

export interface SuiteConfig {
  name?: string;
  test_cases: TestCase[];
}
