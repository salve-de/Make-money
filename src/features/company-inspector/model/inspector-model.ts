import { INTELLIGENCE_DOSSIERS } from '@/platform/data/intelligenceDossiers';
import { MARKET_ANOMALIES } from '@/platform/data/marketAnomaliesData';
import type { FinancialEntity } from '@/shared/terminal';
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
    if (yen >= 100000000) return `¥${(yen / 100000000).toFixed(1)}億`;
    if (yen >= 10000) return `¥${Math.round(yen / 10000)}万`;
    return `¥${yen.toLocaleString()}`;
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

  // 地雷・失敗・転落銘柄の自動検知（死因検死・ポストモータムモード）
  const isHazardMode =
    entity.opportunityJudgment?.verdict === 'HAZARD_REJECT' ||
    entity.tags?.some(t => t.includes('地雷') || t.includes('失敗') || t.includes('爆死')) ||
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
    !entity.pnl.monthlyRevenue ||
    entity.pnl.monthlyRevenue === 0;

  // 財務ステータス別のバッジ・タイトル・タグ設定（冷徹モノトーン仕様）
  const getFinancialBadgeMeta = () => {
    switch (financialStatus) {
      case 'VERIFIED':
        return {
          badgeClass: 'text-zinc-200 bg-white/[0.06] border-white/[0.12]',
          iconColor: 'text-zinc-300',
          titleColor: 'text-zinc-100',
          title: '財務損益計器盤 (EXECUTIVE AUDIT & CASH FLOW)',
          tagClass: 'bg-white/[0.04] text-zinc-300 border-white/[0.10]',
          tagLabel: '確定開示 (VERIFIED)',
        };
      case 'REPORTED':
        return {
          badgeClass: 'text-zinc-300 bg-white/[0.04] border-white/[0.08]',
          iconColor: 'text-zinc-400',
          titleColor: 'text-zinc-200',
          title: '報道・取材損益計器盤 (REPORTED CASH FLOW)',
          tagClass: 'bg-white/[0.04] text-zinc-400 border-white/[0.08]',
          tagLabel: '報道・取材 (REPORTED)',
        };
      case 'POST_MORTEM':
        return {
          badgeClass: 'text-red-400 bg-red-950/30 border-red-500/30',
          iconColor: 'text-red-400',
          titleColor: 'text-red-300',
          title: '出血・逆流レントゲン (BURN RATE & CASH DRAIN)',
          tagClass: 'bg-red-950/40 text-red-300 border-red-500/30',
          tagLabel: '死因出血逆算 (POST-MORTEM)',
        };
      case 'ESTIMATED':
      default:
        return {
          badgeClass: 'text-zinc-400 bg-white/[0.04] border-white/[0.08]',
          iconColor: 'text-zinc-400',
          titleColor: 'text-zinc-300',
          title: '推定損益計器盤 (ESTIMATED CASH FLOW)',
          tagClass: 'bg-white/[0.04] text-zinc-400 border-white/[0.08]',
          tagLabel: '推測値 (ESTIMATED)',
        };
    }
  };

  const financialBadgeMeta = getFinancialBadgeMeta();

  // 動的証拠カード（Dynamic Evidence Registry）の有無判定
  const hasEvidenceCards = Boolean(entity.evidenceCards && entity.evidenceCards.length > 0);

  return { formatMoney, rev, cogsPct, serverPct, adPct, subPct, saasPct, otherPct, profitPct, relatedDossier, relatedAnomaly, isHazardMode, financialStatus, isFinancialUnavailable, getFinancialBadgeMeta, financialBadgeMeta, hasEvidenceCards };
}
