import fs from "node:fs";
import path from "node:path";

const directory = path.resolve("supabase/migrations");
const files = fs.readdirSync(directory).filter((file) => file.endsWith(".sql")).sort();
if (files.length < 4) throw new Error(`Expected at least 4 migrations, found ${files.length}`);
const migrations = Object.fromEntries(files.map((file) => [file, fs.readFileSync(path.join(directory, file), "utf8")]));
const all = Object.values(migrations).join("\n");
const requireText = (text, label) => { if (!all.includes(text)) throw new Error(`Missing SQL invariant: ${label}`); };

requireText("enable row level security", "RLS activation");
requireText("organic_ranked_opportunities", "organic ranking view");
requireText("Promotions are intentionally excluded", "promotion separation documentation");
requireText("consume_function_rate_limit", "server-side rate limiting");
requireText("provider_event_id text primary key", "Stripe webhook idempotency");
requireText("unique(subscription_id,digest_key)", "newsletter delivery idempotency");
requireText("review_product_claim", "claim approval ownership function");
requireText("materialize_submission", "submission publication function");
requireText("public_listings", "public listing counter view");
requireText("public_reviews", "public review view");
requireText("public_collections", "public collection view");
requireText("refresh_listing_application_count", "automatic listing counters");
requireText("refresh_product_review_counters", "automatic review counters");
requireText("refresh_opportunity_reaction_counters", "automatic opportunity counters");
requireText("set search_path", "security-definer search path pinning");

const ranking = all.match(/create or replace view public\.organic_ranked_opportunities[\s\S]*?;\n/i)?.[0] ?? "";
if (!ranking) throw new Error("Organic ranking view definition not found");
if (/join\s+public\.promotions/i.test(ranking)) throw new Error("Organic ranking must not join promotions");
if ((ranking.match(/\bas save_count\b/g) ?? []).length > 1) throw new Error("Organic ranking exposes duplicate save_count columns");

const sensitiveTables = [
  "user_preferences", "research_notes", "listing_applications", "reviews", "correction_requests",
  "notifications", "subscriptions", "billing_events", "function_rate_limits", "edge_audit_events",
];
for (const table of sensitiveTables) {
  if (!new RegExp(`alter table (?:if exists )?public\\.${table} enable row level security`, "i").test(all)) {
    throw new Error(`RLS missing for ${table}`);
  }
}

for (const [file, sql] of Object.entries(migrations)) {
  const definerFunctions = [...sql.matchAll(/create or replace function\s+([^\s(]+)[\s\S]*?\$\$;/gi)].map((match) => match[0]);
  for (const statement of definerFunctions) {
    if (/security definer/i.test(statement) && !/set search_path\s*=\s*public/i.test(statement)) {
      throw new Error(`${file}: SECURITY DEFINER function missing pinned search_path`);
    }
  }
}

console.log(`SQL validated: ${files.length} migrations, RLS, counters, publication, billing and promotion separation.`);
