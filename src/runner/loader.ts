import fs from 'node:fs';
import path from 'node:path';
import { SuiteConfig, TestCase } from './schema';

// ---------------------------------------------------------------------------
// Minimal YAML parser — handles the subset needed for test-case files
// ---------------------------------------------------------------------------

interface YamlLine {
  indent: number;
  raw: string;
  content: string; // after stripping indent
}

function stripComment(line: string): string {
  // Walk the string respecting quoted regions
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

function tokenize(content: string): YamlLine[] {
  const lines: YamlLine[] = [];
  for (const raw of content.split('\n')) {
    const stripped = stripComment(raw);
    if (stripped.trim() === '') continue;
    const indent = stripped.search(/\S/);
    if (indent === -1) continue;
    lines.push({ indent, raw: stripped, content: stripped.slice(indent) });
  }
  return lines;
}

function parseScalar(value: string): string | number | boolean | null {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;

  // Quoted strings
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Numbers
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}

function parseFlowArray(raw: string): unknown[] {
  // raw is like "[item1, item2, ...]"
  const inner = raw.slice(1, -1).trim();
  if (inner === '') return [];

  const items: string[] = [];
  let current = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; }
    else if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; }
    else if (ch === '[' && !inSingle && !inDouble) { depth++; current += ch; }
    else if (ch === ']' && !inSingle && !inDouble) { depth--; current += ch; }
    else if (ch === ',' && depth === 0 && !inSingle && !inDouble) {
      items.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') items.push(current.trim());

  return items.map((item) => parseScalar(item));
}

function parseBlock(lines: YamlLine[], start: number, baseIndent: number): [Record<string, unknown>, number] {
  const result: Record<string, unknown> = {};
  let i = start;

  while (i < lines.length && lines[i].indent >= baseIndent) {
    const line = lines[i];

    if (line.indent < baseIndent) break;
    if (line.indent > baseIndent) break; // belongs to a parent or sibling block

    const content = line.content;

    // Sequence item at mapping level: "- key: value" or "- value"
    if (content.startsWith('- ')) {
      break; // sequences are handled by the caller
    }

    // Key-value pair
    const colonIdx = findColon(content);
    if (colonIdx === -1) {
      throw new Error(`YAML parse error: expected key-value pair, got "${content}"`);
    }

    const key = content.slice(0, colonIdx).trim();
    const valueRaw = content.slice(colonIdx + 1).trim();

    if (valueRaw === '' || valueRaw === '') {
      // Check next line for nested content
      if (i + 1 < lines.length && lines[i + 1].indent > baseIndent) {
        const nextIndent = lines[i + 1].indent;
        const nextContent = lines[i + 1].content;

        if (nextContent.startsWith('- ')) {
          // Block sequence
          const [arr, newI] = parseSequence(lines, i + 1, nextIndent);
          result[key] = arr;
          i = newI;
        } else {
          // Nested mapping
          const [nested, newI] = parseBlock(lines, i + 1, nextIndent);
          result[key] = nested;
          i = newI;
        }
      } else {
        result[key] = null;
        i++;
      }
    } else if (valueRaw.startsWith('[') && valueRaw.endsWith(']')) {
      result[key] = parseFlowArray(valueRaw);
      i++;
    } else {
      result[key] = parseScalar(valueRaw);
      i++;
    }
  }

  return [result, i];
}

function parseSequence(lines: YamlLine[], start: number, baseIndent: number): [unknown[], number] {
  const result: unknown[] = [];
  let i = start;

  while (i < lines.length && lines[i].indent >= baseIndent) {
    const line = lines[i];

    if (line.indent < baseIndent) break;
    if (line.indent > baseIndent) break;

    const content = line.content;
    if (!content.startsWith('- ')) break;

    const afterDash = content.slice(2).trim();

    if (afterDash === '') {
      // Nested block under sequence item
      if (i + 1 < lines.length && lines[i + 1].indent > baseIndent) {
        const nextIndent = lines[i + 1].indent;
        const [nested, newI] = parseBlock(lines, i + 1, nextIndent);
        result.push(nested);
        i = newI;
      } else {
        result.push(null);
        i++;
      }
    } else if (findColon(afterDash) !== -1 && !afterDash.startsWith('"') && !afterDash.startsWith("'")) {
      // Inline mapping: "- key: value\n    more_key: value"
      // Rewrite as a mapping starting at dash + 2 indent
      const inlineIndent = line.indent + 2;
      // Parse the first key-value from afterDash
      const colonIdx = findColon(afterDash);
      const firstKey = afterDash.slice(0, colonIdx).trim();
      const firstValRaw = afterDash.slice(colonIdx + 1).trim();
      const obj: Record<string, unknown> = {};

      if (firstValRaw === '') {
        // Nested value on the next lines
        if (i + 1 < lines.length && lines[i + 1].indent > inlineIndent) {
          const nextIndent = lines[i + 1].indent;
          const nextContent = lines[i + 1].content;
          if (nextContent.startsWith('- ')) {
            const [arr, newI] = parseSequence(lines, i + 1, nextIndent);
            obj[firstKey] = arr;
            i = newI;
          } else {
            const [nested, newI] = parseBlock(lines, i + 1, nextIndent);
            obj[firstKey] = nested;
            i = newI;
          }
        } else {
          obj[firstKey] = null;
          i++;
        }
      } else if (firstValRaw.startsWith('[') && firstValRaw.endsWith(']')) {
        obj[firstKey] = parseFlowArray(firstValRaw);
        i++;
      } else {
        obj[firstKey] = parseScalar(firstValRaw);
        i++;
      }

      // Continue reading sibling keys at inlineIndent
      while (i < lines.length && lines[i].indent === inlineIndent) {
        const sibContent = lines[i].content;
        if (sibContent.startsWith('- ')) break;

        const sibColon = findColon(sibContent);
        if (sibColon === -1) break;

        const sibKey = sibContent.slice(0, sibColon).trim();
        const sibValRaw = sibContent.slice(sibColon + 1).trim();

        if (sibValRaw === '') {
          if (i + 1 < lines.length && lines[i + 1].indent > inlineIndent) {
            const nextIndent = lines[i + 1].indent;
            const nextContent = lines[i + 1].content;
            if (nextContent.startsWith('- ')) {
              const [arr, newI] = parseSequence(lines, i + 1, nextIndent);
              obj[sibKey] = arr;
              i = newI;
            } else {
              const [nested, newI] = parseBlock(lines, i + 1, nextIndent);
              obj[sibKey] = nested;
              i = newI;
            }
          } else {
            obj[sibKey] = null;
            i++;
          }
        } else if (sibValRaw.startsWith('[') && sibValRaw.endsWith(']')) {
          obj[sibKey] = parseFlowArray(sibValRaw);
          i++;
        } else {
          obj[sibKey] = parseScalar(sibValRaw);
          i++;
        }
      }

      result.push(obj);
    } else if (afterDash.startsWith('[') && afterDash.endsWith(']')) {
      result.push(parseFlowArray(afterDash));
      i++;
    } else {
      result.push(parseScalar(afterDash));
      i++;
    }
  }

  return [result, i];
}

/** Find the first colon that is not inside quotes. */
function findColon(str: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ':' && !inSingle && !inDouble) {
      // A YAML key colon must be followed by space, end-of-string, or nothing
      if (i + 1 >= str.length || str[i + 1] === ' ') {
        return i;
      }
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Parse a YAML string into a SuiteConfig. */
export function parseYaml(content: string): SuiteConfig {
  const lines = tokenize(content);
  if (lines.length === 0) {
    throw new Error('YAML is empty');
  }

  const [parsed] = parseBlock(lines, 0, lines[0].indent);
  return validate(parsed);
}

/** Parse a JSON string into a SuiteConfig. */
export function parseJson(content: string): SuiteConfig {
  const parsed = JSON.parse(content);
  return validate(parsed);
}

/** Read a file from disk and parse by extension. */
export function loadFile(filePath: string): SuiteConfig {
  const ext = path.extname(filePath).toLowerCase();

  if (ext !== '.json' && ext !== '.yaml' && ext !== '.yml') {
    throw new Error(`Unsupported file extension: ${ext}. Use .json, .yaml, or .yml`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  if (ext === '.json') {
    return parseJson(content);
  }
  return parseYaml(content);
}

/**
 * Main entry point. Accepts a file path (string) or an inline SuiteConfig.
 * If a string is provided, delegates to loadFile.
 */
export function loadCases(source: string | SuiteConfig): SuiteConfig {
  if (typeof source === 'string') {
    return loadFile(source);
  }
  return validate(source);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(data: unknown): SuiteConfig {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid suite config: expected an object');
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.test_cases)) {
    throw new Error('Invalid suite config: missing test_cases array');
  }

  for (const tc of obj.test_cases) {
    if (typeof tc !== 'object' || tc === null) {
      throw new Error('Invalid test case: expected an object');
    }
    const c = tc as Record<string, unknown>;
    if (typeof c.id !== 'string') {
      throw new Error('Invalid test case: missing or non-string id');
    }
    if (typeof c.query !== 'string') {
      throw new Error('Invalid test case: missing or non-string query');
    }
  }

  return {
    name: typeof obj.name === 'string' ? obj.name : undefined,
    test_cases: obj.test_cases as TestCase[],
  };
}
