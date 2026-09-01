export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const configuredOrigins = () => {
  const site = Deno.env.get("SITE_URL")?.trim();
  const extras = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([site, ...extras].filter(Boolean));
};

export function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = configuredOrigins();
  if (!allowed.size) return false;
  return allowed.has(origin);
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin && originAllowed(request) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature, x-cron-secret",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function handleOptions(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;
  if (!originAllowed(request)) return json(request, { error: "origin_not_allowed" }, 403);
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function json(request: Request, body: JsonValue, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function redirect(request: Request, location: string, status = 303): Response {
  return new Response(null, {
    status,
    headers: {
      ...corsHeaders(request),
      Location: location,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export class HttpError extends Error {
  status: number;
  code: string;
  details?: JsonValue;

  constructor(status: number, code: string, message: string, details?: JsonValue) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorResponse(request: Request, error: unknown): Response {
  if (error instanceof HttpError) {
    return json(request, { error: error.code, message: error.message, details: error.details ?? null }, error.status);
  }
  console.error(error);
  return json(request, { error: "internal_error", message: "処理に失敗しました。" }, 500);
}

export async function parseJson<T extends Record<string, unknown>>(request: Request, maxBytes = 64_000): Promise<T> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) throw new HttpError(413, "payload_too_large", "送信内容が大きすぎます。");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new HttpError(413, "payload_too_large", "送信内容が大きすぎます。");
  }
  try {
    const value = JSON.parse(text || "{}") as T;
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("object required");
    return value;
  } catch {
    throw new HttpError(400, "invalid_json", "JSON形式を確認してください。");
  }
}

export function requireMethod(request: Request, methods: string[]): void {
  if (!methods.includes(request.method)) {
    throw new HttpError(405, "method_not_allowed", "許可されていないHTTPメソッドです。");
  }
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  ).slice(0, 128);
}

export function siteUrl(): string {
  const configured = Deno.env.get("SITE_URL")?.replace(/\/$/, "");
  if (!configured) throw new HttpError(500, "missing_site_url", "SITE_URLが設定されていません。");
  return configured;
}
