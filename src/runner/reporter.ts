import { CaseResult, SuiteResult } from './types';

/** Prints a single case result line to the console. */
export function printCaseResult(c: CaseResult): void {
  const status = c.passed ? 'PASS' : 'FAIL';
  const query = c.query.length > 50 ? c.query.slice(0, 47) + '...' : c.query;
  const latency = c.agentResult.latencyMs !== undefined
    ? `${(c.agentResult.latencyMs / 1000).toFixed(1)}s`
    : '';
  console.log(`  ${c.id}  ${query.padEnd(50)}  ${status}  ${latency}`);

  if (!c.passed) {
    for (const check of c.checks.results) {
      if (!check.passed) {
        console.log(`           ${check.key}: ${check.details}`);
      }
    }
  }
}

/** Prints suite header. */
export function printSuiteHeader(name: string): void {
  console.log(`\nSuite: ${name}`);
  console.log(`${'='.repeat(60)}`);
}

/** Prints suite summary footer. */
export function printSuiteSummary(result: SuiteResult): void {
  console.log(`\n${result.passed}/${result.total} passed (${(result.duration / 1000).toFixed(1)}s)`);
}

/** Prints a full suite result (header + all cases + summary). */
export function printSuiteResult(result: SuiteResult): void {
  printSuiteHeader(result.name);
  for (const c of result.cases) {
    printCaseResult(c);
  }
  printSuiteSummary(result);
}
