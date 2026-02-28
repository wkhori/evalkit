import { describe, it, expect } from 'vitest';
import { latency, createLatencyEvaluator } from '../src/checks/latency';

describe('latency', () => {
  it('passes when within threshold', () => {
    const result = latency({ latencyMs: 1200, thresholdMs: 5000 });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('latency');
    expect(result.ms).toBe(1200);
    expect(result.threshold).toBe(5000);
    expect(result.details).toBe('1200ms within 5000ms threshold');
  });

  it('fails when exceeding threshold', () => {
    const result = latency({ latencyMs: 25000, thresholdMs: 20000 });
    expect(result.passed).toBe(false);
    expect(result.details).toBe('25000ms exceeded 20000ms threshold');
  });

  it('passes at exact threshold (<=)', () => {
    const result = latency({ latencyMs: 5000, thresholdMs: 5000 });
    expect(result.passed).toBe(true);
  });

  it('uses default threshold of 20000ms', () => {
    const result = latency({ latencyMs: 19000 });
    expect(result.passed).toBe(true);
    expect(result.threshold).toBe(20000);
  });

  it('fails with default threshold when too slow', () => {
    const result = latency({ latencyMs: 21000 });
    expect(result.passed).toBe(false);
    expect(result.threshold).toBe(20000);
  });
});

describe('createLatencyEvaluator', () => {
  it('creates a reusable evaluator with fixed threshold', () => {
    const evaluator = createLatencyEvaluator({ thresholdMs: 3000 });

    const pass = evaluator({ latencyMs: 2000 });
    expect(pass.passed).toBe(true);

    const fail = evaluator({ latencyMs: 4000 });
    expect(fail.passed).toBe(false);
  });
});
