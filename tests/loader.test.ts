import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJson, parseYaml, loadCases } from '../src/runner/loader';
import { SuiteConfig } from '../src/runner/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('parseJson', () => {
  it('parses valid JSON with all check fields', () => {
    const json = JSON.stringify({
      test_cases: [{
        id: 'tc-001',
        query: 'What is my portfolio?',
        checks: {
          expectedTools: ['portfolio_holdings'],
          mustContain: ['%', 'AAPL'],
          mustNotContain: ["I don't know"],
          thresholdMs: 20000,
          json: { requireObject: true },
          schema: { requiredKeys: ['name'], typeChecks: { name: 'string' } },
          copOutPhrases: ['no data'],
          lengthMin: 10,
          lengthMax: 5000,
          regexPatterns: ['\\d+%'],
          regexMode: 'all',
          toolCallMin: 1,
          toolCallMax: 5,
          costBudget: 1000,
        },
      }],
    });

    const result = parseJson(json);
    expect(result.test_cases).toHaveLength(1);
    expect(result.test_cases[0].id).toBe('tc-001');
    expect(result.test_cases[0].checks.expectedTools).toEqual(['portfolio_holdings']);
    expect(result.test_cases[0].checks.costBudget).toBe(1000);
  });

  it('parses JSON with minimal fields (id + query only)', () => {
    const json = JSON.stringify({
      test_cases: [{ id: 'tc-001', query: 'Hello' }],
    });

    const result = parseJson(json);
    expect(result.test_cases).toHaveLength(1);
    expect(result.test_cases[0].id).toBe('tc-001');
    expect(result.test_cases[0].query).toBe('Hello');
  });

  it('throws on missing test_cases', () => {
    expect(() => parseJson('{}')).toThrow('missing test_cases');
  });

  it('throws on case without id', () => {
    const json = JSON.stringify({ test_cases: [{ query: 'Hello' }] });
    expect(() => parseJson(json)).toThrow('missing or non-string id');
  });

  it('throws on case without query', () => {
    const json = JSON.stringify({ test_cases: [{ id: 'tc-001' }] });
    expect(() => parseJson(json)).toThrow('missing or non-string query');
  });

  it('handles metadata fields', () => {
    const json = JSON.stringify({
      test_cases: [{
        id: 'tc-001',
        query: 'Hello',
        metadata: { category: 'greeting', difficulty: 'easy' },
      }],
    });

    const result = parseJson(json);
    expect(result.test_cases[0].metadata).toEqual({ category: 'greeting', difficulty: 'easy' });
  });
});

describe('parseYaml', () => {
  it('parses valid YAML with all check fields', () => {
    const yaml = `
test_cases:
  - id: tc-001
    query: "What is my portfolio?"
    checks:
      expectedTools:
        - portfolio_holdings
      mustContain:
        - "%"
        - AAPL
      mustNotContain:
        - "I don't know"
      thresholdMs: 20000
      lengthMin: 10
      lengthMax: 5000
      toolCallMin: 1
      toolCallMax: 5
      costBudget: 1000
`;

    const result = parseYaml(yaml);
    expect(result.test_cases).toHaveLength(1);
    expect(result.test_cases[0].id).toBe('tc-001');
    expect(result.test_cases[0].checks.expectedTools).toEqual(['portfolio_holdings']);
    expect(result.test_cases[0].checks.mustContain).toEqual(['%', 'AAPL']);
    expect(result.test_cases[0].checks.mustNotContain).toEqual(["I don't know"]);
    expect(result.test_cases[0].checks.thresholdMs).toBe(20000);
    expect(result.test_cases[0].checks.lengthMin).toBe(10);
    expect(result.test_cases[0].checks.costBudget).toBe(1000);
  });

  it('parses YAML with minimal fields (id + query only)', () => {
    const yaml = `
test_cases:
  - id: tc-001
    query: Hello
`;

    const result = parseYaml(yaml);
    expect(result.test_cases).toHaveLength(1);
    expect(result.test_cases[0].id).toBe('tc-001');
    expect(result.test_cases[0].query).toBe('Hello');
  });

  it('parses flow-style arrays [item1, item2]', () => {
    const yaml = `
test_cases:
  - id: tc-001
    query: Hello
    checks:
      mustContain: [hello, world]
      expectedTools: [search, summarize]
`;

    const result = parseYaml(yaml);
    expect(result.test_cases[0].checks.mustContain).toEqual(['hello', 'world']);
    expect(result.test_cases[0].checks.expectedTools).toEqual(['search', 'summarize']);
  });

  it('parses quoted strings with special characters', () => {
    const yaml = `
test_cases:
  - id: tc-001
    query: "What's the price of BTC?"
    checks:
      mustNotContain:
        - "I don't know"
        - 'no information'
`;

    const result = parseYaml(yaml);
    expect(result.test_cases[0].query).toBe("What's the price of BTC?");
    expect(result.test_cases[0].checks.mustNotContain).toEqual(["I don't know", 'no information']);
  });

  it('throws on missing test_cases', () => {
    const yaml = `name: my-suite`;
    expect(() => parseYaml(yaml)).toThrow('missing test_cases');
  });

  it('throws on case without id', () => {
    const yaml = `
test_cases:
  - query: Hello
`;
    expect(() => parseYaml(yaml)).toThrow('missing or non-string id');
  });

  it('throws on case without query', () => {
    const yaml = `
test_cases:
  - id: tc-001
`;
    expect(() => parseYaml(yaml)).toThrow('missing or non-string query');
  });

  it('handles comments and blank lines', () => {
    const yaml = `
# This is a comment
test_cases:
  # Another comment
  - id: tc-001
    query: Hello

    checks:
      # Check for content
      mustContain:
        - hello
`;

    const result = parseYaml(yaml);
    expect(result.test_cases).toHaveLength(1);
    expect(result.test_cases[0].checks.mustContain).toEqual(['hello']);
  });

  it('handles metadata fields', () => {
    const yaml = `
test_cases:
  - id: tc-001
    query: Hello
    metadata:
      category: greeting
      difficulty: easy
`;

    const result = parseYaml(yaml);
    expect(result.test_cases[0].metadata).toEqual({ category: 'greeting', difficulty: 'easy' });
  });
});

describe('loadCases', () => {
  it('accepts inline SuiteConfig object directly', () => {
    const config: SuiteConfig = {
      test_cases: [{ id: 'tc-001', query: 'Hello', checks: {} }],
    };

    const result = loadCases(config);
    expect(result.test_cases).toHaveLength(1);
    expect(result.test_cases[0].id).toBe('tc-001');
  });

  it('detects .json extension and parses as JSON', () => {
    const tmpFile = path.join(__dirname, '_test_cases.json');
    const data = JSON.stringify({
      test_cases: [{ id: 'tc-001', query: 'Hello' }],
    });
    fs.writeFileSync(tmpFile, data, 'utf-8');

    try {
      const result = loadCases(tmpFile);
      expect(result.test_cases).toHaveLength(1);
      expect(result.test_cases[0].id).toBe('tc-001');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('detects .yaml extension and parses as YAML', () => {
    const tmpFile = path.join(__dirname, '_test_cases.yaml');
    const yaml = `
test_cases:
  - id: tc-001
    query: Hello
`;
    fs.writeFileSync(tmpFile, yaml, 'utf-8');

    try {
      const result = loadCases(tmpFile);
      expect(result.test_cases).toHaveLength(1);
      expect(result.test_cases[0].id).toBe('tc-001');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('detects .yml extension and parses as YAML', () => {
    const tmpFile = path.join(__dirname, '_test_cases.yml');
    const yaml = `
test_cases:
  - id: tc-001
    query: Hello
`;
    fs.writeFileSync(tmpFile, yaml, 'utf-8');

    try {
      const result = loadCases(tmpFile);
      expect(result.test_cases).toHaveLength(1);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('throws on unsupported file extension', () => {
    expect(() => loadCases('test.xml')).toThrow('Unsupported file extension');
  });
});
