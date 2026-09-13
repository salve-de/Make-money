import type {
  BusinessScale,
  FinancialEntity,
  PublishabilityStatus,
  SectorCategory,
} from '@/shared/terminal';

/**
 * 検索フィルタ仕様
 */
export interface SearchFilters {
  query?: string;
  sectors?: SectorCategory[];
  scales?: BusinessScale[];
  countries?: string[];
  minOperatingMargin?: number;
  onlyProfitable?: boolean;
  maxTeamSize?: number;
  tags?: string[];
  publishability?: PublishabilityStatus; // デフォルトは 'PUBLISHABLE'
}

/**
 * ソート仕様
 */
export interface SortSpec {
  field: 'operatingMargin' | 'monthlyRevenue' | 'growthRateYoY' | 'foundedYear' | 'name';
  direction: 'asc' | 'desc';
}

/**
 * カーソル（安定ページネーション契約）
 * ページめくり中にIndexが更新されても、重複・欠落・順序飛びが起きない契約。
 */
export interface SearchCursor {
  indexGeneration: number;
  sortValues: (string | number | null)[];
  entityId: string;
}

/**
 * カーソルの世代不整合エラー
 * ページネーション進行中にインデックスが更新（Compaction / Generation Increment）された場合に発生。
 */
export class CursorStaleError extends Error {
  readonly code = 'CURSOR_STALE';
  constructor(
    public readonly cursorGeneration: number,
    public readonly currentGeneration: number
  ) {
    super(
      `Cursor generation ${cursorGeneration} does not match current index generation ${currentGeneration}. Client must restart pagination.`
    );
    this.name = 'CursorStaleError';
  }
}


/**
 * 目録用Tiny Record（一覧用軽量レコード）
 * 1億件スケールでの高速スキャン・インデックス用DTO。
 * unknown != zero 原則に基づき、未確認指標は 0 ではなく null で保持する。
 */
export interface TinyRecord {
  entityId: string;
  name: string;
  ticker: string;
  sector: SectorCategory;
  scale: BusinessScale;
  country: string;
  teamSize: number | null;
  monthlyRevenue: number | null;
  operatingMargin: number | null;
  growthRateYoY: number | null;
  foundedYear: number | null;
  tags: string[];
  latestDossierHash: string;
  sourceRevision: number;
  projectionGeneration: number;
  publishability: PublishabilityStatus;
}

/**
 * 検索結果ページ
 */
export interface SearchPage {
  items: TinyRecord[];
  nextCursor: SearchCursor | null;
  totalEstimated: number;
  generation: number;
}

/**
 * クエリ契約（Query Contract）
 * D1（小規模〜数万社）からClickHouse（1億社）への移行境界を完全抽象化するインターフェース。
 */
export interface QueryContract {
  search(
    filters: SearchFilters,
    sort: SortSpec,
    cursor: SearchCursor | null,
    limit: number
  ): Promise<SearchPage>;

  getTiny(entityId: string): Promise<TinyRecord | null>;

  getManyTiny(entityIds: string[]): Promise<TinyRecord[]>;
}

/**
 * FinancialEntity から TinyRecord を抽出する変換ヘルパー
 * 未指定の publishability は RAW（非昇格）として扱い、fail-closed を徹底する。
 */
export function toTinyRecord(
  entity: FinancialEntity,
  projectionGeneration = 1,
  defaultRevision = 1
): TinyRecord {
  const hash = entity.latestDossierHash || `hash_${entity.id}_v${defaultRevision}`;
  const revision = entity.sourceRevision ?? defaultRevision;
  const publishability = entity.publishability ?? 'RAW';

  return {
    entityId: entity.id,
    name: entity.name,
    ticker: entity.ticker,
    sector: entity.sector,
    scale: entity.scale,
    country: entity.country,
    teamSize: entity.operations?.teamSize ?? null,
    monthlyRevenue: entity.pnl?.monthlyRevenue ?? null,
    operatingMargin: entity.pnl?.operatingMargin ?? null,
    growthRateYoY: entity.growthRateYoY ?? null,
    foundedYear: entity.temporal?.foundedYear ?? null,
    tags: entity.tags || [],
    latestDossierHash: hash,
    sourceRevision: revision,
    projectionGeneration,
    publishability,
  };
}

/**
 * インメモリ／リファレンス QueryProvider 実装
 * Conformance Test Suite を通す標準実装。D1やClickHouseも同一の振る舞いを保証する。
 */
export class MemoryQueryProvider implements QueryContract {
  private records: TinyRecord[] = [];
  private generation: number;

  constructor(entities: FinancialEntity[] | TinyRecord[], generation = 1) {
    this.generation = generation;
    if (entities.length > 0 && 'pnl' in entities[0]) {
      this.records = (entities as FinancialEntity[]).map((e) =>
        toTinyRecord(e, generation)
      );
    } else {
      this.records = [...(entities as TinyRecord[])];
    }
  }

  public async getTiny(entityId: string): Promise<TinyRecord | null> {
    const found = this.records.find((r) => r.entityId === entityId);
    return found || null;
  }

  public async getManyTiny(entityIds: string[]): Promise<TinyRecord[]> {
    const idSet = new Set(entityIds);
    return this.records.filter((r) => idSet.has(r.entityId));
  }

  public async search(
    filters: SearchFilters = {},
    sort: SortSpec = { field: 'monthlyRevenue', direction: 'desc' },
    cursor: SearchCursor | null = null,
    limit: number = 50
  ): Promise<SearchPage> {
    // 公開 Query Contract は常に 'PUBLISHABLE' のみ提供（Fail-closed）。
    // 外部指定で PARTIAL や RAW が渡されても、公開面には一切露出させない。
    const targetPublishability: PublishabilityStatus = 'PUBLISHABLE';

    // 1. フィルタリング（昇格ゲート強制）
    const filtered = this.records.filter((rec) => {
      // 厳格昇格フィルタ: PUBLISHABLE 以外は全遮断
      if (rec.publishability !== targetPublishability) {
        return false;
      }

      if (filters.sectors && filters.sectors.length > 0) {
        if (!filters.sectors.includes(rec.sector)) return false;
      }

      if (filters.scales && filters.scales.length > 0) {
        if (!filters.scales.includes(rec.scale)) return false;
      }

      if (filters.countries && filters.countries.length > 0) {
        if (!filters.countries.includes(rec.country)) return false;
      }

      if (filters.minOperatingMargin !== undefined) {
        if (rec.operatingMargin === null || rec.operatingMargin < filters.minOperatingMargin) return false;
      }

      if (filters.onlyProfitable) {
        if (rec.operatingMargin === null || rec.operatingMargin <= 0) return false;
      }

      if (filters.maxTeamSize !== undefined) {
        if (rec.teamSize === null || rec.teamSize > filters.maxTeamSize) return false;
      }

      if (filters.tags && filters.tags.length > 0) {
        const hasAllTags = filters.tags.every((t) => rec.tags.includes(t));
        if (!hasAllTags) return false;
      }

      if (filters.query && filters.query.trim().length > 0) {
        const q = filters.query.toLowerCase().trim();
        const match =
          rec.name.toLowerCase().includes(q) ||
          rec.ticker.toLowerCase().includes(q) ||
          rec.tags.some((t) => t.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });

    // 2. ソート（tie-breaker として entityId を使用し決定論的順序を保証）
    filtered.sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      switch (sort.field) {
        case 'operatingMargin':
          valA = a.operatingMargin ?? (sort.direction === 'asc' ? Infinity : -Infinity);
          valB = b.operatingMargin ?? (sort.direction === 'asc' ? Infinity : -Infinity);
          break;
        case 'monthlyRevenue':
          valA = a.monthlyRevenue ?? (sort.direction === 'asc' ? Infinity : -Infinity);
          valB = b.monthlyRevenue ?? (sort.direction === 'asc' ? Infinity : -Infinity);
          break;
        case 'growthRateYoY':
          valA = a.growthRateYoY ?? (sort.direction === 'asc' ? Infinity : -Infinity);
          valB = b.growthRateYoY ?? (sort.direction === 'asc' ? Infinity : -Infinity);
          break;
        case 'foundedYear':
          valA = a.foundedYear ?? 0;
          valB = b.foundedYear ?? 0;
          break;
        case 'name':
          valA = a.name;
          valB = b.name;
          break;
      }

      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;

      // Tie-breaker
      return a.entityId.localeCompare(b.entityId);
    });

    const totalEstimated = filtered.length;

    // 3. カーソル位置の特定と世代検証
    let startIndex = 0;
    if (cursor) {
      if (cursor.indexGeneration !== this.generation) {
        throw new CursorStaleError(cursor.indexGeneration, this.generation);
      }
      const idx = filtered.findIndex((r) => r.entityId === cursor.entityId);
      if (idx >= 0) {
        startIndex = idx + 1;
      }
    }

    // 4. ページネーション
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const pagedItems = filtered.slice(startIndex, startIndex + safeLimit);

    // 5. 次カーソルの生成
    let nextCursor: SearchCursor | null = null;
    if (startIndex + safeLimit < filtered.length && pagedItems.length > 0) {
      const lastItem = pagedItems[pagedItems.length - 1];
      let sortVal: string | number | null = null;
      switch (sort.field) {
        case 'operatingMargin':
          sortVal = lastItem.operatingMargin;
          break;
        case 'monthlyRevenue':
          sortVal = lastItem.monthlyRevenue;
          break;
        case 'growthRateYoY':
          sortVal = lastItem.growthRateYoY;
          break;
        case 'foundedYear':
          sortVal = lastItem.foundedYear ?? 0;
          break;
        case 'name':
          sortVal = lastItem.name;
          break;
      }

      nextCursor = {
        indexGeneration: this.generation,
        sortValues: [sortVal],
        entityId: lastItem.entityId,
      };
    }

    return {
      items: pagedItems,
      nextCursor,
      totalEstimated,
      generation: this.generation,
    };
  }
}
