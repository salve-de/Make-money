import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseRunOptions, resolveRunIdentity} from './gemini-run-options.mjs';
test('option values cannot accidentally become the output directory', () => {
  const options = parseRunOptions(['--subject', 'Independent manufacturing business', '--dir', '/tmp/example', '--run-id', 'run_example']);
  assert.equal(options.directory, '/tmp/example');
  assert.deepEqual(resolveRunIdentity(options), {subject: 'Independent manufacturing business', runId: 'run_example'});
});
test('unknown or incomplete options fail before calling provider', () => {
  for (const args of [[], ['--subject'], ['--dir', '--enrich'], ['--typo']]) assert.throws(() => parseRunOptions(args));
});
test('resume binds subject and run, including legacy run artifacts', () => {
  const contract = {subject: 'Example', run_id: 'run_example'};
  assert.equal(resolveRunIdentity({}, contract).runId, 'run_example');
  assert.throws(() => resolveRunIdentity({subject: 'Other'}, contract), /CONFLICT/);
  assert.throws(() => resolveRunIdentity({runId: 'run_other'}, contract), /CONFLICT/);
  assert.equal(resolveRunIdentity({}, {subject: 'Example'}, 'run_legacy').runId, 'run_legacy');
});
