# agentcheck

Lightweight deterministic evaluators for AI agents. Binary pass/fail checks, zero dependencies, no LLM cost.

## Why

Before you reach for LLM-as-judge or complex scoring rubrics, you should have 10-20 golden test cases with deterministic, binary checks that run on every commit. These checks have zero API cost, zero ambiguity, and produce the same result every time.

`agentcheck` implements Stage 1 ("Golden Sets") from the "Evals That Actually Work" framework.

## Install

```bash
npm install agentcheck
```

## Quick Start

```typescript
import {
  toolSelection,
  contentMatch,
  negativeMatch,
  latency,
  runChecks,
} from 'agentcheck';

// Individual checks
const r1 = toolSelection({
  expected: ['vector_search', 'sql_query'],
  actual: ['vector_search', 'sql_query'],
});
// { key: 'tool_selection', passed: true, details: 'All expected tools matched', ... }

const r2 = contentMatch({
  responseText: 'Your portfolio has 15 holdings worth $50,000',
  mustContain: ['portfolio', 'holdings'],
});

const r3 = negativeMatch({
  responseText: 'Based on your data, AAPL is your largest holding.',
  mustNotContain: ["I don't know", 'no information'],
});

const r4 = latency({ latencyMs: 1200, thresholdMs: 5000 });

// Or run everything at once
const suite = runChecks({
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

## Evaluators

Every evaluator returns an `EvalResult` with `passed: boolean` and `details: string`.

### Core Checks

| Evaluator | What it checks |
|-----------|---------------|
| `toolSelection` | Strict set equality between expected and actual tool names |
| `contentMatch` | Case-insensitive substring match — all required strings present |
| `negativeMatch` | Case-insensitive substring match — no forbidden strings present |
| `latency` | Response time under threshold |

### Format Checks

| Evaluator | What it checks |
|-----------|---------------|
| `jsonValid` | String is parseable JSON, optionally requires object/array |
| `schemaMatch` | Object has required keys with correct types (zero-dep, no Zod) |
| `nonEmpty` | Response is not empty, whitespace, or a cop-out phrase |
| `lengthBounds` | Character count within min/max bounds |

### Pattern & Behavioral Checks

| Evaluator | What it checks |
|-----------|---------------|
| `regexMatch` | Response matches regex patterns (all or any mode) |
| `toolCallCount` | Number of tool calls within min/max bounds |
| `costBudget` | Token count or dollar cost under budget |

## Factory Pattern

Each evaluator has a `create*Evaluator` factory for reuse across test cases:

```typescript
import { createContentMatchEvaluator, createNegativeMatchEvaluator } from 'agentcheck';

const checkContent = createContentMatchEvaluator({
  mustContain: ['portfolio', 'holdings', 'allocation'],
});

const checkNegative = createNegativeMatchEvaluator({
  mustNotContain: ["I don't know", 'no data available'],
});

// Reuse across test cases
const result1 = checkContent({ responseText: response1 });
const result2 = checkContent({ responseText: response2 });
```

## All Evaluators

### `toolSelection({ expected, actual })`

Strict set equality (order-independent, deduplicates).

```typescript
toolSelection({
  expected: ['search', 'summarize'],
  actual: ['summarize', 'search'],
});
// passed: true
```

### `contentMatch({ responseText, mustContain })`

Case-insensitive substring matching. Passes vacuously if `mustContain` is empty.

```typescript
contentMatch({
  responseText: 'The GDP growth rate is 2.5%',
  mustContain: ['GDP', 'growth'],
});
// passed: true
```

### `negativeMatch({ responseText, mustNotContain })`

Case-insensitive substring matching. Passes vacuously if `mustNotContain` is empty.

```typescript
negativeMatch({
  responseText: 'Here is your analysis.',
  mustNotContain: ["I don't know", 'error'],
});
// passed: true
```

### `latency({ latencyMs, thresholdMs? })`

Default threshold: 20,000ms.

```typescript
latency({ latencyMs: 1200, thresholdMs: 5000 });
// passed: true
```

### `jsonValid({ text, requireObject? })`

```typescript
jsonValid({ text: '{"valid": true}', requireObject: true });
// passed: true

jsonValid({ text: '42', requireObject: true });
// passed: false — "Expected object or array, got number"
```

### `schemaMatch({ data, requiredKeys, typeChecks? })`

Zero-dep schema validation using `typeof` and key presence.

```typescript
schemaMatch({
  data: { name: 'Alice', age: 30 },
  requiredKeys: ['name', 'age'],
  typeChecks: { name: 'string', age: 'number' },
});
// passed: true
```

### `nonEmpty({ responseText, copOutPhrases? })`

Checks for empty, whitespace-only, or cop-out responses. Default cop-out phrases include "I don't know", "N/A", "no information", etc.

```typescript
nonEmpty({ responseText: "I don't know" });
// passed: false — "Response is a cop-out phrase"

nonEmpty({ responseText: 'Here is your data.' });
// passed: true
```

### `lengthBounds({ responseText, min?, max? })`

```typescript
lengthBounds({ responseText: 'Hello world', min: 5, max: 1000 });
// passed: true
```

### `regexMatch({ responseText, patterns, mode? })`

Mode `'all'` (default): every pattern must match. Mode `'any'`: at least one.

```typescript
regexMatch({
  responseText: 'Contact: user@example.com',
  patterns: [/\S+@\S+\.\S+/],
});
// passed: true
```

### `toolCallCount({ count, min?, max? })`

```typescript
toolCallCount({ count: 3, min: 1, max: 5 });
// passed: true
```

### `costBudget({ actual, budget })`

Works with token counts or dollar amounts.

```typescript
costBudget({ actual: 5000, budget: 10000 });
// passed: true
```

## `runChecks()`

Convenience function that runs any combination of checks. Only runs checks for which inputs are provided.

```typescript
import { runChecks } from 'agentcheck';

const result = runChecks({
  responseText: 'Your portfolio summary...',
  expectedTools: ['portfolio_holdings'],
  actualTools: ['portfolio_holdings'],
  mustContain: ['portfolio'],
  mustNotContain: ["I don't know"],
  latencyMs: 1500,
  thresholdMs: 5000,
  json: { text: '{"valid": true}', requireObject: true },
  schema: { data: { id: 1 }, requiredKeys: ['id'], typeChecks: { id: 'number' } },
  lengthMin: 10,
  lengthMax: 10000,
  regexPatterns: [/portfolio/i],
  toolCallCountValue: 1,
  toolCallMin: 1,
  toolCallMax: 5,
  costActual: 500,
  costBudget: 1000,
});
// { passed: true, results: [...], summary: '9/9 checks passed' }
```

## Runner

Load test cases from JSON or YAML and run them against your agent.

### JSON (zero-friction, no parser needed)

```json
{
  "test_cases": [
    {
      "id": "gs-001",
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

### YAML (built-in parser, no dependencies)

```yaml
# golden-set.yaml
test_cases:
  - id: gs-001
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

### Usage

```typescript
import { runSuite, printSuiteResult } from "agentcheck";

// Works with .json, .yaml, or .yml files
const result = await runSuite({
  cases: "golden-set.yaml",
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
// gs-001  What is my portfolio allocation?           PASS  1.2s
// gs-002  Show me my current holdings                FAIL  3.4s
//           content: Missing: $
//
// 1/2 passed (4.6s)

if (result.failed > 0) process.exit(1);
```

Or pass cases inline — no file needed:

```typescript
const result = await runSuite({
  cases: {
    test_cases: [
      { id: "test-1", query: "Hello", checks: { mustContain: ["hi"] } },
    ],
  },
  agent: myAgentFn,
});
```

The runner never touches your AI SDK — you provide a callback that calls your agent and returns the standardized `AgentResult`. Your keys, your auth, your code.

## Design Principles

- **Zero runtime dependencies** — no Zod, no Ajv, no LLM calls
- **Binary results** — every check returns `passed: boolean`
- **Deterministic** — same input always produces same output
- **CI-friendly** — fast enough to run on every commit

## License

MIT
