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

// 5. Check Content Completeness & Thickness (No thin garbage allowed)
const FORBIDDEN_JARGON = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所'];

for (const ent of entities) {
  // A. essence (min 40/30/30 chars)
  if (!ent.essence || !ent.essence.whatItDoes || !ent.essence.targetCustomer || !ent.essence.painRelief) {
    errors.push(`[RULE VIOLATION: Missing Essence] ${ent.name} is missing essence object or required fields.`);
  } else {
    if (ent.essence.whatItDoes.length < 40) errors.push(`[RULE VIOLATION: Thin Essence] ${ent.name} whatItDoes is too short (< 40 chars).`);
    if (ent.essence.targetCustomer.length < 30) errors.push(`[RULE VIOLATION: Thin Essence] ${ent.name} targetCustomer is too short (< 30 chars).`);
    if (ent.essence.painRelief.length < 30) errors.push(`[RULE VIOLATION: Thin Essence] ${ent.name} painRelief is too short (< 30 chars).`);
  }

  // B. evidenceCards (min 2 cards, each min 3 details with min 20 chars)
  if (!ent.evidenceCards || ent.evidenceCards.length < 2) {
    errors.push(`[RULE VIOLATION: Insufficient Cards] ${ent.name} has only ${ent.evidenceCards?.length || 0} evidence cards (min 2 required).`);
  } else {
    ent.evidenceCards.forEach((c, idx) => {
      if (!c.punchline || c.punchline.length < 20) {
        errors.push(`[RULE VIOLATION: Thin Card Punchline] ${ent.name} card #${idx + 1} punchline is too short (< 20 chars).`);
      }
      if (!c.details || c.details.length < 3) {
        errors.push(`[RULE VIOLATION: Thin Card Details] ${ent.name} card #${idx + 1} has only ${c.details?.length || 0} details (min 3 required).`);
      }
    });
  }

  // C. strategy (blindspot, moatDescription, initialTraction >= 3, actionPlaybook >= 3)
  if (!ent.strategy?.blindspot || !ent.strategy?.moatDescription) {
    errors.push(`[RULE VIOLATION: Missing Strategy Core] ${ent.name} is missing blindspot or moatDescription.`);
  }
  if (!ent.strategy?.initialTraction || ent.strategy.initialTraction.length < 3) {
    errors.push(`[RULE VIOLATION: Thin Initial Traction] ${ent.name} initialTraction count < 3.`);
  }
  if (!ent.strategy?.actionPlaybook || ent.strategy.actionPlaybook.length < 3) {
    errors.push(`[RULE VIOLATION: Thin Action Playbook] ${ent.name} actionPlaybook count < 3.`);
  }

  // D. observations & observationsStream (min 4 items)
  if (!ent.observations || ent.observations.length < 4) {
    errors.push(`[RULE VIOLATION: Thin Observations] ${ent.name} observations count is ${ent.observations?.length || 0} (min 4 required).`);
  }
  if (!ent.observationsStream || ent.observationsStream.length < 4) {
    errors.push(`[RULE VIOLATION: Thin ObservationsStream] ${ent.name} observationsStream count is ${ent.observationsStream?.length || 0} (min 4 required).`);
  }

  // E. LootBlueprint Guard (100% required)
  if (!ent.lootBlueprint) {
    errors.push(`[RULE VIOLATION: Missing LootBlueprint] ${ent.name} is missing lootBlueprint.`);
  } else {
    if (!ent.lootBlueprint.targetPrey || ent.lootBlueprint.targetPrey.length < 10) {
      errors.push(`[RULE VIOLATION: Thin LootBlueprint] ${ent.name} targetPrey is too short (< 10 chars).`);
    }
    if (!ent.lootBlueprint.structuralFlaw || ent.lootBlueprint.structuralFlaw.length < 10) {
      errors.push(`[RULE VIOLATION: Thin LootBlueprint] ${ent.name} structuralFlaw is too short (< 10 chars).`);
    }
    if (!ent.lootBlueprint.stealthEntry || ent.lootBlueprint.stealthEntry.length < 10) {
      errors.push(`[RULE VIOLATION: Thin LootBlueprint] ${ent.name} stealthEntry is too short (< 10 chars).`);
    }
    if (!ent.lootBlueprint.tollGateSetup || ent.lootBlueprint.tollGateSetup.length < 10) {
      errors.push(`[RULE VIOLATION: Thin LootBlueprint] ${ent.name} tollGateSetup is too short (< 10 chars).`);
    }
    if (!ent.lootBlueprint.executionChecklist || ent.lootBlueprint.executionChecklist.length < 3) {
      errors.push(`[RULE VIOLATION: Thin ExecutionChecklist] ${ent.name} executionChecklist must have at least 3 steps.`);
    }
  }

  // F. Forbidden Jargon Guard
  const entStr = JSON.stringify(ent);
  for (const j of FORBIDDEN_JARGON) {
    if (entStr.includes(j)) {
      errors.push(`[RULE VIOLATION: Forbidden Jargon '${j}'] ${ent.name} contains forbidden internal buzzword.`);
    }
  }

  // G. Claim-Level Evidence Provenance & Verification Receipt Integrity Guard (P0-4 Strict Audit)
  // 監査役ChatGPT指示: 原本Evidenceの無い231社は無理にPUBLISHABLEにせずPARTIAL/RAWへ落とす。
  // PUBLISHABLEなもののみ厳格な原本実体・暗号照合・意味的実支持を強制。PARTIAL/RAWの不完全Bindingは排除。
  if (ent.publishability !== 'PUBLISHABLE') {
    if (Array.isArray(ent.claimBindings) && ent.claimBindings.length > 0) {
      errors.push(`[PROVENANCE VIOLATION: Premature ClaimBindings] ${ent.name} is ${ent.publishability} but has claimBindings. Non-publishable entities must have empty claimBindings.`);
    }
  }

  const isPublishableRevenue = ent.publishability === 'PUBLISHABLE' && typeof ent.pnl?.monthlyRevenue === 'number' && ent.pnl.monthlyRevenue > 0 && !ent.pnl.isRevenueUnconfirmed;
  if (isPublishableRevenue) {
    if (!Array.isArray(ent.claimBindings) || ent.claimBindings.length === 0) {
      errors.push(`[PROVENANCE VIOLATION: Missing ClaimBindings] ${ent.name} is PUBLISHABLE and claims revenue (${ent.pnl.monthlyRevenue}) but has no claimBindings.`);
    } else {
      const revBinding = ent.claimBindings.find(b => b && b.claimKey === 'pnl.monthlyRevenue');
      if (!revBinding) {
        errors.push(`[PROVENANCE VIOLATION: Missing Revenue Binding] ${ent.name} claims revenue but lacks 'pnl.monthlyRevenue' binding.`);
      } else {
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
  }
}

if (errors.length > 0) {
  console.error(`\n❌ [check-ingest-quality] FAILED with ${errors.length} quality violations:`);
  errors.slice(0, 10).forEach(err => console.error(`  - ${err}`));
  if (errors.length > 10) console.error(`  ...and ${errors.length - 10} more`);
  process.exit(1);
}

console.log(`✓ [check-ingest-quality] PASSED: All ${entities.length} entities satisfy domain consistency, tool accuracy, arithmetic precision, content completeness (min 4 obs, min 2 cards x 3 details, min 3 steps), and zero jargon.\n`);

