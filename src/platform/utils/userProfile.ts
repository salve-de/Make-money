import { FinancialEntity } from '../types/terminal';

export interface UserInterestProfile {
  bookmarkedCount: number;
  viewedCount: number;
  preferredSectors: string[];
  preferredScales: string[];
  averageProfitMargin?: number;
  topTools: string[];
  topMoats: string[];
  profileSummary: string;
}

/**
 * 保存銘柄および閲覧履歴からユーザーの関心傾向（サバンナOSプロファイル）を自動算出
 */
export function buildUserInterestProfile(
  allEntities: FinancialEntity[],
  bookmarkedIds: Set<string> | string[],
  viewedEntityIds: string[]
): UserInterestProfile {
  const bookmarkSet = new Set(bookmarkedIds);
  const viewedSet = new Set(viewedEntityIds);

  // 興味対象銘柄（保存銘柄は重み2倍、閲覧銘柄は重み1倍）
  const entityWeights = new Map<string, number>();

  for (const id of bookmarkSet) {
    entityWeights.set(id, (entityWeights.get(id) || 0) + 2);
  }
  for (const id of viewedSet) {
    entityWeights.set(id, (entityWeights.get(id) || 0) + 1);
  }

  const sectorCounts: Record<string, number> = {};
  const scaleCounts: Record<string, number> = {};
  const toolCounts: Record<string, number> = {};
  const moatCounts: Record<string, number> = {};
  let totalMargin = 0;
  let marginCount = 0;

  for (const [entityId, weight] of entityWeights.entries()) {
    const entity = allEntities.find((e) => e.id === entityId);
    if (!entity) continue;

    // セクター集計
    sectorCounts[entity.sector] = (sectorCounts[entity.sector] || 0) + weight;

    // 規模集計
    scaleCounts[entity.scale] = (scaleCounts[entity.scale] || 0) + weight;

    // 利益率
    const margin = entity.pnl.operatingMargin;
    if (!entity.pnl.isMarginUnconfirmed && entity.pnl.financialStatus !== 'UNAVAILABLE' &&
        typeof margin === 'number' && Number.isFinite(margin)) {
      totalMargin += margin * weight;
      marginCount += weight;
    }

    // 防壁
    if (entity.strategy?.moatDescription) {
      const moatLabel = entity.strategy.moatType || '参入防壁';
      moatCounts[moatLabel] = (moatCounts[moatLabel] || 0) + weight;
    }

    // ツール
    if (entity.operations?.toolStack) {
      for (const t of entity.operations.toolStack) {
        toolCounts[t.name] = (toolCounts[t.name] || 0) + weight;
      }
    }
  }

  const sortedSectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
  const sortedScales = Object.entries(scaleCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
  const sortedTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t)
    .slice(0, 4);
  const sortedMoats = Object.entries(moatCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m)
    .slice(0, 3);

  const avgMargin = marginCount > 0 ? Math.round(totalMargin / marginCount) : undefined;

  const topSectorNames = sortedSectors.slice(0, 2).join('・');
  const summaryParts = topSectorNames
    ? [`保存・閲覧した銘柄の主な業種: ${topSectorNames}。`]
    : [entityWeights.size === 0 ? '保存・閲覧履歴がないため、関心傾向は未確認です。' : '履歴に対応する銘柄データがないため、関心傾向は未確認です。'];
  if (sortedScales.length > 0) summaryParts.push(`主な運営規模: ${sortedScales.slice(0, 2).join('・')}。`);
  if (avgMargin !== undefined) summaryParts.push(`利益率を確認できた銘柄の加重平均営業利益率: ${avgMargin}%。`);
  if (sortedTools.length > 0) summaryParts.push(`銘柄で使われる主なツール: ${sortedTools.join(', ')}。`);
  if (sortedMoats.length > 0) summaryParts.push(`銘柄の主な参入障壁: ${sortedMoats.join(', ')}。`);
  const profileSummary = summaryParts.join('');

  return {
    bookmarkedCount: bookmarkSet.size,
    viewedCount: viewedSet.size,
    preferredSectors: sortedSectors.slice(0, 3),
    preferredScales: sortedScales.slice(0, 2),
    averageProfitMargin: avgMargin,
    topTools: sortedTools,
    topMoats: sortedMoats,
    profileSummary,
  };
}
