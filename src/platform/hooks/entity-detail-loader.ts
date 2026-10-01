import type { FinancialEntity } from '@/shared/terminal';
import { parseFinancialEntity } from '@/shared/financial-entity-schema';
import { fetchBusinessDetailResponse } from './foundation-detail-request';

/**
 * 一覧を読み込んでいない画面（比較など）で、1件の事例の詳細を取得する。
 * 公開目録の事例を FinancialEntity で返す。
 * 見つからない・公開できない事例は null。
 */
export async function loadEntityDetail(
  id: string,
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> = fetch,
): Promise<FinancialEntity | null> {
  const response = await fetchBusinessDetailResponse(fetcher, { targetId: id });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as { data?: unknown };
  if (!body.data || typeof body.data !== 'object') return null;
  const entity = parseFinancialEntity(body.data);
  return entity.id.toLowerCase() === id.toLowerCase() ? entity : null;
}
