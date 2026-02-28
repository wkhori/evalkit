import { LatencyResult } from './types';

export interface LatencyInput {
  latencyMs: number;
  thresholdMs?: number;
}

/**
 * Simple threshold check: latencyMs <= thresholdMs.
 * Default threshold: 20,000ms.
 */
export function latency(input: LatencyInput): LatencyResult {
  const threshold = input.thresholdMs ?? 20000;
  const passed = input.latencyMs <= threshold;

  return {
    key: 'latency',
    passed,
    details: passed
      ? `${input.latencyMs}ms within ${threshold}ms threshold`
      : `${input.latencyMs}ms exceeded ${threshold}ms threshold`,
    ms: input.latencyMs,
    threshold,
  };
}

/**
 * Factory: creates a reusable latency evaluator with a fixed threshold.
 */
export function createLatencyEvaluator(config: { thresholdMs: number }) {
  return (input: { latencyMs: number }): LatencyResult =>
    latency({ latencyMs: input.latencyMs, thresholdMs: config.thresholdMs });
}
