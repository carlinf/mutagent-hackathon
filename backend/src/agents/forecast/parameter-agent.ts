import type {
  AgentContext,
  AgentRequest,
  AreaMetric,
  WhatIfScenarioConfig,
  WhatIfScenarioId,
} from "../../types/domain";
import { round } from "../../utils/scoring";
import type { ForecastAreaParameters, ForecastParameters } from "./types";

const scenarioConfigs: Record<WhatIfScenarioId, WhatIfScenarioConfig> = {
  "followup-delay": {
    id: "followup-delay",
    label: "Follow-up delay",
    description:
      "What may happen if high-priority follow-up areas are not acted on during the next planning cycles.",
    assumptions: [
      "Referral gaps remain unresolved.",
      "High-risk sessions continue to require coordination.",
      "Field capacity is not reallocated toward the highest-pressure communes.",
    ],
  },
  "referral-backlog": {
    id: "referral-backlog",
    label: "Referral backlog",
    description:
      "What may happen if referral coordination demand grows faster than teams can close follow-up loops.",
    assumptions: [
      "Referral volume keeps moving with recent workbook patterns.",
      "Areas with referrals and high-risk sessions accumulate backlog pressure.",
      "No additional CSB coordination capacity is added.",
    ],
  },
  "data-quality-drift": {
    id: "data-quality-drift",
    label: "Data quality drift",
    description:
      "What may happen if unresolved data quality issues keep reducing confidence in field prioritisation.",
    assumptions: [
      "Missing GPS, duplicate UID, and required-field issues persist.",
      "Data cleanup does not happen before the next operating cycle.",
      "Planning confidence falls more quickly in already noisy areas.",
    ],
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0.04;

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));

  return Math.sqrt(variance);
}

function hashSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function scenarioFor(request: AgentRequest) {
  return scenarioConfigs[request.options?.scenarioId ?? "followup-delay"];
}

function pressureDrivers(area: AreaMetric, scenarioId: WhatIfScenarioId) {
  const drivers: string[] = [];

  if (area.referralGaps > 0) drivers.push(`${area.referralGaps} referral gaps`);
  if (area.highRiskSessions > 0) {
    drivers.push(`${area.highRiskSessions} high-risk sessions`);
  }
  if (area.dataQualityPenalty > 0) {
    drivers.push(`${area.dataQualityPenalty} data-quality penalties`);
  }
  if (area.referrals > 0) drivers.push(`${area.referrals} referrals`);

  if (scenarioId === "followup-delay") {
    drivers.push("no prioritised follow-up response");
  }

  if (scenarioId === "referral-backlog") {
    drivers.push("referral coordination backlog pressure");
  }

  if (scenarioId === "data-quality-drift") {
    drivers.push("planning confidence loss from unresolved data issues");
  }

  return drivers.slice(0, 5);
}

function areaDrift(area: AreaMetric, scenarioId: WhatIfScenarioId) {
  const referralGapPressure = clamp(area.referralGaps / 8, 0, 1);
  const dataPressure = clamp(area.dataQualityPenalty / 8, 0, 1);
  const riskPressure = clamp(area.highRiskSessions / Math.max(area.sessions, 1), 0, 1);
  const referralPressure = clamp(area.referrals / Math.max(area.sessions, 1), 0, 1);

  if (scenarioId === "referral-backlog") {
    return 0.018 + referralPressure * 0.05 + riskPressure * 0.028;
  }

  if (scenarioId === "data-quality-drift") {
    return 0.014 + dataPressure * 0.052 + referralGapPressure * 0.024;
  }

  return 0.02 + referralGapPressure * 0.046 + riskPressure * 0.03;
}

function selectAreas(areas: AreaMetric[], scenarioId: WhatIfScenarioId, limit: number) {
  return areas
    .slice()
    .sort((first, second) => {
      if (scenarioId === "data-quality-drift") {
        const penaltyDelta = second.dataQualityPenalty - first.dataQualityPenalty;
        if (penaltyDelta !== 0) return penaltyDelta;
      }

      if (scenarioId === "referral-backlog") {
        const referralDelta = second.referrals - first.referrals;
        if (referralDelta !== 0) return referralDelta;
      }

      const gapDelta = second.referralGaps - first.referralGaps;
      if (gapDelta !== 0) return gapDelta;

      return second.followupPriorityScore - first.followupPriorityScore;
    })
    .slice(0, limit);
}

export class MonteCarloParameterAgent {
  readonly name = "MonteCarloParameterAgent";

  run(context: AgentContext, request: AgentRequest): ForecastParameters {
    const scenario = scenarioFor(request);
    const horizonMonths = Math.min(
      Math.max(request.options?.horizonMonths ?? 6, 3),
      12,
    );
    const iterations = Math.min(
      Math.max(request.options?.iterations ?? 1200, 200),
      5000,
    );
    const limit = Math.min(Math.max(request.options?.limit ?? 6, 3), 10);
    const monthlyScores = context.monthlyMetrics.map(
      (item) => item.followupPriorityScore,
    );
    const monthlyDeltas = monthlyScores.slice(1).map((score, index) => {
      return score - (monthlyScores[index] ?? score);
    });
    const baselineTrend = clamp(average(monthlyDeltas), -0.04, 0.04);
    const volatility = clamp(standardDeviation(monthlyDeltas), 0.018, 0.11);
    const selectedAreas = selectAreas(context.communeMetrics, scenario.id, limit);
    const areas: ForecastAreaParameters[] = selectedAreas.map((area) => ({
      area,
      drift: round(areaDrift(area, scenario.id) + baselineTrend * 0.2, 4),
      volatility: round(
        volatility +
          area.followupPriorityScore * 0.02 +
          clamp(area.dataQualityPenalty / 20, 0, 0.035),
        4,
      ),
      drivers: pressureDrivers(area, scenario.id),
    }));

    return {
      scenario,
      horizonMonths,
      iterations,
      horizonLabels: Array.from(
        { length: horizonMonths },
        (_, index) => `M+${index + 1}`,
      ),
      baselineTrend,
      areas,
      seed: hashSeed(`${scenario.id}:${context.summary.rows}:${iterations}`),
    };
  }
}
