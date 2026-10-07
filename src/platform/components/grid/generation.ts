import type { FinancialEntity } from '@/shared/terminal';

/** 事例の世代（集めた流れの版）。記録に無ければ第1世代 */
export function generationOf(entity: Pick<FinancialEntity, 'generation'>): number {
  const g = entity.generation;
  return typeof g === 'number' && Number.isInteger(g) && g >= 1 ? g : 1;
}

export interface GenerationGroup<T> {
  generation: number;
  entities: T[];
}

/** 世代ごとに区切る。新しい世代が上。同じ世代の中は、渡された並びのまま */
export function groupByGeneration<T extends Pick<FinancialEntity, 'generation'>>(entities: readonly T[]): GenerationGroup<T>[] {
  const byGeneration = new Map<number, T[]>();
  for (const entity of entities) {
    const g = generationOf(entity);
    const list = byGeneration.get(g);
    if (list) list.push(entity);
    else byGeneration.set(g, [entity]);
  }
  return [...byGeneration.entries()]
    .sort(([a], [b]) => b - a)
    .map(([generation, list]) => ({ generation, entities: list }));
}

export function generationHeading(generation: number, count: number): string {
  return `第${generation}世代（${count.toLocaleString('ja-JP')}件）`;
}

export type GridItem<T> =
  | { kind: 'heading'; generation: number; count: number }
  | { kind: 'row'; entity: T; index: number };

/** 見出しと行を並べた表示順。行は limit 件まで（見出しは数えない）。行の index は表示順の通し番号 */
export function buildGridItems<T extends Pick<FinancialEntity, 'generation'>>(
  entities: readonly T[],
  limit: number,
  /** 世代ごとの全体の件数（読み込み途中でも見出しに全体を出す）。無ければ読み込んだ分を数える */
  totals?: Readonly<Record<number, number>>,
): GridItem<T>[] {
  const items: GridItem<T>[] = [];
  let index = 0;
  for (const group of groupByGeneration(entities)) {
    if (index >= limit) break;
    items.push({ kind: 'heading', generation: group.generation, count: Math.max(group.entities.length, totals?.[group.generation] ?? 0) });
    for (const entity of group.entities) {
      if (index >= limit) break;
      items.push({ kind: 'row', entity, index });
      index += 1;
    }
  }
  return items;
}
