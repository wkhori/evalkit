import { describe, it, expect } from 'vitest';
import { runChecks } from '../src/checks/run-checks';

describe('runChecks', () => {
  it('runs all specified checks and returns summary', () => {
    const result = runChecks({
      responseText: 'Your portfolio has 15 holdings worth $50,000',
      expectedTools: ['portfolio_holdings'],
      actualTools: ['portfolio_holdings'],
      mustContain: ['portfolio', 'holdings'],
      mustNotContain: ["I don't know"],
      latencyMs: 1500,
      thresholdMs: 5000,
    });

    expect(result.passed).toBe(true);
    expect(result.results).toHaveLength(4);
    expect(result.summary).toBe('4/4 checks passed');
  });

  it('reports failures correctly', () => {
    const result = runChecks({
      responseText: "I don't know",
      expectedTools: ['search'],
      actualTools: ['wrong_tool'],
      mustContain: ['data'],
      mustNotContain: ["I don't know"],
      latencyMs: 25000,
      thresholdMs: 5000,
    });

    expect(result.passed).toBe(false);
    expect(result.results.filter((r) => !r.passed).length).toBeGreaterThan(0);
  });

  it('only runs checks for provided inputs', () => {
    const result = runChecks({
      latencyMs: 1000,
      thresholdMs: 5000,
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].key).toBe('latency');
    expect(result.summary).toBe('1/1 checks passed');
  });

  it('handles empty input', () => {
    const result = runChecks({});
    expect(result.passed).toBe(false); // no checks run = not passed
    expect(result.results).toHaveLength(0);
    expect(result.summary).toBe('0/0 checks passed');
  });

  it('runs tool selection check', () => {
    const result = runChecks({
      expectedTools: ['a', 'b'],
      actualTools: ['a', 'b'],
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].key).toBe('tool_selection');
    expect(result.passed).toBe(true);
  });

  it('runs json check', () => {
    const result = runChecks({
      json: { text: '{"valid": true}', requireObject: true },
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].key).toBe('json_valid');
    expect(result.passed).toBe(true);
  });

  it('runs schema check', () => {
    const result = runChecks({
      schema: { data: { name: 'test' }, requiredKeys: ['name'] },
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].key).toBe('schema_match');
    expect(result.passed).toBe(true);
  });

  it('runs length bounds check', () => {
    const result = runChecks({
      responseText: 'Hello world',
      lengthMin: 5,
      lengthMax: 100,
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].key).toBe('length_bounds');
    expect(result.passed).toBe(true);
  });

  it('runs regex check', () => {
    const result = runChecks({
      responseText: 'user@example.com',
      regexPatterns: [/\S+@\S+\.\S+/],
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].key).toBe('regex_match');
    expect(result.passed).toBe(true);
  });

  it('runs tool call count check', () => {
    const result = runChecks({
      toolCallCountValue: 3,
      toolCallMin: 1,
      toolCallMax: 5,
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].key).toBe('tool_call_count');
    expect(result.passed).toBe(true);
  });

  it('runs cost budget check', () => {
    const result = runChecks({
      costActual: 500,
      costBudget: 1000,
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0].key).toBe('cost_budget');
    expect(result.passed).toBe(true);
  });

  it('runs nonEmpty check when copOutPhrases provided', () => {
    const result = runChecks({
      responseText: 'Valid response',
      copOutPhrases: ["I don't know"],
    });
    expect(result.results.some((r) => r.key === 'non_empty')).toBe(true);
    expect(result.passed).toBe(true);
  });
});
