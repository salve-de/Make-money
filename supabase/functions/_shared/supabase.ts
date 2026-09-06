import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

function env(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new HttpError(500, `missing_${name.toLowerCase()}`, `${name}が設定されていません。`);
  return value;
}

export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "goldmine-edge-admin" } },
  });
}

export function requestClient(request: Request): SupabaseClient {
  const authorization = request.headers.get("authorization") ?? "";
  return createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization, "X-Client-Info": "goldmine-edge-user" } },
  });
}

export async function optionalUser(request: Request): Promise<User | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function requireUser(request: Request): Promise<User> {
  const user = await optionalUser(request);
  if (!user) throw new HttpError(401, "authentication_required", "ログインしてください。");
  return user;
}

export async function requireStaff(request: Request): Promise<User> {
  const user = await requireUser(request);
  const { data, error } = await adminClient().from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (error) throw error;
  if (!["moderator", "editor", "admin"].includes(data?.role ?? "")) {
    throw new HttpError(403, "staff_required", "審査権限が必要です。");
  }
  return user;
}

export async function consumeRateLimit(
  key: string,
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const { data, error } = await adminClient().rpc("consume_function_rate_limit", {
    p_key: key.slice(0, 256),
    p_action: action.slice(0, 80),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  if (!data) throw new HttpError(429, "rate_limited", "短時間の操作回数が上限に達しました。時間を置いて再試行してください。");
}

export async function auditEdgeAction(input: {
  actorId?: string | null;
  action: string;
  objectType?: string | null;
  objectId?: string | null;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await adminClient().from("edge_audit_events").insert({
    actor_id: input.actorId ?? null,
    action: input.action,
    object_type: input.objectType ?? null,
    object_id: input.objectId ?? null,
    properties: input.properties ?? {},
  });
  if (error) console.error("edge audit failed", error);
}
