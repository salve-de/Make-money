export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ENTER: "参入候補",
    VALIDATE: "検証候補",
    WATCH: "観察",
    AVOID: "見送り",
  };
  return labels[status] ?? status;
}

export function evidenceLabel(rank: string) {
  const labels: Record<string, string> = {
    A: "一次・確定",
    B: "本人・企業開示",
    C: "第三者推定",
    D: "未確認投稿",
  };
  return labels[rank] ?? rank;
}

export function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function hostnameToName(input: string) {
  try {
    const url = new URL(normalizeUrl(input));
    const host = url.hostname.replace(/^www\./, "");
    return host.split(".")[0]
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
