import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

/**
 * テスト専用。実際の migration を流した in-memory SQLite を D1 の代わりに使い、
 * SQL の制約・所有者の絞り込み・原子的な INSERT を本物の SQLite で確かめる。
 * 本番コードからは import しない。
 */
type Param = string | number | null;

function migration(file: string): string {
  return readFileSync(new URL(`../../../../migrations/d1/${file}`, import.meta.url), 'utf8');
}

/** users（売り手のメール参照）、marketplace_listings、business_sale_*（審査方式の 0016 適用後）を持つ空のデータベース。 */
export function openBusinessSaleTestDatabase(): DatabaseSync {
  const database = new DatabaseSync(':memory:');
  database.exec(migration('0001_users.sql'));
  database.exec(migration('0008_builder.sql'));
  database.exec(migration('0011_marketplace_listings.sql'));
  database.exec(migration('0014_business_sale_listings.sql'));
  database.exec(migration('0016_listing_review.sql'));
  return database;
}

/**
 * migrations/d1 の全ファイルを番号順に流した空のデータベース（退会処理のように多くのテーブルに触る処理用）。
 * exclude に名前を渡すと、そのファイルだけ流さない（その migration を適用する前のデータベースを再現する）。
 */
export function openFullTestDatabase(exclude: readonly string[] = []): DatabaseSync {
  const database = new DatabaseSync(':memory:');
  const directory = new URL('../../../../migrations/d1/', import.meta.url);
  for (const file of readdirSync(directory).filter((name) => name.endsWith('.sql') && !exclude.includes(name)).sort()) {
    database.exec(readFileSync(new URL(file, directory), 'utf8'));
  }
  return database;
}

/** 本物の src/lib/storage/d1.ts と同じく、null・文字列・有限の数値以外のパラメータは拒否する。 */
function assertParams(params: readonly unknown[]): asserts params is Param[] {
  for (const value of params) {
    if (value !== null && typeof value !== 'string' && (typeof value !== 'number' || !Number.isFinite(value))) {
      throw new Error('Invalid database statement parameters');
    }
  }
}

/** `vi.mock('@/lib/storage/d1', ...)` の戻り値に使う。 */
export function sqliteD1Module(getDatabase: () => DatabaseSync) {
  return {
    queryD1: async (sql: string, params: unknown[] = [], parseRow?: (value: unknown) => unknown) => {
      assertParams(params);
      return getDatabase().prepare(sql).all(...params).map((row) => (parseRow ? parseRow(row) : row));
    },
    executeD1: async (sql: string, params: unknown[] = []) => {
      assertParams(params);
      const result = getDatabase().prepare(sql).run(...params);
      return { changes: Number(result.changes), lastRowId: Number(result.lastInsertRowid) };
    },
    batchD1: async (statements: { sql: string; params?: unknown[] }[]) => {
      const database = getDatabase();
      database.exec('BEGIN');
      try {
        const results = statements.map(({ sql, params = [] }) => {
          assertParams(params);
          const result = database.prepare(sql).run(...params);
          return { changes: Number(result.changes), lastRowId: Number(result.lastInsertRowid) };
        });
        database.exec('COMMIT');
        return results;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
