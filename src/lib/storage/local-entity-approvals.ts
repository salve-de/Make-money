import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/** Local development adapter only. Production must not mutate packaged JSON. */
export class ApprovalStoreError extends Error {
  constructor(message: string, readonly status: 404 | 409 | 503) { super(message); }
}
interface EntityRow { id: string; tags?: string[]; [key: string]: unknown }
interface JournalEntry { name: string; previous: string }
const files = ['entities-index.json', 'winners-100-definitions.json'] as const;
const journalName = '.entity-approval-journal.json';

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

async function atomicWrite(file: string, text: string): Promise<void> {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const handle = await fs.open(temporary, 'wx', 0o600);
    try { await handle.writeFile(text, 'utf8'); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temporary, file);
    const directory = await fs.open(path.dirname(file), 'r');
    try { await directory.sync(); } finally { await directory.close(); }
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

function parseRows(raw: string): EntityRow[] {
  const rows: unknown = JSON.parse(raw);
  if (!Array.isArray(rows) || !rows.every((row: unknown) => row !== null && typeof row === 'object' &&
    'id' in row && typeof row.id === 'string' && row.id.trim().length > 0 &&
    (!('tags' in row) || row.tags === undefined || (Array.isArray(row.tags) && row.tags.every((tag: unknown) => typeof tag === 'string'))))) {
    throw new ApprovalStoreError('Invalid local entity store', 503);
  }
  return rows;
}

async function removeJournal(root: string): Promise<void> {
  await fs.rm(path.join(root, journalName), { force: true });
  const directory = await fs.open(root, 'r');
  try { await directory.sync(); } finally { await directory.close(); }
}

async function recover(root: string): Promise<void> {
  let raw: string;
  try { raw = await fs.readFile(path.join(root, journalName), 'utf8'); }
  catch (error) { if (hasCode(error, 'ENOENT')) return; throw error; }
  const entries: unknown = JSON.parse(raw);
  if (!Array.isArray(entries) || !entries.every((entry: unknown) => entry !== null && typeof entry === 'object' &&
    'name' in entry && typeof entry.name === 'string' && files.some((name) => name === entry.name) &&
    'previous' in entry && typeof entry.previous === 'string')) {
    throw new ApprovalStoreError('Invalid recovery journal; manual recovery required', 503);
  }
  for (const entry of entries as JournalEntry[]) {
    parseRows(entry.previous);
    await atomicWrite(path.join(root, entry.name), entry.previous);
  }
  await removeJournal(root);
}

/** Serialize all approval calls, including independent Node processes sharing this directory.
 * A crash leaves the lock in place: do not steal it automatically. After confirming the
 * old process is stopped, remove only the lock directory; the next call recovers the journal.
 */
export async function approveLocalEntities(root: string, ids: readonly string[], all = false) {
  const lock = path.join(root, '.entity-approval.lock');
  const deadline = Date.now() + 2500;
  for (;;) {
    try { await fs.mkdir(lock); break; }
    catch (error) {
      if (!hasCode(error, 'EEXIST')) throw new ApprovalStoreError('Local store unavailable', 503);
      if (Date.now() >= deadline) throw new ApprovalStoreError('Approval store busy', 409);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  try {
    await recover(root);
    const snapshots: Array<{ name: string; previous: string; rows: EntityRow[] }> = [];
    for (const name of files) {
      try {
        const previous = await fs.readFile(path.join(root, name), 'utf8');
        snapshots.push({ name, previous, rows: parseRows(previous) });
      } catch (error) {
        if (name === files[1] && hasCode(error, 'ENOENT')) continue;
        throw error;
      }
    }
    const primary = snapshots[0];
    const knownIds = new Set(primary.rows.map((row) => row.id.trim().toLowerCase()));
    const targets = new Set(all ? [...knownIds] : ids.map((id) => id.trim().toLowerCase()));
    if ([...targets].some((id) => !knownIds.has(id))) throw new ApprovalStoreError('Entity not found', 404);
    let approvedCount = 0;
    const changes: Array<{ name: string; previous: string; next: string }> = [];
    for (const snapshot of snapshots) {
      let changed = false;
      for (const row of snapshot.rows) {
        if (!targets.has(row.id.trim().toLowerCase()) || !row.tags?.includes('収集事例')) continue;
        row.tags = row.tags.filter((tag) => tag !== '収集事例');
        changed = true;
        if (snapshot === primary) approvedCount += 1;
      }
      if (changed) changes.push({ name: snapshot.name, previous: snapshot.previous, next: JSON.stringify(snapshot.rows, null, 2) });
    }
    if (changes.length > 0) {
      await atomicWrite(path.join(root, journalName), JSON.stringify(changes.map(({ name, previous }) => ({ name, previous }))));
      try {
        // Keep complete JSON visible; never truncate a file being read elsewhere.
        for (const change of changes) await atomicWrite(path.join(root, change.name), change.next);
        await removeJournal(root);
      } catch (error) {
        // A failed rollback leaves its journal intact for deterministic recovery.
        try { await recover(root); } catch { /* Preserve the journal; never acknowledge failure as success. */ }
        throw error;
      }
    }
    return { approvedCount, entityIds: [...targets], updated: changes.length > 0 };
  } catch (error) {
    if (error instanceof ApprovalStoreError) throw error;
    throw new ApprovalStoreError('Approval could not be persisted', 503);
  } finally {
    await fs.rmdir(lock);
  }
}
