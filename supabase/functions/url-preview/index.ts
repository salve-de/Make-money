import { errorResponse, handleOptions, HttpError, json, originAllowed, parseJson, requireMethod } from "../_shared/http.ts";
import { fetchPublicHtml, sha256 } from "../_shared/security.ts";
import { adminClient, consumeRateLimit, optionalUser } from "../_shared/supabase.ts";

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function clean(value: string | null | undefined, max = 500): string | null {
  if (!value) return null;
  const text = decodeEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return text || null;
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? match[1] ?? match[2] ?? match[3] ?? null : null;
}

function metas(html: string): Array<Record<string, string>> {
  return [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => {
    const tag = match[0];
    const record: Record<string, string> = {};
    for (const key of ["name", "property", "content", "charset"]) {
      const value = attribute(tag, key);
      if (value) record[key] = value;
    }
    return record;
  });
}

function metaContent(entries: Array<Record<string, string>>, keys: string[]): string | null {
  const normalized = keys.map((key) => key.toLowerCase());
  for (const entry of entries) {
    const identifier = (entry.property ?? entry.name ?? "").toLowerCase();
    if (normalized.includes(identifier) && entry.content) return clean(entry.content, 800);
  }
  return null;
}

function resolveAsset(value: string | null, base: URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extract(html: string, finalUrl: URL) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html.slice(0, 250_000);
  const entries = metas(head);
  const titleTag = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
  const canonicalTag = head.match(/<link\b[^>]*rel\s*=\s*(?:"canonical"|'canonical'|canonical)[^>]*>/i)?.[0] ?? null;
  const iconTag = [...head.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]).find((tag) => /rel\s*=\s*(?:"[^"]*icon[^"]*"|'[^']*icon[^']*'|[^\s>]*icon[^\s>]*)/i.test(tag));
  const title = metaContent(entries, ["og:title", "twitter:title"]) ?? clean(titleTag, 180) ?? finalUrl.hostname;
  const description = metaContent(entries, ["og:description", "twitter:description", "description"]);
  const image = resolveAsset(metaContent(entries, ["og:image:secure_url", "og:image", "twitter:image"]), finalUrl);
  const favicon = resolveAsset(iconTag ? attribute(iconTag, "href") : "/favicon.ico", finalUrl);
  const canonical = resolveAsset(canonicalTag ? attribute(canonicalTag, "href") : null, finalUrl);
  const siteName = metaContent(entries, ["og:site_name", "application-name"]);
  const locale = metaContent(entries, ["og:locale"]);
  return { title, description, imageUrl: image, faviconUrl: favicon, canonicalUrl: canonical, siteName, locale };
}

Deno.serve(async (request) => {
  const options = handleOptions(request);
  if (options) return options;
  try {
    requireMethod(request, ["POST"]);
    if (!originAllowed(request)) throw new HttpError(403, "origin_not_allowed", "許可されていない送信元です。");
    const user = await optionalUser(request);
    const body = await parseJson<{ url?: unknown }>(request, 8_000);
    const input = String(body.url ?? "").trim();
    if (!input) throw new HttpError(400, "url_required", "URLを入力してください。");
    const key = user?.id ?? `${request.headers.get("x-forwarded-for") ?? "anonymous"}:${await sha256(input)}`;
    await consumeRateLimit(key, "url-preview", user ? 40 : 8, 3600);

    const urlHash = await sha256(input);
    const admin = adminClient();
    const { data: cached } = await admin
      .from("url_previews")
      .select("url,final_url,title,description,image_url,favicon_url,status_code,content_type,fetched_at,expires_at")
      .eq("url_hash", urlHash)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cached) {
      return json(request, {
        url: cached.url,
        finalUrl: cached.final_url,
        title: cached.title,
        description: cached.description,
        imageUrl: cached.image_url,
        faviconUrl: cached.favicon_url,
        cached: true,
        fetchedAt: cached.fetched_at,
      });
    }

    const fetched = await fetchPublicHtml(input, { maxBytes: 1_000_000, timeoutMs: 8_000, maxRedirects: 4 });
    const metadata = extract(fetched.html, fetched.url);
    const record = {
      url_hash: urlHash,
      url: input,
      final_url: fetched.url.toString(),
      title: metadata.title,
      description: metadata.description,
      image_url: metadata.imageUrl,
      favicon_url: metadata.faviconUrl,
      status_code: fetched.status,
      content_type: fetched.contentType,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    };
    const { error } = await admin.from("url_previews").upsert(record, { onConflict: "url_hash" });
    if (error) console.error("preview cache write failed", error);
    return json(request, { ...metadata, url: input, finalUrl: fetched.url.toString(), cached: false, fetchedAt: record.fetched_at });
  } catch (error) {
    return errorResponse(request, error);
  }
});
