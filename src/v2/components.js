import { evidenceMeta, moneyTypeMeta, signals, services, demands } from "./data.js";
import { byId, compactNumber, computeOpportunityScore, demandGapScore, escapeHTML, formatDate, formatDateTime, formatNumber, routeFor, scoreBreakdown } from "./core.js";
import { store } from "./store.js";

const paths={
  radar:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v8l5 3"/>',
  spark:'<path d="m3 16 5-6 4 4 8-10"/><path d="M15 4h5v5"/>',
  ranking:'<path d="M8 21V10H4v11M14 21V3h-4v18M20 21v-7h-4v7"/>',
  map:'<path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3z"/><path d="M8 3v15M16 6v15"/>',
  flow:'<path d="M4 7h11"/><path d="m12 4 3 3-3 3"/><path d="M20 17H9"/><path d="m12 14-3 3 3 3"/><circle cx="4" cy="17" r="2"/><circle cx="20" cy="7" r="2"/>',
  demand:'<path d="M20 15a4 4 0 0 1-4 4H8l-4 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4z"/><path d="M8 8h8M8 12h5"/>',
  box:'<path d="m4 7 8-4 8 4-8 4z"/><path d="m4 7 8 4 8-4v10l-8 4-8-4z"/><path d="M12 11v10"/>',
  handshake:'<path d="m8 11 3 3a2 2 0 0 0 3 0l4-4"/><path d="m3 7 4-2 4 3M21 7l-4-2-4 3"/><path d="m3 7 3 9 3-2M21 7l-3 9-3-2"/>',
  vault:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 5V3h10v2M8 12h8M12 8v8"/>',
  collection:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 9h8M8 13h5"/>',
  note:'<path d="M5 3h11l3 3v15H5z"/><path d="M16 3v4h4M8 12h8M8 16h6"/>',
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  bookmark:'<path d="M6 4h12v17l-6-4-6 4z"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
  heart:'<path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 21l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z"/>',
  hammer:'<path d="m14 5 5 5M13 6l3-3 5 5-3 3M3 21l8-8M7 17l-2-2"/>',
  yen:'<path d="m6 4 6 8 6-8M7 13h10M7 17h10M12 12v9"/>',
  compare:'<path d="M8 3v18M16 3v18M4 7h8M12 17h8"/>',
  external:'<path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  warning:'<path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>',
  upload:'<path d="M12 16V3M7 8l5-5 5 5"/><path d="M4 14v7h16v-7"/>',
  download:'<path d="M12 3v13M7 11l5 5 5-5"/><path d="M4 21h16"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  filter:'<path d="M4 5h16M7 12h10M10 19h4"/>',
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  cloud:'<path d="M17.5 19H6a4 4 0 1 1 .6-8A6 6 0 0 1 18 9.5 4.5 4.5 0 0 1 17.5 19z"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  admin:'<path d="M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/>'
};

export function icon(name,size=20,className=""){
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
}

export function badge(text,tone=""){
  return `<span class="badge ${tone?`badge-${tone}`:""}">${escapeHTML(text)}</span>`;
}

export function evidenceBadge(grade="D",compact=false){
  const meta=evidenceMeta[grade]||evidenceMeta.D;
  const tone=grade==="A"?"green":grade==="B"?"blue":grade==="C"?"purple":"red";
  return `<span class="badge badge-${tone}" title="${escapeHTML(meta.description)}">根拠 ${grade}${compact?"":` · ${escapeHTML(meta.label)}`}</span>`;
}

export function moneyTypeBadge(type){return badge(moneyTypeMeta[type]||type,"gold");}

export function scorePill(score,label="総合スコア"){
  return `<div class="score-pill" style="--score:${score}" title="${escapeHTML(label)} ${score}/100"><span>${score}</span></div>`;
}

export function sparkline(values=[],width=120,height=32){
  if(values.length<2)return "";
  const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const points=values.map((value,index)=>`${(index/(values.length-1))*width},${height-((value-min)/range)*(height-4)-2}`).join(" ");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-label="推移グラフ"><polyline fill="none" stroke="var(--gold)" stroke-width="2" points="${points}"/><polyline fill="none" stroke="rgba(245,196,81,.18)" stroke-width="7" points="${points}"/></svg>`;
}

export function opportunityCard(item,{compact=false,showReactions=true}={}){
  const state=store.getState();
  const score=computeOpportunityScore(item);
  const signal=byId(signals,item.signalIds[0]);
  const saved=state.saved.includes(item.id),watched=state.watched.includes(item.id),compared=state.compare.includes(item.id);
  const active=kind=>Boolean(state.reactions[`${item.id}:${kind}`]);
  return `<article class="card card-pad card-hover opportunity-card" style="--accent:${item.stage==="急上昇"?"var(--red)":item.stage==="上昇中"?"var(--gold)":"var(--blue)"}">
    <div class="card-top">
      <div>
        <div class="eyebrow">${escapeHTML(item.eyebrow)}</div>
        <div class="money">${escapeHTML(item.amount)}<small>${escapeHTML(moneyTypeMeta[item.amountType]||item.amountType)} · ${escapeHTML(item.amountNote)}</small></div>
      </div>
      ${scorePill(score)}
    </div>
    <a href="#/opportunities/${encodeURIComponent(item.slug)}"><h3 class="card-title">${escapeHTML(item.title)}</h3></a>
    <p class="card-copy">${escapeHTML(item.hook)}</p>
    ${compact?"":`<div class="signal-flow"><div><span>払った側</span><strong>${escapeHTML(signal?.payer||"—")}</strong></div><div class="signal-arrow">${icon("arrow",18)}</div><div><span>受け取った側</span><strong>${escapeHTML(signal?.receiver||"—")}</strong></div></div>`}
    <div class="card-meta">${badge(item.category)}${badge(item.region)}${item.solo?badge("1人向け","green"):badge("チーム推奨")}${badge(`${item.timeToValidate}日で検証`)}</div>
    ${compact?"":`<div class="card-footer"><div><span class="muted" style="font-size:10px">勢い ${item.scores.momentum}</span>${sparkline(item.trend,92,26)}</div><div class="button-row"><button class="icon-button" data-action="toggle-save" data-id="${item.id}" aria-label="保存" title="保存">${icon("bookmark",17,saved?"gold":"")}</button><button class="icon-button" data-action="toggle-watch" data-id="${item.id}" aria-label="追跡" title="追跡">${icon("eye",17,watched?"gold":"")}</button><button class="icon-button" data-action="toggle-compare" data-id="${item.id}" aria-label="比較" title="比較">${icon("compare",17,compared?"gold":"")}</button></div></div>`}
    ${showReactions?`<div class="reaction-row" style="margin-top:12px"><button class="reaction ${active("want")?"active":""}" data-action="react" data-kind="want" data-id="${item.id}">欲しい ${formatNumber(item.stats.want+(active("want")?1:0))}</button><button class="reaction ${active("would_pay")?"active":""}" data-action="react" data-kind="would_pay" data-id="${item.id}">払ってもよい ${formatNumber(item.stats.wouldPay+(active("would_pay")?1:0))}</button><button class="reaction ${active("build")?"active":""}" data-action="react" data-kind="build" data-id="${item.id}">作れそう ${formatNumber(item.stats.build+(active("build")?1:0))}</button></div>`:""}
  </article>`;
}

export function signalRow(signal,index=0){
  return `<tr data-href="#/signals/${encodeURIComponent(signal.slug)}"><td><span class="rank ${index<3?"top":""}">${String(index+1).padStart(2,"0")}</span></td><td><strong>${escapeHTML(signal.headline)}</strong><div class="muted">${escapeHTML(signal.category)} · ${escapeHTML(signal.region)}</div></td><td><strong class="gold nowrap">${escapeHTML(signal.amount)}</strong><div>${moneyTypeBadge(signal.type)}</div></td><td><span class="green">+${signal.change}%</span></td><td>${evidenceBadge(signal.grade,true)}</td><td>${formatDate(signal.occurredAt)}</td></tr>`;
}

export function signalCard(signal){
  return `<article class="card card-pad card-hover"><div class="card-top"><div>${moneyTypeBadge(signal.type)} ${evidenceBadge(signal.grade,true)}</div><strong class="green">+${signal.change}%</strong></div><a href="#/signals/${encodeURIComponent(signal.slug)}"><h3 class="card-title">${escapeHTML(signal.headline)}</h3></a><div class="money gold">${escapeHTML(signal.amount)}</div><p class="card-copy" style="margin-top:9px">${escapeHTML(signal.summary)}</p><div class="signal-flow"><div><span>支払者</span><strong>${escapeHTML(signal.payer)}</strong></div><div class="signal-arrow">${icon("arrow",18)}</div><div><span>受取者</span><strong>${escapeHTML(signal.receiver)}</strong></div></div></article>`;
}

export function serviceCard(service){
  const trust={unverified:["未確認","red"],owner_verified:["所有者確認","blue"],basic_verified:["基本確認","green"],metrics_connected:["指標接続","purple"],evidence_verified:["証拠確認","gold"]}[service.trust]||[service.trust,""];
  return `<article class="card card-pad card-hover"><div class="card-top"><div class="avatar">${escapeHTML(service.name.slice(0,2))}</div>${badge(trust[0],trust[1])}</div><a href="#/services/${encodeURIComponent(service.slug)}"><h3 class="card-title">${escapeHTML(service.name)}</h3></a><p class="card-copy">${escapeHTML(service.oneLiner)}</p><div class="card-meta">${badge(service.category)}${badge(service.region)}${service.intent.slice(0,2).map(value=>badge(value,"blue")).join("")}</div><div class="card-footer"><div><strong>${escapeHTML(service.pricing)}</strong><small class="muted" style="display:block">${compactNumber(service.stats.views)} 閲覧 · ${service.stats.leads} 問合せ</small></div><a class="btn btn-sm" href="#/services/${encodeURIComponent(service.slug)}">詳細 ${icon("chevron",14)}</a></div></article>`;
}

export function demandCard(demand){
  const score=demandGapScore(demand);
  return `<article class="card card-pad card-hover"><div class="card-top"><div>${evidenceBadge(demand.grade,true)} ${badge(demand.category)}</div>${scorePill(score,"需要の空白")}</div><a href="#/demands/${encodeURIComponent(demand.slug)}"><h3 class="card-title">${escapeHTML(demand.title)}</h3></a><p class="card-copy">${escapeHTML(demand.problem)}</p><div class="metric-grid" style="grid-template-columns:repeat(3,1fr);margin-top:14px"><div class="metric"><label>欲しい</label><strong>${formatNumber(demand.want)}</strong><div class="meter"><span style="--value:${Math.min(100,demand.want/7)}%"></span></div></div><div class="metric"><label>支払意思</label><strong>${formatNumber(demand.wouldPay)}</strong><div class="meter"><span style="--value:${Math.min(100,demand.wouldPay/1.5)}%"></span></div></div><div class="metric"><label>既存解決</label><strong>${demand.solutions}</strong><div class="meter"><span style="--value:${Math.max(8,100-demand.solutions*6)}%"></span></div></div></div><div class="card-footer"><span class="muted">想定価格 ${escapeHTML(demand.wtp)}</span><a class="text-link" href="#/demands/${encodeURIComponent(demand.slug)}">機会を見る</a></div></article>`;
}

export function listingCard(listing){
  const service=byId(services,listing.serviceId);
  const left=Math.max(0,listing.slots-listing.applications);
  return `<article class="card card-pad card-hover"><div class="card-top"><div>${badge({beta:"ベータ",customer:"顧客",partner:"提携",poc:"PoC",feedback:"調査"}[listing.type]||listing.type,"blue")} ${badge(listing.region)}</div>${badge(left?`残り ${left}枠`:"受付確認中",left?"gold":"red")}</div><a href="#/listings/${encodeURIComponent(listing.slug)}"><h3 class="card-title">${escapeHTML(listing.title)}</h3></a><p class="card-copy">${escapeHTML(listing.summary)}</p><div class="card-meta">${listing.tags.map(tag=>badge(tag)).join("")}</div><div class="card-footer"><div><strong>${escapeHTML(listing.reward)}</strong><small class="muted" style="display:block">${escapeHTML(service?.name||"掲載サービス")} · 締切 ${formatDate(listing.deadline)}</small></div><a class="btn btn-sm btn-primary" href="#/listings/${encodeURIComponent(listing.slug)}">条件を見る</a></div></article>`;
}

export function collectionCard(collection){
  const state=store.getState(),followed=state.collectionFollows.includes(collection.id);
  return `<article class="card card-pad card-hover"><a href="#/collections/${encodeURIComponent(collection.slug)}"><div class="collection-cover"><strong>${escapeHTML(collection.title)}</strong></div></a><p class="card-copy">${escapeHTML(collection.description)}</p><div class="card-meta">${badge(`${collection.opportunityIds.length}件`)}${badge(`${compactNumber(collection.followers)}人が追跡`)}${collection.visibility!=="public"?badge(collection.visibility):""}</div><div class="card-footer"><span class="muted">by ${escapeHTML(collection.ownerName)}</span><button class="btn btn-sm ${followed?"btn-primary":""}" data-action="follow-collection" data-id="${collection.id}">${followed?"追跡中":"追跡する"}</button></div></article>`;
}

export function scoreGrid(item){
  return `<div class="metric-grid">${scoreBreakdown(item).map(metric=>`<div class="metric"><label>${escapeHTML(metric.label)} · ${metric.weight}%</label><strong>${metric.value}</strong><div class="meter"><span style="--value:${metric.value}%"></span></div></div>`).join("")}</div>`;
}

export function sourceList(sourceItems=[]){
  if(!sourceItems.length)return emptyState("根拠資料がありません","公開前の審査キューにあります。","info");
  return `<div class="source-list">${sourceItems.map(source=>`<a class="source" href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer"><span class="source-grade">${escapeHTML(source.grade)}</span><span><strong>${escapeHTML(source.title)}</strong><small>${escapeHTML(source.publisher)} · 取得 ${formatDate(source.retrievedAt)}</small></span><span style="margin-left:auto">${icon("external",15)}</span></a>`).join("")}</div>`;
}

export function pageHeader({eyebrow="",title,description="",actions=""}){
  return `<header class="page-head"><div>${eyebrow?`<div class="eyebrow">${escapeHTML(eyebrow)}</div>`:""}<h1>${escapeHTML(title)}</h1>${description?`<p>${escapeHTML(description)}</p>`:""}</div>${actions?`<div class="page-actions">${actions}</div>`:""}</header>`;
}

export function emptyState(title,description,iconName="radar",action=""){
  return `<div class="empty"><div class="empty-icon">${icon(iconName,25)}</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${action}</div>`;
}

export function statCard(label,value,delta="",tone=""){
  return `<div class="card stat-card"><span class="stat-label">${escapeHTML(label)}</span><div class="stat-value">${escapeHTML(String(value))}</div>${delta?`<span class="stat-delta ${tone}">${escapeHTML(delta)}</span>`:""}</div>`;
}

export function modal({id="dialog",title,body,size="720px",closeLabel="閉じる"}){
  return `<div class="modal-backdrop" data-action="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="${id}-title" style="max-width:${size}"><header class="modal-head"><h2 id="${id}-title">${escapeHTML(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="${escapeHTML(closeLabel)}">${icon("close",19)}</button></header><div class="modal-body">${body}</div></section></div>`;
}

export function toast(message,{title="",tone="success",duration=3600}={}){
  const root=document.getElementById("toast-root");if(!root)return;
  const element=document.createElement("div");element.className=`toast ${tone}`;element.setAttribute("role",tone==="error"?"alert":"status");element.innerHTML=`<div>${icon(tone==="error"?"warning":tone==="success"?"check":"info",18)}</div><div><strong>${escapeHTML(title||tone==="error"?"エラー":"完了")}</strong><p>${escapeHTML(message)}</p></div>`;
  root.append(element);setTimeout(()=>element.remove(),duration);
}

export function renderNotifications(items){
  return items.map(item=>`<a class="notification-item ${item.read?"":"unread"}" href="${escapeHTML(item.route||"#/notifications")}" data-notification-id="${item.id}"><div class="notification-icon">${icon(item.type==="momentum"?"spark":item.type==="listing"?"handshake":item.type==="evidence"?"check":"bell",18)}</div><div class="notification-body"><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.body)}</p><small class="muted">${formatDateTime(item.createdAt)}</small></div>${item.read?"":`<span class="notification-dot" style="position:static;margin-top:9px"></span>`}</a>`).join("");
}

export function relatedServices(item){
  return (item.serviceIds||[]).map(id=>byId(services,id)).filter(Boolean);
}

export function relatedDemands(item){return (item.demandIds||[]).map(id=>byId(demands,id)).filter(Boolean);}
