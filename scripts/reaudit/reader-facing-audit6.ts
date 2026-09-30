/**
 * 6回目の抜き取り監査の指摘を直す（2026-09-30）
 *
 * B. 画面に出る欄の型の修正（壊れた金額行・HTTP/取得の記録・権利表記・Web検索回数・到達可能・相対日付・空欄・作業用タグなど）
 * C. 人数が出典に無い（isTeamSizeUnconfirmed）のに付いた scale / screening.initialTeamPass を未判定にする
 * D. 個別レコードの誤りの修正（reader-facing-audit6-individual.ts の表を使う）
 *
 * 対象: entities-index.json の画面に出る欄（reaudit / meta / sourceMetadata / coverageAudit / claimBindings / id は対象外）。
 * 変えた元の値は reaudit.legacyDisplaySnapshot.priorNarrative.readerCleanup.audit6 へ {path, before} で退避する（既存の中身は消さない）。
 * 冪等: 2回目以降は何も変えない。書き込み前に変更した全件を parseFinancialEntity で検証する。
 *
 * 使い方: node --import tsx scripts/reaudit/reader-facing-audit6.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';
import { INDIVIDUAL_FIXES } from './reader-facing-audit6-individual';

type AnyRecord = Record<string, unknown>;
const rec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});
const canon = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val)
  ? Object.fromEntries(Object.entries(val as AnyRecord).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  : val));

const DATE = '2026-09-30';
const CHECKED = '2026-09-29';
const UNCONFIRMED = '未確認';
const dryRun = process.argv.includes('--dry-run');
const indexPath = resolve(process.cwd(), 'data/entities-index.json');
const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
const DELETE = Symbol('delete');
const SKIP_KEYS = new Set(['id', 'reaudit', 'meta', 'sourceMetadata', 'coverageAudit', 'claimBindings']);

// ---------------------------------------------------------------- 退避
function stash(e: AnyRecord, path: string, before: unknown) {
  const reaudit = rec(e.reaudit);
  if (Object.keys(reaudit).length === 0) { bump('stash skipped (no reaudit)'); return; }
  const snap = rec(reaudit.legacyDisplaySnapshot);
  const pn = rec(snap.priorNarrative);
  const bucket = rec(pn.readerCleanup);
  if (!snap.status) Object.assign(snap, { status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: DATE, method: 'SCRIPTED_READER_FACING_CLEANUP_V1' });
  if (bucket.cleanedAt === undefined) bucket.cleanedAt = DATE;
  const list = Array.isArray(bucket.audit6) ? (bucket.audit6 as AnyRecord[]) : [];
  const key = canon(before);
  if (!list.some((x) => x.path === path && canon(x.before) === key)) list.push({ path, before });
  bucket.audit6 = list;
  pn.readerCleanup = bucket; snap.priorNarrative = pn; reaudit.legacyDisplaySnapshot = snap; e.reaudit = reaudit;
}

// ---------------------------------------------------------------- 日付
function articleDate(e: AnyRecord): { y: number; m: number } | null {
  const strs: string[] = [];
  const collect = (v: unknown) => {
    if (typeof v === 'string') strs.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v as AnyRecord)) { if (!SKIP_KEYS.has(k)) collect(x); }
  };
  collect(e);
  for (const re of [/記事掲載(\d{4})-(\d{2})-(\d{2})/, /eBiz Facts (\d{4})-(\d{2})-(\d{2})掲載/, /掲載日: (\d{4})-(\d{2})-(\d{2})/]) {
    for (const s of strs) { const m = s.match(re); if (m) return { y: +m[1], m: +m[2] }; }
  }
  return null;
}

const NO_NI = /^[のはもがからまでにとを、,。・/／）)（(]/; // 直後がこれなら「に」を足さない
function relDates(text: string, d: { y: number; m: number } | null): string {
  if (!d) {
    return text.replace(/(昨年|去年|今年|先月|来年|今月)(?!（記事掲載時点)/g, '$1（記事掲載時点）');
  }
  const wrap = (rep: string, rest: string) => (NO_NI.test(rest) || /^\d{1,2}月/.test(rest) || rest === '' ? rep : `${rep}に`);
  let out = text;
  out = out.replace(/(昨年|去年)(\d{1,2})月/g, (_m, _w, mo: string) => `${d.y - 1}年${mo}月`);
  out = out.replace(/(今年)(\d{1,2})月/g, (_m, _w, mo: string) => `${d.y}年${mo}月`);
  out = out.replace(/(昨年|去年)(?=の[夏春秋冬])/g, `${d.y - 1}年`);
  out = out.replace(/(昨年|去年)(?!（記事掲載時点)/g, (_m, _w, off: number, whole: string) => wrap(`${d.y - 1}年`, whole.slice(off + 2)));
  out = out.replace(/今年(?!（記事掲載時点)/g, (_m, off: number, whole: string) => wrap(`${d.y}年`, whole.slice(off + 2)));
  out = out.replace(/来年(?!（記事掲載時点)/g, (_m, off: number, whole: string) => wrap(`${d.y + 1}年`, whole.slice(off + 2)));
  const pm = d.m === 1 ? { y: d.y - 1, m: 12 } : { y: d.y, m: d.m - 1 };
  out = out.replace(/先月(?!（記事掲載時点)/g, (_m, off: number, whole: string) => wrap(`${pm.y}年${pm.m}月`, whole.slice(off + 2)));
  out = out.replace(/今月(?!（記事掲載時点)/g, (_m, off: number, whole: string) => wrap(`${d.y}年${d.m}月`, whole.slice(off + 2)));
  return out;
}

// ---------------------------------------------------------------- HTTP・取得の記録
function statusPhrase(code: string): string {
  const n = Number(code);
  if (n >= 200 && n < 300) return '正常応答';
  if (n >= 300 && n < 400) return '転送';
  if (n === 404 || n === 410) return 'ページなし';
  if (n === 401 || n === 403 || n === 429 || n === 451) return 'アクセス拒否';
  if (n >= 500) return 'サーバーエラー';
  return '接続失敗';
}
const OPEN_FAILED = '公式サイトは確認時に開けなかった';

interface Ctx { id: string; isEbiz: boolean; art: { y: number; m: number } | null; observedAt: string | null }

const DELETE_ELEMENT: RegExp[] = [
  /^外部リンクは公式サイトであることを未確認[:：]/,
  /^公式ページ本文に価格・課金・収益関連のシグナルを観測（\d+抜粋）。財務証明ではない。?$/,
  /^業態別プレイブックは検証手順として生成。実際の原価・利益・継続率は未確認（\d{4}-\d{2}-\d{2}）。?$/,
  /^公式サイトの到達性・掲載内容は確認したが、財務数値の一次確認は未実施。?$/,
  /^公式ページの価格・収益関連語句は観測したが、独立財務確認ではない。?$/,
  /^取得結果: (?:取得成功|Web取得成功|公開ページ取得成功|HTTP ?200(?:で取得成功)?)(?:[（(][^）)]*[）)])?\s*(?:\/ 公開ページ取得成功)?$/,
  /^取得結果: \d{4}-\d{2}-\d{2}\s+(?:取得成功|Web取得成功|Web取得で公開表示を確認)$/,
  /^取得結果: HTTP ?\d{3}\s*\/ 公開ページ取得成功$/,
  /^取得結果: HTTP ?200（\d{4}-\d{2}-\d{2}(?:取得|、公開ページの取得)）$/,
];

/** 1つの文字列を直す。変えないなら null、消すなら DELETE。 */
function fixString(path: string, s: string, ctx: Ctx): string | typeof DELETE | null {
  const stripped = s.replace(/^未確認[:：]\s*/, '');
  if (DELETE_ELEMENT.some((re) => re.test(stripped))) return DELETE;
  if (s.includes('〔金額未確認〕')) return DELETE;

  let out = s;

  // 独立確認の重複文
  out = out.replace(/^独立確認と原価・利益・手残りは未確認も未確認。記事の金額は出所を付けて別掲。?$/, '第三者の確認は無く、原価・利益・手残りも未確認。記事の金額は出所を付けて別に載せている。');
  // 月次換算の断り
  out = out.replace(/独立確認なし。月次への換算・推計はしていない。?/g, '独立確認なし。');
  out = out.replace(/。?月次への換算・推計はしていない。?/g, (m) => (m.startsWith('。') ? '。' : ''));

  // 権利
  out = out.replace(/ ?\/ 権利: 事実のみ表示（[^）]*）/g, '');

  // Web検索の回数
  out = out.replace(/本人発言のWeb検索\d+回。?/g, '').replace(/Web検索\d+回。?/g, '').replace(/検索\d+回で/g, '').replace(/\d+回の検索で/g, '');
  if (out !== s && /^未確認[:：]\s*$/.test(out.trim())) return DELETE;
  if (out !== s && out.trim() === '') return DELETE;

  // 公式URLの現行ページ
  let m = out.match(/^公式URLの現行ページを取得: HTTP (\d{3})(?: \/ ([\s\S]*))?$/);
  if (m) {
    const date = ctx.observedAt ?? CHECKED;
    const title = (m[2] ?? '').trim();
    if (Number(m[1]) >= 200 && Number(m[1]) < 300) out = title ? `公式サイト（${date}確認）: ${title}` : (DELETE as unknown as string);
    else out = OPEN_FAILED;
    if ((out as unknown) === DELETE) return DELETE;
  }
  m = out.match(/^公式URL HTTP (\d{3}); ([\s\S]*)$/);
  if (m) {
    const date = ctx.observedAt ?? CHECKED;
    out = Number(m[1]) >= 200 && Number(m[1]) < 300 ? `公式サイト（${date}確認）: ${m[2].trim()}` : OPEN_FAILED;
  }
  if (/^公式URLの現行内容を確認できなかった: (?:HTTP \d{3}|取得失敗.*)$/.test(out)) out = OPEN_FAILED;
  out = out.replace(/^公式サイトの現行内容は取得できなかった（(?:HTTP \d{3}|取得失敗[^）]*)）。/, `${OPEN_FAILED}。`);

  // 取得結果の行（失敗・限定つきの成功は事実だけ残す）
  m = out.match(/^取得結果: ([\s\S]*)$/);
  if (m) {
    const body = m[1].trim();
    let mm: RegExpMatchArray | null;
    if ((mm = body.match(/^取得成功(?:だが(題名と説明文のみ|題名のみ))?[（(]([^）)]*)[）)]$/))) {
      const rest = mm[2].replace(/^\d{4}-\d{2}-\d{2}[。、]?\s*/, '').replace(/トップ(?:と料金の表示)?を\d+回(?:、料金ページを\d+回)?取得(?:しても本文が得られず)?/, '').replace(/^(?:公開ページ(?:の本文|のみ確認)?|公開ページの取得)$/, '').trim();
      const parts: string[] = [];
      if (mm[1]) parts.push(`公式サイトは${mm[1]}を確認できた`);
      if (/^(.+ページ)も取得$/.test(rest)) parts.push(`${rest.replace(/も取得$/, '')}も確認した`);
      else if (/^料金ページは金額を取得できず$/.test(rest)) parts.push('料金ページから金額は読み取れなかった');
      else if (/^ブラウザで動く画面で本文を取得できず$/.test(rest)) parts.push('本文はブラウザで動く画面のため読み取れなかった');
      else if (/^JavaScript 描画のため、スクリプト内の画面文言で確認$/.test(rest)) parts.push('公式サイトはJavaScript描画のため、スクリプト内の画面文言で確認した');
      else if (rest) parts.push(rest);
      out = parts.length ? parts.join('。') : (DELETE as unknown as string);
    } else if ((mm = body.match(/^取得成功[(（](題名のみ。画面は JavaScript 描画で本文は未取得|題名のみ。本文は JavaScript 描画で未取得)[）)]$/))) {
      out = '公式サイトは題名のみ確認できた（本文はJavaScript描画のため未取得）';
    } else if (/^取得成功$/.test(body)) out = DELETE as unknown as string;
    else if ((mm = body.match(/^\d{4}-\d{2}-\d{2}\s+\d{4}-\d{2}-\d{2}\s+公式ページの本文を確認$/))) out = DELETE as unknown as string;
    else if ((mm = body.match(/^(?:取得失敗|到達不能)[（(](?:\d{4}-\d{2}-\d{2}[。、 /]*)?(.*?)[）)](.*)$/))) {
      out = `${OPEN_FAILED}${mm[1] && mm[1] !== '開けなかった' ? '（' + mm[1] + '）' : ''}${mm[2] ? '。' + mm[2].replace(/^。/, '') : ''}`;
    } else if (/^公式サイトは\d{4}-\d{2}-\d{2}にDNS解決不能/.test(body)) out = `${OPEN_FAILED}（名前解決に失敗した）。`;
    else if ((mm = body.match(/^\d{4}-\d{2}-\d{2}\s+HTTP ?(\d{3})（正直なUAによる直接取得）$/))) out = Number(mm[1]) < 300 ? (DELETE as unknown as string) : OPEN_FAILED;
    else if ((mm = body.match(/^HTTP ?(\d{3})[（(]?/))) out = Number(mm[1]) >= 200 && Number(mm[1]) < 300 ? (DELETE as unknown as string) : OPEN_FAILED;
    if ((out as unknown) === DELETE) return DELETE;
  }

  // 取得結果の行で残ったもの（事実は残し、記録の言い回しだけ直す）
  out = out.replace(/^取得結果: /, '');
  out = out
    .replace(/(?:は|を)取得成功/g, 'は開けた').replace(/取得成功/g, '開けた')
    .replace(/一部取得（/g, '一部だけ開けた（')
    .replace(/（取得失敗: [^）]*）/g, '').replace(/公式サイトは取得失敗/g, '公式サイトは開けなかった')
    .replace(/取得失敗（(\d{4}-\d{2}-\d{2})）/g, '開けなかった（$1）')
    .replace(/通常GETのCDX照会で/g, 'Internet Archiveの保存一覧で')
    .replace(/月ごとの数値は取得結果に不整合があり/g, '月ごとの数値は表示に不整合があり').replace(/（取得結果に不整合があり未確認）/g, '（表示に不整合があり未確認）')
    .replace(/公開ページと各社\d+〜\d+回の検索に範囲を限った調査/g, '公開ページの範囲での確認')
    .replace(/([^\s、。（(]+) は HTTP ?(3\d\d) で /g, '$1 は ');
  // 文中のHTTP
  out = out
    .replace(/Cloudflareの確認画面\s*[(（]HTTP ?\d{3}[)）]/g, 'Cloudflareの確認画面')
    .replace(/Cloudflareの確認画面でHTTP ?\d{3}/g, 'Cloudflareの確認画面')
    .replace(/ボット確認\s*[(（]HTTP ?\d{3}[)）]/g, 'ボット確認')
    .replace(/ボット確認の画面\s*[(（]HTTP ?\d{3}[)）]/g, 'ボット確認の画面')
    .replace(/[（(]応答\d{3}[)）]/g, '')
    .replace(/DNS解決不能（HTTP ?\d{3}）/g, 'DNS解決不能')
    .replace(/（(?:\d{4}-\d{2}-\d{2} )?HTTP ?\d{3}[^）]*）/g, (mm) => {
      const code = mm.match(/HTTP ?(\d{3})/)![1];
      const dt = mm.match(/\d{4}-\d{2}-\d{2}/);
      return `（${dt ? dt[0] + ' ' : ''}${statusPhrase(code)}）`;
    })
    .replace(/HTTP ?(\d{3})/g, (_mm, code: string) => statusPhrase(code))
    .replace(/(は|が|も|、) (正常応答|転送|ページなし|アクセス拒否|サーバーエラー|接続失敗)/g, '$1$2')
    .replace(/(正常応答|ページなし|アクセス拒否|サーバーエラー|接続失敗) (で|を|と|となり)/g, '$1$2')
    .replace(/通常GET/g, '通常のアクセス').replace(/Web取得/g, '取得ツール')
    .replace(/公式URLの取得結果は(?:別のURLへ転送されたで|転送で)/g, '公式URLは別のURLへ転送され、')
    .replace(/取得結果から確認できなかった/g, '取得した範囲では確認できなかった').replace(/取得結果から確認できな/g, '取得した範囲では確認できな')
    .replace(/取得結果が/g, '取得した値が').replace(/記事の取得結果による/g, '記事の記載による').replace(/取得結果か/g, '取得した範囲か')
    .replace(/公式ページは取得結果を/g, '公式ページは抽出結果を')
    .replace(/^出典: 収益ページの取得結果$/, '出典: 収益ページ')
    .replace(/(?:この)?(公式ページ)?の取得結果に記載/g, (_m0, pg: string | undefined) => (pg ? 'この公式ページに記載' : 'に記載'))
    .replace(/公式の取得結果に記載/g, '公式ページに記載').replace(/別ページの取得結果/g, '別ページの記載')
    .replace(/取得結果の表記/g, '表記').replace(/取得結果に現れ/g, '表示に現れ')
    .replace(/取得結果/g, '取得内容').replace(/取得失敗/g, '取得できなかった');
  // 取得記録の言い回し
  out = out
    .replace(/個別の氏名の表示は取得結果により異なる/g, '入力者名の表示は場合により異なる')
    .replace(/^出典: アーカイブ索引の取得結果$/, '出典: アーカイブの保存一覧')
    .replace(/^出典: 収益ページ取得結果$/, '出典: 収益ページ');

  // 到達可能
  m = out.match(/^(.+?)[はが](\d{4}-\d{2}-\d{2})に到達可能。?$/);
  if (m && /^(?:公式サイト|公式)/.test(m[1])) out = `${m[2]}時点で公式サイトは公開中。事業の継続や収益は未確認。`;
  out = out.replace(/(\d{4}-\d{2}-\d{2})に到達可能で、/g, '$1時点で公開されており、')
    .replace(/(\d{4}-\d{2}-\d{2})(?:時点で|に)到達可能で、/g, '$1時点で公開されており、')
    .replace(/(\d{4}-\d{2}-\d{2})(?:時点で|に)到達可能/g, '$1時点で公開されている')
    .replace(/公開されているだが/g, '公開されているが').replace(/公開されているで、/g, '公開されており、')
    .replace(/到達可能で、/g, '公開されており、').replace(/到達可能だが/g, '公開されているが').replace(/到達可能/g, '公開されている');

  // 相対日付（eBizの記事から作った欄だけ）
  if (ctx.isEbiz) out = relDates(out, ctx.art);

  return out === s ? null : out;
}

// ---------------------------------------------------------------- 走査
const EMPTY_PRUNE_KEYS = new Set(['observations', 'unknownsNotes', 'observationsStream', 'details']);

function walkValue(e: AnyRecord, ctx: Ctx, parent: AnyRecord | unknown[], key: string | number, path: string) {
  const v = (parent as AnyRecord)[key as string];
  if (typeof v === 'string') {
    const res = fixString(path, v, ctx);
    if (res === null) return;
    stash(e, path, v);
    if (res === DELETE && !Array.isArray(parent)) { (parent as AnyRecord)[key as string] = UNCONFIRMED; bump(`scalar to 未確認 ${path.replace(/\[\d+\]/g, '[]')}`); }
    else if (res === DELETE) { (parent as AnyRecord)[key as string] = DELETE; bump(`deleted ${path.replace(/\[\d+\]/g, '[]')}`); }
    else { (parent as AnyRecord)[key as string] = res; bump(`rewritten ${path.replace(/\[\d+\]/g, '[]')}`); }
    return;
  }
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const it = v[i];
      if (it && typeof it === 'object' && !Array.isArray(it) && typeof (it as AnyRecord).text === 'string' && /observationsStream/.test(path)) {
        const c2 = { ...ctx, observedAt: typeof (it as AnyRecord).observedAt === 'string' ? ((it as AnyRecord).observedAt as string) : null };
        const res = fixString(`${path}[${i}].text`, (it as AnyRecord).text as string, c2);
        if (res !== null) {
          stash(e, `${path}[${i}].text`, (it as AnyRecord).text);
          if (res === DELETE) { v[i] = DELETE; bump('deleted observationsStream[].text'); } else { (it as AnyRecord).text = res; bump('rewritten observationsStream[].text'); }
        }
        for (const k2 of Object.keys(it as AnyRecord)) {
          if (k2 === 'text' || SKIP_KEYS.has(k2)) continue;
          walkValue(e, c2, it as AnyRecord, k2, `${path}[${i}].${k2}`);
        }
        continue;
      }
      walkValue(e, ctx, v, i, `${path}[${i}]`);
    }
    for (let i = v.length - 1; i >= 0; i--) {
      const it = v[i];
      const emptyStr = typeof it === 'string' && it.trim() === '' && EMPTY_PRUNE_KEYS.has(String(key));
      const emptyObs = it && typeof it === 'object' && !Array.isArray(it) && (it as AnyRecord).text === '' && String(key) === 'observationsStream';
      if (it === DELETE || emptyStr || emptyObs) {
        if (emptyStr || emptyObs) { stash(e, `${path}[${i}]`, it); bump(`deleted empty ${path.replace(/\[\d+\]/g, '[]')}`); }
        v.splice(i, 1);
      }
    }
    return;
  }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v as AnyRecord)) {
      if (SKIP_KEYS.has(k)) continue;
      walkValue(e, ctx, v as AnyRecord, k, path ? `${path}.${k}` : k);
    }
  }
}

// ---------------------------------------------------------------- 構造の修正
const OFFICIAL_ONLY = '公式サイトのURLのみ記録。製品・価格・会社概要は未確認。';
const BARE_DETAIL = /^(?:URL[:：].*|ホスト[:：].*|確認日[:：].*|)$/;
const TAGS_DROP = new Set(['収集事例', '財務未確認', '公式サイト確認済み']);
const PLATFORMS = /^(?:YouTube|Spotify|Instagram|TikTok|Facebook|X|Twitter|Reddit|LinkedIn|Pinterest|Apple Podcasts)$/i;

function structural(e: AnyRecord) {
  const id = String(e.id);
  // 9 tags
  if (Array.isArray(e.tags)) {
    const kept = (e.tags as unknown[]).filter((t) => !(typeof t === 'string' && TAGS_DROP.has(t)));
    if (kept.length !== (e.tags as unknown[]).length) { stash(e, 'tags', [...(e.tags as unknown[])]); bump('tags removed', (e.tags as unknown[]).length - kept.length); e.tags = kept; }
  }
  // 10 公式サイトのURLのみのカード
  if (Array.isArray(e.evidenceCards)) {
    const cards = e.evidenceCards as AnyRecord[];
    const kept: AnyRecord[] = [];
    for (const c of cards) {
      if (c.punchline === OFFICIAL_ONLY) {
        const details = Array.isArray(c.details) ? (c.details as string[]) : [];
        if (details.every((d) => typeof d === 'string' && BARE_DETAIL.test(d.trim()))) {
          stash(e, `evidenceCards[${c.id}]`, c); bump('official-only card removed'); continue;
        }
        stash(e, `evidenceCards[${c.id}].punchline`, c.punchline); c.punchline = '公式サイト'; bump('official-only card retitled');
      }
      kept.push(c);
    }
    if (kept.length !== cards.length) e.evidenceCards = kept;
  }
  // 14 eBiz の toolStack から配信先・SNSを外す
  if (id.startsWith('ent_ebizfacts')) {
    const ops = rec(e.operations);
    if (Array.isArray(ops.toolStack)) {
      const ts = ops.toolStack as AnyRecord[];
      const removed = ts.filter((t) => PLATFORMS.test(String(rec(t).name ?? '').trim()));
      if (removed.length) {
        stash(e, 'operations.toolStack', JSON.parse(JSON.stringify(ts)));
        ops.toolStack = ts.filter((t) => !PLATFORMS.test(String(rec(t).name ?? '').trim()));
        e.operations = ops;
        const names = [...new Set(removed.map((t) => String(rec(t).name).trim()))];
        const obs = Array.isArray(e.observations) ? (e.observations as string[]) : [];
        const line = `記事は${names.join('、')}での配信・発信に言及（使用ツールとしては数えていない）`;
        if (!obs.includes(line)) { obs.push(line); e.observations = obs; }
        bump('toolStack platforms removed', removed.length);
      }
    }
  }
  // D 全体: essence.painRelief が料金文、または whatItDoes の複写なら未確認にする
  {
    const es = rec(e.essence);
    const pr = typeof es.painRelief === 'string' ? es.painRelief : '';
    const wi = typeof es.whatItDoes === 'string' ? es.whatItDoes : '';
    const pricing = /(月\d[\d,]*ドル|\d+ドル|\$\d|料金ページ|買い切り|年払い|プランが|円\/月|月額)/.test(pr);
    if (pr && pr !== '未確認' && (pricing || (wi && (pr === wi || wi.includes(pr))))) {
      stash(e, 'essence.painRelief', pr); es.painRelief = '未確認'; e.essence = es; bump('painRelief pricing/duplicate -> 未確認');
    }
  }
  // C 人数が出典に無いのに付いた規模・判定
  const ops = rec(e.operations);
  const teamUnknown = ops.isTeamSizeUnconfirmed === true;
  if (teamUnknown && e.scale !== 'UNKNOWN') { stash(e, 'scale', e.scale); bump(`scale ${String(e.scale)} -> UNKNOWN`); e.scale = 'UNKNOWN'; }
  const scr = rec(e.screening);
  if (teamUnknown && scr.initialTeamPass === true) {
    stash(e, 'screening.initialTeamPass', true); scr.initialTeamPass = null; e.screening = scr; bump('initialTeamPass true -> null');
  }
}

// ---------------------------------------------------------------- main
function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  let changed = 0;
  const ids = new Set(entities.map((x) => String(x.id)));
  for (const k of Object.keys(INDIVIDUAL_FIXES)) if (!ids.has(k)) throw new Error(`individual fix for unknown id ${k}`);
  for (const e of entities) {
    const before = canon(e);
    const id = String(e.id);
    const ctx: Ctx = { id, isEbiz: id.startsWith('ent_ebizfacts'), art: null, observedAt: null };
    ctx.art = ctx.isEbiz ? articleDate(e) : null;
    const indiv = INDIVIDUAL_FIXES[id];
    if (indiv) indiv(e, { stash, bump, canon, rec });
    for (const k of Object.keys(e)) {
      if (SKIP_KEYS.has(k)) continue;
      walkValue(e, ctx, e, k, k);
    }
    structural(e);
    if (canon(e) !== before) { changed++; parseFinancialEntity(e); }
  }
  bump('records changed', changed);
  console.log(JSON.stringify({ total: entities.length, counts }, null, 1));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}
main();
