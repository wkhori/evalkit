import { runChecks, RunChecksInput } from '../checks/run-checks';
import { SuiteConfig, TestCase } from './schema';
import { AgentFn, AgentResult, CaseResult, SuiteResult } from './types';
import { loadCases } from './loader';
import { printCaseResult, printSuiteHeader, printSuiteSummary } from './reporter';

export interface RunSuiteOptions {
  cases: string | SuiteConfig;
  agent: AgentFn;
  name?: string;
  concurrency?: number;
  onCaseComplete?: (result: CaseResult) => void;
  /** Print results live to console. Default: true. */
  print?: boolean;
}

/** Run a suite of test cases against an agent function. */
export async function runSuite(options: RunSuiteOptions): Promise<SuiteResult> {
  const config = typeof options.cases === 'string'
    ? loadCases(options.cases)
    : loadCases(options.cases);

  const suiteName = options.name ?? config.name ?? 'unnamed';
  const concurrency = options.concurrency ?? 1;
  const shouldPrint = options.print !== false;
  const startTime = Date.now();

  if (shouldPrint) {
    printSuiteHeader(suiteName);
  }

  const cases = config.test_cases;
  const results: CaseResult[] = [];

  const onCase = (result: CaseResult): void => {
    if (shouldPrint) {
      printCaseResult(result);
    }
    options.onCaseComplete?.(result);
  };

  if (concurrency <= 1) {
    // Sequential execution
    for (const tc of cases) {
      const result = await runCase(tc, options.agent);
      results.push(result);
      onCase(result);
    }
  } else {
    // Concurrent execution with limited concurrency
    let idx = 0;
    const runNext = async (): Promise<void> => {
      while (idx < cases.length) {
        const currentIdx = idx++;
        const result = await runCase(cases[currentIdx], options.agent);
        results.push(result);
        onCase(result);
      }
    };

    const workers = Array.from(
      { length: Math.min(concurrency, cases.length) },
      () => runNext()
    );
    await Promise.all(workers);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const duration = Date.now() - startTime;

  const suiteResult: SuiteResult = {
    name: suiteName,
    passed: passedCount,
    failed: results.length - passedCount,
    total: results.length,
    cases: results,
    duration,
  };

  if (shouldPrint) {
    printSuiteSummary(suiteResult);
  }

  return suiteResult;
}

async function runCase(tc: TestCase, agent: AgentFn): Promise<CaseResult> {
  let agentResult: AgentResult;

  try {
    agentResult = await agent(tc.query);
  } catch (err) {
    // Agent error — mark as failed
    agentResult = {
      responseText: '',
    };
    return {
      id: tc.id,
      query: tc.query,
      passed: false,
      checks: {
        passed: false,
        results: [{
          key: 'agent_error',
          passed: false,
          details: `Agent threw: ${err instanceof Error ? err.message : String(err)}`,
        }],
        summary: '0/1 checks passed',
      },
      metadata: tc.metadata,
      agentResult,
    };
  }

  const checks = tc.checks ?? {};
  const input: RunChecksInput = {};

  // Map responseText
  input.responseText = agentResult.responseText;

  // Tool selection
  if (checks.expectedTools !== undefined) {
    input.expectedTools = checks.expectedTools;
    input.actualTools = agentResult.actualTools;
  }

  // Content match
  if (checks.mustContain !== undefined) {
    input.mustContain = checks.mustContain;
  }

  // Negative match
  if (checks.mustNotContain !== undefined) {
    input.mustNotContain = checks.mustNotContain;
  }

  // Latency
  if (agentResult.latencyMs !== undefined) {
    input.latencyMs = agentResult.latencyMs;
  }
  if (checks.thresholdMs !== undefined) {
    input.thresholdMs = checks.thresholdMs;
  }

  // JSON validity
  if (checks.json !== undefined) {
    input.json = {
      text: agentResult.responseText,
      requireObject: checks.json.requireObject,
    };
  }

  // Schema match
  if (checks.schema !== undefined) {
    try {
      const data = JSON.parse(agentResult.responseText);
      input.schema = {
        data,
        requiredKeys: checks.schema.requiredKeys,
        typeChecks: checks.schema.typeChecks,
      };
    } catch {
      // If JSON parse fails, still run schema check with empty object
      // so it reports a meaningful failure
      input.schema = {
        data: {} as Record<string, unknown>,
        requiredKeys: checks.schema.requiredKeys,
        typeChecks: checks.schema.typeChecks,
      };
    }
  }

  // Non-empty / cop-out phrases
  if (checks.copOutPhrases !== undefined) {
    input.copOutPhrases = checks.copOutPhrases;
  }

  // Length bounds
  if (checks.lengthMin !== undefined) {
    input.lengthMin = checks.lengthMin;
  }
  if (checks.lengthMax !== undefined) {
    input.lengthMax = checks.lengthMax;
  }

  // Regex
  if (checks.regexPatterns !== undefined) {
    input.regexPatterns = checks.regexPatterns.map((p) => new RegExp(p));
  }
  if (checks.regexMode !== undefined) {
    input.regexMode = checks.regexMode;
  }

  // Tool call count
  const toolCallCountValue = agentResult.toolCallCount ?? agentResult.actualTools?.length;
  if (toolCallCountValue !== undefined) {
    input.toolCallCountValue = toolCallCountValue;
  }
  if (checks.toolCallMin !== undefined) {
    input.toolCallMin = checks.toolCallMin;
  }
  if (checks.toolCallMax !== undefined) {
    input.toolCallMax = checks.toolCallMax;
  }

  // Cost budget
  if (agentResult.cost !== undefined) {
    input.costActual = agentResult.cost;
  }
  if (checks.costBudget !== undefined) {
    input.costBudget = checks.costBudget;
  }

  const suiteResult = runChecks(input);

  // A case with no checks always passes (smoke test)
  const passed = suiteResult.results.length === 0 ? true : suiteResult.passed;

  return {
    id: tc.id,
    query: tc.query,
    passed,
    checks: { ...suiteResult, passed },
    metadata: tc.metadata,
    agentResult,
  };
}
