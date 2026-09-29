import type { MiningRequest } from "./types";

export function buildMetaAdsLibraryUrl({ keyword, country, activeStatus }: MiningRequest) {
  const url = new URL("https://www.facebook.com/ads/library/");
  url.search = new URLSearchParams({
    active_status: activeStatus,
    ad_type: "all",
    country: country.toUpperCase(),
    q: keyword.trim(),
    search_type: "keyword_unordered",
    media_type: "all",
  }).toString();
  return url.toString();
}

export function buildActorInput(request: MiningRequest) {
  const metaAdsLibraryUrl = buildMetaAdsLibraryUrl(request);
  return {
    urls: [{ url: metaAdsLibraryUrl }],
    count: request.limit,
    limitPerSource: request.limit,
    "scrapePageAds.activeStatus": request.activeStatus,
    "scrapePageAds.countryCode": request.country.toUpperCase(),
    "scrapePageAds.sortBy": "most_recent",
    runTag: "sinal-pulse",
  };
}
