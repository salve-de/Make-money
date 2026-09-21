import { expect, it } from 'vitest';
import { materializeScheduledR2Handoff, ScheduledHandoffMaterializationError } from './scheduled-r2-handoff';

const evidenceId = 'ev_1234567890abcdef12345678';

it('retains explicitly successful restricted-fulltext metadata without upgrading verification', async () => {
  const locator='Publisher: Example closure report';
  const result=await materializeScheduledR2Handoff({queue:{run_id:'run_restricted',finished_at:'2026-09-21T04:00:00Z',recorded_items:[
    {state:'VALIDATED_FOR_R2_HANDOFF',Entity:{name:'Example'},Source:[{url:locator}],Evidence:[{summary:'Metadata only; full text restricted.'}],Claim:'Closure is scheduled, not completed.',quality:{verification_status:'UNVERIFIED'}},
  ]},source_runs:[{source_attempts:[{url_or_source_id:locator,result:'SUCCESS_RESTRICTED_FULLTEXT',rights_state:'metadata_only'}]}]});
  expect(result.entity_count).toBe(1);
  expect(result.bundle.claims).toEqual(expect.arrayContaining([expect.objectContaining({verification_status:'UNVERIFIED'})]));
  expect(JSON.stringify(result.bundle)).toContain('metadata_only');
});

it('recovers a legacy locator only through an exact subject or matching source record', async () => {
  const input={queue:{schema_version:'r2-queue-run.v1',run_id:'run_legacy_locator',finished_at:'2026-09-21T03:00:00Z',recorded_items:[
    {name:'Exact Company',state:'VALIDATED_FOR_R2_HANDOFF',Evidence:evidenceId},
  ]},source_runs:[{source_attempts:[{source:'https://example.com/report',purpose:'Exact Company',result:'found'}]}]};
  expect((await materializeScheduledR2Handoff(input)).included_items).toBe(1);
  const recordMatch={...input,source_runs:[{source_attempts:[{source:'https://example.com/report',result:'success_metadata_extract'}],recorded_items:[{name:'Exact Company',source:'https://example.com/report'}]}]};
  expect((await materializeScheduledR2Handoff(recordMatch)).included_items).toBe(1);
  await expect(materializeScheduledR2Handoff({...input,source_runs:[{source_attempts:[{source:'https://other.com/report',purpose:'Different Company',result:'found'}]}]})).rejects.toThrow('no successful source locator');
  await expect(materializeScheduledR2Handoff({...input,source_runs:[{source_attempts:[{source:'https://example.com/report',purpose:'Exact Company',result:'failed'}]}]})).rejects.toThrow('no successful source locator');
});

it('reads object evidence IDs and excludes blocked governance rows before company validation', async () => {
  const result = await materializeScheduledR2Handoff({queue:{schema_version:'r2-queue-run.v1',run_id:'run_object_evidence',finished_at:'2026-09-21T03:00:00Z',recorded_items:[
    {state:'VALIDATED_FOR_R2_HANDOFF',Entity:{name:'Example'},Evidence:{id:evidenceId}},
    {state:'BLOCKED_SCHEMA_GOVERNANCE',Entity:null,Evidence:{id:'not_a_business_fact'}},
  ]},source_runs:[{source_attempts:[{url:'https://example.com/report',result:'success',evidence_ids_if_any:[evidenceId]}]}]});
  expect(result.included_items).toBe(1);
  expect(result.skipped_items).toBe(1);
  expect(result.evidence_count).toBe(1);
});

it('joins separate normalized candidates by ID instead of treating audit summaries as handoffs', async () => {
  const candidate = { source_entity_id: 'queue_example', state: 'VALIDATED_FOR_R2_HANDOFF',
    Entity: [{ name: 'Example Company' }], Source: [{ url: 'https://example.com/report' }],
    Evidence: [{ id: 'ev_local_01', summary: 'Company announcement.' }],
    Claim: [{ text: 'Financing announced but not closed.' }],
    Observation: [{ text: 'Closing remains pending.' }], quality: { verification_status: 'UNVERIFIED' } };
  const input = { queue: { schema_version: 'r2-queue-run.v1', run_id: 'run_separate',
    finished_at: '2026-09-21T03:00:00Z',
    recorded_items: [{ record_id_if_assigned: 'queue_example', subject_or_entity_id: 'Example Company', short_summary: 'Audit only' }],
    normalized_candidates: [candidate] },
    source_runs: [{ source_attempts: [{ url: 'https://example.com/report', result: 'SUCCESS' }] }] };
  const result = await materializeScheduledR2Handoff(input);
  expect(result.included_items).toBe(1);
  expect(result.evidence_count).toBe(1);
  expect(result.bundle.claims).toEqual(expect.arrayContaining([expect.objectContaining({ statement: 'Financing announced but not closed.', verification_status: 'UNVERIFIED' })]));
  expect(result.bundle.observations).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'Closing remains pending.' })]));
  const secondary = await materializeScheduledR2Handoff({ ...input, source_runs: [{ source_attempts: [{ url: 'https://example.com/report', result: 'SUCCESS_SECONDARY; primary source unavailable' }] }] });
  expect(secondary.bundle.claims).toEqual(expect.arrayContaining([expect.objectContaining({ verification_status: 'UNVERIFIED' })]));
  await expect(materializeScheduledR2Handoff({ ...input, source_runs: [] })).rejects.toThrow('no successful source locator');
  await expect(materializeScheduledR2Handoff({ ...input, queue: { ...input.queue, normalized_candidates: [candidate, candidate] } })).rejects.toThrow('2 normalized candidate matches');
});

it('materializes validated queue rows into a source-backed research bundle', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v2',
      run_id: 'run_r2queue_20260920T120000Z_test',
      queue_state: 'UNQUEUED_TO_CANONICAL_R2',
      finished_at: '2026-09-20T12:00:00Z',
      recorded_items: {
        columns: ['n', 'name', 'state', 'Source', 'Evidence', 'Entity', 'Claim', 'Metric', 'MoneySignal', 'Event', 'Relationship', 'Observation', 'quality'],
        rows: [[
          1,
          'Example Company',
          'VALIDATED_FOR_R2_HANDOFF',
          'example.com|metadata_only|A',
          evidenceId,
          'company|former:Old Example',
          'Example Company completed the reported transaction.',
          'reported_value≈USD10m',
          'cash_consideration',
          'transaction_completed|2026-09-19',
          'acquired_by:Example Buyer',
          'Source-backed staged observation.',
          'SUPPORTED|A',
        ]],
      },
      warnings: [],
      coverage: { validated_count: 1 },
    },
    source_runs: [{
      run_id: 'run_discovery_test',
      source_attempts: [{
        url_or_source_id: 'https://example.com/report',
        purpose: 'transaction report',
        retrieved_at_or_attempted_at: '2026-09-20T11:59:00Z',
        result: 'success',
        rights_state: 'metadata_only',
        evidence_ids_if_any: [evidenceId],
      }],
      recorded_items: [{
        record_type: 'Observation',
        short_summary: 'Detailed source-backed summary.',
        evidence_ids: [evidenceId],
      }],
    }],
  });

  expect(result.included_items).toBe(1);
  expect(result.skipped_items).toBe(0);
  expect(result.bundle.schema_version).toBe('research-bundle.v1');
  expect((result.bundle.sources as unknown[]).length).toBe(1);
  expect((result.bundle.evidence as unknown[]).length).toBe(1);
  expect((result.bundle.entities as unknown[]).length).toBe(1);
  expect((result.bundle.claims as unknown[]).length).toBe(1);
  expect((result.bundle.metrics as unknown[]).length).toBe(1);
  expect((result.bundle.money_signals as unknown[]).length).toBe(1);
  expect((result.bundle.events as unknown[]).length).toBe(1);
  expect((result.bundle.relationships as unknown[]).length).toBe(1);
  expect((result.bundle.observations as unknown[]).length).toBe(2);
});

it('preserves q40 typed money meaning without promoting unknowns or ambiguous relations', async () => {
  const entityId = 'ent_company_0123456789abcdef0123';
  const q40EvidenceId = 'ev_abcdefabcdefabcdefabcdefab';
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v2',
      run_id: 'run_r2queue_20260921T070011Z_q40',
      finished_at: '2026-09-21T07:10:11Z',
      recorded_items: [{
        state: 'VALIDATED_FOR_R2_HANDOFF',
        source_entity_id: entityId,
        Entity: [{ id: entityId, name: 'LIV Golf, Inc.' }],
        Source: [{ url: 'https://example.com/q40', rights: 'metadata_only' }],
        Evidence: [q40EvidenceId],
        Claim: [{ statement: 'DIP financing is subject to court approval.', verification_status: 'SUPPORTED' }],
        Metric: [{ metric_type: 'financing_amount', value: 49.6, unit: 'million', currency: 'USD' }],
        MoneySignal: [{
          money_type: 'debtor_in_possession_financing',
          purpose: 'DIP financing commitment',
          amount: 49.6,
          currency: 'USD',
          unit: 'million',
          verification_status: 'UNVERIFIED',
          basis: 'subject_to_court_approval',
        }],
        Event: [{ event_type: 'financing', description: 'Contemplated financing is not completed.', occurred_at: '2026-02-31T00:00:00Z' }],
        Relationship: [{ predicate: 'related_to', subject: 123, object: 'court approval' }],
        Observation: [{ product_derived: true, text: 'Contemplated ownership or exit financing is not a completed fact.' }],
        quality: { verification_status: 'SUPPORTED', confidence: 0.9 },
      }],
    },
    source_runs: [{ source_attempts: [{ url: 'https://example.com/q40', result: 'success', evidence_ids_if_any: [q40EvidenceId] }] }],
  });

  expect((result.bundle.entities as Array<Record<string, unknown>>)[0]?.canonical_name).toBe('LIV Golf, Inc.');
  expect(result.bundle.money_signals).toEqual([expect.objectContaining({
    amount: 49.6,
    currency: 'USD',
    unit: 'million',
    purpose: 'DIP financing commitment',
    money_type: 'debtor_in_possession_financing',
    verification_status: 'UNVERIFIED',
  })]);
  expect((result.bundle.money_signals as Array<Record<string, unknown>>).some((item) => item.money_type === 'revenue')).toBe(false);
  expect(result.bundle.events).toEqual([]);
  expect(result.bundle.relationships).toEqual([]);
  expect((result.bundle.entities as Array<Record<string, unknown>>)[0]?.observed_at).toBe('2026-09-21T07:10:11Z');
  expect(JSON.stringify(result.bundle.observations)).toContain('product_derived');
  expect(JSON.stringify(result.bundle.quality)).toContain('invalid supplied subject');
});

it('joins q42 normalized reference tables by exact entity and evidence refs', async () => {
  const entityId = 'ent_company_0123456789abcdef0123';
  const evidenceId = 'ev_b697089169508217c403a0e4';
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v2',
      run_id: 'run_r2queue_reference_tables',
      finished_at: '2026-09-21T09:20:00Z',
      recorded_items: [{
        state: 'VALIDATED_FOR_R2_HANDOFF', subject_or_entity_id: entityId,
        canonical_name: 'Reference Company', evidence_ids: ['ev01', evidenceId],
        temporal_scope: '2026-09-17; pending Q4', verification: 'SUPPORTED',
      }],
      normalized_records: {
        Entity: [{ ref: 1, entity_id: entityId, canonical_name: 'Reference Company', aliases: ['Reference'], domain: 'example.com' }],
        Source: [{ ref: 99, source_id: 'src.reference', canonical_url: 'https://example.com/report', rights_status: 'metadata_only', source_strength: 'A' }],
        Evidence: [{ ref: 1, evidence_id: evidenceId, upstream_evidence_id: 'ev01', source_id: 'src.reference', source_url: 'https://example.com/report', retrieved_at: '2026-09-21T09:00:00Z', rights_status: 'metadata_only', source_strength: 'A' }],
        Claim: [{ entity_ref: 1, evidence_ref: 1, statement: 'A financing agreement was signed.', origin: 'reported', verification: 'SUPPORTED' }],
        Metric: [{ entity_ref: 1, evidence_ref: 1, metric_type: 'cash_consideration', value: 70, currency: 'USD', unit: 'million', point_in_time: '2026-09-17', origin: 'reported', verification: 'SUPPORTED' }],
        MoneySignal: [{ entity_ref: 1, evidence_ref: 1, money_type: 'equity_financing', purpose: 'equity_financing', amount: 70, currency: 'USD', unit: 'million', receiver: entityId, point_in_time: '2026-09-17', origin: 'reported', verification: 'SUPPORTED' }],
        Event: [{ entity_ref: 1, evidence_ref: 1, event_type: 'acquisition_agreement', description: 'Agreement signed, approval pending.', temporal_scope: '2026-09-17; pending Q4', origin: 'reported', verification: 'SUPPORTED' }],
        Relationship: [], Observation: [{ entity_ref: 1, evidence_ref: 1, text: 'Pending approval.', origin: 'reported', verification: 'SUPPORTED' }], Derived: [],
        quality: [{ entity_ref: 1, handoff_quality: 'PASS', state: 'VALIDATED_FOR_R2_HANDOFF' }],
      },
    },
    source_runs: [],
  });

  expect(result.included_items).toBe(1);
  expect(result.bundle.entities).toEqual([expect.objectContaining({ entity_id: entityId, canonical_name: 'Reference Company', domain: 'example.com' })]);
  expect(result.bundle.metrics).toEqual([expect.objectContaining({ value: 70, currency: 'USD', unit: 'million', point_in_time: '2026-09-17T00:00:00.000Z', evidence_ids: [evidenceId] })]);
  expect(result.bundle.money_signals).toEqual([expect.objectContaining({ amount: 70, currency: 'USD', unit: 'million', receiver_entity_id: entityId, evidence_ids: [evidenceId] })]);
  expect(result.bundle.events).toEqual([expect.objectContaining({ occurred_at: '2026-09-17T00:00:00.000Z', evidence_ids: [evidenceId] })]);
});

it('rejects q42 normalized records with an unknown evidence ref', async () => {
  await expect(materializeScheduledR2Handoff({
    queue: {
      run_id: 'run_bad_reference_tables',
      recorded_items: [{ state: 'VALIDATED_FOR_R2_HANDOFF', subject_or_entity_id: 'ent_company_0123456789abcdef0123', canonical_name: 'Reference Company', evidence_ids: ['ev_b697089169508217c403a0e4'] }],
      normalized_records: {
        Entity: [{ ref: 1, entity_id: 'ent_company_0123456789abcdef0123', canonical_name: 'Reference Company' }],
        Source: [{ ref: 1, source_id: 'src.reference', canonical_url: 'https://example.com/report' }],
        Evidence: [{ ref: 1, evidence_id: 'ev_b697089169508217c403a0e4', source_id: 'src.reference', source_url: 'https://example.com/report' }],
        Claim: [{ entity_ref: 1, evidence_ref: 999, statement: 'Unresolved evidence.', origin: 'reported', verification: 'SUPPORTED' }],
        Metric: [], MoneySignal: [], Event: [], Relationship: [], Observation: [], Derived: [],
        quality: [{ entity_ref: 1, handoff_quality: 'PASS' }],
      },
    },
    source_runs: [],
  })).rejects.toThrow('references unknown Evidence.ref 999');
});

it('resolves shared source IDs by URL and allows a missing URL only for one source candidate', async () => {
  const entityA = 'ent_company_11111111111111111111';
  const entityB = 'ent_company_22222222222222222222';
  const evidenceA = 'ev_111111111111111111111111';
  const evidenceB = 'ev_222222222222222222222222';
  const result = await materializeScheduledR2Handoff({
    queue: {
      run_id: 'run_shared_source_identity', finished_at: '2026-09-21T10:00:00Z',
      recorded_items: [
        { state: 'VALIDATED_FOR_R2_HANDOFF', subject_or_entity_id: entityA, canonical_name: 'Shared Source A' },
        { state: 'VALIDATED_FOR_R2_HANDOFF', subject_or_entity_id: entityB, canonical_name: 'Unique Source B' },
      ],
      normalized_records: {
        Entity: [
          { ref: 1, entity_id: entityA, canonical_name: 'Shared Source A' },
          { ref: 2, entity_id: entityB, canonical_name: 'Unique Source B' },
        ],
        Source: [
          { ref: 1, source_id: 'src.shared', canonical_url: 'https://example.com/a' },
          { ref: 2, source_id: 'src.shared', canonical_url: 'https://example.com/b' },
          { ref: 3, source_id: 'src.unique', canonical_url: 'https://example.com/unique' },
        ],
        Evidence: [
          { ref: 1, evidence_id: evidenceA, source_id: 'src.shared', source_url: 'https://example.com/a', summary: 'A' },
          { ref: 2, evidence_id: evidenceB, source_id: 'src.unique', summary: 'B' },
        ],
        Claim: [
          { entity_ref: 1, evidence_ref: 1, statement: 'A is supported.', verification: 'SUPPORTED' },
          { entity_ref: 2, evidence_ref: 2, statement: 'B is supported.', verification: 'SUPPORTED' },
        ],
        Metric: [], MoneySignal: [], Event: [], Relationship: [], Observation: [], Derived: [],
        quality: [
          { entity_ref: 1, handoff_quality: 'PASS', verification_status: 'SUPPORTED' },
          { entity_ref: 2, handoff_quality: 'PASS', verification_status: 'SUPPORTED' },
        ],
      },
    },
    source_runs: [],
  });

  expect(result.included_items).toBe(2);
  expect(result.source_count).toBe(2);
  expect(result.evidence_count).toBe(2);
  expect(result.bundle.evidence).toEqual(expect.arrayContaining([
    expect.objectContaining({ evidence_id: evidenceB, source_url: 'https://example.com/unique' }),
  ]));
});

it('rejects missing source_url when a shared source ID remains ambiguous', async () => {
  await expect(materializeScheduledR2Handoff({
    queue: {
      run_id: 'run_ambiguous_source_identity', finished_at: '2026-09-21T10:00:00Z',
      recorded_items: [{ state: 'VALIDATED_FOR_R2_HANDOFF', subject_or_entity_id: 'ent_company_33333333333333333333', canonical_name: 'Ambiguous Source' }],
      normalized_records: {
        Entity: [{ ref: 1, entity_id: 'ent_company_33333333333333333333', canonical_name: 'Ambiguous Source' }],
        Source: [
          { ref: 1, source_id: 'src.ambiguous', canonical_url: 'https://example.com/one' },
          { ref: 2, source_id: 'src.ambiguous', canonical_url: 'https://example.com/two' },
        ],
        Evidence: [{ ref: 1, evidence_id: 'ev_333333333333333333333333', source_id: 'src.ambiguous' }],
        Claim: [{ entity_ref: 1, evidence_ref: 1, statement: 'Ambiguous.', verification: 'SUPPORTED' }],
        Metric: [], MoneySignal: [], Event: [], Relationship: [], Observation: [], Derived: [],
        quality: [{ entity_ref: 1, handoff_quality: 'PASS', verification_status: 'SUPPORTED' }],
      },
    },
    source_runs: [],
  })).rejects.toThrow('source_id src.ambiguous is ambiguous without source_url');
});

it('does not roll invalid calendar dates into retrieval timestamps', async () => {
  const evidence = 'ev_aaaaaaaaaaaaaaaaaaaaaaaa';
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v1',
      run_id: 'run_invalid_calendar',
      started_at: '2026-09-21T07:00:11Z',
      finished_at: '2026-02-31T07:10:11Z',
      recorded_items: [{
        name: 'Calendar test',
        state: 'VALIDATED_FOR_R2_HANDOFF',
        Source: [{ url: 'https://example.com/calendar' }],
        Evidence: [evidence],
        Entity: ['company'],
        Claim: ['The calendar fallback was observed.'],
        quality: { verification_status: 'SUPPORTED' },
      }],
    },
    source_runs: [{ source_attempts: [{ url: 'https://example.com/calendar', result: 'success', evidence_ids_if_any: [evidence] }] }],
  });

  expect(result.bundle.retrieved_at).toBe('2026-09-21T07:00:11Z');
  expect((result.bundle.entities as Array<Record<string, unknown>>)[0]?.observed_at).toBe('2026-09-21T07:00:11Z');
});

it('does not promote NEEDS_RESEARCH rows into canonical R2 handoff', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v2',
      run_id: 'run_r2queue_20260920T120000Z_test2',
      queue_state: 'UNQUEUED_TO_CANONICAL_R2',
      finished_at: '2026-09-20T12:00:00Z',
      recorded_items: [{ name: 'Pending Example', state: 'NEEDS_RESEARCH', Evidence: evidenceId }],
    },
    source_runs: [],
  });

  expect(result.included_items).toBe(0);
  expect(result.skipped_research_items).toEqual(['Pending Example']);
});

it('accepts the v1 queue artifacts currently produced by the scheduled collectors', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v1',
      run_id: 'run_r2queue_20260920T120000Z_v1',
      finished_at: '2026-09-20T12:00:00Z',
      recorded_items: [{
        name: 'V1 Example',
        state: 'VALIDATED_FOR_R2_HANDOFF',
        Evidence: evidenceId,
        Entity: 'company',
        Claim: 'V1 Example was observed.',
        quality: 'SUPPORTED|A',
      }],
    },
    source_runs: [{
      source_attempts: [{
        url_or_source_id: 'https://example.com/v1',
        retrieved_at_or_attempted_at: '2026-09-20T11:59:00Z',
        result: 'success',
        evidence_ids_if_any: [evidenceId],
      }],
    }],
  });

  expect(result.included_items).toBe(1);
  expect(result.bundle.schema_version).toBe('research-bundle.v1');
});

it('accepts queue identity and timestamps nested under the automation envelope', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v1',
      automation: {
        run_id: 'run_r2queue_20260920T230234Z_q32',
        started_at: '2026-09-20T23:02:34Z',
        finished_at: '2026-09-20T23:06:16Z',
      },
      recorded_items: [{
        name: 'Nested automation example',
        state: 'VALIDATED_FOR_R2_HANDOFF',
        Source: [{ url: 'https://example.com/nested', rights: 'metadata_only' }],
        Evidence: ['A source-backed fact.'],
        Entity: ['company'],
        Claim: ['The nested queue row was reported.'],
        quality: { verification: 'SUPPORTED' },
      }],
    },
    source_runs: [{
      source_attempts: [{
        url: 'https://example.com/nested',
        state: 'success',
        attempted_at: '2026-09-20T23:00:00Z',
      }],
    }],
  });

  expect(result.included_items).toBe(1);
  expect(result.bundle.run_id).toBe('run_r2queue_20260920T230234Z_q32');
  expect(result.bundle.retrieved_at).toBe('2026-09-20T23:06:16Z');
});

it('merges validated handoff candidates embedded in legacy queue artifacts', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'scheduled-r2-queue-run.v2',
      run_id: 'run_r2queue_legacy_candidates',
      queue_state: 'QUEUE_INVENTORY_EXHAUSTED_WITH_ONE_VALIDATED_BUNDLE',
      finished_at: '2026-09-20T19:01:09Z',
      handoff_candidates: [{
        state: 'VALIDATED_FOR_R2_HANDOFF',
        bundle: {
          schema_version: 'research-bundle.v1',
          run_id: 'run_candidate_one',
          retrieved_at: '2026-09-20T18:50:01Z',
          quality: { schema_validation: 'PASS', warnings: ['candidate warning'] },
          sources: [{ source_id: 'src.example', provider_name: 'Example', canonical_url: 'https://example.com', rights_status: 'metadata_only' }],
          evidence: [{ evidence_id: evidenceId, source_id: 'src.example', source_url: 'https://example.com', summary: 'Reported fact.' }],
          entities: [{ entity_id: 'ent_business_legacy1234567890ab', canonical_name: 'Legacy Candidate', entity_type: 'business', evidence_ids: [evidenceId] }],
          claims: [],
          metrics: [],
          money_signals: [],
          events: [],
          relationships: [],
          observations: [],
          derived: [],
        },
      }],
      recorded_items: [{ record_type: 'queue_resolution', subject_or_entity_id: 'blocked', evidence_ids: [] }],
    },
    source_runs: [],
  });

  expect(result.included_items).toBe(1);
  expect(result.skipped_items).toBe(0);
  expect((result.bundle.entities as Array<Record<string, unknown>>)[0]?.canonical_name).toBe('Legacy Candidate');
  expect((result.bundle.sources as Array<Record<string, unknown>>)[0]?.canonical_url).toBe('https://example.com');
});

it('fails closed when a validated row has no successful source locator', async () => {
  await expect(materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v2',
      run_id: 'run_r2queue_20260920T120000Z_test3',
      queue_state: 'UNQUEUED_TO_CANONICAL_R2',
      finished_at: '2026-09-20T12:00:00Z',
      recorded_items: [{ name: 'Missing Source', state: 'VALIDATED_FOR_R2_HANDOFF', Evidence: evidenceId, quality: 'SUPPORTED|A' }],
    },
    source_runs: [],
  })).rejects.toBeInstanceOf(ScheduledHandoffMaterializationError);
});

it('promotes current metadata-only source references without inventing article URLs', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v1',
      run_id: 'run_r2queue_20260920T200603Z_q29',
      finished_at: '2026-09-20T20:07:42Z',
      input_snapshot: {
        selected_source_runs: ['staging/automation/discovery/2026/09/20/discovery.json'],
      },
      recorded_items: [{
        name: 'Current metadata-only candidate',
        state: 'VALIDATED_FOR_R2_HANDOFF',
        Source: ['web:turn995453search2', 'web:turn883645search7'],
        Evidence: ['Acquisition terms supported; completion is reported.'],
        Entity: ['company'],
        Claim: ['The acquisition terms are supported.'],
        quality: { verification: 'SUPPORTED', source_strength: 'A' },
      }],
    },
    source_runs: [{
      __source_run_path: 'staging/automation/discovery/2026/09/20/discovery.json',
      source_attempts: [
        { source_ref: 'web:turn995453search2', status: 'SUCCESS', retrieved_at_or_attempted_at: '2026-09-20T15:50:23Z' },
        { source_ref: 'web:turn883645search7', status: 'SUCCESS', retrieved_at_or_attempted_at: '2026-09-20T15:50:23Z' },
      ],
    }],
  });

  expect(result.included_items).toBe(1);
  expect(result.evidence_count).toBe(2);
  expect((result.bundle.evidence as Array<Record<string, unknown>>).every((item) => typeof item.source_url === 'string' && String(item.source_url).startsWith('https://github.com/'))).toBe(true);
  expect((result.bundle.sources as Array<Record<string, unknown>>).every((item) => String(item.access_notes).includes('original_source_locator=web:turn'))).toBe(true);
});

it('accepts collector source objects retained by the latest discovery lane', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v1',
      run_id: 'run_r2queue_20260920T210207Z_q30',
      finished_at: '2026-09-20T21:02:07Z',
      recorded_items: [{
        subject: 'Current discovery candidate',
        state: 'VALIDATED_FOR_R2_HANDOFF',
        Source: [{ publisher: 'Reuters', url: 'https://www.reuters.com/example', strength: 'A', rights: 'metadata_only' }],
        Evidence: ['A reported transaction fact.'],
        Entity: ['ent_business_1234567890abcdef1234'],
        Claim: ['The transaction was reported.'],
        quality: { verification: 'SUPPORTED', status: 'PASS', rights: 'metadata_only' },
      }],
    },
    source_runs: [{
      __source_run_path: 'staging/automation/discovery/current.json',
      source_attempts: [{
        candidate_id: 'cand_current',
        url: 'https://www.reuters.com/example',
        result: 'RETAINED',
        raw_body_stored: false,
      }],
    }],
  });

  expect(result.included_items).toBe(1);
  expect(result.evidence_count).toBe(1);
  expect((result.bundle.evidence as Array<Record<string, unknown>>)[0]?.source_url).toBe('https://www.reuters.com/example');
});

it('accepts discovery source attempts that use url, state, and attempted_at fields', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v1',
      run_id: 'run_r2queue_discovery_state_fields',
      finished_at: '2026-09-20T22:04:16Z',
      recorded_items: [{
        subject: 'Discovery state-field candidate',
        state: 'VALIDATED_FOR_R2_HANDOFF',
        Source: [{ url: 'https://example.com/discovery', rights: 'metadata_only' }],
        Evidence: ['A discovery source-backed fact.'],
        Entity: ['company'],
        Claim: ['The discovery fact was reported.'],
        quality: { verification: 'SUPPORTED' },
      }],
    },
    source_runs: [{
      source_attempts: [{
        url: 'https://example.com/discovery',
        state: 'success',
        attempted_at: '2026-09-20T21:50:00Z',
      }],
    }],
  });

  expect(result.included_items).toBe(1);
  expect((result.bundle.evidence as Array<Record<string, unknown>>)[0]?.retrieved_at).toBe('2026-09-20T21:50:00Z');
});

it('recovers concrete locators from legacy generic source-run markers', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v1',
      run_id: 'run_r2queue_legacy_marker',
      finished_at: '2026-09-20T19:01:21Z',
      recorded_items: [{
        name: 'Legacy Candidate',
        state: 'VALIDATED_FOR_R2_HANDOFF',
        Source: ['source-run bundle; metadata_only rights'],
        Evidence: ['A legacy source-backed fact.'],
        Entity: [{ id: 'ent_company_legacy123', name: 'Legacy Candidate' }],
        Claim: ['The legacy candidate was reported.'],
        quality: 'SUPPORTED|A',
      }],
    },
    source_runs: [{
      source_attempts: [{
        url_or_source_id: 'https://legacy.example/report',
        result: 'success',
        evidence_ids_if_any: ['ev_abcdefabcdefabcdefabcdefab'],
      }],
      recorded_items: [{
        subject_or_entity_id: 'ent_company_legacy123',
        evidence_ids: ['ev_abcdefabcdefabcdefabcdefab'],
      }],
    }],
  });

  expect(result.included_items).toBe(1);
  expect((result.bundle.sources as Array<Record<string, unknown>>)[0]?.canonical_url).toBe('https://legacy.example/report');
});
