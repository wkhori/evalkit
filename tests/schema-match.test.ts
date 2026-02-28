import { describe, it, expect } from 'vitest';
import { schemaMatch, createSchemaMatchEvaluator } from '../src/checks/schema-match';

describe('schemaMatch', () => {
  it('passes when all required keys are present', () => {
    const result = schemaMatch({
      data: { name: 'Alice', age: 30, email: 'alice@example.com' },
      requiredKeys: ['name', 'age', 'email'],
    });
    expect(result.passed).toBe(true);
    expect(result.key).toBe('schema_match');
    expect(result.details).toBe('Schema valid');
    expect(result.missingKeys).toEqual([]);
    expect(result.typeErrors).toEqual([]);
  });

  it('fails when keys are missing', () => {
    const result = schemaMatch({
      data: { name: 'Alice' },
      requiredKeys: ['name', 'age', 'email'],
    });
    expect(result.passed).toBe(false);
    expect(result.missingKeys).toEqual(['age', 'email']);
    expect(result.details).toContain('Missing keys: age, email');
  });

  it('validates types with typeChecks', () => {
    const result = schemaMatch({
      data: { name: 'Alice', age: 30 },
      requiredKeys: ['name', 'age'],
      typeChecks: { name: 'string', age: 'number' },
    });
    expect(result.passed).toBe(true);
  });

  it('fails when types are wrong', () => {
    const result = schemaMatch({
      data: { name: 'Alice', age: 'thirty' },
      requiredKeys: ['name', 'age'],
      typeChecks: { name: 'string', age: 'number' },
    });
    expect(result.passed).toBe(false);
    expect(result.typeErrors).toEqual(['age: expected number, got string']);
  });

  it('handles array type checking', () => {
    const result = schemaMatch({
      data: { items: [1, 2, 3] },
      requiredKeys: ['items'],
      typeChecks: { items: 'array' },
    });
    expect(result.passed).toBe(true);
  });

  it('distinguishes arrays from objects in type checks', () => {
    const result = schemaMatch({
      data: { items: [1, 2, 3] },
      requiredKeys: ['items'],
      typeChecks: { items: 'object' },
    });
    expect(result.passed).toBe(false);
    expect(result.typeErrors).toEqual(['items: expected object, got array']);
  });

  it('skips type checking for missing keys', () => {
    const result = schemaMatch({
      data: {},
      requiredKeys: ['name'],
      typeChecks: { name: 'string' },
    });
    expect(result.passed).toBe(false);
    expect(result.missingKeys).toEqual(['name']);
    expect(result.typeErrors).toEqual([]);
  });

  it('reports both missing keys and type errors', () => {
    const result = schemaMatch({
      data: { name: 42 },
      requiredKeys: ['name', 'email'],
      typeChecks: { name: 'string' },
    });
    expect(result.passed).toBe(false);
    expect(result.missingKeys).toEqual(['email']);
    expect(result.typeErrors).toEqual(['name: expected string, got number']);
  });
});

describe('createSchemaMatchEvaluator', () => {
  it('creates a reusable evaluator', () => {
    const evaluator = createSchemaMatchEvaluator({
      requiredKeys: ['id', 'name'],
      typeChecks: { id: 'number', name: 'string' },
    });

    expect(evaluator({ data: { id: 1, name: 'test' } }).passed).toBe(true);
    expect(evaluator({ data: { id: '1', name: 'test' } }).passed).toBe(false);
  });
});
