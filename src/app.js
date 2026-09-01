import {
  DEMO_MODE,
  activity,
  categories,
  demands as seedDemands,
  editorialStats,
  opportunities as seedOpportunities,
  services as seedServices,
  signals as seedSignals
} from './data.js';
import {
  categorySummary,
  clamp,
  escapeHTML,
  evidenceMeta,
  filterOpportunities,
  formatCompactNumber,
  formatYen,
  gapStrength,
  getCategoryLabel,
  matchesQuery,
  opportunityScore,
  parseHash,
  portfolioStats,
  recommendForPreferences,
  routeFor,
  safeId,
  searchAcross,
  sortOpportunities
} from './core.js';

const STORAGE_KEY = 'goldmine-radar-state-v1';

const defaultState = {
  savedOpportunities: [],
  followedOpportunities: [],
  compare: [],
  reactions: {},
  demandVotes: [],
  payVotes: [],
  claimedServices: [],
  userServices: [],
  userDemands: [],
  userSignals: [],
  serviceViews: {},
  filters: {
    query: '',
    category: 'all',
    region: 'all',
    evidence: 'all',
    status: 'all',
    soloOnly: false,
    sort: 'score'
  },
  serviceFilters: {
    query: '',
    category: 'all',
    intent: 'all',
    verified: false,
    sort: 'popular'
  },
  demandFilters: {
    query: '',
    category: 'all',
    sort: 'gap'
  },
  signalFilters: {
    query: '',
    category: 'all',
    grade: 'all',
    sort: 'new'
  },
  preferences: {
    onboarded: false,
    categories: ['ai-automation', 'data-intelligence'],
    solo: true,
    lowBudget: true,
    japan: true
  },
  searchOpen: false,
  searchQuery: '',
  submitTab: 'service',
  mobileMenuOpen: false,
  demoNoticeDismissed: false,
  lastVisitedAt: null
};

let state = loadState();
let currentRoute = parseHash(window.location.hash || '#/discover');

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...structuredClone(defaultState),
      ...stored,
      filters: { ...defaultState.filters, ...(stored.filters || {}) },
      serviceFilters: { ...defaultState.serviceFilters, ...(stored.serviceFilters || {}) },
      demandFilters: { ...defaultState.demandFilters, ...(stored.demandFilters || {}) },
      signalFilters: { ...defaultState.signalFilters, ...(stored.signalFilters || {}) },
      preferences: { ...defaultState.preferences, ...(stored.preferences || {}) }
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  state.lastVisitedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function collections() {
  return {
    opportunities: seedOpportunities,
    services: [...state.userServices, ...seedServices],
    demands: [...state.userDemands, ...seedDemands],
    signals: [...state.userSignals, ...seedSignals]
  };
}

function boot() {
  if (!window.location.hash) window.location.hash = '#/discover';
  window.addEventListener('hashchange', () => {
    currentRoute = parseHash(window.location.hash);
    state.mobileMenuOpen = false;
    trackDetailView();
    window.scrollTo({ top: 0, behavior: 'instant' });
    render();
  });

  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('input', handleInput);
  document.addEventListener('keydown', handleKeydown);

  trackDetailView();
  render();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  }
}

function trackDetailView() {
  if (currentRoute.page === 'service' && currentRoute.id) {
    state.serviceViews[currentRoute.id] = Number(state.serviceViews[currentRoute.id] || 0) + 1;
    persist();
  }
}

function handleKeydown(event) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    state.searchOpen = true;
    renderSearchModal();
    requestAnimationFrame(() => document.querySelector('[data-search-modal-input]')?.focus());
  }
  if (event.key === 'Escape' && state.searchOpen) {
    state.searchOpen = false;
    renderSearchModal();
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.matches('[data-search-modal-input]')) {
    state.searchQuery = target.value;
    renderSearchResults();
  }
}

function handleClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  const { action, id, value, key, type } = actionElement.dataset;

  switch (action) {
    case 'open-search':
      state.searchOpen = true;
      renderSearchModal();
      requestAnimationFrame(() => document.querySelector('[data-search-modal-input]')?.focus());
      break;
    case 'close-search':
      state.searchOpen = false;
      renderSearchModal();
      break;
    case 'toggle-mobile-menu':
      state.mobileMenuOpen = !state.mobileMenuOpen;
      render();
      break;
    case 'toggle-save':
      toggleList('savedOpportunities', id);
      toast(state.savedOpportunities.includes(id) ? 'MY GOLDMINEへ保存しました' : '保存を解除しました');
      render();
      break;
    case 'toggle-follow':
      toggleList('followedOpportunities', id);
      toast(state.followedOpportunities.includes(id) ? '変化を追跡します' : '追跡を解除しました');
      render();
      break;
    case 'toggle-compare':
      if (!state.compare.includes(id) && state.compare.length >= 4) {
        toast('比較できるのは最大4件です');
        break;
      }
      toggleList('compare', id);
      toast(state.compare.includes(id) ? '比較に追加しました' : '比較から外しました');
      render();
      break;
    case 'reaction':
      toggleReaction(id, value);
      render();
      break;
    case 'share':
      shareCurrent(id, type);
      break;
    case 'vote-demand':
      toggleList('demandVotes', id);
      toast(state.demandVotes.includes(id) ? '「欲しい」に投票しました' : '投票を取り消しました');
      render();
      break;
    case 'pay-vote-demand':
      toggleList('payVotes', id);
      toast(state.payVotes.includes(id) ? '支払意思を登録しました' : '登録を取り消しました');
      render();
      break;
    case 'claim-service':
      if (!state.claimedServices.includes(id)) state.claimedServices.push(id);
      persist();
      toast('所有者確認リクエストを登録しました');
      render();
      break;
    case 'set-filter':
      state.filters[key] = value;
      persist();
      render();
      break;
    case 'toggle-solo-filter':
      state.filters.soloOnly = !state.filters.soloOnly;
      persist();
      render();
      break;
    case 'clear-filters':
      state.filters = structuredClone(defaultState.filters);
      persist();
      render();
      break;
    case 'set-service-filter':
      state.serviceFilters[key] = value;
      persist();
      render();
      break;
    case 'toggle-service-verified':
      state.serviceFilters.verified = !state.serviceFilters.verified;
      persist();
      render();
      break;
    case 'set-demand-filter':
      state.demandFilters[key] = value;
      persist();
      render();
      break;
    case 'set-signal-filter':
      state.signalFilters[key] = value;
      persist();
      render();
      break;
    case 'set-submit-tab':
      state.submitTab = value;
      persist();
      render();
      break;
    case 'toggle-preference':
      togglePreference(key, value);
      render();
      break;
    case 'complete-onboarding':
      state.preferences.onboarded = true;
      persist();
      toast('あなた向けの金脈フィードに更新しました');
      render();
      break;
    case 'dismiss-demo':
      state.demoNoticeDismissed = true;
      persist();
      render();
      break;
    case 'parse-service-url':
      parseServiceUrl();
      break;
    case 'remove-user-service':
      state.userServices = state.userServices.filter((service) => service.id !== id);
      persist();
      toast('掲載を削除しました');
      render();
      break;
    case 'remove-user-demand':
      state.userDemands = state.userDemands.filter((demand) => demand.id !== id);
      persist();
      toast('需要投稿を削除しました');
      render();
      break;
    case 'reset-local-data':
      localStorage.removeItem(STORAGE_KEY);
      state = structuredClone(defaultState);
      toast('ローカルデータを初期化しました');
      render();
      break;
    case 'navigate-result':
      state.searchOpen = false;
      window.location.hash = value;
      break;
    default:
      break;
  }
}

function handleSubmit(event) {
  const form = event.target;
  const formType = form.dataset.form;
  if (!formType) return;
  event.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());
  if (formType === 'service') submitService(data, form);
  if (formType === 'demand') submitDemand(data, form);
  if (formType === 'signal') submitSignal(data, form);
  if (formType === 'newsletter') {
    toast('週刊金脈レポートの登録を受け付けました（デモ）');
    form.reset();
  }
}

function toggleList(key, id) {
  const list = state[key];
  state[key] = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  persist();
}

function toggleReaction(id, reaction) {
  const current = state.reactions[id] || [];
  state.reactions[id] = current.includes(reaction)
    ? current.filter((item) => item !== reaction)
    : [...current, reaction];
  persist();
  toast(state.reactions[id].includes(reaction) ? '反応を記録しました' : '反応を取り消しました');
}

function togglePreference(key, value) {
  if (key === 'category') {
    const current = state.preferences.categories;
    state.preferences.categories = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
  } else {
    state.preferences[key] = !state.preferences[key];
  }
  persist();
}

async function shareCurrent(id, type) {
  const url = `${window.location.origin}${window.location.pathname}${routeFor(type || 'opportunity', id)}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'GOLDMINE RADAR', url });
    } else {
      await navigator.clipboard.writeText(url);
      toast('共有リンクをコピーしました');
    }
  } catch {
    // User cancellation should not surface as an error.
  }
}

function parseServiceUrl() {
  const input = document.querySelector('[name="url"]');
  const nameInput = document.querySelector('[name="name"]');
  const taglineInput = document.querySelector('[name="tagline"]');
  if (!input?.value) {
    toast('先にサービスURLを入力してください');
    return;
  }
  try {
    const parsed = new URL(input.value.startsWith('http') ? input.value : `https://${input.value}`);
    const base = parsed.hostname.replace(/^www\./, '').split('.')[0];
    const suggestedName = base
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    if (nameInput && !nameInput.value) nameInput.value = suggestedName;
    if (taglineInput && !taglineInput.value) taglineInput.value = `${suggestedName}が解決する問題を一文で入力してください`;
    toast('URLから基本情報の下書きを作りました');
  } catch {
    toast('正しいURLを入力してください');
  }
}

function submitService(data, form) {
  const id = safeId('service-user', `${data.name}-${Date.now()}`);
  const opportunityIds = data.opportunityId ? [data.opportunityId] : [];
  const service = {
    id,
    name: String(data.name || '').trim(),
    tagline: String(data.tagline || '').trim(),
    description: String(data.description || '').trim(),
    category: data.category || 'data-intelligence',
    url: String(data.url || '').trim(),
    pricing: String(data.pricing || '未設定').trim(),
    model: data.model || 'subscription',
    region: data.region || 'japan',
    languages: String(data.languages || '日本語').split(',').map((value) => value.trim()).filter(Boolean),
    stage: data.stage || 'early',
    owner: String(data.owner || 'ユーザー投稿').trim(),
    verified: false,
    evidenceGrade: 'D',
    launchedAt: new Date().toISOString().slice(0, 10),
    metrics: { mrr: Number(data.mrr || 0), users: Number(data.users || 0), growth: 0 },
    intents: [data.intent || 'customers'],
    tags: String(data.tags || '').split(',').map((value) => value.trim()).filter(Boolean),
    opportunityIds,
    votes: 0,
    featured: false,
    demo: false,
    userSubmitted: true
  };
  state.userServices.unshift(service);
  persist();
  form.reset();
  toast('サービスを掲載しました。未確認として公開されます');
  window.location.hash = `#/service/${id}`;
}

function submitDemand(data, form) {
  const id = safeId('demand-user', `${data.title}-${Date.now()}`);
  const demand = {
    id,
    title: String(data.title || '').trim(),
    summary: String(data.summary || '').trim(),
    audience: String(data.audience || '').trim(),
    region: data.region || 'japan',
    category: data.category || 'data-intelligence',
    willingnessToPay: String(data.willingnessToPay || '未設定').trim(),
    votes: 1,
    payVotes: data.payIntent === 'yes' ? 1 : 0,
    painScore: Number(data.painScore || 60),
    alternatives: String(data.alternatives || '').split(',').map((value) => value.trim()).filter(Boolean),
    gaps: String(data.gaps || '').split(',').map((value) => value.trim()).filter(Boolean),
    tags: String(data.tags || '').split(',').map((value) => value.trim()).filter(Boolean),
    opportunityIds: data.opportunityId ? [data.opportunityId] : [],
    serviceIds: [],
    createdAt: new Date().toISOString().slice(0, 10),
    userSubmitted: true
  };
  state.userDemands.unshift(demand);
  state.demandVotes.push(id);
  persist();
  form.reset();
  toast('需要を登録しました。共感票を集められます');
  window.location.hash = `#/demand/${id}`;
}

function submitSignal(data, form) {
  const id = safeId('signal-user', `${data.title}-${Date.now()}`);
  const signal = {
    id,
    title: String(data.title || '').trim(),
    amount: Number(data.amount || 0),
    amountLabel: String(data.amountLabel || formatYen(data.amount || 0)).trim(),
    type: data.type || 'revenue',
    typeLabel: data.typeLabel || 'ユーザー申告',
    sourceType: 'user-submission',
    evidenceGrade: 'D',
    date: data.date || new Date().toISOString().slice(0, 10),
    summary: String(data.summary || '').trim(),
    payer: String(data.payer || '不明').trim(),
    receiver: String(data.receiver || '不明').trim(),
    category: data.category || 'data-intelligence',
    region: data.region || 'japan',
    sourceName: String(data.sourceName || 'ユーザー投稿').trim(),
    sourceUrl: String(data.sourceUrl || '').trim(),
    confidence: 30,
    opportunityIds: data.opportunityId ? [data.opportunityId] : [],
    verified: false,
    demo: false,
    userSubmitted: true
  };
  state.userSignals.unshift(signal);
  persist();
  form.reset();
  toast('金の動きを投稿しました。検証前のDランクで表示されます');
  window.location.hash = `#/signal/${id}`;
}

function render() {
  const app = document.getElementById('app');
  const page = renderPage();
  const showRightRail = !['compare', 'submit', 'pricing', 'dashboard'].includes(currentRoute.page);
  app.innerHTML = `
    <div class="app-shell ${state.mobileMenuOpen ? 'menu-open' : ''}">
      ${renderSidebar()}
      <div class="app-frame">
        ${renderTopbar()}
        ${DEMO_MODE && !state.demoNoticeDismissed ? renderDemoNotice() : ''}
        <div class="content-grid ${showRightRail ? '' : 'content-grid--wide'}">
          <main class="main-content" id="main-content">${page}</main>
          ${showRightRail ? renderRightRail() : ''}
        </div>
        ${renderFooter()}
      </div>
      ${renderMobileNav()}
    </div>
  `;
  renderSearchModal();
}

function renderSidebar() {
  const nav = [
    ['discover', '発見する', '◇'],
    ['opportunities', '金脈', '◎'],
    ['signals', '金の動き', '↗'],
    ['services', 'サービス', '▦'],
    ['demands', '需要', '◌'],
    ['rankings', 'ランキング', 'Ⅰ'],
    ['goldmine', 'MY GOLDMINE', '◆']
  ];
  return `
    <aside class="sidebar ${state.mobileMenuOpen ? 'sidebar--open' : ''}">
      <a class="brand" href="#/discover" aria-label="GOLDMINE RADAR ホーム">
        <span class="brand-mark"><span></span><span></span><span></span></span>
        <span><strong>GOLDMINE</strong><small>RADAR</small></span>
      </a>
      <nav class="sidebar-nav" aria-label="主要メニュー">
        ${nav.map(([page, label, glyph]) => `
          <a href="#/${page}" class="nav-link ${currentRoute.page === page ? 'is-active' : ''}">
            <span class="nav-icon">${glyph}</span><span>${label}</span>
            ${page === 'goldmine' && state.savedOpportunities.length ? `<em>${state.savedOpportunities.length}</em>` : ''}
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-section">
        <p class="sidebar-label">FOR BUILDERS</p>
        <a href="#/submit" class="nav-link ${currentRoute.page === 'submit' ? 'is-active' : ''}">
          <span class="nav-icon">＋</span><span>掲載する</span>
        </a>
        <a href="#/dashboard" class="nav-link ${currentRoute.page === 'dashboard' ? 'is-active' : ''}">
          <span class="nav-icon">▤</span><span>掲載者ダッシュボード</span>
        </a>
      </div>
      <div class="sidebar-upgrade">
        <span class="eyebrow">RADAR PRO</span>
        <strong>他人より早く、変化を知る。</strong>
        <p>高度検索、比較、通知、履歴を解放。</p>
        <a href="#/pricing" class="button button--gold button--small">プランを見る</a>
      </div>
      <div class="sidebar-user">
        <span class="avatar">M</span>
        <div><strong>Explorer</strong><small>早期発見スコア ${earlyFinderScore()}</small></div>
      </div>
    </aside>
    <button class="sidebar-scrim" data-action="toggle-mobile-menu" aria-label="メニューを閉じる"></button>
  `;
}

function renderTopbar() {
  const compareCount = state.compare.length;
  return `
    <header class="topbar">
      <button class="icon-button mobile-menu-button" data-action="toggle-mobile-menu" aria-label="メニューを開く">☰</button>
      <button class="global-search" data-action="open-search" aria-label="データベースを検索">
        <span class="search-glyph">⌕</span>
        <span>サービス、金脈、金の動き、需要を検索</span>
        <kbd>⌘ K</kbd>
      </button>
      <div class="topbar-actions">
        ${compareCount ? `<a class="compare-pill" href="#/compare">比較 <strong>${compareCount}</strong></a>` : ''}
        <a href="#/submit" class="button button--outline button--small">＋ 掲載する</a>
        <a href="#/goldmine" class="icon-button" aria-label="保存した金脈">◆</a>
      </div>
    </header>
  `;
}

function renderDemoNotice() {
  return `
    <div class="demo-notice">
      <span><strong>体験用データで動作中。</strong> UI・保存・投稿・比較は実動作します。公開数字は本番投入前に出典検証します。</span>
      <button data-action="dismiss-demo" aria-label="閉じる">×</button>
    </div>
  `;
}

function renderPage() {
  switch (currentRoute.page) {
    case 'discover': return renderDiscover();
    case 'opportunities': return renderOpportunities();
    case 'opportunity': return renderOpportunityDetail(currentRoute.id);
    case 'signals': return renderSignals();
    case 'signal': return renderSignalDetail(currentRoute.id);
    case 'services': return renderServices();
    case 'service': return renderServiceDetail(currentRoute.id);
    case 'demands': return renderDemands();
    case 'demand': return renderDemandDetail(currentRoute.id);
    case 'rankings': return renderRankings();
    case 'goldmine': return renderGoldmine();
    case 'compare': return renderCompare();
    case 'submit': return renderSubmit();
    case 'dashboard': return renderDashboard();
    case 'pricing': return renderPricing();
    case 'about': return renderAbout();
    default: return renderNotFound();
  }
}

function renderDiscover() {
  const { opportunities, services, demands } = collections();
  const personalized = recommendForPreferences(opportunities, state.preferences);
  const featured = personalized.filter((item) => item.featured).slice(0, 1)[0] || personalized[0];
  const feed = personalized.filter((item) => item.id !== featured.id).slice(0, 6);
  const categoryHeat = categorySummary(categories, opportunities, services, demands).slice(0, 6);
  const freshServices = [...services].sort((a, b) => new Date(b.launchedAt) - new Date(a.launchedAt)).slice(0, 4);
  const strongDemands = [...demands]
    .sort((a, b) => gapStrength(b, b.serviceIds.length) - gapStrength(a, a.serviceIds.length))
    .slice(0, 4);

  return `
    ${!state.preferences.onboarded ? renderOnboarding() : ''}
    <section class="hero-section">
      <div class="hero-copy">
        <div class="live-label"><span></span> MONEY FLOW UPDATED TODAY</div>
        <h1>次に金持ちになる人は、<br><em>何を見ているのか。</em></h1>
        <p>世界中の「実際に金が動いた証拠」をつなぎ、まだ利益が残る市場と、あなたが入れる入口を発見する。</p>
        <div class="hero-actions">
          <a href="#/opportunities" class="button button--gold">今の金脈を見る <span>→</span></a>
          <button class="button button--ghost" data-action="open-search">DBを検索する</button>
        </div>
        <div class="hero-proof">
          <span><strong>${formatCompactNumber(editorialStats.signalsTracked)}</strong> 金銭シグナル</span>
          <span><strong>${formatCompactNumber(editorialStats.verifiedSources)}</strong> 根拠ソース</span>
          <span><strong>${editorialStats.updatedToday}</strong> 本日更新</span>
        </div>
      </div>
      <div class="hero-radar-card">
        <div class="radar-card-head">
          <div><span class="eyebrow">YOUR RADAR</span><strong>あなた向け上位金脈</strong></div>
          <span class="status-dot">LIVE</span>
        </div>
        <div class="radar-list">
          ${personalized.slice(0, 4).map((item, index) => `
            <a href="#/opportunity/${item.id}" class="radar-row">
              <span class="rank-number">0${index + 1}</span>
              <div class="radar-row-main">
                <strong>${escapeHTML(item.title)}</strong>
                <small>${escapeHTML(item.moneyLabel)}</small>
              </div>
              <div class="radar-score"><strong>${opportunityScore(item)}</strong><small>SCORE</small></div>
            </a>
          `).join('')}
        </div>
        <div class="radar-footer">
          <span>最終更新 7分前</span>
          <a href="#/opportunities">すべて見る →</a>
        </div>
      </div>
    </section>

    <section class="pulse-strip">
      ${renderPulseMetric('今日動いた金', '¥3.8B', '+12.4%', 'up')}
      ${renderPulseMetric('急上昇市場', '18', '+4', 'up')}
      ${renderPulseMetric('個人参入候補', '67', '+9', 'up')}
      ${renderPulseMetric('新規サービス', '36', 'TODAY', 'neutral')}
    </section>

    <section class="section-block">
      <div class="section-heading">
        <div><span class="eyebrow">TOP OPPORTUNITY</span><h2>今、最も強い金脈</h2></div>
        <a href="#/opportunities" class="text-link">すべての金脈を見る →</a>
      </div>
      ${renderFeaturedOpportunity(featured)}
    </section>

    <section class="section-block">
      <div class="section-heading">
        <div><span class="eyebrow">PERSONALIZED FEED</span><h2>あなたが入れそうな市場</h2></div>
        <span class="section-note">保存・反応から並び順が変わります</span>
      </div>
      <div class="opportunity-grid">
        ${feed.map((item) => renderOpportunityCard(item)).join('')}
      </div>
    </section>

    <section class="section-block">
      <div class="section-heading">
        <div><span class="eyebrow">MARKET HEAT</span><h2>金が集まり始めた分野</h2></div>
        <a href="#/signals" class="text-link">金の動きを確認 →</a>
      </div>
      <div class="heat-grid">
        ${categoryHeat.map(renderHeatCard).join('')}
      </div>
    </section>

    <section class="two-column-section section-block">
      <div>
        <div class="section-heading compact"><div><span class="eyebrow">NEW SERVICES</span><h2>金脈から生まれたサービス</h2></div><a href="#/services" class="text-link">一覧 →</a></div>
        <div class="service-stack">${freshServices.map(renderServiceRow).join('')}</div>
      </div>
      <div>
        <div class="section-heading compact"><div><span class="eyebrow">UNMET DEMAND</span><h2>まだ満たされていない需要</h2></div><a href="#/demands" class="text-link">一覧 →</a></div>
        <div class="demand-stack">${strongDemands.map(renderDemandRow).join('')}</div>
      </div>
    </section>

    <section class="cta-panel">
      <div><span class="eyebrow">BUILD THE NEXT SIGNAL</span><h2>すでに何か作っているなら、金脈の中へ載せる。</h2><p>無料掲載で、顧客、ベータ利用者、提携先、投資家に発見される。URLひとつから開始できます。</p></div>
      <a href="#/submit" class="button button--gold">無料で掲載する →</a>
    </section>
  `;
}

function renderOnboarding() {
  return `
    <section class="onboarding-card">
      <div class="onboarding-copy">
        <span class="eyebrow">MAKE IT YOUR RADAR</span>
        <h2>あなたが取れる金脈だけに絞る。</h2>
        <p>重い入力は不要。使える条件を数個選ぶだけです。</p>
      </div>
      <div class="preference-groups">
        <div><small>興味分野</small><div class="chip-row">${categories.slice(0, 6).map((category) => preferenceChip('category', category.id, category.label, state.preferences.categories.includes(category.id))).join('')}</div></div>
        <div><small>条件</small><div class="chip-row">
          ${preferenceChip('solo', 'true', '1人で作りたい', state.preferences.solo)}
          ${preferenceChip('lowBudget', 'true', '初期費用10万円以下', state.preferences.lowBudget)}
          ${preferenceChip('japan', 'true', '日本で売りたい', state.preferences.japan)}
        </div></div>
      </div>
      <button class="button button--gold" data-action="complete-onboarding">この条件で始める →</button>
    </section>
  `;
}

function preferenceChip(key, value, label, active) {
  return `<button class="filter-chip ${active ? 'is-active' : ''}" data-action="toggle-preference" data-key="${key}" data-value="${value}">${active ? '✓ ' : ''}${escapeHTML(label)}</button>`;
}

function renderPulseMetric(label, value, change, tone) {
  return `<div class="pulse-metric"><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong><em class="trend-${tone}">${escapeHTML(change)}</em></div>`;
}

function renderFeaturedOpportunity(item) {
  const saved = state.savedOpportunities.includes(item.id);
  const followed = state.followedOpportunities.includes(item.id);
  const compared = state.compare.includes(item.id);
  return `
    <article class="featured-opportunity">
      <div class="featured-main">
        <div class="card-topline">
          <span class="category-badge">${escapeHTML(getCategoryLabel(categories, item.category))}</span>
          ${evidenceBadge(item.evidenceGrade)}
          <span class="fresh-badge">${item.freshnessDays}日前更新</span>
        </div>
        <h3><a href="#/opportunity/${item.id}">${escapeHTML(item.title)}</a></h3>
        <p class="featured-hook">${escapeHTML(item.hook)}</p>
        <div class="featured-money"><small>確認された金の動き</small><strong>${escapeHTML(item.moneyLabel)}</strong></div>
        <div class="reason-list">
          ${item.reasons.slice(0, 3).map((reason) => `<span><i>✓</i>${escapeHTML(reason)}</span>`).join('')}
        </div>
        <div class="tag-row">${item.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join('')}</div>
      </div>
      <div class="featured-analysis">
        <div class="score-display"><span>OPPORTUNITY SCORE</span><strong>${opportunityScore(item)}</strong><small>/100</small></div>
        <div class="score-bars">
          ${metricBar('勢い', item.momentum)}
          ${metricBar('空白', item.gapScore)}
          ${metricBar('作りやすさ', item.buildability)}
        </div>
        <div class="mini-chart">${sparkline(item.trend, 'large')}</div>
        <div class="featured-entry"><small>あなたが入れる入口</small><strong>${escapeHTML(item.openings[0])}</strong><a href="#/opportunity/${item.id}">根拠と実行手順を見る →</a></div>
        <div class="card-actions">
          <button class="action-button ${saved ? 'is-active' : ''}" data-action="toggle-save" data-id="${item.id}">${saved ? '◆ 保存済み' : '◇ 保存'}</button>
          <button class="action-button ${followed ? 'is-active' : ''}" data-action="toggle-follow" data-id="${item.id}">${followed ? '● 追跡中' : '○ 追跡'}</button>
          <button class="action-button ${compared ? 'is-active' : ''}" data-action="toggle-compare" data-id="${item.id}">比較</button>
        </div>
      </div>
    </article>
  `;
}

function renderOpportunityCard(item, options = {}) {
  const saved = state.savedOpportunities.includes(item.id);
  const compared = state.compare.includes(item.id);
  const reactions = state.reactions[item.id] || [];
  return `
    <article class="opportunity-card ${options.compact ? 'opportunity-card--compact' : ''}">
      <div class="card-topline">
        <span class="category-badge">${escapeHTML(getCategoryLabel(categories, item.category))}</span>
        ${evidenceBadge(item.evidenceGrade)}
        ${item.status === 'gold-window' ? '<span class="window-badge">GOLD WINDOW</span>' : ''}
      </div>
      <a class="card-title-link" href="#/opportunity/${item.id}"><h3>${escapeHTML(item.title)}</h3></a>
      <p>${escapeHTML(item.hook)}</p>
      <div class="card-money"><span>金の証拠</span><strong>${escapeHTML(item.moneyLabel)}</strong></div>
      <div class="card-score-row">
        <div><small>SCORE</small><strong>${opportunityScore(item)}</strong></div>
        <div><small>MOMENTUM</small><strong>${item.momentum}</strong></div>
        <div class="spark-cell">${sparkline(item.trend)}</div>
      </div>
      <div class="entry-box"><small>残っている入口</small><span>${escapeHTML(item.openings[0])}</span></div>
      <div class="meta-row"><span>${escapeHTML(item.budgetBand)}</span><span>${escapeHTML(item.timeToMvp)}</span><span>${item.soloFriendly ? '1人向け' : 'チーム向け'}</span></div>
      <div class="reaction-row">
        ${reactionButton(item.id, 'profitable', '儲かりそう', reactions)}
        ${reactionButton(item.id, 'buildable', '作れそう', reactions)}
        ${reactionButton(item.id, 'want', '欲しい', reactions)}
      </div>
      <div class="card-actions card-actions--bordered">
        <button class="action-button ${saved ? 'is-active' : ''}" data-action="toggle-save" data-id="${item.id}">${saved ? '◆ 保存済み' : '◇ 保存'}</button>
        <button class="action-button ${compared ? 'is-active' : ''}" data-action="toggle-compare" data-id="${item.id}">${compared ? '✓ 比較中' : '＋ 比較'}</button>
        <a class="action-button action-link" href="#/opportunity/${item.id}">詳しく見る →</a>
      </div>
    </article>
  `;
}

function reactionButton(id, value, label, activeList) {
  const active = activeList.includes(value);
  return `<button class="reaction-button ${active ? 'is-active' : ''}" data-action="reaction" data-id="${id}" data-value="${value}">${active ? '●' : '○'} ${label}</button>`;
}

function renderHeatCard(category) {
  return `
    <a href="#/opportunities" class="heat-card" data-category="${category.id}">
      <div class="heat-card-top"><span class="category-monogram">${category.icon}</span><strong>${escapeHTML(category.label)}</strong><em>${category.heat}</em></div>
      <div class="heat-bar"><span style="width:${clamp(category.heat, 0, 100)}%"></span></div>
      <div class="heat-stats"><span>${category.opportunityCount} 金脈</span><span>${category.demandCount} 需要</span><span>${category.serviceCount} サービス</span></div>
    </a>
  `;
}

function renderServiceRow(service) {
  return `
    <a class="service-row" href="#/service/${service.id}">
      <span class="service-logo">${initials(service.name)}</span>
      <div class="service-row-copy"><strong>${escapeHTML(service.name)}</strong><small>${escapeHTML(service.tagline)}</small></div>
      <div class="service-row-metric"><strong>${service.metrics.mrr ? formatYen(service.metrics.mrr) : '未公開'}</strong><small>MRR</small></div>
      <span class="row-arrow">→</span>
    </a>
  `;
}

function renderDemandRow(demand) {
  const strength = gapStrength(demand, demand.serviceIds.length);
  return `
    <a class="demand-row" href="#/demand/${demand.id}">
      <div class="demand-score"><strong>${strength}</strong><small>GAP</small></div>
      <div><strong>${escapeHTML(demand.title)}</strong><small>${demand.votes + (state.demandVotes.includes(demand.id) ? 1 : 0)}人が欲しい・${demand.payVotes + (state.payVotes.includes(demand.id) ? 1 : 0)}人に支払意思</small></div>
      <span class="row-arrow">→</span>
    </a>
  `;
}

function renderOpportunities() {
  const { opportunities } = collections();
  const filtered = sortOpportunities(filterOpportunities(opportunities, state.filters), state.filters.sort);
  return `
    ${renderPageHeader('OPPORTUNITY DATABASE', '金脈を探す', '実際に金が動いた証拠、需要の空白、作りやすさを一つの画面で比較する。')}
    <section class="filter-panel">
      <label class="inline-search"><span>⌕</span><input value="${escapeHTML(state.filters.query)}" data-filter-input="opportunity" placeholder="業界、顧客、問題、技術で検索"></label>
      <div class="filter-row">
        ${selectControl('category', state.filters.category, [['all', 'すべての分野'], ...categories.map((c) => [c.id, c.label])], 'set-filter')}
        ${selectControl('region', state.filters.region, [['all', 'すべての地域'], ['japan', '日本'], ['global', 'グローバル']], 'set-filter')}
        ${selectControl('evidence', state.filters.evidence, [['all', '根拠すべて'], ['A', 'A 一次根拠'], ['B', 'B 直接開示'], ['C', 'C 推定']], 'set-filter')}
        ${selectControl('sort', state.filters.sort, [['score', '総合スコア順'], ['momentum', '勢い順'], ['gap', '空白順'], ['buildability', '作りやすさ順'], ['money', '金額順'], ['new', '新着順']], 'set-filter')}
        <button class="filter-toggle ${state.filters.soloOnly ? 'is-active' : ''}" data-action="toggle-solo-filter">${state.filters.soloOnly ? '✓' : '○'} 1人で作れる</button>
      </div>
      <div class="filter-summary"><span><strong>${filtered.length}</strong> 件の金脈</span>${activeOpportunityFilterCount() ? '<button data-action="clear-filters">条件を解除</button>' : ''}</div>
    </section>
    ${state.compare.length ? `<div class="compare-banner"><span>${state.compare.length}件を比較リストに追加中</span><a href="#/compare" class="button button--gold button--small">比較する →</a></div>` : ''}
    <div class="opportunity-grid opportunity-grid--list">${filtered.length ? filtered.map((item) => renderOpportunityCard(item)).join('') : renderEmpty('条件に一致する金脈がありません', '検索条件を減らしてください。')}</div>
  `;
}

function renderOpportunityDetail(id) {
  const { opportunities, signals, services, demands } = collections();
  const item = opportunities.find((opportunity) => opportunity.id === id);
  if (!item) return renderNotFound();
  const linkedSignals = signals.filter((signal) => item.signalIds.includes(signal.id));
  const linkedServices = services.filter((service) => service.opportunityIds?.includes(item.id));
  const linkedDemands = demands.filter((demand) => demand.opportunityIds?.includes(item.id));
  const saved = state.savedOpportunities.includes(item.id);
  const followed = state.followedOpportunities.includes(item.id);
  const compared = state.compare.includes(item.id);

  return `
    ${renderBreadcrumbs([['金脈', '#/opportunities'], [item.title, '']])}
    <article class="detail-hero">
      <div class="detail-hero-main">
        <div class="card-topline"><span class="category-badge">${escapeHTML(getCategoryLabel(categories, item.category))}</span>${evidenceBadge(item.evidenceGrade)}<span class="window-badge">${item.status === 'gold-window' ? 'GOLD WINDOW' : 'WATCH'}</span></div>
        <h1>${escapeHTML(item.title)}</h1>
        <p class="detail-lead">${escapeHTML(item.hook)}</p>
        <div class="tag-row">${item.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join('')}</div>
      </div>
      <div class="detail-score-panel">
        <div class="score-display score-display--hero"><span>OPPORTUNITY SCORE</span><strong>${opportunityScore(item)}</strong><small>/100</small></div>
        <div class="detail-score-chart">${sparkline(item.trend, 'large')}</div>
        <small>${item.freshnessDays}日前更新・根拠${item.evidenceGrade}</small>
      </div>
    </article>

    <div class="detail-layout">
      <div class="detail-body">
        <section class="detail-section money-proof-section">
          <div class="section-label">01 / MONEY PROOF</div>
          <h2>何に、いくら金が動いたか</h2>
          <div class="money-proof-card"><div><small>確認された金額</small><strong>${escapeHTML(item.moneyLabel)}</strong></div><div><small>意味</small><span>${moneyTypeExplanation(item.moneyType)}</span></div></div>
          ${linkedSignals.length ? linkedSignals.map(renderLinkedSignal).join('') : '<p class="muted">関連シグナルを検証中です。</p>'}
        </section>

        <section class="detail-section">
          <div class="section-label">02 / WHY NOW</div>
          <h2>なぜ今、この需要が生まれているか</h2>
          <p>${escapeHTML(item.summary)}</p>
          <div class="reason-grid">${item.reasons.map((reason, index) => `<div><span>0${index + 1}</span><strong>${escapeHTML(reason)}</strong></div>`).join('')}</div>
        </section>

        <section class="detail-section opening-section">
          <div class="section-label">03 / OPEN ENTRY</div>
          <h2>まだ残っている入口</h2>
          <div class="opening-grid">${item.openings.map((opening, index) => `<article><span>ENTRY 0${index + 1}</span><h3>${escapeHTML(opening)}</h3><p>${entryExplanation(opening, item)}</p></article>`).join('')}</div>
        </section>

        <section class="detail-section">
          <div class="section-label">04 / EXECUTION</div>
          <h2>最初の7日で確認すること</h2>
          <ol class="execution-list">${item.nextSteps.map((step, index) => `<li><span>${index + 1}</span><div><strong>${escapeHTML(step)}</strong><small>${executionHint(index)}</small></div></li>`).join('')}</ol>
          <div class="execution-meta">${detailMeta('初期予算', item.budgetBand)}${detailMeta('MVP目安', item.timeToMvp)}${detailMeta('個人開発', item.soloFriendly ? '適性あり' : 'チーム推奨')}${detailMeta('対象地域', item.region === 'japan' ? '日本' : 'グローバル')}</div>
        </section>

        <section class="detail-section">
          <div class="section-label">05 / RISKS</div>
          <h2>失敗しやすい点</h2>
          <div class="risk-list">${item.risks.map((risk) => `<div><span>!</span><p>${escapeHTML(risk)}</p></div>`).join('')}</div>
        </section>

        <section class="detail-section">
          <div class="section-heading compact"><div><div class="section-label">06 / EXISTING PRODUCTS</div><h2>すでにこの需要を狙うサービス</h2></div><a href="#/submit" class="text-link">自分のサービスを追加 →</a></div>
          ${linkedServices.length ? `<div class="service-stack">${linkedServices.map(renderServiceRow).join('')}</div>` : renderEmpty('掲載サービスはまだありません', '先に作れば、この需要の最初の候補になれます。')}
        </section>

        <section class="detail-section">
          <div class="section-label">07 / DEMAND</div>
          <h2>ユーザーが実際に欲しがっていること</h2>
          ${linkedDemands.length ? `<div class="demand-stack">${linkedDemands.map(renderDemandRow).join('')}</div>` : '<p class="muted">需要投稿を募集中です。</p>'}
        </section>
      </div>
      <aside class="detail-sidebar">
        <div class="sticky-action-card">
          <span class="eyebrow">YOUR DECISION</span>
          <h3>この金脈をどう扱う？</h3>
          <button class="button ${saved ? 'button--gold' : 'button--outline'} button--full" data-action="toggle-save" data-id="${item.id}">${saved ? '◆ MY GOLDMINEに保存済み' : '◇ MY GOLDMINEへ保存'}</button>
          <button class="button ${followed ? 'button--soft' : 'button--ghost'} button--full" data-action="toggle-follow" data-id="${item.id}">${followed ? '● 変化を追跡中' : '○ 市場変化を追跡'}</button>
          <button class="button ${compared ? 'button--soft' : 'button--ghost'} button--full" data-action="toggle-compare" data-id="${item.id}">${compared ? '✓ 比較リスト入り' : '＋ 他の金脈と比較'}</button>
          <div class="divider"></div>
          <small>あなたの反応</small>
          <div class="vertical-reactions">
            ${reactionButton(item.id, 'profitable', '儲かりそう', state.reactions[item.id] || [])}
            ${reactionButton(item.id, 'buildable', '俺にも作れそう', state.reactions[item.id] || [])}
            ${reactionButton(item.id, 'want', '自分が欲しい', state.reactions[item.id] || [])}
          </div>
          <div class="divider"></div>
          <button class="share-button" data-action="share" data-id="${item.id}" data-type="opportunity">共有リンクをコピー ↗</button>
        </div>
        <div class="evidence-card">
          <span class="eyebrow">EVIDENCE QUALITY</span>
          <div class="evidence-grade-large">${item.evidenceGrade}</div>
          <strong>${evidenceMeta(item.evidenceGrade).label}</strong>
          <p>${evidenceMeta(item.evidenceGrade).detail}</p>
          <a href="#/about">検証方法を見る →</a>
        </div>
      </aside>
    </div>
  `;
}

function renderLinkedSignal(signal) {
  return `
    <a href="#/signal/${signal.id}" class="linked-signal">
      <div class="signal-flow-mini"><span>${escapeHTML(signal.payer)}</span><i>→</i><span>${escapeHTML(signal.receiver)}</span></div>
      <div><strong>${escapeHTML(signal.title)}</strong><small>${escapeHTML(signal.amountLabel)}・${escapeHTML(signal.typeLabel)}</small></div>
      <span class="evidence-letter">${signal.evidenceGrade}</span>
    </a>
  `;
}

function renderSignals() {
  const { signals } = collections();
  const filter = state.signalFilters;
  let filtered = signals.filter((signal) => {
    if (filter.query && !matchesQuery(signal, filter.query)) return false;
    if (filter.category !== 'all' && signal.category !== filter.category) return false;
    if (filter.grade !== 'all' && signal.evidenceGrade !== filter.grade) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    if (filter.sort === 'amount') return b.amount - a.amount;
    if (filter.sort === 'confidence') return b.confidence - a.confidence;
    return new Date(b.date) - new Date(a.date);
  });
  const total = filtered.reduce((sum, signal) => sum + Number(signal.amount || 0), 0);
  return `
    ${renderPageHeader('MONEY SIGNALS', '金は、どこからどこへ動いたか', '売上、契約、政府支出、広告費、M&Aを同じ数字として混ぜず、意味を分けて追跡する。')}
    <section class="signal-summary">
      <div><span>表示中の観測金額</span><strong>${formatYen(total)}</strong><small>種類の異なる金額の単純合計。市場規模ではありません。</small></div>
      <div>${renderSignalTypeLegend()}</div>
    </section>
    <section class="filter-panel">
      <label class="inline-search"><span>⌕</span><input value="${escapeHTML(filter.query)}" data-filter-input="signal" placeholder="支払者、受取者、業界で検索"></label>
      <div class="filter-row">
        ${selectControl('category', filter.category, [['all', 'すべての分野'], ...categories.map((c) => [c.id, c.label])], 'set-signal-filter')}
        ${selectControl('grade', filter.grade, [['all', '根拠すべて'], ['A', 'A 一次根拠'], ['B', 'B 直接開示'], ['C', 'C 推定'], ['D', 'D 未確認']], 'set-signal-filter')}
        ${selectControl('sort', filter.sort, [['new', '新着順'], ['amount', '金額順'], ['confidence', '信頼度順']], 'set-signal-filter')}
      </div>
    </section>
    <div class="signal-timeline">${filtered.map(renderSignalCard).join('')}</div>
  `;
}

function renderSignalCard(signal) {
  return `
    <article class="signal-card">
      <div class="signal-date"><strong>${signal.date.slice(5).replace('-', '/')}</strong><small>${signal.date.slice(0, 4)}</small></div>
      <div class="signal-card-main">
        <div class="card-topline">${evidenceBadge(signal.evidenceGrade)}<span class="category-badge">${escapeHTML(getCategoryLabel(categories, signal.category))}</span><span class="type-badge">${escapeHTML(signal.typeLabel)}</span></div>
        <h3><a href="#/signal/${signal.id}">${escapeHTML(signal.title)}</a></h3>
        <p>${escapeHTML(signal.summary)}</p>
        <div class="money-flow"><span><small>払った側</small><strong>${escapeHTML(signal.payer)}</strong></span><i>→</i><span><small>受け取った側</small><strong>${escapeHTML(signal.receiver)}</strong></span></div>
      </div>
      <div class="signal-amount"><small>観測金額</small><strong>${escapeHTML(signal.amountLabel)}</strong><span>信頼度 ${signal.confidence}%</span><a href="#/signal/${signal.id}">根拠を見る →</a></div>
    </article>
  `;
}

function renderSignalDetail(id) {
  const { signals, opportunities } = collections();
  const signal = signals.find((item) => item.id === id);
  if (!signal) return renderNotFound();
  const linked = opportunities.filter((item) => signal.opportunityIds?.includes(item.id));
  const evidence = evidenceMeta(signal.evidenceGrade);
  return `
    ${renderBreadcrumbs([['金の動き', '#/signals'], [signal.title, '']])}
    <article class="signal-detail-hero">
      <div><div class="card-topline">${evidenceBadge(signal.evidenceGrade)}<span class="type-badge">${escapeHTML(signal.typeLabel)}</span><span class="category-badge">${escapeHTML(getCategoryLabel(categories, signal.category))}</span></div><h1>${escapeHTML(signal.title)}</h1><p>${escapeHTML(signal.summary)}</p></div>
      <div class="signal-big-amount"><small>OBSERVED MONEY</small><strong>${escapeHTML(signal.amountLabel)}</strong><span>${signal.date}</span></div>
    </article>
    <section class="flow-diagram">
      <div><small>PAYER</small><strong>${escapeHTML(signal.payer)}</strong><span>この問題を解決するために支出</span></div>
      <div class="flow-arrow"><span>${escapeHTML(signal.amountLabel)}</span><i>→</i><small>${escapeHTML(signal.typeLabel)}</small></div>
      <div><small>RECEIVER</small><strong>${escapeHTML(signal.receiver)}</strong><span>商品・サービス・契約を提供</span></div>
    </section>
    <div class="detail-layout">
      <div class="detail-body">
        <section class="detail-section"><div class="section-label">01 / WHAT IT MEANS</div><h2>この数字が意味するもの</h2><p>${escapeHTML(signalTypeDescription(signal.type))}</p><div class="callout"><strong>注意</strong><p>売上、利益、資金調達、契約上限、推定市場支出は別物です。このシグナルは「${escapeHTML(signal.typeLabel)}」として扱っています。</p></div></section>
        <section class="detail-section"><div class="section-label">02 / EVIDENCE</div><h2>根拠と信頼度</h2><div class="evidence-detail"><div class="evidence-grade-large">${signal.evidenceGrade}</div><div><strong>${evidence.label}</strong><p>${evidence.detail}</p><span>信頼度 ${signal.confidence}%</span></div></div><dl class="source-list"><div><dt>根拠種別</dt><dd>${escapeHTML(signal.sourceType)}</dd></div><div><dt>出典</dt><dd>${escapeHTML(signal.sourceName)}</dd></div><div><dt>検証状態</dt><dd>${signal.verified ? '確認済み' : '未確認・追加検証中'}</dd></div><div><dt>対象地域</dt><dd>${signal.region === 'japan' ? '日本' : 'グローバル'}</dd></div></dl></section>
        <section class="detail-section"><div class="section-label">03 / OPPORTUNITIES</div><h2>この金の動きから生まれる機会</h2>${linked.length ? `<div class="opportunity-grid">${linked.map((item) => renderOpportunityCard(item, { compact: true })).join('')}</div>` : renderEmpty('まだ事業機会へ変換されていません', '編集部が需要・競合・参入余地を確認中です。')}</section>
      </div>
      <aside class="detail-sidebar"><div class="sticky-action-card"><span class="eyebrow">CONTRIBUTE</span><h3>根拠を追加する</h3><p>一次資料、本人開示、料金、成約情報を追加し、信頼度を上げられます。</p><a class="button button--outline button--full" href="#/submit">金の動きを投稿</a><button class="share-button" data-action="share" data-id="${signal.id}" data-type="signal">共有リンクをコピー ↗</button></div></aside>
    </div>
  `;
}

function renderServices() {
  const { services } = collections();
  const filter = state.serviceFilters;
  let filtered = services.filter((service) => {
    if (filter.query && !matchesQuery(service, filter.query)) return false;
    if (filter.category !== 'all' && service.category !== filter.category) return false;
    if (filter.intent !== 'all' && !service.intents.includes(filter.intent)) return false;
    if (filter.verified && !service.verified) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    if (filter.sort === 'mrr') return b.metrics.mrr - a.metrics.mrr;
    if (filter.sort === 'growth') return b.metrics.growth - a.metrics.growth;
    if (filter.sort === 'new') return new Date(b.launchedAt) - new Date(a.launchedAt);
    return b.votes - a.votes;
  });
  return `
    ${renderPageHeader('PRODUCT & SERVICE DATABASE', '金脈を狙っているサービス', '発見する人、買う人、作る人、提携したい人を同じ市場ページへ接続する。', '<a href="#/submit" class="button button--gold">＋ 自分のサービスを掲載</a>')}
    <section class="filter-panel">
      <label class="inline-search"><span>⌕</span><input value="${escapeHTML(filter.query)}" data-filter-input="service" placeholder="サービス名、問題、顧客、タグで検索"></label>
      <div class="filter-row">
        ${selectControl('category', filter.category, [['all', 'すべての分野'], ...categories.map((c) => [c.id, c.label])], 'set-service-filter')}
        ${selectControl('intent', filter.intent, [['all', '目的すべて'], ['customers', '顧客募集中'], ['beta-users', 'ベータ利用者募集'], ['partners', '提携先募集'], ['affiliates', '紹介者募集'], ['experts', '専門家募集']], 'set-service-filter')}
        ${selectControl('sort', filter.sort, [['popular', '注目順'], ['mrr', 'MRR順'], ['growth', '成長率順'], ['new', '新着順']], 'set-service-filter')}
        <button class="filter-toggle ${filter.verified ? 'is-active' : ''}" data-action="toggle-service-verified">${filter.verified ? '✓' : '○'} 所有者・根拠確認済み</button>
      </div>
      <div class="filter-summary"><span><strong>${filtered.length}</strong> サービス</span></div>
    </section>
    <div class="service-grid">${filtered.map(renderServiceCard).join('')}</div>
  `;
}

function renderServiceCard(service) {
  const verified = service.verified || state.claimedServices.includes(service.id);
  return `
    <article class="service-card">
      <div class="service-card-head"><span class="service-logo service-logo--large">${initials(service.name)}</span><div class="service-status">${verified ? '<span class="verified-badge">✓ VERIFIED</span>' : '<span class="unverified-badge">UNVERIFIED</span>'}<small>${escapeHTML(service.stage.toUpperCase())}</small></div></div>
      <a href="#/service/${service.id}" class="card-title-link"><h3>${escapeHTML(service.name)}</h3></a>
      <p>${escapeHTML(service.tagline)}</p>
      <div class="service-pricing"><span>${escapeHTML(service.pricing)}</span><small>${escapeHTML(modelLabel(service.model))}</small></div>
      <div class="service-metrics"><div><strong>${service.metrics.mrr ? formatYen(service.metrics.mrr) : '—'}</strong><small>MRR</small></div><div><strong>${formatCompactNumber(service.metrics.users)}</strong><small>USERS</small></div><div><strong class="trend-up">+${service.metrics.growth}%</strong><small>GROWTH</small></div></div>
      <div class="intent-row">${service.intents.slice(0, 3).map((intent) => `<span>${intentLabel(intent)}</span>`).join('')}</div>
      <div class="card-actions card-actions--bordered"><a class="action-button action-link" href="#/service/${service.id}">詳細を見る →</a>${service.opportunityIds?.[0] ? `<a class="action-button action-link" href="#/opportunity/${service.opportunityIds[0]}">関連金脈</a>` : ''}</div>
    </article>
  `;
}

function renderServiceDetail(id) {
  const { services, opportunities, demands } = collections();
  const service = services.find((item) => item.id === id);
  if (!service) return renderNotFound();
  const linkedOpportunities = opportunities.filter((item) => service.opportunityIds?.includes(item.id));
  const linkedDemands = demands.filter((item) => item.serviceIds?.includes(service.id));
  const claimed = service.verified || state.claimedServices.includes(service.id);
  const views = (state.serviceViews[service.id] || 0) + (service.demo ? 1264 : 0);
  return `
    ${renderBreadcrumbs([['サービス', '#/services'], [service.name, '']])}
    <article class="service-detail-hero">
      <span class="service-logo service-logo--hero">${initials(service.name)}</span>
      <div class="service-detail-copy"><div class="card-topline"><span class="category-badge">${escapeHTML(getCategoryLabel(categories, service.category))}</span>${claimed ? '<span class="verified-badge">✓ 所有者確認済み</span>' : '<span class="unverified-badge">未確認掲載</span>'}</div><h1>${escapeHTML(service.name)}</h1><p>${escapeHTML(service.tagline)}</p><div class="intent-row">${service.intents.map((intent) => `<span>${intentLabel(intent)}</span>`).join('')}</div></div>
      <div class="service-detail-actions">${service.url ? `<a href="${escapeHTML(service.url)}" class="button button--gold" target="_blank" rel="noopener noreferrer">サービスを開く ↗</a>` : '<button class="button button--gold" disabled>デモ掲載</button>'}<button class="button button--outline" data-action="share" data-id="${service.id}" data-type="service">共有</button></div>
    </article>
    <section class="service-kpi-strip">
      <div><small>料金</small><strong>${escapeHTML(service.pricing)}</strong></div><div><small>推定MRR</small><strong>${service.metrics.mrr ? formatYen(service.metrics.mrr) : '未公開'}</strong></div><div><small>利用者</small><strong>${formatCompactNumber(service.metrics.users)}</strong></div><div><small>直近成長</small><strong class="trend-up">+${service.metrics.growth}%</strong></div><div><small>DB閲覧</small><strong>${formatCompactNumber(views)}</strong></div>
    </section>
    <div class="detail-layout">
      <div class="detail-body">
        <section class="detail-section"><div class="section-label">01 / PRODUCT</div><h2>何を、誰に売っているか</h2><p>${escapeHTML(service.description)}</p><dl class="source-list"><div><dt>対象地域</dt><dd>${service.region === 'japan' ? '日本' : 'グローバル'}</dd></div><div><dt>言語</dt><dd>${service.languages.map(escapeHTML).join('・')}</dd></div><div><dt>収益モデル</dt><dd>${escapeHTML(modelLabel(service.model))}</dd></div><div><dt>運営</dt><dd>${escapeHTML(service.owner)}</dd></div><div><dt>公開日</dt><dd>${service.launchedAt}</dd></div><div><dt>根拠ランク</dt><dd>${service.evidenceGrade}</dd></div></dl></section>
        <section class="detail-section"><div class="section-heading compact"><div><div class="section-label">02 / OPPORTUNITY</div><h2>このサービスが狙う金脈</h2></div></div>${linkedOpportunities.length ? `<div class="opportunity-grid">${linkedOpportunities.map((item) => renderOpportunityCard(item, { compact: true })).join('')}</div>` : renderEmpty('関連金脈は未設定です', '掲載者が市場を紐付けると発見されやすくなります。')}</section>
        <section class="detail-section"><div class="section-label">03 / DEMAND</div><h2>接続されている需要</h2>${linkedDemands.length ? `<div class="demand-stack">${linkedDemands.map(renderDemandRow).join('')}</div>` : renderEmpty('需要との接続はまだありません', 'このサービスを欲しい人の投稿が紐付くと表示されます。')}</section>
      </div>
      <aside class="detail-sidebar">
        <div class="sticky-action-card">
          <span class="eyebrow">FOR THE OWNER</span>
          <h3>${claimed ? '掲載者ダッシュボード' : 'あなたのサービスですか？'}</h3>
          <p>${claimed ? '閲覧、保存、関連需要、流入元を確認できます。' : '所有者確認すると、内容編集、分析、募集目的、問い合わせを管理できます。'}</p>
          ${claimed ? '<a href="#/dashboard" class="button button--gold button--full">分析を見る →</a>' : `<button class="button button--gold button--full" data-action="claim-service" data-id="${service.id}">このページをClaim</button>`}
          <div class="owner-stats"><span><strong>${formatCompactNumber(views)}</strong><small>閲覧</small></span><span><strong>${service.votes}</strong><small>注目</small></span><span><strong>${linkedDemands.reduce((sum, item) => sum + item.votes, 0)}</strong><small>関連需要</small></span></div>
        </div>
        <div class="evidence-card"><span class="eyebrow">VERIFICATION</span><div class="evidence-grade-large">${service.evidenceGrade}</div><strong>${evidenceMeta(service.evidenceGrade).label}</strong><p>${service.verified ? '所有者または公開資料を確認しています。' : 'ユーザー投稿またはデモ情報です。数字を利用する前に根拠を確認してください。'}</p></div>
      </aside>
    </div>
  `;
}

function renderDemands() {
  const { demands } = collections();
  const filter = state.demandFilters;
  let filtered = demands.filter((demand) => {
    if (filter.query && !matchesQuery(demand, filter.query)) return false;
    if (filter.category !== 'all' && demand.category !== filter.category) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => {
    if (filter.sort === 'votes') return b.votes - a.votes;
    if (filter.sort === 'pay') return b.payVotes - a.payVotes;
    if (filter.sort === 'new') return new Date(b.createdAt) - new Date(a.createdAt);
    return gapStrength(b, b.serviceIds.length) - gapStrength(a, a.serviceIds.length);
  });
  return `
    ${renderPageHeader('UNMET DEMAND DATABASE', '欲しい人はいる。まだ十分な商品がない。', '検索、投票、支払意思、既存サービスへの不満を集め、次に作るべきものを見つける。', '<a href="#/submit" class="button button--gold">＋ 需要を投稿</a>')}
    <section class="demand-hero-stats"><div><strong>${formatCompactNumber(filtered.reduce((sum, item) => sum + item.votes, 0))}</strong><span>「欲しい」票</span></div><div><strong>${formatCompactNumber(filtered.reduce((sum, item) => sum + item.payVotes, 0))}</strong><span>支払意思</span></div><div><strong>${Math.round(filtered.reduce((sum, item) => sum + item.painScore, 0) / Math.max(1, filtered.length))}</strong><span>平均痛みスコア</span></div></section>
    <section class="filter-panel">
      <label class="inline-search"><span>⌕</span><input value="${escapeHTML(filter.query)}" data-filter-input="demand" placeholder="欲しいもの、困り事、業界で検索"></label>
      <div class="filter-row">${selectControl('category', filter.category, [['all', 'すべての分野'], ...categories.map((c) => [c.id, c.label])], 'set-demand-filter')}${selectControl('sort', filter.sort, [['gap', '機会の強さ順'], ['votes', '欲しい票順'], ['pay', '支払意思順'], ['new', '新着順']], 'set-demand-filter')}</div>
    </section>
    <div class="demand-grid">${filtered.map(renderDemandCard).join('')}</div>
  `;
}

function renderDemandCard(demand) {
  const wanted = state.demandVotes.includes(demand.id);
  const pay = state.payVotes.includes(demand.id);
  const strength = gapStrength(demand, demand.serviceIds.length);
  return `
    <article class="demand-card">
      <div class="demand-card-score"><strong>${strength}</strong><span>GAP SCORE</span></div>
      <div class="card-topline"><span class="category-badge">${escapeHTML(getCategoryLabel(categories, demand.category))}</span><span class="type-badge">${escapeHTML(demand.audience)}</span></div>
      <a class="card-title-link" href="#/demand/${demand.id}"><h3>${escapeHTML(demand.title)}</h3></a>
      <p>${escapeHTML(demand.summary)}</p>
      <div class="demand-numbers"><div><strong>${demand.votes + (wanted ? 1 : 0)}</strong><small>欲しい</small></div><div><strong>${demand.payVotes + (pay ? 1 : 0)}</strong><small>払ってもよい</small></div><div><strong>${demand.painScore}</strong><small>痛み</small></div><div><strong>${demand.serviceIds.length}</strong><small>既存候補</small></div></div>
      <div class="willingness"><small>支払意思</small><strong>${escapeHTML(demand.willingnessToPay)}</strong></div>
      <div class="card-actions card-actions--bordered"><button class="action-button ${wanted ? 'is-active' : ''}" data-action="vote-demand" data-id="${demand.id}">${wanted ? '● 欲しい' : '○ 欲しい'}</button><button class="action-button ${pay ? 'is-active' : ''}" data-action="pay-vote-demand" data-id="${demand.id}">${pay ? '● 払ってもよい' : '○ 払ってもよい'}</button><a class="action-button action-link" href="#/demand/${demand.id}">詳細 →</a></div>
    </article>
  `;
}

function renderDemandDetail(id) {
  const { demands, opportunities, services } = collections();
  const demand = demands.find((item) => item.id === id);
  if (!demand) return renderNotFound();
  const linkedOpportunities = opportunities.filter((item) => demand.opportunityIds?.includes(item.id));
  const linkedServices = services.filter((item) => demand.serviceIds?.includes(item.id));
  const wanted = state.demandVotes.includes(demand.id);
  const pay = state.payVotes.includes(demand.id);
  const strength = gapStrength(demand, linkedServices.length);
  return `
    ${renderBreadcrumbs([['需要', '#/demands'], [demand.title, '']])}
    <article class="demand-detail-hero"><div><div class="card-topline"><span class="category-badge">${escapeHTML(getCategoryLabel(categories, demand.category))}</span><span class="type-badge">${escapeHTML(demand.audience)}</span></div><h1>${escapeHTML(demand.title)}</h1><p>${escapeHTML(demand.summary)}</p></div><div class="gap-score-hero"><strong>${strength}</strong><span>OPPORTUNITY GAP</span></div></article>
    <section class="demand-vote-panel"><div><strong>${demand.votes + (wanted ? 1 : 0)}</strong><span>欲しい人</span></div><div><strong>${demand.payVotes + (pay ? 1 : 0)}</strong><span>払ってもよい人</span></div><div><strong>${escapeHTML(demand.willingnessToPay)}</strong><span>支払意思価格</span></div><button class="button ${wanted ? 'button--gold' : 'button--outline'}" data-action="vote-demand" data-id="${demand.id}">${wanted ? '● 欲しいと回答済み' : '○ 自分も欲しい'}</button><button class="button ${pay ? 'button--soft' : 'button--ghost'}" data-action="pay-vote-demand" data-id="${demand.id}">${pay ? '● 支払意思を登録済み' : '○ 金を払ってもよい'}</button></section>
    <div class="detail-layout">
      <div class="detail-body">
        <section class="detail-section"><div class="section-label">01 / CURRENT ALTERNATIVES</div><h2>今は何で代用しているか</h2><div class="alternative-grid">${demand.alternatives.map((item) => `<div><strong>${escapeHTML(item)}</strong><span>代替手段</span></div>`).join('')}</div></section>
        <section class="detail-section"><div class="section-label">02 / UNSOLVED GAPS</div><h2>まだ解決されていない点</h2><div class="reason-grid">${demand.gaps.map((gap, index) => `<div><span>0${index + 1}</span><strong>${escapeHTML(gap)}</strong></div>`).join('')}</div></section>
        <section class="detail-section"><div class="section-label">03 / OPPORTUNITIES</div><h2>この需要から導かれた金脈</h2>${linkedOpportunities.length ? `<div class="opportunity-grid">${linkedOpportunities.map((item) => renderOpportunityCard(item, { compact: true })).join('')}</div>` : renderEmpty('金脈への変換はまだです', '票と根拠が集まると編集部が機会として構造化します。')}</section>
        <section class="detail-section"><div class="section-heading compact"><div><div class="section-label">04 / AVAILABLE SERVICES</div><h2>すでに応えるサービス</h2></div><a href="#/submit" class="text-link">自分のサービスを追加 →</a></div>${linkedServices.length ? `<div class="service-stack">${linkedServices.map(renderServiceRow).join('')}</div>` : renderEmpty('まだ十分なサービスがありません', '作る人・既存サービスの掲載を募集中です。')}</section>
      </div>
      <aside class="detail-sidebar"><div class="sticky-action-card"><span class="eyebrow">BUILD THIS</span><h3>この需要を解決するものを作る？</h3><p>サービスを掲載すると、この需要に投票した人へ新しい候補として表示されます。</p><a href="#/submit" class="button button--gold button--full">サービスを掲載 →</a><button class="share-button" data-action="share" data-id="${demand.id}" data-type="demand">需要を共有 ↗</button></div></aside>
    </div>
  `;
}

function renderRankings() {
  const { opportunities, services, signals, demands } = collections();
  const topOpportunities = sortOpportunities(opportunities, 'score').slice(0, 10);
  const topServices = [...services].sort((a, b) => b.votes - a.votes).slice(0, 8);
  const topDemands = [...demands].sort((a, b) => gapStrength(b, b.serviceIds.length) - gapStrength(a, a.serviceIds.length)).slice(0, 8);
  return `
    ${renderPageHeader('RANKINGS', '今、何が上がっているか', '売上の大きさだけではなく、勢い、空白、根拠、個人の参入可能性を分けて評価する。')}
    <section class="ranking-hero"><div><span>WEEK 36</span><strong>金脈ランキング</strong><p>2026年9月1日更新</p></div>${sparkline(topOpportunities.slice(0, 7).map((item) => opportunityScore(item)), 'large')}</section>
    <section class="ranking-section"><div class="section-heading"><div><span class="eyebrow">TOP OPPORTUNITIES</span><h2>総合金脈ランキング</h2></div><a href="#/opportunities" class="text-link">全件を見る →</a></div><div class="ranking-table">${topOpportunities.map((item, index) => renderOpportunityRank(item, index)).join('')}</div></section>
    <section class="ranking-columns section-block"><div><div class="section-heading compact"><div><span class="eyebrow">TRENDING PRODUCTS</span><h2>注目サービス</h2></div></div><div class="ranking-list">${topServices.map((service, index) => renderSimpleRank(index, service.name, service.tagline, service.votes, `#/service/${service.id}`)).join('')}</div></div><div><div class="section-heading compact"><div><span class="eyebrow">STRONGEST GAPS</span><h2>需要の空白</h2></div></div><div class="ranking-list">${topDemands.map((demand, index) => renderSimpleRank(index, demand.title, `${demand.votes}人が欲しい`, gapStrength(demand, demand.serviceIds.length), `#/demand/${demand.id}`)).join('')}</div></div></section>
    <section class="methodology-panel"><div><span class="eyebrow">METHODOLOGY</span><h2>ランキングを金で買うことはできません。</h2></div><p>オーガニック順位は、金の証拠、需要の勢い、競合の空白、作りやすさ、根拠の質、更新鮮度で決まります。有料掲載は「プロモーション」と明示し、順位とは分離します。</p><a href="#/about" class="text-link">評価方法を見る →</a></section>
  `;
}

function renderOpportunityRank(item, index) {
  return `<a class="ranking-row" href="#/opportunity/${item.id}"><span class="ranking-position">${String(index + 1).padStart(2, '0')}</span><div class="ranking-copy"><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(getCategoryLabel(categories, item.category))}・${escapeHTML(item.moneyLabel)}</small></div><div class="ranking-bars">${metricBar('勢い', item.momentum, true)}${metricBar('空白', item.gapScore, true)}</div><div class="ranking-score"><strong>${opportunityScore(item)}</strong><small>SCORE</small></div><span class="row-arrow">→</span></a>`;
}

function renderSimpleRank(index, title, subtitle, score, href) {
  return `<a class="simple-rank" href="${href}"><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHTML(title)}</strong><small>${escapeHTML(subtitle)}</small></div><em>${score}</em></a>`;
}

function renderGoldmine() {
  const { opportunities } = collections();
  const saved = opportunities.filter((item) => state.savedOpportunities.includes(item.id));
  const followed = opportunities.filter((item) => state.followedOpportunities.includes(item.id));
  const stats = portfolioStats(state.savedOpportunities, opportunities);
  return `
    ${renderPageHeader('MY GOLDMINE', '自分だけの金脈ポートフォリオ', '保存するほど、興味・条件・先行発見の履歴が蓄積し、フィードがあなた向けに変わる。')}
    <section class="portfolio-hero"><div><span class="eyebrow">EARLY FINDER SCORE</span><strong>${earlyFinderScore()}</strong><small>上位 ${Math.max(1, 38 - state.savedOpportunities.length * 3)}%</small></div><div class="portfolio-chart">${sparkline([31, 38, 42, 51, 58, 64, earlyFinderScore()], 'large')}</div><p>${state.savedOpportunities.length ? `あなたは${state.savedOpportunities.length}件の市場を保存し、${state.followedOpportunities.length}件の変化を追跡しています。` : '最初の金脈を保存すると、ポートフォリオが始まります。'}</p></section>
    <section class="portfolio-stats">${detailMeta('保存中', String(stats.count))}${detailMeta('平均スコア', String(stats.averageScore))}${detailMeta('平均勢い', String(stats.averageMomentum))}${detailMeta('分野数', String(stats.categories))}${detailMeta('A根拠', String(stats.evidenceA))}</section>
    <section class="section-block"><div class="section-heading"><div><span class="eyebrow">SAVED</span><h2>保存した金脈</h2></div><a href="#/opportunities" class="text-link">金脈を追加 →</a></div>${saved.length ? `<div class="opportunity-grid">${saved.map((item) => renderOpportunityCard(item)).join('')}</div>` : renderEmpty('まだ金脈を保存していません', '「これは儲かりそう」「自分でも作れそう」と思った市場を保存してください。', '<a href="#/opportunities" class="button button--gold">金脈を探す</a>')}</section>
    <section class="section-block"><div class="section-heading"><div><span class="eyebrow">WATCHLIST</span><h2>変化を追跡している市場</h2></div></div>${followed.length ? `<div class="watchlist-table">${followed.map(renderWatchRow).join('')}</div>` : renderEmpty('追跡中の市場はありません', '市場の勢い、競合、需要、根拠が変わったときに確認できます。')}</section>
    <section class="section-block"><div class="section-heading"><div><span class="eyebrow">YOUR PREFERENCES</span><h2>レーダー条件</h2></div></div><div class="preference-panel"><div class="chip-row">${categories.map((category) => preferenceChip('category', category.id, category.label, state.preferences.categories.includes(category.id))).join('')}</div><div class="chip-row">${preferenceChip('solo', 'true', '1人で作りたい', state.preferences.solo)}${preferenceChip('lowBudget', 'true', '初期費用10万円以下', state.preferences.lowBudget)}${preferenceChip('japan', 'true', '日本で売りたい', state.preferences.japan)}</div></div></section>
  `;
}

function renderWatchRow(item) {
  return `<a href="#/opportunity/${item.id}" class="watch-row"><span class="category-monogram">${categories.find((c) => c.id === item.category)?.icon || 'OP'}</span><div><strong>${escapeHTML(item.title)}</strong><small>${item.freshnessDays}日前更新</small></div><div>${metricBar('勢い', item.momentum, true)}</div><div><strong>${item.momentum >= 80 ? '上昇中' : '監視継続'}</strong><small>${item.momentum >= 80 ? '+強い動き' : '大きな変化なし'}</small></div><span class="row-arrow">→</span></a>`;
}

function renderCompare() {
  const { opportunities } = collections();
  const items = opportunities.filter((item) => state.compare.includes(item.id));
  if (!items.length) {
    return `${renderPageHeader('COMPARE', '金脈を並べて判断する', '金額の大きさだけではなく、根拠、空白、作りやすさ、リスクを同じ軸で比較する。')}${renderEmpty('比較リストは空です', '金脈カードの「比較」を押すと、最大4件まで並べられます。', '<a href="#/opportunities" class="button button--gold">金脈を探す</a>')}`;
  }
  return `
    ${renderPageHeader('COMPARE', `${items.length}件の金脈を比較`, '夢の大きさと、実際に取れる可能性を分けて見る。', '<a href="#/opportunities" class="button button--outline">＋ 比較対象を追加</a>')}
    <div class="comparison-wrap"><table class="comparison-table"><thead><tr><th>比較軸</th>${items.map((item) => `<th><button class="remove-compare" data-action="toggle-compare" data-id="${item.id}">×</button><a href="#/opportunity/${item.id}">${escapeHTML(item.title)}</a></th>`).join('')}</tr></thead><tbody>
      ${comparisonRow('総合スコア', items, (item) => `<strong class="comparison-big">${opportunityScore(item)}</strong>`)}
      ${comparisonRow('金の証拠', items, (item) => escapeHTML(item.moneyLabel))}
      ${comparisonRow('根拠', items, (item) => evidenceBadge(item.evidenceGrade))}
      ${comparisonRow('勢い', items, (item) => `${metricBar('', item.momentum, true)}<strong>${item.momentum}</strong>`)}
      ${comparisonRow('需要の空白', items, (item) => `${metricBar('', item.gapScore, true)}<strong>${item.gapScore}</strong>`)}
      ${comparisonRow('作りやすさ', items, (item) => `${metricBar('', item.buildability, true)}<strong>${item.buildability}</strong>`)}
      ${comparisonRow('初期予算', items, (item) => escapeHTML(item.budgetBand))}
      ${comparisonRow('MVP目安', items, (item) => escapeHTML(item.timeToMvp))}
      ${comparisonRow('最有力入口', items, (item) => escapeHTML(item.openings[0]))}
      ${comparisonRow('最大リスク', items, (item) => escapeHTML(item.risks[0]))}
      ${comparisonRow('判断', items, (item) => `<button class="button ${state.savedOpportunities.includes(item.id) ? 'button--gold' : 'button--outline'} button--small" data-action="toggle-save" data-id="${item.id}">${state.savedOpportunities.includes(item.id) ? '保存済み' : '保存する'}</button>`)}
    </tbody></table></div>
  `;
}

function comparisonRow(label, items, renderValue) {
  return `<tr><th>${escapeHTML(label)}</th>${items.map((item) => `<td>${renderValue(item)}</td>`).join('')}</tr>`;
}

function renderSubmit() {
  const tabs = [['service', 'サービスを掲載'], ['demand', '需要を投稿'], ['signal', '金の動きを投稿']];
  return `
    ${renderPageHeader('CONTRIBUTE', 'DBへ参加する', '宣伝だけでなく、需要、金の動き、根拠を持ち寄ることで、全員の発見精度が上がる。')}
    <section class="submit-intro"><div><strong>無料掲載</strong><span>サービスページ・検索対象・金脈との接続</span></div><div><strong>構造化</strong><span>URLから基本項目を下書き</span></div><div><strong>透明性</strong><span>未確認・所有者確認・根拠確認を区別</span></div></section>
    <div class="tab-bar">${tabs.map(([value, label]) => `<button class="tab-button ${state.submitTab === value ? 'is-active' : ''}" data-action="set-submit-tab" data-value="${value}">${label}</button>`).join('')}</div>
    <section class="submit-layout"><div class="submit-form-card">${state.submitTab === 'service' ? renderServiceForm() : state.submitTab === 'demand' ? renderDemandForm() : renderSignalForm()}</div>${renderSubmissionGuide()}</section>
  `;
}

function renderServiceForm() {
  return `
    <form data-form="service" class="form-stack">
      <div class="form-heading"><span class="eyebrow">LIST YOUR PRODUCT</span><h2>サービスを掲載する</h2><p>URLだけ入れれば、名前の下書きまで自動で作ります。公開後に所有者確認できます。</p></div>
      <div class="url-import"><label><span>サービスURL</span><input type="url" name="url" placeholder="https://example.com" required></label><button type="button" class="button button--outline" data-action="parse-service-url">URLから下書き</button></div>
      <div class="form-grid"><label><span>サービス名 *</span><input name="name" required maxlength="80"></label><label><span>一言で何をするか *</span><input name="tagline" required maxlength="140"></label></div>
      <label><span>誰の、何を解決するか *</span><textarea name="description" required rows="4" maxlength="700"></textarea></label>
      <div class="form-grid"><label><span>分野</span>${formSelect('category', categories.map((c) => [c.id, c.label]))}</label><label><span>対象地域</span>${formSelect('region', [['japan', '日本'], ['global', 'グローバル']])}</label></div>
      <div class="form-grid"><label><span>料金</span><input name="pricing" placeholder="月額4,980円〜"></label><label><span>収益モデル</span>${formSelect('model', [['subscription', '月額課金'], ['one-time', '買い切り'], ['marketplace', '手数料'], ['affiliate', 'アフィリエイト'], ['hybrid', '複合']])}</label></div>
      <div class="form-grid"><label><span>現在の段階</span>${formSelect('stage', [['idea', '構想'], ['beta', 'ベータ'], ['early', '初期顧客あり'], ['growth', '成長中']])}</label><label><span>今ほしいもの</span>${formSelect('intent', [['customers', '顧客'], ['beta-users', 'ベータ利用者'], ['feedback', 'フィードバック'], ['partners', '提携先'], ['affiliates', '紹介者'], ['investors', '投資家'], ['buyers', '買収者']])}</label></div>
      <div class="form-grid"><label><span>運営者</span><input name="owner" placeholder="個人開発 / 2人チーム"></label><label><span>対応言語</span><input name="languages" value="日本語" placeholder="日本語, 英語"></label></div>
      <div class="form-grid"><label><span>MRR（任意・円）</span><input type="number" name="mrr" min="0" step="1"></label><label><span>利用者数（任意）</span><input type="number" name="users" min="0" step="1"></label></div>
      <label><span>タグ</span><input name="tags" placeholder="AI, Shopify, 1人開発"></label>
      <label><span>関連する金脈</span>${formSelect('opportunityId', [['', '後で選ぶ'], ...seedOpportunities.map((o) => [o.id, o.title])])}</label>
      <div class="form-consent"><input type="checkbox" id="service-consent" required><label for="service-consent">掲載内容が正確であり、誤認を招く売上表現を行わないことに同意します。</label></div>
      <button class="button button--gold button--full" type="submit">無料で掲載する →</button>
    </form>
  `;
}

function renderDemandForm() {
  return `
    <form data-form="demand" class="form-stack">
      <div class="form-heading"><span class="eyebrow">POST UNMET DEMAND</span><h2>欲しいもの・困り事を投稿</h2><p>同じものを欲しがる人と、作れる人を集めます。</p></div>
      <label><span>何が欲しい？ *</span><input name="title" required maxlength="160" placeholder="例：キャンセル枠を自動で待機客へ連絡してほしい"></label>
      <label><span>今、何に困っている？ *</span><textarea name="summary" required rows="4" maxlength="700"></textarea></label>
      <div class="form-grid"><label><span>誰が困っている？</span><input name="audience" required placeholder="例：小規模歯科医院"></label><label><span>分野</span>${formSelect('category', categories.map((c) => [c.id, c.label]))}</label></div>
      <div class="form-grid"><label><span>地域</span>${formSelect('region', [['japan', '日本'], ['global', 'グローバル']])}</label><label><span>月いくらなら払う？</span><input name="willingnessToPay" placeholder="月額5,000〜10,000円"></label></div>
      <div class="form-grid"><label><span>痛みの強さ（0〜100）</span><input type="number" name="painScore" min="0" max="100" value="70"></label><label><span>自分は払ってもよい</span>${formSelect('payIntent', [['no', 'まだ分からない'], ['yes', '払ってもよい']])}</label></div>
      <label><span>今の代替手段</span><input name="alternatives" placeholder="電話, 表計算, 手作業"></label>
      <label><span>既存手段の不足</span><input name="gaps" placeholder="高い, 難しい, 日本語がない"></label>
      <label><span>タグ</span><input name="tags" placeholder="予約, LINE, 店舗"></label>
      <label><span>関連する金脈</span>${formSelect('opportunityId', [['', '分からない'], ...seedOpportunities.map((o) => [o.id, o.title])])}</label>
      <button class="button button--gold button--full" type="submit">需要を公開する →</button>
    </form>
  `;
}

function renderSignalForm() {
  return `
    <form data-form="signal" class="form-stack">
      <div class="form-heading"><span class="eyebrow">SUBMIT MONEY SIGNAL</span><h2>実際に起きた金の動きを投稿</h2><p>投稿直後はDランク。一次資料や直接開示を確認するとランクが上がります。</p></div>
      <label><span>何が起きた？ *</span><input name="title" required maxlength="180"></label>
      <label><span>要約 *</span><textarea name="summary" required rows="4" maxlength="700"></textarea></label>
      <div class="form-grid"><label><span>金額（円）</span><input type="number" name="amount" min="0" step="1"></label><label><span>表示用金額</span><input name="amountLabel" placeholder="月商120万円 / 契約4,800万円"></label></div>
      <div class="form-grid"><label><span>金額の種類</span>${formSelect('type', [['revenue', '顧客売上'], ['profit', '利益'], ['arr', 'ARR'], ['contract', '契約額'], ['funding', '資金調達'], ['acquisition', '売却額'], ['market-spend', '市場支出']])}</label><label><span>日付</span><input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}"></label></div>
      <div class="form-grid"><label><span>払った側</span><input name="payer" required></label><label><span>受け取った側</span><input name="receiver" required></label></div>
      <div class="form-grid"><label><span>分野</span>${formSelect('category', categories.map((c) => [c.id, c.label]))}</label><label><span>地域</span>${formSelect('region', [['japan', '日本'], ['global', 'グローバル']])}</label></div>
      <label><span>出典名 *</span><input name="sourceName" required placeholder="公式発表、決算、本人投稿など"></label>
      <label><span>出典URL</span><input type="url" name="sourceUrl"></label>
      <label><span>関連する金脈</span>${formSelect('opportunityId', [['', '分からない'], ...seedOpportunities.map((o) => [o.id, o.title])])}</label>
      <div class="form-consent"><input type="checkbox" id="signal-consent" required><label for="signal-consent">売上・利益・調達・契約上限を混同せず、分かる範囲で正確に投稿します。</label></div>
      <button class="button button--gold button--full" type="submit">検証待ちとして投稿 →</button>
    </form>
  `;
}

function renderSubmissionGuide() {
  return `<aside class="submission-guide"><span class="eyebrow">HOW IT WORKS</span><h3>掲載後に起きること</h3><ol><li><span>1</span><div><strong>DBへ即時掲載</strong><p>未確認ラベル付きで検索対象になります。</p></div></li><li><span>2</span><div><strong>需要・金脈と接続</strong><p>同じ問題を探している人から発見されます。</p></div></li><li><span>3</span><div><strong>所有者・根拠確認</strong><p>URL、ドメイン、公開資料で信頼度を上げます。</p></div></li><li><span>4</span><div><strong>閲覧と反応を分析</strong><p>何人が見て、保存し、何を欲しがったかを確認。</p></div></li></ol><div class="guide-policy"><strong>広告と順位は分離</strong><p>料金を払っても、オーガニックの金脈ランキングは上がりません。</p></div></aside>`;
}

function renderDashboard() {
  const userServices = state.userServices;
  const claimedSeed = seedServices.filter((service) => state.claimedServices.includes(service.id));
  const managed = [...userServices, ...claimedSeed];
  const totalViews = managed.reduce((sum, service) => sum + Number(state.serviceViews[service.id] || 0) + (service.demo ? 1264 : 0), 0);
  const totalDemand = managed.reduce((sum, service) => sum + seedDemands.filter((demand) => demand.serviceIds.includes(service.id)).reduce((a, b) => a + b.votes, 0), 0);
  return `
    ${renderPageHeader('FOUNDER DASHBOARD', '掲載サービスの反応を確認', '広告表示回数ではなく、どの需要・金脈から見つかり、何に反応されたかを見る。', '<a href="#/submit" class="button button--gold">＋ 新しく掲載</a>')}
    <section class="dashboard-stats">${dashboardStat('総閲覧', formatCompactNumber(totalViews), '+18%')}${dashboardStat('関連需要', formatCompactNumber(totalDemand), '+42票')}${dashboardStat('保存・注目', formatCompactNumber(managed.reduce((sum, s) => sum + s.votes, 0)), '+9%')}${dashboardStat('管理中', String(managed.length), 'SERVICES')}</section>
    ${managed.length ? `<section class="section-block"><div class="section-heading"><div><span class="eyebrow">MANAGED SERVICES</span><h2>管理中のサービス</h2></div></div><div class="managed-service-list">${managed.map(renderManagedService).join('')}</div></section>` : renderEmpty('管理中のサービスがありません', '自分のサービスを掲載するか、既存ページをClaimしてください。', '<a href="#/submit" class="button button--gold">サービスを掲載</a>')}
    <section class="dashboard-grid section-block"><div class="analytics-card"><div class="section-heading compact"><div><span class="eyebrow">DISCOVERY SOURCES</span><h2>見つかった入口</h2></div></div>${analyticsBar('金脈詳細', 42)}${analyticsBar('サービス検索', 27)}${analyticsBar('需要ページ', 18)}${analyticsBar('ランキング', 9)}${analyticsBar('外部共有', 4)}</div><div class="analytics-card"><div class="section-heading compact"><div><span class="eyebrow">WHAT PEOPLE WANT</span><h2>ユーザーの反応</h2></div></div>${analyticsBar('自分も欲しい', 38)}${analyticsBar('料金を比較', 24)}${analyticsBar('ベータ参加', 19)}${analyticsBar('類似サービスを見る', 13)}${analyticsBar('提携したい', 6)}</div></section>
    <section class="settings-panel"><div><span class="eyebrow">LOCAL PROTOTYPE DATA</span><h2>この端末の投稿データ</h2><p>現在は認証なしのプロトタイプとしてlocalStorageへ保存しています。本番DB用のSupabaseスキーマはリポジトリ内に実装済みです。</p></div><button class="button button--outline" data-action="reset-local-data">ローカルデータを初期化</button></section>
  `;
}

function renderManagedService(service) {
  const views = Number(state.serviceViews[service.id] || 0) + (service.demo ? 1264 : 0);
  return `<div class="managed-service"><span class="service-logo service-logo--large">${initials(service.name)}</span><div class="managed-main"><a href="#/service/${service.id}"><strong>${escapeHTML(service.name)}</strong></a><small>${escapeHTML(service.tagline)}</small><div class="intent-row">${service.intents.map((intent) => `<span>${intentLabel(intent)}</span>`).join('')}</div></div><div class="managed-kpis"><span><strong>${formatCompactNumber(views)}</strong><small>閲覧</small></span><span><strong>${service.votes}</strong><small>注目</small></span><span><strong>${service.evidenceGrade}</strong><small>根拠</small></span></div>${service.userSubmitted ? `<button class="danger-link" data-action="remove-user-service" data-id="${service.id}">削除</button>` : '<a href="#/dashboard" class="text-link">編集</a>'}</div>`;
}

function renderPricing() {
  const plans = [
    { name: 'FREE', price: '¥0', suffix: '永久無料', description: '金脈を発見し、サービスを掲載する。', features: ['最新フィード', '基本検索', '金脈を5件保存', 'サービス無料掲載', '週刊レポート'], cta: '無料で始める', featured: false },
    { name: 'RADAR PRO', price: '¥1,980', suffix: '/月', description: '見逃さず、比較し、判断を速くする。', features: ['全金脈・全根拠', '保存・追跡無制限', '高度フィルター', '市場変化アラート', '比較・履歴', 'MY GOLDMINE分析'], cta: 'PROを始める', featured: true },
    { name: 'RESEARCH', price: '¥4,980', suffix: '/月', description: '調査・提案・新規事業に使う。', features: ['PROの全機能', 'CSVエクスポート', '市場マップ', '根拠履歴', 'チーム共有', '掲載者意向データ'], cta: 'RESEARCHを始める', featured: false }
  ];
  return `
    ${renderPageHeader('PRICING', '夢を見るのは無料。優位性に課金する。', '無料部分は発見と可能性。有料部分は根拠、比較、監視、時間短縮。')}
    <section class="pricing-grid">${plans.map((plan) => `<article class="pricing-card ${plan.featured ? 'pricing-card--featured' : ''}">${plan.featured ? '<span class="recommended">MOST POPULAR</span>' : ''}<span class="eyebrow">${plan.name}</span><div class="price"><strong>${plan.price}</strong><small>${plan.suffix}</small></div><p>${plan.description}</p><ul>${plan.features.map((feature) => `<li>✓ ${feature}</li>`).join('')}</ul><button class="button ${plan.featured ? 'button--gold' : 'button--outline'} button--full" data-action="open-search">${plan.cta}</button></article>`).join('')}</section>
    <section class="pricing-principles"><div><strong>オーガニック順位は販売しない</strong><p>スポンサー枠は明示し、評価スコアと完全に分離。</p></div><div><strong>掲載は無料</strong><p>サービスDBの網羅性を料金で狭めない。</p></div><div><strong>根拠へ課金</strong><p>速く深く判断する人が、監視・比較・履歴へ払う。</p></div></section>
  `;
}

function renderAbout() {
  return `
    ${renderPageHeader('ABOUT & METHODOLOGY', 'ただの「儲かる話」にしない', '可能性を先に見せ、数字の意味を分け、根拠と残るリスクまで追えるようにする。')}
    <section class="about-principles"><article><span>01</span><h2>Money Signal</h2><p>最小単位は記事や会社ではなく、誰が誰へ何のためにいくら払ったかという出来事。</p></article><article><span>02</span><h2>Opportunity Window</h2><p>実際に金が動き、需要が続き、なお新規参入の入口が残る期間・市場。</p></article><article><span>03</span><h2>Demand Gap</h2><p>欲しい人・払う人に対して、十分な商品が存在しない場所。</p></article><article><span>04</span><h2>Trust Layer</h2><p>A一次根拠、B直接開示、C推定、D未確認を混ぜずに表示。</p></article></section>
    <section class="detail-section"><div class="section-label">SCORING</div><h2>総合スコアの構成</h2><div class="score-method-grid">${methodCard('28%', '勢い', '新規支出、成長、変化速度')}${methodCard('27%', '需要の空白', '欲しい・払う・既存候補の少なさ')}${methodCard('20%', '作りやすさ', '資金、期間、技術、営業負担')}${methodCard('17%', '根拠', '一次性、直接性、再現性')}${methodCard('8%', '鮮度', '調査日と更新頻度')}</div></section>
    <section class="detail-section"><div class="section-label">EVIDENCE GRADES</div><h2>根拠ランク</h2><div class="evidence-table">${['A', 'B', 'C', 'D'].map((grade) => `<div><span class="evidence-grade-large">${grade}</span><div><strong>${evidenceMeta(grade).label}</strong><p>${evidenceMeta(grade).detail}</p></div></div>`).join('')}</div></section>
    <section class="methodology-panel"><div><span class="eyebrow">THE PROMISE</span><h2>「億万長者になれる」とは断定しない。</h2></div><p>代わりに、次に成功する人が他人より早く見ている情報、まだ埋まっていない需要、具体的な入口を提示する。夢を壊さず、判断を誤らせないことを両立します。</p></section>
  `;
}

function renderRightRail() {
  const { opportunities, services, demands } = collections();
  const hotCategories = categorySummary(categories, opportunities, services, demands).slice(0, 4);
  const watched = opportunities.filter((item) => state.followedOpportunities.includes(item.id)).slice(0, 3);
  return `
    <aside class="right-rail">
      <section class="rail-card">
        <div class="rail-heading"><span>MARKET HEAT</span><a href="#/rankings">一覧</a></div>
        <div class="rail-heat-list">${hotCategories.map((category, index) => `<a href="#/opportunities"><span>${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHTML(category.label)}</strong><small>${category.opportunityCount}金脈・${category.demandCount}需要</small></div><em>${category.heat}</em></a>`).join('')}</div>
      </section>
      <section class="rail-card">
        <div class="rail-heading"><span>LIVE ACTIVITY</span><i class="live-dot"></i></div>
        <div class="activity-list">${activity.map((item) => `<div><span class="activity-icon">${activityIcon(item.type)}</span><p>${escapeHTML(item.text)}<small>${item.time}</small></p></div>`).join('')}</div>
      </section>
      ${watched.length ? `<section class="rail-card"><div class="rail-heading"><span>WATCHING</span><a href="#/goldmine">管理</a></div><div class="rail-watch-list">${watched.map((item) => `<a href="#/opportunity/${item.id}"><span class="live-dot"></span><div><strong>${escapeHTML(item.title)}</strong><small>勢い ${item.momentum}</small></div><em>→</em></a>`).join('')}</div></section>` : ''}
      <section class="rail-newsletter">
        <span class="eyebrow">WEEKLY GOLD RUSH</span>
        <h3>今週、金が集まり始めた7市場。</h3>
        <p>根拠と「まだ入れる理由」だけを毎週まとめます。</p>
        <form data-form="newsletter"><input type="email" required placeholder="you@example.com"><button class="button button--gold button--full">無料で受け取る</button></form>
      </section>
    </aside>
  `;
}

function renderFooter() {
  return `<footer class="site-footer"><div><a class="brand brand--footer" href="#/discover"><span class="brand-mark"><span></span><span></span><span></span></span><span><strong>GOLDMINE</strong><small>RADAR</small></span></a><p>実際に金が動いた証拠から、次の事業機会を発見する。</p></div><nav><a href="#/about">評価方法</a><a href="#/pricing">料金</a><a href="#/submit">掲載</a><a href="#/services">サービスDB</a></nav><small>© 2026 GOLDMINE RADAR</small></footer>`;
}

function renderMobileNav() {
  const nav = [['discover', '発見', '◇'], ['opportunities', '金脈', '◎'], ['signals', '金', '↗'], ['goldmine', '保存', '◆'], ['submit', '掲載', '＋']];
  return `<nav class="mobile-nav">${nav.map(([page, label, icon]) => `<a href="#/${page}" class="${currentRoute.page === page ? 'is-active' : ''}"><span>${icon}</span><small>${label}</small></a>`).join('')}</nav>`;
}

function renderSearchModal() {
  const root = document.getElementById('modal-root');
  if (!state.searchOpen) {
    root.innerHTML = '';
    return;
  }
  root.innerHTML = `
    <div class="modal-backdrop" data-action="close-search"></div>
    <section class="search-modal" role="dialog" aria-modal="true" aria-label="DB検索">
      <div class="search-modal-input"><span>⌕</span><input data-search-modal-input value="${escapeHTML(state.searchQuery)}" placeholder="何を探していますか？"><kbd>ESC</kbd></div>
      <div id="search-results">${renderSearchResultsHTML()}</div>
      <div class="search-modal-footer"><span>↑↓ 移動</span><span>Enter 開く</span><span>金脈・サービス・需要・金の動きを横断</span></div>
    </section>
  `;
}

function renderSearchResults() {
  const target = document.getElementById('search-results');
  if (target) target.innerHTML = renderSearchResultsHTML();
}

function renderSearchResultsHTML() {
  const data = collections();
  if (!state.searchQuery.trim()) {
    const quick = recommendForPreferences(data.opportunities, state.preferences).slice(0, 5);
    return `<div class="search-empty-state"><span class="eyebrow">RECOMMENDED</span><h3>あなた向けの金脈</h3>${quick.map((item) => renderSearchResult('opportunity', item)).join('')}</div>`;
  }
  const results = searchAcross(state.searchQuery, data);
  if (!results.length) return renderEmpty('一致するデータがありません', '別の業界名、困り事、顧客名で検索してください。');
  return `<div class="search-result-list">${results.map(({ type, item }) => renderSearchResult(type, item)).join('')}</div>`;
}

function renderSearchResult(type, item) {
  const labels = { opportunity: '金脈', service: 'サービス', signal: '金の動き', demand: '需要' };
  const title = item.title || item.name;
  const subtitle = item.hook || item.tagline || item.summary || item.description;
  return `<button class="search-result" data-action="navigate-result" data-value="${routeFor(type, item.id)}"><span class="search-result-type">${labels[type]}</span><div><strong>${escapeHTML(title)}</strong><small>${escapeHTML(subtitle)}</small></div><em>→</em></button>`;
}

function renderPageHeader(kicker, title, description, action = '') {
  return `<header class="page-header"><div><span class="eyebrow">${escapeHTML(kicker)}</span><h1>${escapeHTML(title)}</h1><p>${escapeHTML(description)}</p></div>${action ? `<div>${action}</div>` : ''}</header>`;
}

function renderBreadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="パンくず">${items.map(([label, href], index) => `${index ? '<span>›</span>' : ''}${href ? `<a href="${href}">${escapeHTML(label)}</a>` : `<strong>${escapeHTML(label)}</strong>`}`).join('')}</nav>`;
}

function renderEmpty(title, description, action = '') {
  return `<div class="empty-state"><span class="empty-icon">◇</span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${action}</div>`;
}

function evidenceBadge(grade) {
  const meta = evidenceMeta(grade);
  return `<span class="evidence-badge evidence-${meta.tone}" title="${escapeHTML(meta.detail)}"><strong>${grade}</strong> ${escapeHTML(meta.label)}</span>`;
}

function metricBar(label, value, compact = false) {
  return `<div class="metric-bar ${compact ? 'metric-bar--compact' : ''}">${label ? `<span>${escapeHTML(label)}</span>` : ''}<div><i style="width:${clamp(value, 0, 100)}%"></i></div>${compact ? '' : `<strong>${value}</strong>`}</div>`;
}

function sparkline(values = [], size = 'small') {
  if (!values.length) return '';
  const width = size === 'large' ? 300 : 116;
  const height = size === 'large' ? 82 : 42;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * width;
    const y = height - 6 - ((value - min) / range) * (height - 12);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="sparkline sparkline--${size}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="spark-fill-${values.join('-')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".24"/><stop offset="100%" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><polygon points="0,${height} ${points} ${width},${height}" fill="url(#spark-fill-${values.join('-')})"></polygon><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2.2" vector-effect="non-scaling-stroke"></polyline></svg>`;
}

function selectControl(key, selected, options, action) {
  return `<label class="select-control"><select data-select-action="${action}" data-key="${key}">${options.map(([value, label]) => `<option value="${escapeHTML(value)}" ${selected === value ? 'selected' : ''}>${escapeHTML(label)}</option>`).join('')}</select><span>⌄</span></label>`;
}

function formSelect(name, options) {
  return `<select name="${name}">${options.map(([value, label]) => `<option value="${escapeHTML(value)}">${escapeHTML(label)}</option>`).join('')}</select>`;
}

function activeOpportunityFilterCount() {
  const filter = state.filters;
  return [filter.query, filter.category !== 'all', filter.region !== 'all', filter.evidence !== 'all', filter.status !== 'all', filter.soloOnly].filter(Boolean).length;
}

function initials(name = '') {
  return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function modelLabel(model) {
  return {
    subscription: '月額課金',
    'subscription-usage': '月額＋従量',
    'one-time': '買い切り',
    marketplace: 'マーケットプレイス',
    affiliate: 'アフィリエイト',
    'subscription-affiliate': '月額＋紹介',
    hybrid: '複合モデル'
  }[model] || model;
}

function intentLabel(intent) {
  return {
    customers: '顧客募集中',
    partners: '提携先募集',
    'beta-users': 'ベータ募集',
    feedback: 'フィードバック募集',
    affiliates: '紹介者募集',
    experts: '専門家募集',
    integrations: '連携先募集',
    resellers: '販売代理店募集',
    buyers: '買収者募集',
    investors: '投資家募集',
    publishers: '媒体募集',
    advertisers: '広告主募集',
    vendors: 'ベンダー募集',
    'design-partners': '共同検証企業募集',
    'data-partners': 'データ提携募集'
  }[intent] || intent;
}

function moneyTypeExplanation(type) {
  return {
    'revenue-proof': '顧客から商品・サービスへ支払われた売上の証拠',
    'contract-proof': '発注者と提供者の間で成立した契約額',
    'arr-proof': '継続課金を年間換算した売上',
    'market-spend': '複数の支出・統計から観測した関連支出',
    'switching-spend': '既存製品から代替製品へ移る可能性がある支出',
    'acquisition-proof': '事業・Web資産の売買として成立した金額',
    'ad-spend': '広告主から媒体へ支払われた広告費',
    'data-revenue': '閲覧・比較・意向データへの支払',
    'estimated-demand': '価格・需要票・既存支出から推定した需要',
    'recoverable-revenue': '失注・空き枠・未回収から戻せる可能性がある売上'
  }[type] || '関連する金の動き';
}

function signalTypeDescription(type) {
  return {
    revenue: '顧客が商品・サービスの対価として支払った売上です。費用を引いた利益ではありません。',
    profit: '売上から運営費を引いた利益として申告・開示された数字です。計算範囲を確認する必要があります。',
    arr: '月次継続売上を12倍などで年換算した指標です。将来の確定売上ではありません。',
    contract: '契約として合意された金額です。上限額や複数年総額の場合、実際の支払済額とは異なります。',
    funding: '投資家から会社へ入った資本です。顧客需要や利益の証拠とは別に扱います。',
    acquisition: '事業・株式・Web資産の売買として成立または開示された金額です。',
    'market-spend': '複数の支出、契約、統計から観測した関連支出です。市場全体の確定規模ではありません。',
    'switching-spend': '既存製品への支出が、価格や不満を理由に代替へ移る可能性を示します。',
    'ad-spend': '広告主が見込み顧客へ接触するために支払った費用です。',
    'data-revenue': '調査、比較、購買意向などのデータへ支払われた売上です。'
  }[type] || 'この数字の定義を追加確認する必要があります。';
}

function renderSignalTypeLegend() {
  return `<div class="signal-type-legend"><span><i class="legend-revenue"></i>顧客売上</span><span><i class="legend-contract"></i>契約</span><span><i class="legend-spend"></i>市場支出</span><span><i class="legend-acquisition"></i>M&A</span></div>`;
}

function entryExplanation(opening, item) {
  return `${escapeHTML(opening)}へ対象を絞ることで、大手の汎用品と正面衝突せず、${escapeHTML(item.reasons[0])}という強い支払理由を先に取れます。`;
}

function executionHint(index) {
  return ['需要が存在するかを、作る前に確認する。', '支払意思と代替費用を数字で確認する。', '最小の価値だけを公開し、利用行動を見る。'][index] || '結果を記録し次の判断へつなげる。';
}

function detailMeta(label, value) {
  return `<div><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong></div>`;
}

function dashboardStat(label, value, change) {
  return `<div><span>${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong><small>${escapeHTML(change)}</small></div>`;
}

function analyticsBar(label, value) {
  return `<div class="analytics-row"><span>${escapeHTML(label)}</span><div><i style="width:${value}%"></i></div><strong>${value}%</strong></div>`;
}

function methodCard(weight, title, description) {
  return `<div><strong>${weight}</strong><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p></div>`;
}

function activityIcon(type) {
  return { signal: '↗', service: '▦', demand: '◌', growth: '↑', claim: '✓' }[type] || '•';
}

function earlyFinderScore() {
  return clamp(41 + state.savedOpportunities.length * 5 + state.followedOpportunities.length * 3 + Object.keys(state.reactions).length, 0, 99);
}

function renderNotFound() {
  return `${renderPageHeader('404', 'データが見つかりません', '削除されたか、URLが間違っています。')}${renderEmpty('目的のページはありません', '発見フィードから探し直してください。', '<a href="#/discover" class="button button--gold">発見へ戻る</a>')}`;
}

function toast(message) {
  const root = document.getElementById('toast-root');
  const element = document.createElement('div');
  element.className = 'toast';
  element.textContent = message;
  root.appendChild(element);
  requestAnimationFrame(() => element.classList.add('is-visible'));
  setTimeout(() => {
    element.classList.remove('is-visible');
    setTimeout(() => element.remove(), 250);
  }, 2400);
}

// Selects and filter inputs use delegation but need change events.
document.addEventListener('change', (event) => {
  const select = event.target.closest('[data-select-action]');
  if (select) {
    const action = select.dataset.selectAction;
    const key = select.dataset.key;
    if (action === 'set-filter') state.filters[key] = select.value;
    if (action === 'set-service-filter') state.serviceFilters[key] = select.value;
    if (action === 'set-demand-filter') state.demandFilters[key] = select.value;
    if (action === 'set-signal-filter') state.signalFilters[key] = select.value;
    persist();
    render();
  }
});

document.addEventListener('input', (event) => {
  const input = event.target.closest('[data-filter-input]');
  if (!input) return;
  const type = input.dataset.filterInput;
  if (type === 'opportunity') state.filters.query = input.value;
  if (type === 'service') state.serviceFilters.query = input.value;
  if (type === 'demand') state.demandFilters.query = input.value;
  if (type === 'signal') state.signalFilters.query = input.value;
  persist();
  const caret = input.selectionStart;
  render();
  const next = document.querySelector(`[data-filter-input="${type}"]`);
  next?.focus();
  next?.setSelectionRange(caret, caret);
});

boot();
