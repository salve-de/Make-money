export default function ExecutionLoading() {
  const rows = Array.from({ length: 8 }, (_, index) => index);
  return (
    <main className="min-h-screen bg-term-bg text-term-fg" role="status" aria-live="polite">
      <div className="term-panel-title">
        <span className="term-panel-name">実行計画</span>読み込み中
      </div>
      <div aria-hidden="true">
        {rows.map((row) => (
          <div key={row} className={`flex h-[29px] items-center gap-4 border-b border-term-line-soft px-3 ${row % 2 ? 'bg-term-row-alt' : ''}`}>
            <div className="h-2.5 w-1/4 animate-pulse bg-term-head motion-reduce:animate-none" />
            <div className="ml-auto h-2.5 w-16 animate-pulse bg-term-head motion-reduce:animate-none" />
          </div>
        ))}
      </div>
      <span className="sr-only">実行計画を読み込んでいます</span>
    </main>
  );
}
