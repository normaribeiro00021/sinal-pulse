export type OfferStatus = "accelerating" | "scaling" | "new" | "stable" | "losing";

export type Offer = {
  id: string;
  name: string;
  advertiser: string;
  niche: string;
  subniche: string;
  country: string;
  language: string;
  thumbnail: string;
  dataSource: "MOCK" | "REAL";
  momentumPending?: boolean;
  landingPageUrl: string;
  headline: string;
  promise: string;
  productFormat: string;
  observedPrice: number;
  currency: string;
  activeAds: number;
  adGrowth: number;
  oldestAdDays: number;
  creativeCount: number;
  pulseScore: number;
  status: OfferStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  history: Array<{ date: string; activeAds: number }>;
};
