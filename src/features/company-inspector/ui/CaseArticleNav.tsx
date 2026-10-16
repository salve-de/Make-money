import React, { useCallback, useEffect, useRef, useState } from 'react';

type NavItem = { id: string; label: string };

/** いちばん近い、縦にスクロールする親（詳細パネルのスクロール欄）を探す。 */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let p = el?.parentElement ?? null;
  while (p) {
    const overflowY = getComputedStyle(p).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return p;
    p = p.parentElement;
  }
  return null;
}

/**
 * 記事の章の目次。スクロールしても詳細パネルの上に固定し（sticky top-0）、押すとその章へ移る。閉じた章は開く。
 * 今いる章は、スクロール欄の上端から見て最後に通り過ぎた章（末尾まで来たら最後の章）。
 */
export function CaseArticleNav({ items, label }: { items: ReadonlyArray<NavItem>; label: string }) {
  const navRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(items[0]?.id ?? '');
  const clicked = useRef(false);
  const key = items.map((i) => i.id).join('|');

  useEffect(() => {
    const nav = navRef.current;
    const parent = findScrollParent(nav);
    if (!nav || !parent) return;
    const ids = key.split('|');
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      const line = parent.getBoundingClientRect().top + nav.offsetHeight + 16;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      if (parent.scrollTop + parent.clientHeight >= parent.scrollHeight - 2) current = ids[ids.length - 1];
      setActive(current);
    };
    const onScroll = () => {
      if (clicked.current) {
        // 押して移動している間は、止まるまで今いる章の判定を待つ（途中の章が点滅しない）
        clearTimeout(timer);
        timer = setTimeout(() => { clicked.current = false; update(); }, 150);
        return;
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    parent.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      parent.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [key]);

  // 今の章の項目が目次の横スクロールで隠れないようにする
  useEffect(() => {
    const nav = navRef.current;
    const btn = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!nav || !btn || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = btn.offsetLeft - (nav.clientWidth - btn.offsetWidth) / 2;
  }, [active]);

  const go = useCallback((id: string) => {
    const nav = navRef.current;
    const parent = findScrollParent(nav);
    const target = document.getElementById(id);
    if (!nav || !parent || !target) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
    clicked.current = true;
    setActive(id);
    const top = parent.scrollTop + target.getBoundingClientRect().top - parent.getBoundingClientRect().top - nav.offsetHeight;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    parent.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    // 動かない（すでに目的の位置）時に判定待ちのままにならないようにする
    setTimeout(() => { clicked.current = false; }, 800);
  }, []);

  return (
    <nav ref={navRef} aria-label={label} data-case-article-nav className="sticky top-0 z-10 flex overflow-x-auto whitespace-nowrap border-b border-term-line bg-term-bg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const on = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={on ? 'true' : undefined}
            onClick={() => go(item.id)}
            className={`min-h-11 flex-1 shrink-0 border-b-2 px-2.5 text-xs lg:min-h-9 ${on ? 'border-term-accent font-semibold text-term-fg-strong' : 'border-transparent text-term-label hover:text-term-fg'}`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
