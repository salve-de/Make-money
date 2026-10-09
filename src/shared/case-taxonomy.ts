/**
 * 事例のタグ（一覧の札・左の絞り込み）の言葉の一覧。正本はこのファイルだけ。
 * 画面・検査（pnpm case-tags:check）・収集（scripts/reader-case/case-research.ts）が、全部ここを読む。
 *
 * 決めごと（D-16）:
 * - タグは絞り込みに使う。事例ごとの思いつきの言葉は付けない。ここにある言葉から選ぶ。
 * - 各事例に 分野・事業の形・売る相手 を「ちょうど1つずつ」。特徴は当てはまる時だけ。
 * - 言葉を足す・減らす・意味を変える時は CASE_TAXONOMY_VERSION を上げ、data/case-tags.json を見直す。
 * - 迷った時は各言葉の「入る例・入らない例」で決める。収集のAIにもこの一覧をそのまま渡す。
 */
export const CASE_TAXONOMY_VERSION = 1;

export type TaxonomyTerm = {
  readonly word: string;
  /** 短い定義 */
  readonly definition: string;
  /** 入る例 */
  readonly yes: string;
  /** 入らない例（迷いやすいもの。どこに入るかも書く） */
  readonly no: string;
};

/** 分野: その事業が「何の世界」で稼いでいるか（売り物が役に立つ先）。ちょうど1つ */
export const FIELD_TERMS = [
  { word: '開発・IT', definition: 'プログラマーやIT担当が仕事で使う道具・サービス・学び。サーバー、API、ドメイン、監視など', yes: 'コードの部品、開発者向けの相談サービス、障害の監視', no: 'ホームページを作る道具（デザイン・制作）、表計算との連携（仕事の効率化）' },
  { word: 'デザイン・制作', definition: '見た目や作品を作る人のための道具・知識。ホームページ、画面、文字、画像、映像の制作', yes: 'ホームページ作成ソフト、デザインの教本、書体', no: '動画や音楽そのものを楽しむ事業（音楽・動画）' },
  { word: '集客・営業', definition: '客を集める・売り込む・紹介を増やす・電話や問い合わせをさばく', yes: '紹介制度の運営ソフト、電話の振り分け、メール配信', no: '売った後の代金回収（経理・決済）' },
  { word: '経理・決済', definition: 'お金の受け取り・請求・税・解約防止など、会社のお金の出入り', yes: '定期課金の解約防止、請求書・税の計算', no: '個人の家計簿（家計・投資）' },
  { word: 'ネット販売の支援', definition: 'ネットで物や会員権を売る側の仕組みを助けるもの。買い物かご、会員課金、電子商品の販売', yes: '買い物かごの部品、会員制サイトの課金', no: '自分で物を売る通販そのもの（食品・飲食などの分野＋物販・通販）' },
  { word: '仕事の効率化', definition: '仕事の手間を減らす。案件管理、自動入力、フォーム、メモ・保存など', yes: '案件と請求の一元管理、表への自動入力、ブックマーク保存', no: 'プログラマー専用の道具（開発・IT）' },
  { word: '教育・学び', definition: '知識や技能を身につけさせることが主な事業', yes: '30日の文章講座、学習コミュニティ', no: '特定の分野の専門教本（その分野に入れる。例: 開発者向けの動画講座は開発・IT）' },
  { word: '起業・ビジネス', definition: '起業家や一人で商売する人に向けた情報・場・交流', yes: '起業家の売上を載せるメディア、作り手が毎日の進捗を見せ合う場', no: '起業家向けの会計ソフト（経理・決済）' },
  { word: '家計・投資', definition: '個人のお金の管理・資産運用', yes: '家計簿アプリ、投資の記録', no: '会社の経理（経理・決済）' },
  { word: '健康・美容', definition: '体・心・見た目を整える', yes: '運動アプリ、化粧品、サプリ', no: '' },
  { word: '食品・飲食', definition: '食べ物・飲み物を売る・出す', yes: 'お菓子の定期便、飲食店、食品の通販', no: 'レシピの動画（音楽・動画）' },
  { word: 'ゲーム・娯楽', definition: '遊び・趣味で楽しむもの', yes: 'カードゲーム、ゲームアプリ', no: '音楽や動画の視聴（音楽・動画）' },
  { word: '音楽・動画', definition: '音楽・映像を作る・流す・見る', yes: 'ネットラジオ、AIで話す動画を作るサービス', no: '映像制作の学校（教育・学び）' },
  { word: '住まい・不動産', definition: '家・部屋・土地・内装・引っ越し', yes: '部屋の内装の見本をAIで作る、賃貸の仲介', no: '家具の通販（物販・通販の形＋該当する分野）' },
  { word: '旅行・暮らし', definition: '旅・移動・日々の暮らしの便利', yes: '旅行の予約、暮らしの手続き', no: '' },
  { word: '人事・採用', definition: '人を雇う・育てる・働く場の運営', yes: '求人、採用の管理、勤怠', no: '' },
] as const satisfies readonly TaxonomyTerm[];

/** 事業の形: 何をどう売って稼いでいるか（稼ぎの元）。ちょうど1つ。2つ以上ある時は稼ぎが大きい方 */
export const FORM_TERMS = [
  { word: 'ソフト・アプリ', definition: '画面で使うサービス・アプリ・拡張機能・部品サービス（API）。使う間、料金を払う', yes: '月額の管理ソフト、API、ブラウザの拡張', no: 'コードや素材を一度買って手元で使うもの（デジタル商品）' },
  { word: 'デジタル商品', definition: '一度買って手元で使う素材・道具。テンプレート、コード、フォント、素材集', yes: 'コード一式を買い切りで売る、フォント', no: '学ぶのが目的の動画・本（講座・教材）' },
  { word: '講座・教材', definition: '学ぶのが目的の動画講座・教本・塾', yes: '動画講座の月額、デザインの教本（動画つき）', no: '作業に使う素材だけを売るもの（デジタル商品）' },
  { word: '会員・コミュニティ', definition: '人の集まり・会員であること自体が売り物', yes: '招待制の作り手の集まり、有料の会員コミュニティ', no: '会員制でも中身が使うソフトのもの（ソフト・アプリ）' },
  { word: '物販・通販', definition: '形のある物を作って・仕入れて売る。定期便も含む', yes: 'カードゲーム、お菓子の定期便', no: '形のない商品（デジタル商品）' },
  { word: '仲介', definition: '買い手と売り手をつないで、手数料などを取る', yes: '開発者と相談相手をつなぐサービス', no: '自分で仕事を請ける（受託・代行）' },
  { word: '受託・代行', definition: '客の仕事を請けて、人の手で納める', yes: '制作会社、運用代行', no: '' },
  { word: 'メディア・広告', definition: '無料の読み物・番組を出して集めた人から、広告・紹介・別の商品で稼ぐ', yes: '起業家の売上を載せるインタビューサイト、無料のネットラジオ', no: '有料会員が主な稼ぎのもの（会員・コミュニティ）' },
] as const satisfies readonly TaxonomyTerm[];

/** 売る相手: 主な買い手。ちょうど1つ */
export const BUYER_TERMS = [
  { word: '会社向け', definition: '会社・店・作り手が、商売や仕事に使うために買う', yes: '制作会社の案件管理、自分の商品を売る作り手向けの道具', no: '個人が自分の暮らしのために使うもの（個人向け）' },
  { word: '個人向け', definition: '個人が自分のために買う', yes: '家計簿アプリ、お菓子の定期便、個人の学び', no: '' },
  { word: '開発者向け', definition: '主な買い手がプログラマー', yes: 'API、コード、開発者向けの動画講座', no: '会社の誰でも使うもの（会社向け）' },
] as const satisfies readonly TaxonomyTerm[];

/** 特徴: 当てはまる時だけ付ける（付けなくてよい） */
export const FEATURE_TERMS = [
  { word: 'AI', definition: '売り物の中心がAIの出力（画像・動画・文章など）の時だけ', yes: '部屋の写真からAIが内装案を作る、AIが話す動画を作る', no: '機能の一部にAIを使っているだけのもの' },
] as const satisfies readonly TaxonomyTerm[];

export type AxisId = 'field' | 'form' | 'buyer' | 'features';

export const AXES: readonly { id: AxisId; label: string; single: boolean; terms: readonly TaxonomyTerm[]; question: string }[] = [
  { id: 'field', label: '分野', single: true, terms: FIELD_TERMS, question: '何の世界で稼いでいるか' },
  { id: 'form', label: '事業の形', single: true, terms: FORM_TERMS, question: '何をどう売って稼いでいるか' },
  { id: 'buyer', label: '売る相手', single: true, terms: BUYER_TERMS, question: '主な買い手は誰か' },
  { id: 'features', label: '特徴', single: false, terms: FEATURE_TERMS, question: '当てはまる時だけ' },
];

export const FIELD_WORDS = FIELD_TERMS.map((t) => t.word) as unknown as [string, ...string[]];
export const FORM_WORDS = FORM_TERMS.map((t) => t.word) as unknown as [string, ...string[]];
export const BUYER_WORDS = BUYER_TERMS.map((t) => t.word) as unknown as [string, ...string[]];
export const FEATURE_WORDS = FEATURE_TERMS.map((t) => t.word) as unknown as [string, ...string[]];

/** 事例が持つタグ（公開版の reader.display.tags、data/case-tags.json の1件） */
export type CaseTags = { field: string; form: string; buyer: string; features: string[] };

/** 一覧のすべての言葉（画面の文字の検査が許す文字） */
export const ALL_TAXONOMY_WORDS: readonly string[] = [...FIELD_WORDS, ...FORM_WORDS, ...BUYER_WORDS, ...FEATURE_WORDS];

export const AXIS_LABELS: readonly string[] = AXES.map((a) => a.label);

/** 言葉がどの軸のものか。一覧に無い言葉は null */
export function axisOfWord(word: string): AxisId | null {
  for (const axis of AXES) if (axis.terms.some((t) => t.word === word)) return axis.id;
  return null;
}

/** 札として並べる順（分野・事業の形・売る相手・特徴） */
export function caseTagWords(tags: CaseTags | null | undefined): string[] {
  if (!tags) return [];
  return [tags.field, tags.form, tags.buyer, ...(tags.features ?? [])].filter((w) => typeof w === 'string' && w.length > 0);
}

/** 検査: 3軸がちょうど1つずつ・言葉は一覧の中だけ・特徴の重複なし。問題の文を返す（空なら通る） */
export function caseTagsProblems(tags: unknown): string[] {
  if (!tags || typeof tags !== 'object') return ['タグがありません'];
  const t = tags as Record<string, unknown>;
  const problems: string[] = [];
  const single = (key: 'field' | 'form' | 'buyer', label: string, words: readonly string[]) => {
    const v = t[key];
    if (typeof v !== 'string' || v === '') problems.push(`${label}が1つ決まっていません`);
    else if (!words.includes(v)) problems.push(`${label}「${v}」は一覧にない言葉です`);
  };
  single('field', '分野', FIELD_WORDS);
  single('form', '事業の形', FORM_WORDS);
  single('buyer', '売る相手', BUYER_WORDS);
  if (!Array.isArray(t.features)) problems.push('特徴は配列で書いてください（無ければ空）');
  else {
    const seen = new Set<string>();
    for (const f of t.features) {
      if (typeof f !== 'string' || !FEATURE_WORDS.includes(f)) problems.push(`特徴「${String(f)}」は一覧にない言葉です`);
      else if (seen.has(f)) problems.push(`特徴「${f}」が重複しています`);
      else seen.add(f);
    }
  }
  return problems;
}

/** 画面の絞り込みが使う、事例のタグの言葉（公開版の reader.display.tags から） */
export function entityTagWords(entity: { reader?: { display?: { tags?: CaseTags } | null } | null }): string[] {
  return caseTagWords(entity.reader?.display?.tags);
}

/** 収集のAIに渡す一覧の説明（case-research のプロンプト用） */
export function taxonomyPromptText(): string {
  const lines: string[] = [`タグは次の一覧の言葉だけから選ぶ（版 ${CASE_TAXONOMY_VERSION}）。分野・事業の形・売る相手は必ず1つずつ。特徴は当てはまる時だけ。自由な言葉は付けない。`];
  for (const axis of AXES) {
    lines.push(`【${axis.label}】${axis.single ? '1つ' : '0個以上'}（${axis.question}）`);
    for (const t of axis.terms) lines.push(`- ${t.word}: ${t.definition}。入る例: ${t.yes}${t.no ? `。入らない例: ${t.no}` : ''}`);
  }
  return lines.join('\n');
}
