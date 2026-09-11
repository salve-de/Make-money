import { Validator, type Schema, type SchemaDraft } from '@cfworker/json-schema';

/**
 * Build an external-data parser without runtime code generation.
 *
 * Ajv remains useful in the Node-only schema generation/ingestion scripts, but
 * its default compiler uses eval/new Function. Cloudflare Workers explicitly
 * disallow those APIs, so application-boundary validation must use an
 * interpreter that is safe to construct inside a Worker.
 */
export function compileParser<T>(schema: object, label: string) {
  const draft: SchemaDraft = schemaHasDraft(schema) ? schemaDraft(schema) : '7';
  const validator = new Validator(schema as Schema, draft, false);

  return (input: unknown): T => {
    // TypeScript's optional properties can be present as `undefined` in
    // in-memory records even though JSON transports omit them. Validate the
    // JSON-shaped view while returning the original object unchanged.
    const candidate = omitUndefinedProperties(input);
    const nonFinitePath = findNonFiniteNumber(candidate);
    if (nonFinitePath) throw new Error(`Invalid ${label}: ${nonFinitePath} number`);

    const result = validator.validate(candidate);
    if (!result.valid) {
      // Never include the input payload: it can contain private source data.
      const paths = result.errors.map((error) => `${error.instanceLocation || '#'} ${error.keyword}`).join(', ');
      throw new Error(`Invalid ${label}: ${paths || 'schema validation failed'}`);
    }
    return input as T;
  };
}

function omitUndefinedProperties(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(omitUndefinedProperties);
  if (!value || typeof value !== 'object') return value;

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (child !== undefined) output[key] = omitUndefinedProperties(child);
  }
  return output;
}

function findNonFiniteNumber(value: unknown, path = '#'): string | null {
  if (typeof value === 'number') return Number.isFinite(value) ? null : path;
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      const found = findNonFiniteNumber(child, `${path}/${index}`);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value)) {
    const found = findNonFiniteNumber(child, `${path}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
    if (found) return found;
  }
  return null;
}

function schemaHasDraft(schema: object): schema is { $schema: string } {
  return typeof (schema as { $schema?: unknown }).$schema === 'string';
}

function schemaDraft(schema: { $schema: string }): SchemaDraft {
  if (schema.$schema.includes('draft-04')) return '4';
  if (schema.$schema.includes('draft-07')) return '7';
  if (schema.$schema.includes('2019-09')) return '2019-09';
  if (schema.$schema.includes('2020-12')) return '2020-12';
  return '7';
}
