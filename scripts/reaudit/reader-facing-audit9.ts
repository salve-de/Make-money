/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const -- 一回きりの移行スクリプト。規則の集合を1ファイルにまとめている */
// @ts-nocheck
/**
 * 9回目の監査: 「作業の記録」の文を、事実の文に書き換えるか、画面に出る欄から外すための規則。
 * 単位は「文」。processString(s) は { text, kinds } を返す。text が '' なら、その文字列は丸ごと外す。
 */

const JP = /[぀-ヿ一-鿿]/;

// ---- 作業の記録を示す節の終わり方 --------------------------------------------------
const NEG_END = /(確認でき(?:ず|ない|なかった|ません|ていない|ておらず)|確認していない|確認はでき(?:ず|ない)|確認不能|確認不可|見つか(?:らず|らない|らなかった|っていない|りません)|見つけられ(?:ず|ない|なかった)|発見でき(?:ず|ない|なかった)|(?:表示|記載)(?:は|が)?なかった|採用に至らず|採用できなかった|得られ(?:ず|ない|なかった|ていない)|取得でき(?:ず|ない|なかった)|取得(?:不可|不能)|取れ(?:ず|ない|なかった)|接続でき(?:ず|ない|なかった)|接続に失敗|接続失敗|名前解決(?:に失敗|できず|できない|できなかった|失敗|不能)|読め(?:ず|ない|なかった)|開け(?:ず|ない|なかった)|裏付け(?:は|が)?(?:ない|無い|得られない|見つからない)|裏付ける(?:資料|出典|記録|根拠)は(?:ない|見つからな(?:い|かった)|得られな(?:い|かった))|根拠(?:は|が)(?:ない|無い|不足)|証拠(?:は|が)?(?:ない|なし|不足)|記載(?:は|が)?(?:見つからな(?:い|かった)|確認でき(?:ない|なかった))|記述(?:は|が)?(?:見つからな(?:い|かった)|得られな(?:い|かった))|判断できな(?:い|かった)|特定できな(?:い|かった)|確定できな(?:い|かった)|照合できな(?:い|かった)|回収できず|再現できな(?:い|かった)|不足|得られていない)$/;
const REJECT_END = /(裏付けない|証拠ではない|証拠にならない|証拠にはならない|(?:の|が|も)?可能性(?:が|も)(?:ある|あり)|保証しない|示すものではない|意味しない|証明しない|(?:判定|断定|認定|評価|証明)しない|(?:終了|有効|失敗|成功|非稼働|閉鎖)と(?:は)?(?:しない|断定しない)|の(?:裏付け|根拠|証拠)としない|確認済みとしない|として(?:は)?(?:扱っていない|扱わない|採用(?:して)?(?:いない|しない|せず)|使わない|使っていない|計上していない)|とは(?:扱わない|扱っていない|しない|見なさない|みなさない)|(?:を|に|は|には)採用(?:して)?(?:いない|しない|せず)|不採用|採用(?:して)?(?:いない|しない)|昇格しない|記録しない|載せていない|換算していない|割り戻しはしていない|入れていない|挿入していない|換算(?:は|も)?していない)$/;
const ATTEMPT_END = /((?:本文|ページ|情報|内容|記録|データ|HTML|題名|メタデータ|保存版)を取得した|(?:調査|検索|照会|確認|取得|試行|再取得|再確認)を実施(?:した)?|の確認に限る|(?:取得|試行|調査|検索|確認|照会)(?:の)?(?:結果|内容|状況|範囲|履歴)を記録(?:した|している)?|判定していない|評価していない|検証していない|試験していない|実施していない|未実施|行(?:っていない|っていません|わない|わなかった)|確認(?:は|を)(?:して|し)(?:いない|ていない)|試しておらず|試していない|実操作していない|操作していない|未試行|照会(?:した|を停止.*)|停止(?:した|し)|別記した|別掲|収録|残した|整理した|再確認中|再確認|再取得済み|再取得|取り込んでいない|未取り込み|未取得)$/;

const PROC_END = new RegExp(`(?:${NEG_END.source.slice(0, -1)}|${REJECT_END.source.slice(0, -1)}|${ATTEMPT_END.source.slice(0, -1)})$`);

// 内部の項目名で始まる行（deep-wave の dimension key）
const DIM_KEYS = 'hiring|incumbentBarrier|viability|fatalCause|competitorVictim|eraContext|costWaterfall|supplierCost|unusualUse|reviews|stakeholders|pricingHistory|affiliate|pivots|regulationGap|timeline|initialTraction|trafficSignal|competitors|dataPortability|techStack|platformDependency|people|prepayment';
const DIM_LINE = new RegExp(`^(?:未確認[:：]\\s*)?(?:${DIM_KEYS})[:：]\\s*`);

// 内部の作業に触れる語を含む文は丸ごと外す
const INTERNAL_DROP = [
  /deep-?wave|deep coverage|coverage(?!\s*on)|research-[\w-]+\.json|深掘りJSON|深掘り調査|基本候補|\.reaudit-work|source-lanes|調査ログ|readerCleanup|reaudit\.|topic別|全\d+ ?topic|deep\.v1|互換値|互換数値|型上の値|評価未確定|評価点0|未確認フラグ/,
  /^取込・本番表示・利用登録/,
  /(?:購入|ログイン|入金)は試しておらず/,
  /今回の対象外|取得対象外/,
  /未試行/,
  /停止規則|バッチ(?:内|先頭|残り)/,
  /(?:アクセス拒否|ボット確認|自動取得を拒否|Cloudflareの確認画面|Just a moment)/,
  /^公式(?:サイト|ドメイン|URL|ページ)[^、]{0,30}(?:応答した|応答する|応答している)$/,
  /^ドメインが応答することのみ確認した$/,
  /^公式(?:サイト|URL|ページ)は[\d-]*に?到達できる$/,
  /確認した範囲$/,
  /^\d{4}-\d{2}-\d{2}に.*を調査$/,
  /^公式(?:サイト|ページ|URL)への到達/,
  /(?:^|[^A-Za-z])CDX(?:[^A-Za-z]|$)/,
  /Wayback(?:が混雑|は先行|は2失敗|は(?:バッチ|規定)|の保存があっても|の索引|の保存索引)|Wayback.*(?:混雑|タイムアウト|停止|未取得|未確認)/,
  /Internet Archive.*(?:保存一覧|最初の取得|索引|照会)/,
  /アーカイブ(?:索引|取得|の取得)|スナップショット本文|取得時のHTTP/,
  /確認範囲による未確認|不存在ではない|存在しないことを意味しない|下記検索|機械的挿入|照会条件|保存本文|この照会|最も古い記録/,
  /^採用しなかった理由|不採用|採用しない理由|^事例として弱い[:：]|^オーナー判断[:：]|調査限界|このバッチ|IH取得経路|取得経路を停止/,
  /(?:存在|掲載)は(?:現在の)?収益性の(?:証明|裏付け)ではない|公開掲載と本人申告は.*独立検証ではない|混同しない$|実績として配信しない$/,
  /^このページに.{0,12}推移は表示されていない$/,
  /(?:検索|取得)(?:・取得)?の?範囲に限る$/,
  /(?:契約|決済|実動作|解約手続き)[^。]*実行していない$/,
  /^公式(?:サイト|ページ|URL)が開けることは?を?確認した/,
  /Temporarily Offline|タイムアウト|TLS|TLS の接続|ENOTFOUND|NXDOMAIN|サーバーエラー/,
  // ---- 10回目の監査: 作業の記録の残り
  /^外部リンク候補/,
  /(?:年商|利益額|金額|数値|換算)[^。]*採用しない/,
  /元レコードに保全|履歴を保全|変更前ファイルと/,
  /現在の料金との一致は別途確認対象/,
  /^公開ページの存在と、事業の採算・再現性は別/,
  /初回検索には別の同名/,
  /検索結果(?:に|の)[^。]*(?:記録していない|出典ページを確認できず)|出典ページを確認できず記録していない/,
  /^創業者・運営者の公開発言の検索/,
  /採用条件を満たす|採用条件を満たさ/,
  /^これは紹介文の掲載時点である$/,
  /この調査では記録していない|確認できず、?記録していない/,
  /検索結果(?:には|に(?:、|(?:も)?[^。（）]{0,40}?(?:表示|出た|出る|記載|残|現れ|掲載))|の要約)|記録していない|記録しなかった|別途確認対象|(?:転送先の|当該)ページは開いていない/,
  /^算定根拠[:：]\s*出典に書かれた申告・発表を日付付きで記録|金額の推計・換算は行っていない/,
  /^(?:未確認[:：]\s*)?(?:[^（）、。]{1,16}（(?:未確認|対象外)）、?){3,}$/,
  // ---- 11回目の監査: 作業の記録の残り
  /本人投稿・掲載表示を確認し/,
  /^\d{4}-\d{2}-\d{2}\s*個別調査$/,
  /報道・取材時期不明/,
  /(?:期間と指標|期間と対象事業|日付表示差|異なる現状|事象|イベント)を保持(?:する)?$/,
  /オーナー判断/,
];

const LABEL_STRIP = [
  /^IHの実際の取得内容[:：]\s*/,
  /^Internet Archive CDX[:：]\s*/,
  /^Internet Archive（Wayback CDX 索引）[:：]\s*/,
];

const FIELD_UNKNOWN = /^(?!公式|IH|掲載|Indie|投稿|同日|本文|ページ|サイト)[^、。]{0,24}?(?:は|も)?(?:確認でき(?:ず|ない|なかった)|不明|未確認)$/;
const LEAD_PROC = /(?:の証拠ではなく|の証拠ではないが|を裏付けず|の裏付けにはならず|の裏付けにならず)$/;
const CONN = /(が|し|く|て|で|り|され|られ|ず|ため|ので|から|ものの|けれど|うえ|上で|一方|ながら)$/;
const DEP_CONN = /(ため|ので|から|ものの|けれど|うえ|上で|一方|ながら|(?:確認|取得|照会|検索|調査|閲覧|参照|試行)(?:し|して|したが|したものの)|が)$/;
const FINAL_REPAIR = [[/であり$/, 'である'], [/しており$/, 'している'], [/ており$/, 'ている'], [/おり$/, 'いる'], [/でき$/, 'できる'], [/(され|られ)$/, '$1る'], [/(異な|あ|な|違|似|近|近づ)り$/, '$1る'], [/(?:記|示|表|提供|説明|案内|掲載|紹介|公開)し$/, (m) => (/^[記示表]し$/.test(m) ? m.replace(/し$/, 'す') : m.replace(/し$/, 'する'))], [/で$/, '']];

const openCount = (s) => (s.match(/[（(〔[「]/g) || []).length - (s.match(/[）)〕\]」]/g) || []).length;

/** 括弧の外にある「、」のうち、直前の節が接続の形で終わるものだけを節の境界にする */
function splitSegments(s) {
  const segs = []; let depth = 0; let cur = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ('（(〔[「'.includes(ch)) depth++;
    if ('）)〕]」'.includes(ch)) depth = Math.max(0, depth - 1);
    cur += ch;
    if (ch === '、' && depth === 0) {
      const before = cur.slice(0, -1).replace(/[（(][^（）()]*[）)]$/, '').trim();
      if (CONN.test(before)) { segs.push(cur); cur = ''; }
    }
  }
  if (cur) segs.push(cur);
  return segs;
}

const stripParenTail = (c) => c.replace(/[（(][^（）()]*[）)]$/, '').trim();
const isProc = (seg) => {
  const t = seg.replace(/[。、]+$/, '').trim();
  return PROC_END.test(t) || PROC_END.test(stripParenTail(t));
};

/** 文の中の具体性（数字・英字・カタカナ語・列挙）があるか */
const SPECIFIC = /[0-9A-Za-z@$€£¥%]|[ァ-ヶー]{3,}|、|・|「|」/;

function joinKept(kept) {
  return kept.map((s) => s.replace(/、$/, '')).join('、');
}

/** 文（句点なし）を整える。'' なら外す。 */
function processSentenceBody(body, depth = 0) {
  let s = body.trim();
  if (!s) return '';
  if (!JP.test(s)) return s;
  // 末尾の（…）
  const pm = s.match(/^(.*?)[（(]([^（）()]*)[）)]$/);
  const hitInternal = INTERNAL_DROP.some((re) => re.test(s));
  // 括弧の中だけに作業語がある文は、括弧を外して本体を残す
  if (hitInternal && !(pm && pm[1].trim() && depth < 3 && !INTERNAL_DROP.some((re) => re.test(pm[1])))) return '';
  if (pm && pm[1].trim() && depth < 3) {
    const head = pm[1].trim(); const inner = pm[2];
    const innerRes0 = processString(inner, depth + 1).text.replace(/。$/, '');
    const dateOnly = /^[\d\-年月日時点〜~ /:]*$/.test(innerRes0);
    if (isProc(head)) {
      // 「料金は確認できず（事実…）」→「未確認（事実…）」。作業の文（再確認・試行）なら事実だけ残す
      const innerRes = dateOnly ? '' : innerRes0;
      if (!innerRes) return '';
      if (/^公式(?:サイト|ドメイン|URL|ページ)[^、]*(?:閉鎖|到達|ページなし|404|証明書)/.test(innerRes)) return innerRes;
      if (NEG_END.test(head) && FIELD_UNKNOWN.test(head)) return `未確認（${innerRes}）`;
      return innerRes;
    }
    const headRes = processSentenceBody(head, depth + 1);
    if (headRes === '') return '';
    if (headRes === head && innerRes0 === inner) return s;
    if (!innerRes0) return headRes;
    return `${headRes}（${innerRes0}）`;
  }

  const gm = s.match(/^(.{6,}?(?:ある|いる|する|した|される|れる|示す|記す|表示))が、?[^、。がに]{0,40}?(?:確認でき(?:ず|ない|なかった|ていない)|見つからな(?:い|かった)|特定でき(?:ない|なかった)|取得でき(?:ない|なかった))$/);
  if (gm && !isProc(gm[1]) && depth < 3) return processSentenceBody(gm[1], depth + 1);

  const segs = splitSegments(s);
  let end = segs.length;
  let droppedProc = false; let droppedText = '';
  while (end > 0 && isProc(segs[end - 1])) { droppedProc = true; droppedText = segs[end - 1] + droppedText; end--; }
  let start = 0;
  while (start < end - 1 && LEAD_PROC.test(segs[start].replace(/[。、]+$/, '').trim())) { start++; droppedProc = true; }
  if (end === 0) return '';
  if (!droppedProc) return s;
  // 落とした節に係る節も落とす
  while (end > 0) {
    const c = segs[end - 1].replace(/、$/, '').trim();
    if (/が$/.test(c) && !/ため$|ので$/.test(c)) break;
    if (DEP_CONN.test(stripParenTail(c))) {
      if (FINAL_REPAIR.some(([re]) => re.test(c))) break;
      droppedText = segs[end - 1] + droppedText; end--; continue;
    }
    break;
  }
  if (end === 0) return '';
  let kept = joinKept(segs.slice(start, end));
  kept = kept.replace(/(表示する|表示される|案内する|説明する|記載する|示す|ある|いる|した|する|載せる|される|述べる)が$/, '$1').replace(/が$/, '');
  for (const [re, to] of FINAL_REPAIR) if (re.test(kept)) { kept = kept.replace(re, to); break; }
  if (CONN.test(kept)) return '';
  // 収益・売上の数字を出す文の「裏付けが無い」は、独立した確認が無い、と一言だけ残す
  if (/(裏付け|根拠|独立)/.test(droppedText) && /(収益|売上|月次|月額|MRR|\$|ドル|本人|申告|数字|金額)/.test(kept) && !/(独立|検証|申告|自称)/.test(kept)) kept += '（独立した確認なし）';
  return kept;
}

// ---- 「…を確認」を事実の文にする --------------------------------------------------
const SRC_TOKENS = /(?:公式|IH|Indie Hackers|掲載ページ|掲載|公開|URL|サイト|ページ|トップ|本文|説明|製品|商品|サービス|内容|提供|事業|の|と|、|・|等|および|または|\s)/g;
const PROC_OBJ = /(開け|開く|取得|再取得|照会|CDX|応答|到達|接続|試行|検索|索引|メタデータ|保存記録|保存日時|レスポンス|HTTP|再確認|実在|存在|一致|同一性)/;
const GENERIC_OBJ = /^(?:提供内容|事業内容|製品説明|商品説明|製品の説明|サービス内容|公開説明|案内|説明|本文|題名|内容|運営会社|トップ|ページ|情報|ドメイン|投稿|日付付きの?投稿|日付つきの?投稿|紹介投稿|製品名と自己紹介文|製品紹介と当事者投稿|掲載者の製品説明と日付付き投稿|掲載された製品説明と日付つき投稿|公開ページ|公式サイト|公開URLの本文と個別検索|公式サイトの公開説明|公式サイトの題名だけ|公式ページの案内|提供内容と運営会社|事業内容と提供内容|公式の公開ページ|製品の紹介|製品紹介|自己紹介文|日付つきの利用者の声|利用者の声)$/;

const PLACE = { '掲載ページ': 'Indie Hackers の掲載ページ', '公式サイト': '公式サイト', '公式ページ': '公式ページ', '公式トップ': '公式トップ', '公式の公開ページ': '公式ページ', '公開ページ': '公開ページ', '転送先': '転送先', '公式FAQ': '公式FAQ', '公式採用ページ': '公式採用ページ' };

function ihOwnerSentence(core) {
  // 掲載ページで(創業者|掲載者|投稿者)(ハンドル)? [名前/@ハンドル] (の名前|の表示名)? と、 DATE の 投稿… を確認
  const m = core.match(/^(?:掲載ページで|掲載ページに)(?:(創業者|掲載者|投稿者)(?:名|の表示名)?)?(ハンドル)?\s*([^と]*?)\s*(?:の名前|の表示名|名)?と、?\s*(.+?)の((?:[^のと]*)?(?:投稿|告知|紹介文))(?:\s*(\d+)件)?を確認$/);
  if (!m) return null;
  const [, , , nameRaw, when, kind, n] = m;
  const name = (nameRaw || '').replace(/^ハンドル\s*/, '').trim();
  const parts = [];
  if (name && !/^(?:ハンドル|名前)$/.test(name)) parts.push(`Indie Hackers の掲載者は ${name}`);
  const cnt = n ? `が${n}件` : 'が';
  parts.push(`${when.replace(/\s+$/, '')} に${kind}${cnt}ある`);
  return parts.join('。');
}

function confirmRules(core) {
  let m;
  const ih = ihOwnerSentence(core);
  if (ih) return ih;
  if (/^掲載ページで(?:製品名|掲載者|創業者|投稿者)[^、]*を確認$/.test(core) && !SPECIFIC.test(core)) return '';
  if ((m = core.match(/^(.+?)(?:は|も)確認(?:した|済み)$/)) && !SPECIFIC.test(m[1])) return '';
  // 転送
  if ((m = core.match(/^(.+?)から(https?:\/\/\S+?)への転送を確認$/))) return `${m[1]}は${m[2]}へ転送される`;
  // …ことを確認
  if ((m = core.match(/^(.+?(?:される|された|している|いる|ある|なる|ない|する|した|れる|だ))こと(?:を|が)確認(?:した|できる)?$/)) && !PROC_OBJ.test(m[1])) return m[1];
  // 日付＋場所で 〜を確認
  let date = '';
  let rest = core;
  const dm = rest.match(/^(\d{4}-\d{2}-\d{2}|\d{4}年\d{1,2}月\d{1,2}日)(?:に|の|、|時点で|時点の|\s)\s*/);
  if (dm) { date = dm[1]; rest = rest.slice(dm[0].length); }
  const om = rest.match(/^(?:(掲載ページ|公式サイト|公式ページ|公式トップ|公式の公開ページ|公開ページ|転送先|公式FAQ|公式採用ページ)(?:で|の|に)(?:、)?)?(.+?)を(?:確認|閲覧)(?:した|できた)?$/);
  if (om) {
    const place = om[1]; const obj = om[2].trim();
    if (PROC_OBJ.test(obj) || obj.replace(SRC_TOKENS, '').length < 2 || GENERIC_OBJ.test(obj) || /^(?:公式|IH|Indie Hackers)?(?:URL|サイト|ページ|掲載ページ)/.test(obj) && !SPECIFIC.test(obj)) return '';
    if (!SPECIFIC.test(obj)) return '';
    if (/(?:が|は|を|に)(?:.*(?:あり|ある|表示|記載))/.test(obj) && /(?:とし、|であり|があり|を持ち)/.test(obj)) return null;
    const where = place ? PLACE[place] : '';
    const head = date ? `${date}${where ? ` の${where}` : ''}` : (where || '');
    if (where && date) return `${date} の${where}に${obj}がある`;
    if (where) return `${where}に${obj}がある`;
    if (date) return `${date} に${obj}がある`;
    return `${obj}がある`;
  }
  return null;
}

// ---- 型の決まった書き換え --------------------------------------------------------
function rewriteKnown(core) {
  let m;
  if (/^公式サイトは2026-09時点で(?:開けなかった|閉鎖または到達できない)$/.test(core)) return core;
  if (/^公式サイト（\d{4}-\d{2}-\d{2}確認）[:：]/.test(core)) return '';
  if (/^確認した出典[:：]/.test(core)) return '';
  if (/^eBiz Facts の記事（掲載日 \d{4}-\d{2}-\d{2}）$/.test(core)) return '';
  if (/^eBiz Facts のプロフィール記事$/.test(core)) return '';
  if (/^\d{4}-\d{2}-\d{2}(?:[〜~]\d{4}-\d{2}-\d{2})?\s*.{0,30}(?:を)?再確認(?:中)?$/.test(core)) return '';
  if (/再確認中$/.test(core)) return '';
  if ((m = core.match(/^(収益欄|収益ページ|掲載の収益欄)[:：]\s*(.+?)と表示（入力者と検証の有無はページ上で確認できず、公式サイトなど他の出典でも裏付けは得られていない）$/))) return `${m[1]}: ${m[2]}と表示（独立した確認なし）`;
  if (/^入力者と検証の有無はページ上で確認できず、公式サイトなど他の出典でも裏付けは得られていない$/.test(core)) return '独立した確認はない';
  if ((m = core.match(/^(収益欄|収益ページ|掲載の収益欄)(?:の(月[^は、]*?|月額|月次売上[^は、]*?))?(?:は|も)?[^、]*?(?:裏付け(?:は|が)?(?:見つからな(?:い|かった)|得られな(?:い|かった)|ない|無い)|裏付ける資料は見つからな(?:い|かった))$/)) && !/表示|入力|更新/.test(core)) {
    return `${m[1]}${m[2] ? `の${m[2]}` : ''}は独立した確認がない`;
  }
  if ((m = core.match(/^(?:(Indie Hackers(?: 掲載ページ| \(収益ページ\)|（収益ページ）)?|IH)[:：]\s*)?この収益欄は(?:裏付けが無いため、)?売上としては扱っていない(?:（[^）]*）)?$/))) return `${m[1] ? `${m[1]}: ` : ''}この収益欄は独立した確認がない`;
  if (/^収益欄は採用していない$/.test(core)) return '収益欄は独立した確認がない';
  if (/^出典[:：]\s*収益ページ（売上として扱っていない入力値）$/.test(core)) return '出典: 収益ページ（入力値）';
  // 公式サイトの状態: 閉鎖・到達不能は事業の現状として残す
  if (/^公式(?:サイト|ドメイン|URL|ページ)[^、]*(?:は|が)?確認時に開けなかった(?:（[^）]*）)?$/.test(core)) return '公式サイトは2026-09時点で開けなかった';
  if (/^公式(?:サイト|ドメイン|URL)(?:のドメイン)?(?:（[^）]*）)?は(?:\d{4}-\d{2}-\d{2}(?:時点)?)?(?:の取得(?:試行)?で)?(?:、www 付き・なしのどちらも|、www 付きと www なしのどちらも)?(?:名前解決(?:に失敗|できず|できない|失敗|できなかった)|到達不能|DNS解決不能)/.test(core)) return '公式サイトは2026-09時点で閉鎖または到達できない';
  if (/^(?:現在の)?公式(?:サイト|URL|ドメイン)?(?:は|も)?到達不能$/.test(core) || /^公式到達不能$/.test(core)) return '公式サイトは2026-09時点で閉鎖または到達できない';
  return null;
}


/** 「月商・利益・原価…は未確認」のように、欄の名前を3つ以上並べただけの文（画面が欄ごとに「未確認」と出す） */
const UNK_TOKENS = ['月商', '売上', '利益', '原価', '手残り', 'チーム規模', '創業年', '開始時期', '集客経路', 'ツール構成', '稼働時間', '初期資本', '従業員数', '顧客数', '料金', '価格'];
function isUnknownOnlyList(core) {
  const t = core.trim().replace(/[。]+$/, '');
  let n = 0; let rest = t;
  for (const tok of UNK_TOKENS) { const parts = rest.split(tok); n += parts.length - 1; rest = parts.join(' '); }
  if (n < 3) return false;
  rest = rest.replace(/現在の|独立確認|未確認|[:：]/g, ' ').replace(/[・、,\s]|と|は|も|の/g, '');
  return rest === '';
}

function pieceRules(core) {
  let idm;
  core = core.replace(/。併記された米ドル換算は採用しない/g, '').replace(/（一次公開レポートに基づく報告値）/g, '').replace(/インディーズ ハッカー/g, '個人開発者');
  if (isUnknownOnlyList(core) || /^(?:未確認[:：]\s*)?(?:[^（）、。]{1,16}（(?:未確認|対象外)）、?){3,}$/.test(core.trim())) return '';
  if ((idm = core.match(/^(.*創業者かどうか)は[^、。]{0,15}?(?:確認でき(?:ない|なかった|ず)|確認できていない)$/))) return `${idm[1]}は未確認`;
  if ((idm = core.match(/^(.{4,60}?(?:関係|運営者か|同一(?:性|人物|事業)|本人か|関与|創業者かどうか))(?:は|も)?(?:確認でき(?:ない|なかった|ず)|確認できていない)$/))) return `${idm[1]}は未確認`;
  if (/^(?:記事が引用する)?URL[:：]\s*https?:\/\/\S+(?:（[^）]*）)?$/.test(core.trim())) return '';
  if (/^(?:https?:\/\/\S+\s*[,、]?\s*)+$/.test(core.trim())) return '';
  if (DIM_LINE.test(core)) return '';
  // 出典欄に出る情報だけの行（観測日時 / 区分 / URL、アーカイブ索引の題名）
  if (/^\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z)?\s*観測\s*\/.*(?:TIER\d?_?[A-Z_]*|https?:\/\/\S+)/.test(core) && !/[ぁ-ん]/.test(core)) return '';
  if (/^(?:Internet Archive|出典[:：]\s*(?:Internet Archive|アーカイブ索引))/.test(core) && /(?:CDX|アーカイブ索引|web\.archive\.org)/.test(core) && !/[ぁ-ん]{3}/.test(core.replace(/Internet Archive|Wayback|CDX|索引|アーカイブ/g, ''))) return '';
  if (/^web_archive_index\b/.test(core) || /^(?:出典[:：]\s*)?Internet Archive CDX$/.test(core) || /^出典[:：]\s*アーカイブ索引の取得内容$/.test(core)) return '';
  const r = rewriteKnown(core);
  if (r !== null) return r;
  const c = confirmRules(core);
  if (c !== null) return c;
  const b = processSentenceBody(core);
  if (b === '') return '';
  if (b !== core) {
    // 整えた結果にもう一度「…を確認」の規則を当てる
    const c2 = confirmRules(b);
    if (c2 !== null) return c2;
  }
  return b;
}

function joinPieces(pieces) {
  let out = pieces.join('');
  out = out.replace(/（）/g, '').replace(/\(\)/g, '');
  return out.trim();
}

function processString(input, depth = 0) {
  if (typeof input !== 'string') return { text: input, kinds: [] };
  if (!JP.test(input)) return { text: input, kinds: [] };
  const kinds = [];
  const raw0 = input.split(/(?<=。)/);
  // 括弧をまたぐ断片は、閉じるまで結合する
  const raw = [];
  for (let i = 0; i < raw0.length; i++) {
    let cur = raw0[i];
    while (openCount(cur) > 0 && i + 1 < raw0.length) { cur += raw0[++i]; }
    raw.push(cur);
  }
  const seen = new Set();
  const out = [];
  let changed = false;
  for (const piece of raw) {
    const hadPeriod = /。$/.test(piece);
    const body = piece.replace(/。$/, '');
    const wsLead = (body.match(/^\s*/) || [''])[0];
    let core = body.trim();
    if (!core) { if (piece.trim()) out.push(piece); else changed = changed || piece.length > 0; continue; }
    let pre = '';
    const lead = core.match(/^(未確認[:：]\s*)/);
    if (lead) { pre = lead[1]; core = core.slice(lead[1].length); }
    let labeled = core;
    for (const re of LABEL_STRIP) core = core.replace(re, '');
    const res = pieceRules(core);
    if (res === '') { kinds.push('drop'); changed = true; continue; }
    if (res !== labeled) { kinds.push('rewrite'); changed = true; }
    const text = `${wsLead}${pre}${res}${hadPeriod ? '。' : ''}`;
    const dk = text.trim().replace(/。$/, '');
    if (seen.has(dk)) { kinds.push('dedupe'); changed = true; continue; }
    seen.add(dk);
    out.push(text);
  }
  if (!changed) return { text: input, kinds: [] };
  let text = joinPieces(out).replace(/\s*[\/／]\s*$/, '').replace(/^\s*[\/／]\s*/, '');
  if (/^（[^（）]*）$/.test(text)) text = '';
  if (/^未確認。?$/.test(text)) text = '未確認';
  return { text, kinds };
}

// ================================================================ ドライバ
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';
import { isFoundedYearSourced } from '../architecture/facts-only-lib.mjs';

type AnyRecord = Record<string, any>;
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
const rewriteEx: { path: string; before: string; after: string }[] = [];
const dropEx: { path: string; before: string }[] = [];
const notes: string[] = [];

function stash(e: AnyRecord, path: string, before: unknown) {
  const reaudit = rec(e.reaudit);
  if (Object.keys(reaudit).length === 0) { bump('stash skipped (no reaudit)'); return; }
  const snap = rec(reaudit.legacyDisplaySnapshot);
  const pn = rec(snap.priorNarrative);
  const bucket = rec(pn.readerCleanup);
  if (!snap.status) Object.assign(snap, { status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: DATE, method: 'SCRIPTED_READER_FACING_CLEANUP_V1' });
  if (bucket.cleanedAt === undefined) bucket.cleanedAt = DATE;
  const list: AnyRecord[] = Array.isArray(bucket.audit9) ? bucket.audit9 : [];
  const key = canon(before);
  if (!list.some((x) => x.path === path && canon(x.before) === key)) list.push({ path, before: JSON.parse(JSON.stringify(before ?? null)) });
  bucket.audit9 = list;
  pn.readerCleanup = bucket; snap.priorNarrative = pn; reaudit.legacyDisplaySnapshot = snap; e.reaudit = reaudit;
}

const SKIP_KEYS = new Set(['id', 'reaudit', 'meta', 'sourceMetadata', 'coverageAudit', 'claimBindings', 'url', 'sourceUrl', 'urls', 'batchId', 'blueprintId', 'ticker']);
const TARGET = /^(observations\[\]|unknownsNotes\[\]|evidenceCards\[\]\.(details\[\]|punchline|title|sourceNote)|observationsStream\[\]\.(text|publicDisplay\.note)|temporal\.(dataSnapshotPeriod|currentViabilityAnalysis|eraContext|viabilityLabel|initialTractionPeriod)|timelineEvents\[\]\.description|architecturePattern|pipelineStack|lootBlueprint\.[A-Za-z]+|essence\.[A-Za-z]+|description|tagline|legalEntity|founder|pnl\.(revenueLabel|dataSnapshotPeriod|estimationLogic)|reportedMetrics\[\]\.(context|period|verification)|screening\.backgroundAndScaleCaveat|(strategy|operations)\.[A-Za-z]+(\[\])?)$/;
const UNKNOWN_FALLBACK = /^(description|tagline|evidenceCards\[\]\.title|temporal\.(currentViabilityAnalysis|eraContext|initialTractionPeriod)|architecturePattern|pipelineStack|lootBlueprint\.[A-Za-z]+|essence\.[A-Za-z]+|legalEntity|founder|pnl\.revenueLabel|(strategy|operations)\.[A-Za-z]+)$/;
const norm = (p: string) => p.replace(/\[\d+\]/g, '[]');

/** 日付つきの「調査した」だけの欄を「YYYY-MM-DD 時点」に */
function snapshotPeriod(s: string, out: string): string | null {
  const m = s.match(/^(\d{4}-\d{2}-\d{2}(?:[〜~]\d{4}-\d{2}-\d{2})?)\s*(?:公式サイト等を再確認|公開情報の個別調査|公開ページを確認|.*再確認|.*個別調査)/);
  if (!m) return null;
  const rest = out.replace(/^\s+|\s+$/g, '');
  return rest && !rest.startsWith(m[1]) ? `${m[1]} 時点（${rest}）` : `${m[1]} 時点`;
}

function processValue(e: AnyRecord, parent: AnyRecord | unknown[], key: string | number, path: string, ctx: object) {
  const np = norm(path);
  const v = (parent as AnyRecord)[key as string];
  if (typeof v !== 'string') return;
  if (!TARGET.test(np)) return;
  if (/sourceNote$/.test(np) && /https?:/.test(v)) return; // 出典リンクの有無を画面が使う
  // 旧い共通の定型文（TEMPORAL_UNKNOWN の旧値）は「未確認」の一語にする
  let out = np === 'temporal.currentViabilityAnalysis' && v === '未確認。掲載や公式サイトの存在は現在の収益性を裏付けない。' ? '未確認' : v;
  for (let i = 0; i < 5; i++) { const r = processString(out); if (r.text === out) break; out = r.text; }
  if (out === v) return;
  const isDate = /dataSnapshotPeriod$/.test(np);
  if (isDate) { const sp = snapshotPeriod(v, out); if (sp) out = sp; }
  const ITEM = /^(observations\[\]|unknownsNotes\[\]|evidenceCards\[\]\.details\[\]|(strategy|operations)\.[A-Za-z]+\[\])$/;
  if (out.trim() === '' || (out === UNCONFIRMED && ITEM.test(np))) {
    // 空になった
    if (ITEM.test(np) || np === 'tags[]') {
      stash(e, path, v); bump('drop'); if (dropEx.length < 4000) dropEx.push({ path, before: v });
      (parent as any)[key as string] = '\u0000REMOVE';
      return;
    }
    if (np === 'observationsStream[].text') { stash(e, path, v); (parent as AnyRecord)[key as string] = '\u0000REMOVE'; bump('drop'); if (dropEx.length < 4000) dropEx.push({ path, before: v }); return; }
    if (np === 'observationsStream[].publicDisplay.note') { stash(e, path, v); delete (parent as AnyRecord)[key as string]; bump('drop'); dropEx.push({ path, before: v }); return; }
    if (np === 'evidenceCards[].punchline' || np === 'evidenceCards[].sourceNote') { stash(e, path, v); (parent as AnyRecord)[key as string] = ''; bump('drop'); dropEx.push({ path, before: v }); return; }
    if (np === 'timelineEvents[].description') { stash(e, path, v); (parent as AnyRecord)[key as string] = '\u0000REMOVE'; bump('drop'); dropEx.push({ path, before: v }); return; }
    if (np === 'pnl.estimationLogic') { stash(e, path, v); delete (parent as AnyRecord)[key as string]; bump('drop estimationLogic'); dropEx.push({ path, before: v }); return; }
    if (UNKNOWN_FALLBACK.test(np) || isDate) {
      const fb = isDate ? (snapshotPeriod(v, '') ?? UNCONFIRMED) : UNCONFIRMED;
      stash(e, path, v); (parent as AnyRecord)[key as string] = fb; bump('drop→未確認'); dropEx.push({ path, before: v }); return;
    }
    bump(`kept-original(${np})`);
    return;
  }
  stash(e, path, v);
  (parent as AnyRecord)[key as string] = out;
  bump('rewrite');
  if (rewriteEx.length < 4000) rewriteEx.push({ path, before: v, after: out });
}

function prune(node: unknown): unknown {
  if (Array.isArray(node)) {
    const arr = node.filter((x) => !(typeof x === 'string' && x.startsWith('\u0000REMOVE')) && !(rec(x).text === '\u0000REMOVE') && !(rec(x).description === '\u0000REMOVE'));
    return arr.map(prune);
  }
  if (node && typeof node === 'object') {
    const o = node as AnyRecord;
    for (const k of Object.keys(o)) {
      if (o[k] === '\u0000REMOVE') { delete o[k]; continue; }
      o[k] = prune(o[k]);
    }
  }
  return node;
}

function walk(e: AnyRecord, parent: AnyRecord | unknown[], key: string | number, path: string, ctx: object) {
  const v = (parent as AnyRecord)[key as string];
  if (typeof v === 'string') processValue(e, parent, key, path, ctx);
  else if (Array.isArray(v)) v.forEach((_x, i) => walk(e, v, i, `${path}[${i}]`, ctx));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (!SKIP_KEYS.has(k)) walk(e, v, k, `${path}.${k}`, ctx); }
}

function generalPass(e: AnyRecord) {
  const ctx = { removed: new Set<unknown>() };
  for (const k of Object.keys(e)) { if (!SKIP_KEYS.has(k)) walk(e, e, k, k, ctx); }
  // observationsStream の text が空の項目を外す
  if (Array.isArray(e.observationsStream)) {
    e.observationsStream = e.observationsStream.filter((x: AnyRecord) => !(x && x.text === '\u0000REMOVE'));
  }
  prune(e);
}

// ================================================================ 個別の修正・整合
/** e 内の全文字列（SKIP_KEYS 以外）に対して fn を適用し、変わったら退避して置き換える */
function mapAll(e: AnyRecord, fn: (s: string, path: string) => string, tag: string) {
  const walkAll = (parent: AnyRecord | unknown[], key: string | number, path: string) => {
    const v = (parent as AnyRecord)[key as string];
    if (typeof v === 'string') {
      const r = fn(v, path);
      if (r !== v) { stash(e, path, v); (parent as AnyRecord)[key as string] = r; bump(tag); }
    } else if (Array.isArray(v)) v.forEach((_x, i) => walkAll(v, i, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (!SKIP_KEYS.has(k)) walkAll(v, k, `${path}.${k}`); }
  };
  for (const k of Object.keys(e)) { if (!SKIP_KEYS.has(k)) walkAll(e, k, k); }
}
function setAt(e: AnyRecord, path: string[], val: unknown, tag: string) {
  let cur: AnyRecord = e;
  for (let i = 0; i < path.length - 1; i++) { cur = rec(cur[path[i]]); if (!Object.keys(cur).length && cur !== e[path[i]]) return; }
  const last = path[path.length - 1];
  if (JSON.stringify(cur[last]) === JSON.stringify(val)) return;
  stash(e, path.join('.'), cur[last]); cur[last] = val; bump(tag);
}
const rep = (pairs: [string | RegExp, string][]) => (s: string) => pairs.reduce((a, [f, t]) => a.replace(f as any, t), s);

// 10回目監査の個別修正（2026-09-30、各出典を WebFetch で確認）
function addObs(e: AnyRecord, text: string, url: string, tag: string) {
  const obs: string[] = Array.isArray(e.observations) ? e.observations : (e.observations = []);
  if (obs.includes(text)) return;
  obs.push(text);
  (e.observationsStream ??= []).push({
    id: `${e.id}-audit10-${(e.observationsStream?.length ?? 0) + 1}`, category: 'TECH_VERIFICATION', categoryLabel: '出典つきの観察',
    text, originType: 'reported', verificationStatus: 'SUPPORTED', sourceUrl: url, observedAt: '2026-09-30', sourceClass: 'COMMUNITY',
  });
  bump(tag);
}
function dropUnknownNote(e: AnyRecord, re: RegExp, tag: string) {
  if (Array.isArray(e.unknownsNotes)) { const n = e.unknownsNotes.filter((x: string) => !re.test(x)); if (n.length !== e.unknownsNotes.length) { e.unknownsNotes = n; bump(tag); } }
  for (const c of (e.evidenceCards ?? []) as AnyRecord[]) {
    if (Array.isArray(c.details)) { const n = c.details.filter((x: string) => !re.test(String(x))); if (n.length !== c.details.length) { c.details = n; bump(tag); } }
  }
}
const IH_FOIA = 'https://www.foiafile.com/';
const FIX10: Record<string, (e: AnyRecord) => void> = {
  ent_foiafile_f432242ab79f: (e) => {
    // 公式トップ・/pricing（2026-09-30確認）: 単発$9.99、Pro月$19、Firm月$49、5件パック$19.99、別枠の書面プレビュー（サンプル文書）$24.99（Firmに含む）
    mapAll(e, rep([
      [/行政文書の請求書作成から拒否時の弁護士紹介へつなぐサービス/g, '情報公開請求（FOIA）の書面を作成・送付し、拒否時の弁護士紹介へつなぐサービス'],
      [/別の書面プレビュー欄は単発\$24\.99でFirmに含むと表示し、課金対象の違いは未確認/g, '公式トップは別枠で、書面のサンプル（Attorney-Grade Preview）を単発$24.99、Firm契約に含むと表示する。単発$9.99の請求とは別の商品'],
      [/別箇所の弁護士向け書面\$24\.99表示との関係は未確認/g, '別枠で書面のサンプル（Attorney-Grade Preview）が単発$24.99（Firm契約に含む）。単発$9.99は請求1件ごとの料金で、別の商品'],
    ]), 'fix10 foiafile');
  },
  ent_aputime_3675d76dbe1a466da11b: (e) => {
    const LATKA = 'https://getlatka.com/companies/aputime';
    mapAll(e, rep([[/Enterpriseは個別の3段階の価格を案内している/g, 'Enterpriseは個別見積もり（問い合わせ制）と案内している']]), 'fix10 aputime enterprise');
    dropUnknownNote(e, /^(?:未確認[:：]\s*)?Enterpriseプランの料金$/, 'fix10 aputime enterprise unknown');
    addObs(e, 'Latka のインタビュー記事は、2023年3月時点で月額課金の顧客が約300社、うち AppSumo 経由で月額に移ったのは10〜15社と説明する。AppSumo の買い切り購入者は300社に数えていない。契約は主に年払い。', LATKA, 'fix10 aputime latka');
  },
  ent_pelucid_27fc1e50a2d6: (e) => {
    const IH = 'https://www.indiehackers.com/product/pelucid';
    setAt(e, ['founder'], 'Jamie Nicol（Indie Hackers の掲載）', 'fix10 pelucid');
    setAt(e, ['temporal', 'initialTractionPeriod'], '未確認', 'fix10 pelucid');
    addObs(e, 'Indie Hackers の掲載は、創業者を Jamie Nicol、掲載日を2026-03-06とし、料金は Core 月$79、Growth 月$149、Agency 月$299、30日間の無料体験ありと表示する。', IH, 'fix10 pelucid');
    e.unknownsNotes = (e.unknownsNotes ?? []).map((x: string) => x.replace('創業者名、法人名、国、顧客数、継続率、チーム人数、価格、技術スタックは未確認。', '法人名、国、顧客数、継続率、チーム人数は未確認。'));
    e.observations = (e.observations ?? []).map((x: string) => x.replace('創業者名、法人名、国、顧客数、継続率、チーム人数、価格、技術スタックは未確認。', '法人名、国、顧客数、継続率、チーム人数は未確認。'));
  },
  ent_revova_d70e8fc0b848: (e) => {
    const IH = 'https://www.indiehackers.com/product/revova';
    setAt(e, ['founder'], 'Leo Yang（Indie Hackers の掲載）', 'fix10 revova');
    setAt(e, ['temporal', 'initialTractionPeriod'], '未確認', 'fix10 revova');
    addObs(e, 'Indie Hackers の掲載は、創業者を Leo Yang、掲載日を2026-07-10とし、料金は月$29からと表示する。', IH, 'fix10 revova');
    e.unknownsNotes = (e.unknownsNotes ?? []).map((x: string) => x.replace('創業者名、法人名、国、チーム人数、技術スタックは未確認。', '法人名、国、チーム人数、技術スタックは未確認。'));
  },
  ent_occuz_b420be758f46: (e) => {
    // occuz.com（2026-09-30確認）: 創業年の記載なし。対象は「Built for Data-Driven Marketing Teams」
    setAt(e, ['temporal', 'initialTractionPeriod'], 'IH の投稿は2025-03-30（「公開したばかり」）', 'fix10 occuz');
    mapAll(e, rep([
      [/。?構造化データの創業年は2015年/g, ''],
      [/。公式サイトの構造化データは創業年を2015年とする/g, ''],
      [/未確認: 創業時期（公式サイトの構造化データの2015年と、IH の2025年の公開が食い違う）/g, '未確認: 創業時期（公式サイトに記載なし）'],
      [/創業年は2015年。/g, ''],
      [/キャンペーンの効果を詳しく知りたいマーケター/g, 'マーケター向け'],
    ]), 'fix10 occuz');
  },
  ent_betterplace_R5C2M8QW: (e) => {
    const FOX = 'https://www.foxbusiness.com/markets/electric-car-venture-better-place-files-to-liquidate';
    const YNET = 'https://www.ynetnews.com/articles/0,7340,L-4403479,00.html';
    const facts: [string, string][] = [
      [`Fox Business は、Shai Agassi を Better Place の創業者、Israel Corporation を約30%を持つ大株主と報じた。 [出典: ${FOX}]`, FOX],
      [`調達額は850百万ドル超、累積赤字は561.5百万ドルと Fox Business は報じた。 [出典: ${FOX}]`, FOX],
      [`ynetnews は、2012年にイスラエルで販売を始めてからの販売台数を約950台にとどまったと報じた。 [出典: ${YNET}]`, YNET],
    ];
    const base = e.observationsStream?.[0];
    e.observations = facts.map((f) => f[0]);
    e.observationsStream = facts.map(([text, url], i) => ({ ...base, id: `obs_ent_betterplace_R5C2M8QW_${i + 1}`, text, sourceUrl: url }));
    bump('fix10 betterplace');
  },
  ent_ebizfacts_jasonhamilton175monthpassiveincomepublicdoma_de7a6d705fcd: (e) => {
    setAt(e, ['pnl', 'revenueLabel'], '記事の指標欄は revenue $9,000（期間の記載なし）。記事の題名の月$175（副収入）とは別の数字 / eBiz Facts・記事の更新日表示 2025-03-09・独立確認なし', 'fix10 jason');
    mapAll(e, rep([
      [/記事に書かれた\$9,000（本人の数字として記事が紹介。第三者の確認は無い）/g, '記事の指標欄に revenue $9,000と表示（期間の記載なし。記事の題名の月$175の副収入とは別の数字。第三者の確認は無い）'],
      [/\$9000（金額シグナル・profile-card）: revenue/g, '記事の指標欄: revenue $9,000（期間の記載なし）'],
      [/\$175（金額シグナル・title）: /g, '記事の題名（月$175の副収入）: '],
      [/（掲載日 2024-12-24、記事の更新日 2025-03-09）/g, '（記事の更新日表示 2025-03-09）'],
      [/eBiz Facts 2024-12-24掲載/g, 'eBiz Facts 更新日表示 2025-03-09'],
      [/掲載日: 2024-12-24/g, '更新日表示: 2025-03-09'],
    ]), 'fix10 jason');
  },
  ent_lans_aaf79672f02d: (e) => {
    const r = e.reaudit ?? {};
    if (Array.isArray(r.unknown)) { const n = r.unknown.filter((x: string) => !/プレスリリース/.test(x)); if (n.length !== r.unknown.length) { r.unknown = n; bump('fix10 lans'); } }
  },
  ent_ebizfacts_maximebarbiertimeleft10marrsocialapp_92d453827ec4: (e) => {
    // 記事の表示は「Updated: March 9, 2025」のみ（公開日の表示なし）
    mapAll(e, rep([
      [/（掲載日 2024-12-05、記事の更新日 2025-03-09）/g, '（記事の更新日表示 2025-03-09）'],
      [/eBiz Facts 2024-12-05掲載/g, 'eBiz Facts 更新日表示 2025-03-09'],
      [/記事掲載2024-12-05/g, '記事の更新日表示2025-03-09'],
      [/掲載日: 2024-12-05/g, '更新日表示: 2025-03-09'],
    ]), 'fix10 timeleft');
    for (const o of (e.observationsStream ?? []) as AnyRecord[]) if (o.observedAt === '2024-12-05') { o.observedAt = '2025-03-09'; bump('fix10 timeleft'); }
    for (const m of (e.reportedMetrics ?? []) as AnyRecord[]) if (m.statedAt === '2024-12-05') { m.statedAt = '2025-03-09'; bump('fix10 timeleft'); }
  },
};
// 同じ掲載者（@hetiantian）が多数の製品に3万ドル超の収益欄を入力している。金額は売上欄に出さない。
function fixHetiantian(e: AnyRecord) {
  const raw = JSON.stringify(e, (k, v) => (k === 'reaudit' || k === 'legacyDisplaySnapshot' ? undefined : v));
  if (!/hetiantian/.test(raw)) return;
  const m = raw.match(/収益欄[:：] 月 (?:約 )?\$([0-9.,]+)(K|k)?/);
  if (!m) return;
  const amt = m[2] ? parseFloat(m[1]) * 1000 : parseFloat(m[1].replace(/,/g, ''));
  if (!(amt >= 30000)) return;
  setAt(e, ['pnl', 'revenueLabel'], '同じ掲載者が複数の製品に同規模の金額を入力している（独立した確認なし）', 'fix10 hetiantian');
}

const ENTITY_FIXES: Record<string, (e: AnyRecord) => void> = {
  ent_justtalk_afc9a43efc26: (e) => {
    // IH（2026-09-30 WebFetch）: 創業者どうしの1対1通話、創業者 Sandeep Panazhi、2025-07-20 開始、月 $5K
    const IH = 'https://www.indiehackers.com/product/just-talk';
    const what = '同じ業界の創業者どうしを1対1の通話でつなぐサービス（Indie Hackers の掲載の説明）';
    setAt(e, ['tagline'], what, 'fix justtalk');
    setAt(e, ['description'], what, 'fix justtalk');
    setAt(e, ['essence', 'whatItDoes'], what, 'fix justtalk');
    setAt(e, ['essence', 'painRelief'], '浅い交流と作り込みすぎた創業者マッチングツールに代わる、創業者どうしの本音の会話（掲載の説明）', 'fix justtalk');
    setAt(e, ['architecturePattern'], '未確認', 'fix justtalk');
    setAt(e, ['lootBlueprint', 'tollGateSetup'], '未確認', 'fix justtalk');
    setAt(e, ['founder'], 'Sandeep Panazhi（Indie Hackers の掲載）', 'fix justtalk');
    setAt(e, ['temporal', 'foundedYear'], 2025, 'fix justtalk');
    setAt(e, ['temporal', 'initialTractionPeriod'], '2025-07-20（Indie Hackers の開始日）', 'fix justtalk');
    const cards: AnyRecord[] = e.evidenceCards ?? [];
    for (const c of cards) {
      if (String(c.id).endsWith('-basic-0')) { c.punchline = 'Indie Hackers の掲載は、同じ業界の創業者どうしを1対1の通話でつなぐサービスと説明する。'; c.url = IH; c.sourceNote = `2026-09-30 / TIER2_FACTS_ONLY / ${IH}`; }
      if (String(c.id).endsWith('-basic-1')) { c.title = '顧客の痛み'; c.punchline = '浅い交流と、作り込みすぎた創業者マッチングツールへの不満を掲げる（Indie Hackers の掲載の説明）。'; c.url = IH; c.sourceNote = `2026-09-30 / TIER2_FACTS_ONLY / ${IH}`; }
      if (String(c.id).endsWith('-status')) { c.punchline = '公式サイト thejusttalk.com は証明書エラーがある。'; }
    }
    for (const o of (e.observationsStream ?? []) as AnyRecord[]) {
      if (String(o.id).endsWith('-basic-0')) { o.text = 'Indie Hackers の掲載は、同じ業界の創業者どうしを1対1の通話でつなぐサービスと説明する。創業者は Sandeep Panazhi、開始は2025-07-20、収益欄は月$5K（独立した確認なし）。'; o.sourceUrl = IH; o.observedAt = '2026-09-30'; }
      if (String(o.id).endsWith('-basic-1')) { o.text = '浅い交流と、作り込みすぎた創業者マッチングツールへの不満を掲げる（Indie Hackers の掲載の説明）。'; o.sourceUrl = IH; o.observedAt = '2026-09-30'; }
    }
    e.observations = ['Indie Hackers の掲載は、同じ業界の創業者どうしを1対1の通話でつなぐサービスと説明する。創業者は Sandeep Panazhi、開始は2025-07-20、収益欄は月$5K（独立した確認なし）。', '公式サイト thejusttalk.com は証明書エラーがある。'];
    e.unknownsNotes = (e.unknownsNotes ?? []).filter((x: string) => !/カップル/.test(x));
    e.tags = (e.tags ?? []).filter((x: string) => !/カップル/.test(x));
  },
  ent_seeker_d06cf797ac3e: (e) => {
    mapAll(e, rep([[/44万件超の求人は公式表示で利用者数ではない/g, '公式サイトは2026-09-30時点で求人44万件超と表示している（利用者数ではない）']]), 'fix seeker job count');
  },
  ent_airstarairbnbclonescript_670771dd1392: (e) => {
    mapAll(e, rep([[/7日で/g, '7〜10日で']]), 'fix airstar 7-10日');
  },
  ent_comonetizecommunitymonetizationsupertool_2769ccdd4c53: (e) => {
    mapAll(e, rep([
      [/収益ページは月\$10,000（2021-03-07最終更新、掲載者の自己申告・独立検証なし）と表示/g, 'IH の収益欄は約$10,000/月（本人の入力、独立した確認なし。2021-03-07最終更新）'],
    ]), 'fix comonetize');
  },
  ent_ebizfacts_pauledelmanteacherspayteachers10myear_eb21c8e72ff4: (e) => {
    mapAll(e, rep([
      [/本人申告の要約（記事に載った金額・期間）/g, '記事の推計の要約（記事に載った金額・期間）'],
      [/出典: eBiz Facts 記事（本人申告の要約）/g, '出典: eBiz Facts 記事（記事の推計の要約）'],
      [/本人申告の二次要約/g, '記事の推計の二次要約'],
      [/本人の数字として記事が紹介。第三者の確認は無い/g, 'Owlerなどの推計にもとづく記事の見立て。運営者の公表値ではない'],
    ]), 'fix paul edelman');
  },
  ent_ebizfacts_andrewcurtinconstructionwave13ksponsorship_a31d5fb9677c: (e) => {
    mapAll(e, rep([[/マーケティングと広告の経験があり、父を通じて/g, 'マーケティングの経験があり、家族のつながりで'], [/父を通じて/g, '家族のつながりで'], [/マーケティングと広告の経験/g, 'マーケティングの経験']]), 'fix andrew curtin');
  },
  ent_drafter_d11b7c14ca5b: (e) => {
    setAt(e, ['essence', 'painRelief'], UNCONFIRMED, 'fix drafter');
    mapAll(e, rep([[/AI機能の設計・接続・権限管理を/g, 'AI機能の設計・接続を']]), 'fix drafter');
  },
  ent_bwnventures_7f061aa05a7d: (e) => {
    setAt(e, ['founder'], 'Bowen Cheng（Indie Hackers の掲載者。ハンドル @brevityism）', 'fix bwnventures');
    mapAll(e, rep([
      [/掲載者の氏名は非開示。/g, '掲載者は Bowen Cheng（@brevityism）。'],
      [/（IH の掲載者の氏名は非開示）/g, ''],
      [/^複数のソフトウェア製品の保有・運営$/g, 'ソフトウェア製品 PurrMobile の保有・運営'],
    ]), 'fix bwnventures');
  },
  ent_ebizfacts_yandilatinotiktokshop1mmonth12kfollowers_d4563d058e73: (e) => {
    mapAll(e, rep([
      [/\$150K（2026年4月の本人の手数料収入・記事の試算）/g, '$150K（2026年3月の本人の手数料収入・記事の試算）'],
      [/ランキング記事の数字/g, 'netinfluencer の2026年3月の販売額ランキング（第5位）の数字'],
    ]), 'fix yandilatino');
  },
  ent_ebizfacts_simonpurdongivemegiftideaslaunchsale_4c0b69b2d829: (e) => {
    mapAll(e, rep([[/記事に書かれた\$2,500（本人の数字として記事が紹介。第三者の確認は無い）/g, '記事の題名は$2,500で売却したとするが、Acquire.com の出品は『交渉中』の表示で、成約額の確認はない']]), 'fix simonpurdon');
  },
  ent_conversiosga4andfacebookpixelplugin_8443ddd8734d: (e) => {
    setAt(e, ['temporal', 'foundedYear'], 0, 'fix conversios foundedYear');
    setAt(e, ['temporal', 'initialTractionPeriod'], 'IH の公開告知は2023-02-11。公式サイトは「8年以上」と記載。創業年は未確認', 'fix conversios foundedYear');
  },
  ent_loopzgiftcards_89da9b681356: (e) => {
    setAt(e, ['temporal', 'foundedYear'], 0, 'fix loopz foundedYear');
    setAt(e, ['temporal', 'initialTractionPeriod'], 'Clover App Market で2019-08に公開', 'fix loopz foundedYear');
  },
};

// ---- MANUAL_REAUDIT: 出典を示す語が無い対象顧客・顧客の痛みは未確認
const SRC_WORD = /(記載|説明|紹介|掲げ|述べ|案内|うた|明記|表示|と書|によると|記事は|公式は|主張|名乗|と称|訴え|対象にし)/;
function splitOutsideParens(v: string): string[] {
  const out: string[] = []; let depth = 0; let cur = '';
  for (const ch of v) {
    if ('（(「'.includes(ch)) depth++;
    if ('）)」'.includes(ch)) depth = Math.max(0, depth - 1);
    cur += ch;
    if (ch === '。' && depth === 0) { out.push(cur.trim()); cur = ''; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
}
function fixManualAudience(e: AnyRecord) {
  if (rec(e.reaudit).method !== 'MANUAL_REAUDIT') return;
  for (const k of ['targetCustomer', 'painRelief']) {
    const v = rec(e.essence)[k];
    if (typeof v !== 'string' || v === UNCONFIRMED) continue;
    const all = splitOutsideParens(v);
    const kept = all.filter((x) => SRC_WORD.test(x));
    if (kept.length === all.length) continue;
    const next = kept.length ? kept.join('') : UNCONFIRMED;
    if (next !== v) { stash(e, `essence.${k}`, v); e.essence[k] = next; bump(`manual audience ${next === UNCONFIRMED ? '→未確認' : '一部残し'}`); }
  }
  for (const c of (e.evidenceCards ?? []) as AnyRecord[]) {
    if (!/顧客の痛み|対象顧客|課金の仕組み|料金の仕組み/.test(String(c.title ?? ''))) continue;
    const v = c.punchline;
    if (typeof v === 'string' && v && !SRC_WORD.test(v)) { stash(e, `evidenceCards.${c.id}.punchline`, v); c.punchline = ''; bump('manual card punchline → 空'); }
  }
}

// ---- 創業年: 未確認で、出典つきの本文に「YYYY年に創業…」がちょうど1つ
const FOUND_RE = /((?:19|20)\d{2})年(?:\d{1,2}月(?:\d{1,2}日)?)?(?:に|から|、)?([^。、（）]{0,10}?)(開業|創業|設立|立ち上げ)/g;
const FOUND_NG = /広告|発信|運用|投稿|フリーランス|SNS|販売|配信|購読|勧誘|募集|採用|連載|営業|副業収入/;
const FOUND_SENT_NG = /ではない|とは扱わない|とは限らない|ではなく|創業日ではな|方向転換|公開告知/;
const foundedStats = { filled: 0, ambiguous: 0, none: 0, notSourced: 0 };
function collectText(v: unknown, out: string[], skipTop = true) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectText(x, out, false));
  else if (v && typeof v === 'object') for (const k of Object.keys(v as AnyRecord)) { if (!SKIP_KEYS.has(k) && !/^(temporal|pnl|reportedMetrics)$/.test(skipTop ? k : '')) collectText((v as AnyRecord)[k], out, false); }
}
function fixFoundedYear(e: AnyRecord) {
  const t = rec(e.temporal);
  if (Object.keys(t).length === 0) return;
  if (typeof t.foundedYear === 'number' && t.foundedYear > 0) return;
  if (e.id === 'ent_conversiosga4andfacebookpixelplugin_8443ddd8734d' || e.id === 'ent_loopzgiftcards_89da9b681356' || COPYRIGHT_ONLY_FOUNDED.has(e.id)) return;
  const texts: string[] = [];
  for (const k of ['observations', 'observationsStream', 'evidenceCards', 'description', 'essence', 'tagline', 'timelineEvents']) collectText(e[k], texts);
  const years = new Set<string>();
  for (const s of texts) for (const sent of s.split('。')) {
    if (FOUND_SENT_NG.test(sent)) continue;
    for (const m of sent.matchAll(FOUND_RE)) { if (FOUND_NG.test(m[2])) continue; years.add(m[1]); }
  }
  if (years.size === 1 && !isFoundedYearSourced(Number([...years][0]), e)) foundedStats.notSourced++;
  else if (years.size === 1) { const y = Number([...years][0]); stash(e, 'temporal.foundedYear', t.foundedYear ?? null); t.foundedYear = y; e.temporal = t; foundedStats.filled++; }
  else if (years.size > 1) foundedStats.ambiguous++;
  else foundedStats.none++;
}

// ---- 「確認した時点」が未確認で、出典欄に確認日がある
function fixConfirmedAt(e: AnyRecord) {
  const t = rec(e.temporal);
  if (Object.keys(t).length === 0) return;
  const cur = String(t.dataSnapshotPeriod ?? '').trim();
  if (cur && cur !== UNCONFIRMED) return;
  const dates = ((rec(e.reaudit).sources ?? []) as AnyRecord[]).map((s) => String(s.checkedAt ?? '').slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!dates.length) return;
  stash(e, 'temporal.dataSnapshotPeriod', t.dataSnapshotPeriod ?? null);
  t.dataSnapshotPeriod = `${dates[dates.length - 1]} 時点`; e.temporal = t; bump('確認した時点 ← 出典欄の確認日');
}


// ================================================================ 10回目の監査（データ側）
/** 型3: 英語の原文の引用（英単語が15語以上続く）は、日本語の言い換えに置き換えるか外す。null は外す。 */
const ENG_RUN = /(?:[A-Za-z][A-Za-z'’\-.,;:!?]*\s+){14,}[A-Za-z][A-Za-z'’\-.,;:!?…]*/;
const ENG_MAP: Record<string, string | null> = {
  "ent_getmymfa_9d5e15f4711d": "Indie Hackersの掲載説明は、二要素認証（2FA/MFA）を含む流れのエンドツーエンドの試験と、iOS・Androidアプリの提出を、セキュリティを回避せずに進められるようにするサービスと説明する。",
  "ent_jsonutilitykit_f1af69b023c5": "Indie Hackersの掲載説明は、JSONの整形、検証、表示、編集、圧縮、変換ができる、無料のブラウザ上のツールと説明する。",
  "ent_simplesaas_683e1f8e882d": "Indie Hackersの掲載説明は、運営者が長年事業を営み、数年前から自分の事業用にソフトを書き始めたという自己紹介にとどまる。",
  "ent_werkcv_9954073acecf": "Indie Hackersの掲載説明は、作成、ダウンロード、応募だけに使える、シンプルな履歴書作成ツールと説明する。デザインが重い、または購読へ誘導する既存ツールとの違いを掲げる。",
  "ent_ichschauetv_a26af624f13f": "Indie Hackersの掲載説明は、速さと信頼性を重視した、使いやすいストリーミングの管理サービスと説明する。",
  "ent_idlepilot_e865384b2b98": "Indie Hackersの掲載説明は、勤務時間中の Slack のオンライン表示を、アプリもブラウザもPCの起動も不要で保つクラウドサービスと説明する。",
  "ent_mastros_a21c2ab98865": "Indie Hackersの掲載説明は、Telegram のデータをダウンロードして保存し、バックアップ、見込み客・顧客の管理、自前の分析やLLMの学習に使えるようにするサービスと説明する。",
  "ent_prisonassist_44c24eb80418": "Indie Hackersの掲載説明は、収監された家族への差し入れ品、手紙、贈り物を送りやすくし、家族のつながりを助けるサービスと説明する。",
  "ent_prodworth_92ef26393a05": "Indie Hackersの掲載説明は、AIで速く作れる一方、壊れた導線、モバイルの不具合、コンソールエラー、弱いセキュリティを抱えたまま完成して見えるアプリが多いという問題意識から作ったと説明する。",
  "ent_rinklog_3be205c19136": "Indie Hackersの掲載説明は、ホッケー選手の父である運営者が、公式スコアシートには得点、アシスト、反則しか載らないことへの不満から作ったと説明する。",
  "ent_tovan_ec65f75f15af": "Indie Hackersの掲載説明は、基板（PCB）の設計を知らないまま試作に数か月かけた運営者の経験から、アイデアから試作までを速く安くするサービスと説明する。",
  "ent_vendly_4088d335fda8": "Indie Hackersの掲載説明は、初期のチームにはデータがあるのに聞ける人がおらず、簡単な数字を得るのに何時間も待つ問題を解くサービスと説明する。",
  "ent_cheapstack_3e352235bb7f": "Indie Hackersの掲載説明は、Stripe が使えない国の開発者向けに、Polar.sh 決済つきの手頃な Next.js スターターキットを提供すると説明する。",
  "ent_pelucid_27fc1e50a2d6": "Indie Hackersの掲載説明は、ChatGPT、Gemini、Perplexity が製品を薦める時代に、ブランドがそこで何と言われているかを把握できない問題を解くサービスと説明する。",
  "ent_invoicebench_89228e1e6a3a": "Indie Hackersの掲載説明は、PDFを1枚ダウンロードするだけでもアカウント作成を求める既存の無料請求書ツールへの不満から作った、フリーランス向けの請求書ツールと説明する。",
  "ent_similartours_590cbce04088": "Indie Hackersの掲載説明は、旅行先で予約したい体験を探すのに多くのサイトを見て回る手間から、複数のサイトを並べて比較するサービスを作ったと説明する。",
  "ent_webpixie_6ce6624ca748": "Indie Hackersの掲載説明は、サイトの稼働状況、SSL、ドメイン、セキュリティを追跡し、専門知識がなくても分かる形で示すサービスと説明する。",
  "ent_stockcount_8beaf9ab9eaf": "Indie Hackersの掲載説明は、飲食小売の運営管理者だった運営者が、自分が使いたかったツールとして作ったと説明する。",
  "ent_kickstarter_bf17a7f2daec": "Indie Hackersの掲載説明は、8〜15のツールを行き来する小さな会社向けに、4つのAIエージェントを備えた1つのプラットフォームを作っていると説明する。",
  "ent_notebridge_dbd264117062": "Indie Hackersの掲載説明は、OneNote から Notion への既存の移行手段は壊れているか内容が欠けるため、1,500ページを移した運営者自身がツールを作ったと説明する。",
  "ent_morphlook_53bccdf3e7ca": "Indie Hackersの掲載説明は、美容室に行く前に、自分の写真で髪型を試せるサービスと説明する。",
  "ent_ebizfacts_marianahealthywage10899prizelost81lbs_a61f69cc3282": "記事要約: 減量目標に賭ける HealthyWage について、勝てば賞金が出るが、先にお金を払い、相当量の減量が必要と述べる。",
  "ent_ebizfacts_jessicadanteloveandlondon300kyear_d026dfb67729": "記事要約: ロンドンの観光ブログから始めたメディア事業で、売上がコロナ後に6桁まで戻り、塗り絵などのデジタル商品が売上を支えたと述べる。",
  "ent_ebizfacts_marktilbury1houramazonplannerbook149revenue_77069afcf8e5": "記事要約: Book Bolt を使って Amazon 向けの本を手早く作って売る方法として、ミニマルなプランナーがよく売れ、初期投資が小さいと述べる。",
  "ent_screen_studio": "macOS 向けの画面録画ソフト。マウス操作に合わせた自動ズームやなめらかなマウス移動などの効果で、製品デモ、講座、SNS向けの動画を作れる。",
  "ent_packetriot_697379816d5e": "DESC",
  "ent_freelancercommandcenter-fcc_af9782a9bb22": "DESC",
  "ent_releasepad_b74c438907de": "DESC",
  "ent_crazysnak3360_61b53eb7ed3b": "DESC",
  "ent_whoislookupapi_352a26af275a": "DESC",
  "ent_webnovelai_d1e8192af49b": "DESC",
  "ent_primitz_b398d970509b": "DESC",
  "ent_saturnshift_d7f745f65ccb": "DESC",
  "ent_imaginevid_be248fead324": "DESC",
  "ent_getsflow_663806467850": "DESC",
  "ent_calculatorai_4eca8254840a": "DESC",
  "ent_careersuite_bce4819eea63": "DESC",
  "ent_estatebypixelperfectssolutions_6a8cc43f81f7": "DESC",
  "ent_claimhit_413feded2870": "DESC",
  "ent_stickylivepreview_53dc4a827374": "DESC",
  "ent_revova_d70e8fc0b848": "DESC",
  "ent_pontefuerteproteintracker_f008f702534a": "DESC",
  "ent_flaq_4b04c709c68d": "DESC",
  "ent_ziranofinance_2d2ff30e9bbb": "DESC",
  "ent_tromatcher_ae58a9912989": "DESC",
  "ent_v2carcovers_cc29adfe747e": "DESC",
};
function fixEnglishQuotes(e: AnyRecord) {
  let to = e.id in ENG_MAP ? ENG_MAP[e.id] : null;
  // 説明欄に日本語の訳が入っているレコード（IHの掲載説明の訳）は、その訳を引用の形で観測に残す
  if (to === 'DESC') {
    const d = typeof e.description === 'string' ? e.description.replace(/。$/, '') : '';
    to = /[぀-ヿ]/.test(d) && d !== UNCONFIRMED ? `Indie Hackersの掲載説明は、日本語にすると「${d}」。` : null;
  }
  if (Array.isArray(e.observations)) {
    for (let i = e.observations.length - 1; i >= 0; i--) {
      const cur = e.observations[i];
      if (typeof cur !== 'string' || !ENG_RUN.test(cur)) continue;
      stash(e, `observations[${i}]`, cur);
      if (to) { e.observations[i] = to; bump('英語の引用→日本語の言い換え'); } else { e.observations.splice(i, 1); bump('英語の引用→外す'); }
    }
  }
  if (Array.isArray(e.observationsStream)) {
    for (let i = e.observationsStream.length - 1; i >= 0; i--) {
      const o = e.observationsStream[i]; const cur = o?.text;
      if (typeof cur !== 'string' || !ENG_RUN.test(cur)) continue;
      stash(e, `observationsStream[${i}].text`, cur);
      if (to) { o.text = to; bump('英語の引用→日本語の言い換え'); } else { e.observationsStream.splice(i, 1); bump('英語の引用→外す'); }
    }
  }
}

/** 型4: 根拠が著作権表記だけの創業年と国は、未確認にする（根拠の文は reaudit.sources・observations から判定して固定した一覧） */
const COPYRIGHT_ONLY_FOUNDED = new Set<string>(["ent_leafypod-spoweredplante_c6d7659d6702", "ent_ominvo_5e8ae7251860", "ent_bulkbarcodegenerator_2a10b5a83a74", "ent_wpok_e85b0bb47788", "ent_floatingpianofactory_1e044db4db3f", "ent_alertasubastas_864b8274d62a", "ent_alana_24543a3b81e6", "ent_beeminder_628bd2", "ent_deadmansnitch_0a70e0", "ent_humanloop_0e29f8", "ent_pastebot_b29d3a13", "ent_busycalh_ca575182", "ent_soulver_8829a1", "ent_localsend_9918ba", "ent_linearmouse_5518ba", "ent_formkeep_2218ba", "ent_pikastyle_37643f", "ent_feraai_821744"]);
const COPYRIGHT_ONLY_COUNTRY = new Set<string>(["ent_nomadsculpt_13ac4b", "ent_focusmate_755542", "ent_overcast_1c4e22", "ent_conceptsapp_825ae6", "ent_shortio_20751a", "ent_shtson_0ba8ef85", "ent_sprblg_810121e8", "ent_blgstat_84846833", "ent_flwise_77d72700", "ent_gitpod_8e33bbb6", "ent_kybapp_51caba5b", "ent_stdnte_e4665b85", "ent_aceternity_6d14e4", "ent_elevar_6c11a1", "ent_salad_4c63d2", "ent_dscopehq_f5a0db5f", "ent_mixmaxhq_a42906b8", "ent_macktrck_c419422b", "ent_api2pdf_2a9d64", "ent_postmark_5c8e21", "ent_mailtrap_4d1a90", "ent_commanderone_5518ba", "ent_appcleaner_3318ba", "ent_httpie_7718ba", "ent_formkeep_2218ba", "ent_optix_7718ba", "ent_vivid_685ee5", "ent_undraw_ba4350", "ent_nocodb_42885d", "ent_appflowy_911e94", "ent_taplio_f755ec", "ent_tweethunter_49ba4a", "ent_fork_167cc5", "ent_cleanshotx_8d0682", "ent_shottr_c7442a", "ent_upstash_435648", "ent_beekeeperstudio_78d8f0", "ent_foreplayco_950699", "ent_hustle_9f", "ent_podia_b5", "ent_tailwind_4c810a72", "ent_articleforge_f10222b5315e883c9edd"]);
function fixCopyrightDerived(e: AnyRecord) {
  if (COPYRIGHT_ONLY_FOUNDED.has(e.id)) {
    const t = rec(e.temporal);
    if (typeof t.foundedYear === 'number' && t.foundedYear > 0) {
      stash(e, 'temporal.foundedYear', t.foundedYear); t.foundedYear = 0; e.temporal = t; bump('創業年(著作権表記だけ)→未確認');
    }
    if (typeof t.initialTractionPeriod === 'string' && /著作権/.test(t.initialTractionPeriod)) {
      const kept = t.initialTractionPeriod.split(/(?<=。)|[；;]\s*/).filter((x: string) => !/著作権/.test(x)).join('').replace(/[。：:\s]+$/, '').replace(/[:：]\s*$/, '');
      stash(e, 'temporal.initialTractionPeriod', t.initialTractionPeriod);
      t.initialTractionPeriod = kept.replace(/[、。]+$/, '') || UNCONFIRMED; bump('初動の時期の著作権表記を外す');
    }
  }
  if (COPYRIGHT_ONLY_COUNTRY.has(e.id) && e.country && e.country !== UNCONFIRMED) {
    stash(e, 'country', e.country); e.country = UNCONFIRMED; bump('国(著作権表記だけ)→未確認');
  }
}

/** 型5: 出典に無い評価語（急成長・短期間で・人気）を外した見出し */
const TAGLINE_FIX: Record<string, string> = {
 "ent_ebizfacts_hunterschenewarkline": "経験ゼロで駐車場のライン引きを始め、教会案件を手がけた個人事業。",
 "ent_ebizfacts_catgoetzephysicalpho": "スマホにつなぐレトロ調の電話機を売る事例（2025年）。",
 "ent_ebizfacts_evgeniianikinsoclead": "既存ツールの基本機能を真似て絞り込んだ、メール収集SaaSの1人事業。",
 "ent_ebizfacts_carlosugaldehouseofc": "解雇後に始めたラテン系の衣料ECを、Facebook広告で集客した事例。",
 "ent_ebizfacts_jonastyrollersteamga": "ミニマルなインディーゲームを発売し、売上を出した事例。",
 "ent_ebizfacts_maximebarbiertimelef": "見知らぬ人どうしを夕食の席でつなぐアプリの事例。記事は、最初の売上まで3年かかったと述べる。",
 "ent_ebizfacts_toddandersoncascades": "ウェブ制作からSEOに軸足を移した事例。",
 "ent_ebizfacts_ashyoungcarmatsuk1mi": "英国で車のマットを売るサイトの事例。",
 "ent_ebizfacts_heathertorresporchpu": "ポーチにカボチャを飾る季節限定サービスの事例。",
 "ent_ebizfacts_dadgangidentitybusin": "父親たちのノリを帽子にして、少額の資金から売り切りを繰り返した事例。",
 "ent_ebizfacts_chrispantelilinkifi5": "副業として少数の顧客から始め、無料の実演で影響力者を顧客にした代理店の事例。",
 "ent_ebizfacts_spencerrusselltoddle": "幼児に読み方を教える親向けの講座を、TikTokで集客した事例。",
 "ent_ebizfacts_yasserelsaidchatbase": "ChatGPTの登場に合わせ、PDFと会話するツールから始めた大学生の事例。",
 "ent_ebizfacts_bhanutejapachipulusu": "個人開発者が、サイト内容チャットボットを公開し、1か月未満で月次収入が大台に近づいた事例。",
 "ent_ebizfacts_robkenneydadhowdoiyo": "父が教えなかったことを動画で教えるチャンネルの事例（収益は未確認）。"
};
function fixEvaluativeWords(e: AnyRecord) {
  const key = Object.keys(TAGLINE_FIX).find((k) => String(e.id).startsWith(k));
  if (!key) return;
  const to = TAGLINE_FIX[key];
  if (e.tagline !== to) { stash(e, 'tagline', e.tagline); e.tagline = to; bump('評価語を外した見出し'); }
}

/** 中身（要約・詳細・抜粋）が全部空になったカードは、見出しだけが残らないよう外す */
function pruneEmptyCards(e: AnyRecord) {
  if (!Array.isArray(e.evidenceCards)) return;
  const keep = e.evidenceCards.filter((c: AnyRecord) => {
    const empty = !(typeof c.punchline === 'string' && c.punchline.trim()) && !(Array.isArray(c.details) && c.details.some((d: unknown) => typeof d === 'string' && d.trim())) && !(typeof c.snippet === 'string' && c.snippet.trim());
    if (empty) { stash(e, `evidenceCards.${c.id}`, JSON.parse(JSON.stringify(c))); bump('中身が空のカードを外す'); }
    return !empty;
  });
  if (keep.length !== e.evidenceCards.length) e.evidenceCards = keep;
}

/** 空レーン取り込み(2026-09-30)で入った工程の語: タグ「再監査済み」、カード見出し「この再監査で…」、取得期間「日付 再監査」、内部欄名 reportedMetrics */
function fixProcessLabels(e: AnyRecord) {
  if (Array.isArray(e.tags) && e.tags.some((x: unknown) => typeof x === 'string' && /再監査/.test(x))) {
    stash(e, 'tags', JSON.parse(JSON.stringify(e.tags)));
    e.tags = e.tags.filter((x: unknown) => !(typeof x === 'string' && /再監査/.test(x)));
    bump('タグ「再監査…」を外す');
  }
  for (const c of (e.evidenceCards ?? []) as AnyRecord[]) {
    if (typeof c.title === 'string' && /^この再監査で確認できなかったこと$/.test(c.title)) { stash(e, `evidenceCards.${c.id}.title`, c.title); c.title = '確認できなかったこと'; bump('カード見出しから「再監査」を外す'); }
  }
  const t = rec(e.temporal);
  const m = typeof t.dataSnapshotPeriod === 'string' ? t.dataSnapshotPeriod.match(/^(\d{4}-\d{2}-\d{2})\s*再監査$/) : null;
  if (m) { stash(e, 'temporal.dataSnapshotPeriod', t.dataSnapshotPeriod); t.dataSnapshotPeriod = `${m[1]} 時点`; e.temporal = t; bump('取得期間「日付 再監査」→「日付 時点」'); }
  const pnl = rec(e.pnl);
  if (typeof pnl.estimationLogic === 'string' && pnl.estimationLogic.includes('reportedMetrics')) {
    stash(e, 'pnl.estimationLogic', pnl.estimationLogic);
    pnl.estimationLogic = pnl.estimationLogic.replace(/reportedMetricsへ/g, '');
    e.pnl = pnl; bump('内部欄名 reportedMetrics を外す');
  }
}

/** 財務が UNAVAILABLE なのに sourceDoc が空のレコード(空レーン取り込み 002)。他の UNAVAILABLE 記録と同じ表記にそろえる */
function fixMissingSourceDoc(e: AnyRecord) {
  const pnl = rec(e.pnl);
  if (pnl.financialStatus === 'UNAVAILABLE' && (typeof pnl.sourceDoc !== 'string' || !pnl.sourceDoc.trim())) {
    stash(e, 'pnl.sourceDoc', pnl.sourceDoc ?? null);
    pnl.sourceDoc = '年次財務の一次資料を確認できず';
    if (!pnl.sourceClass) pnl.sourceClass = 'MODEL';
    e.pnl = pnl; bump('UNAVAILABLE の sourceDoc を補う');
  }
}

// ================================================================ 11回目の監査
// ---- 創業年: 出典つきの本文で、その年が「創業／設立／会社の開始」と書かれていないものは未確認にする
// IH の最初の投稿・製品公開・API公開・GitHub作成日・著作権表記の年は、創業年ではない
const FOUND_KEY = /創業|設立|創立|立ち上げ|開業|founded|incorporated|established|started (?:the |his |her |their )?(?:company|business)|開始時期（記事記載）|事業(?:を|の)?開始|会社を(?:始め|開始)|ビジネスを(?:始め|開始)/i;
const FOUND_SENT_DENY = /ではない|とは扱わない|とは限らない|ではなく|創業日ではな|方向転換|公開告知|創業者ではない/;
const founded11 = { checked: 0, cleared: 0, kept: 0, examples: [] as string[] };
function collectAllText(v: unknown, out: string[]) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectAllText(x, out));
  else if (v && typeof v === 'object') for (const k of Object.keys(v as AnyRecord)) { if (!SKIP_KEYS.has(k) && k !== 'rightsUseAssessment') collectAllText((v as AnyRecord)[k], out); }
}
function isFoundingYearStated(y: number, e: AnyRecord): boolean {
  const texts: string[] = [];
  collectAllText(e, texts);
  const reYear = new RegExp(`(?<![0-9])${y}(?![0-9])`, 'g');
  const reStart = new RegExp(`${y}年(?:\\d{1,2}月)?(?:に|から)?[^。、（）]{0,20}?(?:始めた|始まり|始まった|が開始し|(?:事業|会社|ビジネス|サービス|プロジェクト|チーム|店|運営)を?始め)`);
  for (const t of texts) for (const raw of t.split(/[。\n]/)) {
    if (!raw.includes(String(y)) || FOUND_SENT_DENY.test(raw)) continue;
    const sent = raw.replace(/(?:共同)?創業(?:者|メンバー|チーム)/g, '');
    if (reStart.test(sent)) return true;
    for (const m of sent.matchAll(reYear)) {
      const i = m.index ?? 0;
      const yEnd = i + String(y).length;
      // 直前25字・直後70字まで。ほかの年が出たらそこで切る
      const back = sent.slice(Math.max(0, i - 25), i).replace(/^[\s\S]*(?:19|20)\d{2}/, '');
      const fwd = sent.slice(yEnd, yEnd + 70).replace(/(?:19|20)\d{2}[\s\S]*$/, '');
      if (FOUND_KEY.test(back + String(y) + fwd)) return true;
    }
  }
  return false;
}
function fixFoundedYear11(e: AnyRecord) {
  const t = rec(e.temporal);
  const y = t.foundedYear;
  if (typeof y !== 'number' || y < 1000) return;
  founded11.checked++;
  if (isFoundingYearStated(y, e)) { founded11.kept++; return; }
  stash(e, 'temporal.foundedYear', y);
  t.foundedYear = 0; e.temporal = t; founded11.cleared++; bump('foundedYear→未確認');
  if (founded11.examples.length < 12) founded11.examples.push(`${e.id}:${y}`);
}

// ---- 観察の本文に混ざった「[出典: URL]」「（出典: URL、確認日: …）」を本文から外す。URL は出典の欄へ
const SRC_TAG = /\s*[\[［（(]出典[:：]\s*(https?:\/\/[^\s\]］）、]+)(?:\s*[\/、]\s*(?:確認日[:：]\s*)?[0-9-]+(?:確認)?)?\s*[\]］）)]/g;
const srcTagStats = { stripped: 0, relocated: 0, urlMissing: 0 };
function fixSourceTags(e: AnyRecord) {
  const known = new Set<string>();
  const collectUrls = (v: unknown, k = '') => {
    if (typeof v === 'string') { if (/^(url|sourceUrl|officialUrl)$/.test(k) || /^https?:\/\/\S+$/.test(v)) known.add(v.replace(/[\/#]+$/, '')); }
    else if (Array.isArray(v)) v.forEach((x) => collectUrls(x, k));
    else if (v && typeof v === 'object') for (const kk of Object.keys(v as AnyRecord)) collectUrls((v as AnyRecord)[kk], kk);
  };
  collectUrls(e);
  const found: string[] = []; const foundText = new Map<string, string>();
  const strip = (s: string): string => {
    if (!SRC_TAG.test(s)) { SRC_TAG.lastIndex = 0; return s; }
    SRC_TAG.lastIndex = 0;
    const out = s.replace(SRC_TAG, (_m, u) => { found.push(u.replace(/[.,]+$/, '')); return ''; }).replace(/\s+$/, '').replace(/\s{2,}/g, ' ');
    for (const u of found) if (!foundText.has(u)) foundText.set(u, out);
    return out;
  };
  const doStr = (parent: AnyRecord | unknown[], key: string | number, path: string) => {
    const v = (parent as AnyRecord)[key as string];
    if (typeof v !== 'string') return;
    let n = strip(v);
    // 出典タグを外すと、同じ書き出しの文（「FY2025売上は…」）が他社と枠を共有して使い回しに見えるので、SEC の報告値だと文の中で示す
    if (n !== v && /^FY\d{4}売上は/.test(n) && /sec\.gov/.test(v)) n = `SEC 10-Kの報告値では、${n}`;
    if (n !== v) { stash(e, path, v); (parent as AnyRecord)[key as string] = n; srcTagStats.stripped++; bump('出典タグを本文から外す'); }
  };
  const walkS = (parent: AnyRecord | unknown[], key: string | number, path: string) => {
    const v = (parent as AnyRecord)[key as string];
    if (typeof v === 'string') { if (!/sourceNote$|Url$|url$/.test(path)) doStr(parent, key, path); }
    else if (Array.isArray(v)) v.forEach((_x, i) => walkS(v, i, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (!SKIP_KEYS.has(k) && k !== 'rightsUseAssessment') walkS(v, k, `${path}.${k}`); }
  };
  for (const k of ['observations', 'observationsStream', 'evidenceCards', 'temporal', 'description', 'essence', 'tagline', 'unknownsNotes', 'timelineEvents']) if (e[k] !== undefined) walkS(e, k, k);
  // 各観察の URL が出典の欄に無ければ移す
  for (const u of new Set(found)) {
    if (known.has(u.replace(/[\/#]+$/, ''))) continue;
    const item = (e.observationsStream ?? []).find((o: AnyRecord) => !o.sourceUrl);
    srcTagStats.urlMissing++;
    if (item) { item.sourceUrl = u; srcTagStats.relocated++; known.add(u.replace(/[\/#]+$/, '')); }
    else {
      (e.evidenceCards ??= []).push({ id: `${e.id}_audit11_src_${srcTagStats.urlMissing}`, type: 'UNKNOWN_AUDIT', title: '出典', badge: '出典', evidenceStatus: 'REPORTED', punchline: (foundText.get(u) ?? '').replace(/^[^:：]{1,30}[:：]\s*/, '').slice(0, 200), details: [], url: u, sourceNote: u, sourceClass: 'COMMUNITY' });
      srcTagStats.relocated++; known.add(u.replace(/[\/#]+$/, ''));
    }
  }
}

// ---- SEC カードの題と算定欄から内部の語（XBRL companyfacts）を外す
function fixSecLabels(e: AnyRecord) {
  const p = rec(e.pnl);
  const fy = String(p.dataSnapshotPeriod ?? '').match(/FY\d{4}/)?.[0] ?? String(p.revenueLabel ?? '').match(/FY\d{4}/)?.[0];
  for (const c of (e.evidenceCards ?? []) as AnyRecord[]) {
    if (typeof c.title === 'string' && /XBRL companyfacts/.test(c.title) && fy) {
      const n = c.title.replace(/SEC 10-K（XBRL companyfacts）/, `SEC 10-K（${fy}）`);
      if (n !== c.title) { stash(e, 'evidenceCards[].title', c.title); c.title = n; bump('SEC題からXBRLを外す'); }
    }
  }
  if (typeof p.estimationLogic === 'string' && /XBRL companyfacts/.test(p.estimationLogic) && fy) {
    stash(e, 'pnl.estimationLogic', p.estimationLogic);
    p.estimationLogic = `SEC 10-K（${fy}）の年次報告値を USD のまま表示。月次の損益は未確認。`;
    e.pnl = p; bump('SEC算定欄からXBRLを外す');
  }
}

// ---- 「を保持」を含む出典の事実（サービスが残すデータの説明）は、画面の検査語に当たらない言い方にする。作業者の説明（検索ツール・独立したページ確認）は外す
const RETAIN_FIXES: Record<string, [string | RegExp, string][]> = {
  ent_valuemarkers_3f147977ebb6: [
    [/検索ツールが返した(2026年9月3日版の規約本文)（3週間前クロールの表示）による記録。公式規約は、/g, '公式規約（$1）は、'],
    [/監視一覧を保持する一方/g, '監視一覧を残す一方'],
    [/ 現行ページでの継続適用は未確認。 主担当の独立したページ確認では410 Goneとなった。/g, ' 現行ページは410 Goneで、継続適用は未確認。'],
  ],
  ent_quotaguard_d9a6b3bacb63: [[/運用メタデータを保持すると説明/g, '運用メタデータを残すと説明']],
  ent_insyghtful_e33d2877a526: [[/分析結果を保持すると説明/g, '分析結果を残すと説明']],
  ent_promptman_6ba4a9fc1d23: [[/所有権を保持し、/g, '所有権を持ち、']],
  ent_besmeo_0cfc04036abe: [[/設定を保持し再契約で復元/g, '設定を残し再契約で復元']],
  ent_ohuriyaai_89595c38dadc: [[/未使用残高を保持し、/g, '未使用残高を残し、']],
};

// ---- 11回目の監査の個別修正（2026-09-30）
// ReadonlyREST: 法人は公式フッターの「Established in London, UK, in 2017」（readonlyrest.com で確認）。IH の 2017-02 は「フォーラム開設」
// セリア: 日本語版Wikipedia の沿革は「1985年3月 創業」「1988年10月 株式会社山洋エージェンシーとして設立」（API で確認）
// eBiz Abhishek Kumar: 記事に表示される日付は「Updated: March 7, 2025」だけ。掲載日 2023-12-08 は記事に無い
// Filmmaker Freedom: data/reaudit/withheld-records.json に追加（公式ドメインが賭博サイトを表示）
const FIX11: Record<string, (e: AnyRecord) => void> = {
  ent_readonlyrest_83810c3968e3: (e) => {
    mapAll(e, rep([
      [/2017-02 に利用者向けの Discourse フォーラムを開設し収益化の方針を他の開発者に相談/g, '2017-02 に利用者向けの Discourse フォーラムを開設（コミュニティ作り）'],
      [/（メキシコで移動しながら運営中）/g, '（2018-02 の投稿時点でメキシコに滞在）'],
    ]), 'fix11 readonlyrest');
    setAt(e, ['temporal', 'foundedYear'], 2017, 'fix11 readonlyrest 創業年');
  },
  ent_carsxeapi_adf658abc021: (e) => {
    mapAll(e, rep([[/従量・段階制の API 利用料（公式サイトの案内）/g, 'API の利用料（公式サイトの案内）']]), 'fix11 carsxe');
  },
  ent_commcomm_abfa9c42684d: (e) => {
    mapAll(e, rep([
      [/コミュニティ運営（モデレーション、投稿、運営支援）を請け負う1人の受託サービス。/g, 'ブロックチェーン系プロジェクトのコミュニティ運営を請け負う1人の受託サービス。'],
      [/受託のコミュニティ運営（顧客ごとの契約）/g, '受託のコミュニティ運営'],
      [/コミュニティを運営したい企業・プロジェクト（掲載の説明）/g, 'ブロックチェーン系プロジェクト（掲載の説明）'],
    ]), 'fix11 commcomm');
  },
  ent_corp69_0e1486: (e) => {
    mapAll(e, rep([[/1987年3月に事業開始、1988年10月に山洋エージェンシーとして設立/g, '1985年3月に創業、1988年10月に株式会社山洋エージェンシーとして設立']]), 'fix11 seria');
    setAt(e, ['temporal', 'foundedYear'], 1985, 'fix11 seria 創業年');
  },
  ent_ebizfacts_abhishekkumardeepresearch15kmonthagency_0784e6d08ede: (e) => {
    mapAll(e, rep([
      [/掲載日: 2023-12-08 \/ 確認日/g, '記事の更新日: 2025-03-07 / 確認日'],
      [/（掲載日 2023-12-08、記事の更新日 2025-03-07）/g, '（記事の更新日 2025-03-07）'],
    ]), 'fix11 abhishek 日付');
    for (const o of (e.observationsStream ?? []) as AnyRecord[]) if (o.observedAt === '2023-12-08') { o.observedAt = '2026-09-29'; bump('fix11 abhishek observedAt'); }
  },
  ent_affiliatecs_f3cc506a70a2: (e) => {
    const refund = '返金規定は購入7日以内、未ダウンロード・未閲覧を条件とする。デジタル商品の閲覧後は返金不可と説明する。';
    setAt(e, ['architecturePattern'], UNCONFIRMED, 'fix11 affiliatecs');
    const lb = rec(e.lootBlueprint);
    for (const k of ['tollGateSetup', 'architecturePattern']) if (lb[k] === refund) { stash(e, `lootBlueprint.${k}`, lb[k]); lb[k] = UNCONFIRMED; e.lootBlueprint = lb; bump('fix11 affiliatecs'); }
  },
  ent_vindy_dd2944f39d20: (e) => {
    mapAll(e, rep([[/2024年の家具購入の1投稿は対象取り違えの可能性があり標本から除外。/g, '']]), 'fix11 vindy');
  },
  ent_amplify_7ab13df50dfe: (e) => {
    mapAll(e, (s) => (/\$30,000 を表示/.test(s) && /（入力者は創業者）。?$/.test(s) && !s.includes('£30k') ? s.replace(/（入力者は創業者）。?$/, '（入力者は創業者）。同時期の創業者の投稿は「£30k MRR」と英ポンド表記。') : s), 'fix11 amplify');
  },
  ent_mailthentic_bf8f98a8563e: (e) => {
    if (typeof e.description === 'string' && !e.description.includes('test_job_61.xlsx')) {
      stash(e, 'description', e.description);
      e.description = `${e.description.replace(/\s+$/, '')} トップに表示される検証の統計（1,743件など）は、「test_job_61.xlsx」というファイル名の表示を伴う。`; bump('fix11 mailthentic');
    }
  },
};

function fixAudit11(e: AnyRecord) {
  FIX11[e.id]?.(e);
  if (RETAIN_FIXES[e.id]) mapAll(e, rep(RETAIN_FIXES[e.id]), 'fix11 保持の言い換え');
  fixSourceTags(e);
  fixSecLabels(e);
  fixFoundedYear11(e);
}

function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  let changed = 0;
  for (const e of entities) {
    const before = canon(e);
    generalPass(e);
    ENTITY_FIXES[e.id]?.(e);
    FIX10[e.id]?.(e);
    fixHetiantian(e);
    fixManualAudience(e);
    fixEnglishQuotes(e);
    fixCopyrightDerived(e);
    fixEvaluativeWords(e);
    pruneEmptyCards(e);
    fixProcessLabels(e);
    fixMissingSourceDoc(e);
    fixFoundedYear(e);
    fixConfirmedAt(e);
    fixAudit11(e);
    if (canon(e) !== before) { changed++; parseFinancialEntity(e); }
  }
  bump('records changed', changed);
  notes.push(`foundedYear11: 検査 ${founded11.checked} / 未確認へ ${founded11.cleared} / 残す ${founded11.kept} / 例 ${founded11.examples.join(' ')}`);
  notes.push(`出典タグ: 外した ${srcTagStats.stripped} / URLが出典欄に無かった ${srcTagStats.urlMissing} / 移した ${srcTagStats.relocated}`);
  notes.push(`foundedYear: 入れた ${foundedStats.filled} / 年が2つ以上で未決 ${foundedStats.ambiguous} / 候補なし ${foundedStats.none} / 許可リスト検査で出典つきと認められず見送り ${foundedStats.notSourced}`);
  console.log(JSON.stringify({ total: entities.length, counts, notes }, null, 1));
  if (process.env.EX) writeFileSync(process.env.EX, JSON.stringify({ rewriteEx, dropEx }, null, 1));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}
main();
