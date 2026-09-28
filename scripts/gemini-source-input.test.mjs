import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSourceInput,buildSourcePrompt} from './gemini-source-input.mjs';

const source={source_id:'src.test',status:'active',provider_url:'https://example.org/',rights_policy_ids:['rights.test']};
const policy={policy_id:'rights.test',source_id:'src.test',status:'approved',decisions:{ai_processing:'allowed',retention:'allowed',private_raw_storage:'restricted'}};
const row={evidence_id:'ev_0123456789abcdef01234567',source_id:'src.test',rights_policy_id:'rights.test',rights_status:'restricted_private_raw',source_url:'https://example.org/report/one',content_type:'text/plain',body_base64:Buffer.from('Independent source facts').toString('base64')};
const scopes=[{source,policy,allowed_host_suffixes:['example.org'],allowed_path_prefixes:['/report/']}];
const request=r=>({raw_evidence:[r],bundle:{evidence:[{...r}]}});
const prepare=(r=row,p=policy)=>prepareSourceInput(request(r),[source],[p],scopes);
test('uses existing raw envelope and fingerprints exact bytes and policy',()=>{
  const [result]=prepare();assert.equal(result.text,'Independent source facts');assert.match(result.raw_sha256,/^[a-f0-9]{64}$/);assert.match(result.policy_sha256,/^[a-f0-9]{64}$/);
});
test('missing raw or duplicate identity stops before paid call',()=>{
  assert.throws(()=>prepareSourceInput({raw_evidence:[]},[],[]),/RAW_EVIDENCE_REQUIRED/);
  assert.throws(()=>prepareSourceInput({...request(row),raw_evidence:[row,row]},[source],[policy],scopes),/EVIDENCE_ID_INVALID/);
});
test('pending rights and denied AI/retention cannot be supplied by model',()=>{
  assert.throws(()=>prepare(row,{...policy,status:'pending_review'}),/CANONICAL_SOURCE_POLICY_REQUIRED/);
  for(const field of ['ai_processing','retention','private_raw_storage']) assert.throws(()=>prepare(row,{...policy,decisions:{...policy.decisions,[field]:'blocked'}}),/SOURCE_USE_NOT_ADMITTED/);
});
test('reject unregistered hosts, embedded credentials, binary and invalid base64',()=>{
  for(const source_url of ['https://example.org.evil.test/a','http://example.org/a','https://secret@example.org/a','https://example.org/outside']) assert.throws(()=>prepare({...row,source_url}),/SOURCE_URL_OUTSIDE_REGISTRY/);
  assert.throws(()=>prepare({...row,content_type:'application/pdf'}),/SOURCE_TEXT_EXTRACTION_REQUIRED/);
  assert.throws(()=>prepare({...row,body_base64:'bad!'}),/RAW_BODY_INVALID/);
});
test('scope includes all supplied documents and dimensions without self-verification',()=>{
  const prompt=buildSourcePrompt({runId:'run_test',subject:'Example',documents:[{path:'scope.md',content:'Broad nonfinancial research'}],schema:{type:'object'},dimensions:['customers','competition','costs'],sources:prepare()});
  for(const text of ['Broad nonfinancial research','competition','UNVERIFIED','not_attempted',`read:${row.evidence_id}`]) assert.ok(prompt.includes(text));
});
test('fresh evidence is accepted but identity binding and saved hash cannot drift',()=>{
  assert.throws(()=>prepare({...row,evidence_id:'ev_test'}),/EVIDENCE_ID_INVALID/);
  assert.throws(()=>prepareSourceInput({raw_evidence:[row],bundle:{evidence:[]}},[source],[policy],scopes),/EVIDENCE_BINDING_INVALID/);
  const input=request(row);input.bundle.evidence[0].raw_storage={sha256:'0'.repeat(64)};
  assert.throws(()=>prepareSourceInput(input,[source],[policy],scopes),/SOURCE_HASH_MISMATCH/);
});
test('textual HTML CSV and XML remain intact without executing or losing tables',()=>{
  for(const content_type of ['text/html','text/csv','application/xml']){
    const text='<table><tr><td>100</td><td>USD</td></tr></table>';
    assert.equal(prepare({...row,content_type,body_base64:Buffer.from(text).toString('base64')})[0].text,text);
  }
});
