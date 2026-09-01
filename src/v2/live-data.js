import { demands, listings, opportunities, publicCollections, services, signals, sources } from "./data.js";

const asArray = (value) => Array.isArray(value) ? value : [];
const textArray = (value) => asArray(value).map(String).filter(Boolean);
const objectArray = (value) => asArray(value).filter((item) => item && typeof item === "object");
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const dateOnly = (value) => value ? String(value).slice(0, 10) : new Date().toISOString().slice(0, 10);

function replace(target, values) {
  target.splice(0, target.length, ...values);
}

function relationMap(rows = [], left, right) {
  const map = new Map();
  for (const row of rows) {
    const key = row[left];
    if (!key || !row[right]) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row[right]);
  }
  return map;
}

function sourceRows(dataset) {
  return asArray(dataset.sources).map((row) => ({
    id: row.id,
    grade: row.evidence_grade ?? "D",
    title: row.title ?? row.url,
    publisher: row.publisher ?? "Unknown",
    url: row.url,
    retrievedAt: dateOnly(row.retrieved_at),
    kind: row.source_kind ?? "secondary",
  }));
}

export function applyLiveDataset(dataset) {
  const opportunitySignals = relationMap(dataset.opportunitySignals, "opportunity_id", "signal_id");
  const opportunityDemands = relationMap(dataset.opportunityDemands, "opportunity_id", "demand_id");
  const opportunityProducts = relationMap(dataset.opportunityProducts, "opportunity_id", "product_id");
  const signalSources = relationMap(dataset.signalSources, "signal_id", "source_id");
  const collectionItems = relationMap(dataset.collectionItems, "collection_id", "opportunity_id");

  const liveSignals = asArray(dataset.signals).map((row) => ({
    id: row.id,
    slug: row.slug,
    type: row.signal_type ?? "other",
    amount: row.amount_display ?? "—",
    amountValue: number(row.amount_numeric),
    currency: row.currency ?? "",
    period: row.amount_period ?? "",
    headline: row.headline,
    summary: row.summary ?? "",
    payer: row.payer_name ?? "支払者未登録",
    receiver: row.receiver_name ?? "受取者未登録",
    category: row.category ?? "その他",
    region: row.region ?? "世界",
    grade: row.evidence_grade ?? "D",
    confidence: number(row.confidence),
    change: number(row.change_percent),
    occurredAt: dateOnly(row.occurred_at ?? row.published_at),
    opportunityIds: asArray(dataset.opportunitySignals).filter((rel) => rel.signal_id === row.id).map((rel) => rel.opportunity_id),
    sourceIds: signalSources.get(row.id) ?? [],
  }));

  const liveDemands = asArray(dataset.demands).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    problem: row.problem ?? row.description ?? "",
    payer: row.payer_segment ?? "支払者未登録",
    wtp: row.willingness_to_pay ?? "未確認",
    category: row.category ?? "その他",
    region: row.geography ?? "世界",
    grade: row.evidence_grade ?? "D",
    want: number(row.want_count),
    wouldPay: number(row.would_pay_count),
    solutions: number(row.solution_count),
    pain: number(row.pain_score, 50),
    opportunityIds: asArray(dataset.opportunityDemands).filter((rel) => rel.demand_id === row.id).map((rel) => rel.opportunity_id),
  }));

  const liveServices = asArray(dataset.products).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    oneLiner: row.one_liner ?? row.description ?? "",
    category: row.category ?? "その他",
    url: row.url,
    pricing: row.pricing ?? "要問い合わせ",
    region: textArray(row.regions)[0] ?? "世界",
    languages: textArray(row.languages),
    trust: row.trust_level ?? "unverified",
    owner: row.owner_name ?? "運営者未確認",
    intent: textArray(row.intents),
    opportunityIds: asArray(dataset.opportunityProducts).filter((rel) => rel.product_id === row.id).map((rel) => rel.opportunity_id),
    demandIds: asArray(dataset.productDemands).filter((rel) => rel.product_id === row.id).map((rel) => rel.demand_id),
    stats: {
      views: number(row.view_count),
      saves: number(row.save_count),
      clicks: number(row.click_count),
      leads: number(row.lead_count),
    },
    featured: false,
  }));

  const signalById = new Map(liveSignals.map((item) => [item.id, item]));
  const liveOpportunities = asArray(dataset.opportunities).map((row) => {
    const signalIds = opportunitySignals.get(row.id) ?? [];
    const primarySignal = signalIds.map((id) => signalById.get(id)).find(Boolean);
    const entryRoutes = objectArray(row.entry_routes).length ? objectArray(row.entry_routes).map((value) => value.label ?? value.title ?? String(value)) : textArray(row.entry_routes);
    const channels = objectArray(row.acquisition_channels).length ? objectArray(row.acquisition_channels).map((value) => value.label ?? value.title ?? String(value)) : textArray(row.acquisition_channels);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      eyebrow: row.eyebrow ?? (row.verdict === "enter" ? "参入候補" : row.verdict === "validate" ? "検証候補" : "観察候補"),
      hook: row.hook,
      category: row.category ?? "その他",
      region: row.region ?? "世界",
      stage: row.stage ?? (number(row.momentum_score) >= 90 ? "急上昇" : number(row.momentum_score) >= 75 ? "上昇中" : "初期"),
      verdict: row.verdict ?? "observe",
      amount: primarySignal?.amount ?? row.amount_display ?? "金額確認中",
      amountType: primarySignal?.type ?? row.amount_type ?? "other",
      amountNote: primarySignal ? `${primarySignal.grade}ランクの関連シグナル` : "関連シグナルを確認してください",
      solo: row.solo ?? number(row.team_max, 1) <= 1,
      startCost: row.starting_cost_display ?? "未確認",
      timeToValidate: number(row.time_to_validate_days, 30),
      buyer: row.buyer ?? "買い手未登録",
      businessModel: row.revenue_model ?? "未登録",
      whyNow: row.why_now ?? "",
      insight: row.insight ?? row.why_now ?? "",
      entryRoutes: entryRoutes.filter(Boolean),
      acquisitionChannels: channels.filter(Boolean),
      risks: textArray(row.risks),
      nextSteps: textArray(row.next_steps),
      scores: {
        evidence: number(row.evidence_score),
        momentum: number(row.momentum_score),
        gap: number(row.gap_score, 100 - number(row.competition_score, 50)),
        distribution: number(row.distribution_score, row.accessibility_score),
        feasibility: number(row.feasibility_score, row.accessibility_score),
      },
      signalIds,
      demandIds: opportunityDemands.get(row.id) ?? [],
      serviceIds: opportunityProducts.get(row.id) ?? [],
      tags: textArray(row.tags),
      updatedAt: dateOnly(row.updated_at),
      trend: textArray(row.trend).map(Number).filter(Number.isFinite).length ? textArray(row.trend).map(Number) : [number(row.momentum_score)],
      stats: {
        views: number(row.view_count),
        saves: number(row.save_count),
        want: number(row.want_count),
        wouldPay: number(row.would_pay_count),
        build: number(row.build_count),
        watch: number(row.watcher_count),
      },
    };
  });

  const liveListings = asArray(dataset.listings).map((row) => ({
    id: row.id,
    slug: row.slug,
    serviceId: row.product_id,
    opportunityId: row.opportunity_id,
    type: row.listing_type,
    title: row.title,
    summary: row.summary,
    reward: row.reward ?? "個別相談",
    slots: number(row.slots, 1),
    applications: number(row.application_count),
    region: row.region ?? "オンライン",
    deadline: dateOnly(row.deadline),
    status: row.status,
    tags: textArray(row.tags),
  }));

  const liveCollections = asArray(dataset.collections).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    owner: row.owner_handle ?? row.owner_id ?? "member",
    ownerName: row.owner_name ?? "GOLDMINE member",
    visibility: row.visibility,
    opportunityIds: collectionItems.get(row.id) ?? [],
    followers: number(row.follower_count),
    updatedAt: dateOnly(row.updated_at),
    featured: Boolean(row.featured),
  }));

  if (liveSignals.length) replace(signals, liveSignals);
  if (liveDemands.length) replace(demands, liveDemands);
  if (liveServices.length) replace(services, liveServices);
  if (liveOpportunities.length) replace(opportunities, liveOpportunities);
  if (liveListings.length) replace(listings, liveListings);
  if (liveCollections.length) replace(publicCollections, liveCollections);
  const liveSources = sourceRows(dataset);
  if (liveSources.length) replace(sources, liveSources);

  return {
    opportunities: liveOpportunities.length,
    signals: liveSignals.length,
    services: liveServices.length,
    demands: liveDemands.length,
    listings: liveListings.length,
    collections: liveCollections.length,
  };
}
