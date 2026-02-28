# evalkit

Lightweight deterministic evaluators for AI agents. Binary pass/fail checks, zero dependencies, no LLM cost.

## Why

Before you reach for LLM-as-judge or complex scoring rubrics, you should have 10-20 core test cases with deterministic, binary checks that run on every commit. These checks have zero API cost, zero ambiguity, and produce the same result every time.

## Install

```bash
npm install evalkit
```

## Quick Start

```typescript
import { runSuite, printSuiteResult } from 'evalkit';

const result = await runSuite({
  cases: 'golden-set.yaml',
  agent: async (query) => {
    const res = await myAgent.invoke(query);
    return {
      responseText: res.text,
      actualTools: res.toolsUsed,
      latencyMs: res.duration,
    };
  },
});

printSuiteResult(result);
// eval-001  What is my portfolio allocation?           PASS  1.2s
// eval-002  Show me my current holdings                FAIL  3.4s
//           content_match: Missing: $
//
// 1/2 passed (4.6s)

if (result.failed > 0) process.exit(1);
```

## Runner

Load test cases from JSON or YAML and run them against your agent.

### Test case format

#### JSON

```json
{
  "test_cases": [
    {
      "id": "eval-001",
      "query": "What is my portfolio allocation?",
      "checks": {
        "expectedTools": ["portfolio_holdings"],
        "mustContain": ["%", "AAPL"],
        "mustNotContain": ["I don't know"],
        "thresholdMs": 20000
      },
      "metadata": { "category": "portfolio" }
    }
  ]
}
```

#### YAML (built-in parser, no dependencies)

```yaml
# golden-set.yaml
test_cases:
  - id: eval-001
    query: "What is my portfolio allocation?"
    checks:
      expectedTools:
        - portfolio_holdings
      mustContain:
        - "%"
        - "AAPL"
      mustNotContain:
        - "I don't know"
      thresholdMs: 20000
    metadata:
      category: portfolio
      difficulty: basic
```

### Agent callback

The runner calls your function with each test case's `query` and expects an `AgentResult` back:

```typescript
interface AgentResult {
  responseText: string;       // The agent's text response (required)
  actualTools?: string[];     // Tools the agent called
  latencyMs?: number;         // How long the agent took
  toolCallCount?: number;     // Number of tool calls (or derived from actualTools.length)
  cost?: number;              // Token count or dollar cost
}
```

You provide the adapter — evalkit never touches your SDK, keys, or auth.

### `runSuite()` options

```typescript
const result = await runSuite({
  cases: 'golden-set.yaml',     // File path (.json, .yaml, .yml) or inline SuiteConfig object
  agent: myAgentFn,             // Your (query: string) => Promise<AgentResult> callback
  name: 'Portfolio Suite',      // Optional suite name (overrides name from file)
  concurrency: 3,              // Run cases in parallel (default: 1, sequential)
  onCaseComplete: (caseResult) => {
    console.log(`${caseResult.id}: ${caseResult.passed ? 'PASS' : 'FAIL'}`);
  },                            // Optional progress callback, fired after each case
});
```

Or pass cases inline — no file needed:

```typescript
const result = await runSuite({
  cases: {
    test_cases: [
      { id: 'test-1', query: 'Hello', checks: { mustContain: ['hi'] } },
    ],
  },
  agent: myAgentFn,
});
```

### Available checks

| Check field | What it validates |
|---|---|
| `expectedTools` | Agent called exactly these tools (set equality) |
| `mustContain` | Response contains all strings (case-insensitive) |
| `mustNotContain` | Response contains none of these strings |
| `thresholdMs` | Response time under threshold |
| `json` | Response is valid JSON (`{ requireObject: true }` for objects only) |
| `schema` | Parsed JSON has required keys with correct types |
| `copOutPhrases` | Response isn't empty or a cop-out ("I don't know", etc.) |
| `lengthMin` / `lengthMax` | Response character count within bounds |
| `regexPatterns` | Response matches regex patterns (`regexMode: 'all' \| 'any'`) |
| `toolCallMin` / `toolCallMax` | Number of tool calls within bounds |
| `costBudget` | Cost under budget |

A case with no checks always passes — useful for smoke tests that just verify the agent doesn't crash.

## Individual evaluators

Every evaluator returns an `EvalResult` with `passed: boolean` and `details: string`. You can use them standalone without the runner.

### Core checks

```typescript
import { toolSelection, contentMatch, negativeMatch, latency } from 'evalkit';

toolSelection({
  expected: ['search', 'summarize'],
  actual: ['summarize', 'search'],
});
// passed: true — order-independent set equality

contentMatch({
  responseText: 'The GDP growth rate is 2.5%',
  mustContain: ['GDP', 'growth'],
});
// passed: true — case-insensitive substring match

negativeMatch({
  responseText: 'Here is your analysis.',
  mustNotContain: ["I don't know", 'error'],
});
// passed: true

latency({ latencyMs: 1200, thresholdMs: 5000 });
// passed: true — default threshold: 20,000ms
```

### Format checks

```typescript
import { jsonValid, schemaMatch, nonEmpty, lengthBounds } from 'evalkit';

jsonValid({ text: '{"valid": true}', requireObject: true });
// passed: true

schemaMatch({
  data: { name: 'Alice', age: 30 },
  requiredKeys: ['name', 'age'],
  typeChecks: { name: 'string', age: 'number' },
});
// passed: true — zero-dep, no Zod needed

nonEmpty({ responseText: "I don't know" });
// passed: false — "Response is a cop-out phrase"

lengthBounds({ responseText: 'Hello world', min: 5, max: 1000 });
// passed: true
```

### Pattern & behavioral checks

```typescript
import { regexMatch, toolCallCount, costBudget } from 'evalkit';

regexMatch({
  responseText: 'Contact: user@example.com',
  patterns: [/\S+@\S+\.\S+/],
  mode: 'all', // 'all' (default) or 'any'
});
// passed: true

toolCallCount({ count: 3, min: 1, max: 5 });
// passed: true

costBudget({ actual: 5000, budget: 10000 });
// passed: true — works with token counts or dollar amounts
```

## `runChecks()`

Run any combination of checks at once. Only runs checks for which inputs are provided.

```typescript
import { runChecks } from 'evalkit';

const result = runChecks({
  responseText: 'Your portfolio has 15 holdings',
  expectedTools: ['portfolio_holdings'],
  actualTools: ['portfolio_holdings'],
  mustContain: ['portfolio', 'holdings'],
  mustNotContain: ["I don't know"],
  latencyMs: 1500,
  thresholdMs: 5000,
});
// { passed: true, results: [...], summary: '4/4 checks passed' }
```

## Factory pattern

Each evaluator has a `create*Evaluator` factory for reuse across test cases:

```typescript
import { createContentMatchEvaluator } from 'evalkit';

const checkContent = createContentMatchEvaluator({
  mustContain: ['portfolio', 'holdings', 'allocation'],
});

// Reuse across test cases
const r1 = checkContent({ responseText: response1 });
const r2 = checkContent({ responseText: response2 });
```

## Integrating with your agent

evalkit is SDK-agnostic. You write a thin adapter function that calls your agent and returns an `AgentResult`. Here are patterns for common setups:

### Any agent (generic pattern)

```typescript
import { runSuite, printSuiteResult, AgentFn } from 'evalkit';

const agent: AgentFn = async (query) => {
  const start = Date.now();
  const response = await callMyAgent(query);
  return {
    responseText: response.text,
    actualTools: response.toolCalls?.map((t) => t.name),
    latencyMs: Date.now() - start,
    toolCallCount: response.toolCalls?.length,
    cost: response.usage?.totalTokens,
  };
};

const result = await runSuite({ cases: 'golden-set.yaml', agent });
printSuiteResult(result);
```

### CI / GitHub Actions

```typescript
// eval.ts — run with: npx tsx eval.ts
import { runSuite, printSuiteResult } from 'evalkit';

const result = await runSuite({
  cases: 'golden-set.yaml',
  agent: myAgentFn,
});

printSuiteResult(result);
process.exit(result.failed > 0 ? 1 : 0);
```

```yaml
# .github/workflows/evals.yml
- run: npx tsx eval.ts
```

## Design principles

- **Zero runtime dependencies** — no Zod, no Ajv, no LLM calls
- **Binary results** — every check returns `passed: boolean`
- **Deterministic** — same input always produces same output
- **CI-friendly** — fast enough to run on every commit
- **SDK-agnostic** — you provide the agent callback, evalkit runs the checks

## License

MIT
