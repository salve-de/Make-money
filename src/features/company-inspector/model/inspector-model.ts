import { INTELLIGENCE_DOSSIERS } from '@/platform/data/intelligenceDossiers';
import { MARKET_ANOMALIES } from '@/platform/data/marketAnomaliesData';
import type { FinancialEntity } from '@/shared/terminal';
import { formatYen } from '@/platform/utils/moneyDisplay';
export function parsePunchline(text: string): { punchline: string; detail: string } {
  const match = text.match(/^【(.*?)】([\s\S]*)$/);
  if (match) {
    return { punchline: match[1], detail: match[2].trim() };
  }
  return { punchline: '', detail: text };
}


export function buildInspectorModel(entity: FinancialEntity, currency: 'JPY' | 'USD') {
  const formatMoney = (yen: number) => {
    if (currency === 'USD') {
      const usd = Math.round(yen / 150);
      if (usd >= 1000000) return `$${(usd / 1000000).toFixed(1)}M`;
      if (usd >= 1000) return `$${(usd / 1000).toFixed(0)}k`;
      return `$${usd}`;
    }
    return formatYen(yen);
  };

  // 損益流出比率の計算（ウォーターフォール）
  const rev = entity.pnl.monthlyRevenue || 1;
  const cogsPct = Math.min(Math.round((entity.pnl.cogs / rev) * 100), 100);
  const serverPct = Math.min(Math.round((entity.pnl.operatingExpenses.serverAndApi / rev) * 100), 100);
  const adPct = Math.min(Math.round((entity.pnl.operatingExpenses.advertising / rev) * 100), 100);
  const subPct = Math.min(Math.round((entity.pnl.operatingExpenses.subcontracting / rev) * 100), 100);
  const saasPct = Math.min(Math.round((entity.pnl.operatingExpenses.toolsAndSaaS / rev) * 100), 100);
  const otherPct = Math.min(Math.round((entity.pnl.operatingExpenses.other / rev) * 100), 100);
  const profitPct = Math.max(Math.round((entity.pnl.operatingProfit / rev) * 100), 0);

  // 当該企業に紐づく特集レポートを検索
  const relatedDossier = INTELLIGENCE_DOSSIERS.find((d) =>
    d.targetEntityIds.includes(entity.id)
  );

  // 当該企業が実証している市場の歪み・トレンドを検索
  const relatedAnomaly = MARKET_ANOMALIES.find((a) =>
    a.proofEntityIds.includes(entity.id)
  );

  // 地雷・失敗・転落銘柄の自動検知（失敗の検証・ポストモータムモード）
  const isHazardMode =
    entity.pnl?.financialStatus === 'POST_MORTEM' ||
    entity.opportunityJudgment?.verdict === 'HAZARD_REJECT' ||
    entity.tags?.some(t => t.includes('地雷') || t.includes('失敗') || t.includes('爆死') || t.includes('破産') || t.includes('倒産') || t.includes('破綻')) ||
    entity.architecturePattern?.includes('地雷') ||
    (entity.growthRateYoY !== undefined && entity.growthRateYoY < -30);

  // 財務証拠ステータスの判定（VERIFIED / REPORTED / ESTIMATED / POST_MORTEM / UNAVAILABLE）
  const financialStatus = entity.pnl?.financialStatus || (
    isHazardMode ? 'POST_MORTEM' :
    ['ent_keyence', 'ent_klaviyo_core', 'ent_buffer', 'ent_plausible', 'ent_shipfast', 'ent_photoai', 'ent_nomadlist', 'ent_transistor', 'ent_baremetrics_b0966c4871940e459cbb'].includes(entity.id)
      ? 'VERIFIED'
      : ['ent_case06_67a6586e2f30a21c8576', 'ent_notion_hq', 'ent_midjourney_239b8ccc522504fb757b', 'ent_basecamp_b1bb0f0ff61469aa22c5', 'ent_gumroad_164534dd22fa6c2e2793', 'ent_linear_app', 'ent_beehiiv_0e052432d4cc474caec6', 'ent_kitformerlyconvertkit_05168bc6971293b6d3ab', 'ent_whoop_fitness', 'ent_athletic_greens_ag1', 'ent_oura_ring', 'ent_case06_7590e69f49bb1c7e8ac7'].includes(entity.id)
      ? 'REPORTED'
      : 'ESTIMATED'
  );

  // 財務データ欠損（完全消滅・非表示）ガード
  const isFinancialUnavailable =
    !entity.pnl ||
    financialStatus === 'UNAVAILABLE' ||
    entity.pnl.isRevenueUnconfirmed ||
    !Number.isFinite(entity.pnl.monthlyRevenue);

  // 財務ステータス別のバッジ・タイトル・タグ設定（冷徹モノトーン仕様）
  const getFinancialBadgeMeta = () => {
    const quiet = 'text-term-muted border-term-line';
    switch (financialStatus) {
      case 'VERIFIED':
        return { badgeClass: quiet, iconColor: 'text-term-muted', titleColor: 'text-term-fg-strong', title: '損益の内訳', tagClass: quiet, tagLabel: '一次資料の登録あり' };
      case 'REPORTED':
        return { badgeClass: quiet, iconColor: 'text-term-muted', titleColor: 'text-term-fg', title: '損益の内訳', tagClass: quiet, tagLabel: '報道・取材資料あり' };
      case 'POST_MORTEM':
        return { badgeClass: 'text-term-danger border-term-line', iconColor: 'text-term-danger', titleColor: 'text-term-danger', title: '過去の損益', tagClass: 'text-term-danger border-term-line', tagLabel: '事後資料あり' };
      case 'UNAVAILABLE':
        return { badgeClass: 'text-term-dim border-term-line', iconColor: 'text-term-dim', titleColor: 'text-term-muted', title: '財務情報は未確認', tagClass: 'text-term-dim border-term-line', tagLabel: '未確認' };
      case 'ESTIMATED':
      default:
        return { badgeClass: 'text-term-accent border-term-accent-line', iconColor: 'text-term-accent', titleColor: 'text-term-accent', title: '損益の推定', tagClass: 'text-term-accent border-term-accent-line', tagLabel: '推定' };
    }
  };

  const financialBadgeMeta = getFinancialBadgeMeta();

  // 動的証拠カード（Dynamic Evidence Registry）の有無判定
  const hasEvidenceCards = Boolean(entity.evidenceCards && entity.evidenceCards.length > 0);

  return { formatMoney, rev, cogsPct, serverPct, adPct, subPct, saasPct, otherPct, profitPct, relatedDossier, relatedAnomaly, isHazardMode, financialStatus, isFinancialUnavailable, getFinancialBadgeMeta, financialBadgeMeta, hasEvidenceCards };
}
