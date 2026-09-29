/**
 * 機械的「正直化」再構築（scripted honest rebuild v1）— 2026-09-29
 *
 * 目的: data/entities-index.json の全記録について、出典（URL または R2 原文保存）で裏付けられない
 * 財務数値・検証タグ・「通帳レントゲン」カードを取り下げ、根拠のある事実（公式URL、掲載ページ、本人申告の
 * 報告値）だけを出典・時点付きで残す。旧表示は reaudit.legacyDisplaySnapshot に監査履歴として保持する。
 *
 * これは事実の追加調査ではない（追加調査は個別再監査レーンで行う）。
 * 使い方: node --import tsx scripts/reaudit/honest-rebuild.ts [--dry-run] [--report reports/honest-rebuild-<date>.json]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';
import type { DynamicEvidenceCard, UniversalObservation } from '../../src/shared/terminal';

type AnyRecord = Record<string, unknown>;

const AUDIT_DATE = '2026-09-29';
const METHOD = 'SCRIPTED_HONEST_REBUILD_V1';
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const reportArg = argv.indexOf('--report');
const reportPath = reportArg >= 0 && argv[reportArg + 1] ? argv[reportArg + 1] : `reports/honest-rebuild-${AUDIT_DATE.replace(/-/g, '')}.json`;

const indexPath = resolve(process.cwd(), 'data/entities-index.json');
const ledgerPath = resolve(process.cwd(), 'data/individual_curation_ledger.jsonl');

const FABRICATED_TAGS = new Set([
  '独立監査済', '報告売上検証', 'チーム規模精査済', '完全勝ち組', '利益率80%超', '超高粗利', '高利益率',
  '損益分岐点ゼロ', '完全自己資本', 'ブートストラップ', '少数精鋭', '極小チーム(2-5名)', '専業フルコミット',
  '再現性重視', '持たざる個人の成り上がり', '完全ソロ運営', '完全1人開発', '収集事例', '公式プロダクト検証',
]);

const isHttp = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);
const hasKana = (s: string) => /[ぁ-んァ-ヶ]/.test(s);

function hostOf(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; }
}

/** 明示的な金額・率のトークンを未確認表記へ置換する（架空数値の温存を防ぐ）。 */
function redactAmounts(text: string): { text: string; hits: number } {
  let hits = 0;
  let out = text.replace(/(?:[¥$€£]\s?[0-9][0-9,.]*\s?(?:[KMBkmb]|億|万|千)?(?:円|ドル|ユーロ)?|[0-9][0-9,.]*\s?(?:兆|億|万|千)?\s?(?:円|ドル|ユーロ|米ドル))/g, () => { hits += 1; return '〔金額未確認〕'; });
  out = out.replace(/(?:粗利率|営業利益率|利益率|純利益率|リピート率|解約率|成長率|転換率|CVR|マージン)\s*[0-9]{1,3}(?:\.[0-9]+)?\s?%(?:超|以上|台)?/g, (m) => { hits += 1; return m.replace(/[0-9]{1,3}(?:\.[0-9]+)?\s?%(?:超|以上|台)?/, '〔率未確認〕'); });
  out = out.replace(/(?:月商|年商|MRR|ARR|売上|利益|営業利益|粗利)\s*(?:約|およそ)?\s*〔金額未確認〕/g, (m) => m);
  return { text: out, hits };
}

function redactDeep(value: unknown, stats: { hits: number }): unknown {
  if (typeof value === 'string') { const r = redactAmounts(value); stats.hits += r.hits; return r.text; }
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, stats));
  if (value && typeof value === 'object') {
    const out: AnyRecord = {};
    for (const [k, v] of Object.entries(value as AnyRecord)) {
      if (k === 'sourceMetadata' || k === 'reaudit' || k === 'legacyDisplaySnapshot' || k === 'reportedMetrics') { out[k] = v; continue; }
      out[k] = redactDeep(v, stats);
    }
    return out;
  }
  return value;
}

function stripMoneyPrefix(tagline: string): string {
  return tagline
    .replace(/^【[^】]*】\s*/u, '')
    .replace(/。?\s*大手の死角を突き現金を直収する特化モデル。?$/u, '')
    .trim();
}

const MONEY_SENTENCE = /(月商|年商|売上|利益|粗利|営業利益|手残り|着金|現金を回収|現金を直収|億円|万円|千円|\$|¥|€|ドル|ユーロ|MRR|ARR|利益率|徴収|稼い|請求)/;
const TEMPLATE_SENTENCE = /(専門知見に基づく特化型ソリューション|汎用ツールでは解決できない|手堅く現金を回収|画一的なマス向けサービス|無駄な多機能を排し|現場の課題を直接解決|高収益モデル|特化型ソリューション|機会損失と時間浪費|大手の死角を突き|現金を直収|ターゲット顧客が直面する)/;

function honestTagline(e: AnyRecord): { tagline: string; source: string } {
  const legacy = typeof e.tagline === 'string' ? stripMoneyPrefix(e.tagline) : '';
  const candidates: Array<{ text: string; source: string }> = [];
  if (legacy) candidates.push({ text: legacy, source: 'legacy_tagline_stripped' });
  const essence = (e.essence as AnyRecord | undefined) ?? {};
  if (typeof essence.whatItDoes === 'string') candidates.push({ text: essence.whatItDoes, source: 'essence.whatItDoes' });
  if (typeof e.description === 'string') candidates.push({ text: e.description, source: 'description' });
  for (const c of candidates) {
    const sentences = c.text.split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
    const kept = sentences.filter((s) => !MONEY_SENTENCE.test(s) && !TEMPLATE_SENTENCE.test(s));
    const joined = kept.join('').replace(/^[、。・,.\s]+/u, '').trim();
    if (joined.length >= 12 && hasKana(joined) && !/[a-zA-Z]{2,15}\s*(で月商|を着金|の痛みを突き)/.test(joined)) {
      return { tagline: joined.length > 140 ? `${joined.slice(0, 139)}…` : joined, source: c.source };
    }
  }
  const label = typeof e.profileBusinessLabel === 'string' && e.profileBusinessLabel.trim()
    ? e.profileBusinessLabel.trim()
    : '事業内容';
  return { tagline: `${label}の詳細は再監査中です（公式ページと掲載元のみ確認済み。売上・利益は未確認）。`, source: 'fallback' };
}

type Family = 'ebizfacts' | 'indiehackers' | 'generated';

function familyOf(e: AnyRecord): Family {
  const sm = e.sourceMetadata as AnyRecord | undefined;
  if (typeof e.id === 'string' && e.id.startsWith('ent_ebizfacts_')) return 'ebizfacts';
  if (sm && sm.provider === 'eBiz Facts') return 'ebizfacts';
  const stream = Array.isArray(e.observationsStream) ? (e.observationsStream as AnyRecord[]) : [];
  if (stream.some((o) => isHttp(o.sourceUrl) && /indiehackers\.com/.test(o.sourceUrl))) return 'indiehackers';
  if (typeof e.batchId === 'string' && /IndieHackers/i.test(e.batchId)) return 'indiehackers';
  return 'generated';
}

function hasRealFinancialSource(e: AnyRecord): boolean {
  const pnl = (e.pnl as AnyRecord | undefined) ?? {};
  if (Array.isArray(e.claimBindings) && e.claimBindings.length > 0) return true;
  if (pnl.financialStatus === 'VERIFIED') return true;
  if (isHttp(pnl.sourceDoc)) return true;
  return false;
}

function ebizfactsUrl(e: AnyRecord): string | null {
  const sm = e.sourceMetadata as AnyRecord | undefined;
  if (sm && typeof sm.slug === 'string' && sm.slug) return `https://ebizfacts.com/${sm.slug}/`;
  return null;
}

function indiehackersUrl(e: AnyRecord): string | null {
  const stream = Array.isArray(e.observationsStream) ? (e.observationsStream as AnyRecord[]) : [];
  const hit = stream.find((o) => isHttp(o.sourceUrl) && /indiehackers\.com/.test(o.sourceUrl));
  return hit ? (hit.sourceUrl as string) : null;
}

function unitLabel(unit: unknown): string {
  const map: Record<string, string> = {
    MONTHLY_REVENUE: '月次売上', MONTHLY_PROFIT: '月次利益', ANNUAL_REVENUE: '年間売上', ANNUAL_PROFIT: '年間利益',
    REPORTED_MONEY_SIGNAL: '金額シグナル', MRR: 'MRR', ARR: 'ARR', CUMULATIVE_REVENUE: '累計売上', TOTAL_REVENUE: '累計売上',
  };
  return typeof unit === 'string' ? (map[unit] ?? unit) : '金額';
}

function buildReportedLines(e: AnyRecord): string[] {
  const rm = Array.isArray(e.reportedMetrics) ? (e.reportedMetrics as AnyRecord[]) : [];
  return rm.slice(0, 6).map((m) => {
    const ctx = typeof m.context === 'string' ? m.context.slice(0, 80) : '';
    return `${String(m.original ?? m.amount ?? '')}（${unitLabel(m.unit)}・${String(m.source ?? '掲載')}）${ctx ? `: ${ctx}` : ''}`;
  });
}

function pickRevenueLabel(e: AnyRecord, publishedAt: string | null): string | null {
  const rm = Array.isArray(e.reportedMetrics) ? (e.reportedMetrics as AnyRecord[]) : [];
  const pri = ['MONTHLY_REVENUE', 'MRR', 'MONTHLY_PROFIT', 'ANNUAL_REVENUE', 'ARR', 'REPORTED_MONEY_SIGNAL', 'CUMULATIVE_REVENUE', 'TOTAL_REVENUE'];
  const sorted = [...rm].sort((a, b) => pri.indexOf(String(a.unit)) - pri.indexOf(String(b.unit)));
  const m = sorted.find((x) => typeof x.original === 'string' && x.original.trim());
  if (!m) return null;
  const when = publishedAt ? `${publishedAt.slice(0, 10)}掲載` : '掲載日不明';
  const monthly = m.unit === 'MONTHLY_REVENUE' || m.unit === 'MRR' || m.unit === 'MONTHLY_PROFIT';
  return `本人申告 ${String(m.original)}（${unitLabel(m.unit)}）/ eBiz Facts ${when}・独立確認なし${monthly ? '' : '・月次換算なし'}`;
}

function zeroPnl(financialStatus: 'UNAVAILABLE' | 'POST_MORTEM' | 'REPORTED', extra: AnyRecord): AnyRecord {
  return {
    monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0,
    isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true,
    isCostsUnconfirmed: true, isNetProfitUnconfirmed: true,
    financialStatus,
    dataSnapshotPeriod: `${AUDIT_DATE} 機械的再監査（旧表示の数値は出典不足のため取り下げ）`,
    estimationLogic: '推計は挿入していない。旧表示の月次P&Lは出典で裏付けられないため reaudit.legacyDisplaySnapshot へ退避。',
    ...extra,
  };
}

function main() {
  const raw = readFileSync(indexPath, 'utf8');
  const records = JSON.parse(raw) as AnyRecord[];
  const ledgerManual = new Set<string>();
  if (existsSync(ledgerPath)) {
    for (const line of readFileSync(ledgerPath, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { const j = JSON.parse(line); if (j.auditStatus === 'MANUALLY_AUDITED' && typeof j.id === 'string') ledgerManual.add(j.id); } catch { /* ignore */ }
    }
  }

  const stats = {
    total: records.length, keptWithSource: 0, demoted: 0, byFamily: {} as Record<string, number>,
    droppedCards: 0, redactedTokens: 0, taglineSource: {} as Record<string, number>, ebizWithLabel: 0, parseFailures: [] as string[],
  };

  const out: AnyRecord[] = records.map((e) => {
    if (e.reaudit && typeof e.reaudit === 'object' && (e.reaudit as AnyRecord).method === METHOD) return e; // idempotent
    if (hasRealFinancialSource(e)) {
      stats.keptWithSource += 1;
      return {
        ...e,
        reaudit: { ...((e.reaudit as AnyRecord) ?? {}), status: 'LEGACY_WITH_SOURCE', auditDate: AUDIT_DATE, method: METHOD,
          note: '出典URLまたは原本Bindingを持つため財務数値は保持。個別再監査の対象。' },
      };
    }

    const family = familyOf(e);
    stats.byFamily[family] = (stats.byFamily[family] ?? 0) + 1;
    stats.demoted += 1;

    const pnl = (e.pnl as AnyRecord) ?? {};
    const sm = e.sourceMetadata as AnyRecord | undefined;
    const publishedAt = sm && typeof sm.publishedAt === 'string' ? sm.publishedAt : null;
    const officialUrl = isHttp(e.officialUrl) ? (e.officialUrl as string) : (isHttp(e.url) ? (e.url as string) : null);
    const isPostMortem = pnl.financialStatus === 'POST_MORTEM';

    const cards = Array.isArray(e.evidenceCards) ? (e.evidenceCards as DynamicEvidenceCard[]) : [];
    const keptCards = cards.filter((c) => isHttp((c as unknown as AnyRecord).url) || isHttp((c as unknown as AnyRecord).sourceUrl));
    stats.droppedCards += cards.length - keptCards.length;

    const sources: AnyRecord[] = [];
    const newCards: AnyRecord[] = [];
    const idBase = String(e.id);

    if (family === 'ebizfacts') {
      const url = ebizfactsUrl(e);
      const lines = buildReportedLines(e);
      const rawStored = Boolean(sm && (sm.rawStorage as AnyRecord | undefined)?.readbackVerified);
      sources.push({ url, publisher: 'eBiz Facts', sourceType: 'newsletter_case_summary (secondary summary of a self-report)',
        publicationDate: publishedAt ? publishedAt.slice(0, 10) : null, checkedAt: AUDIT_DATE, periodCovered: '記事掲載時点。事業の財務対象期間は記事の記述に依存。',
        claimStatus: lines.length ? 'REPORTED_BY_SUBJECT_VIA_SECONDARY' : 'IDENTITY_ONLY', rightsTier: 'TIER2_FACTS_ONLY', rawStoredPrivately: rawStored });
      newCards.push({
        id: `${idBase}_reaudit_source_ebizfacts`, type: 'UNKNOWN_AUDIT', title: '出典: eBiz Facts 記事（本人申告の要約）', badge: '出典',
        evidenceStatus: lines.length ? 'REPORTED' : 'UNKNOWN',
        punchline: lines.length ? `記事は本人申告の金額を掲載（${lines.length}件）。独立した会計確認はない。` : '記事は事業の紹介のみで、金額は掲載されていない。',
        details: [ ...lines, `掲載日: ${publishedAt ? publishedAt.slice(0, 10) : '不明'} / 確認日: ${AUDIT_DATE} / 権利: 事実のみ表示（原文・画像は転載しない）` ],
        url, sourceNote: `eBiz Facts ${url ?? ''} / 本人申告の二次要約 / rights: Tier 2 facts-only`, sourceClass: 'INDEPENDENT_SECONDARY',
      });
    }
    if (family === 'indiehackers') {
      const url = indiehackersUrl(e);
      const stream = Array.isArray(e.observationsStream) ? (e.observationsStream as AnyRecord[]) : [];
      const listing = stream.find((o) => isHttp(o.sourceUrl) && /indiehackers\.com/.test(o.sourceUrl));
      sources.push({ url, publisher: 'Indie Hackers', sourceType: 'community_product_listing', publicationDate: listing && typeof listing.observedAt === 'string' ? listing.observedAt : null,
        checkedAt: AUDIT_DATE, periodCovered: '掲載ページ観測時点', claimStatus: 'IDENTITY_AND_DESCRIPTION_ONLY', rightsTier: 'TIER2_FACTS_ONLY', rawStoredPrivately: false });
      newCards.push({
        id: `${idBase}_reaudit_source_indiehackers`, type: 'UNKNOWN_AUDIT', title: '出典: Indie Hackers 掲載ページ', badge: '出典', evidenceStatus: 'REPORTED',
        punchline: '掲載ページで製品名と自己紹介文を確認。売上・利益・チーム規模の数値はこの再監査では確認していない。',
        details: [ listing && typeof listing.text === 'string' ? listing.text.slice(0, 200) : '掲載文は未取得', `確認日: ${AUDIT_DATE} / 権利: 事実のみ表示（掲載文の転載はしない）` ],
        url, sourceNote: `Indie Hackers ${url ?? ''} / community listing / rights: Tier 2 facts-only`, sourceClass: 'COMMUNITY',
      });
    }
    if (officialUrl) {
      sources.push({ url: officialUrl, publisher: '公式サイト', sourceType: 'official_website', publicationDate: null, checkedAt: AUDIT_DATE,
        periodCovered: '現在のサイト表示', claimStatus: 'IDENTITY_ONLY_NOT_REOPENED_IN_THIS_PASS', rightsTier: 'TIER1_OFFICIAL', rawStoredPrivately: false });
      newCards.push({
        id: `${idBase}_reaudit_source_official`, type: 'UNKNOWN_AUDIT', title: '出典: 公式サイト', badge: '出典', evidenceStatus: 'REPORTED',
        punchline: '公式URLは記録済み。この機械的再監査ではページを再取得していない（個別再監査で製品・価格・会社概要を確認する）。',
        details: [ `URL: ${officialUrl}`, `ホスト: ${hostOf(officialUrl)}`, `確認日: ${AUDIT_DATE}` ],
        url: officialUrl, sourceNote: `official website ${officialUrl} / rights: Tier 1`, sourceClass: 'PRIMARY',
      });
    }
    if (newCards.length === 0) {
      newCards.push({
        id: `${idBase}_reaudit_no_source`, type: 'UNKNOWN_AUDIT', title: '調査限界: 出典が記録されていない', badge: '未確認', evidenceStatus: 'UNKNOWN',
        punchline: 'この記録には出典URLも原本保存もない。旧表示の数値と説明は根拠不足のため取り下げ、個別再監査の対象とする。',
        details: [ `確認日: ${AUDIT_DATE}` ], sourceNote: 'no source recorded / demoted by scripted honest rebuild', sourceClass: 'MODEL',
      });
    }

    // 調査限界カード（取れなかった事実の開示）: 何が未確認かを明示し、根拠ゼロの穴埋めをしない。
    newCards.push({
      id: `${idBase}_reaudit_limits`, type: 'UNKNOWN_AUDIT', title: '調査限界: この再監査で確認していないこと', badge: '未確認', evidenceStatus: 'UNKNOWN',
      punchline: '月商・利益・原価・手残り、チーム規模、創業年、集客経路、ツール構成は未確認。旧表示の数値は出典不足のため取り下げた。',
      details: [
        '未確認: 月商・利益・原価・手残りの実額（本人申告があれば「本人申告」として別掲）',
        '未確認: チーム規模・稼働時間・初期資本・創業年・現在の稼働状況',
        '未確認: 集客経路・ツール構成・価格の変遷',
        `次の作業: 公式サイトと創業者本人の一次発信を再取得し、出典・時点・利用条件付きで個別再監査する（${AUDIT_DATE} 時点）`,
      ],
      sourceNote: 'scripted honest rebuild / research limits disclosure', sourceClass: 'PRIMARY',
    });

    const revenueLabel = family === 'ebizfacts' ? pickRevenueLabel(e, publishedAt) : null;
    if (revenueLabel) stats.ebizWithLabel += 1;
    const sourceUrlForPnl = family === 'ebizfacts' ? ebizfactsUrl(e) : family === 'indiehackers' ? indiehackersUrl(e) : null;
    // 出典URLが無い記録は、架空の出典ラベルではなく「出典未記録」と明記する（check-index-safety は空文字を許さない）。
    const sourceDoc = sourceUrlForPnl ?? '出典未記録（旧表示の財務数値は出典不足のため取り下げ。個別再監査で出典を確認する）';
    const newPnl = zeroPnl(isPostMortem ? 'POST_MORTEM' : (revenueLabel ? 'REPORTED' : 'UNAVAILABLE'), {
      revenueLabel: revenueLabel ?? (isPostMortem ? '破綻事例（数値は未確認）' : '売上未確認'),
      sourceDoc,
      sourceClass: family === 'ebizfacts' ? 'INDEPENDENT_SECONDARY' : family === 'indiehackers' ? 'COMMUNITY' : 'MODEL',
    });

    const tl = honestTagline(e);
    stats.taglineSource[tl.source] = (stats.taglineSource[tl.source] ?? 0) + 1;

    const tags = (Array.isArray(e.tags) ? (e.tags as string[]) : []).filter((t) => !FABRICATED_TAGS.has(t));
    for (const t of ['再監査中', '財務未確認']) if (!tags.includes(t)) tags.push(t);

    const stream = Array.isArray(e.observationsStream) ? (e.observationsStream as UniversalObservation[]) : [];
    const keptStream = stream.filter((o) => isHttp((o as unknown as AnyRecord).sourceUrl));
    keptStream.push({
      id: `${idBase}-reaudit-${AUDIT_DATE.replace(/-/g, '')}-demotion`, category: 'RESEARCH_LIMIT', originType: 'observed', verificationStatus: 'SUPPORTED',
      text: `${AUDIT_DATE} 機械的再監査: 旧表示の月次P&L・検証タグ・原価カードは出典で裏付けられないため取り下げ。出典付きの事実（掲載ページ・公式URL・本人申告の報告値）のみ残した。`,
      observedAt: AUDIT_DATE, sourceClass: 'PRIMARY',
    } as unknown as UniversalObservation);

    const ops = (e.operations as AnyRecord) ?? {};
    const newOps = {
      ...ops, teamSize: 0, initialTeamSize: 0, currentTeamSize: 0, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0,
      isTeamSizeUnconfirmed: true, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true,
      primaryChannels: [], toolStack: [],
    };
    const temporal = (e.temporal as AnyRecord) ?? {};
    const newTemporal = {
      ...temporal, foundedYear: 0, initialTractionPeriod: '未確認（個別再監査待ち）', dataSnapshotPeriod: `${AUDIT_DATE} 機械的再監査`,
      viabilityStatus: 'UNKNOWN', viabilityLabel: '現時点の事業継続・再現性は未確認', eraContext: '未確認（個別再監査待ち）',
      currentViabilityAnalysis: '未確認。掲載や公式サイトの存在は現在の収益性を裏付けない。',
    };

    const legacy = {
      status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: AUDIT_DATE, method: METHOD,
      priorPnl: pnl, priorTagline: e.tagline, priorTags: e.tags, priorVerifiedBadge: e.verifiedBadge, priorGrowthRateYoY: e.growthRateYoY,
      priorOperations: { teamSize: ops.teamSize, currentTeamSize: ops.currentTeamSize, weeklyHours: ops.weeklyHours, initialCapitalRequired: ops.initialCapitalRequired, toolStack: ops.toolStack },
      priorTemporal: temporal,
      priorEvidenceCards: cards.map((c) => ({ id: c.id, type: c.type, title: c.title })),
      priorPublishability: e.publishability,
    };

    const rebuilt: AnyRecord = {
      ...e,
      tagline: tl.tagline,
      tags,
      verifiedBadge: false,
      growthRateYoY: 0,
      isGrowthUnconfirmed: true,
      pnl: newPnl,
      financialStatus: newPnl.financialStatus,
      evidenceCards: [...newCards, ...keptCards],
      observationsStream: keptStream,
      operations: newOps,
      temporal: newTemporal,
      publishability: 'PARTIAL',
      claimBindings: [],
      reaudit: {
        status: 'PARTIAL', auditDate: AUDIT_DATE, timezone: 'Asia/Tokyo', auditOwner: 'scripted-honest-rebuild', method: METHOD,
        family, sources,
        supported: sources.filter((s) => s.url).map((s) => `${String(s.publisher)}のページURLを記録（${String(s.url)}）`),
        unknown: ['月商・利益・原価・手残りの実額', 'チーム規模・稼働時間・初期資本', '創業年・現在の稼働状況', '集客経路・ツール構成'],
        unresearched: ['公式サイトの再取得', '創業者本人の一次発信の確認', '出典の利用条件の個別確認'],
        conflicts: [ `旧表示の月商 ${String(pnl.revenueLabel ?? pnl.monthlyRevenue ?? '')} は出典で裏付けられない（reaudit.legacyDisplaySnapshot 参照）` ],
        narrativeStatus: 'AI_GENERATED_UNVERIFIED_AMOUNTS_REDACTED',
        rights: { status: 'TIERED_2026_09_29', permission: 'FACTS_ONLY_WITH_ATTRIBUTION', basis: '事実のみ表示。原文・画像は転載しない。出典名・URL・日付を表示する。' },
        legacyDisplaySnapshot: legacy,
        manuallyCuratedBefore: ledgerManual.has(String(e.id)),
      },
    };

    // 叙述フィールド内の明示的な金額・率を未確認表記へ（架空数値の温存防止）。出典カード等は対象外。
    const redactStats = { hits: 0 };
    const NARRATIVE_KEYS = ['targetPainWallet', 'architecturePattern', 'pipelineStack', 'essence', 'strategy', 'lootBlueprint', 'observations', 'description', 'moatDescription', 'incumbentDilemma', 'blindspot', 'unknownsNotes', 'opportunityJudgment', 'profileBusinessLabel'];
    for (const k of NARRATIVE_KEYS) if (k in rebuilt) rebuilt[k] = redactDeep(rebuilt[k], redactStats);
    stats.redactedTokens += redactStats.hits;

    try { parseFinancialEntity(rebuilt); } catch (err) { stats.parseFailures.push(`${String(e.id)}: ${err instanceof Error ? err.message : String(err)}`); }
    return rebuilt;
  });

  const report = { generatedAt: new Date().toISOString(), method: METHOD, stats };
  console.log(JSON.stringify(report, null, 2));
  if (stats.parseFailures.length > 0) { console.error(`\n${stats.parseFailures.length} records failed schema validation; not writing.`); process.exit(1); }
  if (dryRun) { console.log('\n--dry-run: catalog not written'); return; }
  writeFileSync(indexPath, JSON.stringify(out, null, 2), 'utf8');
  writeFileSync(resolve(process.cwd(), reportPath), JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✓ wrote ${indexPath} (${out.length} records) and ${reportPath}`);
}

main();
