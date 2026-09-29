export type MiningRequest = { keyword: string; country: string; activeStatus: "active" | "inactive" | "all"; limit: number };

export type NormalizedAd = {
  externalAdId: string | null;
  advertiserName: string | null;
  advertiserId: string | null;
  adStatus: string | null;
  startDate: string | null;
  endDate: string | null;
  adCopy: string | null;
  headline: string | null;
  description: string | null;
  creativeType: string | null;
  creativeUrl: string | null;
  landingPageUrl: string | null;
  facebookAdsLibraryUrl: string | null;
  country: string | null;
  platform: string | null;
  raw: Record<string, unknown>;
};

export type OfferGroup = {
  key: string;
  advertiserName: string | null;
  advertiserId: string | null;
  destinationDomain: string | null;
  landingPageUrl: string | null;
  ads: NormalizedAd[];
  activeAds: number;
  totalAdsFound: number;
  uniqueCreatives: number;
  oldestAdStartedAt: string | null;
  newestAdStartedAt: string | null;
  oldestActiveAdDays: number | null;
};

export type ApifyRunResult = { actorRunId: string; datasetId: string; items: Record<string, unknown>[]; costUsd: number | null };
