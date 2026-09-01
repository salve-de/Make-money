export function normalizeText(value = '') {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHTML(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function formatCompactNumber(value, locale = 'ja-JP') {
  const number = Number(value || 0);
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(number);
}

export function formatYen(value) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function daysSince(dateString, now = new Date('2026-09-01T00:00:00+09:00')) {
  const date = new Date(`${dateString}T00:00:00+09:00`);
  const diff = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function opportunityScore(opportunity) {
  const evidenceWeight = { A: 100, B: 80, C: 58, D: 32 }[opportunity.evidenceGrade] ?? 40;
  const freshness = Math.max(30, 100 - Number(opportunity.freshnessDays || 0) * 2);
  return Math.round(
    Number(opportunity.momentum || 0) * 0.28 +
      Number(opportunity.gapScore || 0) * 0.27 +
      Number(opportunity.buildability || 0) * 0.2 +
      evidenceWeight * 0.17 +
      freshness * 0.08
  );
}

export function gapStrength(demand, relatedServiceCount = 0) {
  const vote = Math.min(100, Number(demand.votes || 0) / 7);
  const pay = Math.min(100, Number(demand.payVotes || 0) / 2.4);
  const scarcity = Math.max(15, 100 - relatedServiceCount * 18);
  return Math.round(vote * 0.3 + pay * 0.27 + Number(demand.painScore || 0) * 0.28 + scarcity * 0.15);
}

export function searchableText(item) {
  return normalizeText(
    [
      item.title,
      item.name,
      item.hook,
      item.tagline,
      item.summary,
      item.description,
      item.category,
      item.region,
      item.audience,
      ...(item.tags || []),
      ...(item.reasons || []),
      ...(item.openings || []),
      ...(item.gaps || [])
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export function matchesQuery(item, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;
  return normalizedQuery.split(' ').every((token) => searchableText(item).includes(token));
}

export function sortOpportunities(items, sort = 'score') {
  const copy = [...items];
  switch (sort) {
    case 'momentum':
      return copy.sort((a, b) => b.momentum - a.momentum);
    case 'gap':
      return copy.sort((a, b) => b.gapScore - a.gapScore);
    case 'buildability':
      return copy.sort((a, b) => b.buildability - a.buildability);
    case 'money':
      return copy.sort((a, b) => b.moneyValue - a.moneyValue);
    case 'new':
      return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    default:
      return copy.sort((a, b) => opportunityScore(b) - opportunityScore(a));
  }
}

export function filterOpportunities(items, filters = {}) {
  return items.filter((item) => {
    if (filters.query && !matchesQuery(item, filters.query)) return false;
    if (filters.category && filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.region && filters.region !== 'all' && item.region !== filters.region) return false;
    if (filters.soloOnly && !item.soloFriendly) return false;
    if (filters.evidence && filters.evidence !== 'all' && item.evidenceGrade !== filters.evidence) return false;
    if (filters.status && filters.status !== 'all' && item.status !== filters.status) return false;
    return true;
  });
}

export function searchAcross(query, collections) {
  const normalized = normalizeText(query);
  if (!normalized) return [];
  const entries = [
    ...(collections.opportunities || []).map((item) => ({ type: 'opportunity', item })),
    ...(collections.services || []).map((item) => ({ type: 'service', item })),
    ...(collections.signals || []).map((item) => ({ type: 'signal', item })),
    ...(collections.demands || []).map((item) => ({ type: 'demand', item }))
  ];
  return entries
    .filter(({ item }) => matchesQuery(item, normalized))
    .map((entry) => {
      const text = searchableText(entry.item);
      let relevance = 0;
      normalized.split(' ').forEach((token) => {
        if (normalizeText(entry.item.title || entry.item.name || '').includes(token)) relevance += 6;
        if (text.includes(token)) relevance += 2;
      });
      return { ...entry, relevance };
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 18);
}

export function categorySummary(categories, opportunities, services, demands) {
  return categories
    .map((category) => {
      const categoryOpportunities = opportunities.filter((item) => item.category === category.id);
      const categoryServices = services.filter((item) => item.category === category.id);
      const categoryDemands = demands.filter((item) => item.category === category.id);
      const heat = categoryOpportunities.length
        ? Math.round(
            categoryOpportunities.reduce((sum, item) => sum + opportunityScore(item), 0) /
              categoryOpportunities.length
          )
        : 0;
      return {
        ...category,
        opportunityCount: categoryOpportunities.length,
        serviceCount: categoryServices.length,
        demandCount: categoryDemands.length,
        heat
      };
    })
    .sort((a, b) => b.heat - a.heat);
}

export function recommendForPreferences(items, preferences = {}) {
  const preferredCategories = new Set(preferences.categories || []);
  return [...items]
    .map((item) => {
      let boost = opportunityScore(item);
      if (preferredCategories.has(item.category)) boost += 14;
      if (preferences.solo && item.soloFriendly) boost += 9;
      if (preferences.lowBudget && /10万円以下|5万円以下/.test(item.budgetBand || '')) boost += 8;
      if (preferences.japan && item.region === 'japan') boost += 7;
      return { item, personalizedScore: boost };
    })
    .sort((a, b) => b.personalizedScore - a.personalizedScore)
    .map(({ item }) => item);
}

export function portfolioStats(savedIds, opportunities) {
  const saved = opportunities.filter((item) => savedIds.includes(item.id));
  if (!saved.length) {
    return { count: 0, averageScore: 0, averageMomentum: 0, categories: 0, evidenceA: 0 };
  }
  return {
    count: saved.length,
    averageScore: Math.round(saved.reduce((sum, item) => sum + opportunityScore(item), 0) / saved.length),
    averageMomentum: Math.round(saved.reduce((sum, item) => sum + item.momentum, 0) / saved.length),
    categories: new Set(saved.map((item) => item.category)).size,
    evidenceA: saved.filter((item) => item.evidenceGrade === 'A').length
  };
}

export function safeId(prefix, value) {
  const normalized = normalizeText(value)
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
  return `${prefix}-${normalized || Date.now()}`;
}

export function routeFor(type, id) {
  const map = {
    opportunity: 'opportunity',
    service: 'service',
    signal: 'signal',
    demand: 'demand'
  };
  return `#/${map[type] || type}/${id}`;
}

export function parseHash(hash = '#/discover') {
  const clean = hash.replace(/^#\/?/, '');
  const [rawPage = 'discover', rawId = null] = clean.split('/');
  const decode = (value) => {
    if (value == null) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  const page = decode(rawPage) || 'discover';
  return { page, id: decode(rawId) };
}

export function getCategoryLabel(categories, id) {
  return categories.find((category) => category.id === id)?.label || id || 'その他';
}

export function evidenceMeta(grade) {
  return {
    A: { label: '一次根拠', detail: '公的資料・法定開示・確定取引など', tone: 'strong' },
    B: { label: '直接開示', detail: '運営者開示と複数の裏付け', tone: 'good' },
    C: { label: '推定', detail: '第三者推定または限定的な根拠', tone: 'caution' },
    D: { label: '未確認', detail: '自己申告または未検証情報', tone: 'weak' }
  }[grade] || { label: '未評価', detail: '評価前', tone: 'weak' };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}
