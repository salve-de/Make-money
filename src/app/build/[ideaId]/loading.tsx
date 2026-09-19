import { LoaderCircle } from 'lucide-react';

export default function BuildLoading() {
  return (
    <main className="min-h-screen bg-[#07080B] text-zinc-100 grid place-items-center">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <LoaderCircle className="h-4 w-4 animate-spin text-emerald-400" />
        Builderを読み込み中…
      </div>
    </main>
  );
}
