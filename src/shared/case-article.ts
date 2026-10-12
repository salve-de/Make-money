import { z } from 'zod';

/**
 * 事例の記事（case-article）。旧形式の「章ごとの文」（case-page）と並んで使う新しい形式。
 * 7つの決まった分類（概要・仕組み・お金・集客・運営・経緯・出典）に、章の結論の1文と、種類の決まったブロック（項目の行・段落・手順・表・年表・箇条書き・図）を並べる。
 * 事例ごとに画面を手書きしない。どの事例もこの形のデータを、同じ表示部品（CaseArticleView）で出す。
 *
 * 正本は data/case-articles/<事例ID>/article.json（掲載用の原稿。下の CaseArticleSourceSchema）。
 * 同じ場所の research.json は元の調査データで、原稿の各文は recordKeys で調査の記録に結ぶ。
 * scripts/case-articles/ が原稿を読み、画面用の部分だけ（CaseArticleSchema。recordKeys・審査の状態・編集の記録は外す）を data/case-articles.json に直す。
 * 公開版を作る時、審査が済んだ（reviewState が approved の）記事だけを事例の reader.display.caseArticle へ入れる。
 */

export const CASE_ARTICLE_SCHEMA = 'make-money.case-article.v2';

/** 分類の並びは固定。目次もこの順に出す。出典（sources）の中身は記事の sources から作るので、topics には入れない。 */
export const CASE_ARTICLE_TOPIC_IDS = ['overview', 'mechanism', 'revenue', 'acquisition', 'operations', 'history'] as const;
export type CaseArticleTopicId = (typeof CASE_ARTICLE_TOPIC_IDS)[number];

export const CASE_ARTICLE_REVIEW_STATES = ['draft', 'ready_for_review', 'approved'] as const;

/** 図の中身は自作の SVG だけ（外部の画像・写真は既存の画像欄が審査して出す。ここには入れない）。 */
const SVG_DATA_URI = /^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/;

/**
 * 画面用と原稿用で同じ形を使う。原稿用（internal）は各文に recordKeys（調査の記録のキー）を持つ。
 * 画面用は recordKeys を持たない（zod が知らない欄を落とすので、原稿を画面用の定義に通すだけで外れる）。
 */
function shapes<I extends boolean>(internal: I) {
  const keys = internal ? { recordKeys: z.array(z.string().min(1)).default([]) } : {};
  /** 出典の番号（記事の sources の no）。文の末尾に小さく出す。 */
  const cites = z.array(z.number().int().positive()).default([]);
  const line = { text: z.string().min(1), cites, ...keys };

  const block = z.discriminatedUnion('type', [
    /** 項目の行（左に短い見出し、右に文）。amount は右を数字として右寄せで出す（費用の内訳など）。 */
    z.object({
      type: z.literal('facts'),
      variant: z.enum(['text', 'amount']).default('text'),
      rows: z.array(z.object({ label: z.string().min(1), ...line })).min(1),
    }),
    /** 段落。note は表や行の下に添える小さな補足。 */
    z.object({ type: z.literal('paragraph'), tone: z.enum(['body', 'note']).default('body'), ...line }),
    /** 番号つきの手順（題＋文） */
    z.object({ type: z.literal('steps'), items: z.array(z.object({ title: z.string().min(1), ...line })).min(1) }),
    /** 料金などの表（行の見出し・主な値・補足）。yen は値に添える円の概算。 */
    z.object({
      type: z.literal('rates'),
      caption: z.string().optional(),
      rows: z.array(z.object({ label: z.string().min(1), value: z.string().min(1), yen: z.string().optional(), note: z.string().optional(), cites, ...keys })).min(1),
    }),
    /** 列のある表（決算の比較など）。1列目が行の見出し、2列目からは値。yen は値の下に小さく出す円の概算。 */
    z.object({
      type: z.literal('table'),
      caption: z.string().optional(),
      columns: z.array(z.string().min(1)).min(2),
      rows: z.array(z.object({
        label: z.string().min(1),
        cells: z.array(z.object({ text: z.string().min(1), yen: z.string().optional() })).min(1),
        cites,
        ...keys,
      })).min(1),
    }),
    /** 年表。title は太字の短い題（無ければ文だけ）。 */
    z.object({
      type: z.literal('timeline'),
      items: z.array(z.object({ when: z.string().min(1), title: z.string().optional(), ...line })).min(1),
    }),
    /** 箇条書き。lead は行頭の太字（「2019年1月」など）。 */
    z.object({
      type: z.literal('list'),
      ordered: z.boolean().default(false),
      items: z.array(z.object({ lead: z.string().optional(), ...line })).min(1),
    }),
    /** 章の中の小見出し */
    z.object({ type: z.literal('subheading'), text: z.string().min(1) }),
    /** 図（記事の figures の id を指す） */
    z.object({ type: z.literal('figure'), figureId: z.string().min(1) }),
  ]);

  const topic = z.object({
    id: z.enum(CASE_ARTICLE_TOPIC_IDS),
    /** 章の結論の1文。概要など、置かない章もある。 */
    lead: z.object(line).optional(),
    blocks: z.array(block).min(1),
  });

  const kpi = z.object({
    label: z.string().min(1),
    value: z.string().min(1),
    /** 値に添える円の概算（「約7,500万円」）。外貨でない値には付けない。 */
    yen: z.string().optional(),
    /** いつの数字か・何の単位か（「2026年9月」「組織単位」） */
    period: z.string().optional(),
    ...keys,
  });

  return { block, topic, kpi };
}

const pub = shapes(false);
const src = shapes(true);

const source = z.object({ no: z.number().int().positive(), label: z.string().min(1), url: z.url() });

/** 画面用の図（SVG を data URI で持つ。審査前の図が別の URL から見えないよう、事例のデータと同じ版に入れて運ぶ） */
const figure = z.object({
  id: z.string().min(1),
  /** 図が何を示すかの1文（画像の代わりの文） */
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  src: z.string().regex(SVG_DATA_URI),
});

/** 記事の共通の欄（画面用・原稿用で同じ） */
const head = {
  /** 一覧の1行（40字以内） */
  listLine: z.string().min(1),
  /** 詳細の最初に出す大きな1文 */
  headline: z.string().min(1),
  /** 見出しの下の1〜2文 */
  lead: z.string().min(1),
  sources: z.array(source).min(1),
};

/** 画面用（事例の reader.display.caseArticle に入る形） */
export const CaseArticleSchema = z.object({
  ...head,
  kpis: z.array(pub.kpi).max(4).default([]),
  topics: z.array(pub.topic).min(1),
  figures: z.array(figure).default([]),
});
export type CaseArticle = z.infer<typeof CaseArticleSchema>;
export type CaseArticleTopic = CaseArticle['topics'][number];
export type CaseArticleBlock = CaseArticleTopic['blocks'][number];
export type CaseArticleFigure = CaseArticle['figures'][number];

/** 原稿に入れる編集の記録（画面には出さない）。元の調査や見本から何を変えたか・出さずに持っているかを残す。 */
const editorialChange = z.object({
  kind: z.enum([
    /** 見本の文に円の概算を足した */
    'yen-added',
    /** 読む人の画面から外して内部に持つ文（抽象的な評価・不要な断り書き） */
    'withheld',
    /** 元の調査にあるが見本の文に入っていない情報 */
    'not-in-article',
    /** 調査の記録に結べなかった文 */
    'unlinked',
    /** そのほか（見本からの言い換えなど） */
    'other',
  ]),
  /** どこの話か（「お金 / 料金の表 2行目」など） */
  where: z.string().min(1),
  /** 対象の文や情報 */
  text: z.string().min(1),
  reason: z.string().min(1),
  recordKeys: z.array(z.string().min(1)).default([]),
});

/** 原稿用（data/case-articles/<事例ID>/article.json） */
export const CaseArticleSourceSchema = z.object({
  schema: z.literal(CASE_ARTICLE_SCHEMA),
  entityId: z.string().min(1),
  /** 事例の名前（一覧・見出しに出る名前。新しく足す事例の身元の記録にも使う） */
  name: z.string().min(1),
  /** 原稿の版（同じ事例の旧データとは別の版として扱う） */
  revision: z.string().min(1),
  /** 審査の状態。approved だけが公開版に入る。 */
  reviewState: z.enum(CASE_ARTICLE_REVIEW_STATES),
  /** 一覧の世代（集めた流れの版。第N世代）。公開版を作る時に事例へ付ける。 */
  generation: z.number().int().min(1),
  /** 元の調査データ（同じ場所の research.json）の受け渡し番号と指紋 */
  basedOn: z.object({ packageId: z.string().min(1), submissionSha256: z.string().regex(/^[0-9a-f]{64}$/) }),
  ...head,
  /** 出典ごとの、調査データ側のキー（S1 など）。画面用には出さない。 */
  sourceKeys: z.record(z.string(), z.string()).default({}),
  kpis: z.array(src.kpi).max(4).default([]),
  topics: z.array(src.topic).min(1),
  /** 図のファイル（同じ場所の figures/ にある SVG）。画面用を作る時に data URI に直す。 */
  figures: z.array(z.object({ id: z.string().min(1), file: z.string().regex(/^[a-z0-9-]+\.svg$/), alt: z.string().min(1), width: z.number().int().positive(), height: z.number().int().positive() })).default([]),
  editorialChanges: z.array(editorialChange).default([]),
});
export type CaseArticleSource = z.infer<typeof CaseArticleSourceSchema>;

/** 記事の文を、場所の名前つきで順に並べる（文の検査と、画面の文字の出どころの検査で使う） */
export function caseArticleLines(article: CaseArticle): Array<{ where: string; text: string }> {
  const out: Array<{ where: string; text: string }> = [
    { where: '一覧の1行', text: article.listLine },
    { where: '見出し', text: article.headline },
    { where: '見出しの下の文', text: article.lead },
  ];
  article.kpis.forEach((k, i) => {
    const where = `数字の帯${i + 1}`;
    out.push({ where, text: k.label }, { where, text: k.value });
    if (k.yen) out.push({ where, text: k.yen });
    if (k.period) out.push({ where, text: k.period });
  });
  for (const topic of article.topics) {
    if (topic.lead) out.push({ where: `${topic.id} / 結論の文`, text: topic.lead.text });
    topic.blocks.forEach((b, i) => {
      const where = `${topic.id} / ブロック${i + 1}（${b.type}）`;
      switch (b.type) {
        case 'facts': b.rows.forEach((r) => out.push({ where, text: r.label }, { where, text: r.text })); break;
        case 'paragraph': out.push({ where, text: b.text }); break;
        case 'steps': b.items.forEach((x) => out.push({ where, text: x.title }, { where, text: x.text })); break;
        case 'rates':
          if (b.caption) out.push({ where, text: b.caption });
          b.rows.forEach((r) => { out.push({ where, text: r.label }, { where, text: r.value }); if (r.yen) out.push({ where, text: r.yen }); if (r.note) out.push({ where, text: r.note }); });
          break;
        case 'table':
          if (b.caption) out.push({ where, text: b.caption });
          b.columns.forEach((c) => out.push({ where, text: c }));
          b.rows.forEach((r) => { out.push({ where, text: r.label }); r.cells.forEach((c) => { out.push({ where, text: c.text }); if (c.yen) out.push({ where, text: c.yen }); }); });
          break;
        case 'timeline': b.items.forEach((x) => { out.push({ where, text: x.when }); if (x.title) out.push({ where, text: x.title }); out.push({ where, text: x.text }); }); break;
        case 'list': b.items.forEach((x) => { if (x.lead) out.push({ where, text: x.lead }); out.push({ where, text: x.text }); }); break;
        case 'subheading': out.push({ where, text: b.text }); break;
        case 'figure': break;
      }
    });
  }
  return out;
}

/** 画面に出る文字の一覧（文字の出どころの検査 scripts/architecture/screen-text.tsx が、この事例のデータから来た文字として許すため） */
export function caseArticleTexts(article: CaseArticle): string[] {
  const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };
  return [
    ...caseArticleLines(article).map((x) => x.text),
    ...article.figures.map((f) => f.alt),
    ...article.sources.flatMap((x) => [String(x.no), x.label, host(x.url)]),
  ].map((t) => t.trim()).filter(Boolean);
}
