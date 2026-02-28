/**
 * Example eval script for evalkit.
 *
 * This shows how to wire up your agent and run a golden set.
 * Adapt the agent function to call your actual agent.
 *
 * Run with: npx tsx examples/eval.ts
 */

import { runSuite, printSuiteResult, AgentFn } from 'evalkit';

// Replace this with your actual agent call
const agent: AgentFn = async (query) => {
  const start = Date.now();

  // --- Your agent logic here ---
  // const response = await myAgent.invoke(query);
  // For demo purposes, return a stub response:
  const response = {
    text: `This is a stub response to: ${query}`,
    toolsUsed: ['portfolio_holdings'],
    totalTokens: 150,
  };
  // --- End agent logic ---

  return {
    responseText: response.text,
    actualTools: response.toolsUsed,
    latencyMs: Date.now() - start,
    cost: response.totalTokens,
  };
};

const result = await runSuite({
  cases: 'examples/golden-set.yaml',
  agent,
  name: 'Golden Set',
});

printSuiteResult(result);
process.exit(result.failed > 0 ? 1 : 0);
