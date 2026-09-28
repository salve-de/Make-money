import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditBundleLinks,providerBundleSchema} from './gemini-bundle-contract.mjs';
test('valid structure does not conceal missing evidence links and lost findings', () => {
  const bundle={run_id:'run_one',entities:[{entity_id:'e1',evidence_ids:['missing']}],claims:[],collection_coverage:[{dimension:'customers',status:'found',note:'Customers mentioned'}]};
  const errors=auditBundleLinks(bundle,['customers'],'run_one');
  assert.ok(errors.some(x=>x.includes('dangling evidence')));
  assert.ok(errors.some(x=>x.includes('without retained record')));
});
test('honest partial research remains valid, automatic verification does not', () => {
  const bundle={run_id:'run_one',claims:[{claim_id:'c1',verification_status:'UNVERIFIED',entity_ids:[],evidence_ids:[]}],collection_coverage:[{dimension:'customers',status:'not_attempted',note:'Not researched'}]};
  assert.deepEqual(auditBundleLinks(bundle,['customers'],'run_one'),[]);
  bundle.claims[0].verification_status='SUPPORTED';
  assert.ok(auditBundleLinks(bundle,['customers'],'run_one').some(x=>x.includes('approve')));
});
test('provider grammar resolves local references but does not change authoritative schema', () => {
  const schema={type:'object',required:[],properties:{value:{$ref:'#/$defs/value'},collection_coverage:{type:'array',items:{type:'object',properties:{dimension:{type:'string'}}}}},$defs:{value:{type:'string',pattern:'^abc$'}}};
  const original=JSON.stringify(schema);
  const projected=providerBundleSchema(schema,['identity']);
  assert.equal(projected.properties.value.description,'Must match ^abc$');
  assert.equal(projected.properties.collection_coverage.minItems,undefined);
  assert.equal(projected.properties.collection_coverage.items.properties.dimension.enum,undefined);
  assert.match(projected.properties.collection_coverage.items.properties.dimension.description,/exactly once/);
  assert.equal(JSON.stringify(schema),original);
});
test('API grammar simplification never permits missing, duplicate or invented coverage dimensions', () => {
  const bundle={run_id:'run_one',collection_coverage:[{dimension:'identity',status:'not_attempted',note:'Not attempted'},{dimension:'identity',status:'not_attempted',note:'Duplicate'},{dimension:'fake',status:'not_attempted',note:'Invented'}]};
  const errors=auditBundleLinks(bundle,['identity','customers'],'run_one');
  assert.ok(errors.includes('missing dimension: customers'));
  assert.ok(errors.includes('invalid coverage dimension: identity'));
  assert.ok(errors.includes('invalid coverage dimension: fake'));
});
test('records are generated before coverage references', () => {
  const schema={type:'object',required:[],properties:{collection_coverage:{type:'array',items:{type:'object',properties:{dimension:{type:'string'}}}},claims:{type:'array',items:{type:'object'}},entities:{type:'array',items:{type:'object'}}}};
  const keys=Object.keys(providerBundleSchema(schema,['identity']).properties);
  assert.ok(keys.indexOf('claims')<keys.indexOf('collection_coverage'));
  assert.ok(keys.indexOf('entities')<keys.indexOf('claims'));
});
test('relationship and derived references cannot point to missing records', () => {
  const bundle={run_id:'run_one',relationships:[{relationship_id:'r1',subject_entity_id:'missing'}],derived:[{derived_id:'d1',supporting_claim_ids:['missing'],supporting_evidence_ids:['missing']}],observations:[{evidence_ids:['missing']}],collection_coverage:[]};
  const errors=auditBundleLinks(bundle,[],'run_one',[]);
  assert.equal(errors.length,4);
});
test('coverage cannot invent queries the provider never executed', () => {
  const bundle={run_id:'run_one',collection_coverage:[{dimension:'customers',status:'unknown',attempts:['invented query'],record_refs:[]}]};
  assert.ok(auditBundleLinks(bundle,['customers'],'run_one',['actual query']).some(error=>error.includes('execution evidence')));
  bundle.collection_coverage[0].attempts=['actual query'];
  assert.deepEqual(auditBundleLinks(bundle,['customers'],'run_one',['actual query']),[]);
});
