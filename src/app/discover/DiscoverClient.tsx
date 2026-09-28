
"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  Database,
  Loader2,
  LogIn,
  MessageSquareText,
  Rocket,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GlobalHeader } from "@/platform/components/navigation/GlobalHeader";
import type {
  DiscoveryCase,
  DiscoveryDataset,
  DiscoveryLens,
} from "@/features/discover";

interface ChatLine {
  role: "user" | "assistant";
  content: string;
}

const LENSES: Array<{ id: DiscoveryLens; label: string; hint: string }> = [
  { id: "SURPRISE", label: "注目順", hint: "登録金額と開始条件を組み合わせて並べる。推定を含む" },
  { id: "BIG_CASH", label: "金額順", hint: "台帳の金額が大きい順。推定・報道を含む" },
  { id: "LOW_CAPITAL", label: "初期資金", hint: "台帳に記録された初期資金が少ない順" },
  { id: "SOLO", label: "初期体制", hint: "開始人数が1人と登録された例を前へ" },
  { id: "LOW_WORK", label: "稼働時間", hint: "週の稼働時間が短いと登録された例を前へ" },
  { id: "CURRENT", label: "現行性", hint: "台帳上の現行性判定を前へ。出典未照合" },
  { id: "FAILURE", label: "撤退事例", hint: "失敗・撤退として登録された事例を前へ" },
];

function buildContext(item: DiscoveryCase): string {
  return [
    "事例: " + item.name,
    "結果: " + item.resultLabel + " " + item.resultValue,
    "資料区分: " + item.resultEvidenceLabel,
    "対象時期: " + (item.resultPeriod || "未設定"),
    "出典表示: " + (item.resultSource || "未設定"),
    "開始条件: " + item.startLine,
    "着眼点: " + item.criticalInsight,
    "顧客が対価を払う理由: " + item.whyMoneyMoved,
    "規模を伸ばす仕組み: " + item.leverage,
    "近い構造: " + item.mechanism.label + " / " + item.mechanismCount + "件",
    "現在性: " + item.currentLabel + " / " + item.currentDetail,
  ].join("\n");
}

function formatResultValue(value: string): string {
  return value.replace(/¥\s*(\d{4,})(億|兆|万)/g, (_match, digits: string, unit: string) =>
    `¥${Number(digits).toLocaleString("ja-JP")}${unit}`,
  );
}

function ResultBlock({ item }: { item: DiscoveryCase }) {
  const evidenceTone = item.resultEvidenceLabel.includes('推定')
    ? 'text-amber-200'
    : item.resultEvidenceLabel.includes('未設定') || item.resultEvidenceLabel.includes('未確認')
      ? 'text-zinc-200'
      : item.resultEvidenceLabel.includes('報道')
        ? 'text-sky-200'
        : item.resultEvidenceLabel.includes('一次資料')
          ? 'text-emerald-200'
          : 'text-zinc-300';

  return (
    <div className="w-[120px] shrink-0 text-right sm:w-[158px]">
      <div className="text-[11px] text-zinc-400">{item.resultLabel}</div>
      <div
        className={[
          "text-base sm:text-lg font-semibold tabular-nums tracking-tight",
          item.resultEvidenceLabel.includes('未設定')
            ? "text-zinc-200"
            : item.resultEvidenceLabel.includes('推定')
              ? "text-amber-100"
              : item.resultEvidenceLabel.includes('報道')
                ? "text-sky-100"
            : item.isFailure ? "text-rose-300" : "text-white",
        ].join(" ")}
      >
        {formatResultValue(item.resultValue)}
      </div>
      <div className={`mt-0.5 text-[11px] leading-tight ${evidenceTone}`}>
        {item.resultEvidenceLabel}
      </div>
    </div>
  );
}

function MemoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <div className="text-xs font-medium text-zinc-400">{label}</div>
      <p className="text-sm leading-relaxed text-zinc-300">{value}</p>
    </div>
  );
}

function DiscoveryRow({
  item,
  selected,
  onSelect,
}: {
  item: DiscoveryCase;
  selected: boolean;
  onSelect: () => void;
}) {
  const compactResultLabel = item.resultLabel.replace(/\s*（月額換算・登録値）$/, "");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-left border-b border-white/[0.1] px-3 py-2.5 sm:px-4 transition-colors",
        selected
          ? "bg-white/[0.07] border-l-2 border-l-emerald-400"
          : "hover:bg-white/[0.035] border-l-2 border-l-transparent",
      ].join(" ")}
    >
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-zinc-400">
          <span>{item.startLine}</span>
          <span className="text-zinc-600">·</span>
          <span>{item.sector}</span>
        </div>

        <div className="text-[15px] font-semibold leading-snug text-zinc-50 line-clamp-2">
          {item.name}
        </div>
        {item.criticalInsight && (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">{item.criticalInsight}</p>
        )}

        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 border-t border-white/[0.08] pt-2">
          <div className="min-w-0">
            <div className="text-[10px] font-medium text-zinc-400">収益パターン候補</div>
            <div className="mt-0.5 text-xs leading-snug text-zinc-100 line-clamp-2">
              {item.mechanism.label}
            </div>
          </div>
          <div className="min-w-[112px] max-w-[48%] text-right">
            <div className="text-[10px] leading-tight text-zinc-400">{compactResultLabel}</div>
            <div className="mt-0.5 text-base font-semibold tabular-nums tracking-tight text-zinc-50">
              {formatResultValue(item.resultValue)}
            </div>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-snug">
          <span className="text-amber-100">{item.resultEvidenceLabel.replace('資料区分: ', '')}</span>
          <span className="text-zinc-500">
            {item.resultPeriod || "時期不明"}
          </span>
        </div>

      </div>
    </button>
  );
}

function DetailPane({
  item,
  onCloseMobile,
}: {
  item: DiscoveryCase;
  onCloseMobile?: () => void;
}) {
  const { token, user, loading, signInWithGoogle } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [isSending, setIsSending] = useState(false);

  const quickPrompts = [
    { label: "収益の仕組み", question: "この事例で確認できる収益の仕組みを整理して" },
    { label: "成立条件", question: "成立条件と、条件が変わると成り立たない点を分けて" },
    { label: "顧客の獲得", question: "初期顧客の獲得方法と、必要な資源をまとめて" },
    { label: "自分への応用", question: "自分の状況と比べるために確認すべき点を挙げて" },
  ];

  const send = async (prompt?: string) => {
    const question = (prompt || chatInput).trim();
    if (!question || isSending) return;

    if (!token) {
      setChatLines((prev) => [
        ...prev,
        { role: "user", content: question },
        {
          role: "assistant",
          content:
            "このページの事例分析はそのまま見られます。追加のAI深掘りだけ、アカウント接続後に使えます。",
        },
      ]);
      setChatInput("");
      return;
    }

    const userLine: ChatLine = { role: "user", content: question };
    const nextLines = [...chatLines, userLine];
    setChatLines(nextLines);
    setChatInput("");
    setIsSending(true);

    try {
      const contextualQuestion =
        buildContext(item) +
        "\n\n質問: " +
        question +
        "\n\n表示済み情報のうち、確認できる事実・推定・未確認を分けて質問に直接答えてください。利用者が求めていない比較や転用を持ち込まず、公開情報で分からない点は未確認としてください。";

      const response = await fetch("/api/strategy-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          action: "CHAT",
          conversationId: "discover_" + item.id,
          contextEntityId: item.id,
          messages: [
            ...nextLines.slice(-6).map((line) => ({ role: line.role, content: line.content })),
            { role: "user", content: contextualQuestion },
          ],
          notes: {},
          userProfile: {
            profileSummary:
              "利用者の目的は未指定です。選択された事例と今回の質問を起点にし、予算・収益目標・運営条件を推測しないでください。",
          },
        }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "分析エンジンとの接続に失敗しました。";
        throw new Error(message);
      }

      const answer =
        data &&
        typeof data === "object" &&
        "message" in data &&
        data.message &&
        typeof data.message === "object" &&
        "content" in data.message &&
        typeof data.message.content === "string"
          ? data.message.content
          : "回答を取得できませんでした。";

      setChatLines((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (error) {
      setChatLines((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "分析エンジンとの接続に失敗しました。",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div data-testid="discover-detail" className="h-full flex flex-col bg-surface">
      <div className="shrink-0 border-b border-white/[0.07] px-4 sm:px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-xl font-semibold tracking-tight text-white break-words">
              {item.name}
            </h2>
            <div className="mt-1 text-sm leading-6 text-zinc-300">
              {item.sector} · {item.startLine}
            </div>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <ResultBlock item={item} />
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 text-zinc-400 hover:text-white"
                aria-label="詳細を閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <details className="border-b border-white/[0.12]">
          <summary className="cursor-pointer px-4 py-2 text-xs text-zinc-400 sm:px-6">数値の出典・対象時期</summary>
          <div className="grid grid-cols-2">
          <div className="min-w-0 px-4 sm:px-6 py-3 border-r border-white/[0.06]">
            <div className="text-xs text-zinc-400">資料区分</div>
            <div className="mt-1 text-sm font-medium text-zinc-100">{item.resultEvidenceLabel.replace('資料区分: ', '')}</div>
            <div className="mt-0.5 max-w-full truncate text-xs text-zinc-400" title={item.resultSource || undefined}>
              {item.resultSource || '出典表示なし'}
            </div>
          </div>
          <div className="px-4 sm:px-6 py-3">
            <div className="text-xs text-zinc-400">対象時期</div>
            <div className="mt-1 text-sm font-medium text-zinc-100">{item.resultPeriod || '未設定'}</div>
            <div className="mt-0.5 text-xs text-zinc-400">
              {item.resultPeriodNote || '数値が示す期間'}
            </div>
          </div>
          </div>
        </details>

        <section className="border-b border-white/[0.12] bg-[#1a2530] px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="text-sm font-medium text-zinc-100">{item.mechanism.label}</div>
            <div className="text-xs text-zinc-400">同じ分類 {item.mechanismCount.toLocaleString()}件</div>
          </div>
        </section>

        <details open className="m-3 rounded-md border border-white/[0.16] bg-[#101721]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 sm:px-6 text-sm text-zinc-200 hover:bg-white/[0.025]">
            <span>事業の説明・分析</span>
            <span className="flex items-center gap-2 text-xs text-amber-200">
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-zinc-300" />
            </span>
          </summary>
          <div className="divide-y divide-white/[0.06] px-4 sm:px-6">
            {item.tagline && (
              <MemoRow label="登録説明" value={item.tagline} />
            )}
            <MemoRow label="事業の要点" value={item.criticalInsight} />
            <MemoRow label="支払理由の分析" value={item.whyMoneyMoved} />
            <MemoRow label="規模を伸ばす分析" value={item.leverage} />
          </div>
        </details>

        {item.related.length > 0 && <section className="m-3 rounded-md border border-white/[0.16] bg-[#101721] px-4 py-3">
          <h3 className="mb-2 text-sm font-semibold text-zinc-100">関連事例</h3>

            <div className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
              {item.related.map((related) => (
                <Link
                  key={related.id}
                  href={"/?entity=" + encodeURIComponent(related.id) + "&mode=LEDGER"}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs group"
                >
                  <span className="text-zinc-300 group-hover:text-white truncate">
                    {related.name}
                  </span>
                  <span className="text-zinc-400 shrink-0">{related.resultValue}</span>
                </Link>
              ))}
            </div>
        </section>}

        <details className="m-3 rounded-md border border-white/[0.16] bg-[#101721]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-200">運営情報・現行性</summary>
          <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="px-4 sm:px-6 py-5 lg:border-r border-white/[0.06]">
            <div className="mb-2 text-sm font-semibold text-zinc-200">現在性の登録判定</div>
            <div
              className={[
                "text-sm font-semibold",
                "text-zinc-200",
              ].join(" ")}
            >
              {item.currentLabel}
            </div>
            <p className="mt-2 text-sm text-zinc-300 leading-6">{item.currentDetail}</p>
          </div>
          <div className="px-4 sm:px-6 py-5 border-t lg:border-t-0 border-white/[0.06]">
            <div className="text-[10px] font-mono text-zinc-500 mb-2">
              運営情報
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {item.descriptors.length > 0 ? (
                item.descriptors.map((fact) => (
                  <div key={fact.label}>
                    <div className="text-[10px] text-zinc-600">{fact.label}</div>
                    <div className="text-xs font-mono text-zinc-300 mt-0.5">{fact.value}</div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-zinc-500 col-span-2">運営特性は未確認です。</div>
              )}
            </div>
          </div>
          </div>
        </details>

        <details className="group m-3 rounded-md border border-white/[0.16] bg-[#101721]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-200 hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
            <MessageSquareText className="h-4 w-4 text-accent" />
            この事例について質問
            <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 text-zinc-500 group-open:rotate-180" />
          </summary>
          <div className="border-t border-white/[0.08] p-3">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => setChatInput(prompt.question)}
                className="rounded border border-white/[0.12] px-2 py-1.5 text-xs text-zinc-300 hover:border-white/30 hover:text-white"
              >
                {prompt.label}
              </button>
            ))}
          </div>

          {chatLines.length > 0 && (
            <div className="mb-3 max-h-72 overflow-y-auto border-y border-white/[0.06] divide-y divide-white/[0.05]">
              {chatLines.map((line, index) => (
                <div key={line.role + "_" + index} className="py-3">
                  <div className="text-[9px] font-mono text-zinc-600 mb-1">
                    {line.role === "user" ? "YOU" : "ANALYST"}
                  </div>
                  <div className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {line.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="py-3 flex items-center gap-2 text-xs text-zinc-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  分析中
                </div>
              )}
            </div>
          )}

          {!loading && !user && (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="mb-3 inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white"
            >
              <LogIn className="w-3.5 h-3.5" />
              Googleでログインして質問する
            </button>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
            className="flex gap-2"
          >
            <input
              aria-label="事例についての質問"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="例：この価格設定が成り立つ条件は？"
              className="flex-1 min-w-0 bg-[#050608] border border-white/[0.09] focus:border-white/[0.22] px-3 py-2.5 text-xs text-white placeholder-zinc-600 outline-none"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isSending}
              className="shrink-0 px-3 py-2.5 text-xs font-semibold bg-zinc-100 text-zinc-950 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-colors"
            >
              聞く
            </button>
          </form>
          </div>
        </details>

        <section className="grid grid-cols-3 items-center gap-2 px-3 py-3 text-xs">
          <Link
            href={`/execute/${encodeURIComponent(item.id)}`}
            className="inline-flex items-center justify-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1 py-2 font-semibold text-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-200"
          >
            <Rocket className="w-3.5 h-3.5" />
            計画を作成
          </Link>
          <Link
            href={"/?entity=" + encodeURIComponent(item.id) + "&mode=LEDGER"}
            className="inline-flex items-center justify-center gap-1 text-zinc-300 hover:text-white"
          >
            <Database className="w-3.5 h-3.5" />
            事例の詳細
          </Link>
          <Link href="/?mode=SYNTHESIS" className="text-center text-zinc-400 hover:text-white">
            事業を検討
          </Link>
        </section>
      </div>
    </div>
  );
}

export function DiscoverClient({ dataset }: { dataset: DiscoveryDataset }) {
  const [lens, setLens] = useState<DiscoveryLens>("SURPRISE");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(
    dataset.highlights[0]?.id || dataset.cases[0]?.id || "",
  );
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const visibleCases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = normalizedQuery
      ? dataset.cases.filter((item) =>
          [
            item.name,
            item.tagline,
            item.startLine,
            item.criticalInsight,
            item.whyMoneyMoved,
            item.leverage,
            item.mechanism.label,
            item.sector,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery),
        )
      : dataset.cases;

    return base.slice().sort((a, b) => b.scores[lens] - a.scores[lens]);
  }, [dataset.cases, lens, query]);

  const selected =
    visibleCases.find((item) => item.id === selectedId) ||
    dataset.cases.find((item) => item.id === selectedId) ||
    visibleCases[0] ||
    dataset.cases[0];

  const choose = (id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setMobileDetailOpen(true);
    }
  };

  return (
    <div className="h-dvh w-full bg-[#060709] text-zinc-100 overflow-hidden flex flex-col">
      <GlobalHeader currentSection="DISCOVER" />
      <h1 className="sr-only">事例を探す</h1>

      <div className="shrink-0 bg-[#08090C] border-b border-white/[0.1] px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:min-w-[240px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="人物・業種・仕組みで検索"
              placeholder="事例名・業種・収益の仕組みで検索"
              className="h-10 w-full rounded-md border border-white/[0.14] bg-surface-raised pl-8 pr-3 text-sm text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-accent"
            />
          </div>

          <select
            aria-label="事例の並び順"
            value={lens}
            onChange={(event) => setLens(event.target.value as DiscoveryLens)}
            className="h-10 w-28 shrink-0 rounded-md border border-white/[0.18] bg-surface-raised px-2 text-sm text-white outline-none focus:border-accent lg:hidden"
          >
            {LENSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <div className="hidden min-w-0 gap-1.5 lg:flex lg:flex-1 lg:flex-wrap">
          {LENSES.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.hint}
              onClick={() => setLens(item.id)}
              aria-pressed={lens === item.id}
              className={[
                "min-h-10 shrink-0 rounded px-2.5 text-xs border transition-colors sm:text-sm",
                lens === item.id
                  ? "bg-sky-300/[0.16] text-sky-50 border-sky-300/55 ring-1 ring-inset ring-sky-300/20"
                  : "bg-transparent text-zinc-300 border-white/[0.14] hover:text-white hover:border-white/[0.24] hover:bg-white/[0.04]",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      <main className="flex-1 min-h-0 flex overflow-hidden">
        <section data-testid="discover-list" className="w-full lg:w-[46%] xl:w-[44%] min-w-0 border-r border-white/[0.06] bg-[#07080B] flex flex-col">
          <div className="shrink-0 px-3 py-2 sm:px-4 border-b border-white/[0.1] flex items-center justify-between gap-3 text-sm text-zinc-300">
            <span className="font-medium tabular-nums">
              {query ? `検索結果 ${visibleCases.length}件` : `${dataset.visibleCount}件を表示`}
            </span>
            <span className="text-right text-[11px] text-zinc-500">
              {query ? `全${dataset.sourceCount.toLocaleString()}件から` : `全${dataset.sourceCount.toLocaleString()}件 · ${LENSES.find((item) => item.id === lens)?.label}`}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {visibleCases.map((item) => (
              <DiscoveryRow
                key={item.id}
                item={item}
                selected={selected?.id === item.id}
                onSelect={() => choose(item.id)}
              />
            ))}

            {visibleCases.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-sm text-zinc-400">一致する事例がありません。</div>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-2 text-xs text-zinc-500 hover:text-white"
                >
                  検索を解除
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="hidden lg:block flex-1 min-w-0">
          {selected ? (
            <DetailPane item={selected} />
          ) : (
            <div className="h-full grid place-items-center text-xs text-zinc-600">
              表示できる事例がありません。
            </div>
          )}
        </section>
      </main>

      {mobileDetailOpen && selected && (
        <div className="fixed inset-0 z-50 lg:hidden bg-[#07080B]">
          <DetailPane
            item={selected}

            onCloseMobile={() => setMobileDetailOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
