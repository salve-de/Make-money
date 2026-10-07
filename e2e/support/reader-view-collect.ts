/**
 * 画面の自動監査（e2e/reader-view-audit.spec.ts）が、実際に描いた詳細画面から「読む人に見える文」を集める。
 * ブラウザの中で動く関数なので、外の変数を参照しない（page.evaluate に渡す）。
 * 畳んである区画（details）は先に全部開いてから innerText を読む（読む人が開けば見える文も対象）。
 */
export interface ScreenCell { where: string; label: string; value: string }
export interface ScreenLink { text: string; href: string }
export interface ScreenSection { id: string; title: string; text: string; links: ScreenLink[] }
export interface ScreenCase {
  id: string;
  name: string;
  /** 一覧（トップの表）の、この事例の行の文 */
  list: string;
  /** 概要（「概要」の下の文。1行目が大きい1文） */
  overview: string[];
  /** 「項目名｜中身」の組（数字の帯のマスと、分析欄の行） */
  cells: ScreenCell[];
  sections: ScreenSection[];
  /** 読み込めた製品画面の画像の数（アイコン・ロゴ・ファビコンは数えない。docs/OWNER_INTENT.md 7章: アイコンは目印で、製品画像の代わりにならない） */
  images: number;
  /** 読み込めたアイコン・ロゴの数（参考） */
  icons: number;
}

export function collectInspector(aside: HTMLElement): Omit<ScreenCase, 'id' | 'list'> {
  aside.querySelectorAll('details').forEach((d) => { (d as HTMLDetailsElement).open = true; });
  const text = (node: Element | null | undefined) => ((node as HTMLElement | null)?.innerText ?? '').trim();
  const name = text(aside.querySelector('h1, h2'));
  // 概要: 「概要」という小見出しを持つ塊
  const overviewBox = [...aside.querySelectorAll('[data-fact]')].find((el) => text(el.firstElementChild) === '概要');
  const overview = overviewBox ? [...overviewBox.querySelectorAll('p')].slice(1).map((p) => text(p)).filter(Boolean) : [];
  const cells: ScreenCell[] = [];
  for (const el of aside.querySelectorAll('[data-metric], [data-fact], [data-analysis]')) {
    const dt = el.querySelector(':scope > dt');
    if (dt) {
      const label = text(dt.querySelector('span'));
      const value = text(el.querySelector(':scope > dd, :scope > :not(dt)'));
      cells.push({ where: el.closest('[id^="section-"]')?.id ?? '帯', label, value });
      continue;
    }
    // 数字の帯のマス: 1つ目の子が「項目名（＋印）」、残りが中身
    const head = el.firstElementChild;
    if (head && head.tagName === 'DIV' && head.firstElementChild?.tagName === 'SPAN' && el.children.length >= 2 && !el.closest('[id^="section-"]')) {
      const label = text(head.firstElementChild);
      const value = [...el.children].slice(1).map((c) => text(c)).join('\n');
      cells.push({ where: '数字の帯', label, value });
    }
  }
  const sections: ScreenSection[] = [];
  for (const el of aside.querySelectorAll('[id^="section-"]')) {
    // 入れ子の区画は内側を別に数える（外側の文からは除かない。重複の検査は区画単位で同じ文を2回数えないよう、葉の区画だけ使う）
    if (el.querySelector('[id^="section-"]')) continue;
    const summary = el.querySelector(':scope > summary, :scope > h2, :scope > h3, :scope > header');
    const title = text(summary);
    const all = text(el);
    const body = title && all.startsWith(title) ? all.slice(title.length).trim() : all;
    const links = [...el.querySelectorAll('a[href]')].map((a) => ({ text: text(a), href: (a as HTMLAnchorElement).href }));
    sections.push({ id: el.id, title, text: body, links });
  }
  const loaded = [...aside.querySelectorAll('#section-media img')].filter((img) => (img as HTMLImageElement).naturalWidth > 0);
  const isIcon = (img: Element) => ['app_icon', 'favicon', 'logo'].includes(img.getAttribute('data-kind') ?? '');
  return { name, overview, cells, sections, images: loaded.filter((img) => !isIcon(img)).length, icons: loaded.filter(isIcon).length };
}
