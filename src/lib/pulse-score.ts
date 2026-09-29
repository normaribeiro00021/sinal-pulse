export type PulseScoreInput = {
  activeAds: number;
  adGrowthPercent: number;
  oldestActiveAdDays: number;
  uniqueCreatives: number;
  visualLowTicketFit: number;
};

export type PulseScoreBreakdown = {
  scale: number;
  momentum: number;
  longevity: number;
  creativeDiversity: number;
  fit: number;
  total: number;
};

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** V1 deterministic score. Inputs are mock/API-normalized metrics, never revenue estimates. */
export function calculatePulseScore(input: PulseScoreInput): PulseScoreBreakdown {
  const scale = clamp((input.activeAds / 200) * 30, 30);
  const momentum = clamp((input.adGrowthPercent / 100) * 25, 25);
  const longevity = clamp((input.oldestActiveAdDays / 45) * 20, 20);
  const creativeDiversity = clamp((input.uniqueCreatives / 20) * 15, 15);
  const fit = clamp(input.visualLowTicketFit, 10);
  const total = Math.round(scale + momentum + longevity + creativeDiversity + fit);
  return { scale, momentum, longevity, creativeDiversity, fit, total };
}
