import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { printSuiteResult } from '../src/runner/reporter';
import { SuiteResult } from '../src/runner/types';

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

  it('prints PASS for passing cases', () => {
    const result: SuiteResult = {
      name: 'Test Suite',
      passed: 1,
      failed: 0,
      total: 1,
      duration: 1200,
      cases: [{
        id: 'tc-001',
        query: 'Hello world',
        passed: true,
        checks: { passed: true, results: [], summary: '0/0 checks passed' },
        agentResult: { responseText: 'Hi', latencyMs: 1200 },
      }],
    };

    printSuiteResult(result);
    const combined = output.join('\n');
    expect(combined).toContain('PASS');
    expect(combined).toContain('tc-001');
  });

  it('prints FAIL with details for failing cases', () => {
    const result: SuiteResult = {
      name: 'Test Suite',
      passed: 0,
      failed: 1,
      total: 1,
      duration: 3400,
      cases: [{
        id: 'tc-002',
        query: 'Show me my holdings',
        passed: false,
        checks: {
          passed: false,
          results: [{
            key: 'content_match',
            passed: false,
            details: 'Missing: $',
          }],
          summary: '0/1 checks passed',
        },
        agentResult: { responseText: 'No data', latencyMs: 3400 },
      }],
    };

    printSuiteResult(result);
    const combined = output.join('\n');
    expect(combined).toContain('FAIL');
    expect(combined).toContain('tc-002');
    expect(combined).toContain('content_match');
    expect(combined).toContain('Missing: $');
  });

  it('prints summary line', () => {
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
    expect(combined).toContain('1/2 passed');
    expect(combined).toContain('4.6s');
  });
});
