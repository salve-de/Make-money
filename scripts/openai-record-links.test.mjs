import {test} from 'node:test';
import assert from 'node:assert/strict';
import {linkExtractedRecords} from './openai-record-links.mjs';
test('derives references from labels rather than model ordinal numbers and preserves original',()=>{
  const original={claims:[{statement:'fact',dimensions:['revenue'],source_urls:['https://example.org']}],metrics:[{metric_type:'gross_profit',unit:'percent',value:35.2,dimensions:['margin'],source_urls:[]}],coverage:[{dimension:'revenue',status:'found',claim_indexes:[999]},{dimension:'margin',status:'found',metric_indexes:[999]}]};
  const {records,corrections}=linkExtractedRecords(original,['revenue','margin'],new Set(['https://example.org']));
  assert.deepEqual(records.coverage[0].claim_indexes,[0]);
  assert.deepEqual(records.coverage[1].metric_indexes,[0]);
  assert.equal(records.metrics[0].metric_type,'gross_margin');
  assert.equal(original.metrics[0].metric_type,'gross_profit');
  assert.equal(corrections.length,1);
});
test('rejects unsupported dimensions, sources and found without records',()=>{
  const value={claims:[],metrics:[],coverage:[{dimension:'revenue',status:'found'}]};
  assert.throws(()=>linkExtractedRecords(value,['revenue'],new Set()),/FOUND_WITHOUT_RECORD/);
  value.claims=[{dimensions:['revenue'],source_urls:['https://unknown.org']}];
  assert.throws(()=>linkExtractedRecords(value,['revenue'],new Set()),/UNKNOWN_SOURCE_URL/);
  value.claims=[{dimensions:['invented'],source_urls:[]}];
  assert.throws(()=>linkExtractedRecords(value,['revenue'],new Set()),/INVALID_RECORD_DIMENSIONS/);
});
