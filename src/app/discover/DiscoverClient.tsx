
"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ReaderLedger } from "@/features/company-inspector";
import { UI } from "@/shared/ui-strings";
import { readerContextText } from "@/shared/display-text";
import { GlobalHeader } from "@/platform/components/navigation/GlobalHeader";
import { SquareTabs } from "@/platform/components/navigation/SquareTabs";
import { readStrategyError } from "@/shared/strategy-client";
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
  { id: "SURPRISE", label: "注目順", hint: "記録された金額と開始条件を組み合わせて並べる。推定を含む" },
  { id: "BIG_CASH", label: "金額順", hint: "記録された金額が大きい順。推定・報道を含む" },
  { id: "LOW_CAPITAL", label: "初期資金", hint: "記録された初期資金が少ない順" },
  { id: "SOLO", label: "初期体制", hint: "開始人数が1人と登録された例を前へ" },
  { id: "LOW_WORK", label: "稼働時間", hint: "週の稼働時間が短いと登録された例を前へ" },
  { id: "CURRENT", label: "現行性", hint: "記録上の現行性の判定を前へ。出典は未照合" },
  { id: "FAILURE", label: "撤退事例", hint: "失敗・撤退として登録された事例を前へ" },
];

function buildContext(item: DiscoveryCase): string {
  // AI への文脈は entity.reader の facts・metrics・unknowns だけで作る
  return readerContextText(item.name, item.reader) ?? "事例: " + item.name + "\n出典付きの記録はまだありません。";
}

/** 由来の文字（推定だけ橙）。数値が無い時は空。 */
function evidenceTone(label: string): string {
  if (label.includes("推定") || label.includes("推計")) return "text-term-accent";
  return "text-term-muted";
}

function valueTone(item: DiscoveryCase): string {
  if (!item.resultMetricId) return "text-term-dim";
  // 一覧では推定の数値そのものは色を付けず、横の「推定」表示だけを橙にする（強調色を増やさない）
  if (item.resultEvidenceLabel.includes("推定")) return "text-term-fg";
  return item.isFailure ? "text-term-danger" : "text-term-fg-strong";
}

/** 数値が無い事例は、保存済みの文言がどうであれ「—」にする。 */
function resultText(item: DiscoveryCase): string {
  return item.resultMetricId ? item.resultValue : UI.LIST_REVENUE_UNKNOWN;
}

/** 数値（entity.reader.metrics の1件）の要素に付ける出どころの印。無ければ何も付けない。 */
function metricAttrs(item: DiscoveryCase): Record<string, string> {
  return item.resultMetricId ? { "data-metric": item.resultMetricId } : {};
}

const ROW_GRID = "lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_136px_72px] xl:grid-cols-[minmax(0,1.1fr)_88px_minmax(0,1.3fr)_136px_72px]";

function ResultBlock({ item }: { item: DiscoveryCase }) {
  return (
    <div className="shrink-0 text-right" {...metricAttrs(item)}>
      <div className="text-xs text-term-label">{item.resultLabel}</div>
      <div className={`term-num text-lg ${valueTone(item)}`}>{resultText(item)}</div>
      {item.resultEvidenceLabel && <div className={`text-xs ${evidenceTone(item.resultEvidenceLabel)}`}>{item.resultEvidenceLabel}</div>}
    </div>
  );
}

export function DiscoveryRow({
  item,
  index = 0,
  selected,
  onSelect,
}: {
  item: DiscoveryCase;
  index?: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-term-line-soft px-3 py-1.5 text-left text-sm lg:min-h-[29px] lg:py-1 ${ROW_GRID} ${
        selected ? "bg-term-select text-term-fg-strong" : index % 2 ? "bg-term-row-alt hover:bg-term-head" : "hover:bg-term-head"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold text-term-fg-strong">{item.name}</span>
        {item.summaryFactId && item.summaryText && (
          <span className="mt-0.5 line-clamp-2 text-xs text-term-sub lg:hidden">{item.summaryText}</span>
        )}
        {item.sector && <span className="block truncate text-xs text-term-label lg:hidden">{item.sector}</span>}
      </span>
      <span className="hidden truncate text-term-muted xl:block">{item.sector}</span>
      <span className="hidden min-w-0 lg:block">
        {item.summaryFactId && item.summaryText && (
          <span data-fact={item.summaryFactId} className="block truncate text-term-sub" title={item.summaryText}>{item.summaryText}</span>
        )}
      </span>
      <span className="text-right" {...metricAttrs(item)}>
        <span className={`term-num ${valueTone(item)}`}>{resultText(item)}</span>
        <span className="ml-1 text-xs text-term-label">{item.resultLabel}</span>
        {item.resultEvidenceLabel && <span className={`block text-xs lg:hidden ${evidenceTone(item.resultEvidenceLabel)}`}>{item.resultEvidenceLabel}</span>}
      </span>
      <span className="hidden truncate text-xs lg:block" {...metricAttrs(item)}>
        {item.resultEvidenceLabel && <span className={evidenceTone(item.resultEvidenceLabel)}>{item.resultEvidenceLabel}</span>}
      </span>
    </button>
  );
}

export function DetailPane({
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
    { label: UI.ASK_Q1, question: "この事例で確認できる収益の仕組みを整理して" },
    { label: UI.ASK_Q2, question: "成立条件と、条件が変わると成り立たない点を分けて" },
    { label: UI.ASK_Q3, question: "初期顧客の獲得方法と、必要な資源をまとめて" },
    { label: UI.ASK_Q4, question: "自分の状況と比べるために確認すべき点を挙げて" },
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
        throw new Error(readStrategyError(data, response.status, "分析エンジンとの接続に失敗しました。"));
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

  const actionBtn = "inline-flex min-h-11 items-center justify-center rounded-sm border px-3 text-sm lg:min-h-8";
  return (
    <div data-testid="discover-detail" className="flex h-full flex-col bg-term-bg">
      <div className="term-panel-title shrink-0">
        <span className="term-panel-name">{UI.CASE_DETAIL}</span>
        {item.sector && <span className="truncate">{item.sector}</span>}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto inline-flex min-h-11 items-center gap-1 px-2 text-sm text-term-sub hover:text-term-fg-strong lg:hidden"
            aria-label={UI.DETAIL_CLOSE_ARIA}
          >
            <X aria-hidden="true" className="h-4 w-4" />{UI.CLOSE}
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-term-line px-3 py-3">
        <h2 className="min-w-0 break-words text-lg font-semibold text-term-fg-strong">{item.name}</h2>
        <ResultBlock item={item} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 詳細は entity.reader（出典つきの事実・数値・出典）だけを読む */}
        <ReaderLedger reader={item.reader} />

        <details className="group border-b border-term-line">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm text-term-fg lg:min-h-8">
            {UI.ASK_TITLE}
          </summary>
          <div className="border-t border-term-line-soft p-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => setChatInput(prompt.question)}
                  className="min-h-11 rounded-sm border border-term-line px-3 text-sm text-term-fg hover:bg-term-head lg:min-h-8"
                >
                  {prompt.label}
                </button>
              ))}
            </div>

            {chatLines.length > 0 && (
              <div className="mb-3 max-h-72 overflow-y-auto border-y border-term-line-soft">
                {chatLines.map((line, index) => (
                  <div key={line.role + "_" + index} className="border-b border-term-line-soft py-2 last:border-b-0">
                    <div className="mb-0.5 text-xs text-term-label">{line.role === "user" ? "あなた" : "回答"}</div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-term-fg">{line.content}</div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex items-center gap-2 py-2 text-sm text-term-label">
                    <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                    分析中
                  </div>
                )}
              </div>
            )}

            {!loading && !user && (
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className={`${actionBtn} mb-3 border-term-line text-term-fg hover:bg-term-head`}
              >
                {UI.ASK_LOGIN}
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
                aria-label={UI.ASK_INPUT_ARIA}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={UI.ASK_PLACEHOLDER}
                className="min-h-11 min-w-0 flex-1 rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent lg:min-h-8"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSending}
                className={`${actionBtn} shrink-0 border-term-accent bg-transparent text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-30`}
              >
                {UI.ASK_SUBMIT}
              </button>
            </form>
          </div>
        </details>

        <section className="flex flex-wrap items-center gap-2 px-3 py-3">
          <Link
            href={"/?entity=" + encodeURIComponent(item.id) + "&mode=LEDGER"}
            className={`${actionBtn} border-term-line text-term-fg hover:bg-term-head`}
          >
            {UI.CASE_DETAIL}
          </Link>
          <Link href="/?mode=SYNTHESIS" className={`${actionBtn} border-term-line text-term-fg hover:bg-term-head`}>
            {UI.CONSIDER}
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
            item.summaryText,
            ...(item.reader?.facts.map((fact) => fact.text) ?? []),
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

  const lensTabs = LENSES.map((item) => ({ key: item.id, label: item.label }));
  return (
    <div className="flex term-screen w-full flex-col overflow-hidden bg-term-bg text-term-fg">
      <GlobalHeader currentSection="DISCOVER" pageHasSearch />
      <h1 className="sr-only">事例を探す</h1>

      <div className="shrink-0 border-b border-term-line bg-term-panel">
        <div className="term-panel-title">
          <span className="term-panel-name max-lg:hidden">事例を探す</span>
          <span className="term-num">
            {query ? `検索結果 ${visibleCases.length}件 / 全${dataset.sourceCount.toLocaleString()}件` : `${dataset.visibleCount.toLocaleString()}件を表示 / 全${dataset.sourceCount.toLocaleString()}件`}
          </span>
          <span className="ml-auto hidden xl:inline">並び順: {LENSES.find((item) => item.id === lens)?.hint}</span>
        </div>
        <div className="flex items-center gap-2 p-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search aria-hidden="true" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-term-label" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="人物・業種・仕組みで検索"
              placeholder="事例名・業種・収益の仕組みで検索"
              className="h-11 w-full rounded-sm border border-term-line bg-term-bg pl-8 pr-3 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent lg:h-7"
            />
          </div>

          <select
            aria-label="事例の並び順"
            value={lens}
            onChange={(event) => setLens(event.target.value as DiscoveryLens)}
            className="h-11 w-28 shrink-0 rounded-sm border border-term-line bg-term-bg px-2 text-sm text-term-fg-strong outline-none focus:border-term-accent lg:hidden"
          >
            {LENSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <SquareTabs
            ariaLabel="並び順"
            tabs={lensTabs}
            value={lens}
            onChange={setLens}
            className="hidden border-l border-term-line lg:flex"
          />
        </div>
      </div>

      <main className="flex min-h-0 flex-1 overflow-hidden">
        <section data-testid="discover-list" className="flex min-w-0 w-full flex-col border-r border-term-line bg-term-bg lg:w-[58%] xl:w-[56%]">
          <div className={`hidden h-[26px] shrink-0 items-center gap-x-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label lg:grid ${ROW_GRID}`}>
            <span>{UI.LIST_COL_NAME}</span>
            <span className="hidden xl:block">{UI.LIST_COL_SECTOR}</span>
            <span>{UI.LIST_COL_SUMMARY}</span>
            <span className="text-right">{UI.LIST_COL_AMOUNT}</span>
            <span>{UI.LIST_COL_ORIGIN}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {visibleCases.map((item, index) => (
              <DiscoveryRow
                key={item.id}
                item={item}
                index={index}
                selected={selected?.id === item.id}
                onSelect={() => choose(item.id)}
              />
            ))}

            {visibleCases.length === 0 && (
              <div className="px-3 py-4 text-sm">
                <div className="text-term-fg-strong">一致する事例がありません。</div>
                <p className="mt-1 text-term-sub">検索語を短くするか、検索を解除して全件に戻してください。</p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="mt-3 inline-flex min-h-11 items-center rounded-sm border border-term-accent px-4 text-sm text-term-accent hover:bg-term-head lg:min-h-8"
                >
                  検索を解除
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="hidden min-w-0 flex-1 lg:block">
          {selected ? (
            <DetailPane item={selected} />
          ) : (
            <div className="px-3 py-4 text-sm text-term-label">表示できる事例がありません。</div>
          )}
        </section>
      </main>

      {mobileDetailOpen && selected && (
        <div className="fixed inset-0 z-50 bg-term-bg lg:hidden">
          <DetailPane item={selected} onCloseMobile={() => setMobileDetailOpen(false)} />
        </div>
      )}
    </div>
  );
}
