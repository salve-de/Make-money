import { getCloudflareRuntimeEnv, getRuntimeEnvValue } from '../runtime/cloudflare';

export type D1Value = string | number | null;
export interface D1Statement { sql: string; params?: D1Value[] }
interface BindingStatement { bind(...values: D1Value[]): BindingStatement; all(): Promise<unknown> }
interface Binding { prepare(sql: string): BindingStatement; batch(statements: BindingStatement[]): Promise<unknown> }
export class D1UnavailableError extends Error { constructor() { super('Application database is unavailable'); this.name = 'D1UnavailableError'; } }
interface Result { results: unknown[]; changes: number; lastRowId: number | null }
function result(value: unknown): Result {
  if (!value || typeof value !== 'object') throw new D1UnavailableError();
  const row = value as Record<string, unknown>;
  if (row.success !== true || !Array.isArray(row.results)) throw new D1UnavailableError();
  const meta = row.meta && typeof row.meta === 'object' ? row.meta as Record<string, unknown> : {};
  return { results: row.results, changes: typeof meta.changes === 'number' ? meta.changes : 0, lastRowId: typeof meta.last_row_id === 'number' ? meta.last_row_id : null };
}
async function send(statements: D1Statement[]): Promise<Result[]> {
  for (const statement of statements) {
    if (!statement.sql.trim() || (statement.params ?? []).some((value) => value !== null && typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value)))) throw new Error('Invalid database statement parameters');
  }
  const env = await getCloudflareRuntimeEnv();
  const binding = env?.APP_DB as Binding | undefined;
  if (binding && typeof binding.prepare === 'function' && typeof binding.batch === 'function') {
    const prepared = statements.map(({ sql, params = [] }) => binding.prepare(sql).bind(...params));
    const raw = await binding.batch(prepared);
    if (!Array.isArray(raw) || raw.length !== statements.length) throw new D1UnavailableError();
    return raw.map(result);
  }
  // Only the Worker binding documents transactional batch semantics. Node REST stays single-statement.
  if (statements.length !== 1) throw new D1UnavailableError();
  const [account, token, database] = await Promise.all(['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'APP_D1_DATABASE_ID'].map((name) => getRuntimeEnvValue(name)));
  if (!account || !token || !database) throw new D1UnavailableError();
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/d1/database/${encodeURIComponent(database)}/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(statements[0]), cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new D1UnavailableError();
  const raw: unknown = await response.json();
  if (!raw || typeof raw !== 'object' || (raw as Record<string, unknown>).success !== true || !Array.isArray((raw as Record<string, unknown>).result)) throw new D1UnavailableError();
  const values = (raw as { result: unknown[] }).result;
  if (values.length !== statements.length) throw new D1UnavailableError();
  return values.map(result);
}
export async function queryD1<T = Record<string, unknown>>(sql: string, params: D1Value[] = [], parseRow?: (value: unknown) => T): Promise<T[]> {
  return (await send([{ sql, params }]))[0].results.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new D1UnavailableError();
    return parseRow ? parseRow(value) : value as T;
  });
}
export async function executeD1(sql: string, params: D1Value[] = []): Promise<{ changes: number; lastRowId: number | null }> {
  const { changes, lastRowId } = (await send([{ sql, params }]))[0];
  return { changes, lastRowId };
}
export async function batchD1(statements: D1Statement[]): Promise<{ changes: number; lastRowId: number | null }[]> {
  return (await send(statements)).map(({ changes, lastRowId }) => ({ changes, lastRowId }));
}
