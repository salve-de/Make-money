import { categories, demands, listings, opportunities, publicCollections, signals } from "../data.js";
import { compareRows, compactNumber, computeOpportunityScore, demandGapScore, escapeHTML, filterOpportunities, formatNumber, recommendationScore, searchEverything, sortOpportunities } from "../core.js";
import { badge, collectionCard, demandCard, emptyState, icon, listingCard, opportunityCard, pageHeader, signalCard, signalRow, statCard } from "../components.js";
import { store } from "../store.js";

function onboardingPanel(){
  const state=store.getState();if(state.onboarding.done)return "";
  return `<section class="onboarding" id="onboarding"><div class="stepper"><span class="done"></span><span></span><span></span></div><div class="eyebrow">30秒でおすすめを変える</div><h2>あなたが取れる金脈だけを上に出す</h2><p>重い診断はありません。使える条件を選ぶだけです。後からいつでも変更できます。</p><form id="onboarding-form" class="form"><div class="checkbox-grid">${categories.slice(0,9).map(category=>`<label class="checkbox-card"><input type="checkbox" name="categories" value="${escapeHTML(category)}"> ${escapeHTML(category)}</label>`).join("")}</div><div class="checkbox-grid"><label class="checkbox-card"><input type="checkbox" name="solo"> 1人でやりたい</label><label class="checkbox-card"><input type="checkbox" name="lowBudget"> 初期10万円以下</label><label class="checkbox-card"><input type="checkbox" name="fast"> 14日以内に検証</label><label class="checkbox-card"><input type="checkbox" name="japan" checked> 日本向けを優先</label></div><div class="button-row"><button class="btn btn-primary" type="submit">おすすめを作る ${icon("arrow",17)}</button><button class="btn btn-ghost" type="button" data-action="skip-onboarding">今はスキップ</button></div></form></section>`;
}

export function renderDiscover(){
  const state=store.getState();
  const recommended=sortOpportunities(opportunities,"recommended",state.preferences).slice(0,6);
  const topSignal=[...signals].sort((a,b)=>b.change-a.change).slice(0,3);
  const topDemands=[...demands].sort((a,b)=>demandGapScore(b)-demandGapScore(a)).slice(0,3);
  const unread=state.notifications.filter(item=>!item.read).length;
  return `<main id="main-content" class="main"><div class="page">
    <div class="demo-banner">${icon("info",18)}<div><strong>体験用データで動作中。</strong> 数字の種類・根拠ランク・出典日を分離する設計を確認できます。本番では審査済みデータへ切り替えます。</div></div>
    <section class="hero"><div class="hero-content"><div class="eyebrow">MONEY FLOW INTELLIGENCE</div><h1>次に金持ちになる人は、<em>何を見ているのか。</em></h1><p class="hero-lead">誰が、何に、いくら払い、なぜ今その需要が生まれたか。実際の金の動きから、まだ残る事業の入口まで一続きで見る。</p><div class="hero-actions"><a class="btn btn-primary btn-lg" href="#/opportunities">今の金脈を見る ${icon("arrow",18)}</a><a class="btn btn-lg" href="#/submit">自分のサービスを載せる</a></div><div class="hero-proof"><div class="hero-proof-item"><strong>${opportunities.length}</strong><span>事業機会</span></div><div class="hero-proof-item"><strong>${signals.length}</strong><span>Money Signal</span></div><div class="hero-proof-item"><strong>${demands.reduce((n,d)=>n+d.want,0).toLocaleString()}</strong><span>欲しい反応</span></div><div class="hero-proof-item"><strong>${unread||4}</strong><span>新しい変化</span></div></div></div></section>
    <section class="section">${onboardingPanel()}</section>
    <section class="section"><div class="section-head"><div><h2>あなた向けの金脈</h2><p>条件・保存・反応から、実行可能性の高い順に並べます。</p></div><a class="text-link" href="#/opportunities">すべて見る</a></div><div class="grid grid-3">${recommended.map(item=>opportunityCard(item,{compact:false})).join("")}</div></section>
    <section class="section"><div class="section-head"><div><h2>今、金が動いた</h2><p>売上、利益、調達、実支出、契約上限を混同しません。</p></div><a class="text-link" href="#/signals">Money Signal DB</a></div><div class="grid grid-3">${topSignal.map(signalCard).join("")}</div></section>
    <section class="section"><div class="section-head"><div><h2>需要があるのに、まだ足りない</h2><p>欲しい、支払意思、痛み、既存解決策の少なさを分解します。</p></div><a class="text-link" href="#/demands">未充足需要DB</a></div><div class="grid grid-3">${topDemands.map(demandCard).join("")}</div></section>
    <section class="section"><div class="section-head"><div><h2>作る人・売る人・買う人が接続する</h2><p>機会を眺めるだけで終わらず、実際の募集へ移動できます。</p></div><a class="text-link" href="#/listings">募集市場</a></div><div class="grid grid-3">${listings.slice(0,3).map(listingCard).join("")}</div></section>
    <section class="section"><div class="section-head"><div><h2>先に見つけた人の公開リスト</h2><p>保存が個人のメモで終わらず、他人を連れてくる流入資産になります。</p></div><a class="text-link" href="#/collections">コレクション</a></div><div class="grid grid-2">${publicCollections.filter(c=>c.featured).map(collectionCard).join("")}</div></section>
  </div></main>`;
}

function toolbar(route,resultCount){
  const q=route.query||{};
  return `<form id="opportunity-filter" class="toolbar"><span class="search-icon">${icon("search",17)}</span><input class="field" name="query" value="${escapeHTML(q.q||"")}" placeholder="市場、買い手、課題、サービスで検索"><select class="select" name="category"><option value="all">すべての分野</option>${categories.map(value=>`<option ${q.category===value?"selected":""}>${escapeHTML(value)}</option>`).join("")}</select><select class="select" name="sort"><option value="recommended" ${q.sort==="recommended"?"selected":""}>あなた向け</option><option value="score" ${q.sort==="score"?"selected":""}>総合スコア</option><option value="momentum" ${q.sort==="momentum"?"selected":""}>勢い</option><option value="gap" ${q.sort==="gap"?"selected":""}>需要の空白</option><option value="feasibility" ${q.sort==="feasibility"?"selected":""}>作りやすさ</option><option value="amount" ${q.sort==="amount"?"selected":""}>金額</option><option value="newest" ${q.sort==="newest"?"selected":""}>更新日</option></select><button class="filter-chip ${q.solo==="1"?"active":""}" type="button" data-action="toggle-query" data-key="solo" data-value="1">1人向け</button><button class="filter-chip ${q.lowBudget==="1"?"active":""}" type="button" data-action="toggle-query" data-key="lowBudget" data-value="1">低予算</button><span class="filter-count">${resultCount}件</span></form>`;
}

export function renderOpportunities(route){
  const q=route.query||{},state=store.getState();
  const items=filterOpportunities(opportunities,{query:q.q||"",category:q.category||"all",sort:q.sort||"recommended",solo:q.solo==="1",lowBudget:q.lowBudget==="1",preferences:state.preferences});
  const actions=`<a class="btn" href="#/compare">比較 ${state.compare.length}/4</a><a class="btn btn-primary" href="#/submit?type=opportunity">情報を投稿</a>`;
  return `<main id="main-content" class="main"><div class="page">${pageHeader({eyebrow:"OPPORTUNITY DATABASE",title:"次に狙える事業機会",description:"成功談ではなく、金が動いた証拠・需要・供給不足・顧客獲得経路から比較します。",actions})}${toolbar(route,items.length)}${items.length?`<div class="grid grid-3">${items.map(item=>opportunityCard(item)).join("")}</div>`:emptyState("条件に合う金脈がありません","絞り込みを戻すか、別の買い手・課題で検索してください。","filter",'<a class="btn" href="#/opportunities">条件をリセット</a>')}</div></main>`;
}

export function renderRankings(){
  const state=store.getState();
  const ranked=sortOpportunities(opportunities,"score",state.preferences);
  const rows=ranked.map((item,index)=>`<tr data-href="#/opportunities/${item.slug}"><td><span class="rank ${index<3?"top":""}">${String(index+1).padStart(2,"0")}</span></td><td><strong>${escapeHTML(item.title)}</strong><div class="muted">${escapeHTML(item.category)} · ${escapeHTML(item.region)}</div></td><td><strong class="gold">${computeOpportunityScore(item)}</strong></td><td>${item.scores.evidence}</td><td>${item.scores.momentum}</td><td>${item.scores.gap}</td><td>${item.scores.feasibility}</td><td>${formatNumber(item.stats.saves)}</td></tr>`).join("");
  return `<main id="main-content" class="main"><div class="page">${pageHeader({eyebrow:"TRANSPARENT RANKING",title:"金脈ランキング",description:"広告費では順位を買えません。点数の内訳と重みを公開し、プロモーション枠は別表示にします。",actions:'<a class="btn" href="#/trust">評価方法</a>'})}<div class="grid grid-4" style="margin-bottom:16px">${statCard("1位の総合点",computeOpportunityScore(ranked[0]),"5項目の加重平均")}${statCard("急上昇市場",opportunities.filter(o=>o.stage==="急上昇").length,"直近変化を優先")}${statCard("1人向け",opportunities.filter(o=>o.solo).length,"初期検証可能")}${statCard("支払意思",formatNumber(opportunities.reduce((n,o)=>n+o.stats.wouldPay,0)),"体験用反応")}</div><div class="table-wrap"><table><thead><tr><th>#</th><th>事業機会</th><th>総合</th><th>証拠</th><th>勢い</th><th>空白</th><th>実行</th><th>保存</th></tr></thead><tbody>${rows}</tbody></table></div><section class="section card card-pad"><h2>ランキングの読み方</h2><p class="muted">総合点は「儲かる保証」ではありません。情報の確かさ25%、市場の勢い22%、需要の空白23%、顧客獲得経路14%、実行可能性16%で比較し、各詳細ページで理由と反証を確認できます。</p></section></div></main>`;
}

export function renderMarket(){
  const grouped=categories.map(category=>{
    const items=opportunities.filter(o=>o.category===category);
    const momentum=items.length?Math.round(items.reduce((n,o)=>n+o.scores.momentum,0)/items.length):0;
    const score=items.length?Math.round(items.reduce((n,o)=>n+computeOpportunityScore(o),0)/items.length):0;
    return {category,items,momentum,score};
  }).filter(group=>group.items.length).sort((a,b)=>b.momentum-a.momentum);
  return `<main id="main-content" class="main"><div class="page">${pageHeader({eyebrow:"MARKET HEAT",title:"どこに金と需要が集まり始めたか",description:"市場規模だけでなく、勢い、未充足需要、参入可能性を同時に見ます。"})}<div class="market-map">${grouped.map((group,index)=>`<a class="market-cell ${group.momentum>=85?"hot":""} ${index<2?"wide":""}" href="#/opportunities?category=${encodeURIComponent(group.category)}"><strong>${escapeHTML(group.category)}</strong><div><span>${group.momentum}</span><small class="muted"> 勢い · ${group.items.length}件</small></div></a>`).join("")}</div><section class="section"><div class="section-head"><div><h2>勢いの強い分野</h2><p>大きさではなく、直近の変化と空白を優先。</p></div></div><div class="grid grid-3">${grouped.slice(0,6).map(group=>{const top=sortOpportunities(group.items,"score")[0];return opportunityCard(top,{compact:true,showReactions:false});}).join("")}</div></section><section class="section card card-pad"><h2>ヒートの判定</h2><div class="grid grid-3"><div><strong>金の変化</strong><p class="muted">支出・売上・契約・価格が過去より増えているか。</p></div><div><strong>需要の密度</strong><p class="muted">欲しい、支払意思、検索、募集、低評価が集中しているか。</p></div><div><strong>入口の残存</strong><p class="muted">地域、業種、価格、運用の隙間が新規参入者に残るか。</p></div></div></section></div></main>`;
}

export function renderSearch(route){
  const query=route.query.q||"",results=searchEverything(query,{limit:80});
  const typeLabel={opportunity:"事業機会",signal:"金の動き",service:"サービス",demand:"需要",listing:"募集",collection:"コレクション"};
  const content=!query?emptyState("検索語を入力してください","会社名ではなく、困り事・買い手・金額・業務でも検索できます。","search"):results.length?`<div class="card"><div class="search-results">${results.map(result=>`<a class="search-result" href="${result.type==="opportunity"?`#/opportunities/${result.item.slug}`:result.type==="signal"?`#/signals/${result.item.slug}`:result.type==="service"?`#/services/${result.item.slug}`:result.type==="demand"?`#/demands/${result.item.slug}`:result.type==="listing"?`#/listings/${result.item.slug}`:`#/collections/${result.item.slug}`}"><div class="search-result-icon">${icon(result.type==="signal"?"flow":result.type==="service"?"box":result.type==="demand"?"demand":result.type==="listing"?"handshake":result.type==="collection"?"collection":"spark",17)}</div><div><strong>${escapeHTML(result.item.title||result.item.name||result.item.headline)}</strong><small>${typeLabel[result.type]} · ${escapeHTML(result.item.category||result.item.region||result.item.ownerName||"")}</small></div></a>`).join("")}</div></div>`:emptyState("一致する結果がありません","言い換えるか、カテゴリーを直接開いてください。","search");
  return `<main id="main-content" class="main"><div class="page page-narrow">${pageHeader({eyebrow:"GLOBAL SEARCH",title:query?`「${query}」の検索結果`:"横断検索",description:`金脈、金の動き、需要、サービス、募集、公開リストを同時に検索します。${query?` ${results.length}件見つかりました。`:""}`})}${content}</div></main>`;
}

export function renderCompare(){
  const state=store.getState(),comparison=compareRows(state.compare);
  if(!comparison.items.length)return `<main id="main-content" class="main"><div class="page page-narrow">${pageHeader({eyebrow:"COMPARE",title:"事業機会を比較",description:"カードの比較ボタンから最大4件を追加できます。"})}${emptyState("比較する金脈がありません","事業機会一覧から気になるものを2〜4件選択してください。","compare",'<a class="btn btn-primary" href="#/opportunities">金脈を選ぶ</a>')}</div></main>`;
  return `<main id="main-content" class="main"><div class="page">${pageHeader({eyebrow:"COMPARE",title:"${comparison.items.length}件の事業機会を横並び",description:"大きな数字ではなく、証拠・勢い・空白・実行可能性を同じ基準で比べます。",actions:'<button class="btn" data-action="clear-compare">すべて外す</button>'})}<div class="table-wrap"><table><thead><tr><th>比較軸</th>${comparison.items.map(item=>`<th><a href="#/opportunities/${item.slug}">${escapeHTML(item.title)}</a></th>`).join("")}</tr></thead><tbody>${comparison.rows.map(row=>`<tr><td><strong>${escapeHTML(row.label)}</strong></td>${row.values.map(value=>`<td>${escapeHTML(String(value))}</td>`).join("")}</tr>`).join("")}</tbody></table></div><section class="section grid grid-${Math.min(3,comparison.items.length)}">${comparison.items.map(item=>opportunityCard(item,{compact:true,showReactions:false})).join("")}</section></div></main>`;
}
