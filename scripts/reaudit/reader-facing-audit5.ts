/**
 * 5回目の抜き取り監査の指摘を直す（2026-09-30）
 *
 * A. 画面に出る欄の社内向けの文（調べた範囲・検索回数・採否・R4・IH_WORKFLOW・公式URL監査・money signal など）を、読者向けの平易な文に置き換える。
 * B. 推測の書き込み（country=GLOBAL、チーム・稼働（記事記載）の行、個別レコードの誤り）を未確認にする／直す。
 *
 * 対象: entities-index.json の画面に出る欄（reaudit / meta / sourceMetadata / id は対象外）。
 * 変えた元の値は reaudit.legacyDisplaySnapshot.priorNarrative.readerCleanup.audit5 へ {path, before} で退避する（既存の中身は消さない）。
 * 冪等: 2回目以降は何も変えない。書き込み前に変更した全件を parseFinancialEntity で検証する。
 *
 * 使い方: node --import tsx scripts/reaudit/reader-facing-audit5.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
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
const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
const DELETE = Symbol('delete');

const NEG = 'この収益欄は裏付けが無いため、売上としては扱っていない';
const POS = '本人の過去の申告（第三者の検証なし）';
const MARKER = /R4|IH_WORKFLOW|採否|リード判断|名目(?:入力|値)|Rule R/;

function statusPhrase(st: string): string {
  switch (st) {
    case '403': return 'アクセスを拒否された';
    case '404': return 'ページが見つからなかった（HTTP 404）';
    case '503': return '一時的に利用できなかった';
    case '307': return '別のURLへ転送された';
    case '429': return 'アクセス制限を受けた';
    default: return 'エラーになった';
  }
}
const OPENS_NOTE = '公式サイトが開けることは確認した（売上や事業継続の証拠ではない）';

/** 1文（末尾の「。」を除いたもの）を直す。変えないなら undefined、消すなら ''。 */
function fixSentence(core: string, path: string): string | undefined {
  let out = core;
  // A3 今回のN検索
  out = out.replace(/今回の[0-9０-９]*検索(?:範囲)?(?:では|で)(?:確認できなかった|確認できず|未確認)/g, '確認できていない');
  // A4 前回収集値
  out = out.replace(/[（〔]前回収集値は[^）〕]*[）〕]/g, '');
  out = out.replace(/前回収集値と今回の取得値(?:でも|で)/g, '取得した時点で');
  // A8 money signal
  const ms = out.match(/^記事記載の(.+?) reported money signalは第三者報告値で、利益・原価・手残りの独立確認は未実施$/);
  if (ms) out = `記事に書かれた${ms[1]}は第三者の報告で、利益・原価・手残りは確認されていない`;
  out = out.replace(/ ?reported money signal/g, '');
  // A7
  if (/^利益ラベル付き抽出値はRaw本文監査で対象事業への明示結合を確認できず、利益値として扱わない$/.test(out)) {
    out = '記事にある「利益」の数字は、この事業の利益だと本文から確かめられないため、利益としては扱っていない';
  }
  if (/^公開月間売上欄は利益ではなく、独立監査済みかどうかも(?:確認|確定)できない$/.test(out)) {
    out = '公開されている月間売上は利益ではなく、第三者の確認も受けていない';
  }
  let m = out.match(/^公式URL監査(?:は)?HTTP (\S+)$/);
  if (m) {
    if (m[1] === '200') out = path.startsWith('timelineEvents') ? '公式サイトが開けることを確認した' : OPENS_NOTE;
    else out = `公式サイトは取得時に${statusPhrase(m[1])}`;
  }
  m = out.match(/^公式URL監査: HTTP (\S+); title=([\s\S]*)$/);
  if (m) {
    const t = m[2].trim();
    const hasTitle = t && t !== 'タイトル未取得';
    if (m[1] === '200') out = hasTitle ? `公式サイトが開けることは確認した（タイトル: ${t}。売上や事業継続の証拠ではない）` : OPENS_NOTE;
    else out = `公式サイトは取得時に${statusPhrase(m[1])}${hasTitle ? `（表示されたタイトル: ${t}）` : ''}`;
  }
  if (path.endsWith('.categoryLabel') && out === '公式URL監査') out = '公式サイトの確認';
  if (out === '創業年月とは区別') out = '';
  // sourceDoc の名目値
  out = out.replace(/IH 収益欄は掲載時の名目値〔[^〕]*〕のため不採用/, 'IH 収益欄は裏付けが無いため、売上としては扱っていない');

  // A6 採否・R4 など内部の判定語
  out = out.replace(/の採否(?=[:：])/g, '');
  if (path.endsWith('.title')) out = out.replace(/(?:と採否|の採否|とR4判定)$/, '');
  if (/^丸い(?:同額|金額|値)の?1点/.test(out) && !MARKER.test(out)) out = '';
  if (MARKER.test(out)) {
    out = out
      .replace('最初の投稿から離れた日付の非丸め金額で、名目入力条件に当たらない', '最初の投稿から離れた日付に入力された、丸めていない金額')
      .replace(/入力の非丸め金額で、名目入力条件に当たらない/, '入力の、丸めていない金額')
      .replace('非丸め金額でありR4の名目入力条件には当たらない', '丸めていない金額')
      .replace(/の非丸め金額で名目入力条件に当たらない/, 'の丸めていない金額')
      .replace(/で、R4の同日±1日条件に当たらない/, '')
      .replace(/で名目値ルールの同日条件に該当しない/, '')
      .replace('R4の本人入力として採用', '本人の入力として扱う');
  }
  if (MARKER.test(out)) {
    let r: RegExpMatchArray | null;
    if (/^採否: 採用（過去の本人申告）$/.test(out) || /^採否: (?:別日に入力された収益欄|別の本人投稿が同額MRRを明記)$/.test(out)) out = POS;
    else if ((r = out.match(/^採否: (収益欄のUSDと本人投稿のEURを換算せず別記)$/))) out = r[1];
    else if (/^R4: /.test(out) && path.includes('reportedMetrics')) out = out.replace(/^R4: /, '');
    else if (out === '最初の表示投稿とは日付が離れておりR4の同日±1日除外には該当しない') out = '収益欄の入力日は、最初の表示投稿とは離れている';
    else if ((r = out.match(/^R4で収益ページを本人申告の財務値に採用しない理由: (.+)$/))) out = `この収益欄は売上としては扱っていない（${r[1]}）`;
    else if (out === '収益欄は別途R4で判定' || out === '採否はR4に基づき分離') out = '';
    else if (/採否条件/.test(out) && !/R4|不採用|採用しない/.test(out)) out = out.replace('採否条件', '根拠');
    else out = NEG;
  }
  // 採用・不採用の言い方（R4などの語を含まないもの）も、売上として扱わない旨の平易な文にする
  if (out !== NEG && out !== '') {
    let r: RegExpMatchArray | null;
    out = out.replace('（不採用の入力値）', '（売上として扱っていない入力値）');
    if (out === '採用する本人申告と区別') out = '';
    else if (out === '明示された本人投稿のEURを採用') out = '本人投稿に明示されたEUR額は、本人の申告として扱う';
    else if ((r = out.match(/^(?:IH)?収益欄を採用しない理由: (.+)$/))) out = (r[1].startsWith('収益欄のUSD') || r[1].startsWith('この収益欄は')) ? r[1] : `この収益欄は売上としては扱っていない（${r[1]}）`;
    else if ((r = out.match(/^採用保留: (.+)$/))) out = `この収益欄は売上としては扱っていない（${r[1]}）`;
    else if (/不採用|採用しない|実績採用|認定しない|採用保留/.test(out) && !/確認できな|見つから|未確認|採用条件/.test(out)
      && /収益|売上|金額|入力値|月\$|申告|実績|観測|裏付け|運営者|投稿|日付/.test(out)) out = NEG;
  }
  return out === core ? undefined : out;
}

const PREFIX_RE = /^(?:未確認[:：]\s*)?(?:(?:Indie Hackers|IH)[^:：。]{0,20}[:：]\s*)?/;

function fixString(path: string, s: string): string | typeof DELETE | null {
  // A1 調べた範囲
  if (s.startsWith('調べた範囲: ')) {
    let t = s.slice('調べた範囲: '.length);
    let date: string | null = null;
    t = t.replace(/。Web検索は未実施（[^）]*）/, '');
    t = t.replace(/、Web検索（(\d{4}-\d{2}-\d{2})）/, (_m, d: string) => { date = d; return ''; });
    if (date && !/\d{4}-\d{2}-\d{2}/.test(t)) t += `（${date} 確認）`;
    return `確認した出典: ${t}`;
  }
  // 行ごと消す
  if (/^Indie Hackers公開レコード: 公開報告値$/.test(s)) return DELETE;
  if (/^公開タグ:\s*(?:[a-z0-9-]+(?:,\s*)?)+。?$/.test(s) && /employees-|founders-|funding-/.test(s)) return DELETE;
  if (s.startsWith('チーム・稼働（記事記載）')) return DELETE;
  if (/^全項目監査・利用条件確認・通常保存・UI検証は未完了/.test(s)) return DELETE;
  if (/^(?:未確認[:：]\s*)?旧業種/.test(s)) return DELETE;

  const pre = s.replace(/の採否(?=[:：])/g, '').replace(/[（〔]前回収集値は[^）〕]*[）〕]/g, '').replace(/(?:IH)?収益欄を採用しない理由: (?=この収益欄は|収益欄のUSD)/, '');
  const prefix = (pre.match(PREFIX_RE) ?? [''])[0];
  const body = pre.slice(prefix.length);
  const parts = body.split(/(?<=。)/);
  let changed = pre !== s;
  const outParts: string[] = [];
  let prevOpens = false;
  for (const part of parts) {
    const end = part.endsWith('。') ? '。' : '';
    const core = end ? part.slice(0, -1) : part;
    if (prevOpens && core === '到達性は売上・利益・継続性の証拠ではない') { changed = true; prevOpens = false; continue; }
    prevOpens = false;
    const f = fixSentence(core, path);
    if (f === undefined) { outParts.push(part); continue; }
    changed = true;
    prevOpens = f === OPENS_NOTE;
    if (f !== '') outParts.push(f + end);
  }
  if (!changed) return null;
  // 同じ文が続いたら1つにする
  const dedup = outParts.filter((p, i) => i === 0 || p !== outParts[i - 1]);
  if (dedup.length === 0) return /\]$/.test(path) || /^observationsStream\[\d+\]\.text$/.test(path) ? DELETE : UNCONFIRMED;
  return prefix + dedup.join('');
}

// ---- 退避 ----
function bucketOf(e: AnyRecord): AnyRecord | null {
  const reaudit = rec(e.reaudit);
  if (Object.keys(reaudit).length === 0) return null;
  const snap = rec(reaudit.legacyDisplaySnapshot);
  const pn = rec(snap.priorNarrative);
  const bucket = rec(pn.readerCleanup);
  return Object.assign(bucket, { _pn: pn, _snap: snap, _reaudit: reaudit });
}
function stash(e: AnyRecord, path: string, before: unknown) {
  const b = bucketOf(e);
  if (!b) { bump('stash skipped (no reaudit)'); return; }
  const { _pn: pn, _snap: snap, _reaudit: reaudit } = b as AnyRecord as { _pn: AnyRecord; _snap: AnyRecord; _reaudit: AnyRecord };
  delete b._pn; delete b._snap; delete b._reaudit;
  if (!snap.status) Object.assign(snap, { status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: DATE, method: 'SCRIPTED_READER_FACING_CLEANUP_V1' });
  if (b.cleanedAt === undefined) b.cleanedAt = DATE;
  const list = Array.isArray(b.audit5) ? (b.audit5 as AnyRecord[]) : [];
  const key = canon(before);
  if (!list.some((x) => x.path === path && canon(x.before) === key)) list.push({ path, before });
  b.audit5 = list;
  pn.readerCleanup = b; snap.priorNarrative = pn; reaudit.legacyDisplaySnapshot = snap; e.reaudit = reaudit;
}

// ---- 個別レコード ----
type Rep = [RegExp | string, string];
const PER_ENTITY_REPLACE: Record<string, Rep[]> = {
  ent_ai2sql_37c18e: [
    ['、営業やマーケの現場担当', ''],
    ['運営法人の正式名称と所在地（利用規約はAI2sql、プライバシーポリシーはseriouscode GmbH）', '運営法人の正式名称（利用規約はCross Regions Technology、プライバシーポリシーはseriouscode GmbH）'],
  ],
  ent_finsweet_c96039: [['（SaaS、フィンテック、医療、教育など）', '（公式が挙げる業種: SaaS、フィンテック、医療、教育・EdTech、EC）']],
  ent_ebizfacts_neilshaplinxdigitalvideoagency100kmonth_dc1fe5206c89: [['、YouTube広告の競合が少なかった時期に開始', 'に開始']],
  ent_ebizfacts_chriscerraremotebase6figurecuratednewsletter_0c0310f30b6d: [
    ['（累計の売上・$100K超・記事記載）', '（売上$100K超。記事の記載で、期間は記事に無い）'],
    ['（累計の売上・$100K超）', '（売上$100K超。記事の記載で、期間は記事に無い）'],
    ['累計の売上・$100K超／記事記載／', '売上$100K超（記事の記載。期間は記事に無い）／'],
  ],
  ent_lordstownmotors_P7K3D9ZS: [['2022年5月に工場をFoxconnへ', '2022年5月にGM工場をFoxconnへ']],
  ent_robolly_1d7a8e: [['、最速の視覚コンテンツ拡大の手段と紹介し', 'サービスと紹介し']],
  ent_powershellprotools_bc6c5f353287: [
    [/Indie Hackersの公開レコードは月間売上をUS(?:\$4,000|〔金額未確認〕)と表示している（一次公開レポートに基づく報告値。）/g,
      'Indie Hackersの公開レコードは月間売上をUS$4,000と表示している（本人がIndie Hackersに載せた値・未検証）'],
  ],
};

function perEntityFields(e: AnyRecord) {
  const id = String(e.id);
  const set = (obj: AnyRecord, key: string, path: string, val: unknown) => {
    if (canon(obj[key]) === canon(val)) return;
    stash(e, path, obj[key]); obj[key] = val; bump(`set ${path}`);
  };
  if (e.country === 'GLOBAL') set(e, 'country', 'country', UNCONFIRMED);
  const tp = rec(e.temporal);
  const ops = rec(e.operations);
  const ess = rec(e.essence);
  const strat = rec(e.strategy);
  switch (id) {
    case 'ent_ebizfacts_stephsmithglassdoorlegislationtechchangesopp_ea89e2e438ce':
      set(e, 'founder', 'founder', UNCONFIRMED); break;
    case 'ent_chronologicalagecalculator_111da10a8a04':
    case 'ent_letterstonumbers_9740ae89f085':
      set(tp, 'foundedYear', 'temporal.foundedYear', 0); break;
    case 'ent_ai2sql_37c18e':
      set(e, 'country', 'country', 'US');
      set(e, 'legalEntity', 'legalEntity', 'Cross Regions Technology（公式の利用規約の表記。所在地は米国フロリダ州）。プライバシーポリシー(2020-08-21更新)はEEA居住者の権利対応の主体としてseriouscode GmbHを挙げる');
      set(ess, 'painRelief', 'essence.painRelief', UNCONFIRMED); break;
    case 'ent_ebizfacts_chriscerraremotebase6figurecuratednewsletter_0c0310f30b6d':
      set(strat, 'structuralFlaw', 'strategy.structuralFlaw', UNCONFIRMED); break;
    case 'ent_robolly_1d7a8e':
      set(e, 'country', 'country', UNCONFIRMED); break;
    case 'ent_carrotweather_5a3852':
      set(e, 'targetPainWallet', 'targetPainWallet', UNCONFIRMED);
      set(ess, 'targetCustomer', 'essence.targetCustomer', UNCONFIRMED); break;
    case 'ent_lordstownmotors_P7K3D9ZS': {
      const c0 = rec((e.evidenceCards as AnyRecord[])?.[0]);
      const d = Array.isArray(c0.details) ? (c0.details as string[]) : [];
      if (d.length >= 3 && d[0].startsWith('GM工場取得')) {
        stash(e, 'evidenceCards[0].details', [...d]);
        d[0] = '2022年の純売上は194,000ドル。2023年2月までに販売したのは計6台（10-K）。';
        d[1] = '2022年5月にGM工場をFoxconnへ約257百万ドルで売却し、製造をFoxconnへ委託する契約に移った（10-K）。';
        bump('lordstown details');
      }
      if (c0.badge === 'SUPPLY COLLAPSE') set(c0, 'badge', 'evidenceCards[0].badge', '閉鎖の経緯');
      break;
    }
    case 'ent_petscom_W3R7M1QK': {
      set(ops, 'teamSize', 'operations.teamSize', 0);
      set(ops, 'currentTeamSize', 'operations.currentTeamSize', 0);
      set(ops, 'isTeamSizeUnconfirmed', 'operations.isTeamSizeUnconfirmed', true);
      const c0 = rec((e.evidenceCards as AnyRecord[])?.[0]);
      const d = Array.isArray(c0.details) ? (c0.details as string[]) : [];
      if (d.length >= 3 && d[0].startsWith('第2回調達50百万ドル')) {
        stash(e, 'evidenceCards[0].details', [...d]);
        d.splice(0, 2,
          'IPOの受取金は約75.3百万ドル。使途はSEC提出書類の記載で、運転資金と一般事業（ブランド認知のための広告、在庫購入、販売組織の拡大、配送能力の整備、顧客基盤の拡大）。',
          '1999年6月に第2回調達として50百万ドルを調達した（Amazonの発表）。',
          '閉鎖直前は従業員320人のうち約255人を解雇し、2000年11月10日までにウェブサイトでの販売を停止した（SEC提出書類の記載）。');
        bump('petscom details');
      }
      if (c0.badge === 'ACQUISITION COST') set(c0, 'badge', 'evidenceCards[0].badge', '閉鎖の経緯');
      break;
    }
    default:
  }
  // ent_chronologicalagecalculator: 「同じハンドル…9万ドル前後」の文を消す（文単位）
  if (id === 'ent_chronologicalagecalculator_111da10a8a04') {
    e.__dropHandle = true;
  }
}

function applyReplacements(id: string, s: string): string {
  let out = s;
  for (const [from, to] of PER_ENTITY_REPLACE[id] ?? []) out = typeof from === 'string' ? out.split(from).join(to) : out.replace(from, to);
  return out;
}
const HANDLE_SENT = /同じハンドル @hetiantian が複数の製品[^。]*9万ドル前後[^。]*。?/;

function walk(e: AnyRecord, parent: unknown, key: string | number, path: string) {
  const id = String(e.id);
  const v = (parent as AnyRecord)[key as string];
  if (typeof v === 'string') {
    let cur: string = v;
    let res: string | typeof DELETE | null = fixString(path, cur);
    if (res !== null && res !== DELETE) cur = res;
    if (res !== DELETE) {
      const rep = applyReplacements(id, cur);
      if (rep !== cur) { cur = rep; res = cur; }
      if (e.__dropHandle && HANDLE_SENT.test(cur)) {
        const dropped = cur.replace(HANDLE_SENT, '').trim();
        const stripped = dropped.replace(PREFIX_RE, '').trim();
        res = stripped === '' ? DELETE : dropped; cur = dropped;
      }
    }
    if (res === null) return;
    stash(e, path, v);
    if (res === DELETE) { (parent as AnyRecord)[key as string] = DELETE; bump(`deleted ${path.replace(/\[\d+\]/g, '[]')}`); }
    else { (parent as AnyRecord)[key as string] = res; bump(`rewritten ${path.replace(/\[\d+\]/g, '[]')}`); }
    return;
  }
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) walk(e, v, i, `${path}[${i}]`);
    for (let i = v.length - 1; i >= 0; i--) {
      const it = v[i];
      if (it === DELETE || (it && typeof it === 'object' && (it as AnyRecord).text === DELETE)) v.splice(i, 1);
    }
    return;
  }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v as AnyRecord)) {
      if (k === 'id') continue;
      walk(e, v, k, path ? `${path}.${k}` : k);
    }
  }
}

function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  let changed = 0;
  for (const e of entities) {
    const before = canon(e);
    perEntityFields(e);
    for (const k of Object.keys(e)) {
      if (k === 'id' || k === 'reaudit' || k === 'meta' || k === 'sourceMetadata' || k === '__dropHandle') continue;
      walk(e, e, k, k);
    }
    delete e.__dropHandle;
    if (canon(e) !== before) { changed++; parseFinancialEntity(e); }
  }
  bump('records changed', changed);
  console.log(JSON.stringify({ total: entities.length, counts }, null, 1));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}
main();
