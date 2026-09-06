import { escapeHTML, formatDateTime } from "../core.js";
import { badge, emptyState, icon, pageHeader, statCard } from "../components.js";
import { store } from "../store.js";

function combinedQueue(state){
  return [
    ...state.submissions.map(item=>({...item,queueType:"submission",title:item.payload?.name||item.payload?.title||item.payload?.headline||item.type,summary:item.payload?.oneLiner||item.payload?.problem||item.payload?.summary||""})),
    ...state.reviews.map(item=>({...item,queueType:"review",type:"review",title:item.title,summary:item.body,payload:item})),
    ...state.corrections.map(item=>({...item,queueType:"correction",type:"correction",title:`${item.entityType} の訂正`,summary:item.claim,payload:item})),
    ...state.listings.filter(item=>item.status==="pending").map(item=>({...item,queueType:"listing",type:"listing",title:item.title,summary:item.summary,payload:item}))
  ].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}

export function renderAdmin(){
  const state=store.getState();
  if(!["moderator","admin"].includes(state.profile.role)){
    return `<main id="main-content" class="main"><div class="page page-narrow">${pageHeader({eyebrow:"MODERATION",title:"審査権限が必要です",description:"投稿者と審査者の権限を分離し、本人が自分の根拠ランクを上げられないようにします。"})}${emptyState("アクセスできません","moderator または admin のプロフィールでログインしてください。","lock",'<a class="btn" href="#/account">アカウントへ</a>')}</div></main>`;
  }
  const queue=combinedQueue(state),pending=queue.filter(item=>["pending","submitted"].includes(item.status)),reviewing=queue.filter(item=>item.status==="in_review"),resolved=queue.filter(item=>["approved","rejected","spam"].includes(item.status));
  const rows=queue.map(item=>`<tr><td><div>${badge(item.type,item.type==="correction"?"blue":item.type==="review"?"purple":"gold")}</div><strong>${escapeHTML(item.title||item.type)}</strong><div class="muted truncate" style="max-width:440px">${escapeHTML(item.summary||"")}</div></td><td>${badge(item.status,item.status==="approved"?"green":item.status==="rejected"||item.status==="spam"?"red":"gold")}</td><td>${formatDateTime(item.createdAt)}</td><td><div class="button-row"><button class="btn btn-sm" data-action="moderate-view" data-id="${item.id}" data-queue-type="${item.queueType}">確認</button>${!["approved","rejected","spam"].includes(item.status)?`<button class="btn btn-sm btn-primary" data-action="moderate" data-id="${item.id}" data-queue-type="${item.queueType}" data-status="approved">承認</button><button class="btn btn-sm btn-danger" data-action="moderate" data-id="${item.id}" data-queue-type="${item.queueType}" data-status="rejected">却下</button>`:""}</div></td></tr>`).join("");
  return `<main id="main-content" class="main"><div class="page">${pageHeader({eyebrow:"MODERATION CONSOLE",title:"投稿数ではなく、根拠品質を増やす",description:"重複、数字の種類、期間、原資料、権利、広告分離を確認して公開します。",actions:'<button class="btn" data-action="moderation-guide">審査基準</button>'})}<div class="grid grid-4">${statCard("未審査",pending.length,"先入れ先出し")}${statCard("確認中",reviewing.length,"担当者あり")}${statCard("解決済み",resolved.length,"監査ログ保存")}${statCard("平均待ち",pending.length?"8時間":"0時間","体験用")}</div><section class="section card card-pad"><div class="section-head"><div><h2>審査キュー</h2><p>サービス、需要、Money Signal、レビュー、訂正、募集を一か所で確認。</p></div></div>${queue.length?`<div class="table-wrap"><table><thead><tr><th>内容</th><th>状態</th><th>投稿日時</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></div>`:emptyState("審査キューは空です","新しい投稿が届くとここへ表示されます。","admin")}</section><section class="section grid grid-3"><div class="card card-pad"><strong>1. 重複と権利</strong><p class="muted">既存ページ、転載権、公開範囲、所有者Claimを確認。</p></div><div class="card card-pad"><strong>2. 数字の意味</strong><p class="muted">売上、利益、GMV、調達、契約上限、推定を分類。</p></div><div class="card card-pad"><strong>3. 公開後の追跡</strong><p class="muted">出典日、更新期限、訂正履歴、stale化を設定。</p></div></section></div></main>`;
}
