import { describe, it, expect } from 'vitest';
import { toolSelection, createToolSelectionEvaluator } from '../src/checks/tool-selection';

describe('toolSelection', () => {
  it('passes when expected and actual match exactly', () => {
    const result = toolSelection({
      expected: ['vector_search', 'sql_query'],
      actual: ['sql_query', 'vector_search'],
    });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('tool_selection');
    expect(result.details).toBe('All expected tools matched');
  });

  it('fails when tools are missing', () => {
    const result = toolSelection({
      expected: ['vector_search', 'sql_query'],
      actual: ['vector_search'],
    });
    expect(result.passed).toBe(false);

    expect(result.details).toContain('Missing: sql_query');
  });

  it('fails when unexpected tools are present', () => {
    const result = toolSelection({
      expected: ['vector_search'],
      actual: ['vector_search', 'delete_all'],
    });
    expect(result.passed).toBe(false);

    expect(result.details).toContain('Unexpected: delete_all');
  });

  it('reports both missing and unexpected tools', () => {
    const result = toolSelection({
      expected: ['tool_a'],
      actual: ['tool_b'],
    });
    expect(result.passed).toBe(false);
    expect(result.details).toContain('Missing: tool_a');
    expect(result.details).toContain('Unexpected: tool_b');
  });

  it('deduplicates tools (set equality)', () => {
    const result = toolSelection({
      expected: ['a', 'a', 'b'],
      actual: ['b', 'a', 'a'],
    });
    expect(result.passed).toBe(true);
  });

  it('passes when both are empty', () => {
    const result = toolSelection({ expected: [], actual: [] });
    expect(result.passed).toBe(true);
  });

  it('returns expected and actual arrays in result', () => {
    const result = toolSelection({
      expected: ['a', 'b'],
      actual: ['a', 'b'],
    });
    expect(result.expected).toEqual(['a', 'b']);
    expect(result.actual).toEqual(expect.arrayContaining(['a', 'b']));
  });
});

describe('createToolSelectionEvaluator', () => {
  it('creates a reusable evaluator with fixed expected tools', () => {
    const evaluator = createToolSelectionEvaluator({
      expected: ['search', 'summarize'],
    });

    const pass = evaluator({ actual: ['search', 'summarize'] });
    expect(pass.passed).toBe(true);

    const fail = evaluator({ actual: ['search'] });
    expect(fail.passed).toBe(false);
  });
});
