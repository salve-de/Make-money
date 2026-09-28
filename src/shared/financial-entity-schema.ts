import type { FinancialEntity } from './terminal';
import schema from './schemas/financial-entity.json';
import { compileParser } from './validate-json';

const parseEntitySchema = compileParser<FinancialEntity>(schema, 'FinancialEntity');

/** Only the entity's reaudit object owns active audit snapshots. */
export function assertAuditSnapshotBoundary(input: unknown, path: string[] = []): void {
  if (Array.isArray(input)) {
    input.forEach((item, index) => assertAuditSnapshotBoundary(item, [...path, String(index)]));
  } else if (input !== null && typeof input === 'object') {
    for (const [key, value] of Object.entries(input)) {
      // Opaque original evidence may itself contain historical field names.
      if (key === 'sourceMetadata') continue;
      if (key === 'legacyDisplaySnapshot') {
        if (path.length !== 1 || path[0] !== 'reaudit' || value === null ||
          typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('Invalid FinancialEntity audit snapshot boundary');
        }
        continue;
      }
      assertAuditSnapshotBoundary(value, [...path, key]);
    }
  }
}

export function parseFinancialEntity(input: unknown): FinancialEntity {
  assertAuditSnapshotBoundary(input);
  return parseEntitySchema(input);
}

export function parseFinancialEntities(input: unknown): FinancialEntity[] {
  if (!Array.isArray(input)) throw new Error('Invalid FinancialEntity list');
  return input.map(parseFinancialEntity);
}

export interface ResilientParseResult {
  validEntities: FinancialEntity[];
  invalidEntities: { index: number; id?: string; name?: string; error: string }[];
}

/**
 * 1社のスキーマ不備で全234社が過去モックへ巻き添え退行するのを永久阻止する耐障害的パース関数。
 * 正常な全エンティティを救出し、異常なエンティティのみを隔離（Quarantine）して詳細ログを出力する。
 */
export function parseFinancialEntitiesResiliently(input: unknown): ResilientParseResult {
  if (!Array.isArray(input)) {
    throw new Error('Invalid FinancialEntity list: input must be an array');
  }

  const validEntities: FinancialEntity[] = [];
  const invalidEntities: { index: number; id?: string; name?: string; error: string }[] = [];

  input.forEach((item, index) => {
    try {
      const valid = parseFinancialEntity(item);
      validEntities.push(valid);
    } catch (err) {
      const id = typeof item === 'object' && item !== null && 'id' in item ? String((item as Record<string, unknown>).id) : undefined;
      const name = typeof item === 'object' && item !== null && 'name' in item ? String((item as Record<string, unknown>).name) : undefined;
      invalidEntities.push({
        index,
        id,
        name,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return { validEntities, invalidEntities };
}

