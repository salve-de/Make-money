import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InstitutionalDataGrid } from '@/platform/components/grid/InstitutionalDataGrid';
import { LedgerFilterRail } from '@/platform/components/grid/LedgerFilterRail';
import { MobileFeedCard } from '@/platform/components/grid/MobileFeedCard';
import { YearChip } from '@/platform/components/grid/YearChip';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { caseLabels } from '@/shared/display-text';
import { PRIMARY_NAV_ITEMS } from '@/platform/components/navigation/navigationItems';
import { formatYen } from '@/platform/utils/moneyDisplay';
import { baremetrics } from '@/shared/__fixtures__/reader-samples';
import { CasePageSchema, type CasePage } from '@/shared/case-page';
import { seriesFor as earningsSeriesFor } from '@/shared/case-page-series';
import { pickGalleryAssets, type PublicMediaAsset } from '@/shared/media-display';
import type { ReaderCase } from '@/shared/reader-case';
import { EntityMediaGalleryView } from './EntityMediaGallery';
import { ReaderLedger } from './ReaderDetail';

/**
 * 決まった画面の形を守る試験。台帳は docs/design/DECIDED_UI.md（D-01〜D-17）。
 * 試験名の先頭の「D-xx」が台帳の件。形を変える時は、先にオーナーに聞き、台帳の該当の件にOKを書いてから、この試験を直す。
 * 試験だけを弱めて通さない。
 */

const ROOT = process.cwd();
const read = (file: string) => readFileSync(join(ROOT, file), 'utf8');

/** 見本の正本データ（Button Shy）。章・年表・お金の流れ・稼ぎの推移の材料が揃っている */
function buttonShyPage(): CasePage {
  const list = JSON.parse(read('data/case-pages.json')) as Array<{ entityId: string; page: unknown }>;
  const hit = list.find((x) => x.entityId === 'ent_button_shy_f1545f17d98e');
  if (!hit) throw new Error('data/case-pages.json に Button Shy が無い');
  return CasePageSchema.parse(hit.page);
}

function asset(kind: PublicMediaAsset['kind'], suffix: string): PublicMediaAsset {
  return {
    assetId: `ma_${suffix.padEnd(24, '0')}`,
    kind,
    url: `https://assets.example.com/media/ent_button_shy/${suffix}.png`,
    contentType: 'image/png',
    width: 1200,
    height: 630,
    attribution: '出典: Button Shy 公式サイト',
    sourcePageUrl: 'https://www.buttonshy.com/',
    retrievedAt: '2026-09-29T00:38:11.808Z',
  };
}

const gallery = (assets: PublicMediaAsset[]) => <EntityMediaGalleryView entityName="Button Shy" assets={assets} />;
const readerWith = (page: CasePage): ReaderCase => ({ ...baremetrics, display: { casePage: page } }) as ReaderCase;
const render = (page: CasePage, media?: React.ReactNode) => renderToStaticMarkup(<ReaderLedger reader={readerWith(page)} media={media} />);

describe('D-01 端末型のトークン', () => {
  it('D-01 トークンの値が TERMINAL_UI.md の表と globals.css で一致する', () => {
    const css = read('src/app/globals.css');
    const rows = read('docs/design/TERMINAL_UI.md').split('\n').filter((l) => /^\|\s*[^|]+\|\s*`term-/.test(l));
    expect(rows.length).toBeGreaterThan(10);
    let checked = 0;
    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim());
      const tokens = [...(cells[2] ?? '').matchAll(/`(term-[a-z-]+)`/g)].map((m) => m[1]);
      const values = [...(cells[3] ?? '').matchAll(/#[0-9a-fA-F]{6}/g)].map((m) => m[0].toLowerCase());
      expect(tokens.length, row).toBe(values.length);
      tokens.forEach((token, i) => {
        const m = css.match(new RegExp(`--${token}:\\s*(#[0-9a-fA-F]{6})`));
        expect(m, `${token} が globals.css に無い`).not.toBeNull();
        expect(m![1].toLowerCase(), token).toBe(values[i]);
        checked += 1;
      });
    }
    expect(checked).toBeGreaterThanOrEqual(18);
  });
});

describe('D-04 下のメニュー', () => {
  it('D-04 下のメニューは5つで、M&A の入口は無い', () => {
    expect(PRIMARY_NAV_ITEMS.map((x) => x.label)).toEqual(['事例', '傾向', '事業検討', '作る', '市場']);
    expect(PRIMARY_NAV_ITEMS.some((x) => /M&A|売買|仲介/.test(x.label))).toBe(false);
  });
});

describe('D-05 / D-08 事例の章と時間順の流れ', () => {
  const page = buttonShyPage();
  const html = render(page);

  it('D-05 Button Shy の正本データで、決めた章が決めた順に出る', () => {
    // つまずきの章は、材料がある事例だけ出す（材料が無ければ章ごと出さない）
    const titles = ['成功の秘訣', '実際にやったこと', ...(page.setbacks.length > 0 ? ['つまずきと立て直し'] : []), '料金', '時間順の流れ', '数字と出典'];
    const at = titles.map((t) => html.indexOf(`>${t}<`));
    expect(at.every((i) => i >= 0), `出ない章がある: ${titles.filter((_, i) => at[i] < 0).join('、')}`).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html.indexOf(page.overview.slice(0, 12))).toBeGreaterThanOrEqual(0);
    expect(html.indexOf(page.overview.slice(0, 12))).toBeLessThan(at[0]);
  });

  it('D-08 時間順の流れは、時期と出来事の行で出る', () => {
    const start = html.indexOf('id="section-chapter-timeline"');
    expect(start).toBeGreaterThanOrEqual(0);
    const next = html.indexOf('id="section-chapter-numbers"', start);
    const block = html.slice(start, next);
    expect(block).toContain('grid-cols-[6.5rem_minmax(0,1fr)]');
    let from = 0;
    for (const { when, what } of page.timeline) {
      const i = block.indexOf(what.slice(0, 10), from);
      expect(i, `${when} の行が順番どおりに出ない`).toBeGreaterThanOrEqual(from);
      expect(block).toContain(when);
      from = i;
    }
    // 図やグラフにしない
    expect(block).not.toMatch(/<svg|<canvas|echarts/i);
  });
});

describe('D-15 章の中身の読みやすさ', () => {
  const page = buttonShyPage();
  const html = render(page);
  const block = (id: string, next: string) => {
    const start = html.indexOf(`id="${id}"`);
    expect(start).toBeGreaterThanOrEqual(0);
    return html.slice(start, html.indexOf(`id="${next}"`, start));
  };

  it('D-15 成功の秘訣は番号＋太字の見出し＋補足', () => {
    const b = block('section-group-secret', 'section-chapter-practice');
    expect(b).toContain('grid-cols-[1.5rem_minmax(0,1fr)]');
    expect(b).toContain('font-semibold');
    expect(b).toContain('text-term-sub');
    expect((b.match(/data-case-page-secret=/g) ?? []).length).toBe(page.secrets.length);
  });

  it('D-15 実際にやったこと・つまずきは「太字の答え1行＋補足」。点（・）は付けない', () => {
    const b = block('section-chapter-practice', page.setbacks.length > 0 ? 'section-chapter-turning' : 'section-chapter-price');
    expect((b.match(/data-case-page-item=/g) ?? []).length).toBe(page.did.length);
    expect(b).not.toContain('>・<');
    for (const x of page.did) {
      expect(typeof x).not.toBe('string');
      if (typeof x !== 'string') expect(b).toContain(`font-semibold leading-snug text-term-fg-strong">${x.head}</p>`);
    }
  });

  it('D-15 料金は左に品名、右に値段の表', () => {
    const price = block('section-chapter-price', 'section-chapter-timeline');
    const rows = page.pricing.filter((t) => t.indexOf('：') > 0);
    expect((price.match(/data-case-page-price=/g) ?? []).length).toBe(rows.length);
    expect(price).toContain('<dt');
    expect(price).toContain('<dd');
    expect(price).not.toContain('>・<');
  });
});

describe('D-06 画像は左右の矢印の欄（EntityMediaGalleryView）', () => {
  const page = buttonShyPage();
  const shots = [asset('screenshot_product', 'a'), asset('screenshot_product', 'b'), asset('screenshot_home', 'c')];

  it('D-06 事例ページは画像の欄（EntityMediaGalleryView）を概要の直下に出す', () => {
    const html = render(page, gallery(shots));
    const overview = html.indexOf('data-case-page="overview"');
    const media = html.indexOf('data-testid="media-gallery"');
    const secrets = html.indexOf('>成功の秘訣<');
    expect(media).toBeGreaterThan(overview);
    expect(media).toBeLessThan(secrets);
    expect((html.match(/data-testid="media-gallery-image"/g) ?? []).length).toBe(3);
    // 横一列の送り（縦に積む・1枚を横に置く枠ではない）
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('snap-x');
  });

  it('D-06 画像の欄は左右の矢印で送れる', () => {
    const src = read('src/features/company-inspector/ui/EntityMediaGallery.tsx');
    expect(src).toContain('UI.GALLERY_PREV');
    expect(src).toContain('UI.GALLERY_NEXT');
    expect(src).toContain('scrollBy');
    // 事例ページに実際に渡している経路: CompanyInspectorPane → ReaderLedger(media) → CasePageView(media)
    expect(read('src/features/company-inspector/CompanyInspectorPane.tsx')).toMatch(/media=\{<EntityMediaGallery\b/);
    expect(read('src/features/company-inspector/ui/ReaderDetail.tsx')).toMatch(/<CasePageView\b[^>]*\bmedia=\{media\}/);
  });

  it('D-06 CasePageView は自前の画像を持たない', () => {
    const none = render(page);
    expect(none).not.toContain('<img');
    expect(none).not.toContain('data-testid="media-gallery"');
    const view = read('src/features/company-inspector/ui/ReaderOverview.tsx');
    const body = view.slice(view.indexOf('export function CasePageView'));
    expect(body).not.toMatch(/<img\b|next\/image|<Image\b|<picture\b/);
    // 渡された media をそのまま出す
    expect(render(page, <p data-marker="m">差し込み</p>)).toContain('data-marker="m"');
  });
});

describe('D-07 画像の中身', () => {
  it('D-07 画像は製品画面を先にし、OG画像とファビコンは欄に入れない', () => {
    const picked = pickGalleryAssets([asset('og_image', 'o'), asset('favicon', 'f'), asset('screenshot_product', 'p'), asset('store_screenshot', 's')]);
    expect(picked.map((x) => x.kind)).toEqual(['store_screenshot', 'screenshot_product']);
    const html = renderToStaticMarkup(gallery(picked));
    expect(html).toContain('href="https://www.buttonshy.com/"');
    expect(html).not.toMatch(/download|拡大/);
  });
});

describe('D-09 大きな図は出さない', () => {
  it('D-09 流れ・推移の材料があっても、大きな図の章は出ない', () => {
    const base = buttonShyPage();
    const withMaterial: CasePage = {
      ...base,
      flows: base.flows?.length ? base.flows : [{ from: '客', to: 'Button Shy', label: '1本15ドル（約2,300円）' }],
    };
    // 材料が本当にあることを確かめる（無ければ、この試験は何も守らない）
    expect(earningsSeriesFor(withMaterial.timeline).length).toBeGreaterThan(0);
    expect(withMaterial.flows!.length).toBeGreaterThan(0);
    const html = render(withMaterial);
    for (const gone of ['section-chapter-money-flow', 'section-chapter-earnings', 'お金の流れ', '稼ぎの推移']) expect(html).not.toContain(gone);
    expect(html).not.toMatch(/<svg|<canvas|role="img"/);
  });
});

describe('D-10 入れないと決めた章', () => {
  it('D-10 入れないと決めた章の見出しは出ない', () => {
    const html = render(buttonShyPage());
    for (const gone of ['自分にもできるか', '今も通用するか', '今も通じるか', '持ち札', '追い風', '数字が本物か', '続くか', '共通原則', '同じ型の事例']) {
      expect(html, gone).not.toContain(gone);
    }
  });
});

describe('D-12 金額の表記', () => {
  it('D-12 金額は 万円・億円 で書き、推定は「約」を付ける', () => {
    expect(formatYen(1_500_000)).toBe('150万円');
    expect(formatYen(16_200_000)).toBe('1,620万円');
    expect(formatYen(150_000_000)).toBe('1.5億円');
    expect(formatYen(1_500_000, { approx: true })).toBe('約150万円');
  });
});

describe('D-16 札（タグ）/ D-17 年の札', () => {
  const base = INSTITUTIONAL_ENTITIES[0];
  // 札は決まった言葉の一覧（case-taxonomy）から選んだタグだけ。事例ごとの自由な言葉（entity.tags）は出さない
  const entity = { ...base, tags: ['開発・IT', '有料サービス', '収集事例'], reader: { ...baremetrics, display: { year: 2009, tags: { field: '開発・IT', form: 'ソフト・アプリ', buyer: '個人向け', features: [] } } } } as unknown as typeof base;
  const noop = () => undefined;

  it('D-16 事例の札は一覧の「種類」の列（PC）に出て、名前の横には出ない。運営の印（収集事例）は出さない', () => {
    expect(caseLabels(entity)).toEqual(['開発・IT', 'ソフト・アプリ', '個人向け']);
    const html = renderToStaticMarkup(
      <InstitutionalDataGrid entities={[entity]} selectedEntityId={null} onSelectEntity={noop} currency="JPY" bookmarkedIds={new Set()} onToggleBookmark={noop} onToggleTag={noop} />,
    );
    const pc = html.slice(html.indexOf('<table'));
    expect(pc).toContain('>種類<');
    expect(pc).not.toContain('>分野<');
    expect(pc).toContain('開発・IT');
    expect(pc).not.toContain('収集事例');
    // 自由な言葉（事例ごとの entity.tags）は札に出さない
    expect(pc).not.toContain('有料サービス');
    // 札は全部押せて、押すとその言葉で絞り込む
    for (const word of ['開発・IT', 'ソフト・アプリ', '個人向け']) expect(pc).toMatch(new RegExp(`<button[^>]*aria-pressed="false"[^>]*>${word}</button>`));
    // 名前のセルには札を置かず、年だけを名前の右に添える（札は名前の次のセル＝種類の列）
    const nameCell = pc.slice(pc.indexOf('<td'), pc.indexOf('</td>'));
    expect(nameCell).not.toContain('開発・IT');
    expect(nameCell).toMatch(/data-testid="year-chip"[^>]*>2009</);
    const kindCell = pc.slice(pc.indexOf('</td>') + 5, pc.indexOf('</td>', pc.indexOf('</td>') + 5));
    expect(kindCell).toContain('開発・IT');
    expect(kindCell).not.toContain('year-chip');
    // 札は罫線の枠でなく薄い塗り
    expect(kindCell).toContain('bg-term-line');
  });

  it('D-16 左右に分けた一覧（種類の列が隠れる時）は、説明の下に札を出す。年は名前の右', () => {
    const html = renderToStaticMarkup(
      <InstitutionalDataGrid entities={[entity]} selectedEntityId={null} onSelectEntity={noop} currency="JPY" bookmarkedIds={new Set()} onToggleBookmark={noop} onToggleTag={noop} isSplitView />,
    );
    const pc = html.slice(html.indexOf('<table'));
    expect(pc).not.toContain('>種類<');
    expect(pc.indexOf('開発・IT')).toBeGreaterThan(pc.indexOf('data-fact'));
    expect(pc.indexOf('data-testid="year-chip"')).toBeLessThan(pc.indexOf('data-fact'));
  });

  it('D-16 スマホの一覧のカードにも札を出す。札の無い事例は札の欄を出さない', () => {
    const card = (e: typeof base) => renderToStaticMarkup(<MobileFeedCard entity={e} isSelected={false} onSelect={noop} currency="JPY" onToggleBookmark={noop} isBookmarked={false} />);
    expect(card(entity)).toContain('開発・IT');
    expect(card({ ...entity, tags: [], tagline: '', reader: baremetrics } as unknown as typeof base)).not.toContain('mt-1 flex flex-wrap');
  });

  it('D-16 左の絞り込みは、決まった言葉の一覧を「分野」「事業の形」「売る相手」「特徴」の軸ごとの見出しで並べる。件数0の言葉は押せない', () => {
    // 件数は画面に読み込んだ分ではなく、公開中の全件の最小の値（facets）で数える
    const tagged = (field: string) => ({ scale: 'SOLO', margin: 60, capital: 0, moat: 'SWITCHING_COST', words: [field, 'ソフト・アプリ', '個人向け'] });
    const html = renderToStaticMarkup(
      <LedgerFilterRail filters={null} onChangeFilters={noop} resultCount={2} catalogTotal={2} facets={[tagged('開発・IT'), tagged('開発・IT'), tagged('食品・飲食')]} />,
    );
    for (const heading of ['分野', '事業の形', '売る相手', '特徴']) expect(html).toContain(`</span>${heading}</summary>`);
    expect(html).not.toContain('事例の特徴');
    // 一覧の言葉は隠さず全部並べる。付いている事例が無い言葉は押せない（disabled）
    const row = (word: string) => html.match(new RegExp(`<button[^>]*>(?:(?!</button>).)*${word}(?:(?!</button>).)*</button>`))?.[0] ?? '';
    expect(row('開発・IT')).not.toContain('disabled');
    expect(row('食品・飲食')).not.toContain('disabled');
    expect(row('健康・美容')).toContain('disabled');
    expect(row('仲介')).toContain('disabled');
    // 全件の件数が最初から出る（開発・IT は2件）
    expect(row('開発・IT')).toMatch(/term-num[^>]*>2<\/span>/);
    expect(html).not.toContain('収集事例');
  });

  it('D-17 年は一覧（PC・スマホ）の名前の右に、枠の無い数字で出て、押せない（ボタンでも手のカーソルでもない）', () => {
    const grid = renderToStaticMarkup(
      <InstitutionalDataGrid entities={[entity]} selectedEntityId={null} onSelectEntity={noop} currency="JPY" bookmarkedIds={new Set()} onToggleBookmark={noop} onToggleTag={noop} />,
    );
    const mobile = renderToStaticMarkup(<MobileFeedCard entity={entity} isSelected={false} onSelect={noop} currency="JPY" onToggleBookmark={noop} isBookmarked={false} />);
    for (const html of [grid, mobile]) expect(html).toMatch(/data-testid="year-chip"[^>]*>2009</);
    const chip = renderToStaticMarkup(<YearChip year={2009} />);
    expect(chip).toMatch(/^<span /);
    expect(chip).not.toMatch(/<button|role="button"|tabindex|onclick|cursor-pointer|hover:/);
    expect(chip).toContain('cursor-default');
    expect(chip).toContain('text-xs');
    expect(chip).not.toMatch(/rounded|shadow|border/);
    // スマホも名前のすぐ後（説明より前）
    expect(mobile.indexOf('data-testid="year-chip"')).toBeLessThan(mobile.indexOf('data-fact'));
  });

  it('D-17 年が決まらない事例には年の札を出さない', () => {
    expect(renderToStaticMarkup(<YearChip year={null} />)).toBe('');
  });
});
