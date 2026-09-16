#!/usr/bin/env node

import fs from 'node:fs/promises';

const INPUT = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_indie_hackers_enriched_1000_20260916.json';
const SIGNALS = process.env.MM_SIGNALS_FILE ?? 'data/incoming/batch_indie_hackers_official_financial_signals_1000_20260916.json';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_indie_hackers_enriched_financial_signals_1000_20260916.json';
const SNAPSHOT = '2026-09-16';

const clean = (value, max = 360) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function addSignal(entity, signal) {
  const next = structuredClone(entity);
  if (!signal.financialSignalObserved || !Array.isArray(signal.signals) || signal.signals.length === 0) return next;
  const signalText = signal.signals.map((value) => clean(value)).filter(Boolean).slice(0, 5);
  const sourceUrl = signal.finalUrl || signal.requestedUrl;
  const locator = { type: 'html', ...(signal.bodySha256 ? { textHash: signal.bodySha256 } : {}) };
  const cardId = `${next.id}-official-financial-signal`;
  if (!(next.evidenceCards ?? []).some((card) => card.id === cardId)) {
    next.evidenceCards = [...(next.evidenceCards ?? []), {
      id: cardId,
      type: 'UNKNOWN_AUDIT',
      title: '公式ページ本文の価格・収益関連シグナル',
      evidenceStatus: 'REPORTED',
      punchline: '公式ページ本文に価格・課金・収益関連の語句を観測した。これは財務数値や利益の証明ではない。',
      details: [
        ...signalText.map((value, index) => `本文抜粋${index + 1}: ${value}`),
        `取得先: ${sourceUrl}`,
        'キーワード一致は価格・課金・収益に関するページ記載の観測であり、顧客数・売上・原価・利益の独立検証ではない。',
      ],
      sourceNote: `公式サイト本文シグナル確認, ${SNAPSHOT} snapshot`,
      sourceClass: 'PRIMARY',
      sourceUrl,
      evidenceLocator: locator,
    }];
  }
  next.observationsStream = [...(next.observationsStream ?? []), {
    id: `${next.id}-official-financial-signal-observed`,
    category: 'TECH_VERIFICATION',
    originType: 'observed',
    verificationStatus: 'SUPPORTED',
    text: `公式ページ本文に価格・課金・収益関連のシグナルを観測（${signalText.length}抜粋）。財務証明ではない。`,
    sourceUrl,
    observedAt: SNAPSHOT,
    sourceClass: 'PRIMARY',
    evidenceLocator: locator,
  }];
  next.unknownsNotes = [...new Set([...(next.unknownsNotes ?? []), '公式ページの価格・収益関連語句は観測したが、独立財務確認ではない。'])];
  return next;
}

const entities = JSON.parse(await fs.readFile(INPUT, 'utf8'));
const signals = JSON.parse(await fs.readFile(SIGNALS, 'utf8'));
if (!Array.isArray(entities) || entities.length !== 1000) throw new Error(`Expected 1000 entities, got ${entities?.length}`);
if (!Array.isArray(signals) || signals.length !== 1000) throw new Error(`Expected 1000 signal rows, got ${signals?.length}`);
const byId = new Map(signals.map((row) => [row.id, row]));
if (byId.size !== 1000 || entities.some((entity) => !byId.has(entity.id))) throw new Error('Signal rows do not align one-to-one with entities');
const enriched = entities.map((entity) => addSignal(entity, byId.get(entity.id)));
await fs.writeFile(OUTPUT, `${JSON.stringify(enriched, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ input: INPUT, signals: SIGNALS, output: OUTPUT, count: enriched.length, signalIntegrated: signals.filter((row) => row.financialSignalObserved).length }, null, 2));
