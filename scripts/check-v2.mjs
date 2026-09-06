import fs from "node:fs";
import path from "node:path";
import { opportunities, signals, services, demands, listings, publicCollections, sources } from "../src/v2/data.js";
import { computeOpportunityScore, demandGapScore, safeExternalUrl } from "../src/v2/core.js";

const fail=message=>{throw new Error(message);};
const unique=(items,label)=>{
  const ids=new Set(),slugs=new Set();
  for(const item of items){
    if(!item.id)fail(`${label}: missing id`);if(ids.has(item.id))fail(`${label}: duplicate id ${item.id}`);ids.add(item.id);
    if(item.slug){if(slugs.has(item.slug))fail(`${label}: duplicate slug ${item.slug}`);slugs.add(item.slug);}
  }
};
unique(opportunities,"opportunities");unique(signals,"signals");unique(services,"services");unique(demands,"demands");unique(listings,"listings");unique(publicCollections,"collections");unique(sources,"sources");

const signalIds=new Set(signals.map(i=>i.id)),serviceIds=new Set(services.map(i=>i.id)),demandIds=new Set(demands.map(i=>i.id)),opportunityIds=new Set(opportunities.map(i=>i.id)),sourceIds=new Set(sources.map(i=>i.id));
for(const item of opportunities){
  if(!item.signalIds.length)fail(`${item.id}: no signal`);if(!item.demandIds.length)fail(`${item.id}: no demand`);
  for(const id of item.signalIds)if(!signalIds.has(id))fail(`${item.id}: unknown signal ${id}`);
  for(const id of item.serviceIds)if(!serviceIds.has(id))fail(`${item.id}: unknown service ${id}`);
  for(const id of item.demandIds)if(!demandIds.has(id))fail(`${item.id}: unknown demand ${id}`);
  const score=computeOpportunityScore(item);if(score<0||score>100)fail(`${item.id}: invalid score ${score}`);
  if(item.nextSteps.length<3)fail(`${item.id}: fewer than 3 next steps`);
  if(item.risks.length<2)fail(`${item.id}: insufficient risk disclosure`);
}
for(const signal of signals){
  for(const id of signal.opportunityIds)if(!opportunityIds.has(id))fail(`${signal.id}: unknown opportunity ${id}`);
  for(const id of signal.sourceIds)if(!sourceIds.has(id))fail(`${signal.id}: unknown source ${id}`);
  if(!["A","B","C","D"].includes(signal.grade))fail(`${signal.id}: invalid evidence grade`);
}
for(const service of services){
  if(!safeExternalUrl(service.url))fail(`${service.id}: unsafe URL`);
  for(const id of service.opportunityIds)if(!opportunityIds.has(id))fail(`${service.id}: unknown opportunity ${id}`);
  for(const id of service.demandIds)if(!demandIds.has(id))fail(`${service.id}: unknown demand ${id}`);
}
for(const demand of demands){
  if(demandGapScore(demand)<0||demandGapScore(demand)>100)fail(`${demand.id}: invalid gap score`);
  for(const id of demand.opportunityIds)if(!opportunityIds.has(id))fail(`${demand.id}: unknown opportunity ${id}`);
}
for(const listing of listings)if(listing.serviceId&&!serviceIds.has(listing.serviceId))fail(`${listing.id}: unknown service`);
for(const collection of publicCollections)for(const id of collection.opportunityIds)if(!opportunityIds.has(id))fail(`${collection.id}: unknown opportunity ${id}`);

const required=["index.html","styles/v2.css","src/v2/app.js","src/v2/core.js","src/v2/store.js","src/v2/cloud.js","src/v2/components.js","supabase/migrations/002_platform_complete.sql"];
for(const file of required)if(!fs.existsSync(path.resolve(file)))fail(`missing required file ${file}`);
const index=fs.readFileSync("index.html","utf8");
if(!index.includes('src/v2/app.js'))fail("index does not load v2 app");
if(!index.includes('styles/v2.css'))fail("index does not load v2 styles");
const app=fs.readFileSync("src/v2/app.js","utf8");
if(!app.includes("bootstrapCloud"))fail("cloud bootstrap missing");
if(!app.includes("validateServiceSubmission"))fail("submission validation missing");
const css=fs.readFileSync("styles/v2.css","utf8");
if(!css.includes("prefers-reduced-motion"))fail("reduced motion support missing");
if(!css.includes(":focus-visible"))fail("focus visibility missing");

console.log(`V2 validated: ${opportunities.length} opportunities, ${signals.length} signals, ${services.length} services, ${demands.length} demands, ${listings.length} listings.`);
