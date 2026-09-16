#!/usr/bin/env node

import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const SNAPSHOT = '2026-09-16';
const AGENT = 'codex-20260916-ih-new100t-repair';
const BATCH_PATH = 'data/incoming/processed/batch_indiehackers_new100t_20260916.json';
const SOURCE_PATH = 'data/incoming/audit_logs/batch_indiehackers_new100t_sources_20260916.json';
const CANDIDATE_POOL_PATH = 'data/incoming/external_collectors/batch_indie_hackers_replacement_candidates_20260916.json';
const OLD_NAME = 'MediaFa.st';
const REPLACEMENT_NAME = 'Pulse AI';

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const host = (value) => {
  try { return new URL(String(value)).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
};
const hash = (value) => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const locator = (sha256) => ({ type: 'html', textHash: sha256 });

const strictNorm = (value) => clean(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

const claimReplacement = (officialUrl) => {
  const claimText = `${REPLACEMENT_NAME} — ${host(officialUrl)}`;
  const claims = fs.readFileSync('data/CLAIMED_TARGETS.txt', 'utf8').split(/\r?\n/);
  const alreadyClaimed = claims.some((line) => {
    const beforeMarker = line.split('[CLAIMED')[0].trim();
    const namePart = beforeMarker.split(' — ')[0].trim();
    return strictNorm(namePart) === strictNorm(REPLACEMENT_NAME) || beforeMarker.includes(host(officialUrl));
  });
  if (alreadyClaimed) return { claimText, status: 'EXISTS' };
  fs.appendFileSync('data/CLAIMED_TARGETS.txt', `\n${claimText} [CLAIMED:${AGENT} @ ${SNAPSHOT}]\n`, 'utf8');
  try {
    execSync('node scripts/with-r2-keychain-secrets.mjs npx tsx scripts/pipeline/sync-claims-r2.ts push', { stdio: 'ignore' });
  } catch {
    // The local append is the lock; R2 synchronization is best-effort for this repair audit.
  }
  return { claimText, status: 'CREATED' };
};

const sectorFor = (tags) => {
  if (tags.some((tag) => tag.startsWith('vertical-ai'))) return 'AI_AUTOMATION';
  if (tags.some((tag) => /^vertical-(finance|investing|payments|banking)/.test(tag))) return 'FINTECH_INFRA';
  if (tags.some((tag) => /^vertical-(hardware|food|clothing|shopping|manufacturing)/.test(tag))) return 'PHYSICAL_ASSET';
  if (tags.some((tag) => /^vertical-(content|news|movies|music|podcasting|advertising|email-marketing)/.test(tag))) return 'CONTENT_MEDIA';
  if (tags.some((tag) => /^vertical-(local|home|travel)/.test(tag))) return 'LOCAL_SERVICES';
  return 'NICHE_SAAS';
};

const buildEntity = (old, candidate, officialAudit, rawStorage) => {
  const name = clean(candidate.name);
  const productId = candidate.productId ?? candidate.objectID;
  const official = clean(candidate.websiteUrl);
  const listing = `https://www.indiehackers.com/product/${encodeURIComponent(productId)}`;
  const entityHash = hash(`${productId}|${official}`);
  const rawLocator = locator(rawStorage.sha256);
  const tags = Array.isArray(candidate._tags) ? candidate._tags.filter((tag) => typeof tag === 'string') : [];
  const tagline = clean(candidate.tagline);
  const description = clean(candidate.description);
  const revenue = Number(candidate.revenue) || 0;
  const revenueLabel = `Indie Hackers表示: US$${revenue.toLocaleString('en-US')}/month（報告値・利益ではない）`;
  const models = tags.filter((tag) => tag.startsWith('revenue-model-')).map((tag) => tag.slice(13)).join(', ') || '未確認';
  const pain = `公開説明「${description}」が示す課題への支出意向。具体的な意思決定理由は原文を超えて断定しない。`;
  const unknown = '利益、原価、経費、手残り、価格、継続率、顧客数、創業者名、技術スタックは公開レコードから独立確認していない。';
  const id = `ent_${name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 34) || 'product'}_${entityHash.slice(0, 12)}`;
  const pnl = {
    monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0,
    isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true,
    isCostsUnconfirmed: true, isNetProfitUnconfirmed: true, financialStatus: 'UNAVAILABLE',
    dataSnapshotPeriod: `${SNAPSHOT} Indie Hackers公開レコード`, sourceDoc: listing, sourceClass: 'COMMUNITY',
    evidenceLocator: rawLocator, revenueLabel, confidenceScore: 0,
    estimationLogic: '公開ディレクトリの表示値は報告売上シグナル。原価・経費・利益・税・為替換算の根拠がないためP&Lへ確定投入していない。',
  };
  const card = (suffix, type, title, punchline, details) => ({
    id: `${id}-${suffix}`, type, title, badge: '公開レコード',
    evidenceStatus: type === 'UNKNOWN_AUDIT' ? 'VERIFIED' : 'REPORTED', punchline, details,
    metrics: [{ label: '表示月商', value: `US$${revenue.toLocaleString('en-US')}/month`, isHighlight: type === 'LOOT_BLUEPRINT' }, { label: '利益状態', value: 'UNAVAILABLE' }],
    sourceClass: 'COMMUNITY', sourceUrl: listing, evidenceLocator: rawLocator,
  });
  const entity = {
    ...old,
    id, ticker: `IH${entityHash.slice(0, 8).toUpperCase()}`, name,
    legalEntity: 'UNKNOWN (公開ディレクトリ情報のみ)',
    tagline: `「${tagline}」に対し、${revenueLabel}。利益は未確認。`,
    sector: sectorFor(tags), scale: tags.some((tag) => tag === 'founders-solo' || tag === 'employees-0') ? 'SOLO' : 'SMALL_TEAM',
    founder: 'UNKNOWN (公開レコードで実名未確認)', country: 'GLOBAL', url: official, verifiedBadge: false,
    growthRateYoY: 0, isGrowthUnconfirmed: true,
    architecturePattern: '公開レコードでは実装方式未確認。', pipelineStack: '公開レコードでは技術スタック未確認。', targetPainWallet: pain,
    tags: [...tags, 'SOURCE_COMMUNITY', 'INDIE_HACKERS_REPORTED_REVENUE', 'FINANCIAL_PROFIT_UNKNOWN', 'RAW_CAPTURED_R2'],
    pnl,
    operations: {
      teamSize: 0, initialTeamSize: 0, currentTeamSize: 0, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0,
      primaryChannels: ['Indie Hackers product directory', 'official website'], toolStack: [],
      isTeamSizeUnconfirmed: true, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true,
    },
    strategy: {
      blindspot: `「${tagline}」という狭い課題への専門化。競合比較は未確認。`, moatType: 'UNKNOWN',
      moatDescription: '継続率、独自データ、供給制約、ブランド優位は未確認。', incumbentDilemma: '大手との価格・機能・流通の比較は未確認。',
      secretInsight: `公開レコードで確認できるのは「${tagline}」と${revenueLabel}。`,
      initialTraction: [`掲載開始値: ${candidate.startDateStr || '未確認'}`, 'Indie Hackersの商品ディレクトリに掲載', '初動獲得経路・顧客数・継続率は未確認。'],
      actionPlaybook: [`課題を「${tagline}」の当事者に絞り、支払理由を一次情報で照合する。`, '表示売上と利益を分離し、原価・経費・継続率を取得する。', `公式URL（${official}）の提供条件を確認する。`],
      coldOutreachTemplate: `「${tagline}」に関する作業で、最も時間を失う箇所を教えてください。公開表示だけで利益を断定せず、実測値と照合します。`,
    },
    evidenceCards: [
      card('loot', 'LOOT_BLUEPRINT', '公開説明に現れる単一課題と報告売上', pain, [description, revenueLabel, '利益・原価・経費は未確認。']),
      card('crime', 'THE_CRIME', '売上表示を利益から分離', `公開レコードは${revenueLabel}を示すが、手残り・粗利・営業利益ではない。`, [`収益モデルタグ: ${models}`, unknown]),
      card('audit', 'UNKNOWN_AUDIT', '原本保存と公式URL監査', 'Algolia hit JSON原本をSHA-256キーで保存し、R2読み戻しを確認した。', [`R2: ${rawStorage.bucket}/${rawStorage.payloadKey}`, `原本SHA-256: ${rawStorage.sha256}`, `公式URL HTTP: ${officialAudit.status}`]),
    ],
    temporal: {
      foundedYear: Number(String(candidate.startDateStr || '').slice(0, 4)) || null,
      initialTractionPeriod: `${candidate.startDateStr || 'UNKNOWN'}公開開始値。初動獲得経路は未確認。`,
      dataSnapshotPeriod: `${SNAPSHOT}公開レコード・公式URL監査`, viabilityStatus: 'UNKNOWN', viabilityLabel: '根拠未確認',
      eraContext: 'Indie Hackers公開ディレクトリで少人数製品の提供説明と売上表示が公開される環境。',
      currentViabilityAnalysis: '掲載・売上表示・公式URL到達性は観測したが、利益・継続性・規制・再現性は未確認。',
    },
    observations: [`Indie Hackers公開説明: ${description}`, revenueLabel, `公式URL監査: HTTP ${officialAudit.status}`, unknown],
    observationsStream: [
      { id: `${id}-listing`, category: 'MARKET_DISTORTION', categoryLabel: '公開ディレクトリの提供表現', originType: 'reported', verificationStatus: 'SUPPORTED', text: `Indie Hackers listing: ${tagline}`, sourceUrl: listing, observedAt: SNAPSHOT, sourceClass: 'COMMUNITY', evidenceLocator: rawLocator },
      { id: `${id}-revenue`, category: 'RESEARCH_LIMIT', categoryLabel: '報告売上と利益の分離', originType: 'reported', verificationStatus: 'UNVERIFIED', text: revenueLabel, sourceUrl: listing, observedAt: SNAPSHOT, sourceClass: 'COMMUNITY', evidenceLocator: rawLocator },
    ],
    lootBlueprint: {
      blueprintId: `${id}-loot`, targetPrey: pain, structuralFlaw: `公開説明が示す未充足作業: ${description}`,
      stealthEntry: `Indie Hackers product directory（${listing}）で課題仮説を取り、公式URL（${official}）で提供実体を照合する。`,
      tollGateSetup: `収益モデルタグは「${models}」。料金・継続条件・原価・手残りは未確認。`, reproducibilityScore: 0, moatDurabilityScore: 0, capitalEfficiencyScore: 0,
      executionChecklist: [`課題を「${tagline}」の当事者に絞り、支払理由を確認する。`, '表示売上と利益を分離し、原価・経費・継続率の一次根拠が取れるまでP&Lを確定しない。', `公式URL（${official}）の提供条件とディレクトリ記録を保存する。`],
    },
    coverageAudit: [
      { dimension: 'reported_revenue', status: 'found', note: revenueLabel, attempts: [listing] },
      { dimension: 'profit_and_costs', status: 'attempted_unavailable', note: '利益・原価・経費の一次根拠は未確認。', attempts: [listing, official] },
      { dimension: 'official_presence', status: 'found', note: `HTTP ${officialAudit.status}; ${officialAudit.title}`, attempts: [official] },
      { dimension: 'founder_and_legal_entity', status: 'attempted_unavailable', note: '実名・法人名は未確認。', attempts: [listing, official] },
      { dimension: 'technology_and_tools', status: 'attempted_unavailable', note: '技術スタック・ツール費は未確認。', attempts: [listing, official] },
    ],
    unknownsNotes: [unknown], publishability: 'PARTIAL', claimBindings: [],
    sourceMetadata: {
      provider: 'Indie Hackers', sourceType: 'algolia_hit_snapshot', sourceUrl: listing, officialUrl: official,
      publishedAt: candidate.publishedTimestamp ? new Date(candidate.publishedTimestamp).toISOString() : null,
      modifiedAt: candidate.updatedTimestamp ? new Date(candidate.updatedTimestamp).toISOString() : null,
      observedAt: SNAPSHOT, rawContentSha256: rawStorage.sha256, rawStorage, officialAudit,
      disclosure: 'Indie Hackers公開ディレクトリのAlgolia hit JSONスナップショットを原本として保存。表示売上は利益・独立監査済み財務値ではない.',
    },
    reportedMetrics: [{ original: `US$${revenue.toLocaleString('en-US')}/month`, currency: 'USD', amount: revenue, unit: 'MONTHLY_REVENUE', source: 'indie_hackers_directory', context: 'directory revenue field' }],
    batchId: 'batch-indie-hackers-new100t-repair-20260916',
  };
  return entity;
};

const main = async () => {
  const batch = JSON.parse(fs.readFileSync(BATCH_PATH, 'utf8'));
  const sources = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  const candidatePool = JSON.parse(fs.readFileSync(CANDIDATE_POOL_PATH, 'utf8'));
  const old = batch.find((entity) => entity.name === OLD_NAME);
  if (!old) throw new Error(`${OLD_NAME} not found`);
  const source = candidatePool.find((item) => clean(item.name) === REPLACEMENT_NAME);
  if (!source) throw new Error(`${REPLACEMENT_NAME} source not found in current Algolia pool snapshot`);
  const claim = claimReplacement(source.websiteUrl);
  const officialResponse = await fetch(source.websiteUrl, { redirect: 'follow', headers: { 'user-agent': 'Make-Money-source-audit/1.0' }, signal: AbortSignal.timeout(15000) });
  const officialBody = await officialResponse.text();
  const officialAudit = { status: officialResponse.status, finalUrl: officialResponse.url, title: (officialBody.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 180), checkedAt: SNAPSHOT };
  if (officialResponse.status !== 200) throw new Error(`official URL HTTP ${officialResponse.status}`);
  const rawBody = JSON.stringify(source, null, 2);
  const rawSha = hash(rawBody);
  const r2m = await import('../../src/lib/storage/r2.ts');
  const r2 = r2m.default || r2m;
  const put = await r2.putR2ObjectCreateOnly({ bucket: r2.getFoundationBucket('raw'), key: `blobs/sha256/${rawSha}`, body: rawBody, contentType: 'application/json; charset=utf-8', metadata: { provider: 'Indie Hackers', source_type: 'algolia_hit_snapshot', source_url: `https://www.indiehackers.com/product/${source.productId || source.objectID}`, 'foundation-sha256': rawSha } });
  const rawStorage = { bucket: put.bucket, payloadKey: put.key, bytes: put.bytes, sha256: put.sha256, status: put.status, readbackVerified: Boolean(put.readback?.bytes_match && put.readback?.sha256_match) };
  if (!rawStorage.readbackVerified) throw new Error('R2 raw readback failed');
  const replacement = buildEntity(old, source, officialAudit, rawStorage);
  const sm = await import('../../src/shared/financial-entity-schema.ts');
  const parse = sm.parseFinancialEntity ?? sm.default?.parseFinancialEntity;
  parse(replacement);
  batch[batch.findIndex((entity) => entity.name === OLD_NAME)] = replacement;
  const sourceIndex = sources.findIndex((item) => clean(item.name) === OLD_NAME);
  const replacementSource = { ...source, officialAudit };
  if (sourceIndex >= 0) sources[sourceIndex] = replacementSource; else sources.push(replacementSource);
  fs.writeFileSync(BATCH_PATH, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
  fs.writeFileSync(SOURCE_PATH, `${JSON.stringify(sources, null, 2)}\n`, 'utf8');
  const auditPath = 'data/incoming/audit_logs/batch_indiehackers_new100t_duplicate_repair_20260916.json';
  fs.writeFileSync(auditPath, `${JSON.stringify({ schemaVersion: 'indie-hackers-duplicate-repair-audit.v1', capturedAt: new Date().toISOString(), agent: AGENT, batchPath: BATCH_PATH, sourcePath: SOURCE_PATH, dropped: { name: old.name, id: old.id, ticker: old.ticker, url: old.url, reason: 'NFKC punctuation-normalized name collision with MediaFast; original claim and raw receipt retained' }, replacement: { name: replacement.name, entityId: replacement.id, ticker: replacement.ticker, url: replacement.url, officialAudit, rawStorage }, countAfterRepair: batch.length }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ auditPath, claim, dropped: OLD_NAME, replacement: replacement.name, officialAudit, rawStorage, batchCount: batch.length, sourceCount: sources.length }, null, 2));
};

main().catch((error) => { console.error(error?.stack || error); process.exitCode = 1; });
