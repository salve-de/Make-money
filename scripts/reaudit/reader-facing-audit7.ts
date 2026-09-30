/**
 * 7回目の抜き取り監査の指摘を直す（データ側・2026-09-30）
 *
 * A1 eBiz の金額の出所表記（本人の数字として紹介／第三者の報告）をそろえ、英語の断片を日本語にする
 * A2 出典に書かれていない「確認できない／切り出せない」を出典付きの観察文にしたものを外し、unknownsNotes へ出典なしで移す
 * A3 中身の無い決まり文句を「未確認」にする／行を消す
 * A4 作業の記録（Web検索・追加取得せず・転載せず 等）を消す
 * A5 essence.targetCustomer / targetPainWallet は、出典が明示している時だけ残す
 * A6 eBiz の掲載日・更新日の区別（sourceMetadata.publishedAt / modifiedAt を 2026-09-30 に記事ページの meta で確認）
 * A7 公式ドメインが売り物・駐車ページの件
 * A8 人数を現在値として出しているもの
 * B  個別の修正（2026-09-30 に WebFetch / curl で確認した出典）
 *
 * 変えた元の値は reaudit.legacyDisplaySnapshot.priorNarrative.readerCleanup.audit7 へ {path, before} で退避する（既存の中身は消さない）。
 * 冪等: 2回目以降は何も変えない。書き込み前に変更した全件を parseFinancialEntity で検証する。
 *
 * 使い方: node --import tsx scripts/reaudit/reader-facing-audit7.ts [--dry-run]
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
  const list = Array.isArray(bucket.audit7) ? (bucket.audit7 as AnyRecord[]) : [];
  const key = canon(before);
  if (!list.some((x) => x.path === path && canon(x.before) === key)) list.push({ path, before });
  bucket.audit7 = list;
  pn.readerCleanup = bucket; snap.priorNarrative = pn; reaudit.legacyDisplaySnapshot = snap; e.reaudit = reaudit;
}

interface Ctx { id: string; isEbiz: boolean; third: boolean }

// ---------------------------------------------------------------- A1 金額の出所
const UNIT_JA: Record<string, string> = {
  'monthly revenue': '月次売上',
  'annual revenue': '年間売上',
  'total or best period': '累計または最高期の売上',
  'monthly profit': '月次利益',
  'annual profit': '年間利益',
};
const SELF_TAIL = '（本人の数字として記事が紹介。第三者の確認は無い）。利益・原価・手残りは確認されていない。';
const AMOUNT = /^([€$£¥]?[\d,.]+(?:\s?[KkMm](?![a-z]))?)\s*(.*)$/;

function fixEbizAmount(s: string, ctx: Ctx): string | null {
  let m = s.match(/^記事記載の(.+?)は第三者報告値で、利益・原価・手残りの独立確認は未実施。?$/);
  if (m) {
    const am = m[1].match(AMOUNT);
    const amt = am ? am[1] : m[1];
    const unitEn = am ? am[2].trim() : '';
    const unit = unitEn ? UNIT_JA[unitEn] ?? '' : '';
    if (unitEn && !unit) bump('A1 unknown unit (left as is)');
    if (unitEn && !unit) return null;
    return ctx.third
      ? `記事に書かれた${unit}${amt}は第三者の報告で、利益・原価・手残りは確認されていない。`
      : `記事に書かれた${unit}${amt}${SELF_TAIL}`;
  }
  m = s.match(/^記事に書かれた(.+?)は第三者の報告で、利益・原価・手残りは確認されていない。?$/);
  if (m && !ctx.third) return `記事に書かれた${m[1]}${SELF_TAIL}`;
  return null;
}

// ---------------------------------------------------------------- 文字列の共通規則（A3・A4・個別の言い換え）
const CARD_UNCONF = /^未確認[:：]\s*/;
/** 「〇〇は未確認」型の未確認項目を作る。元が「未確認: 」始まりなら同じ形で返す。 */
function unconf(np: string, prefixed: boolean): string { return prefixed ? `未確認: ${np}` : `${np}は未確認`; }

const DELETE_LINES: RegExp[] = [
  /^事業内容の詳細は未確認です（確認できたのは公式ページと掲載元のみ）。?$/,
  /^提供機能は上記の出典に記載。利用者への効果は未確認。?$/,
  /^製品の説明として記録。導入効果は未検証。?$/,
];

const BACKPACK_PRICE = '料金は公式の料金ページに掲載（Free €0、Silver €89、Gold €199、Diamond €999〜。いずれも税別、1プロジェクトあたり、年更新）';

function fixString(path: string, s: string, ctx: Ctx): string | typeof DELETE | null {
  if (DELETE_LINES.some((re) => re.test(s.trim()))) return DELETE;
  let out = s;

  // A1
  if (ctx.isEbiz) {
    const a1 = fixEbizAmount(out, ctx);
    if (a1 !== null) out = a1;
    if (!ctx.third) {
      if (out === '第三者プロフィールの報告値であり、本人の決済口座・財務諸表による独立確認は未実施。') out = 'eBiz Factsの記事が紹介する本人の数字であり、本人の決済口座・財務諸表による独立確認は未実施。';
      if (out === 'eBiz Factsの第三者プロフィールを根拠にした候補。利益・自立性は一次確認前。') out = 'eBiz Factsの記事（本人の数字の紹介）を根拠にした候補。利益・自立性は一次確認前。';
    } else {
      if (out === '第三者プロフィールの報告値であり、本人の決済口座・財務諸表による独立確認は未実施。') out = 'eBiz Factsの記事が紹介する数字であり、決済口座・財務諸表による独立確認は未実施。';
      if (out === 'eBiz Factsの第三者プロフィールを根拠にした候補。利益・自立性は一次確認前。') out = 'eBiz Factsの記事を根拠にした候補。利益・自立性は一次確認前。';
    }
  }

  // A4 作業の記録
  const prefixed = CARD_UNCONF.test(out);
  const body = out.replace(CARD_UNCONF, '');
  let mm: RegExpMatchArray | null;
  if (/^創業者本人の日付つきの売上発言（Web検索では見つからなかった）$/.test(body)) out = unconf('創業者本人の日付つきの売上発言', prefixed);
  else if (/^Web検索では日付・対象期間・本人性を満たす財務発言の確認に至っていない$/.test(body)) out = unconf('日付・対象期間・本人性を満たす財務発言', prefixed);
  else if (/^今回のWeb検索では、採用条件を満たす日付・期間つきの創業者本人の収益発言を確認できなかった。?$/.test(body)) out = unconf('採用条件を満たす日付・期間つきの創業者本人の収益発言', prefixed);
  else if (/^本人の売上発言をWeb検索したが、採用条件を満たす日付・対象期間・事業同一性を確認できる追加の申告は見つからなかった$/.test(body)) out = unconf('採用条件を満たす日付・対象期間・事業同一性を確認できる本人の追加の申告', prefixed);
  else if ((mm = body.match(/^(.+?の根拠)。掲載から1年未満のため収益ページを追加取得せず、[^。]*$/))) out = unconf(mm[1], prefixed);
  else if (/^本候補は原本・画像・長い引用を転載せず事実のみ。/.test(body)) out = (prefixed ? '未確認: ' : '') + body.replace(/^本候補は原本・画像・長い引用を転載せず事実のみ。/, '');
  out = out
    .replace(/Web検索は各社\d+〜\d+回。検索結果だけの/, '')
    .replace(/本人発言のWeb検索を\d+回実施。/, '')
    .replace(/^(未確認[:：]\s*)?Web検索（[^）]*）:\s*/, '$1')
    .replace(/（Web検索を実施。本人申告の売上に当たる発言は見つからず）/, '（本人申告の売上に当たる発言は未確認）')
    .replace(/収益ページ・Web検索とも未実施/, '収益ページも未確認')
    .replace(/Web検索で(.+?)は見つかったが/, '$1はあるが')
    .replace(/開けただが/g, '開けたが');
  out = out.replace(/。\s*掲載から1年未満のため採用しない(。?)$/, '$1');
  out = out.replace(/P&L項目の数値は0のまま未確認。?/g, '').replace(/\s+$/, '');
  out = out.replace(/(金額|数値)は未記録/g, '$1は未確認').replace(/（本候補は機能の観測のみで指南なし）/g, '');

  // B 個別の言い換え
  out = individualString(ctx.id, out);

  return out === s ? null : out;
}

function individualString(id: string, s: string): string {
  let out = s;
  if (id === 'ent_nexabloom_c83f1fa64896') {
    out = out.replace(/公式サイトは正常応答で応答するが本文は取得できず、検索取得でコンプライアンス自動化の題名のみ確認。/g, '公式ドメイン nexabloom.xyz は売り物・駐車ページになっている（2026-09確認）。GoDaddy の売却ページへ転送され、事業の内容は確認できなかった。');
  }
  if (id === 'ent_chiefsformen_8df98589381f') {
    out = out
      .replace('公式ドメインは正常応答を返したが、内容は JavaScript による移動と駐車ページ用の画面だけで、店の内容を確認できなかった。', '公式ドメインは売り物・駐車ページになっている（2026-09確認）。GoDaddy の駐車ページ用の画面だけで、店の内容を確認できなかった。')
      .replace('取得は成功（2026-09-29。正常応答）したが、内容は駐車ページ用の画面で、店の内容を確認できなかった', '公式ドメインは売り物・駐車ページになっている（2026-09確認）。内容は駐車ページ用の画面で、店の内容を確認できなかった')
      .replace('（休眠中の店だがメールリストと顧客基盤があった）', '（閉店していたが反応のあるメールリストが残っていた）')
      .replace('（8回の月払い。休眠中だがメールリストと顧客基盤あり）', '（8回の月払い。閉店していたが反応のあるメールリストが残っていた）')
      .replace('休眠中の店をメールリストと顧客基盤ごと購入した', '閉店していたが反応のあるメールリストが残っていた店を購入した');
  }
  if (id.startsWith('ent_ebizfacts_yifangohour') || false) {
    out = out.replace(/^公式サイト（\d{4}-\d{2}-\d{2}確認）: Parked Domain name on Hostinger DNS system$/, '公式ドメインは売り物・駐車ページになっている（2026-09確認）。題名は「Parked Domain name on Hostinger DNS system」。');
  }
  if (id === 'ent_usrflw_5a583bfd') {
    out = out.replace(/^公式サイトは稼働中。収益性・再現性は未確認$/, '公式ドメインは応答するが本文は未取得（userflow.com は www.userflow.com へ308転送、www は403）。収益性・再現性は未確認');
  }
  if (id === 'ent_hyls_86b4077ecf65') {
    out = out
      .replace(/最初の月の売上は\$678/g, '最初の月に経費差引後で$678の利益')
      .replace('最初の利用者はSNSで友人や知人に告知して獲得し、初期の応募者の5割が有料に転換したと説明', '最初の利用者はSNSで友人や知人に告知して獲得し、申込者の約5割が参加を始めたと説明（初回の配信には100人が参加し、多くは友人・知人）');
  }
  if (id === 'ent_murfai_5e11a1') {
    out = out
      .replace('すべての声は実在の人が共有に同意した声に基づくと説明', '声はプロの声優の許可と提携のもとで作られ、使われるたびに声優へ報酬が入ると説明')
      .replace('声はすべて、本人が同意して提供した実在の声に基づくと公式は説明している。', '声はプロの声優の許可と提携のもとで作られ、使われるたびに声優へ報酬が入ると公式は説明している。')
      .replace('料金は取得したページの本文に表示がなかった。', '料金は、公式トップが音声生成API（Falcon 2）を「1分あたり1セント」（$0.01/min）と表示している。')
      .replace('開発者、制作者、企業のローカライズ担当。', '開発者、制作者、企業。');
  }
  if (id === 'ent_backpackforlaravel_ca9a3dbe30bc') {
    out = out
      .replace('公式トップに価格の記載なし', BACKPACK_PRICE)
      .replace('価格・運営会社の記載はない。', `運営会社の記載はない。${BACKPACK_PRICE}。`)
      .replace('価格はトップに非掲載', BACKPACK_PRICE)
      .replace('現在の売上・利益・価格・販売数は未確認', '現在の売上・利益・販売数は未確認')
      .replace('有料の追加機能の価格と販売数（公式トップに非掲載）', '有料の追加機能の販売数');
  }
  if (id === 'ent_ebizfacts_sarahbondliveeatlearnvegetarianblog30kmonth_79843a97e019') {
    out = out
      .replace('収益は主にMediavineの表示広告で、Amazonのアフィリエイトも少し。', '収益は主にMediavineの表示広告と、Amazonでの一部のアフィリエイト。')
      .replace('検索経由の流入を軸にレシピ記事を量産し、広告で稼ぐ個人ブログ運営の事例。', '検索経由の流入を軸に、週約5本（レシピ記事1本に約8時間）のペースで更新し、広告で稼ぐ個人ブログ運営の事例。');
  }
  return out;
}

// ---------------------------------------------------------------- 走査（audit6 と同じ形）
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
        const res = fixString(`${path}[${i}].text`, (it as AnyRecord).text as string, ctx);
        if (res !== null) {
          stash(e, `${path}[${i}].text`, (it as AnyRecord).text);
          if (res === DELETE) { v[i] = DELETE; bump('deleted observationsStream[].text'); } else { (it as AnyRecord).text = res; bump('rewritten observationsStream[].text'); }
        }
        for (const k2 of Object.keys(it as AnyRecord)) {
          if (k2 === 'text' || SKIP_KEYS.has(k2)) continue;
          walkValue(e, ctx, it as AnyRecord, k2, `${path}[${i}].${k2}`);
        }
        continue;
      }
      walkValue(e, ctx, v, i, `${path}[${i}]`);
    }
    for (let i = v.length - 1; i >= 0; i--) {
      const it = v[i];
      const emptyStr = typeof it === 'string' && it.trim() === '' && EMPTY_PRUNE_KEYS.has(String(key));
      if (it === DELETE || emptyStr) {
        if (emptyStr) { stash(e, `${path}[${i}]`, it); bump(`deleted empty ${path.replace(/\[\d+\]/g, '[]')}`); }
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

// ---------------------------------------------------------------- A2 出典に書かれていない「確認できない」
const A2_NEG = /(確認できない|切り出せない|公開されていない)/;
function a2Subject(body: string, id: string): string | null {
  let s = body.trim().replace(/。$/, '');
  const before = s;
  s = s.replace(/を本配列の営業損益へ換算できる一次情報は確認できない$/, '')
    .replace(/は本配列の月次比較に必要な粒度で公開されていない$/, '')
    .replace(/は公開(?:一次)?資料(?:から比較可能な形で|で)?(?:確認できない|切り出せない)$/, '')
    .replace(/は公開されていない$/, '');
  if (s === before) return null;
  if (id === 'ent_robinhood_Y7K4C1PM') s = s.replace('推論・サーバー費、', '');
  return s;
}
function splitSourced(s: string): { body: string } | null {
  const m = s.match(/^(.+?)\s*\[出典[:：][\s\S]*$/);
  return m ? { body: m[1] } : null;
}
function fixA2(e: AnyRecord) {
  const id = String(e.id);
  const notes: string[] = [];
  const drop = (text: string): boolean => {
    const sp = splitSourced(text);
    if (!sp || !A2_NEG.test(sp.body)) return false;
    const subj = a2Subject(sp.body, id);
    if (!subj) { bump('A2 unmatched shape (left as is)'); return false; }
    notes.push(`${subj}は未確認`);
    return true;
  };
  for (const key of ['observations'] as const) {
    if (!Array.isArray(e[key])) continue;
    const arr = e[key] as unknown[];
    const kept = arr.filter((x) => !(typeof x === 'string' && drop(x)));
    if (kept.length !== arr.length) { stash(e, key, [...arr]); bump('A2 removed observations[]', arr.length - kept.length); e[key] = kept; }
  }
  if (Array.isArray(e.observationsStream)) {
    const arr = e.observationsStream as AnyRecord[];
    const kept = arr.filter((x) => !(typeof x.text === 'string' && drop(x.text)));
    if (kept.length !== arr.length) { stash(e, 'observationsStream', JSON.parse(JSON.stringify(arr))); bump('A2 removed observationsStream[]', arr.length - kept.length); e.observationsStream = kept; }
  }
  if (notes.length) {
    const un = Array.isArray(e.unknownsNotes) ? (e.unknownsNotes as string[]) : [];
    const uniq = [...new Set(notes)].filter((n) => !un.includes(n));
    if (uniq.length) { stash(e, 'unknownsNotes', [...un]); e.unknownsNotes = [...un, ...uniq]; bump('A2 unknownsNotes added', uniq.length); }
  }
}

// ---------------------------------------------------------------- A5 対象顧客・顧客の課題
const SRC_WORD = /(記載|説明|紹介|掲げ|述べ|案内|うた|明記|表示|と書|によると|記事は|公式は)/;
const STAT = /(\d{1,3}(?:,\d{3})+\s*(?:人|回|件|社|名)|万人超|万社|万件)/;
function keepCustomer(tc: string): boolean {
  if (tc === UNCONFIRMED) return true;
  const sentences = tc.split(/(?<=。)/).map((x) => x.trim()).filter(Boolean);
  const hasStat = sentences.some((x) => STAT.test(x));
  if (hasStat) {
    const nonStat = sentences.filter((x) => !STAT.test(x));
    return nonStat.length > 0 && nonStat.some((x) => SRC_WORD.test(x));
  }
  return SRC_WORD.test(tc);
}
function fixA5(e: AnyRecord) {
  const es = rec(e.essence);
  const tc = typeof es.targetCustomer === 'string' ? es.targetCustomer : null;
  const pw = typeof e.targetPainWallet === 'string' ? e.targetPainWallet : null;
  const origTc = tc;
  if (tc !== null && !keepCustomer(tc)) {
    stash(e, 'essence.targetCustomer', tc); es.targetCustomer = UNCONFIRMED; e.essence = es; bump('A5 targetCustomer -> 未確認');
  } else if (tc !== null && tc !== UNCONFIRMED) bump('A5 targetCustomer kept (source word)');
  if (pw !== null && pw !== UNCONFIRMED) {
    if (pw === origTc || STAT.test(pw) || !SRC_WORD.test(pw)) {
      stash(e, 'targetPainWallet', pw); e.targetPainWallet = UNCONFIRMED; bump('A5 targetPainWallet -> 未確認');
    }
  }
}

// ---------------------------------------------------------------- A6 掲載日・更新日
function fixA6(e: AnyRecord) {
  const sm = rec(e.sourceMetadata);
  const pub = typeof sm.publishedAt === 'string' ? sm.publishedAt.slice(0, 10) : '';
  const mod = typeof sm.modifiedAt === 'string' ? sm.modifiedAt.slice(0, 10) : '';
  if (!pub || !mod || pub === mod || !Array.isArray(e.observationsStream)) return;
  for (const s of e.observationsStream as AnyRecord[]) {
    if (typeof s.sourceUrl === 'string' && /ebizfacts\.com/.test(s.sourceUrl) && typeof s.observedAt === 'string' && s.observedAt.slice(0, 10) === mod) {
      stash(e, `observationsStream[${String(s.id)}].observedAt`, s.observedAt);
      s.observedAt = pub; bump('A6 article observedAt: 更新日 -> 掲載日');
    }
    if (typeof s.text === 'string' && /^eBiz Factsがプロフィール記事「.*」を公開している。$/.test(s.text)) {
      stash(e, `observationsStream[${String(s.id)}].text`, s.text);
      s.text = s.text.replace(/。$/, `（掲載日 ${pub}、記事の更新日 ${mod}）。`); bump('A6 announcement label added');
    }
  }
}

// ---------------------------------------------------------------- A8 人数
function fixA8(e: AnyRecord) {
  const id = String(e.id);
  if (id !== 'ent_vctrmgic_42b9c7bc' && id !== 'ent_circl_b9') return;
  const ops = rec(e.operations);
  if (ops.isTeamSizeUnconfirmed === true && ops.teamSize === 0) return;
  stash(e, 'operations.teamSize', { teamSize: ops.teamSize, isTeamSizeUnconfirmed: ops.isTeamSizeUnconfirmed });
  ops.teamSize = 0; ops.isTeamSizeUnconfirmed = true; e.operations = ops; bump('A8 teamSize -> 未確認');
  if (e.scale !== 'UNKNOWN') { stash(e, 'scale', e.scale); e.scale = 'UNKNOWN'; bump('A8 scale -> UNKNOWN'); }
  const scr = rec(e.screening);
  if (scr.initialTeamPass === true) { stash(e, 'screening.initialTeamPass', true); scr.initialTeamPass = null; e.screening = scr; bump('A8 initialTeamPass -> null'); }
}

// ---------------------------------------------------------------- B 個別（構造）
function setScalar(e: AnyRecord, path: string, val: string, tag: string) {
  const keys = path.split('.');
  let o: AnyRecord = e;
  for (const k of keys.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') return; o = o[k] as AnyRecord; }
  const last = keys[keys.length - 1];
  if (!(last in o) || o[last] === val) return;
  stash(e, path, o[last]); o[last] = val; bump(tag);
}
function individualStructural(e: AnyRecord) {
  const id = String(e.id);
  if (id === 'ent_robinhood_Y7K4C1PM') {
    const what = '公式ページは、手数料無料の株式取引に加え、オプションや暗号資産の取引、資産管理のサービスを掲げている。';
    setScalar(e, 'tagline', what, 'B robinhood');
    setScalar(e, 'description', what, 'B robinhood');
    setScalar(e, 'essence.whatItDoes', what, 'B robinhood');
  }
  if (id === 'ent_usrflw_5a583bfd') {
    // 見出しは individualString で直す。ここでは他の「稼働中」表記が無いか数える。
  }
}

// ---------------------------------------------------------------- main
function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  let changed = 0;
  for (const e of entities) {
    const before = canon(e);
    const id = String(e.id);
    const isEbiz = id.startsWith('ent_ebizfacts');
    const third = isEbiz && Array.isArray(e.evidenceCards) && (e.evidenceCards as AnyRecord[]).some((c) => c.badge === '第三者の報告');
    const ctx: Ctx = { id, isEbiz, third };
    fixA2(e);
    fixA5(e); // 先に元の値で判定する
    for (const k of Object.keys(e)) {
      if (SKIP_KEYS.has(k)) continue;
      walkValue(e, ctx, e, k, k);
    }
    if (isEbiz) fixA6(e);
    fixA8(e);
    individualStructural(e);
    if (canon(e) !== before) { changed++; parseFinancialEntity(e); }
  }
  bump('records changed', changed);
  console.log(JSON.stringify({ total: entities.length, counts }, null, 1));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}
main();
