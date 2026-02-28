import { describe, it, expect } from 'vitest';
import { nonEmpty, createNonEmptyEvaluator } from '../src/checks/non-empty';

describe('nonEmpty', () => {
  it('passes for normal response text', () => {
    const result = nonEmpty({ responseText: 'Here is your data analysis.' });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('non_empty');
    expect(result.details).toBe('Response is non-empty');
  });

  it('fails for empty string', () => {
    const result = nonEmpty({ responseText: '' });
    expect(result.passed).toBe(false);
    expect(result.details).toBe('Response is empty');
  });

  it('fails for whitespace-only string', () => {
    const result = nonEmpty({ responseText: '   \n\t  ' });
    expect(result.passed).toBe(false);
    expect(result.details).toBe('Response is empty');
  });

  it('fails for default cop-out phrases', () => {
    const result = nonEmpty({ responseText: "I don't know" });
    expect(result.passed).toBe(false);
    expect(result.details).toContain('cop-out phrase');
  });

  it('is case-insensitive for cop-out phrases', () => {
    const result = nonEmpty({ responseText: "I DON'T KNOW" });
    expect(result.passed).toBe(false);
  });

  it('matches cop-out phrases exactly (not as substrings)', () => {
    const result = nonEmpty({
      responseText: "I don't know the exact number, but it's around 50.",
    });
    expect(result.passed).toBe(true);
  });

  it('uses custom cop-out phrases when provided', () => {
    const result = nonEmpty({
      responseText: 'No comment',
      copOutPhrases: ['no comment', 'pass'],
    });
    expect(result.passed).toBe(false);
  });

  it('does not use default phrases when custom list is provided', () => {
    const result = nonEmpty({
      responseText: "I don't know",
      copOutPhrases: ['no comment'],
    });
    expect(result.passed).toBe(true);
  });

  it('trims whitespace before checking cop-out phrases', () => {
    const result = nonEmpty({ responseText: '  N/A  ' });
    expect(result.passed).toBe(false);
  });
});

describe('createNonEmptyEvaluator', () => {
  it('creates a reusable evaluator with custom phrases', () => {
    const evaluator = createNonEmptyEvaluator({
      copOutPhrases: ['skip', 'none'],
    });

    expect(evaluator({ responseText: 'valid response' }).passed).toBe(true);
    expect(evaluator({ responseText: 'skip' }).passed).toBe(false);
  });

  it('creates evaluator with default phrases', () => {
    const evaluator = createNonEmptyEvaluator();
    expect(evaluator({ responseText: 'N/A' }).passed).toBe(false);
  });
});
