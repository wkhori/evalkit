import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runSuite } from '../src/runner/run-suite';
import { AgentFn, AgentResult, CaseResult } from '../src/runner/types';
import { SuiteConfig } from '../src/runner/schema';

describe('runSuite', () => {
  const simpleAgent: AgentFn = async (query) => ({
    responseText: `Response to: ${query}`,
    actualTools: ['search'],
    latencyMs: 100,
    toolCallCount: 1,
    cost: 50,
  });

  it('runs a suite with inline cases', async () => {
    const result = await runSuite({
      cases: {
        test_cases: [
          { id: 'tc-001', query: 'Hello', checks: { mustContain: ['Response'] } },
          { id: 'tc-002', query: 'World', checks: { mustContain: ['Response'] } },
        ],
      },
      agent: simpleAgent,
      print: false,
    });

    expect(result.total).toBe(2);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.cases).toHaveLength(2);
  });

  it('calls agent function with each case query', async () => {
    const queries: string[] = [];
    const trackingAgent: AgentFn = async (query) => {
      queries.push(query);
      return { responseText: 'ok' };
    };

    await runSuite({
      cases: {
        test_cases: [
          { id: 'tc-001', query: 'First query', checks: {} },
          { id: 'tc-002', query: 'Second query', checks: {} },
        ],
      },
      agent: trackingAgent,
      print: false,
    });

    expect(queries).toEqual(['First query', 'Second query']);
  });

  it('passes correct checks to runChecks', async () => {
    const agent: AgentFn = async () => ({
      responseText: 'Hello world with data',
      actualTools: ['search'],
      latencyMs: 500,
      toolCallCount: 1,
      cost: 100,
    });

    const result = await runSuite({
      cases: {
        test_cases: [{
          id: 'tc-001',
          query: 'Test',
          checks: {
            expectedTools: ['search'],
            mustContain: ['Hello'],
            mustNotContain: ['error'],
            thresholdMs: 5000,
            lengthMin: 5,
            lengthMax: 100,
            toolCallMin: 1,
            toolCallMax: 3,
            costBudget: 500,
          },
        }],
      },
      agent,
      print: false,
    });

    expect(result.passed).toBe(1);
    expect(result.cases[0].passed).toBe(true);
    // Should have run multiple checks
    expect(result.cases[0].checks.results.length).toBeGreaterThan(0);
  });

  it('returns correct pass/fail counts', async () => {
    const agent: AgentFn = async () => ({
      responseText: 'Hello',
    });

    const result = await runSuite({
      cases: {
        test_cases: [
          { id: 'tc-001', query: 'Test', checks: { mustContain: ['Hello'] } },
          { id: 'tc-002', query: 'Test', checks: { mustContain: ['missing_word'] } },
          { id: 'tc-003', query: 'Test', checks: { mustContain: ['Hello'] } },
        ],
      },
      agent,
      print: false,
    });

    expect(result.passed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.total).toBe(3);
  });

  it('handles agent errors gracefully', async () => {
    const failingAgent: AgentFn = async () => {
      throw new Error('Agent crashed');
    };

    const result = await runSuite({
      cases: {
        test_cases: [
          { id: 'tc-001', query: 'Hello', checks: { mustContain: ['hi'] } },
        ],
      },
      agent: failingAgent,
      print: false,
    });

    expect(result.total).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.cases[0].passed).toBe(false);
    expect(result.cases[0].checks.results[0].details).toContain('Agent threw');
  });

  it('calls onCaseComplete callback for each case', async () => {
    const completed: CaseResult[] = [];

    await runSuite({
      cases: {
        test_cases: [
          { id: 'tc-001', query: 'Hello', checks: {} },
          { id: 'tc-002', query: 'World', checks: {} },
        ],
      },
      agent: simpleAgent,
      onCaseComplete: (result) => completed.push(result),
      print: false,
    });

    expect(completed).toHaveLength(2);
    expect(completed[0].id).toBe('tc-001');
    expect(completed[1].id).toBe('tc-002');
  });

  it('respects concurrency option', async () => {
    let maxConcurrent = 0;
    let running = 0;

    const slowAgent: AgentFn = async (query) => {
      running++;
      maxConcurrent = Math.max(maxConcurrent, running);
      await new Promise((r) => setTimeout(r, 50));
      running--;
      return { responseText: 'ok' };
    };

    await runSuite({
      cases: {
        test_cases: [
          { id: 'tc-001', query: 'A', checks: {} },
          { id: 'tc-002', query: 'B', checks: {} },
          { id: 'tc-003', query: 'C', checks: {} },
          { id: 'tc-004', query: 'D', checks: {} },
        ],
      },
      agent: slowAgent,
      concurrency: 2,
      print: false,
    });

    expect(maxConcurrent).toBeGreaterThan(1);
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it('parses responseText as JSON for schema check', async () => {
    const agent: AgentFn = async () => ({
      responseText: '{"name": "Alice", "age": 30}',
    });

    const result = await runSuite({
      cases: {
        test_cases: [{
          id: 'tc-001',
          query: 'Test',
          checks: {
            schema: { requiredKeys: ['name', 'age'], typeChecks: { name: 'string', age: 'number' } },
          },
        }],
      },
      agent,
      print: false,
    });

    expect(result.cases[0].passed).toBe(true);
    expect(result.cases[0].checks.results.some((r) => r.key === 'schema_match')).toBe(true);
  });

  it('treats cases with no checks as passing (smoke test)', async () => {
    const result = await runSuite({
      cases: {
        test_cases: [
          { id: 'tc-001', query: 'Hello', checks: {} },
        ],
      },
      agent: simpleAgent,
      print: false,
    });

    expect(result.cases[0].passed).toBe(true);
  });

  it('includes suite name from options', async () => {
    const result = await runSuite({
      cases: { test_cases: [{ id: 'tc-001', query: 'Hello', checks: {} }] },
      agent: simpleAgent,
      name: 'My Test Suite',
      print: false,
    });

    expect(result.name).toBe('My Test Suite');
  });

  it('includes suite name from config', async () => {
    const result = await runSuite({
      cases: { name: 'Config Suite', test_cases: [{ id: 'tc-001', query: 'Hello', checks: {} }] },
      agent: simpleAgent,
      print: false,
    });

    expect(result.name).toBe('Config Suite');
  });

  it('preserves metadata in results', async () => {
    const result = await runSuite({
      cases: {
        test_cases: [{
          id: 'tc-001',
          query: 'Hello',
          checks: {},
          metadata: { category: 'greeting' },
        }],
      },
      agent: simpleAgent,
      print: false,
    });

    expect(result.cases[0].metadata).toEqual({ category: 'greeting' });
  });

  it('records duration', async () => {
    const result = await runSuite({
      cases: { test_cases: [{ id: 'tc-001', query: 'Hello', checks: {} }] },
      agent: simpleAgent,
      print: false,
    });

    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  describe('live printing', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    let output: string[];

    beforeEach(() => {
      output = [];
      consoleSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        output.push(args.map(String).join(' '));
      });
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('prints results live by default', async () => {
      await runSuite({
        cases: {
          test_cases: [
            { id: 'tc-001', query: 'Hello', checks: { mustContain: ['Response'] } },
            { id: 'tc-002', query: 'World', checks: { mustContain: ['missing'] } },
          ],
        },
        agent: simpleAgent,
      });

      const combined = output.join('\n');
      expect(combined).toContain('Suite:');
      expect(combined).toContain('tc-001');
      expect(combined).toContain('PASS');
      expect(combined).toContain('tc-002');
      expect(combined).toContain('FAIL');
      expect(combined).toContain('1/2 passed');
    });

    it('prints nothing when print: false', async () => {
      await runSuite({
        cases: {
          test_cases: [
            { id: 'tc-001', query: 'Hello', checks: {} },
          ],
        },
        agent: simpleAgent,
        print: false,
      });

      expect(output).toHaveLength(0);
    });
  });
});
