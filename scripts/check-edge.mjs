import fs from "node:fs";
import path from "node:path";

const root = path.resolve("supabase/functions");
const entries = [
  "url-preview/index.ts", "stripe-checkout/index.ts", "stripe-portal/index.ts", "stripe-webhook/index.ts",
  "newsletter-subscribe/index.ts", "newsletter-confirm/index.ts", "newsletter-unsubscribe/index.ts", "send-digest/index.ts",
];
for (const entry of entries) {
  const full = path.join(root, entry);
  if (!fs.existsSync(full)) throw new Error(`Missing Edge Function ${entry}`);
  const source = fs.readFileSync(full, "utf8");
  if (!source.includes("Deno.serve")) throw new Error(`${entry}: Deno.serve missing`);
  if (!source.includes("errorResponse")) throw new Error(`${entry}: centralized error handling missing`);
}
const security = fs.readFileSync(path.join(root, "_shared/security.ts"), "utf8");
for (const token of ["Deno.resolveDns", "redirect: \"manual\"", "isBlockedIPv4", "isBlockedIPv6", "validatePublicUrl", "hmacToken"]) {
  if (!security.includes(token)) throw new Error(`SSRF/token security invariant missing: ${token}`);
}
const preview = fs.readFileSync(path.join(root, "url-preview/index.ts"), "utf8");
if (!preview.includes("fetchPublicHtml") || !preview.includes("maxRedirects")) throw new Error("URL preview does not enforce redirect validation");
const webhook = fs.readFileSync(path.join(root, "stripe-webhook/index.ts"), "utf8");
if (!webhook.includes("webhookEvent") || !webhook.includes("billing_events") || !webhook.includes("processed_at")) throw new Error("Stripe webhook signature/idempotency missing");
const checkout = fs.readFileSync(path.join(root, "stripe-checkout/index.ts"), "utf8");
if (!checkout.includes("requireUser") || !checkout.includes("idempotencyKey")) throw new Error("Checkout auth/idempotency missing");
const subscribe = fs.readFileSync(path.join(root, "newsletter-subscribe/index.ts"), "utf8");
if (!subscribe.includes("confirmation_token_hash") || !subscribe.includes("hmacToken")) throw new Error("Newsletter double opt-in/token design missing");
const digest = fs.readFileSync(path.join(root, "send-digest/index.ts"), "utf8");
if (!digest.includes("CRON_SECRET") || !digest.includes("newsletter_deliveries") || !digest.includes("digest_key")) throw new Error("Digest auth/idempotency missing");
const browserFiles = ["src/v2/app.js", "src/v2/cloud.js", "src/v2/store.js"].map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const secret of ["SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY"]) {
  if (browserFiles.includes(secret)) throw new Error(`Server secret leaked into browser bundle: ${secret}`);
}
console.log(`Edge boundary validated: ${entries.length} functions, SSRF, billing, email confirmation and secret isolation.`);
