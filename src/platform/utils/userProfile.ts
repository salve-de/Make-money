import { FinancialEntity } from '../types/terminal';

export interface UserInterestProfile {
  bookmarkedCount: number;
  viewedCount: number;
  preferredSectors: string[];
  preferredScales: string[];
  averageProfitMargin: number;
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

  // もし閲覧・保存がまだ何もない場合は初期デフォルト
  if (entityWeights.size === 0) {
    return {
      bookmarkedCount: 0,
      viewedCount: 0,
      preferredSectors: ['AI_AUTOMATION', 'NICHE_SAAS'],
      preferredScales: ['SOLO (完全1人)'],
      averageProfitMargin: 80,
      topTools: ['Stripe', 'Next.js', 'Make'],
      topMoats: ['大手の自爆死角', 'データ監禁'],
      profileSummary: '高粗利・完全1人運営のマイクロビジネスに関心が高い初期状態。',
    };
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
    const margin = entity.pnl.operatingMargin ?? 0;
    if (margin > 0) {
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

  const avgMargin = marginCount > 0 ? Math.round(totalMargin / marginCount) : 75;

  const topSectorNames = sortedSectors.slice(0, 2).join('・');
  const scaleName = sortedScales[0] === 'SOLO' ? '完全1人' : sortedScales[0] === 'SMALL_TEAM' ? '小規模チーム' : '少数精鋭';

  const profileSummary = `このユーザーは【${scaleName}】体制かつ【平均粗利${avgMargin}%前後】の【${topSectorNames || '高収益事業'}】を好んで保存・閲覧しています。特に【${sortedTools.join(', ') || '主要API・決済'}】を活用した低固定費モデルや、【${sortedMoats.join(', ') || '参入防壁'}】の構造に強い関心を示しています。`;

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
