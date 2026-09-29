export default function Loading() {
  const rows = Array.from({ length: 12 }, (_, index) => index);
  return (
    <div className="term-page bg-term-bg text-term-fg" role="status" aria-live="polite">
      <div className="flex h-9 items-center border-b border-term-line bg-term-panel px-3">
        <div className="h-3 w-28 animate-pulse bg-term-head motion-reduce:animate-none" />
        <span className="sr-only">ページを読み込んでいます</span>
      </div>
      <div className="term-panel-title" aria-hidden="true">
        <span className="term-panel-name">読み込み中</span>
      </div>
      <div aria-hidden="true">
        <div className="h-[26px] border-b border-term-line bg-term-head" />
        {rows.map((row) => (
          <div key={row} className={`flex h-[29px] items-center gap-4 border-b border-term-line-soft px-3 ${row % 2 ? 'bg-term-row-alt' : ''}`}>
            <div className="h-2.5 w-1/4 animate-pulse bg-term-head motion-reduce:animate-none" />
            <div className="h-2.5 w-1/6 animate-pulse bg-term-head motion-reduce:animate-none" />
            <div className="ml-auto h-2.5 w-16 animate-pulse bg-term-head motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    </div>
  );
}
