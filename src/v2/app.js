import { categories, listings, navSections, opportunities, publicCollections, services } from "./data.js";
import { downloadText, escapeHTML, filterOpportunities, migrateState, parseRoute, readFileText, routeFor, searchEverything, toCSV, validateApplication, validateCorrection, validateDemandSubmission, validateListing, validateReview, validateServiceSubmission, validateSignalSubmission } from "./core.js";
import { badge, icon, modal, renderNotifications, toast } from "./components.js";
import { cloud, bootstrapCloud } from "./cloud.js";
import { store } from "./store.js";
import { renderCompare, renderDiscover, renderMarket, renderOpportunities, renderRankings, renderSearch } from "./pages/discover.js";
import { renderDemands, renderListings, renderServices, renderSignals } from "./pages/databases.js";
import { renderCollectionDetail, renderDemandDetail, renderListingDetail, renderOpportunityDetail, renderServiceDetail, renderSignalDetail } from "./pages/detail.js";
import { renderCollections, renderMyGoldmine, renderPricing, renderSubmit, renderTrust, renderWorkspace } from "./pages/community.js";
import { renderAccount, renderDashboard, renderNotificationsPage } from "./pages/account.js";
import { renderAdmin } from "./pages/admin.js";
import { claimDialog, cloudConfigDialog, collectionDialog, collectionPickerDialog, correctionDialog, listingDialog, moderationGuideDialog, moderationItemDialog, noteDialog, reviewDialog } from "./dialogs.js";

const appRoot=document.getElementById("app");
const modalRoot=document.getElementById("modal-root");
let currentRoute=parseRoute();
let lastPath="";
let lastFocused=null;
let searchIndex=-1;
let searchDebounce=null;
let cloudState={mode:"local",configured:false,user:null};
let renderQueued=false;

const rootMap={
  "opportunity-detail":"opportunities","signal-detail":"signals","service-detail":"services","demand-detail":"demands",
  "listing-detail":"listings","collection-detail":"collections","my-goldmine":"goldmine"
};

function activeNavId(route){return rootMap[route.name]||route.name;}
function unreadCount(){return store.getState().notifications.filter(item=>!item.read).length;}

function navHTML(){
  const active=activeNavId(currentRoute),state=store.getState();
  return navSections.map(section=>`<div class="nav-group"><p class="nav-label">${escapeHTML(section.label)}</p>${section.items.map(item=>`<a class="nav-link ${active===item.id?"active":""}" href="${item.route}" aria-current="${active===item.id?"page":"false"}">${icon(item.icon,19)}<span>${escapeHTML(item.label)}</span>${item.id==="goldmine"&&state.saved.length?`<span class="nav-badge">${state.saved.length}</span>`:item.id==="dashboard"&&state.applications.length?`<span class="nav-badge">${state.applications.length}</span>`:""}</a>`).join("")}</div>`).join("");
}

function topbarHTML(){
  const state=store.getState(),unread=unreadCount();
  return `<header class="topbar"><div class="topbar-inner"><a class="brand" href="#/"><span class="brand-mark">${icon("radar",20)}</span><span class="brand-name">GOLDMINE RADAR<small>MONEY FLOW INTELLIGENCE</small></span></a><button class="global-search" data-action="open-search" aria-label="横断検索"><span class="search-icon">${icon("search",17)}</span><input tabindex="-1" aria-hidden="true" placeholder="金脈、需要、サービス、支払者を検索"><span class="kbd">⌘ K</span></button><div class="top-actions"><a class="btn btn-primary" href="#/submit">${icon("plus",16)} 掲載する</a><button class="icon-button" data-action="toggle-theme" aria-label="テーマ切替" title="テーマ切替">${icon(state.theme==="dark"?"sun":"moon",18)}</button><a class="icon-button" href="#/notifications" aria-label="通知" title="通知">${icon("bell",18)}${unread?'<span class="notification-dot"></span>':""}</a><a class="icon-button" href="#/account" aria-label="アカウント" title="アカウント">${icon("user",18)}</a></div></div></header>`;
}

function sidebarHTML(){
  const state=store.getState();
  return `<aside class="sidebar" aria-label="メインナビゲーション">${navHTML()}<div class="sidebar-card"><strong>${state.cloud.status==="synced"?"クラウド同期済み":"自分の金脈を作る"}</strong><p>${state.cloud.status==="synced"?`最終同期 ${state.cloud.lastSync?new Date(state.cloud.lastSync).toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}):"—"}`:"保存、追跡、調査メモはログイン前から使えます。"}</p><a class="btn btn-sm btn-primary" style="width:100%" href="#/my-goldmine">MY GOLDMINE</a></div>${["moderator","admin"].includes(state.profile.role)?`<a class="nav-link ${currentRoute.name==="admin"?"active":""}" href="#/admin">${icon("admin",19)}<span>審査管理</span></a>`:""}<div class="nav-group" style="margin-top:18px"><a class="nav-link" href="#/trust">${icon("info",18)}<span>評価・根拠</span></a><a class="nav-link" href="#/pricing">${icon("yen",18)}<span>料金</span></a></div></aside>`;
}

function mobileNavHTML(){
  const active=activeNavId(currentRoute);
  const items=[
    {id:"discover",label:"発見",route:"#/",icon:"radar"},{id:"opportunities",label:"金脈",route:"#/opportunities",icon:"spark"},
    {id:"signals",label:"金の動き",route:"#/signals",icon:"flow"},{id:"goldmine",label:"保存",route:"#/my-goldmine",icon:"vault"},
    {id:"account",label:"その他",route:"#/account",icon:"menu"}
  ];
  return `<nav class="mobile-nav" aria-label="モバイルナビゲーション">${items.map(item=>`<a class="nav-link ${active===item.id?"active":""}" href="${item.route}">${icon(item.icon,19)}<span>${item.label}</span></a>`).join("")}</nav>`;
}

function compareTrayHTML(){
  const state=store.getState();if(!state.compare.length||currentRoute.name==="compare")return "";
  const items=state.compare.map(id=>opportunities.find(item=>item.id===id)).filter(Boolean);
  return `<div class="compare-tray"><strong>${icon("compare",17)} 比較 ${items.length}/4</strong><div class="compare-tray-items">${items.map(item=>`<span class="compare-mini">${escapeHTML(item.title)} <button class="text-link" data-action="toggle-compare" data-id="${item.id}" aria-label="比較から外す">×</button></span>`).join("")}</div><a class="btn btn-sm btn-primary" href="#/compare">比較する</a></div>`;
}

function pageRenderer(route){
  const map={
    discover:()=>renderDiscover(route),opportunities:()=>renderOpportunities(route),rankings:renderRankings,market:renderMarket,
    signals:()=>renderSignals(route),demands:()=>renderDemands(route),services:()=>renderServices(route),listings:()=>renderListings(route),
    "opportunity-detail":()=>renderOpportunityDetail(route.params.id),"signal-detail":()=>renderSignalDetail(route.params.id),
    "service-detail":()=>renderServiceDetail(route.params.id),"demand-detail":()=>renderDemandDetail(route.params.id),
    "listing-detail":()=>renderListingDetail(route.params.id),"collection-detail":()=>renderCollectionDetail(route.params.id),
    "my-goldmine":renderMyGoldmine,collections:renderCollections,workspace:renderWorkspace,dashboard:renderDashboard,
    notifications:renderNotificationsPage,account:renderAccount,submit:()=>renderSubmit(route),pricing:renderPricing,trust:renderTrust,
    search:()=>renderSearch(route),compare:renderCompare,admin:renderAdmin,
    "not-found":()=>`<main id="main-content" class="main"><div class="page page-narrow"><div class="empty"><div class="empty-icon">${icon("warning",24)}</div><h1>ページが見つかりません</h1><p>URLが変わったか、情報が非公開になった可能性があります。</p><a class="btn btn-primary" href="#/">トップへ戻る</a></div></div></main>`
  };
  return (map[route.name]||map["not-found"])();
}

function render({preserveScroll=false}={}){
  if(renderQueued)return;renderQueued=true;
  requestAnimationFrame(()=>{
    renderQueued=false;currentRoute=parseRoute();
    const content=pageRenderer(currentRoute);
    appRoot.innerHTML=`<div class="app-shell">${topbarHTML()}${sidebarHTML()}${content}${mobileNavHTML()}${compareTrayHTML()}</div>`;
    document.title=titleForRoute(currentRoute);
    const pathKey=currentRoute.path;
    if(!preserveScroll&&lastPath!==pathKey)window.scrollTo({top:0,behavior:"instant"});
    lastPath=pathKey;
    store.remember(location.hash||"#/");
    enhanceForms();
  });
}

function titleForRoute(route){
  const labels={discover:"今日の金脈",opportunities:"事業機会",signals:"金の動き",services:"サービス",demands:"未充足需要",listings:"募集市場",rankings:"ランキング",market:"市場ヒート","my-goldmine":"MY GOLDMINE",collections:"コレクション",workspace:"調査ノート",dashboard:"掲載者ダッシュボード",notifications:"通知",account:"アカウント",submit:"掲載する",pricing:"料金",trust:"評価方法",compare:"比較",admin:"審査管理",search:"検索"};
  return `${labels[route.name]||"GOLDMINE RADAR"} — GOLDMINE RADAR`;
}

function openModal(html){lastFocused=document.activeElement;modalRoot.innerHTML=html;requestAnimationFrame(()=>modalRoot.querySelector("input,textarea,select,button")?.focus());document.body.style.overflow="hidden";}
function closeModal(){modalRoot.innerHTML="";document.body.style.overflow="";lastFocused?.focus?.();lastFocused=null;}

function formObject(form){return Object.fromEntries(new FormData(form).entries());}
function setErrors(form,errors={}){
  form.querySelectorAll("[data-error]").forEach(element=>{element.textContent=errors[element.dataset.error]||"";});
  const first=Object.keys(errors)[0];if(first)form.elements[first]?.focus();
}
function currentBase(){return `#/${currentRoute.path.split("/").filter(Boolean)[0]||""}`.replace(/\/$/,"")||"#/";}
function setQuery(key,value,toggle=false){
  const params=new URLSearchParams(currentRoute.query||{});
  if(toggle&&params.get(key)===value)params.delete(key);else if(value&&value!=="all")params.set(key,value);else params.delete(key);
  const query=params.toString();location.hash=`#${currentRoute.path}${query?`?${query}`:""}`;
}
function updateFilterFromForm(form){
  const params=new URLSearchParams();for(const [key,value] of new FormData(form).entries()){if(value&&value!=="all"&&value!=="recommended"&&value!=="newest")params.set(key==="query"?"q":key,String(value));}
  const root=currentRoute.path;location.hash=`#${root}${params.toString()?`?${params}`:""}`;
}

function showSearchDialog(query=""){
  const results=searchEverything(query,{limit:12});searchIndex=-1;
  openModal(modal({id:"global-search",title:"金脈・需要・サービスを横断検索",size:"760px",body:`<div class="global-search" style="display:block"><span class="search-icon">${icon("search",17)}</span><input id="global-search-input" autocomplete="off" value="${escapeHTML(query)}" placeholder="例：請求書、EC返品、政府予算、月商"><span class="kbd">Esc</span></div><div id="global-search-results" style="margin-top:12px">${searchResultsHTML(results,query)}</div>`}));
  requestAnimationFrame(()=>{const input=document.getElementById("global-search-input");input?.focus();input?.setSelectionRange(input.value.length,input.value.length);});
}
function searchResultsHTML(results,query){
  if(!query)return `<div class="grid grid-3" style="gap:8px">${["請求書","返品","AI検索","政府予算","1人開発","月商"].map(value=>`<button class="filter-chip" data-action="search-suggestion" data-value="${value}">${value}</button>`).join("")}</div><p class="muted" style="margin-top:18px">⌘/Ctrl + K でいつでも開けます。</p>`;
  if(!results.length)return `<div class="empty"><h3>一致する情報がありません</h3><p>別の業務、買い手、金額で検索してください。</p></div>`;
  const labels={opportunity:"事業機会",signal:"金の動き",service:"サービス",demand:"未充足需要",listing:"募集",collection:"コレクション"};
  return `<div class="search-results">${results.map((result,index)=>`<a class="search-result" data-search-index="${index}" href="${routeFor(result.type,result.item)}"><div class="search-result-icon">${icon(result.type==="signal"?"flow":result.type==="service"?"box":result.type==="demand"?"demand":result.type==="listing"?"handshake":result.type==="collection"?"collection":"spark",17)}</div><div><strong>${escapeHTML(result.item.title||result.item.name||result.item.headline)}</strong><small>${labels[result.type]} · ${escapeHTML(result.item.category||result.item.region||result.item.ownerName||"")}</small></div></a>`).join("")}</div><a class="text-link" href="#/search?q=${encodeURIComponent(query)}">すべての検索結果</a>`;
}

function showCollectionPicker(opportunityId){openModal(collectionPickerDialog(opportunityId));}

async function submitService(form){
  const result=validateServiceSubmission(formObject(form));setErrors(form,result.errors);if(!result.valid)return;
  const submission=store.addSubmission("service",result.value);
  if(cloud.configured&&cloud.user)await cloud.submit("product",result.value).catch(error=>toast(error.message,{tone:"error"}));
  closeModal();toast("掲載申請を受け付けました。審査状況はダッシュボードで確認できます。",{title:"申請完了"});location.hash="#/dashboard";return submission;
}
async function submitDemand(form){const result=validateDemandSubmission(formObject(form));setErrors(form,result.errors);if(!result.valid)return;store.addSubmission("demand",result.value);if(cloud.configured&&cloud.user)await cloud.submit("demand",result.value).catch(error=>toast(error.message,{tone:"error"}));toast("未充足需要を審査へ送りました。",{title:"投稿完了"});location.hash="#/dashboard";}
async function submitSignal(form){const result=validateSignalSubmission(formObject(form));setErrors(form,result.errors);if(!result.valid)return;store.addSubmission("signal",result.value);if(cloud.configured&&cloud.user)await cloud.submit("money_signal",result.value).catch(error=>toast(error.message,{tone:"error"}));toast("Money Signalを審査へ送りました。",{title:"投稿完了"});location.hash="#/dashboard";}
async function submitCorrection(form,entityType="url",entityId="current"){
  const input=formObject(form),result=validateCorrection(input);setErrors(form,result.errors);if(!result.valid)return;
  const item=store.addCorrection(entityType,entityId,result.value);if(cloud.configured&&cloud.user)await cloud.submitCorrection(entityType,entityId,result.value).catch(error=>toast(error.message,{tone:"error"}));
  closeModal();toast("根拠付き訂正を審査へ送りました。",{title:"訂正申請"});return item;
}
async function submitListing(form){
  const input=formObject(form);input.tags=String(input.tags||"").split(",").map(v=>v.trim()).filter(Boolean);const result=validateListing(input);setErrors(form,result.errors);if(!result.valid)return;
  const id=form.dataset.id;if(id){store.updateListing(id,{...result.value,serviceId:input.serviceId,tags:input.tags});toast("募集を更新しました。");}
  else{store.createListing({...result.value,serviceId:input.serviceId,tags:input.tags});toast("募集を審査へ送りました。",{title:"作成完了"});}
  closeModal();location.hash="#/dashboard";
}
async function submitReview(form){const input=formObject(form),result=validateReview(input);setErrors(form,result.errors);if(!result.valid)return;const serviceId=form.dataset.serviceId;store.addReview(serviceId,result.value);if(cloud.configured&&cloud.user)await cloud.submitReview(serviceId,result.value).catch(error=>toast(error.message,{tone:"error"}));closeModal();toast("レビューを審査へ送りました。",{title:"投稿完了"});}
async function submitApplication(form){const input=formObject(form),result=validateApplication(input);setErrors(form,result.errors);if(!result.valid)return;try{store.applyToListing(form.dataset.listingId,result.value);if(cloud.configured&&cloud.user)await cloud.submitApplication(form.dataset.listingId,result.value);toast("応募を送信しました。",{title:"応募完了"});render();}catch(error){toast(error.message,{tone:"error"});}}

function findModerationItem(id,type){
  const state=store.getState();return type==="submission"?state.submissions.find(i=>i.id===id):type==="review"?state.reviews.find(i=>i.id===id):type==="correction"?state.corrections.find(i=>i.id===id):state.listings.find(i=>i.id===id);
}
function moderateItem(id,type,status){
  store.update(draft=>{
    const key=type==="submission"?"submissions":type==="review"?"reviews":type==="correction"?"corrections":"listings";
    draft[key]=draft[key].map(item=>item.id===id?{...item,status:type==="listing"&&status==="approved"?"open":status,reviewedAt:new Date().toISOString()}:item);return draft;
  },{type:"moderated",id,status});
  store.track("moderation_action",{id,type,status});closeModal();toast(status==="approved"?"公開状態へ更新しました。":"審査結果を保存しました。",{title:"審査完了"});render();
}

function enhanceForms(){
  for(const id of ["opportunity-filter","signal-filter","demand-filter","service-filter","listing-filter"]){
    const form=document.getElementById(id);if(!form)continue;
    form.addEventListener("change",()=>updateFilterFromForm(form),{once:true});
    const input=form.elements.query;input?.addEventListener("input",()=>{clearTimeout(searchDebounce);searchDebounce=setTimeout(()=>updateFilterFromForm(form),260);},{once:true});
  }
}

async function handleAction(button,event){
  const action=button.dataset.action,id=button.dataset.id;
  if(!action)return;
  if(action==="open-search")return showSearchDialog();
  if(action==="close-modal")return closeModal();
  if(action==="modal-backdrop"&&event.target===button)return closeModal();
  if(action==="toggle-theme")return store.setTheme(store.getState().theme==="dark"?"light":"dark");
  if(action==="toggle-save"){
    const active=store.toggleSaved(id);toast(active?"MY GOLDMINEへ保存しました。":"保存から外しました。",{title:active?"金脈を保存":"更新"});
    if(active&&store.getState().collections.length&&event.shiftKey)showCollectionPicker(id);return;
  }
  if(action==="toggle-watch"){const active=store.toggleWatched(id);toast(active?"市場の変化を追跡します。":"追跡を停止しました。");return;}
  if(action==="toggle-compare"){const result=store.toggleCompare(id);if(result.full)toast("比較は最大4件です。",{tone:"error"});return;}
  if(action==="clear-compare")return store.clearCompare();
  if(action==="react"){store.toggleReaction(id,button.dataset.kind);if(cloud.configured&&cloud.user)cloud.submitReaction(id,button.dataset.kind,Boolean(store.getState().reactions[`${id}:${button.dataset.kind}`])).catch(()=>null);return;}
  if(action==="follow-collection"){store.toggleFollowCollection(id);return;}
  if(action==="skip-onboarding"){store.finishOnboarding({});return;}
  if(action==="toggle-query")return setQuery(button.dataset.key,button.dataset.value,true);
  if(action==="set-query")return setQuery(button.dataset.key,button.dataset.value,false);
  if(action==="search-suggestion")return showSearchDialog(button.dataset.value);
  if(action==="open-note")return openModal(noteDialog({entityType:button.dataset.entityType,entityId:button.dataset.entityId}));
  if(action==="create-free-note")return openModal(noteDialog());
  if(action==="edit-note"){const note=store.getState().notes.find(item=>item.id===id);if(note)openModal(noteDialog({entityType:note.entityType,entityId:note.entityId,note}));return;}
  if(action==="delete-note"){if(confirm("このメモを削除しますか？"))store.deleteNote(id);return;}
  if(action==="create-collection")return openModal(collectionDialog());
  if(action==="edit-collection"){const item=store.getState().collections.find(c=>c.id===id);if(item)openModal(collectionDialog(item));return;}
  if(action==="toggle-collection-item"){store.toggleCollectionItem(button.dataset.collectionId,button.dataset.opportunityId);closeModal();toast("コレクションを更新しました。");return;}
  if(action==="open-listing-form")return openModal(listingDialog({serviceId:button.dataset.serviceId||""}));
  if(action==="edit-listing"){const item=store.getState().listings.find(listing=>listing.id===id);if(item)openModal(listingDialog({listing:item}));return;}
  if(action==="toggle-listing-status"){store.updateListing(id,{status:button.dataset.status});return;}
  if(action==="withdraw-application"){if(confirm("応募を取り下げますか？"))store.updateApplication(id,"withdrawn");return;}
  if(action==="open-review")return openModal(reviewDialog(button.dataset.serviceId));
  if(action==="review-helpful")return store.toggleReviewHelpful(id);
  if(action==="open-correction")return openModal(correctionDialog(button.dataset.entityType,button.dataset.entityId));
  if(action==="open-claim")return openModal(claimDialog(button.dataset.serviceId));
  if(action==="configure-cloud")return openModal(cloudConfigDialog(cloud.config));
  if(action==="read-all-notifications")return store.markAllNotifications();
  if(action==="share"){
    const url=new URL(button.dataset.url||location.hash,location.href).href;
    if(navigator.share)await navigator.share({title:document.title,url}).catch(()=>null);else{await navigator.clipboard.writeText(url);toast("共有URLをコピーしました。");}return;
  }
  if(action==="export-state"){downloadText(`goldmine-radar-${new Date().toISOString().slice(0,10)}.json`,store.exportState(),"application/json");return;}
  if(action==="import-state"){
    const input=document.createElement("input");input.type="file";input.accept="application/json";input.onchange=async()=>{try{store.importState(JSON.parse(await readFileText(input.files[0])));toast("データを読み込みました。");}catch(error){toast(error.message,{tone:"error"});}};input.click();return;
  }
  if(action==="export-notes"){
    const csv=toCSV(store.getState().notes,[{label:"見出し",value:"title"},{label:"内容",value:"body"},{label:"対象",value:n=>`${n.entityType}:${n.entityId}`},{label:"タグ",value:n=>(n.tags||[]).join("|")},{label:"更新",value:"updatedAt"}]);downloadText("goldmine-notes.csv",csv,"text/csv;charset=utf-8");return;
  }
  if(action==="reset-state"){if(confirm("保存、反応、メモ、応募をこの端末から削除しますか？")){store.reset();toast("ローカルデータを初期化しました。");}return;}
  if(action==="choose-plan"){
    const plan=button.dataset.plan;if(plan==="free"){store.setPlan("free");return;}
    if(cloud.configured&&cloud.user){try{const result=await cloud.startCheckout(plan);if(result.url)location.href=result.url;}catch(error){toast(error.message,{tone:"error"});}}
    else{store.setPlan(plan);toast("体験モードでプラン機能を有効にしました。本番ではStripe Checkoutへ移動します。",{title:"デモプラン"});}return;
  }
  if(action==="billing-portal"){try{const result=await cloud.openBillingPortal();if(result.url)location.href=result.url;}catch(error){toast(error.message,{tone:"error"});}return;}
  if(action==="sign-out"){await cloud.signOut();cloudState={mode:"configured",configured:true,user:null};render();return;}
  if(action==="sync-cloud"){try{await cloud.syncPersonalState();toast("クラウドへ同期しました。");}catch(error){toast(error.message,{tone:"error"});}return;}
  if(action==="auth-tab"){
    const form=document.getElementById("auth-form"),mode=button.dataset.tab;form.dataset.mode=mode;document.querySelectorAll("[data-action=auth-tab]").forEach(tab=>tab.classList.toggle("active",tab===button));const group=form.querySelector("[data-password-group]");group.style.display=mode==="magic"?"none":"grid";form.elements.password.required=mode!=="magic";form.querySelector("button[type=submit]").textContent=mode==="signin"?"ログイン":mode==="signup"?"新規登録":"メールリンクを送る";return;
  }
  if(action==="recover-password"){const email=document.getElementById("auth-form")?.elements.email.value;if(!email)return toast("メールアドレスを入力してください。",{tone:"error"});try{await cloud.recover(email);toast("再設定メールを送信しました。",{title:"送信完了"});}catch(error){toast(error.message,{tone:"error"});}return;}
  if(action==="preview-url"){
    const form=button.closest("form"),url=form.elements.url.value;if(!url)return;
    button.disabled=true;button.textContent="取得中…";
    try{const preview=cloud.configured?await cloud.previewUrl(url):{title:new URL(url).hostname.replace(/^www\./,""),description:""};if(preview.title&&!form.elements.name.value)form.elements.name.value=preview.title;if(preview.description&&!form.elements.oneLiner.value)form.elements.oneLiner.value=preview.description;toast("公開情報から下書きを作りました。");}catch(error){toast(error.message,{tone:"error"});}finally{button.disabled=false;button.textContent="URLから下書き";}return;
  }
  if(action==="moderation-guide")return openModal(moderationGuideDialog());
  if(action==="moderate-view"){const item=findModerationItem(id,button.dataset.queueType);if(item)openModal(moderationItemDialog({...item,queueType:button.dataset.queueType}));return;}
  if(action==="moderate")return moderateItem(id,button.dataset.queueType,button.dataset.status);
  if(action==="view-submission"){const item=store.getState().submissions.find(s=>s.id===id)||store.getState().corrections.find(s=>s.id===id);if(item)openModal(moderationItemDialog({...item,queueType:item.type==="correction"?"correction":"submission"}));return;}
  if(action==="manage-service"){const service=byId(services,id);if(service)openModal(modal({id:"manage-service",title:"サービス管理",body:`<div class="form"><div class="demo-banner">${icon("dashboard",18)}<div><strong>${escapeHTML(service.name)}</strong><br>閲覧 ${service.stats.views} · 保存 ${service.stats.saves} · 問合せ ${service.stats.leads}</div></div><a class="btn" href="#/services/${service.slug}">公開ページを見る</a><button class="btn btn-primary" data-action="open-listing-form" data-service-id="${service.id}">募集を作る</button></div>`}));return;}
}

async function handleSubmit(form,event){
  event.preventDefault();
  if(form.id==="onboarding-form"){
    const data=new FormData(form),selected=data.getAll("categories");store.finishOnboarding({categories:selected,solo:data.has("solo"),lowBudget:data.has("lowBudget"),fast:data.has("fast"),japan:data.has("japan")});toast("あなた向けの金脈に並べ替えました。");return;
  }
  if(form.id==="service-submission")return submitService(form);
  if(form.id==="demand-submission")return submitDemand(form);
  if(form.id==="signal-submission")return submitSignal(form);
  if(form.id==="generic-correction")return submitCorrection(form,"url",form.elements.target.value||location.href);
  if(form.id==="application-form")return submitApplication(form);
  if(form.id==="note-form"){
    const data=formObject(form),tags=String(data.tags||"").split(",").map(v=>v.trim()).filter(Boolean);
    if(form.dataset.noteId)store.updateNote(form.dataset.noteId,{title:data.title,body:data.body,tags});else store.addNote({entityType:form.dataset.entityType,entityId:form.dataset.entityId,title:data.title,body:data.body,tags});closeModal();toast("調査メモを保存しました。");return;
  }
  if(form.id==="collection-form"){
    const data=formObject(form);if(form.dataset.id)store.updateCollection(form.dataset.id,data);else store.createCollection(data);closeModal();toast("コレクションを保存しました。");return;
  }
  if(form.id==="listing-form")return submitListing(form);
  if(form.id==="review-form")return submitReview(form);
  if(form.id==="correction-form")return submitCorrection(form,form.dataset.entityType,form.dataset.entityId);
  if(form.id==="claim-form"){
    const data=formObject(form),serviceId=form.dataset.serviceId;store.addSubmission("claim",{serviceId,method:data.method,note:data.note});if(cloud.configured&&cloud.user)await cloud.requestClaim(serviceId,data.method).catch(error=>toast(error.message,{tone:"error"}));closeModal();toast("所有者確認を開始しました。",{title:"Claim申請"});return;
  }
  if(form.id==="cloud-config-form"){
    try{cloud.configure(formObject(form));closeModal();toast("接続情報を保存しました。再読み込みします。");setTimeout(()=>location.reload(),500);}catch(error){toast(error.message,{tone:"error"});}return;
  }
  if(form.id==="auth-form"){
    const data=formObject(form),mode=form.dataset.mode;const submit=form.querySelector("button[type=submit]");submit.disabled=true;
    try{if(mode==="signin")await cloud.signIn(data.email,data.password);else if(mode==="signup")await cloud.signUp(data.email,data.password,{display_name:data.email.split("@")[0]});else await cloud.signInWithMagicLink(data.email);cloudState=await bootstrapCloud();toast(mode==="magic"?"ログインリンクを送信しました。":"ログインしました。");render();}catch(error){toast(error.message,{tone:"error"});}finally{submit.disabled=false;}return;
  }
  if(form.id==="profile-form"){
    const data=formObject(form);store.updateProfile(data);if(cloud.configured&&cloud.user)await cloud.syncPersonalState().catch(error=>toast(error.message,{tone:"error"}));toast("プロフィールを保存しました。");return;
  }
  if(form.id==="account-settings"){
    const data=formObject(form);store.setTheme(data.theme);store.updateNewsletter({frequency:data.frequency,subscribed:new FormData(form).has("newsletter")});
    if(new FormData(form).has("newsletter")&&cloud.configured&&cloud.user?.email)await cloud.subscribeNewsletter(cloud.user.email,data.frequency).catch(error=>toast(error.message,{tone:"error"}));toast("設定を保存しました。");return;
  }
  if(["opportunity-filter","signal-filter","demand-filter","service-filter","listing-filter"].includes(form.id))return updateFilterFromForm(form);
}

document.addEventListener("click",event=>{
  const actionElement=event.target.closest("[data-action]");if(actionElement){event.preventDefault();handleAction(actionElement,event);return;}
  const row=event.target.closest("[data-href]");if(row&&!event.target.closest("a,button,input,select,textarea")){location.hash=row.dataset.href;return;}
  const notification=event.target.closest("[data-notification-id]");if(notification)store.markNotification(notification.dataset.notificationId,true);
});
document.addEventListener("submit",event=>handleSubmit(event.target,event));

document.addEventListener("input",event=>{
  if(event.target.id==="global-search-input"){
    clearTimeout(searchDebounce);searchDebounce=setTimeout(()=>{const results=searchEverything(event.target.value,{limit:12});const root=document.getElementById("global-search-results");if(root)root.innerHTML=searchResultsHTML(results,event.target.value);},80);
  }
});

document.addEventListener("keydown",event=>{
  const isShortcut=(event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k";
  if(isShortcut){event.preventDefault();showSearchDialog();return;}
  if(event.key==="/"&&!/input|textarea|select/i.test(document.activeElement?.tagName)){event.preventDefault();showSearchDialog();return;}
  if(event.key==="Escape"&&modalRoot.innerHTML){closeModal();return;}
  if(event.target.id==="global-search-input"&&["ArrowDown","ArrowUp","Enter"].includes(event.key)){
    const items=[...document.querySelectorAll("[data-search-index]")];if(!items.length)return;
    event.preventDefault();if(event.key==="ArrowDown")searchIndex=Math.min(items.length-1,searchIndex+1);if(event.key==="ArrowUp")searchIndex=Math.max(0,searchIndex-1);items.forEach((item,index)=>item.classList.toggle("active",index===searchIndex));if(event.key==="Enter")items[Math.max(0,searchIndex)]?.click();
  }
});

window.addEventListener("hashchange",()=>render());
store.subscribe((_state,meta)=>{if(["recent","cloud"].includes(meta?.type))return;render({preserveScroll:true});});

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>null));

(async function init(){
  appRoot.innerHTML='<div class="loading-screen"><div><div class="loader"></div><p class="muted">金の流れを読み込んでいます…</p></div></div>';
  cloudState=await bootstrapCloud();
  render();
})();
