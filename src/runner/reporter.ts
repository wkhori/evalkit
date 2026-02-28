import { SuiteResult } from './types';

/** Prints a human-readable summary of a suite run to the console. */
export function printSuiteResult(result: SuiteResult): void {
  console.log(`\nSuite: ${result.name}`);
  console.log(`${'='.repeat(60)}`);

  for (const c of result.cases) {
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

  console.log(`\n${result.passed}/${result.total} passed (${(result.duration / 1000).toFixed(1)}s)`);
}
