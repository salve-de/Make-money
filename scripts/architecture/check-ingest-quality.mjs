import fs, { readFileSync } from 'fs';
import path, { resolve } from 'path';
import crypto, { createHash } from 'crypto';

const indexPath = resolve(process.cwd(), 'data/entities-index.json');
const entities = JSON.parse(readFileSync(indexPath, 'utf8'));

const catalogPath = resolve(process.cwd(), 'data/foundation-evidence-catalog.json');
const evidenceCatalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const evidenceCatalogMap = new Map(evidenceCatalog.map(item => [item.evidenceId, item]));

console.log(`[check-ingest-quality] Auditing semantic and domain integrity for ${entities.length} entities...`);

let errors = [];

// 0. Check for duplicate entities (ID, Normalized Name, Ticker, Domain)
const seenIds = new Map();
const seenNormNames = new Map();
const seenTickers = new Map();
const seenDomains = new Map();
const SHARED_PLATFORMS = new Set([
  'x.com', 'twitter.com', 'notion.so', 'notion.site', 'gumroad.com', 'substack.com', 'medium.com', 'github.com',
  'wikipedia.org', 'en.wikipedia.org', 'ja.wikipedia.org', 'sec.gov'
]);

function normalizeEntityName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(inc|llc|corp|corporation|co|ltd|plc|gmbh|holdings)\b/g, '')
    .replace(/[\s\-_・（）()株式会社有限会社]/g, '');
}

for (const ent of entities) {
  // A. ID一意性
  const idLower = (ent.id || '').toLowerCase().trim();
  if (seenIds.has(idLower)) {
    errors.push(`[DUPLICATION ERROR] Duplicate entity ID: "${ent.id}" (conflicts with "${seenIds.get(idLower).name}")`);
  } else {
    seenIds.set(idLower, ent);
  }

  // B. 正規化名称一意性
  const normName = normalizeEntityName(ent.name);
  if (normName.length > 2) {
    if (seenNormNames.has(normName)) {
      errors.push(`[DUPLICATION ERROR] Duplicate company name: "${ent.name}" conflicts with existing "${seenNormNames.get(normName).name}" (ID: ${ent.id} vs ${seenNormNames.get(normName).id})`);
    } else {
      seenNormNames.set(normName, ent);
    }
  }

  // C. Ticker一意性
  if (ent.ticker && typeof ent.ticker === 'string' && ent.ticker.trim()) {
    const tick = ent.ticker.trim().toUpperCase();
    if (seenTickers.has(tick)) {
      errors.push(`[DUPLICATION ERROR] Duplicate Ticker: "${tick}" for "${ent.name}" conflicts with "${seenTickers.get(tick).name}"`);
    } else {
      seenTickers.set(tick, ent);
    }
  }

  // D. ドメイン一意性（同一企業の検死版POST_MORTEMは許容）
  if (ent.url && ent.pnl?.financialStatus !== 'POST_MORTEM' && !ent.name.includes('検死')) {
    try {
      const domain = new URL(ent.url).hostname.replace(/^www\./, '').toLowerCase();
      if (domain && !SHARED_PLATFORMS.has(domain)) {
        if (seenDomains.has(domain)) {
          errors.push(`[DUPLICATION ERROR] Duplicate official domain: "${domain}" for "${ent.name}" conflicts with "${seenDomains.get(domain).name}"`);
        } else {
          seenDomains.set(domain, ent);
        }
      }
    } catch {}
  }
}

// 1. Check Offline entities for misplaced SaaS payment tools
const OFFLINE_RETAIL_KEYWORDS = ['スーパー', 'ロピア', 'オーケー', '丸亀', 'スシロー', 'きんぐ', 'ワークマン', '業務スーパー'];
for (const ent of entities) {
  const isOfflineStore = OFFLINE_RETAIL_KEYWORDS.some(kw => ent.name.includes(kw));
  if (isOfflineStore) {
    const hasStripe = ent.operations?.toolStack?.some(t => t.name.toLowerCase().includes('stripe'));
    if (hasStripe) {
      errors.push(`[RULE VIOLATION: Misplaced SaaS Tool] Offline retail entity "${ent.name}" has Stripe Billing in toolStack.`);
    }
  }
}

// 2. Check executionChecklist duplication (Entropy Guard)
const checklists = entities.map(e => JSON.stringify(e.lootBlueprint?.executionChecklist || []));
const uniqueChecklists = new Set(checklists);
const checklistDiversity = uniqueChecklists.size / entities.length;
if (entities.length > 50 && checklistDiversity < 0.02) {
  errors.push(`[RULE VIOLATION: Hardcoded Template Checklist] executionChecklist diversity is too low: only ${uniqueChecklists.size} unique patterns across ${entities.length} entities.`);
}

// 3. Check tollGateSetup duplication
const tollGates = entities.map(e => e.lootBlueprint?.tollGateSetup || '');
const uniqueTollGates = new Set(tollGates);
const tollGateDiversity = uniqueTollGates.size / entities.length;
if (entities.length > 50 && tollGateDiversity < 0.1) {
  errors.push(`[RULE VIOLATION: Hardcoded Template TollGate] tollGateSetup diversity is too low: only ${uniqueTollGates.size} unique patterns across ${entities.length} entities.`);
}

// 4. Check arithmetic precision
for (const ent of entities) {
  const p = ent.pnl;
  if (!p) continue;
  if (p.monthlyRevenue - p.cogs !== p.grossProfit) {
    errors.push(`[ARITHMETIC ERROR] ${ent.name}: monthlyRevenue (${p.monthlyRevenue}) - cogs (${p.cogs}) !== grossProfit (${p.grossProfit})`);
  }
  const opexSum = Object.values(p.operatingExpenses || {}).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0);
  if (p.grossProfit - opexSum !== p.operatingProfit) {
    errors.push(`[ARITHMETIC ERROR] ${ent.name}: grossProfit (${p.grossProfit}) - opexSum (${opexSum}) !== operatingProfit (${p.operatingProfit})`);
  }
}

// 5. Check Content Quality & Non-Corruption (Flexible Ingest: Never reject for missing fields, audit only when present)
const FORBIDDEN_JARGON = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所'];

for (const ent of entities) {
  // A. essence (optional: if present, validate types)
  if (ent.essence) {
    if (typeof ent.essence !== 'object') {
      errors.push(`[SCHEMA ERROR] ${ent.name}: essence must be an object.`);
    }
  }

  // B. evidenceCards (optional: if present, validate structure)
  if (ent.evidenceCards && Array.isArray(ent.evidenceCards)) {
    ent.evidenceCards.forEach((c, idx) => {
      if (!c.title || typeof c.title !== 'string') {
        errors.push(`[SCHEMA ERROR] ${ent.name} card #${idx + 1} missing title.`);
      }
    });
  }

  // C. strategy (optional: if present, validate structure)
  if (ent.strategy && typeof ent.strategy !== 'object') {
    errors.push(`[SCHEMA ERROR] ${ent.name}: strategy must be an object.`);
  }

  // D. observations (optional: if present, must be array)
  if (ent.observations && !Array.isArray(ent.observations)) {
    errors.push(`[SCHEMA ERROR] ${ent.name}: observations must be an array.`);
  }
  if (ent.observationsStream && !Array.isArray(ent.observationsStream)) {
    errors.push(`[SCHEMA ERROR] ${ent.name}: observationsStream must be an array.`);
  }

  // E. LootBlueprint (optional: if present, validate structure)
  if (ent.lootBlueprint && typeof ent.lootBlueprint !== 'object') {
    errors.push(`[SCHEMA ERROR] ${ent.name}: lootBlueprint must be an object.`);
  }

  // F. Forbidden Jargon Guard (Always Enforced: Never leak internal buzzwords to users)
  const entStr = JSON.stringify(ent);
  for (const j of FORBIDDEN_JARGON) {
    if (entStr.includes(j)) {
      errors.push(`[RULE VIOLATION: Forbidden Jargon '${j}'] ${ent.name} contains forbidden internal buzzword.`);
    }
  }

  // G. Claim-Level Evidence Provenance & Verification Receipt Integrity Guard (Dual-Axis Paradigm)
  // ChatGPT・Antigravity最高合意:
  // 全234社はCaseとして全量PUBLISHABLE。欠損を理由にCaseを殺さない。
  // claimBindings を持つ確定Fact（VERIFIED）についてのみ、厳格な原本実体・暗号照合・意味的実支持を強制。
  // claimBindings が未登録のエンティティは、Factレベルで REPORTED / ESTIMATED / POST_MORTEM として正直に表示。
  const hasClaimBindings = Array.isArray(ent.claimBindings) && ent.claimBindings.length > 0;
  if (hasClaimBindings) {
    const revBinding = ent.claimBindings.find(b => b && b.claimKey === 'pnl.monthlyRevenue');
    if (revBinding) {
        if (revBinding.verificationStatus !== 'SUPPORTED' || revBinding.supportCheck !== 'PASS') {
          errors.push(`[PROVENANCE VIOLATION: Unsupported Status] ${ent.name} binding has status '${revBinding.verificationStatus}' check '${revBinding.supportCheck}'.`);
        }
        // 監査役ChatGPT指示: 公開Claimとbinding.claimValueの同一値保証
        if (revBinding.claimValue !== undefined && revBinding.claimValue !== ent.pnl.monthlyRevenue) {
          errors.push(`[PROVENANCE VIOLATION: Decoupled ClaimValue] ${ent.name} claimValue ${revBinding.claimValue} !== monthlyRevenue ${ent.pnl.monthlyRevenue}.`);
        }
        if (!revBinding.foundationEvidenceId || typeof revBinding.foundationEvidenceId !== 'string' || revBinding.foundationEvidenceId.trim() === '') {
          errors.push(`[PROVENANCE VIOLATION: Missing foundationEvidenceId] ${ent.name} binding missing foundationEvidenceId.`);
        } else {
          const resolvedEvidence = evidenceCatalogMap.get(revBinding.foundationEvidenceId);
          if (!resolvedEvidence) {
            errors.push(`[PROVENANCE VIOLATION: Unresolvable Foundation Evidence] ${ent.name} foundationEvidenceId '${revBinding.foundationEvidenceId}' could not be resolved in foundation-evidence-catalog.json.`);
          } else {
            if (resolvedEvidence.originalSha256 !== (revBinding.originalDigest || revBinding.verificationReceipt?.originalDigest)) {
              errors.push(`[PROVENANCE VIOLATION: Original Digest Mismatch] ${ent.name} originalDigest '${revBinding.originalDigest}' does not match resolved originalSha256 '${resolvedEvidence.originalSha256}'.`);
            }

            // 原本実体ファイル（data/foundation-raw/）の物理検証 ＆ 意味論的売上支持検証
            const rawFilePath = path.join(process.cwd(), 'data', 'foundation-raw', resolvedEvidence.originalObjectKey);
            if (!fs.existsSync(rawFilePath)) {
              errors.push(`[PROVENANCE VIOLATION: Missing Raw Payload File] ${ent.name} raw payload file not found at ${rawFilePath}.`);
            } else {
              const rawBytes = fs.readFileSync(rawFilePath);
              const actualSha256 = crypto.createHash('sha256').update(rawBytes).digest('hex');
              if (actualSha256 !== resolvedEvidence.originalSha256) {
                errors.push(`[PROVENANCE VIOLATION: Raw Payload SHA Mismatch] ${ent.name} raw file SHA ${actualSha256} does not match catalog ${resolvedEvidence.originalSha256}.`);
              }
              const rawText = rawBytes.toString('utf8');
              const { start, end } = resolvedEvidence.locator;
              const sliced = rawText.slice(start, end);
              if (sliced !== resolvedEvidence.excerpt) {
                errors.push(`[PROVENANCE VIOLATION: Locator Slice Mismatch] ${ent.name} raw text slice does not match excerpt.`);
              }
              // 意味論的売上支持検証（原本excerptがClaim数値を客観的に支持していること）
              const extractCandidateNumbers = (text) => {
                const results = new Set();
                const okuRegex = /([\d,]+(?:\.\d+)?)\s*億/g;
                let m;
                while ((m = okuRegex.exec(text)) !== null) {
                  const n = parseFloat(m[1].replace(/,/g, ''));
                  if (!Number.isNaN(n)) results.add(Math.round(n * 100000000));
                }
                const manRegex = /([\d,]+(?:\.\d+)?)\s*万/g;
                while ((m = manRegex.exec(text)) !== null) {
                  const n = parseFloat(m[1].replace(/,/g, ''));
                  if (!Number.isNaN(n)) results.add(Math.round(n * 10000));
                }
                const numRegex = /(?:^|[^\d.])([1-9]\d{0,2}(?:,\d{3})+|[1-9]\d{4,})(?!\d)/g;
                while ((m = numRegex.exec(text)) !== null) {
                  const n = parseInt(m[1].replace(/,/g, ''), 10);
                  if (!Number.isNaN(n)) results.add(n);
                }
                return Array.from(results);
              };
              const extractedNums = extractCandidateNumbers(resolvedEvidence.excerpt);
              const claimVal = ent.pnl.monthlyRevenue;
              const isSupported = extractedNums.includes(claimVal) || extractedNums.some(v => Math.abs(v - claimVal) / claimVal <= 0.01);
              if (!isSupported) {
                errors.push(`[PROVENANCE VIOLATION: Excerpt Revenue Mismatch] ${ent.name} excerpt does not contain claimed revenue ${claimVal}. Extracted: [${extractedNums.join(', ')}]`);
              }
            }
          }
        }
        if (!revBinding.sourceClass || revBinding.sourceClass === 'MODEL') {
          errors.push(`[PROVENANCE VIOLATION: Invalid Source Class] ${ent.name} binding has invalid sourceClass '${revBinding.sourceClass}'.`);
        }
        if (!revBinding.evidenceId || typeof revBinding.evidenceId !== 'string') {
          errors.push(`[PROVENANCE VIOLATION: Missing EvidenceId] ${ent.name} binding missing evidenceId.`);
        } else {
          const matchingCard = Array.isArray(ent.evidenceCards) && ent.evidenceCards.find(c => c && c.id === revBinding.evidenceId);
          const matchingObs = Array.isArray(ent.observationsStream) && ent.observationsStream.find(o => o && o.id === revBinding.evidenceId);
          if (!matchingCard && !matchingObs) {
            errors.push(`[PROVENANCE VIOLATION: Dangling EvidenceId] ${ent.name} evidenceId '${revBinding.evidenceId}' not found in cards or observationsStream.`);
          } else {
            // Check context contains financial signal
            const text = matchingCard
              ? `${matchingCard.punchline || ''} ${(matchingCard.details || []).join(' ')} ${matchingCard.sourceNote || ''}`
              : (matchingObs?.text || '');
            const hasFinancialSignal = /月商|年商|売上|利益|revenue|arr|mrr|sales|¥|\$|円|億|万/i.test(text);
            if (!hasFinancialSignal) {
              errors.push(`[PROVENANCE VIOLATION: Missing Financial Context] ${ent.name} bound evidence '${revBinding.evidenceId}' has no financial context.`);
            }
          }
        }
        if (!revBinding.locator || typeof revBinding.locator !== 'object') {
          errors.push(`[PROVENANCE VIOLATION: Missing Locator] ${ent.name} binding missing locator object.`);
        } else if (revBinding.locator.type === 'json') {
          const ptr = revBinding.locator.jsonPointer || '';
          if (ptr.startsWith('/pnl') || ptr.startsWith('/operations') || ptr.startsWith('/strategy') || ptr.startsWith('/essence')) {
            errors.push(`[PROVENANCE VIOLATION: Self-Referential Locator] ${ent.name} locator uses forbidden self-pointer '${ptr}'.`);
          }
        }
        if (!revBinding.verificationReceipt || typeof revBinding.verificationReceipt !== 'object') {
          errors.push(`[PROVENANCE VIOLATION: Missing VerificationReceipt] ${ent.name} binding has no verificationReceipt.`);
        } else {
          const rcpt = revBinding.verificationReceipt;
          if (rcpt.deterministicCheck !== 'PASS') {
            errors.push(`[PROVENANCE VIOLATION: Failed DeterministicCheck] ${ent.name} verificationReceipt check is '${rcpt.deterministicCheck}'.`);
          }
          if (!rcpt.fingerprint || rcpt.fingerprint.length !== 64 || !/^[0-9a-f]{64}$/i.test(rcpt.fingerprint)) {
            errors.push(`[PROVENANCE VIOLATION: Invalid Fingerprint] ${ent.name} verificationReceipt fingerprint '${rcpt.fingerprint}' must be 64-char hex SHA-256.`);
          }
          if (rcpt.algorithm !== 'SHA-256') {
            errors.push(`[PROVENANCE VIOLATION: Invalid Hash Algorithm] ${ent.name} verificationReceipt algorithm '${rcpt.algorithm}' !== 'SHA-256'.`);
          }

          // 原本ダイジェスト検証
          const originalDigest = revBinding.originalDigest || rcpt.originalDigest;
          if (!originalDigest || typeof originalDigest !== 'string' || originalDigest.length !== 64 || !/^[0-9a-f]{64}$/i.test(originalDigest)) {
            errors.push(`[PROVENANCE VIOLATION: Invalid Original Digest] ${ent.name} originalDigest '${originalDigest}' must be 64-char hex SHA-256.`);
          }

          // Deterministic Provenance Recomputation Verification (Zero Fake Hashes allowed)
          const matchingCard = Array.isArray(ent.evidenceCards) && ent.evidenceCards.find(c => c && c.id === revBinding.evidenceId);
          const matchingObs = Array.isArray(ent.observationsStream) && ent.observationsStream.find(o => o && o.id === revBinding.evidenceId);
          const targetSnippet = revBinding.locator?.type === 'text' && revBinding.locator.targetText
            ? revBinding.locator.targetText
            : (matchingCard ? (matchingCard.punchline || '') : (matchingObs?.text?.slice(0, 40) || ''));

          const selectorStr = revBinding.locator?.type === 'text'
            ? `text:${revBinding.locator.start ?? 0}-${revBinding.locator.end ?? 0}`
            : JSON.stringify(revBinding.locator);

          const extractedExcerptDigest = rcpt.extractedExcerptDigest || createHash('sha256').update(targetSnippet.trim()).digest('hex');
          const version = rcpt.validatorVersion || 'v1.0.0';
          const canonical = `${revBinding.foundationEvidenceId}|${originalDigest}|${selectorStr}|${extractedExcerptDigest}|${ent.pnl.monthlyRevenue}|${version}`;
          const expectedFingerprint = createHash('sha256').update(canonical).digest('hex');

          if (rcpt.fingerprint !== expectedFingerprint) {
            errors.push(`[PROVENANCE VIOLATION: Fingerprint Recomputation Mismatch] ${ent.name} receipt fingerprint '${rcpt.fingerprint}' does not match recomputed SHA-256 '${expectedFingerprint}'.`);
          }
        }
      }
    }
  // 6. Check High-Density Quality Invariants (Permanent Keyence-Level Fail-Closed Gate)
  // A. 稼働ツールスタック密度チェック (0件のスカスカデータを物理遮断)
  if (!ent.operations?.toolStack || !Array.isArray(ent.operations.toolStack) || ent.operations.toolStack.length === 0) {
    errors.push(`[DENSITY VIOLATION: Empty ToolStack] ${ent.name} has 0 tools in operations.toolStack.`);
  }

  // B. 4大意思決定ベクトル完全性チェック (ヘッダー空白化の物理遮断)
  if (!ent.opportunityJudgment || !ent.opportunityJudgment.verdict || !ent.opportunityJudgment.demandDelta || ent.opportunityJudgment.demandDelta === '未確認') {
    errors.push(`[DENSITY VIOLATION: Missing OpportunityJudgment] ${ent.name} missing valid opportunityJudgment (verdict or demandDelta is missing/unconfirmed).`);
  }

  // C. エビデンスカード金融メトリクスチェック (数値グリッド欠落の物理遮断)
  const hasCardMetrics = Array.isArray(ent.evidenceCards) && ent.evidenceCards.some(c => c && Array.isArray(c.metrics) && c.metrics.length > 0);
  if (!hasCardMetrics) {
    errors.push(`[DENSITY VIOLATION: Missing Card Metrics] ${ent.name} has no numerical KPI metrics in evidenceCards.`);
  }

  // D. 地雷・破綻ステータス整合性チェック (破綻警告不全の物理遮断)
  const isHazard = (Array.isArray(ent.tags) && ent.tags.some(t => /破綻|倒産|粉飾|不正|清算|枯渇|崩壊|撤退|レシーバーシップ/i.test(t))) ||
    (Array.isArray(ent.evidenceCards) && ent.evidenceCards.some(c => c && c.type === 'FATAL_BLEED'));
  if (isHazard && ent.financialStatus !== 'POST_MORTEM') {
    errors.push(`[DENSITY VIOLATION: Hazard Status Mismatch] ${ent.name} has failure/fatal bleed evidence but financialStatus is not POST_MORTEM.`);
  }

  // E. エビデンスカード最低3枚チェック (#01〜#03の欠落物理遮断)
  if (!Array.isArray(ent.evidenceCards) || ent.evidenceCards.length < 3) {
    errors.push(`[DENSITY VIOLATION: Less Than 3 Cards] ${ent.name} has only ${ent.evidenceCards?.length ?? 0} evidenceCards (minimum 3 required).`);
  }

  // F. essence (#01) 完全性チェック (ビジネスの正体非表示の物理遮断)
  if (!ent.essence || !ent.essence.whatItDoes || !ent.essence.targetCustomer || !ent.essence.painRelief) {
    errors.push(`[DENSITY VIOLATION: Incomplete Essence] ${ent.name} missing complete essence.`);
  }

  // G. 構造化パンチラインチェック (1行ポツン表示の物理遮断)
  const bs = ent.strategy?.blindspot || '';
  if (!bs.startsWith('【') || !bs.includes('】') || bs.length < 40) {
    errors.push(`[DENSITY VIOLATION: Unstructured Blindspot] ${ent.name} strategy.blindspot missing 【headline】 or too short.`);
  }
  const md = ent.strategy?.moatDescription || '';
  if (!md.startsWith('【') || !md.includes('】') || md.length < 40) {
    errors.push(`[DENSITY VIOLATION: Unstructured Moat] ${ent.name} strategy.moatDescription missing 【headline】 or too short.`);
  }
}

if (errors.length > 0) {
  console.error(`\n❌ [check-ingest-quality] FAILED with ${errors.length} quality violations:`);
  errors.slice(0, 10).forEach(err => console.error(`  - ${err}`));
  if (errors.length > 10) console.error(`  ...and ${errors.length - 10} more`);
  process.exit(1);
}


console.log(`✓ [check-ingest-quality] PASSED: All ${entities.length} entities satisfy domain consistency, tool accuracy, arithmetic precision, flexible schema integrity, and zero jargon.\n`);

