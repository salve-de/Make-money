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
  // Foundation path first; if Foundation is absent or unavailable in this
  // environment, allow one normal lookup so curated deep links still resolve.
  return [foundationOnly, normal];
}

export async function fetchBusinessDetailResponse(
  fetcher: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  input: BusinessDetailRequestInput,
): Promise<Response> {
  const urls = businessDetailRequestUrls(input);
  let response: Response | null = null;
  for (let index = 0; index < urls.length; index += 1) {
    response = await fetcher(urls[index]);
    if (response.ok) return response;
    const mayTryNormalFallback =
      index + 1 < urls.length &&
      (response.status === 404 || response.status === 503);
    if (!mayTryNormalFallback) return response;
  }
  if (!response) throw new Error('Business detail request plan was empty');
  return response;
}
