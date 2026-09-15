import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { approveLocalEntities } from './local-entity-approvals';

const roots: string[] = [];
const rows = [{ id: 'a', tags: ['収集事例', 'A'] }, { id: 'b', tags: ['収集事例', 'B'] }];
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mm-approval-test-'));
  roots.push(root);
  await fs.writeFile(path.join(root, 'entities-index.json'), JSON.stringify(rows));
  await fs.writeFile(path.join(root, 'winners-100-definitions.json'), JSON.stringify(rows));
  return root;
}
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });
const read = async (root: string, name = 'entities-index.json') => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));

describe('local approval persistence contract', () => {
  it('does not lose either update when callers run concurrently', async () => {
    const root = await fixture();
    await Promise.all([approveLocalEntities(root, ['a']), approveLocalEntities(root, ['b'])]);
    expect(await read(root)).toEqual([{ id: 'a', tags: ['A'] }, { id: 'b', tags: ['B'] }]);
    expect(await read(root, 'winners-100-definitions.json')).toEqual(await read(root));
  });
  it('acknowledges the entire batch only after persistence and is idempotent', async () => {
    const root = await fixture();
    expect(await approveLocalEntities(root, [' A ', 'b'])).toEqual({ approvedCount: 2, entityIds: ['a', 'b'], updated: true });
    expect(await approveLocalEntities(root, ['a', 'b'])).toEqual({ approvedCount: 0, entityIds: ['a', 'b'], updated: false });
  });
  it('rejects unknown members without changing either file', async () => {
    const root = await fixture();
    await expect(approveLocalEntities(root, ['a', 'missing'])).rejects.toMatchObject({ status: 404 });
    expect(await read(root)).toEqual(rows);
    expect(await read(root, 'winners-100-definitions.json')).toEqual(rows);
  });
  it('validates both stores before writing either one', async () => {
    const root = await fixture();
    await fs.writeFile(path.join(root, 'winners-100-definitions.json'), '{broken');
    await expect(approveLocalEntities(root, ['a'])).rejects.toMatchObject({ status: 503 });
    expect(await read(root)).toEqual(rows);
  });
  it('allows an absent optional projection, not an absent authoritative index', async () => {
    const root = await fixture();
    await fs.rm(path.join(root, 'winners-100-definitions.json'));
    expect((await approveLocalEntities(root, ['a'])).approvedCount).toBe(1);
    await fs.rm(path.join(root, 'entities-index.json'));
    await expect(approveLocalEntities(root, ['b'])).rejects.toMatchObject({ status: 503 });
  });
  it('recovers an interrupted write before accepting a new operation', async () => {
    const root = await fixture();
    await fs.writeFile(path.join(root, '.entity-approval-journal.json'), JSON.stringify([
      { name: 'entities-index.json', previous: JSON.stringify(rows) },
      { name: 'winners-100-definitions.json', previous: JSON.stringify(rows) },
    ]));
    await fs.writeFile(path.join(root, 'entities-index.json'), JSON.stringify([{ id: 'a', tags: [] }, { id: 'b', tags: [] }]));
    await approveLocalEntities(root, ['a']);
    expect(await read(root)).toEqual([{ id: 'a', tags: ['A'] }, rows[1]]);
    expect(await read(root, 'winners-100-definitions.json')).toEqual(await read(root));
    await expect(fs.stat(path.join(root, '.entity-approval-journal.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('never steals a lock held by another process', async () => {
    const root = await fixture();
    await fs.mkdir(path.join(root, '.entity-approval.lock'));
    await expect(approveLocalEntities(root, ['a'])).rejects.toMatchObject({ status: 409 });
    expect(await read(root)).toEqual(rows);
  });
  it('preserves all:true compatibility while returning actual acknowledged IDs', async () => {
    const root = await fixture();
    expect((await approveLocalEntities(root, [], true)).entityIds).toEqual(['a', 'b']);
  });
});
