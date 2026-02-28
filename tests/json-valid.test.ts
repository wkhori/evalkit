import { describe, it, expect } from 'vitest';
import { jsonValid, createJsonValidEvaluator } from '../src/checks/json-valid';

describe('jsonValid', () => {
  it('passes for valid JSON object', () => {
    const result = jsonValid({ text: '{"name": "test", "value": 42}' });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('json_valid');
    expect(result.details).toBe('Valid JSON');
  });

  it('passes for valid JSON array', () => {
    const result = jsonValid({ text: '[1, 2, 3]' });
    expect(result.passed).toBe(true);
  });

  it('passes for valid JSON primitives', () => {
    expect(jsonValid({ text: '"hello"' }).passed).toBe(true);
    expect(jsonValid({ text: '42' }).passed).toBe(true);
    expect(jsonValid({ text: 'true' }).passed).toBe(true);
    expect(jsonValid({ text: 'null' }).passed).toBe(true);
  });

  it('fails for invalid JSON', () => {
    const result = jsonValid({ text: '{invalid json}' });
    expect(result.passed).toBe(false);
    expect(result.details).toBe('Invalid JSON');
  });

  it('fails for empty string', () => {
    const result = jsonValid({ text: '' });
    expect(result.passed).toBe(false);
  });

  it('rejects primitives when requireObject is true', () => {
    expect(jsonValid({ text: '"hello"', requireObject: true }).passed).toBe(false);
    expect(jsonValid({ text: '42', requireObject: true }).passed).toBe(false);
    expect(jsonValid({ text: 'null', requireObject: true }).passed).toBe(false);
  });

  it('allows objects and arrays when requireObject is true', () => {
    expect(jsonValid({ text: '{"a": 1}', requireObject: true }).passed).toBe(true);
    expect(jsonValid({ text: '[1, 2]', requireObject: true }).passed).toBe(true);
  });

  it('reports type in details when requireObject fails', () => {
    const result = jsonValid({ text: '42', requireObject: true });
    expect(result.details).toBe('Expected object or array, got number');
  });

  it('reports null specifically when requireObject fails on null', () => {
    const result = jsonValid({ text: 'null', requireObject: true });
    expect(result.details).toBe('Expected object or array, got null');
  });
});

describe('createJsonValidEvaluator', () => {
  it('creates a reusable evaluator', () => {
    const evaluator = createJsonValidEvaluator({ requireObject: true });

    expect(evaluator({ text: '{"a": 1}' }).passed).toBe(true);
    expect(evaluator({ text: '42' }).passed).toBe(false);
  });

  it('creates evaluator with no config', () => {
    const evaluator = createJsonValidEvaluator();
    expect(evaluator({ text: '42' }).passed).toBe(true);
  });
});
