import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printCaseResult, printSuiteResult } from '../src/runner/reporter';
import { CaseResult, SuiteResult } from '../src/runner/types';

describe('printCaseResult', () => {
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

  it('prints PASS with latency', () => {
    const c: CaseResult = {
      id: 'tc-001',
      query: 'Hello world',
      passed: true,
      checks: { passed: true, results: [], summary: '0/0 checks passed' },
      agentResult: { responseText: 'Hi', latencyMs: 1200 },
    };

    printCaseResult(c);
    const combined = output.join('\n');
    expect(combined).toContain('PASS');
    expect(combined).toContain('tc-001');
    expect(combined).toContain('1.2s');
  });

  it('prints FAIL with check details', () => {
    const c: CaseResult = {
      id: 'tc-002',
      query: 'Show me my holdings',
      passed: false,
      checks: {
        passed: false,
        results: [{ key: 'content_match', passed: false, details: 'Missing: $' }],
        summary: '0/1 checks passed',
      },
      agentResult: { responseText: 'No data', latencyMs: 3400 },
    };

    printCaseResult(c);
    const combined = output.join('\n');
    expect(combined).toContain('FAIL');
    expect(combined).toContain('content_match');
    expect(combined).toContain('Missing: $');
  });

  it('omits latency when not provided', () => {
    const c: CaseResult = {
      id: 'tc-003',
      query: 'Test',
      passed: true,
      checks: { passed: true, results: [], summary: '0/0 checks passed' },
      agentResult: { responseText: 'ok' },
    };

    printCaseResult(c);
    const combined = output.join('\n');
    expect(combined).toContain('PASS');
    expect(combined).not.toMatch(/\d+\.\d+s/);
  });
});

describe('printSuiteResult', () => {
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

  it('prints header, cases, and summary', () => {
    const result: SuiteResult = {
      name: 'Test Suite',
      passed: 1,
      failed: 1,
      total: 2,
      duration: 4600,
      cases: [
        {
          id: 'tc-001',
          query: 'Hello',
          passed: true,
          checks: { passed: true, results: [], summary: '0/0 checks passed' },
          agentResult: { responseText: 'Hi', latencyMs: 1200 },
        },
        {
          id: 'tc-002',
          query: 'World',
          passed: false,
          checks: {
            passed: false,
            results: [{ key: 'content_match', passed: false, details: 'Missing: x' }],
            summary: '0/1 checks passed',
          },
          agentResult: { responseText: 'No', latencyMs: 3400 },
        },
      ],
    };

    printSuiteResult(result);
    const combined = output.join('\n');
    expect(combined).toContain('Suite: Test Suite');
    expect(combined).toContain('PASS');
    expect(combined).toContain('FAIL');
    expect(combined).toContain('1/2 passed');
    expect(combined).toContain('4.6s');
  });
});
