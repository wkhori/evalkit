import { describe, it, expect } from 'vitest';
import { lengthBounds, createLengthBoundsEvaluator } from '../src/checks/length-bounds';

describe('lengthBounds', () => {
  it('passes when within bounds', () => {
    const result = lengthBounds({ responseText: 'Hello world', min: 5, max: 50 });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('length_bounds');
    expect(result.length).toBe(11);
  });

  it('fails when below minimum', () => {
    const result = lengthBounds({ responseText: 'Hi', min: 10 });
    expect(result.passed).toBe(false);
    expect(result.details).toContain('below minimum');
    expect(result.length).toBe(2);
  });

  it('fails when above maximum', () => {
    const result = lengthBounds({ responseText: 'A very long response text', max: 10 });
    expect(result.passed).toBe(false);
    expect(result.details).toContain('above maximum');
  });

  it('passes at exact minimum boundary', () => {
    const result = lengthBounds({ responseText: 'abcde', min: 5 });
    expect(result.passed).toBe(true);
  });

  it('passes at exact maximum boundary', () => {
    const result = lengthBounds({ responseText: 'abcde', max: 5 });
    expect(result.passed).toBe(true);
  });

  it('passes when no bounds specified', () => {
    const result = lengthBounds({ responseText: 'anything' });
    expect(result.passed).toBe(true);
  });

  it('reports both violations when both bounds are violated', () => {
    // This can't actually happen simultaneously, but check min-only and max-only
    const tooShort = lengthBounds({ responseText: 'ab', min: 5, max: 10 });
    expect(tooShort.passed).toBe(false);

    const tooLong = lengthBounds({ responseText: 'a'.repeat(20), min: 5, max: 10 });
    expect(tooLong.passed).toBe(false);
  });

  it('includes min and max in result', () => {
    const result = lengthBounds({ responseText: 'test', min: 1, max: 100 });
    expect(result.min).toBe(1);
    expect(result.max).toBe(100);
  });
});

describe('createLengthBoundsEvaluator', () => {
  it('creates a reusable evaluator with fixed bounds', () => {
    const evaluator = createLengthBoundsEvaluator({ min: 10, max: 1000 });

    expect(evaluator({ responseText: 'Short' }).passed).toBe(false);
    expect(evaluator({ responseText: 'A sufficiently long response' }).passed).toBe(true);
  });
});
