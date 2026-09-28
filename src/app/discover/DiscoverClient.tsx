
"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { GlobalHeader } from "@/platform/components/navigation/GlobalHeader";
import { SquareTabs } from "@/platform/components/playbook/SquareTabs";
import { formatYen } from "@/platform/utils/moneyDisplay";
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

const YEN_UNIT: Record<string, number> = { 兆: 1_000_000_000_000, 億: 100_000_000, 万: 10_000 };

/** 登録された文字列中の円金額を、共通の金額表記（moneyDisplay）へそろえる。 */
function normalizeYenText(value: string): string {
  return value.replace(/(-?)¥\s*([\d,.]+)(兆|億|万)?/g, (_match, minus: string, digits: string, unit?: string) => {
    const amount = Number(digits.replace(/,/g, "")) * (unit ? YEN_UNIT[unit] : 1);
    if (!Number.isFinite(amount)) return _match;
    return formatYen(minus ? -amount : amount);
  });
}

function displayResult(item: DiscoveryCase): string {
  return item.resultAmountJpy !== null ? formatYen(item.resultAmountJpy) : normalizeYenText(item.resultValue);
}

/** 金額の種類（列見出しを兼ねる短い表記） */
function resultKind(item: DiscoveryCase): string {
  if (item.resultLabel.startsWith("営業損失")) return "損失";
  if (item.resultLabel.startsWith("営業利益")) return "利益";
  if (item.resultLabel.startsWith("売上")) return "売上";
  return "";
}

function evidenceShort(item: DiscoveryCase): string {
  return item.resultEvidenceLabel.replace("資料区分: ", "");
}

function evidenceTone(label: string): string {
  if (label.includes("推定") || label.includes("推計")) return "text-term-accent";
  if (label.includes("未設定") || label.includes("未確認")) return "text-term-dim";
  return "text-term-muted";
}

function valueTone(item: DiscoveryCase): string {
  const label = item.resultEvidenceLabel;
  if (label.includes("未設定") || label.includes("未確認") || item.resultAmountJpy === null) return "text-term-dim";
  // 一覧では推定の数値そのものは色を付けず、横の「推定」表示だけを橙にする（強調色を増やさない）
  if (label.includes("推定") || label.includes("推計")) return "text-term-fg";
  return item.isFailure ? "text-term-danger" : "text-term-fg-strong";
}

const ROW_GRID = "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_128px_64px] xl:grid-cols-[minmax(0,1.4fr)_88px_minmax(0,1fr)_128px_64px]";

function ResultBlock({ item }: { item: DiscoveryCase }) {
  return (
    <div className="shrink-0 text-right">
      <div className="text-xs text-term-label">{item.resultLabel}</div>
      <div className={`term-num text-lg ${valueTone(item)}`}>{displayResult(item)}</div>
      <div className={`text-xs ${evidenceTone(evidenceShort(item))}`}>{evidenceShort(item)}</div>
    </div>
  );
}

function MemoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 border-b border-term-line-soft px-3 py-2 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <div className="text-xs text-term-label sm:pt-0.5">{label}</div>
      <p className="text-sm leading-relaxed text-term-fg">{value}</p>
    </div>
  );
}

function DiscoveryRow({
  item,
  index,
  selected,
  onSelect,
}: {
  item: DiscoveryCase;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const kind = resultKind(item);
  const status = evidenceShort(item);
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
        <span className="block truncate text-xs text-term-label lg:hidden">{item.sector} · {item.mechanism.label}</span>
      </span>
      <span className="hidden truncate text-term-muted xl:block">{item.sector}</span>
      <span className="hidden truncate text-term-sub lg:block">{item.mechanism.label}</span>
      <span className="text-right">
        <span className={`term-num ${valueTone(item)}`}>{displayResult(item)}</span>
        {kind && <span className="ml-1 text-xs text-term-label">{kind}</span>}
        <span className={`block text-xs lg:hidden ${evidenceTone(status)}`}>{status}</span>
      </span>
      <span className={`hidden truncate text-xs lg:block ${evidenceTone(status)}`}>{status}</span>
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

  const actionBtn = "inline-flex min-h-11 items-center justify-center rounded-sm border px-3 text-sm lg:min-h-8";
  return (
    <div data-testid="discover-detail" className="flex h-full flex-col bg-term-bg">
      <div className="term-panel-title shrink-0">
        <span className="term-panel-name">事例の詳細</span>
        <span className="truncate">{item.sector} · {item.startLine}</span>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto inline-flex min-h-11 items-center gap-1 px-2 text-sm text-term-sub hover:text-term-fg-strong lg:hidden"
            aria-label="詳細を閉じる"
          >
            <X aria-hidden="true" className="h-4 w-4" />閉じる
          </button>
        )}
      </div>
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-term-line px-3 py-3">
        <h2 className="min-w-0 break-words text-lg font-semibold text-term-fg-strong">{item.name}</h2>
        <ResultBlock item={item} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <details className="border-b border-term-line">
          <summary className="min-h-11 cursor-pointer px-3 py-3 text-xs text-term-label lg:min-h-0 lg:py-1.5">数値の出典・対象時期</summary>
          <dl className="grid grid-cols-2 border-t border-term-line-soft">
            <div className="min-w-0 border-r border-term-line-soft px-3 py-2">
              <dt className="text-xs text-term-label">資料区分</dt>
              <dd className="text-sm text-term-fg-strong">{evidenceShort(item)}</dd>
              <dd className="max-w-full truncate text-xs text-term-label" title={item.resultSource || undefined}>
                {item.resultSource || "出典表示なし"}
              </dd>
            </div>
            <div className="px-3 py-2">
              <dt className="text-xs text-term-label">対象時期</dt>
              <dd className="term-num text-sm text-term-fg-strong">{item.resultPeriod || "未設定"}</dd>
              <dd className="text-xs text-term-label">{item.resultPeriodNote || "数値が示す期間"}</dd>
            </div>
          </dl>
        </details>

        <section className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-term-line bg-term-head px-3 py-2">
          <div className="text-sm text-term-fg-strong">{item.mechanism.label}</div>
          <div className="term-num text-xs text-term-label">同じ分類 {item.mechanismCount.toLocaleString()}件</div>
        </section>

        <details open className="border-b border-term-line">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm text-term-fg lg:min-h-8">事業の説明・分析</summary>
          <div className="border-t border-term-line-soft">
            {item.tagline && <MemoRow label="登録説明" value={item.tagline} />}
            <MemoRow label="事業の要点" value={item.criticalInsight} />
            <MemoRow label="支払理由の分析" value={item.whyMoneyMoved} />
            <MemoRow label="規模を伸ばす分析" value={item.leverage} />
          </div>
        </details>

        {item.related.length > 0 && <section className="border-b border-term-line">
          <h3 className="border-b border-term-line-soft bg-term-head px-3 py-1 text-xs text-term-label">関連事例</h3>
          {item.related.map((related) => (
            <Link
              key={related.id}
              href={"/?entity=" + encodeURIComponent(related.id) + "&mode=LEDGER"}
              className="flex min-h-11 items-center justify-between gap-3 border-b border-term-line-soft px-3 text-sm hover:bg-term-select lg:min-h-[29px]"
            >
              <span className="truncate text-term-fg">{related.name}</span>
              <span className="term-num shrink-0 text-term-muted">{normalizeYenText(related.resultValue)}</span>
            </Link>
          ))}
        </section>}

        <details className="border-b border-term-line">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm text-term-fg lg:min-h-8">運営情報・現行性</summary>
          <div className="grid grid-cols-1 border-t border-term-line-soft lg:grid-cols-2">
            <div className="px-3 py-3 lg:border-r lg:border-term-line-soft">
              <div className="mb-1 text-xs text-term-label">現在性の登録判定</div>
              <div className="text-sm text-term-fg-strong">{item.currentLabel}</div>
              <p className="mt-1 text-sm leading-6 text-term-sub">{item.currentDetail}</p>
            </div>
            <div className="border-t border-term-line-soft px-3 py-3 lg:border-t-0">
              <div className="mb-1 text-xs text-term-label">運営情報</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {item.descriptors.length > 0 ? (
                  item.descriptors.map((fact) => (
                    <div key={fact.label}>
                      <div className="text-xs text-term-label">{fact.label}</div>
                      <div className="term-num text-sm text-term-fg">{fact.value}</div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-sm text-term-dim">運営特性は未確認</div>
                )}
              </div>
            </div>
          </div>
        </details>

        <details className="group border-b border-term-line">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm text-term-fg lg:min-h-8">
            この事例について質問
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
                className="min-h-11 min-w-0 flex-1 rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent lg:min-h-8"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSending}
                className={`${actionBtn} shrink-0 border-term-accent bg-transparent text-term-accent hover:bg-term-head disabled:cursor-not-allowed disabled:opacity-30`}
              >
                聞く
              </button>
            </form>
          </div>
        </details>

        <section className="flex flex-wrap items-center gap-2 px-3 py-3">
          <Link
            href={`/execute/${encodeURIComponent(item.id)}`}
            className={`${actionBtn} border-term-accent text-term-accent hover:bg-term-head`}
          >
            計画を作成
          </Link>
          <Link
            href={"/?entity=" + encodeURIComponent(item.id) + "&mode=LEDGER"}
            className={`${actionBtn} border-term-line text-term-fg hover:bg-term-head`}
          >
            事例の詳細
          </Link>
          <Link href="/?mode=SYNTHESIS" className={`${actionBtn} border-term-line text-term-fg hover:bg-term-head`}>
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

  const lensTabs = LENSES.map((item) => ({ key: item.id, label: item.label }));
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-term-bg text-term-fg">
      <GlobalHeader currentSection="DISCOVER" />
      <h1 className="sr-only">事例を探す</h1>

      <div className="shrink-0 border-b border-term-line bg-term-panel">
        <div className="term-panel-title">
          <span className="term-panel-name">事例を探す</span>
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
            <span>事例</span>
            <span className="hidden xl:block">分野</span>
            <span>収益パターン</span>
            <span className="text-right">営業利益 / 月商</span>
            <span>状態</span>
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
