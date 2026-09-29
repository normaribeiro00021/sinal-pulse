import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { OfferGroup } from "@/lib/apify/types";
import { calculatePulseScore } from "@/lib/pulse-score";

export async function createMiningRun(keyword: string, country: string) {
  const db = getSupabaseAdmin();
  const { data: keywordRow, error: keywordError } = await db.from("sp_keywords").upsert({ term: keyword, country }, { onConflict: "term,country" }).select("id").single();
  if (keywordError) throw keywordError;
  const { data, error } = await db.from("sp_mining_runs").insert({ keyword_id: keywordRow.id, country, status: "preparing", started_at: new Date().toISOString() }).select("id").single();
  if (error) throw error; return data.id as string;
}

export async function updateMiningRun(id: string, values: Record<string, unknown>) { const { error } = await getSupabaseAdmin().from("sp_mining_runs").update(values).eq("id", id); if (error) throw error; }

export async function assertMiningCapacity() {
  const db = getSupabaseAdmin();
  const perHour = Math.max(1, Number(process.env.SINAL_PULSE_MINING_MAX_PER_HOUR || 3));
  const since = new Date(Date.now() - 60 * 60 * 1_000).toISOString();
  const { count, error } = await db.from("sp_mining_runs").select("id", { count: "exact", head: true }).gte("started_at", since);
  if (error) throw error;
  if ((count ?? 0) >= perHour) throw new Error("Limite de minerações por hora atingido. Tente novamente mais tarde.");
}

export async function persistOfferGroups(groups: OfferGroup[], runId: string) {
  const db = getSupabaseAdmin(); const now = new Date().toISOString();
  for (const group of groups) {
    const first = group.ads[0];
    const advertiserKey = group.advertiserId || `name:${(group.advertiserName || "Anunciante não identificado").toLowerCase()}`;
    const { data: advertiser, error: advertiserError } = await db.from("sp_advertisers").upsert({ name: group.advertiserName || "Anunciante não identificado", external_id: advertiserKey, updated_at: now }, { onConflict: "external_id" }).select("id").single();
    if (advertiserError) throw advertiserError;
    const { data: offer, error: offerError } = await db.from("sp_offers").upsert({ name: first.headline || group.advertiserName || "Oferta sem headline", advertiser_id: advertiser.id, landing_page_url: group.landingPageUrl || "", country: first.country, headline: first.headline, promise: first.description || first.adCopy, product_format: first.creativeType, first_seen_at: now, last_seen_at: now, source: "apify" }, { onConflict: "advertiser_id,landing_page_url" }).select("id,first_seen_at").single();
    if (offerError) throw offerError;
    const ads = group.ads.map((ad, index) => ({ external_ad_id: ad.externalAdId || ad.facebookAdsLibraryUrl || `unidentified:${offer.id}:${index}`, offer_id: offer.id, advertiser_id: advertiser.id, platform: ad.platform || "facebook", status: ad.adStatus, creative_type: ad.creativeType, creative_url: ad.creativeUrl, ad_copy: ad.adCopy, destination_url: ad.landingPageUrl, started_at: ad.startDate, ended_at: ad.endDate, first_seen_at: now, last_seen_at: now, raw_data: ad.raw }));
    if (ads.length) { const { error } = await db.from("sp_ads").upsert(ads, { onConflict: "platform,external_ad_id" }); if (error) throw error; }
    const { error: snapshotError } = await db.from("sp_offer_snapshots").upsert({ offer_id: offer.id, snapshot_date: now.slice(0, 10), active_ads: group.activeAds, total_ads: group.totalAdsFound, unique_creatives: group.uniqueCreatives, oldest_active_ad_days: group.oldestActiveAdDays, new_ads_since_previous_snapshot: null, removed_ads_since_previous_snapshot: null, mining_run_id: runId }, { onConflict: "offer_id,snapshot_date" });
    if (snapshotError) throw snapshotError;
    const score = calculatePulseScore({ activeAds: group.activeAds, adGrowthPercent: 0, oldestActiveAdDays: group.oldestActiveAdDays ?? 0, uniqueCreatives: group.uniqueCreatives, visualLowTicketFit: 0 });
    const { error: scoreError } = await db.from("sp_offer_scores").upsert({ offer_id: offer.id, score_date: now.slice(0, 10), pulse_score: score.total, scale_score: score.scale, momentum_score: null, momentum_status: "pending_history", longevity_score: score.longevity, creative_diversity_score: score.creativeDiversity, fit_score: score.fit }, { onConflict: "offer_id,score_date" }); if (scoreError) throw scoreError;
  }
}
