import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveApprovedSource,bindApprovedSources} from './openai-source-policy-binding.mjs';
const snapshot=JSON.parse(readFileSync(new URL('../data/foundation-public-rights-snapshot.json',import.meta.url)));
const url='https://www.sec.gov/Archives/edgar/data/24545/report.pdf';
test('uses only existing pinned host/path contract, not blanket web permission',()=>{
  assert.equal(resolveApprovedSource(url,snapshot)?.source.source_id,'src.sec-edgar');
  for(const u of ['https://sec.gov.evil.test/Archives/edgar/a','https://sec.gov/news/a','http://sec.gov/Archives/edgar/a','https://fever-tree.com/'])assert.equal(resolveApprovedSource(u,snapshot),null);
});
test('restricted and ambiguous policies do not resolve',()=>{
  const s=structuredClone(snapshot);s.records=s.records.filter(r=>r.source.source_id==='src.sec-edgar');
  s.records[0].policy.status='restricted';assert.equal(resolveApprovedSource(url,s),null);
  s.records[0].policy.status='approved';s.records.push(structuredClone(s.records[0]));assert.equal(resolveApprovedSource(url,s),null);
});
test('binding preserves facts, original input, pending peers and write prohibition',()=>{
  const input={write_authorized:false,bundle:{sources:[],claims:[{verification_status:'UNVERIFIED'}],evidence:[{evidence_id:'a',source_id:'candidate',source_url:url,rights_status:'pending_review',rights_policy_id:null,raw_storage:{status:'not_attempted'}},{evidence_id:'b',source_url:'https://fever-tree.com/',rights_status:'pending_review'}]}};
  const {request,changes}=bindApprovedSources(input,snapshot);
  assert.equal(changes.length,1);assert.equal(input.bundle.evidence[0].source_id,'candidate');
  assert.deepEqual(request.bundle.claims,input.bundle.claims);assert.deepEqual(request.bundle.evidence[1],input.bundle.evidence[1]);
  assert.equal(request.write_authorized,false);assert.equal(request.bundle.evidence[0].raw_storage.status,'not_attempted');
  assert.equal(bindApprovedSources(request,snapshot).changes.length,0);
});
