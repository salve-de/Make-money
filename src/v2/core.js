import { opportunities, signals, services, demands, listings, publicCollections } from "./data.js";

export const APP_VERSION = "3.0.0";
export const STATE_VERSION = 3;

export const clamp = (value,min=0,max=100)=>Math.min(max,Math.max(min,Number(value)||0));
export const sum = values=>values.reduce((total,value)=>total+(Number(value)||0),0);
export const mean = values=>values.length?sum(values)/values.length:0;
export const unique = values=>[...new Set(values.filter(Boolean))];
export const byId = (items,id)=>items.find(item=>item.id===id);
export const bySlug = (items,slug)=>items.find(item=>item.slug===slug);
export const compactNumber = value=>new Intl.NumberFormat("ja-JP",{notation:"compact",maximumFractionDigits:1}).format(Number(value)||0);
export const formatNumber = value=>new Intl.NumberFormat("ja-JP").format(Number(value)||0);
export const formatDate = value=>value?new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"short",day:"numeric"}).format(new Date(value)):"—";
export const formatDateTime = value=>value?new Intl.DateTimeFormat("ja-JP",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(value)):"—";
export const daysUntil = value=>Math.ceil((new Date(value).getTime()-Date.now())/86400000);
export const nowIso = ()=>new Date().toISOString();

export function normalizeText(value=""){
  return String(value).normalize("NFKC").toLocaleLowerCase("ja").replace(/[\s\u3000]+/g," ").trim();
}

export function escapeHTML(value=""){
  return String(value).replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[char]);
}

export function stripControl(value=""){
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"");
}

export function cleanText(value,max=5000){
  return stripControl(String(value??"")).trim().slice(0,max);
}

export function safeExternalUrl(value,{allowExample=true}={}){
  try{
    const url=new URL(String(value));
    if(!["https:","http:"].includes(url.protocol)) return null;
    if(url.username||url.password) return null;
    const host=url.hostname.toLowerCase().replace(/\.$/,"");
    const forbidden=["localhost","0.0.0.0","127.0.0.1","::1"];
    if(forbidden.includes(host)||host.endsWith(".localhost")||host.endsWith(".local")) return null;
    if(/^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) return null;
    if(!allowExample&&host==="example.com") return null;
    url.hash="";
    return url.toString();
  }catch{return null;}
}

export function slugify(value=""){
  const normalized=normalizeText(value).replace(/[^a-z0-9\p{L}\p{N}]+/gu,"-").replace(/^-+|-+$/g,"");
  return normalized.slice(0,80)||`item-${Date.now().toString(36)}`;
}

export function computeOpportunityScore(item){
  const s=item.scores||{};
  return Math.round(clamp(
    clamp(s.evidence)*.25+
    clamp(s.momentum)*.22+
    clamp(s.gap)*.23+
    clamp(s.distribution)*.14+
    clamp(s.feasibility)*.16
  ));
}

export function scoreBreakdown(item){
  const labels={evidence:"金が動いた証拠",momentum:"市場の勢い",gap:"需要の空白",distribution:"顧客獲得経路",feasibility:"実行可能性"};
  const weights={evidence:25,momentum:22,gap:23,distribution:14,feasibility:16};
  return Object.keys(labels).map(key=>({key,label:labels[key],value:clamp(item.scores?.[key]),weight:weights[key],contribution:Math.round(clamp(item.scores?.[key])*weights[key])/100}));
}

export function demandGapScore(demand){
  const want=clamp((Math.log10(Math.max(1,demand.want))/3)*100);
  const pay=clamp((Math.log10(Math.max(1,demand.wouldPay))/2.3)*100);
  const pain=clamp(demand.pain);
  const scarcity=clamp(100-(Number(demand.solutions)||0)*5.5);
  return Math.round(want*.24+pay*.28+pain*.28+scarcity*.20);
}

export function recommendationScore(item,preferences={}){
  let score=computeOpportunityScore(item);
  const categories=preferences.categories||[];
  if(categories.includes(item.category)) score+=12;
  if(preferences.solo&&item.solo) score+=8;
  if(preferences.lowBudget&&/^[0-9３-９]|3〜|2〜|5〜/.test(item.startCost||"")) score+=6;
  if(preferences.japan&&item.region.includes("日本")) score+=7;
  if(preferences.fast&&Number(item.timeToValidate)<=14) score+=6;
  const avoid=preferences.avoid||[];
  if(avoid.includes(item.category)) score-=24;
  return clamp(score,0,120);
}

export function opportunitySearchText(item){
  const relatedSignals=item.signalIds.map(id=>byId(signals,id)).filter(Boolean);
  const relatedDemands=item.demandIds.map(id=>byId(demands,id)).filter(Boolean);
  return normalizeText([
    item.title,item.hook,item.category,item.region,item.stage,item.buyer,item.businessModel,item.whyNow,item.insight,
    ...(item.tags||[]),...(item.entryRoutes||[]),...(item.acquisitionChannels||[]),
    ...relatedSignals.flatMap(s=>[s.headline,s.summary,s.payer,s.receiver]),
    ...relatedDemands.flatMap(d=>[d.title,d.problem,d.payer])
  ].join(" "));
}

export function filterOpportunities(items=opportunities,filters={}){
  const query=normalizeText(filters.query||"");
  const result=items.filter(item=>{
    if(query&&!opportunitySearchText(item).includes(query)) return false;
    if(filters.category&&filters.category!=="all"&&item.category!==filters.category) return false;
    if(filters.region&&filters.region!=="all"&&!item.region.includes(filters.region)) return false;
    if(filters.stage&&filters.stage!=="all"&&item.stage!==filters.stage) return false;
    if(filters.solo&&!item.solo) return false;
    if(filters.lowBudget&&!/[2358]〜|10万円以下/.test(item.startCost||"")) return false;
    if(filters.grade&&filters.grade!=="all"){
      const grades=item.signalIds.map(id=>byId(signals,id)?.grade).filter(Boolean);
      if(!grades.includes(filters.grade)) return false;
    }
    return true;
  });
  return sortOpportunities(result,filters.sort||"recommended",filters.preferences||{});
}

export function sortOpportunities(items,sort="recommended",preferences={}){
  const list=[...items];
  const comparators={
    recommended:(a,b)=>recommendationScore(b,preferences)-recommendationScore(a,preferences),
    score:(a,b)=>computeOpportunityScore(b)-computeOpportunityScore(a),
    momentum:(a,b)=>b.scores.momentum-a.scores.momentum,
    gap:(a,b)=>b.scores.gap-a.scores.gap,
    feasibility:(a,b)=>b.scores.feasibility-a.scores.feasibility,
    saves:(a,b)=>b.stats.saves-a.stats.saves,
    newest:(a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt),
    amount:(a,b)=>{
      const av=Math.max(...a.signalIds.map(id=>byId(signals,id)?.amountValue||0));
      const bv=Math.max(...b.signalIds.map(id=>byId(signals,id)?.amountValue||0));
      return bv-av;
    }
  };
  return list.sort(comparators[sort]||comparators.recommended);
}

export function searchEverything(query,{limit=18}={}){
  const q=normalizeText(query);
  if(!q) return [];
  const groups=[
    ["opportunity",opportunities,item=>[item.title,item.hook,item.category,...item.tags]],
    ["signal",signals,item=>[item.headline,item.summary,item.payer,item.receiver,item.category]],
    ["service",services,item=>[item.name,item.oneLiner,item.category,item.owner,...item.intent]],
    ["demand",demands,item=>[item.title,item.problem,item.payer,item.category]],
    ["listing",listings,item=>[item.title,item.summary,item.region,...item.tags]],
    ["collection",publicCollections,item=>[item.title,item.description,item.ownerName]]
  ];
  return groups.flatMap(([type,items,fields])=>items.map(item=>{
    const text=normalizeText(fields(item).join(" "));
    const title=normalizeText(item.title||item.name||item.headline);
    let score=0;
    if(title===q) score=100;
    else if(title.startsWith(q)) score=80;
    else if(title.includes(q)) score=62;
    else if(text.includes(q)) score=40;
    return {type,item,score};
  })).filter(result=>result.score>0).sort((a,b)=>b.score-a.score).slice(0,limit);
}

export function parseRoute(hash=location.hash){
  const raw=(hash||"#/").replace(/^#/,"")||"/";
  const [pathPart,queryPart=""]=raw.split("?");
  const parts=pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  const query=Object.fromEntries(new URLSearchParams(queryPart));
  if(!parts.length) return {name:"discover",params:{},query,path:"/"};
  const [root,id]=parts;
  const map={
    opportunities:id?"opportunity-detail":"opportunities",signals:id?"signal-detail":"signals",
    services:id?"service-detail":"services",demands:id?"demand-detail":"demands",
    listings:id?"listing-detail":"listings",collections:id?"collection-detail":"collections",
    rankings:"rankings",market:"market","my-goldmine":"my-goldmine",workspace:"workspace",
    dashboard:"dashboard",notifications:"notifications",submit:"submit",pricing:"pricing",
    trust:"trust",account:"account",admin:"admin",search:"search",compare:"compare"
  };
  return {name:map[root]||"not-found",params:{id},query,path:pathPart};
}

export function routeFor(type,item){
  const root={opportunity:"opportunities",signal:"signals",service:"services",demand:"demands",listing:"listings",collection:"collections"}[type];
  return root?`#/${root}/${encodeURIComponent(item.slug)}`:"#/";
}

export function entityFromRoute(route){
  const maps={
    "opportunity-detail":["opportunity",opportunities],"signal-detail":["signal",signals],
    "service-detail":["service",services],"demand-detail":["demand",demands],
    "listing-detail":["listing",listings],"collection-detail":["collection",publicCollections]
  };
  const entry=maps[route.name];
  if(!entry) return null;
  return {type:entry[0],item:bySlug(entry[1],route.params.id)};
}

export function portfolioStats(state){
  const saved=opportunities.filter(item=>state.saved?.includes(item.id));
  const watched=opportunities.filter(item=>state.watched?.includes(item.id));
  return {
    savedCount:saved.length,watchedCount:watched.length,
    averageScore:Math.round(mean(saved.map(computeOpportunityScore))),
    earlyCount:saved.filter(item=>["初期","上昇中"].includes(item.stage)).length,
    payIntent:sum(saved.map(item=>item.stats.wouldPay)),
    buildIntent:sum(saved.map(item=>item.stats.build)),
    categories:unique(saved.map(item=>item.category))
  };
}

export function compareRows(ids){
  const items=ids.map(id=>byId(opportunities,id)).filter(Boolean).slice(0,4);
  const rows=[
    ["総合スコア",item=>computeOpportunityScore(item)],
    ["証拠",item=>item.scores.evidence],["勢い",item=>item.scores.momentum],
    ["需要の空白",item=>item.scores.gap],["実行可能性",item=>item.scores.feasibility],
    ["初期費用",item=>item.startCost],["検証日数",item=>`${item.timeToValidate}日`],
    ["1人適性",item=>item.solo?"高":"チーム推奨"],["支払意思",item=>`${formatNumber(item.stats.wouldPay)}人`],
    ["買い手",item=>item.buyer]
  ];
  return {items,rows:rows.map(([label,get])=>({label,values:items.map(get)}))};
}

export function toCSV(records,columns){
  const escape=value=>`"${String(value??"").replaceAll('"','""')}"`;
  return [columns.map(column=>escape(column.label)).join(","),...records.map(record=>columns.map(column=>escape(typeof column.value==="function"?column.value(record):record[column.value])).join(","))].join("\n");
}

export function downloadText(filename,text,type="text/plain;charset=utf-8"){
  const blob=new Blob([text],{type});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");anchor.href=url;anchor.download=filename;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function readFileText(file,maxBytes=2_000_000){
  if(!file) return Promise.reject(new Error("ファイルがありません"));
  if(file.size>maxBytes) return Promise.reject(new Error("ファイルが大きすぎます"));
  return file.text();
}

export function validateServiceSubmission(input){
  const errors={};
  if(!safeExternalUrl(input.url)) errors.url="https:// または http:// の公開URLを入力してください";
  if(cleanText(input.name,120).length<2) errors.name="サービス名を入力してください";
  if(cleanText(input.oneLiner,240).length<15) errors.oneLiner="誰の何を解決するか、15文字以上で入力してください";
  if(!input.category) errors.category="カテゴリーを選択してください";
  if(input.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email="メールアドレスを確認してください";
  return {valid:!Object.keys(errors).length,errors,value:{
    url:safeExternalUrl(input.url),name:cleanText(input.name,120),oneLiner:cleanText(input.oneLiner,240),
    category:cleanText(input.category,80),pricing:cleanText(input.pricing,120),intent:cleanText(input.intent,120),
    evidence:cleanText(input.evidence,2000),email:cleanText(input.email,254)
  }};
}

export function validateDemandSubmission(input){
  const errors={};
  if(cleanText(input.title,160).length<8) errors.title="需要を8文字以上で具体化してください";
  if(cleanText(input.problem,1500).length<20) errors.problem="困っている過程を20文字以上で入力してください";
  if(!input.payer) errors.payer="誰が困っているかを入力してください";
  if(!input.category) errors.category="カテゴリーを選択してください";
  return {valid:!Object.keys(errors).length,errors,value:{title:cleanText(input.title,160),problem:cleanText(input.problem,1500),payer:cleanText(input.payer,160),wtp:cleanText(input.wtp,120),category:cleanText(input.category,80),source:safeExternalUrl(input.source)||null}};
}

export function validateSignalSubmission(input){
  const errors={};
  if(cleanText(input.headline,180).length<10) errors.headline="何が起きたかを10文字以上で入力してください";
  if(!input.type) errors.type="数字の種類を選択してください";
  if(!input.amount) errors.amount="金額または増加率を入力してください";
  if(!safeExternalUrl(input.source)) errors.source="根拠URLを入力してください";
  return {valid:!Object.keys(errors).length,errors,value:{headline:cleanText(input.headline,180),type:cleanText(input.type,40),amount:cleanText(input.amount,100),payer:cleanText(input.payer,160),receiver:cleanText(input.receiver,160),summary:cleanText(input.summary,1500),source:safeExternalUrl(input.source)}};
}

export function validateListing(input){
  const errors={};
  if(cleanText(input.title,160).length<8) errors.title="募集内容を8文字以上で入力してください";
  if(cleanText(input.summary,1200).length<20) errors.summary="対象・条件・得られるものを20文字以上で入力してください";
  if(!input.type) errors.type="募集種類を選択してください";
  if(input.deadline&&new Date(input.deadline)<new Date(new Date().toDateString())) errors.deadline="未来の日付を指定してください";
  return {valid:!Object.keys(errors).length,errors,value:{title:cleanText(input.title,160),summary:cleanText(input.summary,1200),type:cleanText(input.type,40),reward:cleanText(input.reward,160),slots:clamp(input.slots,1,999),region:cleanText(input.region,80),deadline:input.deadline||null}};
}

export function validateReview(input){
  const errors={};
  const rating=Number(input.rating);
  if(!Number.isInteger(rating)||rating<1||rating>5) errors.rating="1〜5で評価してください";
  if(cleanText(input.title,120).length<4) errors.title="見出しを4文字以上で入力してください";
  if(cleanText(input.body,2000).length<30) errors.body="具体的な利用状況を30文字以上で入力してください";
  return {valid:!Object.keys(errors).length,errors,value:{rating,title:cleanText(input.title,120),body:cleanText(input.body,2000),relationship:cleanText(input.relationship,120)}};
}

export function validateApplication(input){
  const errors={};
  if(cleanText(input.message,1500).length<20) errors.message="応募理由と状況を20文字以上で入力してください";
  if(input.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email="メールアドレスを確認してください";
  return {valid:!Object.keys(errors).length,errors,value:{message:cleanText(input.message,1500),email:cleanText(input.email,254),website:safeExternalUrl(input.website)||null}};
}

export function validateCorrection(input){
  const errors={};
  if(cleanText(input.claim,1000).length<15) errors.claim="誤りと正しい内容を15文字以上で説明してください";
  if(!safeExternalUrl(input.source)) errors.source="訂正を裏付ける根拠URLが必要です";
  return {valid:!Object.keys(errors).length,errors,value:{claim:cleanText(input.claim,1000),source:safeExternalUrl(input.source),contact:cleanText(input.contact,254)}};
}

export function migrateState(raw){
  const input=raw&&typeof raw==="object"?structuredClone(raw):{};
  const base={
    version:STATE_VERSION,onboarding:{done:false,step:0},preferences:{categories:[],solo:false,lowBudget:false,japan:true,fast:false,avoid:[]},
    saved:[],watched:[],compare:[],reactions:{},notes:[],collections:[],collectionFollows:[],submissions:[],
    listings:[],applications:[],reviews:[],helpfulReviews:[],corrections:[],notifications:[],
    profile:{displayName:"",handle:"",role:"member"},newsletter:{subscribed:false,frequency:"weekly"},
    plan:"free",theme:"dark",recent:[],analytics:[],cloud:{lastSync:null,status:"local"}
  };
  const state={...base,...input};
  state.preferences={...base.preferences,...(input.preferences||{})};
  state.profile={...base.profile,...(input.profile||{})};
  state.newsletter={...base.newsletter,...(input.newsletter||{})};
  for(const key of ["saved","watched","compare","notes","collections","collectionFollows","submissions","listings","applications","reviews","helpfulReviews","corrections","notifications","recent","analytics"]){if(!Array.isArray(state[key]))state[key]=[];}
  if(!state.reactions||typeof state.reactions!=="object")state.reactions={};
  state.saved=unique(state.saved).filter(id=>byId(opportunities,id));
  state.watched=unique(state.watched).filter(id=>byId(opportunities,id));
  state.compare=unique(state.compare).filter(id=>byId(opportunities,id)).slice(0,4);
  state.version=STATE_VERSION;
  return state;
}

export function analyticsEvent(name,properties={}){
  return {id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,name,properties,occurredAt:nowIso()};
}

export function stableHash(value=""){
  let hash=2166136261;
  for(const char of String(value)){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(36);
}
