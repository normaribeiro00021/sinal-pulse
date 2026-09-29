import "server-only";
import type { ApifyRunResult, MiningRequest } from "./types";
import { buildActorInput } from "./meta-ads";

const API_BASE = "https://api.apify.com/v2";

function apiUrl(path: string) { return `${API_BASE}${path}`; }
async function apifyFetch(path: string, init?: RequestInit) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN não está configurado no ambiente do servidor.");
  const response = await fetch(apiUrl(path), { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers }, cache: "no-store" });
  if (!response.ok) throw new Error(`Apify respondeu ${response.status}: ${await response.text()}`);
  return response.json() as Promise<{ data: unknown }>;
}

export async function runFacebookAdsActor(request: MiningRequest): Promise<ApifyRunResult> {
  const actorId = process.env.APIFY_META_ACTOR_ID || "curious_coder/facebook-ads-library-scraper";
  // Apify's REST route identifies actors as owner~actor, while .env uses owner/actor.
  const actorApiId = actorId.replace("/", "~");
  const run = await apifyFetch(`/acts/${encodeURIComponent(actorApiId)}/runs?waitForFinish=120`, { method: "POST", body: JSON.stringify(buildActorInput(request)) });
  if (!run.data || typeof run.data !== "object" || Array.isArray(run.data)) throw new Error("O Apify retornou uma execução inválida.");
  const runData = run.data as Record<string, unknown>;
  const actorRunId = String(runData.id ?? ""); const datasetId = String(runData.defaultDatasetId ?? "");
  if (!actorRunId || !datasetId) throw new Error("A execução do Apify não retornou identificador de run ou dataset.");
  if (runData.status !== "SUCCEEDED") throw new Error(`A execução do Apify terminou com status ${String(runData.status)}.`);
  const dataset = await apifyFetch(`/datasets/${encodeURIComponent(datasetId)}/items?limit=${request.limit}&clean=true`, { method: "GET" });
  // Dataset items are returned directly as an array by Apify, unlike the run endpoint
  // which uses a { data } envelope.
  const items = Array.isArray(dataset) ? dataset as unknown as Record<string, unknown>[] : [];
  const usage = runData.usageTotalUsd ?? (runData.usage as Record<string, unknown> | undefined)?.totalUsd;
  return { actorRunId, datasetId, items, costUsd: typeof usage === "number" ? usage : null };
}
