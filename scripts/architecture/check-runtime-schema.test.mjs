import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { runtimeSchemaErrors } from './check-runtime-schema.mjs';

const packageJson = { dependencies: { '@cfworker/json-schema': '4.1.1' } };

test('requires an eval-free Worker validator and runtime dependency', () => {
  assert.deepEqual(runtimeSchemaErrors("import { Validator } from '@cfworker/json-schema';", packageJson), []);
  assert.match(runtimeSchemaErrors("import Ajv from 'ajv';", packageJson)[0], /must use/);
  assert.match(runtimeSchemaErrors("import { Validator } from '@cfworker/json-schema';", { dependencies: {} })[0], /runtime dependency/);
});
