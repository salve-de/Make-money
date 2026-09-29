/**
 * 出典ごとの権利区分の確定（resolve-source-rights v1）— 2026-09-29
 * reaudit.sources[] の各出典URLを Foundation 権利レジストリ（data/foundation-public-rights-snapshot.json）に
 * 照合し、registryPolicyId と displayTier を書き込む。記録には rightsSummary（商用表示の可否の要約）を付ける。
 *   automatic    — Tier 1: 登録済みの許可提供元（公式サイトは記録自身の公式ドメインのときだけ）
 *   facts_only   — Tier 2: 事実のみ・出典名/URL/日付の表示が必須、原文と画像は出さない
 *   unregistered — レジストリ未登録: 事実は Tier 2 扱い、画像は Tier 3（表示しない）
 * 調査者が付けた rightsTier は残し、レジストリ判定と食い違う出典は rightsSummary.tierMismatches に列挙する。
 * 冪等。使い方: node --import tsx scripts/reaudit/resolve-source-rights.ts [--dry-run]
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { resolveCatalogSourcePolicy } from '../../src/lib/foundation/publication-rights';

type AnyRecord = Record<string, unknown>;
const INDEX = 'data/entities-index.json';
const dryRun = process.argv.includes('--dry-run');

const entities = JSON.parse(readFileSync(INDEX, 'utf8')) as AnyRecord[];
const totals = { records: 0, sources: 0, automatic: 0, facts_only: 0, unregistered: 0, mismatches: 0, noSources: 0 };
const policyCounts = new Map<string, number>();
const unregisteredHosts = new Map<string, number>();

for (const entity of entities) {
  const reaudit = entity.reaudit as AnyRecord | undefined;
  const sources = Array.isArray(reaudit?.sources) ? (reaudit!.sources as AnyRecord[]) : [];
  if (!reaudit || sources.length === 0) { totals.noSources += 1; continue; }
  totals.records += 1;
  const officialUrl = entity.officialUrl ?? entity.url;
  const summary = { automatic: 0, factsOnly: 0, unregistered: 0, tierMismatches: [] as string[] };
  for (const source of sources) {
    const resolved = resolveCatalogSourcePolicy(source.url, officialUrl);
    const tier = resolved?.displayTier ?? 'unregistered';
    source.registryPolicyId = resolved?.policyId ?? null;
    source.displayTier = tier;
    totals.sources += 1;
    totals[tier] += 1;
    if (tier === 'automatic') summary.automatic += 1;
    else if (tier === 'facts_only') summary.factsOnly += 1;
    else summary.unregistered += 1;
    if (resolved) policyCounts.set(resolved.policyId, (policyCounts.get(resolved.policyId) ?? 0) + 1);
    else {
      try { const host = new URL(String(source.url)).hostname.replace(/^www\./, ''); unregisteredHosts.set(host, (unregisteredHosts.get(host) ?? 0) + 1); } catch { /* invalid url counted as unregistered */ }
    }
    // 調査者が Tier 1 と付けたのにレジストリでは自動表示にならない出典（例: 公式ドメイン外を公式扱い）。
    if (typeof source.rightsTier === 'string' && source.rightsTier.startsWith('TIER1') && tier !== 'automatic') {
      summary.tierMismatches.push(String(source.url));
    }
  }
  totals.mismatches += summary.tierMismatches.length;
  reaudit.rightsSummary = {
    resolvedAt: '2026-09-29',
    registrySnapshot: 'data/foundation-public-rights-snapshot.json',
    commercialDisplay: summary.factsOnly + summary.unregistered > 0 ? 'FACTS_ONLY_WITH_ATTRIBUTION' : 'ALLOWED_WITH_ATTRIBUTION',
    mediaDisplay: 'PER_ASSET_REVIEW_OFFICIAL_ONLY',
    ...summary,
  };
}

const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
console.log(JSON.stringify({ dryRun, totals, policies: Object.fromEntries(top(policyCounts, 30)), topUnregisteredHosts: Object.fromEntries(top(unregisteredHosts, 25)) }, null, 1));
if (!dryRun) {
  const tmp = `${INDEX}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(entities, null, 2));
  renameSync(tmp, INDEX);
}
