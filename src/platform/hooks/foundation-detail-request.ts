export interface BusinessDetailRequestInput {
  targetId: string;
  latestDossierHash?: string;
  knownCurated: boolean;
  knownFoundation: boolean;
}

export function businessDetailRequestUrls(input: BusinessDetailRequestInput): string[] {
  const entity = encodeURIComponent(input.targetId);
  const normal = `/api/businesses?entity_id=${entity}${input.latestDossierHash
    ? `&dossier_hash=${encodeURIComponent(input.latestDossierHash)}`
    : ''}`;
  const foundationOnly = `/api/businesses?entity_id=${entity}&foundationOnly=true`;

  if (input.knownCurated) return [normal];
  if (input.knownFoundation) return [foundationOnly];

  // A deep link can run before either catalog has loaded. Try the cheap
  // Foundation path first; only a definitive 404 may fall through to curated.
  return [foundationOnly, normal];
}

export async function fetchBusinessDetailResponse(
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  input: BusinessDetailRequestInput,
): Promise<Response> {
  const urls = businessDetailRequestUrls(input);
  let response: Response | null = null;
  for (const url of urls) {
    response = await fetcher(url);
    if (response.ok || response.status !== 404) return response;
  }
  if (!response) throw new Error('Business detail request plan was empty');
  return response;
}
