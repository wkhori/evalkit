import { describe, it, expect } from 'vitest';
import { toolCallCount, createToolCallCountEvaluator } from '../src/checks/tool-call-count';

describe('toolCallCount', () => {
  it('passes when within bounds', () => {
    const result = toolCallCount({ count: 3, min: 1, max: 5 });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('tool_call_count');
    expect(result.count).toBe(3);
    expect(result.details).toBe('3 tool calls within bounds');
  });

  it('fails when below minimum', () => {
    const result = toolCallCount({ count: 0, min: 1 });
    expect(result.passed).toBe(false);
    expect(result.details).toContain('below minimum');
  });

  it('fails when above maximum', () => {
    const result = toolCallCount({ count: 10, max: 5 });
    expect(result.passed).toBe(false);
    expect(result.details).toContain('above maximum');
  });

  it('passes at exact boundaries', () => {
    expect(toolCallCount({ count: 1, min: 1 }).passed).toBe(true);
    expect(toolCallCount({ count: 5, max: 5 }).passed).toBe(true);
  });

  it('passes with no bounds', () => {
    const result = toolCallCount({ count: 100 });
    expect(result.passed).toBe(true);
  });

  it('includes min and max in result', () => {
    const result = toolCallCount({ count: 3, min: 1, max: 5 });
    expect(result.min).toBe(1);
    expect(result.max).toBe(5);
  });
});

describe('createToolCallCountEvaluator', () => {
  it('creates a reusable evaluator', () => {
    const evaluator = createToolCallCountEvaluator({ min: 1, max: 3 });

    expect(evaluator({ count: 2 }).passed).toBe(true);
    expect(evaluator({ count: 5 }).passed).toBe(false);
  });
});
