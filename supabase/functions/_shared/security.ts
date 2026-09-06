import { HttpError } from "./http.ts";

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
  "instance-data",
]);

function parseIPv4(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return numbers;
}

export function isBlockedIPv4(value: string): boolean {
  const ip = parseIPv4(value);
  if (!ip) return true;
  const [a, b, c] = ip;
  return (
    a === 0 ||
    a === 10 ||
    a === 100 && b >= 64 && b <= 127 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 0 && c === 0 ||
    a === 192 && b === 0 && c === 2 ||
    a === 192 && b === 88 && c === 99 ||
    a === 192 && b === 168 ||
    a === 198 && (b === 18 || b === 19) ||
    a === 198 && b === 51 && c === 100 ||
    a === 203 && b === 0 && c === 113 ||
    a >= 224
  );
}

function expandIPv6(value: string): number[] | null {
  let address = value.toLowerCase().split("%")[0];
  if (address.includes(".")) {
    const lastColon = address.lastIndexOf(":");
    const ipv4 = parseIPv4(address.slice(lastColon + 1));
    if (!ipv4) return null;
    address = `${address.slice(0, lastColon)}:${((ipv4[0] << 8) | ipv4[1]).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
  }
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right].map((group) => Number.parseInt(group || "0", 16));
  if (groups.length !== 8 || groups.some((group) => !Number.isFinite(group) || group < 0 || group > 0xffff)) return null;
  return groups;
}

export function isBlockedIPv6(value: string): boolean {
  const groups = expandIPv6(value);
  if (!groups) return true;
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
  const allZero = groups.every((group) => group === 0);
  const loopback = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0 && g6 === 0 && g7 === 1;
  const uniqueLocal = (g0 & 0xfe00) === 0xfc00;
  const linkLocal = (g0 & 0xffc0) === 0xfe80;
  const multicast = (g0 & 0xff00) === 0xff00;
  const documentation = g0 === 0x2001 && g1 === 0x0db8;
  const ipv4Mapped = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff;
  if (ipv4Mapped) {
    const ipv4 = `${g6 >> 8}.${g6 & 255}.${g7 >> 8}.${g7 & 255}`;
    return isBlockedIPv4(ipv4);
  }
  return allZero || loopback || uniqueLocal || linkLocal || multicast || documentation;
}

function looksLikeIPv6(hostname: string): boolean {
  return hostname.includes(":");
}

export async function validatePublicUrl(input: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new HttpError(400, "invalid_url", "公開URLを確認してください。");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new HttpError(400, "invalid_protocol", "http/httpsのみ利用できます。");
  if (url.username || url.password) throw new HttpError(400, "credentials_not_allowed", "認証情報を含むURLは利用できません。");
  if (url.port && !["80", "443"].includes(url.port)) throw new HttpError(400, "port_not_allowed", "標準ポート以外は利用できません。");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!hostname || blockedHostnames.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new HttpError(400, "private_host", "内部ネットワークのURLは利用できません。");
  }
  const directV4 = parseIPv4(hostname);
  if (directV4 && isBlockedIPv4(hostname)) throw new HttpError(400, "private_ip", "内部・予約IPは利用できません。");
  if (looksLikeIPv6(hostname) && isBlockedIPv6(hostname)) throw new HttpError(400, "private_ip", "内部・予約IPは利用できません。");

  if (!directV4 && !looksLikeIPv6(hostname)) {
    const records: string[] = [];
    const [v4, v6] = await Promise.allSettled([Deno.resolveDns(hostname, "A"), Deno.resolveDns(hostname, "AAAA")]);
    if (v4.status === "fulfilled") records.push(...v4.value);
    if (v6.status === "fulfilled") records.push(...v6.value);
    if (!records.length) throw new HttpError(400, "dns_resolution_failed", "URLのホストを確認できませんでした。");
    for (const record of records) {
      if (record.includes(":")) {
        if (isBlockedIPv6(record)) throw new HttpError(400, "private_dns_target", "内部・予約IPへ解決されるURLは利用できません。");
      } else if (isBlockedIPv4(record)) {
        throw new HttpError(400, "private_dns_target", "内部・予約IPへ解決されるURLは利用できません。");
      }
    }
  }
  url.hash = "";
  return url;
}

export async function fetchPublicHtml(input: string, options: { maxBytes?: number; timeoutMs?: number; maxRedirects?: number } = {}) {
  const maxBytes = options.maxBytes ?? 1_000_000;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxRedirects = options.maxRedirects ?? 4;
  let current = await validatePublicUrl(input);

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "GOLDMINE-RADAR-Preview/1.0 (+https://goldmine-radar.example)",
          Accept: "text/html,application/xhtml+xml;q=0.9",
          "Accept-Encoding": "identity",
        },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new HttpError(504, "upstream_timeout", "URLの取得がタイムアウトしました。");
      throw new HttpError(502, "upstream_fetch_failed", "URLを取得できませんでした。");
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new HttpError(502, "invalid_redirect", "不正なリダイレクトです。");
      if (redirectCount === maxRedirects) throw new HttpError(508, "too_many_redirects", "リダイレクト回数が上限を超えました。");
      current = await validatePublicUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) throw new HttpError(422, "upstream_status", `URLがHTTP ${response.status}を返しました。`);
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new HttpError(415, "unsupported_content_type", "HTMLページのみ解析できます。");
    }
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maxBytes) throw new HttpError(413, "upstream_too_large", "ページサイズが大きすぎます。");
    const reader = response.body?.getReader();
    if (!reader) throw new HttpError(502, "empty_upstream", "ページ本文を取得できませんでした。");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "upstream_too_large", "ページサイズが大きすぎます。");
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { url: current, status: response.status, contentType, html: new TextDecoder("utf-8", { fatal: false }).decode(merged) };
  }
  throw new HttpError(508, "too_many_redirects", "リダイレクト回数が上限を超えました。");
}

export function randomToken(bytes = 32): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqualText(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) mismatch |= (a[index % a.length] ?? 0) ^ (b[index % b.length] ?? 0);
  return mismatch === 0;
}

export function cleanHeaderText(value: string, max = 256): string {
  return value.replace(/[\r\n\0]/g, " ").trim().slice(0, max);
}
