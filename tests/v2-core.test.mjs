import test from "node:test";
import assert from "node:assert/strict";
import { opportunities, demands } from "../src/v2/data.js";
import { computeOpportunityScore, demandGapScore, filterOpportunities, migrateState, normalizeText, parseRoute, recommendationScore, safeExternalUrl, searchEverything, validateApplication, validateCorrection, validateDemandSubmission, validateListing, validateReview, validateServiceSubmission, validateSignalSubmission } from "../src/v2/core.js";

test("opportunity scores are deterministic and remain public 0-100",()=>{
  for(const item of opportunities){
    const first=computeOpportunityScore(item),second=computeOpportunityScore(structuredClone(item));
    assert.equal(first,second);assert.ok(first>=0&&first<=100);
  }
});

test("demand gap score rewards pain, payment intent and scarcity",()=>{
  for(const demand of demands)assert.ok(demandGapScore(demand)>=0&&demandGapScore(demand)<=100);
  const strong={want:600,wouldPay:180,pain:95,solutions:2};
  const weak={want:20,wouldPay:2,pain:30,solutions:30};
  assert.ok(demandGapScore(strong)>demandGapScore(weak));
});

test("Japanese normalization and search work across connected data",()=>{
  assert.equal(normalizeText(" ＡＩ　検索 "),"ai 検索");
  const results=searchEverything("請求書");
  assert.ok(results.some(result=>result.type==="opportunity"));
  assert.ok(results.some(result=>result.type==="demand"));
});

test("filters do not mutate source and personalize matching categories",()=>{
  const before=opportunities.map(item=>item.id);
  const result=filterOpportunities(opportunities,{category:"AI・自動化",preferences:{categories:["AI・自動化"],solo:true}});
  assert.ok(result.length>0);assert.deepEqual(opportunities.map(item=>item.id),before);
  assert.ok(recommendationScore(result[0],{categories:[result[0].category]})>=computeOpportunityScore(result[0]));
});

test("hash routes parse database and detail pages",()=>{
  assert.deepEqual(parseRoute("#/opportunities?category=AI%E3%83%BB%E8%87%AA%E5%8B%95%E5%8C%96").name,"opportunities");
  const detail=parseRoute("#/services/answer-radar");assert.equal(detail.name,"service-detail");assert.equal(detail.params.id,"answer-radar");
});

test("URL safety rejects private and credentialed hosts",()=>{
  assert.ok(safeExternalUrl("https://example.com/path"));
  assert.equal(safeExternalUrl("javascript:alert(1)"),null);
  assert.equal(safeExternalUrl("http://localhost/admin"),null);
  assert.equal(safeExternalUrl("http://127.0.0.1:5432"),null);
  assert.equal(safeExternalUrl("http://192.168.1.2"),null);
  assert.equal(safeExternalUrl("https://user:pass@example.com"),null);
});

test("service submissions require public URL and concrete problem",()=>{
  assert.equal(validateServiceSubmission({url:"http://localhost",name:"x",oneLiner:"短い",category:"",email:"bad"}).valid,false);
  assert.equal(validateServiceSubmission({url:"https://product.example.com",name:"Example",oneLiner:"小規模事業者の請求書整理を自動化する",category:"AI・自動化",email:"team@example.com"}).valid,true);
});

test("all public contribution forms reject incomplete data",()=>{
  assert.equal(validateDemandSubmission({title:"短い",problem:"短い",payer:"",category:""}).valid,false);
  assert.equal(validateSignalSubmission({headline:"短い",type:"",amount:"",source:"bad"}).valid,false);
  assert.equal(validateListing({title:"短い",summary:"短い",type:""}).valid,false);
  assert.equal(validateReview({rating:0,title:"x",body:"short"}).valid,false);
  assert.equal(validateApplication({message:"short",email:"bad"}).valid,false);
  assert.equal(validateCorrection({claim:"short",source:"bad"}).valid,false);
});

test("state migration removes unknown ids and limits compare",()=>{
  const state=migrateState({saved:[opportunities[0].id,"missing"],watched:["missing"],compare:[...opportunities.slice(0,5).map(i=>i.id)],preferences:null});
  assert.deepEqual(state.saved,[opportunities[0].id]);assert.deepEqual(state.watched,[]);assert.equal(state.compare.length,4);assert.equal(state.version,3);
});
