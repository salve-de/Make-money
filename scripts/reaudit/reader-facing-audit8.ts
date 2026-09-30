/**
 * 8回目の抜き取り監査の指摘を直す（データ側・2026-09-30）
 *
 * A1 公式サイトの状態の文を、audit8-official-site-check.json（公式URLへの普通のGETの結果）で確かめ直す
 * A2 eBiz の金額のうち、記事が推計したものを「記事の推計」と書く
 * A3 読者に意味の無い断り書きを外す
 * A6 手調査216件の取り込みで戻った内部語（互換値・再監査タグ・内部ラベル・旧表示）を直す
 * A4 lootBlueprint の対象顧客などで出典を示す語が無いものを「未確認」にする
 * A5 空の観察を配列から外す
 * B  個別の修正（2026-09-30 に WebFetch / curl で確認した出典）
 *
 * 元の値は reaudit.legacyDisplaySnapshot.priorNarrative.readerCleanup.audit8 へ {path, before} で退避する。
 * 冪等。書き込み前に変更した全件を parseFinancialEntity で検証する。
 *
 * 使い方: node --import tsx scripts/reaudit/reader-facing-audit8.ts [--dry-run]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';

type AnyRecord = Record<string, unknown>;
const rec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});
const canon = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val)
  ? Object.fromEntries(Object.entries(val as AnyRecord).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  : val));

const DATE = '2026-09-30';
const UNCONFIRMED = '未確認';
const dryRun = process.argv.includes('--dry-run');
const indexPath = resolve(process.cwd(), 'data/entities-index.json');
const checkPath = resolve(process.cwd(), 'scripts/reaudit/audit8-official-site-check.json');
const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
const examples: Record<string, string[]> = {};
const example = (k: string, name: string) => { (examples[k] ??= []); if (examples[k].length < 2) examples[k].push(name); };
const SKIP_KEYS = new Set(['id', 'reaudit', 'meta', 'sourceMetadata', 'coverageAudit', 'claimBindings']);

function stash(e: AnyRecord, path: string, before: unknown) {
  const reaudit = rec(e.reaudit);
  if (Object.keys(reaudit).length === 0) { bump('stash skipped (no reaudit)'); return; }
  const snap = rec(reaudit.legacyDisplaySnapshot);
  const pn = rec(snap.priorNarrative);
  const bucket = rec(pn.readerCleanup);
  if (!snap.status) Object.assign(snap, { status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: DATE, method: 'SCRIPTED_READER_FACING_CLEANUP_V1' });
  if (bucket.cleanedAt === undefined) bucket.cleanedAt = DATE;
  const list = Array.isArray(bucket.audit8) ? (bucket.audit8 as AnyRecord[]) : [];
  const key = canon(before);
  if (!list.some((x) => x.path === path && canon(x.before) === key)) list.push({ path, before: JSON.parse(JSON.stringify(before ?? null)) });
  bucket.audit8 = list;
  pn.readerCleanup = bucket; snap.priorNarrative = pn; reaudit.legacyDisplaySnapshot = snap; e.reaudit = reaudit;
}

/** e 内の全文字列（SKIP_KEYS 以外）を書き換える。fn が null を返したら変更なし。 */
function mapStrings(e: AnyRecord, fn: (s: string, path: string) => string | null, tag: string) {
  const walk = (parent: AnyRecord | unknown[], key: string | number, path: string) => {
    const v = (parent as AnyRecord)[key as string];
    if (typeof v === 'string') {
      const r = fn(v, path);
      if (r !== null && r !== v) { stash(e, path, v); (parent as AnyRecord)[key as string] = r; bump(tag); }
    } else if (Array.isArray(v)) v.forEach((_x, i) => walk(v, i, `${path}[${i}]`));
    else if (v && typeof v === 'object') {
      for (const k of Object.keys(v as AnyRecord)) { if (!SKIP_KEYS.has(k)) walk(v as AnyRecord, k, `${path}.${k}`); }
    }
  };
  for (const k of Object.keys(e)) { if (!SKIP_KEYS.has(k)) walk(e, k, k); }
}

// ---------------------------------------------------------------- A1 公式サイトの状態
interface SiteEntry { cat: 'redirect' | 'unreadable' | 'parked' | 'soon' | 'third'; host?: string }
const siteCheck: { entries: Record<string, SiteEntry>; counts: Record<string, number> } = existsSync(checkPath)
  ? JSON.parse(readFileSync(checkPath, 'utf8')) : { entries: {}, counts: {} };
const ALIVE_LABEL = /^公式サイトは(稼働中|応答)(（[^）]*）)?[。、]?\s*/;
const ALIVE_ANALYSIS = /(公式サイト|公式ページ|公式ドメイン).*(公開|到達|応答|開ける|開けた|説明を確認|案内を確認|本文を取得|説明を取得|稼働)/;
const HONEST = /(読めなかった|取得できず|失敗|できなかった|駐車|転送|売り物|未特定|引用したページ)/;
const OFFSITE = /^公式サイト（\d{4}-\d{2}-\d{2}確認）: ([\s\S]+)$/;
const OPENS = /^公式サイトが開けることを?確認した/;

function stateSentence(en: SiteEntry): string {
  switch (en.cat) {
    case 'redirect': return `公式ドメインは別のサイト（${en.host}）へ転送される（2026-09確認）`;
    case 'unreadable': return '公式サイトは確認時に本文を読めなかった（2026-09）';
    case 'parked': return '公式ドメインは売り物・駐車ページになっている（2026-09確認）';
    case 'soon': return '公式サイトは準備中の表示だけだった（2026-09確認）';
    default: return '公式サイトは未確認（登録されたURLは記事が引用したページ）';
  }
}

function fixA1(e: AnyRecord, name: string) {
  const en = siteCheck.entries[String(e.id)];
  if (!en) return;
  const state = stateSentence(en);
  let hit = false;
  mapStrings(e, (s, path) => {
    if (en.cat === 'third') {
      const m = s.match(OFFSITE);
      if (m) { hit = true; return `記事が引用したページ（${en.host}）: ${m[1]}`; }
      if (/^出典: 公式サイト(\(.*\)|（.*）)?$/.test(s) && /evidenceCards\[\d+\]\.title$/.test(path)) { hit = true; return '出典: 記事が引用したページ'; }
    } else {
      if (OFFSITE.test(s)) { hit = true; return `${state}。`; }
      if (OPENS.test(s)) { hit = true; return `${state}。`; }
    }
    if (path === 'temporal.viabilityLabel') {
      const m = s.match(ALIVE_LABEL);
      if (m) { hit = true; const rest = s.slice(m[0].length).trim(); return rest ? `${state}。${rest}` : state; }
    }
    if (path === 'temporal.currentViabilityAnalysis' && ALIVE_ANALYSIS.test(s) && !HONEST.test(s)) { hit = true; return `${state}。事業の継続や収益は未確認。`; }
    if (/^timelineEvents\[\d+\]\.description$/.test(path) && OPENS.test(s)) { hit = true; return `${state}。`; }
    return null;
  }, `A1 rewritten (${en.cat})`);
  if (hit) { bump(`A1 records ${en.cat}`); example(`A1 ${en.cat}`, name); }
}

// ---------------------------------------------------------------- A2 記事の推計
const EST = /推計|試算|推測|算出|計算|概算|見積|estimat|calculator|Kalodata|Similarweb|Social Blade|SEMrush|Ahrefs/i;
const NOTSELF = /(本人|運営者|実売額)の申告ではない/;
const DESC_CUE = /記事の(計算|試算|推計|概算|推測)|から(記事が)?(計算|推計)|計算ツール|Similarweb|Kalodata/;
const RAW_CUE = /calculator|kalodata|similarweb|social ?blade|semrush|ahrefs|I'd estimate|we estimate|estimates that|estimated (?:by|at|to be)/i;
const numOf = (s: string): number => {
  const t = String(s).replace(/,/g, ''); const m = t.match(/[\d.]+/); if (!m) return NaN;
  let v = parseFloat(m[0]); if (/\dK/i.test(t)) v *= 1e3; if (/\dM/i.test(t)) v *= 1e6; return v;
};
function methodOf(ctx: string): string {
  const parts = ctx.split('／');
  let d = parts.slice(3).join('／').replace(/[。、]?(アカウント)?(運営者|本人|実売額)の申告ではない。?/g, '').replace(/で、?$/, '').replace(/[。]$/, '').trim();
  if (!d || d.length > 70) d = (parts[0].split('・').slice(1).join('・') || parts[0]).trim();
  return d;
}
function rawMethod(id: string, amt: string): string | null {
  const f = resolve(process.cwd(), 'data/r2-local/ebiz-text', `${id}.txt`);
  if (!existsSync(f)) return null;
  const body = readFileSync(f, 'utf8').split('--- LINKS ---')[0];
  for (const v of [amt, amt.replace(/,/g, ''), amt.replace(/\.\d+/, '')]) {
    let i = body.indexOf(v);
    while (i >= 0) {
      const w = body.slice(Math.max(0, i - 160), i + 160); const c = w.match(RAW_CUE);
      if (c) {
        const k = c[0].toLowerCase();
        if (/similarweb/.test(k)) return '記事がSimilarwebの訪問数から推計';
        if (/kalodata/.test(k)) return '記事がKalodataの推計を引用';
        if (/calculator/.test(k)) return '記事が計算ツールで推計';
        if (/social/.test(k)) return '記事がSocial Bladeの数字から推計';
        return '記事の筆者による見積もり';
      }
      i = body.indexOf(v, i + 1);
    }
  }
  return null;
}
const UNIT_JA: Record<string, string> = { 'monthly revenue': '月次売上', 'annual revenue': '年間売上', 'total or best period': '累計または最高期の売上', 'monthly profit': '月次利益', 'annual profit': '年間利益' };
void UNIT_JA;

function fixA2(e: AnyRecord, name: string) {
  const id = String(e.id);
  if (!id.startsWith('ent_ebizfacts')) return;
  const metrics = (Array.isArray(e.reportedMetrics) ? e.reportedMetrics : []) as AnyRecord[];
  const ctxOf = (m: AnyRecord) => String(m.context ?? '');
  const tagOf = (m: AnyRecord) => ctxOf(m).split('／')[1] ?? '';
  const estMetric = (m: AnyRecord) => tagOf(m) !== '本人申告' && (EST.test(ctxOf(m).split('／')[0]) || NOTSELF.test(ctxOf(m)) || DESC_CUE.test(ctxOf(m)));
  const stream = Array.isArray(e.observationsStream) ? (e.observationsStream as AnyRecord[]) : [];
  let flipped = false;
  for (const s of stream) {
    if (typeof s.text !== 'string') continue;
    const self = s.text.match(/^記事に書かれた(.*?)([$€£¥][\d,.]+[KkMm]?)（本人の数字として記事が紹介。第三者の確認は無い）。/);
    const third = s.text.match(/^記事に書かれた([$€£¥][\d,.]+[KkMm]?)は第三者の報告で、/);
    let unit = ''; let amt = ''; let method: string | null = null;
    if (self) {
      unit = self[1]; amt = self[2];
      const cand = metrics.filter((m) => numOf(String(m.original)) === numOf(amt));
      if (cand.length && cand.some((m) => tagOf(m) === '本人申告')) continue;
      if (cand.length && cand.every(estMetric)) method = methodOf(ctxOf(cand[0]));
      else if (!cand.length || cand.every((m) => tagOf(m) !== '本人申告')) method = rawMethod(id, amt);
    } else if (third) {
      amt = third[1];
      const em = metrics.find(estMetric);
      if (em) method = methodOf(ctxOf(em));
    } else continue;
    if (!method) continue;
    stash(e, `observationsStream[${String(s.id)}].text`, s.text);
    s.text = `記事に書かれた${unit ? `${unit}の` : ''}推計値${amt}（推計の方法: ${method}。本人の申告ではない）。利益・原価・手残りは確認されていない。`;
    flipped = true; bump('A2 stream rewritten'); example('A2', name);
  }
  if (!flipped) return;
  bump('A2 records');
  const rs = rec(e.reaudit);
  if (Array.isArray(rs.sources)) {
    for (const src of rs.sources as AnyRecord[]) {
      if (/ebizfacts/.test(String(src.url ?? '')) && src.claimStatus !== 'REPORTED_ESTIMATE_BY_ARTICLE') {
        stash(e, 'reaudit.sources.claimStatus', src.claimStatus); src.claimStatus = 'REPORTED_ESTIMATE_BY_ARTICLE'; bump('A2 claimStatus -> 記事の推計');
      }
    }
  }
  mapStrings(e, (s, path) => {
    if (/evidenceCards\[\d+\]\.title$/.test(path) && s === '出典: eBiz Facts 記事（本人申告の要約）') return '出典: eBiz Facts 記事（記事の推計の要約）';
    if (/evidenceCards\[\d+\]\.title$/.test(path) && s.startsWith('本人申告の要約（')) return s.replace('本人申告の要約', '記事の推計の要約');
    if (/sourceNote$/.test(path)) return s.replace('本人申告の二次要約', '記事の推計の二次要約');
    if (s === 'eBiz Factsの記事が紹介する本人の数字であり、本人の決済口座・財務諸表による独立確認は未実施。') return 'eBiz Factsの記事の推計値であり、決済口座・財務諸表による独立確認は未実施。';
    if (s === 'eBiz Factsの記事（本人の数字の紹介）を根拠にした候補。利益・自立性は一次確認前。') return 'eBiz Factsの記事（推計値）を根拠にした候補。利益・自立性は一次確認前。';
    if (s.includes('本人申告の金額の独立確認')) return s.replace('本人申告の金額の独立確認', '記事の推計値の独立確認');
    return null;
  }, 'A2 label aligned');
}

// ---------------------------------------------------------------- A3 断り書き
const DROP_ITEM: RegExp[] = [
  /^記事にある「利益」の数字は.*利益としては扱っていない。?$/,
  /^eBiz Factsのプロフィール記事（.*掲載）の要約。?$/,
  /^(未確認[:：]\s*)?財務（有価証券報告書での確認が必要）。?$/,
  /^金額\d+件の内訳は「.*」カードに別掲$/,
  /^原価・利益・手残りは裏付けが無いため表示していない。?$/,
  /^年間売上の根拠はあるが月ごとの根拠が無いため、月額への割り戻しはしていない。?$/,
];
const CARD_DATE = /掲載日[:：]\s*(\d{4}-\d{2}-\d{2})/;

function fixA3(e: AnyRecord) {
  const pnl = rec(e.pnl);
  if (typeof pnl.estimationLogic === 'string' && (/^推計は入れていません。/.test(pnl.estimationLogic) || String(e.id) === 'ent_spotify_P9V4L6KD')) {
    stash(e, 'pnl.estimationLogic', pnl.estimationLogic); delete pnl.estimationLogic; e.pnl = pnl; bump('A3 a pnl.estimationLogic removed');
  }
  if (typeof pnl.sourceDoc === 'string' && /^財務数値の出典なし（/.test(pnl.sourceDoc)) {
    stash(e, 'pnl.sourceDoc', pnl.sourceDoc); pnl.sourceDoc = '出典未記録'; e.pnl = pnl; bump('A3 i pnl.sourceDoc -> 出典未記録');
  }
  const audit8 = (rec(rec(rec(rec(e.reaudit).legacyDisplaySnapshot).priorNarrative).readerCleanup).audit8 as AnyRecord[] | undefined) ?? [];
  if (pnl.sourceDoc === undefined && audit8.some((x) => x.path === 'pnl.sourceDoc')) { pnl.sourceDoc = '出典未記録'; e.pnl = pnl; bump('A3 i pnl.sourceDoc restored as 出典未記録'); }
  const dropFrom = (key: string, arr: unknown[], keyName: string) => {
    const kept = arr.filter((x) => {
      const t = typeof x === 'string' ? x : typeof rec(x).text === 'string' ? (rec(x).text as string) : null;
      return !(t !== null && DROP_ITEM.some((re) => re.test(t.trim())));
    });
    if (kept.length !== arr.length) { stash(e, key, JSON.parse(JSON.stringify(arr))); bump(`A3 removed items ${keyName}`, arr.length - kept.length); return kept; }
    return arr;
  };
  for (const key of ['observations', 'unknownsNotes'] as const) if (Array.isArray(e[key])) e[key] = dropFrom(key, e[key] as unknown[], key);
  if (Array.isArray(e.observationsStream)) e.observationsStream = dropFrom('observationsStream', e.observationsStream as unknown[], 'observationsStream');
  if (Array.isArray(e.evidenceCards)) {
    (e.evidenceCards as AnyRecord[]).forEach((c, i) => {
      if (Array.isArray(c.details)) c.details = dropFrom(`evidenceCards[${i}].details`, c.details as unknown[], 'evidenceCards.details');
      const p = typeof c.punchline === 'string' ? c.punchline : null;
      if (p === null) return;
      let np = p;
      if (/^記事は金額を\d+件掲載（.*中心）。独立した会計確認はない。?$/.test(p)) {
        const d = (Array.isArray(c.details) ? (c.details as unknown[]) : []).map(String).map((x) => x.match(CARD_DATE)).find(Boolean);
        np = d ? `eBiz Facts の記事（掲載日 ${d[1]}）` : 'eBiz Facts のプロフィール記事';
      }
      np = np.replace(/\s*記事の金額は出所を付けて(別に載せている|別掲)。?$/, '').replace(/確認した公開ページの範囲で裏付けが見つからなかったもので、存在しないことを意味しない。?$/, '').trim();
      np = np.replace(/ほか計\d+件を記載/, 'を記載');
      if (np !== p && np) { stash(e, `evidenceCards[${i}].punchline`, p); c.punchline = np; bump('A3 punchline cleaned'); }
    });
  }
  // 残りの文字列に含まれる同種の文
  mapStrings(e, (s) => {
    if (/存在しないことを意味しない/.test(s)) return s.replace(/確認した公開ページの範囲で裏付けが見つからなかったもので、存在しないことを意味しない。?/, '').trim() || null;
    return null;
  }, 'A3 neg sentence cleaned');
}

// ---------------------------------------------------------------- A6 手で調べ直した版の取り込みで戻った内部語（2026-09-30）
// Codex の手調査 216 件（IH 全件レーン）の取り込みで戻った、互換値・再監査/再調査・内部ラベル・旧表示の文を読者向けに直す。
const PROCESS_TAGS = new Set(['再監査済み・未取り込み', '再監査済み候補', '公開情報の個別再調査']);
function fixA6(e: AnyRecord) {
  const pnl = rec(e.pnl);
  if (typeof pnl.estimationLogic === 'string' && /^(推計は挿入していない。|推計・換算はしていない。日付と事業同一性を確認できた当事者または公式の報告値だけを別掲し、内部の0は不明の互換値。)/.test(pnl.estimationLogic)) {
    stash(e, 'pnl.estimationLogic', pnl.estimationLogic); delete pnl.estimationLogic; e.pnl = pnl; bump('A6 a pnl.estimationLogic (内部語入り) removed');
  }
  if (Array.isArray(e.tags)) {
    const kept = (e.tags as unknown[]).filter((t) => !(typeof t === 'string' && PROCESS_TAGS.has(t)));
    if (kept.length !== (e.tags as unknown[]).length) { stash(e, 'tags', e.tags); e.tags = kept; bump('A6 b process tags removed'); }
  }
  mapStrings(e, (s, path) => {
    if (/(^|\.)dataSnapshotPeriod$/.test(path) && /(個別|公開資料)再監査$/.test(s)) return s.replace(/\s*(個別|公開資料)再監査$/, ' 時点');
    if (path === 'temporal.viabilityLabel' && /^(UNVERIFIED_OR_ENDED|ACCESS_RESTRICTED_OR_ENDED|IDENTITY_CONFLICT)$/.test(s)) return '現時点の事業継続・再現性は未確認';
    if (/数値0は不明の互換値。?$/.test(s)) return s.replace(/、?数値0は不明の互換値。?$/, '。数値は未確認。');
    if (s === '過去の本人申告。金額の期間・日付はrevenueLabelと出典の観測に記載。') return '過去の本人申告。金額の期間・日付は売上欄と出典に記載。';
    if (s.includes('旧表示$15,000も併記される')) return s.replace('旧表示$15,000も併記される', '$15,000の表示も併記される');
    return null;
  }, 'A6 c wording');
}

// ---------------------------------------------------------------- A7 手調査の取り込みで戻った使い回し作文（2026-09-30）
// 手調査の候補ファイル（035・037・051・056）は、出典に基づかない旧AIの定型文（秘密の洞察・堀・大手の死角）をそのまま持っていた。
// 3件以上で同じ文が出るとテンプレ検査に当たるので、手調査済みレコード（MANUAL_REAUDIT）に限り、定型の文枠に一致する値だけを未確認へ戻す。
const A7_FRAMES: Array<[string, RegExp]> = [
  ['secretInsight', /^市場の盲点を突き、.+に特化することで、/],
  ['moatDescription', /密結合することによる、不可逆な他社乗り換/],
  ['incumbentDilemma', /^大手競合が複雑な総合システムに固執し、特定用途に直球で刺さるシンプルな解決策を放置している死角。?$/],
  ['blindspot', /^大手競合が複雑な総合システムに固執し、特定用途に直球で刺さるシンプルな解決策を放置している死角。?$/],
];
function fixA7(e: AnyRecord) {
  if (rec(e.reaudit).method !== 'MANUAL_REAUDIT') return;
  for (const [field, re] of A7_FRAMES) {
    const v = e[field];
    if (typeof v === 'string' && re.test(v)) { stash(e, field, v); e[field] = UNCONFIRMED; bump(`A7 ${field} template -> 未確認`); }
  }
}

// ---------------------------------------------------------------- A4 lootBlueprint
const SRC_WORD = /(記載|説明|紹介|掲げ|述べ|案内|うた|明記|表示|と書|によると|記事は|公式は)/;
const STAT = /(\d{1,3}(?:,\d{3})+\s*(?:人|回|件|社|名)|万人超|万社|万件)/;
function keepText(tc: string): boolean {
  if (tc === UNCONFIRMED) return true;
  const sentences = tc.split(/(?<=。)/).map((x) => x.trim()).filter(Boolean);
  if (sentences.some((x) => STAT.test(x))) {
    const non = sentences.filter((x) => !STAT.test(x));
    return non.length > 0 && non.some((x) => SRC_WORD.test(x));
  }
  return SRC_WORD.test(tc);
}
function fixA4(e: AnyRecord, name: string) {
  const lb = rec(e.lootBlueprint);
  if (Object.keys(lb).length === 0) return;
  for (const k of ['targetPrey', 'structuralFlaw', 'stealthEntry']) {
    const v = lb[k];
    if (typeof v === 'string' && v !== UNCONFIRMED && !keepText(v)) {
      stash(e, `lootBlueprint.${k}`, v); lb[k] = UNCONFIRMED; e.lootBlueprint = lb; bump(`A4 lootBlueprint.${k} -> 未確認`); example('A4', name);
    }
  }
}

// ---------------------------------------------------------------- A5 空の観察
function fixA5(e: AnyRecord) {
  if (Array.isArray(e.observationsStream)) {
    const arr = e.observationsStream as AnyRecord[];
    const kept = arr.filter((x) => { const t = typeof x.text === 'string' ? x.text.trim() : ''; return t !== '' && t !== UNCONFIRMED; });
    if (kept.length !== arr.length) { stash(e, 'observationsStream', JSON.parse(JSON.stringify(arr))); bump('A5 removed empty observationsStream', arr.length - kept.length); e.observationsStream = kept; }
  }
  if (Array.isArray(e.observations)) {
    const arr = e.observations as unknown[];
    const kept = arr.filter((x) => !(typeof x === 'string' && x.trim() === ''));
    if (kept.length !== arr.length) { stash(e, 'observations', [...arr]); bump('A5 removed empty observations', arr.length - kept.length); e.observations = kept; }
  }
}

// ---------------------------------------------------------------- B 個別
const BUFFER_URL = 'https://buffer.com/resources/idea-to-paying-customers-in-7-weeks-how-we-did-it/';
function fixB(e: AnyRecord) {
  const id = String(e.id);
  if (id === 'ent_buffer' && Array.isArray(e.observations)) {
    const obs = e.observations as string[];
    const i = obs.findIndex((x) => /まだ作ってません/.test(x));
    if (i >= 0) {
      stash(e, `observations[${i}]`, obs[i]);
      obs[i] = `Buffer の創業者は、アイデアを説明するページと、価格ページの2ページを作り、メール登録の前に1クリック挟んで、どのプランが選ばれるかを測った（支払いは受けず、集めたのはメールアドレス）。出典: ${BUFFER_URL}`;
      bump('B buffer');
    }
  }
  if (id === 'ent_krisp_1b9d40') {
    const NEWP = '料金ページは、7日間の無料トライアルを案内し、恒久の無料プランは表示していない（2026-09-30確認）。Core は月払いで1人あたり月16ドル、年払いの表示は月8ドル。Advanced は月払い月30ドル、年払いの表示は月15ドル。Enterprise は要問い合わせ。';
    mapStrings(e, (s, path) => {
      if (path === 'tagline') return '通話や会議のノイズ除去、議事録の作成、アクセント変換を提供する音声AI';
      if (s.includes('無料プランと、1人あたり月8ドルから30ドルの有料プランを表示している')) return NEWP;
      if (path === 'description' && s.includes('無料プランと有料プランがあり、有料は1人あたり月8ドルから30ドルの段階が表示されている(料金ページの表示のとおり)。')) {
        return s.replace('無料プランと有料プランがあり、有料は1人あたり月8ドルから30ドルの段階が表示されている(料金ページの表示のとおり)。', NEWP);
      }
      return null;
    }, 'B krisp');
  }
  if (id.startsWith('ent_ebizfacts_pennycanny')) {
    mapStrings(e, (s) => {
      let o = s;
      if (o.includes('経験者の管理者1人が率い、残りは社内で育てた')) o = o.replace('経験者の管理者1人が率い、残りは社内で育てた', '経験者の管理者1人が率い、残りは研修した');
      if (/掲載店は約50/.test(o)) o = o.replace(/掲載店は約50(店)?/, '記事の掲載時点で約50店（現在の公式サイトは「6,000以上のブランド・店舗・飲食店・地域事業者」と表記）');
      return o;
    }, 'B pennycanny');
  }
  if (id.startsWith('ent_ebizfacts_letterboxedanswers')) {
    mapStrings(e, (s) => (s === 'ent_' ? null : s.replace('新聞パズルの答えを毎日載せるだけのサイトが、広告で稼ぐ事例。', '新聞パズルの答えを毎日載せるだけのサイト。広告収益の推計が記事にある事例。')), 'B letterboxed tagline');
    if (Array.isArray(e.observations)) {
      const a = e.observations as string[]; const k = a.filter((x) => !/^集客経路（記事記載）: 検索/.test(x));
      if (k.length !== a.length) { stash(e, 'observations', [...a]); e.observations = k; bump('B letterboxed 集客経路 removed'); }
    }
    if (Array.isArray(e.evidenceCards)) {
      (e.evidenceCards as AnyRecord[]).forEach((c, i) => {
        if (Array.isArray(c.details)) {
          const a = c.details as string[]; const k = a.filter((x) => !/^集客経路（記事記載）: 検索/.test(x));
          if (k.length !== a.length) { stash(e, `evidenceCards[${i}].details`, [...a]); c.details = k; bump('B letterboxed 集客経路 removed'); }
        }
      });
    }
  }

  if (id === 'ent_jetseen_ac87fb9955c8') {
    // https://jetseen.com/（公式: 14種類のルール、任意のGPS補助、任意の暗号化クラウドバックアップ、Android は2026年8月提供予定と表記）
    // https://www.indiehackers.com/product/jetseen（13ルール、手入力のみ・端末内保存）と /revenue（「Stripe で検証済み」）
    const OFFICIAL_STORAGE = '公式サイトは任意のGPS補助と、任意の暗号化クラウドバックアップを案内';
    mapStrings(e, (t) => {
      let o = t;
      if (o.includes('13の国別ルール（') && !o.includes('公式サイトは14種類')) o = o.replace('13の国別ルール（', 'IH の投稿は13の国別ルール(公式サイトは14種類と表記)（');
      if (o.includes('手入力のみでデータは端末内に保存と説明') && !o.includes('任意のGPS補助')) o = o.replace('手入力のみでデータは端末内に保存と説明', `手入力のみでデータは端末内に保存と説明（${OFFICIAL_STORAGE}）`);
      if (o.includes('手入力のみで、位置情報の自動記録はなく、データは端末内に保存と記載') && !o.includes('任意のGPS補助')) o = o.replace('データは端末内に保存と記載', `データは端末内に保存と記載（${OFFICIAL_STORAGE}）`);
      o = o.replace(/IH の Stripe 連携表示（未検証）/g, 'IH の収益ページの「Stripe で検証済み」表示(当調査では Stripe 側は未確認)');
      o = o.replace(/Android 版は2026年8月の提供予定(と案内している|との案内を確認)?/g, (_m, tail) => `Android 版は確認時点で「2026年8月提供予定」と書いていた（提供開始は未確認）${tail === 'と案内している' ? '' : ''}`);
      return o;
    }, 'B jetseen');
  }
  if (id === 'ent_mooncv_f108f5ca0eb2') {
    // 公式トップ https://www.mooncv.com/ と料金ページ https://www.mooncv.com/pricing、IH 収益ページ（表示名 Chris (BeefyDonkey)）
    mapStrings(e, (t) => {
      let o = t;
      o = o.replace('「履歴書は100%無料」「透かしなし」「全テンプレート無料」と表示し、', '公式トップは「履歴書は100%無料」「透かしなし」「全テンプレート無料」と表示（料金ページの Free は履歴書と送付状が各1件まで）し、');
      o = o.replace('「履歴書は100%無料」「透かしなし、全テンプレート無料」とうたい、', '公式トップは「履歴書は100%無料」「透かしなし、全テンプレート無料」とうたう（料金ページの Free は履歴書と送付状が各1件まで）。');
      o = o.replace('個別の氏名の表示は取得内容により異なる', 'IH の表示名は Chris（BeefyDonkey）');
      o = o.replace('求人数は日付のない自己申告だった。', '公式サイトの求人数（2億1,000万件超）は日付のない自己申告。');
      return o;
    }, 'B mooncv');
  }
  if (id === 'ent_heartofthedawngames_bd2636b8242b') {
    // IH の収益ページ: $1,000、2026-02-01 最終更新、独立検証なしと明記。商品ページは $1K/mo
    mapStrings(e, (t) => {
      let o = t;
      o = o.replace('収益欄: 月$1Kと表示（入力者と検証の有無はページ上で確認できず、公式サイトなど他の出典でも裏付けは得られていない）', '収益欄: 掲載ページは $1K/mo（unverified）と表示。収益ページは月$1,000、2026-02-01 最終更新で、独立には検証されていないと明記');
      o = o.replace('収益欄は月$1Kと表示（2026-09-29 確認）。入力者と検証の有無はページ上で確認できず、公式サイトなど他の出典でも裏付けは得られていない。', '掲載ページは $1K/mo（unverified）と表示（2026-09-29 確認）。収益ページは月$1,000、2026-02-01 最終更新で、独立には検証されていないと明記している。');
      return o;
    }, 'B heartofthedawn');
  }
  if (id === 'ent_mailrush_429bbaf3f39a') {
    // IH 投稿 "MailRush.io News for December 2023"（2023-12-10）
    mapStrings(e, (t) => t.replace('2023-12 にニュース、', '2023-12 に月次ニュース投稿（ダッシュボードの刷新、オールインワンのメール配信サービスへの方針、メール検証エンジンの強化、12月中の全プラン30%割引）、'), 'B mailrush');
  }
  if (id === 'ent_facepop_74c29650d22f') {
    // https://facepop.io/ : "Websites are easier to trust when there's a face."
    mapStrings(e, (t) => t.replace('顔の見えないサイトに動画で人の温かみを足し、成約率を上げられると案内', '公式は「顔がある方がサイトは信頼されやすい」と説明し、動画で顔を見せて成約率を上げられると案内'), 'B facepop');
  }
  if (id === 'ent_kwesforms_9e2d14') {
    // 住所は https://kwesforms.com/privacy の "Headquarters for Kwes is located at 1000 Brickell Ave, Miami, FL 33131 USA" に出典あり。帰属だけ直す。
    mapStrings(e, (t) => t.replace('公式の利用規約の表記。本社はマイアミの1000 Brickell Ave）', '社名は公式の利用規約の表記。本社所在地はプライバシーポリシー（https://kwesforms.com/privacy）に、マイアミの1000 Brickell Ave と記載）'), 'B kwesforms');
  }
  if (id === 'ent_ebizfacts_jasontiktokshoplivestream70klitterbox_866d331a2d88') {
    mapStrings(e, (t) => t.replace('TikTok Shopのアフィリエイト報酬は一般に10〜30%（第三者資料を記事が引用）', '記事はTikTok Shopのアフィリエイト報酬を10〜30%と書くが、引用先の資料（dashboardly.io）は、率は出品者が設定し1〜80%の範囲と説明していて、10〜30%の固定値は裏付けていない'), 'B tiktok commission');
  }
  if (id === 'ent_spotify_P9V4L6KD') {
    const pnl = rec(e.pnl);
    if (typeof pnl.revenueLabel === 'string' && /12で割/.test(pnl.revenueLabel) || pnl.revenueLabel === 'FY2025 年間売上 17,186百万EUR（SEC 20-F）') {
      stash(e, 'pnl.revenueLabel', pnl.revenueLabel);
      pnl.revenueLabel = 'SEC 20-F FY2025: 年間売上 17,186百万EUR'; e.pnl = pnl; bump('B spotify revenueLabel');
    }
    // 推計式を消すので、推計扱い（ESTIMATED）のままでは検査に通らない。金額欄は全て未確認なので UNAVAILABLE にする。
    if (rec(e.pnl).financialStatus === 'ESTIMATED') {
      stash(e, 'pnl.financialStatus', 'ESTIMATED'); pnl.financialStatus = 'UNAVAILABLE'; e.pnl = pnl;
      if (e.financialStatus === 'ESTIMATED') { stash(e, 'financialStatus', 'ESTIMATED'); e.financialStatus = 'UNAVAILABLE'; }
      bump('B spotify financialStatus -> UNAVAILABLE');
    }
  }
  if (id === 'ent_adslypro_b6b9203c0047' && Array.isArray(e.evidenceCards)) {
    const cards = e.evidenceCards as AnyRecord[];
    cards.forEach((c, i) => {
      if (c.title === '年払い・前払い') { stash(e, `evidenceCards[${i}].title`, c.title); c.title = '返金規約'; bump('B adsly card title'); }
    });
    if (Array.isArray(e.observationsStream)) {
      for (const s of e.observationsStream as AnyRecord[]) {
        if (s.categoryLabel === '年払い・前払い') { stash(e, `observationsStream[${String(s.id)}].categoryLabel`, s.categoryLabel); s.categoryLabel = '返金規約'; const pd = rec(s.publicDisplay); if (pd.title) pd.title = '返金規約'; bump('B adsly stream label'); }
        if (typeof s.text === 'string' && s.text.includes('48時間、本人確認なし') && !s.text.includes('2〜4営業日')) {
          stash(e, `observationsStream[${String(s.id)}].text`, s.text);
          s.text += '開設までの期間は、IHの投稿が「48時間」、公式トップ（adsly.pro）が「2〜4営業日」（2–4 Business days of preparation）と表記していて食い違う。';
          bump('B adsly 48h vs 2-4d');
        }
      }
    }
  }
}

// ---------------------------------------------------------------- main
function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  let changed = 0;
  for (const e of entities) {
    const before = canon(e);
    const name = String(e.name ?? e.id);
    fixA2(e, name); // 元の文で判定するため A1 より先
    fixA1(e, name);
    fixA3(e);
    fixA6(e);
    fixA7(e);
    fixA4(e, name);
    fixA5(e);
    fixB(e);
    if (canon(e) !== before) { changed++; parseFinancialEntity(e); }
  }
  bump('records changed', changed);
  console.log(JSON.stringify({ total: entities.length, counts, examples }, null, 1));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}
main();
