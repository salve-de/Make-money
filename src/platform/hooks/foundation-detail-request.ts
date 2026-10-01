export interface BusinessDetailRequestInput {
  targetId: string;
  latestDossierHash?: string;
}

/** 詳細の取得先。公開目録の事例だけを返す /api/businesses の1本だけ（収集基盤の直読みは無い）。 */
export function businessDetailRequestUrls(input: BusinessDetailRequestInput): string[] {
  const entity = encodeURIComponent(input.targetId);
  return [`/api/businesses?entity_id=${entity}${input.latestDossierHash
    ? `&dossier_hash=${encodeURIComponent(input.latestDossierHash)}`
    : ''}`];
}

export async function fetchBusinessDetailResponse(
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  input: BusinessDetailRequestInput,
): Promise<Response> {
  return fetcher(businessDetailRequestUrls(input)[0]);
}
