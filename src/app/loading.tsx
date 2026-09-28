export default function Loading() {
  return (
    <div className="min-h-dvh bg-[#0c1016] text-zinc-300" role="status" aria-live="polite">
      <div className="h-0.5 w-full overflow-hidden bg-white/[0.06]">
        <div className="h-full w-1/3 animate-pulse bg-sky-300/80 motion-reduce:animate-none" />
      </div>
      <header className="flex h-14 items-center border-b border-white/[0.12] px-4">
        <div className="h-4 w-28 animate-pulse rounded bg-white/[0.09] motion-reduce:animate-none" />
        <span className="sr-only">ページを読み込んでいます</span>
      </header>
      <main className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6" aria-hidden="true">
        <div className="h-6 w-40 animate-pulse rounded bg-white/[0.09] motion-reduce:animate-none" />
        <div className="h-11 w-full animate-pulse rounded-md bg-white/[0.045] motion-reduce:animate-none" />
        <div className="space-y-3 border-y border-white/[0.1] py-5">
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.07] motion-reduce:animate-none" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.05] motion-reduce:animate-none" />
        </div>
      </main>
    </div>
  );
}
