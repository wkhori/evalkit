import { SchemaMatchResult } from './types';

export interface SchemaMatchInput {
  /** The object to validate. */
  data: Record<string, unknown>;
  /** Keys that must be present. */
  requiredKeys: string[];
  /** Optional type constraints: key -> expected typeof result. */
  typeChecks?: Record<string, string>;
}

/**
 * Validates that a parsed object contains required keys and optionally checks value types.
 * Zero-dep — just checks key presence and typeof.
 */
export function schemaMatch(input: SchemaMatchInput): SchemaMatchResult {
  const missingKeys = input.requiredKeys.filter((k) => !(k in input.data));
  const typeErrors: string[] = [];

  if (input.typeChecks) {
    for (const [key, expectedType] of Object.entries(input.typeChecks)) {
      if (key in input.data) {
        const actualType = Array.isArray(input.data[key]) ? 'array' : typeof input.data[key];
        if (actualType !== expectedType) {
          typeErrors.push(`${key}: expected ${expectedType}, got ${actualType}`);
        }
      }
    }
  }

  const passed = missingKeys.length === 0 && typeErrors.length === 0;
  const problems: string[] = [];
  if (missingKeys.length > 0) problems.push(`Missing keys: ${missingKeys.join(', ')}`);
  if (typeErrors.length > 0) problems.push(`Type errors: ${typeErrors.join('; ')}`);

  return {
    key: 'schema_match',
    passed,
    details: passed ? 'Schema valid' : problems.join('. '),
    missingKeys,
    typeErrors,
  };
}

/**
 * Factory: creates a reusable schemaMatch evaluator with fixed schema expectations.
 */
export function createSchemaMatchEvaluator(config: {
  requiredKeys: string[];
  typeChecks?: Record<string, string>;
}) {
  return (input: { data: Record<string, unknown> }): SchemaMatchResult =>
    schemaMatch({
      data: input.data,
      requiredKeys: config.requiredKeys,
      typeChecks: config.typeChecks,
    });
}
