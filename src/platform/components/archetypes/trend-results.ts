import type { MarketAnomaly } from '../../types/terminal';

/** Selection and metrics always describe the same filtered set, including zero results. */
export function selectTrendResults(items: MarketAnomaly[], search: string, selectedId: string) {
  const query = search.trim().toLowerCase();
  const filteredAnomalies = items.filter((item) =>
    [item.title, item.subtitle, item.categoryLabel, item.targetPainWallet, item.incumbentTrap, item.trendingPlaybook]
      .some((value) => value.toLowerCase().includes(query)),
  );
  const margins = filteredAnomalies.map((item) => item.netMarginPercent).filter(Number.isFinite);
  return {
    filteredAnomalies,
    activeAnomaly: filteredAnomalies.find((item) => item.id === selectedId) ?? filteredAnomalies[0],
    avgMargin: margins.length ? (margins.reduce((sum, value) => sum + value, 0) / margins.length).toFixed(1) : null,
    hotCount: filteredAnomalies.filter((item) => item.isHot).length,
    latestUpdatedAt: filteredAnomalies.map((item) => item.updatedAt).sort().at(-1) ?? null,
  };
}
