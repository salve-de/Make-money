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
