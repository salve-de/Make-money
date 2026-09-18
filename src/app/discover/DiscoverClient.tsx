
"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Database,
  ExternalLink,
  Loader2,
  LogIn,
  MessageSquareText,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type {
  DiscoveryCase,
  DiscoveryDataset,
  DiscoveryLens,
} from "@/features/discover/discovery-model";

interface ChatLine {
  role: "user" | "assistant";
  content: string;
}

const LENSES: Array<{ id: DiscoveryLens; label: string; hint: string }> = [
  { id: "SURPRISE", label: "まず見る", hint: "持っていたものに対して結果が大きい順" },
  { id: "BIG_CASH", label: "大きい金", hint: "確認できる金額が大きい順" },
  { id: "LOW_CAPITAL", label: "少資本", hint: "初期資金が小さい事例を前へ" },
  { id: "SOLO", label: "一人", hint: "一人開始・一人運営を前へ" },
  { id: "LOW_WORK", label: "少労働", hint: "週の稼働時間が短い事例を前へ" },
  { id: "CURRENT", label: "今も生きている", hint: "現在も有効・上昇中の事例を前へ" },
  { id: "FAILURE", label: "失敗から見る", hint: "失敗・撤退から境界線を見る" },
];

function buildContext(item: DiscoveryCase): string {
  return [
    "事例: " + item.name,
    "結果: " + item.resultLabel + " " + item.resultValue,
    "開始条件: " + item.startLine,
    "急所: " + item.criticalInsight,
    "なぜ金が動いた: " + item.whyMoneyMoved,
    "レバレッジ: " + item.leverage,
    "近い構造: " + item.mechanism.label + " / " + item.mechanismCount + "件",
    "現在性: " + item.currentLabel + " / " + item.currentDetail,
  ].join("\n");
}

function ResultBlock({ item }: { item: DiscoveryCase }) {
  return (
    <div className="min-w-[150px] text-right">
      <div className="text-[10px] font-mono text-zinc-500">{item.resultLabel}</div>
      <div
        className={[
          "text-base sm:text-lg font-semibold tabular-nums tracking-tight",
          item.isFailure ? "text-rose-300" : "text-white",
        ].join(" ")}
      >
        {item.resultValue}
      </div>
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-left border-b border-white/[0.055] px-3 sm:px-4 py-3 transition-colors",
        selected
          ? "bg-white/[0.07] border-l-2 border-l-emerald-400"
          : "hover:bg-white/[0.035] border-l-2 border-l-transparent",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mb-1">
            <span>{item.startLine}</span>
            <span className="text-zinc-700">/</span>
            <span>{item.sector}</span>
            {item.isCurrent && (
              <>
                <span className="text-zinc-700">/</span>
                <span className="text-emerald-400">現在も有効</span>
              </>
            )}
          </div>
          <div className="text-sm font-semibold text-zinc-100 truncate">{item.name}</div>
          <div className="mt-1 text-xs sm:text-[13px] text-zinc-300 leading-relaxed line-clamp-2">
            {item.criticalInsight}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
            <span className="text-cyan-300/90">{item.mechanism.label}</span>
            <span>近い急所 {item.mechanismCount}件</span>
            {item.evidenceCount > 0 && <span>根拠カード {item.evidenceCount}</span>}
          </div>
        </div>
        <ResultBlock item={item} />
      </div>
    </button>
  );
}

function DetailPane({
  item,
  sourceCount,
  onCloseMobile,
}: {
  item: DiscoveryCase;
  sourceCount: number;
  onCloseMobile?: () => void;
}) {
  const { token, user, loading, signInWithGoogle } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [isSending, setIsSending] = useState(false);

  const quickPrompts = [
    "この成功の本当に持ち運べる部分だけを3つに絞って",
    "似た失敗例と比べて、成立条件の境界線を出して",
    "この急所を日本の別業界へ移植する候補を出して",
    "この急所から最小のMVPに落とすなら何を作る？",
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
        "\n\nこの事例の表示済み事実と根拠の範囲を起点に、成功保証や架空の数字を足さず、重要な急所・別事例との比較・別市場への転用可能性を日本語で具体的に答えてください。";

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
              "金を増やす方法を広く探索し、成功の決定的な急所・再現条件・失敗境界・別市場への転用を重視。",
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
    <div data-testid="discover-detail" className="h-full flex flex-col bg-[#07080B]">
      <div className="shrink-0 border-b border-white/[0.07] px-4 sm:px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-zinc-500 mb-1">{item.startLine}</div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white truncate">
              {item.name}
            </h2>
            <div className="mt-1 text-xs text-zinc-500">{item.tagline}</div>
          </div>
          <div className="flex items-start gap-2">
            <ResultBlock item={item} />
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 text-zinc-400 hover:text-white"
                aria-label="詳細を閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <section className="px-4 sm:px-6 py-5 border-b border-white/[0.06]">
          <div className="text-[10px] font-mono tracking-[0.18em] text-emerald-400 mb-2">
            THE CRITICAL MOVE
          </div>
          <div className="text-xl sm:text-2xl leading-snug font-semibold tracking-tight text-white">
            {item.criticalInsight}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 border-b border-white/[0.06]">
          <div className="px-4 sm:px-6 py-5 lg:border-r border-white/[0.06]">
            <div className="text-[10px] font-mono text-zinc-500 mb-2">なぜ金が動いた？</div>
            <p className="text-sm text-zinc-200 leading-relaxed">{item.whyMoneyMoved}</p>
          </div>
          <div className="px-4 sm:px-6 py-5 border-t lg:border-t-0 border-white/[0.06]">
            <div className="text-[10px] font-mono text-zinc-500 mb-2">どこで出力が跳ねた？</div>
            <p className="text-sm text-zinc-200 leading-relaxed">{item.leverage}</p>
          </div>
        </section>

        <section className="px-4 sm:px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-end justify-between gap-4 mb-3">
            <div>
              <div className="text-[10px] font-mono text-zinc-500">こいつだけ？</div>
              <div className="mt-1 text-base font-semibold text-white">
                「{item.mechanism.label}」に近い記録が {item.mechanismCount.toLocaleString()}件
              </div>
            </div>
            <div className="text-[10px] font-mono text-zinc-600">
              全 {sourceCount.toLocaleString()} 事例を横断
            </div>
          </div>

          {item.related.length > 0 ? (
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
                  <span className="font-mono text-zinc-500 shrink-0">{related.resultValue}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-xs text-zinc-500">
              近い急所の公開事例はこの表示範囲では未確認です。
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 border-b border-white/[0.06]">
          <div className="px-4 sm:px-6 py-5 lg:border-r border-white/[0.06]">
            <div className="text-[10px] font-mono text-zinc-500 mb-2">今も使える？</div>
            <div
              className={[
                "text-sm font-semibold",
                item.isCurrent
                  ? "text-emerald-300"
                  : item.isFailure
                    ? "text-rose-300"
                    : "text-zinc-200",
              ].join(" ")}
            >
              {item.currentLabel}
            </div>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{item.currentDetail}</p>
          </div>
          <div className="px-4 sm:px-6 py-5 border-t lg:border-t-0 border-white/[0.06]">
            <div className="text-[10px] font-mono text-zinc-500 mb-2">
              これは「原因」ではなく特徴
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
        </section>

        <section className="px-4 sm:px-6 py-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-[10px] font-mono tracking-[0.16em] text-cyan-400">
                ASK / TRANSFER
              </div>
              <h3 className="text-sm font-semibold text-white mt-1">
                この急所を、自分の金儲けまで進める
              </h3>
            </div>
            <MessageSquareText className="w-4 h-4 text-zinc-500" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void send(prompt)}
                className="text-left text-xs text-zinc-300 hover:text-white border border-white/[0.08] hover:border-white/[0.18] bg-white/[0.02] hover:bg-white/[0.05] px-3 py-2.5 transition-colors"
              >
                {prompt}
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
              AI深掘りを使うためGoogleで接続
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
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="例：この急所を商品を作らずに使うなら？"
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
        </section>

        <section className="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <Link
            href={"/?entity=" + encodeURIComponent(item.id) + "&mode=LEDGER"}
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white"
          >
            <Database className="w-3.5 h-3.5" />
            元事例の全データ
            <ExternalLink className="w-3 h-3 text-zinc-600" />
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-zinc-500">
            金額未確認・推定・歴史限定は元データの表示区分を引き継ぎます。
          </span>
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
    setMobileDetailOpen(true);
  };

  return (
    <div className="h-dvh w-full bg-[#060709] text-zinc-100 overflow-hidden flex flex-col">
      <header className="shrink-0 border-b border-white/[0.07] bg-[#07080B]">
        <div className="h-12 px-3 sm:px-5 flex items-center justify-between gap-4">
          <Link href="/discover" className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-white">
              MAKEMONEY
            </span>
            <span className="text-[10px] font-mono text-zinc-600 hidden sm:inline">
              / DISCOVER
            </span>
          </Link>
          <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
            <span>{dataset.sourceCount.toLocaleString()}事例を横断</span>
            <Link href="/" className="text-zinc-400 hover:text-white inline-flex items-center gap-1">
              事例DB
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="px-3 sm:px-5 py-4 sm:py-5 border-t border-white/[0.04]">
          <div className="max-w-5xl">
            <div className="text-[10px] font-mono tracking-[0.2em] text-emerald-400 mb-2">
              WHAT ACTUALLY MADE THE MONEY
            </div>
            <h1 className="text-2xl sm:text-4xl font-semibold tracking-[-0.035em] leading-tight text-white">
              金を作った「決定的な一手」だけ。
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-3xl">
              誰がすごかったかではなく、何が結果を変えたか。特殊例か、他でも起きたか、今も生きているかまで一気に見る。
            </p>
          </div>
        </div>

        {dataset.highlights.length > 0 && (
          <div className="hidden lg:grid grid-cols-3 border-t border-white/[0.06]">
            {dataset.highlights.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => choose(item.id)}
                className="text-left px-5 py-3 border-r last:border-r-0 border-white/[0.06] hover:bg-white/[0.035] transition-colors"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[10px] font-mono text-zinc-500 truncate">
                    {item.startLine}
                  </span>
                  <span className="text-sm font-semibold text-white shrink-0">{item.resultValue}</span>
                </div>
                <div className="mt-1.5 text-xs text-zinc-300 leading-relaxed line-clamp-2">
                  {item.criticalInsight}
                </div>
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="shrink-0 bg-[#08090C] border-b border-white/[0.06] px-3 sm:px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="relative min-w-[190px] sm:min-w-[240px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="人物・急所・金の取り方を検索"
              className="w-full bg-[#050608] border border-white/[0.07] focus:border-white/[0.18] pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 outline-none"
            />
          </div>

          <span className="text-[10px] font-mono text-zinc-600 shrink-0 hidden sm:inline">
            見方を変える
          </span>
          {LENSES.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.hint}
              onClick={() => setLens(item.id)}
              className={[
                "shrink-0 px-2.5 py-1.5 text-[11px] border transition-colors",
                lens === item.id
                  ? "bg-white/[0.09] text-white border-white/[0.16]"
                  : "bg-transparent text-zinc-500 border-white/[0.05] hover:text-zinc-300 hover:border-white/[0.1]",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 min-h-0 flex overflow-hidden">
        <section data-testid="discover-list" className="w-full md:w-[44%] lg:w-[42%] xl:w-[40%] min-w-0 border-r border-white/[0.06] bg-[#07080B] flex flex-col">
          <div className="shrink-0 px-3 sm:px-4 py-2 border-b border-white/[0.05] flex items-center justify-between text-[10px] font-mono text-zinc-600">
            <span>
              {query
                ? "検索結果 " + visibleCases.length + "件"
                : dataset.visibleCount +
                  "件を表示 / 全" +
                  dataset.sourceCount.toLocaleString() +
                  "件から抽出"}
            </span>
            <span>{LENSES.find((item) => item.id === lens)?.hint}</span>
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

        <section className="hidden md:block flex-1 min-w-0">
          {selected ? (
            <DetailPane item={selected} sourceCount={dataset.sourceCount} />
          ) : (
            <div className="h-full grid place-items-center text-xs text-zinc-600">
              表示できる事例がありません。
            </div>
          )}
        </section>
      </main>

      {mobileDetailOpen && selected && (
        <div className="fixed inset-0 z-50 md:hidden bg-[#07080B]">
          <DetailPane
            item={selected}
            sourceCount={dataset.sourceCount}
            onCloseMobile={() => setMobileDetailOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
