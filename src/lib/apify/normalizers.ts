import { calculatePulseScore } from "@/lib/pulse-score";
import type { Offer } from "@/types";
import type { NormalizedAd, OfferGroup } from "./types";

const firstText = (raw: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) { const value = raw[key]; if (typeof value === "string" && value.trim()) return value.trim(); if (typeof value === "number") return String(value); }
  return null;
};
const nested = (raw: Record<string, unknown>, path: string[]) => path.reduce<unknown>((value, key) => {
  if (Array.isArray(value)) { const index = Number(key); return Number.isInteger(index) ? value[index] : undefined; }
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}, raw);
const nestedText = (raw: Record<string, unknown>, paths: string[][]) => {
  for (const path of paths) { const value = nested(raw, path); if (typeof value === "string" && value.trim()) return value.trim(); }
  return null;
};
const date = (value: string | null) => {
  if (!value) return null;
  const unixSeconds = /^\d{9,11}$/.test(value) ? Number(value) * 1_000 : Number.NaN;
  const timestamp = Number.isNaN(unixSeconds) ? Date.parse(value) : unixSeconds;
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
};
const domain = (url: string | null) => { try { return url ? new URL(url).hostname.replace(/^www\./, "") : null; } catch { return null; } };

/** Keeps raw source data intact while adapting known actor fields to stable application names. */
export function normalizeApifyAd(raw: Record<string, unknown>): NormalizedAd {
  const snapshot = nested(raw, ["snapshot"]);
  const snapshotData = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot as Record<string, unknown> : {};
  const landingPageUrl = firstText(raw, ["landingPageUrl", "landing_page_url", "destinationUrl", "destination_url", "linkUrl", "link_url"]) || nestedText(raw, [["snapshot", "link_url"], ["snapshot", "cards", "0", "link_url"]]);
  const publisherPlatforms = Array.isArray(raw.publisher_platform) ? raw.publisher_platform.filter((value): value is string => typeof value === "string") : [];
  return {
    externalAdId: firstText(raw, ["adArchiveID", "ad_archive_id", "adId", "ad_id", "id"]),
    advertiserName: firstText(raw, ["pageName", "page_name", "advertiserName", "advertiser_name", "page_name_display"]),
    advertiserId: firstText(raw, ["pageId", "page_id", "advertiserId", "advertiser_id"]),
    adStatus: firstText(raw, ["adStatus", "ad_status", "status"]) || (raw.is_active === true ? "active" : raw.is_active === false ? "inactive" : null),
    startDate: date(firstText(raw, ["startDate", "start_date", "ad_delivery_start_time", "adDeliveryStartTime"])),
    endDate: date(firstText(raw, ["endDate", "end_date", "ad_delivery_stop_time", "adDeliveryStopTime"])),
    adCopy: firstText(raw, ["adCopy", "ad_copy", "body", "ad_creative_body", "creativeBody"]) || nestedText(raw, [["snapshot", "body", "text"], ["snapshot", "body"]]),
    headline: firstText(raw, ["headline", "title", "ad_creative_link_title", "linkTitle"]) || nestedText(raw, [["snapshot", "title"], ["snapshot", "cards", "0", "title"]]),
    description: firstText(raw, ["description", "ad_creative_link_description", "linkDescription"]) || nestedText(raw, [["snapshot", "link_description"], ["snapshot", "cards", "0", "link_description"]]),
    creativeType: firstText(raw, ["creativeType", "creative_type", "mediaType", "media_type"]) || (typeof snapshotData.display_format === "string" ? snapshotData.display_format : null),
    creativeUrl: firstText(raw, ["creativeUrl", "creative_url", "imageUrl", "image_url", "videoUrl", "video_url"]) || nestedText(raw, [["snapshot", "cards", "0", "original_image_url"], ["snapshot", "cards", "0", "resized_image_url"], ["snapshot", "cards", "0", "video_preview_image_url"], ["snapshot", "images", "0", "original_image_url"], ["snapshot", "videos", "0", "video_preview_image_url"]]),
    landingPageUrl,
    facebookAdsLibraryUrl: firstText(raw, ["facebookAdsLibraryUrl", "facebook_ads_library_url", "adLibraryUrl", "ad_library_url", "url"]),
    country: firstText(raw, ["country", "countryCode", "country_code"]) || nestedText(raw, [["snapshot", "country_iso_code"]]),
    platform: firstText(raw, ["platform", "publisherPlatform", "publisher_platform"]) || publisherPlatforms[0] || "facebook",
    raw,
  };
}

function groupKey(ad: NormalizedAd) { return [ad.advertiserId || ad.advertiserName || "unknown", domain(ad.landingPageUrl) || "unknown-domain", ad.landingPageUrl || "unknown-url"].join("|"); }
function oldestAndNewest(ads: NormalizedAd[]) { const dates = ads.map((ad) => ad.startDate).filter((value): value is string => Boolean(value)).sort(); return { oldest: dates[0] ?? null, newest: dates.at(-1) ?? null }; }

export function groupAdsIntoOffers(ads: NormalizedAd[]): OfferGroup[] {
  const groups = new Map<string, NormalizedAd[]>();
  for (const ad of ads) { const key = groupKey(ad); groups.set(key, [...(groups.get(key) ?? []), ad]); }
  return [...groups.entries()].map(([key, groupedAds]) => {
    const first = groupedAds[0]; const activeAds = groupedAds.filter((ad) => ad.adStatus?.toLowerCase() === "active" || ad.adStatus === null).length;
    const { oldest, newest } = oldestAndNewest(groupedAds); const started = oldest ? Math.max(0, Math.floor((Date.now() - Date.parse(oldest)) / 86_400_000)) : null;
    return { key, advertiserName: first.advertiserName, advertiserId: first.advertiserId, destinationDomain: domain(first.landingPageUrl), landingPageUrl: first.landingPageUrl, ads: groupedAds, activeAds, totalAdsFound: groupedAds.length, uniqueCreatives: new Set(groupedAds.map((ad) => ad.creativeUrl).filter(Boolean)).size, oldestAdStartedAt: oldest, newestAdStartedAt: newest, oldestActiveAdDays: started };
  });
}

/** A first run has no prior snapshot; growth stays unknown and momentum is explicitly pending. */
export function groupsToDashboardOffers(groups: OfferGroup[], country: string): Offer[] {
  return groups.map((group, index) => {
    const first = group.ads[0]; const score = calculatePulseScore({ activeAds: group.activeAds, adGrowthPercent: 0, oldestActiveAdDays: group.oldestActiveAdDays ?? 0, uniqueCreatives: group.uniqueCreatives, visualLowTicketFit: 0 }).total;
    return { id: `real-${index}-${group.key}`, name: first.headline || group.advertiserName || "Oferta sem headline", advertiser: group.advertiserName || "Anunciante não identificado", niche: "Não classificado", subniche: group.destinationDomain || "Domínio indisponível", country: first.country || country, language: "Não informado", thumbnail: first.creativeUrl || "", dataSource: "REAL", landingPageUrl: group.landingPageUrl || "#", headline: first.headline || "Não informado", promise: first.description || first.adCopy || "Não informado", productFormat: first.creativeType || "Não informado", observedPrice: 0, currency: "BRL", activeAds: group.activeAds, adGrowth: 0, oldestAdDays: group.oldestActiveAdDays ?? 0, creativeCount: group.uniqueCreatives, pulseScore: score, status: group.activeAds > 1 ? "new" : "stable", firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), history: [], momentumPending: true };
  });
}
