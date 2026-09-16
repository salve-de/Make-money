import fs from 'node:fs';

const capture = JSON.parse(fs.readFileSync('data/incoming/raw_snapshots_fearless_business_20260916.audit.json', 'utf8')).results[0];
const evidence = {
  evidence_id: capture.evidenceId,
  source_id: capture.sourceId,
  source_url: capture.requestedUrl,
  source_title: 'How Robin Waite Built a Six-Figure Coaching Business and a Powerful Personal Brand',
  source_type: 'founder_interview',
  publisher_or_speaker: capture.author,
  published_at: null,
  retrieved_at: '2026-09-16T00:00:00.000Z',
  source_strength: 'B',
  rights_status: 'metadata_only',
  raw_storage: { status: 'not_attempted', bucket: null, key: null, content_type: null, content_sha256: null, bytes: null },
  summary: 'FY2023/24の売上・予測利益、少人数運営、書籍・講演・ポッドキャストによる顧客獲得を記録した本人インタビュー',
  extracted_facts: ['FY2023/24月商平均£20,000/$25,000', '予測年商$250,000、予測純利益約$125,000', '創業者、associate coaches 3人、full-time VA 1人', 'ポッドキャスト1回から1,300 leadsと約£135,000の新規ビジネス'],
  rights_policy_id: null,
};
const bundle = {
  schema_version: 'research-bundle.v1',
  run_id: 'run_make_money_fearless_business_20260916',
  purpose: 'make_money',
  subject: { query: 'Fearless Business Robin Waite' },
  agent: { name: 'codex-20260916-fearless-business', version: '1.0' },
  retrieved_at: '2026-09-16T00:00:00.000Z',
  sources: [{ source_id: capture.sourceId, provider_name: 'Founder Reports', source_type: 'founder_interview', canonical_url: capture.requestedUrl, source_strength: 'B', rights_status: 'metadata_only', rights_policy_id: null, access_notes: 'Private raw capture for provenance.' }],
  evidence: [evidence], entities: [], claims: [], metrics: [], money_signals: [], events: [], relationships: [], derived: [], collection_coverage: [],
  quality: { schema_validation: 'PASS', unknowns: ['財務値は本人報告で独立監査なし', '2026年現在値は未確認'], conflicts: [], warnings: [] },
};
fs.writeFileSync('data/incoming/research-bundle_fearless_business_20260916.json', `${JSON.stringify({ write_authorized: false, bundle, raw_evidence: [] }, null, 2)}\n`);
console.log(JSON.stringify({ evidence: 1, evidenceId: capture.evidenceId, sourceUrl: capture.requestedUrl }, null, 2));
