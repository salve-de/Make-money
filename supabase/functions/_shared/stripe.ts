import Stripe from "npm:stripe@17.7.0";
import { HttpError, siteUrl } from "./http.ts";

let instance: Stripe | null = null;

export function stripeClient(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY")?.trim();
  if (!key) throw new HttpError(503, "stripe_not_configured", "Stripeが設定されていません。");
  if (!instance) {
    instance = new Stripe(key, {
      apiVersion: "2024-12-18.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return instance;
}

export type PlanCode = "pro" | "research" | "team";

export function planPriceMap(): Record<PlanCode, string> {
  const values: Record<PlanCode, string | undefined> = {
    pro: Deno.env.get("STRIPE_PRICE_PRO"),
    research: Deno.env.get("STRIPE_PRICE_RESEARCH"),
    team: Deno.env.get("STRIPE_PRICE_TEAM"),
  };
  const output = {} as Record<PlanCode, string>;
  for (const [plan, value] of Object.entries(values) as Array<[PlanCode, string | undefined]>) {
    if (value?.trim()) output[plan] = value.trim();
  }
  return output;
}

export function requirePlan(value: unknown): { planCode: PlanCode; priceId: string } {
  const planCode = String(value ?? "") as PlanCode;
  if (!["pro", "research", "team"].includes(planCode)) throw new HttpError(400, "invalid_plan", "プランを確認してください。");
  const priceId = planPriceMap()[planCode];
  if (!priceId) throw new HttpError(503, "plan_not_configured", "選択したプランの価格が設定されていません。");
  return { planCode, priceId };
}

export function planFromPrice(priceId: string | null | undefined): PlanCode | null {
  if (!priceId) return null;
  const match = Object.entries(planPriceMap()).find(([, configured]) => configured === priceId);
  return (match?.[0] as PlanCode | undefined) ?? null;
}

export function validatedReturnUrl(value: unknown, fallbackHash: string): string {
  const base = new URL(siteUrl());
  if (!value) return `${base.toString().replace(/\/$/, "")}${fallbackHash}`;
  let candidate: URL;
  try {
    candidate = new URL(String(value), base);
  } catch {
    throw new HttpError(400, "invalid_return_url", "戻り先URLを確認してください。");
  }
  if (candidate.origin !== base.origin) throw new HttpError(400, "return_origin_not_allowed", "外部サイトを戻り先に指定できません。");
  candidate.username = "";
  candidate.password = "";
  return candidate.toString();
}

export function mapSubscriptionStatus(value: Stripe.Subscription.Status): string {
  const allowed = new Set(["trialing", "active", "past_due", "paused", "canceled", "incomplete", "unpaid"]);
  return allowed.has(value) ? value : value === "incomplete_expired" ? "canceled" : "unpaid";
}

export function unixToIso(value: number | null | undefined): string | null {
  return value ? new Date(value * 1000).toISOString() : null;
}

export async function webhookEvent(rawBody: string, signature: string): Promise<Stripe.Event> {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim();
  if (!secret) throw new HttpError(503, "webhook_not_configured", "Stripe Webhookが設定されていません。");
  try {
    return await stripeClient().webhooks.constructEventAsync(
      rawBody,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error("Stripe signature error", error);
    throw new HttpError(400, "invalid_signature", "Webhook署名を確認できませんでした。");
  }
}
