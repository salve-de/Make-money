import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, content) => { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, content); };
const remove = (file) => { const target = path.join(root, file); if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true }); };
const patch = (file, transform) => { const before = read(file); const after = transform(before); if (after === before) console.log(`No patch needed: ${file}`); else { write(file, after); console.log(`Patched: ${file}`); } };
const replace = (source, needle, replacement, label) => {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) throw new Error(`Patch target missing: ${label}`);
  return source.replace(needle, replacement);
};

patch("src/v2/app.js", (source) => {
  let next = source;
  next = replace(next, "import { downloadText,", "import { byId, downloadText,", "app byId import");
  next = next.replace('  if(action==="toggle-save"){', '  if(action==="open-collection-picker")return showCollectionPicker(id);\n  if(action==="toggle-save"){');
  next = next.replace(
    '  if(action==="react"){store.toggleReaction(id,button.dataset.kind);if(cloud.configured&&cloud.user)cloud.submitReaction(id,button.dataset.kind,Boolean(store.getState().reactions[`${id}:${button.dataset.kind}`])).catch(()=>null);return;}',
    '  if(action==="react"){store.toggleReaction(id,button.dataset.kind);if(cloud.configured&&cloud.user)cloud.submitReaction(id,button.dataset.kind,Boolean(store.getState().reactions[`${id}:${button.dataset.kind}`])).catch(()=>null);return;}\n  if(action==="react-demand"){const target=`demand:${id}`;store.toggleReaction(target,button.dataset.kind);if(cloud.configured&&cloud.user)cloud.submitDemandReaction(id,button.dataset.kind,Boolean(store.getState().reactions[`${target}:${button.dataset.kind}`])).catch(()=>null);return;}',
  );
  next = next.replace(
    '  if(action==="review-helpful")return store.toggleReviewHelpful(id);',
    '  if(action==="review-helpful"){const active=store.toggleReviewHelpful(id);if(cloud.configured&&cloud.user)cloud.toggleReviewHelpful(id).catch(()=>null);return active;}',
  );
  next = next.replace(
    '    form.addEventListener("change",()=>updateFilterFromForm(form),{once:true});\n    const input=form.elements.query;input?.addEventListener("input",()=>{clearTimeout(searchDebounce);searchDebounce=setTimeout(()=>updateFilterFromForm(form),260);},{once:true});',
    '    form.addEventListener("change",()=>updateFilterFromForm(form));',
  );
  next = next.replace(
    '    if(id){store.updateListing(id,{...result.value,serviceId:input.serviceId,tags:input.tags});toast("募集を更新しました。");}\n  else{store.createListing({...result.value,serviceId:input.serviceId,tags:input.tags});toast("募集を審査へ送りました。",{title:"作成完了"});}',
    '    if(id){store.updateListing(id,{...result.value,serviceId:input.serviceId,tags:input.tags});toast("募集を更新しました。");}\n  else{const created=store.createListing({...result.value,serviceId:input.serviceId,tags:input.tags});if(cloud.configured&&cloud.user)await cloud.createListing(created).catch(error=>toast(error.message,{tone:"error"}));toast("募集を審査へ送りました。",{title:"作成完了"});}',
  );
  next = next.replace(
    'function findModerationItem(id,type){\n  const state=store.getState();return type==="submission"?state.submissions.find(i=>i.id===id):type==="review"?state.reviews.find(i=>i.id===id):type==="correction"?state.corrections.find(i=>i.id===id):state.listings.find(i=>i.id===id);\n}\nfunction moderateItem(id,type,status){\n  store.update(draft=>{\n    const key=type==="submission"?"submissions":type==="review"?"reviews":type==="correction"?"corrections":"listings";\n    draft[key]=draft[key].map(item=>item.id===id?{...item,status:type==="listing"&&status==="approved"?"open":status,reviewedAt:new Date().toISOString()}:item);return draft;\n  },{type:"moderated",id,status});\n  store.track("moderation_action",{id,type,status});closeModal();toast(status==="approved"?"公開状態へ更新しました。":"審査結果を保存しました。",{title:"審査完了"});render();\n}',
    'function findModerationItem(id,type){\n  const state=store.getState();return state.adminQueue.find(i=>i.id===id&&i.queueType===type)||(type==="submission"?state.submissions.find(i=>i.id===id):type==="review"?state.reviews.find(i=>i.id===id):type==="correction"?state.corrections.find(i=>i.id===id):state.listings.find(i=>i.id===id));\n}\nasync function moderateItem(id,type,status){\n  const item=findModerationItem(id,type);\n  if(item?.cloud&&cloud.configured&&cloud.user)await cloud.moderateQueueItem(item,status);\n  store.update(draft=>{\n    draft.adminQueue=draft.adminQueue.map(entry=>entry.id===id&&entry.queueType===type?{...entry,status}:entry);\n    const key=type==="submission"?"submissions":type==="review"?"reviews":type==="correction"?"corrections":type==="listing"?"listings":null;\n    if(key)draft[key]=draft[key].map(entry=>entry.id===id?{...entry,status:type==="listing"&&status==="approved"?"open":status,reviewedAt:new Date().toISOString()}:entry);return draft;\n  },{type:"moderated",id,status});\n  store.track("moderation_action",{id,type,status});closeModal();toast(status==="approved"?"公開状態へ更新しました。":"審査結果を保存しました。",{title:"審査完了"});render();\n}',
  );
  return next;
});

patch("src/v2/components.js", (source) => {
  let next = source.replace(
    'escapeHTML(title||tone==="error"?"エラー":"完了")',
    'escapeHTML(title || (tone === "error" ? "エラー" : "完了"))',
  );
  next = next.replace(
    '<button class="icon-button" data-action="toggle-compare" data-id="${item.id}" aria-label="比較" title="比較">${icon("compare",17,compared?"gold":"")}</button>',
    '<button class="icon-button" data-action="open-collection-picker" data-id="${item.id}" aria-label="コレクションへ追加" title="コレクションへ追加">${icon("collection",17)}</button><button class="icon-button" data-action="toggle-compare" data-id="${item.id}" aria-label="比較" title="比較">${icon("compare",17,compared?"gold":"")}</button>',
  );
  const start = next.indexOf("export function demandCard(demand){");
  const end = next.indexOf("\nexport function listingCard", start);
  if (start < 0 || end < 0) throw new Error("demandCard block missing");
  const replacement = `export function demandCard(demand){
  const score=demandGapScore(demand),state=store.getState();
  const want=Boolean(state.reactions[\`demand:\${demand.id}:want\`]),pay=Boolean(state.reactions[\`demand:\${demand.id}:would_pay\`]);
  return \`<article class="card card-pad card-hover"><div class="card-top"><div>\${evidenceBadge(demand.grade,true)} \${badge(demand.category)}</div>\${scorePill(score,"需要の空白")}</div><a href="#/demands/\${encodeURIComponent(demand.slug)}"><h3 class="card-title">\${escapeHTML(demand.title)}</h3></a><p class="card-copy">\${escapeHTML(demand.problem)}</p><div class="metric-grid" style="grid-template-columns:repeat(3,1fr);margin-top:14px"><div class="metric"><label>欲しい</label><strong>\${formatNumber(demand.want+(want?1:0))}</strong><div class="meter"><span style="--value:\${Math.min(100,demand.want/7)}%"></span></div></div><div class="metric"><label>支払意思</label><strong>\${formatNumber(demand.wouldPay+(pay?1:0))}</strong><div class="meter"><span style="--value:\${Math.min(100,demand.wouldPay/1.5)}%"></span></div></div><div class="metric"><label>既存解決</label><strong>\${demand.solutions}</strong><div class="meter"><span style="--value:\${Math.max(8,100-demand.solutions*6)}%"></span></div></div></div><div class="reaction-row" style="margin-top:12px"><button class="reaction \${want?"active":""}" data-action="react-demand" data-kind="want" data-id="\${demand.id}">欲しい</button><button class="reaction \${pay?"active":""}" data-action="react-demand" data-kind="would_pay" data-id="\${demand.id}">金を払ってもよい</button></div><div class="card-footer"><span class="muted">想定価格 \${escapeHTML(demand.wtp)}</span><a class="text-link" href="#/demands/\${encodeURIComponent(demand.slug)}">機会を見る</a></div></article>\`;
}
`;
  next = `${next.slice(0, start)}${replacement}${next.slice(end + 1)}`;
  return next;
});

patch("src/v2/pages/detail.js", (source) => source.replace(
  '<button class="btn btn-primary" data-action="toggle-save" data-id="${item.id}">${icon("bookmark",17)} ${saved?"保存済み":"MY GOLDMINEへ保存"}</button><button class="btn" data-action="toggle-watch"',
  '<button class="btn btn-primary" data-action="toggle-save" data-id="${item.id}">${icon("bookmark",17)} ${saved?"保存済み":"MY GOLDMINEへ保存"}</button><button class="btn" data-action="open-collection-picker" data-id="${item.id}">${icon("collection",17)} リストへ追加</button><button class="btn" data-action="toggle-watch"',
));

patch("src/v2/store.js", (source) => {
  let next = source.replace(
    'submissions:[],\n    listings:',
    'submissions:[],adminQueue:[],\n    listings:',
  );
  next = next.replace(
    '"submissions","listings","applications"',
    '"submissions","adminQueue","listings","applications"',
  );
  return next;
});

patch("src/v2/core.js", (source) => source.replace(
  '  state.saved=unique(state.saved).filter(id=>byId(opportunities,id));\n  state.watched=unique(state.watched).filter(id=>byId(opportunities,id));\n  state.compare=unique(state.compare).filter(id=>byId(opportunities,id)).slice(0,4);',
  '  state.saved=unique(state.saved);\n  state.watched=unique(state.watched);\n  state.compare=unique(state.compare).slice(0,4);',
));

patch("src/v2/pages/admin.js", (source) => source.replace(
  '  return [\n    ...state.submissions',
  '  return [\n    ...state.adminQueue,\n    ...state.submissions',
));

patch("supabase/functions/_shared/security.ts", (source) => {
  if (source.includes("export async function hmacToken")) return source;
  const marker = "export function cleanHeaderText";
  const addition = `export async function hmacToken(value: string, secret: string): Promise<string> {
  if (!secret) throw new HttpError(500, "token_secret_missing", "トークン秘密鍵が設定されていません。");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

`;
  if (!source.includes(marker)) throw new Error("security marker missing");
  return source.replace(marker, addition + marker);
});

patch("supabase/functions/newsletter-subscribe/index.ts", (source) => {
  let next = source.replace('import { randomToken, sha256 }', 'import { hmacToken, randomToken, sha256 }');
  next = next.replace(
    '    const confirmationToken = randomToken(32);\n    const unsubscribeToken = randomToken(32);\n    const record = {',
    '    const confirmationToken = randomToken(32);\n    const tokenSecret = Deno.env.get("NEWSLETTER_TOKEN_SECRET")?.trim();\n    if (!tokenSecret) throw new HttpError(503, "token_secret_missing", "NEWSLETTER_TOKEN_SECRETが設定されていません。");\n    const subscriptionId = existing?.id ?? crypto.randomUUID();\n    const unsubscribeToken = await hmacToken(subscriptionId, tokenSecret);\n    const record = {',
  );
  next = next.replace('    let subscriptionId = existing?.id ?? null;\n', '');
  next = next.replace(
    '      const { data, error } = await admin.from("newsletter_subscriptions").insert(record).select("id").single();\n      if (error) throw error;\n      subscriptionId = data.id;',
    '      const { error } = await admin.from("newsletter_subscriptions").insert({ id: subscriptionId, ...record });\n      if (error) throw error;',
  );
  return next;
});

patch("src/v2/cloud.js", (source) => {
  let next = source;
  if (!next.includes('from "./live-data.js"')) next = next.replace('import { safeExternalUrl } from "./core.js";', 'import { safeExternalUrl } from "./core.js";\nimport { applyLiveDataset } from "./live-data.js";');
  next = next.replace(/  async fetchPublished\(\)\{[\s\S]*?\n  \},\n  async syncPersonalState/, `  async fetchPublished(){
    const [opportunities,signals,products,demands,listings,collections,opportunitySignals,opportunityDemands,opportunityProducts,productDemands,signalSources,sources,collectionItems]=await Promise.all([
      rest("organic_ranked_opportunities?select=*&order=organic_score.desc",{auth:false}),
      rest("public_money_signals?select=*&order=published_at.desc",{auth:false}),
      rest("public_products?select=*&order=published_at.desc",{auth:false}),
      rest("public_demands?select=*&order=published_at.desc",{auth:false}),
      rest("public_listings?select=*&order=published_at.desc",{auth:false}),
      rest("public_collections?select=*&order=updated_at.desc",{auth:false}),
      rest("opportunity_signals?select=opportunity_id,signal_id,relation",{auth:false}),
      rest("opportunity_demands?select=opportunity_id,demand_id",{auth:false}),
      rest("opportunity_products?select=opportunity_id,product_id,relation",{auth:false}),
      rest("product_demands?select=product_id,demand_id,relation",{auth:false}),
      rest("signal_sources?select=signal_id,source_id,is_primary",{auth:false}),
      rest("sources?select=*&status=eq.accepted",{auth:false}),
      rest("public_collection_items?select=*",{auth:false})
    ]);
    return {opportunities,signals,products,demands,listings,collections,opportunitySignals,opportunityDemands,opportunityProducts,productDemands,signalSources,sources,collectionItems};
  },
  async fetchModerationQueue(){
    const [submissions,reviews,corrections,listings,claims]=await Promise.all([
      rest("submissions?select=*&status=in.(pending,in_review,needs_changes)&order=created_at.asc"),
      rest("reviews?select=*&status=in.(pending,in_review)&order=created_at.asc"),
      rest("correction_requests?select=*&status=in.(pending,in_review,needs_changes)&order=created_at.asc"),
      rest("listings?select=*&status=eq.pending&order=created_at.asc"),
      rest("product_claims?select=*&status=eq.pending&order=created_at.asc")
    ]);
    return [
      ...submissions.map(item=>({...item,id:item.id,cloud:true,queueType:"submission",type:item.submission_type,title:item.payload?.name||item.payload?.title||item.payload?.headline||item.submission_type,summary:item.payload?.oneLiner||item.payload?.problem||item.payload?.summary||""})),
      ...reviews.map(item=>({...item,cloud:true,queueType:"review",type:"review",title:item.title,summary:item.body,payload:item})),
      ...corrections.map(item=>({...item,cloud:true,queueType:"correction",type:"correction",title:\`訂正: \${item.entity_type}\`,summary:item.claim,payload:item})),
      ...listings.map(item=>({...item,cloud:true,queueType:"listing",type:"listing",title:item.title,summary:item.summary,payload:item})),
      ...claims.map(item=>({...item,cloud:true,queueType:"claim",type:"claim",title:"サービス所有者Claim",summary:item.method,payload:item}))
    ];
  },
  async syncPersonalState`);
  next = next.replace(
    '        rpc("sync_local_reactions",{p_saved:state.saved,p_watched:state.watched,p_reactions:state.reactions}),',
    '        rpc("sync_local_reactions",{p_saved:state.saved,p_watched:state.watched,p_reactions:state.reactions}),\n        rpc("sync_demand_reactions",{p_reactions:state.reactions}),',
  );
  next = next.replace(
    '    const [profile,preferences,reactions,notes,collections,notifications,subscription]=await Promise.all([',
    '    const [profile,preferences,reactions,demandReactions,notes,collections,notifications,subscription]=await Promise.all([',
  );
  next = next.replace(
    '      rest(`profiles?select=*&id=eq.${user.id}&limit=1`),rest("user_preferences?select=*&limit=1"),\n      rest("reactions?select=opportunity_id,kind,active&active=eq.true"),rest("research_notes?select=*&order=updated_at.desc"),',
    '      rest(`profiles?select=*&id=eq.${user.id}&limit=1`),rest("user_preferences?select=*&limit=1"),\n      rest("reactions?select=opportunity_id,kind,active&active=eq.true"),rest("demand_reactions?select=demand_id,kind,active&active=eq.true"),rest("research_notes?select=*&order=updated_at.desc"),',
  );
  next = next.replace(
    '    patch.reactions=Object.fromEntries(reactions.filter(r=>!["save","watch"].includes(r.kind)).map(r=>[`${r.opportunity_id}:${r.kind}`,true]));',
    '    patch.reactions={...Object.fromEntries(reactions.filter(r=>!["save","watch"].includes(r.kind)).map(r=>[`${r.opportunity_id}:${r.kind}`,true])),...Object.fromEntries(demandReactions.map(r=>[`demand:${r.demand_id}:${r.kind}`,true]))};',
  );
  next = next.replace(
    '  async submitReaction(opportunityId,kind,active=true){return rpc("set_reaction",{p_opportunity_id:opportunityId,p_kind:kind,p_active:active});},',
    '  async submitReaction(opportunityId,kind,active=true){return rpc("set_reaction",{p_opportunity_id:opportunityId,p_kind:kind,p_active:active});},\n  async submitDemandReaction(demandId,kind,active=true){return rpc("set_demand_reaction",{p_demand_id:demandId,p_kind:kind,p_active:active});},\n  async toggleReviewHelpful(reviewId){return rpc("toggle_review_helpful",{p_review_id:reviewId});},\n  async createListing(payload){const user=currentUser();if(!user)throw new Error("ログインしてください");return rest("listings",{method:"POST",body:{owner_id:user.id,product_id:payload.serviceId||null,slug:payload.slug,listing_type:payload.type,title:payload.title,summary:payload.summary,reward:payload.reward,region:payload.region,tags:payload.tags||[],slots:payload.slots,deadline:payload.deadline,status:"pending",client_id:payload.id}});},\n  async moderateQueueItem(item,status){\n    if(item.queueType==="submission")return rpc("materialize_submission",{p_submission_id:item.id,p_action:status,p_notes:null});\n    if(item.queueType==="claim")return rpc("review_product_claim",{p_claim_id:item.id,p_status:status==="approved"?"verified":"rejected",p_notes:null});\n    if(item.queueType==="review")return rest(`reviews?id=eq.${item.id}`,{method:"PATCH",body:{status:status==="approved"?"published":"rejected",reviewed_at:new Date().toISOString()}});\n    if(item.queueType==="correction")return rest(`correction_requests?id=eq.${item.id}`,{method:"PATCH",body:{status,reviewed_at:new Date().toISOString()}});\n    if(item.queueType==="listing")return rest(`listings?id=eq.${item.id}`,{method:"PATCH",body:{status:status==="approved"?"open":"rejected",published_at:status==="approved"?new Date().toISOString():null}});\n  },',
  );
  next = next.replace(/export async function bootstrapCloud\(\)\{[\s\S]*?\n\}/, `export async function bootstrapCloud(){
  if(!config.configured){store.setCloudStatus("local");return {mode:"local",configured:false,user:null};}
  try{
    await cloud.consumeAuthRedirect();
    let liveCounts=null;
    try{liveCounts=applyLiveDataset(await cloud.fetchPublished());}catch(error){console.warn("Live public data unavailable; demo fallback remains",error);}
    const user=await cloud.getUser().catch(()=>null);
    if(user){
      session.user=user;saveSession(session);await cloud.hydratePersonalState().catch(error=>console.warn("Personal hydrate failed",error));
      if(["moderator","editor","admin"].includes(store.getState().profile.role)){
        const queue=await cloud.fetchModerationQueue().catch(()=>[]);
        store.update(draft=>{draft.adminQueue=queue;return draft;},{type:"admin-queue"});
      }
    }
    store.setCloudStatus(user?"synced":"configured",user?new Date().toISOString():null);
    return {mode:user?"cloud":"configured",configured:true,user,liveCounts};
  }catch(error){store.setCloudStatus("error");return {mode:"error",configured:true,user:null,error};}
}`);
  return next;
});

patch("supabase/migrations/002_platform_complete.sql", (source) => source.replace(
  '  ) as organic_score,\n  coalesce(r.save_count, 0) as save_count,\n  coalesce(r.want_count, 0) as want_count,\n  coalesce(r.build_count, 0) as build_count',
  '  ) as organic_score',
));

patch("supabase/migrations/004_runtime_content.sql", (source) => {
  if (source.includes("sync_demand_reactions")) return source;
  return `${source}\n\ncreate or replace function public.sync_demand_reactions(p_reactions jsonb default '{}'::jsonb)\nreturns void\nlanguage plpgsql\nsecurity definer\nset search_path=public\nas $$\ndeclare key text; active_text text; parts text[];\nbegin\n  if auth.uid() is null then raise exception 'authentication required'; end if;\n  for key,active_text in select * from jsonb_each_text(coalesce(p_reactions,'{}'::jsonb)) loop\n    parts:=string_to_array(key,':');\n    if array_length(parts,1)=3 and parts[1]='demand' and active_text::boolean then\n      perform public.set_demand_reaction(parts[2],parts[3],true);\n    end if;\n  end loop;\nend;\n$$;\ngrant execute on function public.sync_demand_reactions(jsonb) to authenticated;\n`;
});

write("package.json", JSON.stringify({
  name: "goldmine-radar",
  version: "3.0.0",
  private: true,
  type: "module",
  description: "Money flow intelligence, opportunity discovery and service marketplace",
  engines: { node: ">=22" },
  scripts: {
    dev: "node scripts/dev.mjs",
    start: "node scripts/dev.mjs",
    check: "node scripts/check-v2.mjs && node scripts/check-sql.mjs && node scripts/check-edge.mjs",
    test: "node --test tests/*.test.mjs",
    verify: "npm run check && npm test"
  }
}, null, 2) + "\n");
write("package-lock.json", JSON.stringify({
  name: "goldmine-radar", version: "3.0.0", lockfileVersion: 3, requires: true,
  packages: { "": { name: "goldmine-radar", version: "3.0.0", engines: { node: ">=22" } } }
}, null, 2) + "\n");

write("config.example.js", `// Copy to config.js for a static deployment. Public Anon Key only.\n// Never put SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY or RESEND_API_KEY here.\nwindow.GOLDMINE_CONFIG = {\n  supabaseUrl: "https://YOUR_PROJECT.supabase.co",\n  supabaseAnonKey: "YOUR_PUBLIC_ANON_KEY",\n  siteUrl: window.location.origin + window.location.pathname,\n};\n`);

write("manifest.webmanifest", JSON.stringify({
  name: "GOLDMINE RADAR", short_name: "GOLDMINE", description: "実際に金が動いた証拠から、次の事業機会を発見する。",
  id: "./", start_url: "./#/", scope: "./", display: "standalone", orientation: "any", background_color: "#070910", theme_color: "#070910",
  categories: ["business", "finance", "productivity"], lang: "ja",
  icons: [
    { src: "assets/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any maskable" },
    { src: "assets/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
  ],
  shortcuts: [
    { name: "今日の金脈", url: "./#/", icons: [{ src: "assets/icon-192.svg", sizes: "192x192" }] },
    { name: "MY GOLDMINE", url: "./#/my-goldmine", icons: [{ src: "assets/icon-192.svg", sizes: "192x192" }] },
    { name: "サービスを掲載", url: "./#/submit", icons: [{ src: "assets/icon-192.svg", sizes: "192x192" }] }
  ]
}, null, 2) + "\n");

const iconSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#070910"/><circle cx="256" cy="256" r="174" fill="none" stroke="#f5c451" stroke-width="28"/><circle cx="256" cy="256" r="72" fill="none" stroke="#f5c451" stroke-width="28"/><path d="M256 82v174l112 67" fill="none" stroke="#f5c451" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><circle cx="256" cy="256" r="18" fill="#f5c451"/></svg>`;
write("assets/icon-192.svg", iconSvg(192));
write("assets/icon-512.svg", iconSvg(512));
write("assets/og-goldmine.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#070910"/><circle cx="1000" cy="110" r="320" fill="#f5c451" opacity=".08"/><path d="M86 98h44v44H86z" fill="none" stroke="#f5c451" stroke-width="6"/><text x="150" y="132" fill="#f4f6fb" font-size="30" font-family="Arial" font-weight="800">GOLDMINE RADAR</text><text x="86" y="286" fill="#f4f6fb" font-size="66" font-family="Arial" font-weight="800">次に金持ちになる人は、</text><text x="86" y="374" fill="#f5c451" font-size="78" font-family="Arial" font-weight="800">何を見ているのか。</text><text x="90" y="463" fill="#a7b0c2" font-size="28" font-family="Arial">Money Signal → Opportunity → Demand → Service</text><rect x="86" y="520" width="1028" height="2" fill="#242d3d"/></svg>`);

write("sw.js", `const CACHE="goldmine-radar-v3";\nconst STATIC=["./","index.html","styles/v2.css","src/v2/app.js","src/v2/core.js","src/v2/store.js","src/v2/cloud.js","src/v2/components.js","src/v2/data.js","src/v2/live-data.js","manifest.webmanifest","assets/icon-192.svg","assets/icon-512.svg"];\nself.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));\nself.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));\nself.addEventListener("fetch",event=>{const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==location.origin||url.pathname.includes("/functions/v1/")||url.pathname.includes("/rest/v1/"))return;if(request.mode==="navigate"){event.respondWith(fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put("index.html",copy));return response;}).catch(()=>caches.match("index.html")));return;}event.respondWith(caches.match(request).then(cached=>{const network=fetch(request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone()));return response;}).catch(()=>cached);return cached||network;}));});\n`);

write("404.html", `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>GOLDMINE RADAR</title><script>const base=location.pathname.includes("/Make-money/")?"/Make-money/":"/";const route=location.pathname.slice(base.length);location.replace(base+"#/"+route+location.search);</script></head><body style="background:#070910;color:#f4f6fb;font-family:sans-serif">GOLDMINE RADARへ戻ります。</body></html>`);
write("robots.txt", "User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n");
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/</loc></url></urlset>`);

for (const obsolete of ["src/app.js", "src/core.js", "src/data.js", "styles/app.css", "scripts/check.mjs", "tests/core.test.mjs"]) remove(obsolete);

console.log("GOLDMINE RADAR v3 integration finalized.");
