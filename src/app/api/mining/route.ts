import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runFacebookAdsActor } from "@/lib/apify/client";
import { groupAdsIntoOffers, groupsToDashboardOffers, normalizeApifyAd } from "@/lib/apify/normalizers";
import { assertMiningCapacity, createMiningRun, persistOfferGroups, updateMiningRun } from "@/lib/mining-store";
import type { MiningRequest } from "@/lib/apify/types";

export const runtime = "nodejs";
let activeRun = false;

function hasMiningAccess(request: Request) {
  const expected = process.env.SINAL_PULSE_MINING_ACCESS_TOKEN;
  const received = request.headers.get("x-sinal-pulse-mining-key");
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected); const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function parseRequest(body: unknown): MiningRequest {
  const input = body as Partial<MiningRequest>;
  const keyword = typeof input.keyword === "string" ? input.keyword.trim() : "";
  const country = typeof input.country === "string" ? input.country.toUpperCase() : "";
  const activeStatus = input.activeStatus;
  const limit = Number(input.limit);
  if (!keyword || keyword.length > 160) throw new Error("Informe uma palavra-chave de até 160 caracteres.");
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("Informe um país ISO de duas letras.");
  if (activeStatus !== "active" && activeStatus !== "inactive" && activeStatus !== "all") throw new Error("Status de anúncio inválido.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("O limite deve estar entre 1 e 100.");
  return { keyword, country, activeStatus, limit };
}

export async function POST(request: Request) {
  if (!hasMiningAccess(request)) return NextResponse.json({ error: "Acesso de mineração não autorizado." }, { status: 401 });
  if (activeRun) return NextResponse.json({ error: "Já existe uma mineração em andamento." }, { status: 409 });
  activeRun = true; let miningRunId: string | null = null;
  try {
    const input = parseRequest(await request.json());
    await assertMiningCapacity();
    miningRunId = await createMiningRun(input.keyword, input.country);
    await updateMiningRun(miningRunId, { status: "searching", filters: { country: input.country, active_status: input.activeStatus, limit: input.limit } });
    const result = await runFacebookAdsActor(input);
    await updateMiningRun(miningRunId, { status: "processing", actor_run_id: result.actorRunId, dataset_id: result.datasetId, cost_usd: result.costUsd });
    const normalized = result.items.map(normalizeApifyAd);
    const groups = groupAdsIntoOffers(normalized);
    await updateMiningRun(miningRunId, { status: "grouping" });
    await persistOfferGroups(groups, miningRunId);
    await updateMiningRun(miningRunId, { status: "completed", result_count: result.items.length, finished_at: new Date().toISOString() });
    return NextResponse.json({ run: { id: miningRunId, actorRunId: result.actorRunId, datasetId: result.datasetId, adsReturned: result.items.length, groupsGenerated: groups.length, costUsd: result.costUsd }, offers: groupsToDashboardOffers(groups, input.country) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha desconhecida na mineração.";
    if (miningRunId) await updateMiningRun(miningRunId, { status: "failed", error_message: message, finished_at: new Date().toISOString() }).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally { activeRun = false; }
}
