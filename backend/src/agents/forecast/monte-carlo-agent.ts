import type {
  WhatIfAreaForecast,
  WhatIfForecastPoint,
  WhatIfForecastResult,
  WhatIfRaceFrame,
  WhatIfRaceStanding,
} from "../../types/domain";
import { round } from "../../utils/scoring";
import type { ForecastAreaParameters, ForecastParameters } from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function mulberry32(seed: number) {
  let state = seed;

  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normalSample(random: () => number) {
  const first = Math.max(random(), 0.000001);
  const second = Math.max(random(), 0.000001);

  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function quantile(values: number[], percentile: number) {
  if (values.length === 0) return 0;

  const sorted = values.slice().sort((first, second) => first - second);
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) return sorted[lower] ?? 0;

  const weight = index - lower;

  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}

function baselineFor(area: ForecastAreaParameters, monthIndex: number) {
  return clamp(
    area.area.followupPriorityScore + area.drift * 0.35 * monthIndex,
    0.02,
    0.98,
  );
}

function runAreaForecast(
  area: ForecastAreaParameters,
  params: ForecastParameters,
  areaIndex: number,
): WhatIfAreaForecast {
  const samplesByMonth = Array.from({ length: params.horizonMonths }, () => [] as number[]);
  const random = mulberry32(params.seed + areaIndex * 9973);

  for (let iteration = 0; iteration < params.iterations; iteration += 1) {
    let score = area.area.followupPriorityScore;

    for (let monthIndex = 0; monthIndex < params.horizonMonths; monthIndex += 1) {
      const widening = 1 + monthIndex * 0.09;
      const shock = normalSample(random) * area.volatility * widening;
      const persistence = (score - area.area.followupPriorityScore) * 0.08;

      score = clamp(score + area.drift + shock + persistence, 0.02, 0.99);
      samplesByMonth[monthIndex]?.push(score);
    }
  }

  const trajectory: WhatIfForecastPoint[] = samplesByMonth.map(
    (samples, monthIndex) => ({
      monthIndex: monthIndex + 1,
      label: params.horizonLabels[monthIndex] ?? `M+${monthIndex + 1}`,
      baseline: round(baselineFor(area, monthIndex + 1)),
      p10: round(quantile(samples, 0.1)),
      p50: round(quantile(samples, 0.5)),
      p90: round(quantile(samples, 0.9)),
    }),
  );
  const finalPoint = trajectory.at(-1);
  const projectedMedian = finalPoint?.p50 ?? area.area.followupPriorityScore;
  const projectedP90 = finalPoint?.p90 ?? area.area.followupPriorityScore;

  return {
    areaId: area.area.id,
    areaName: area.area.name,
    region: area.area.region,
    district: area.area.district,
    currentScore: round(area.area.followupPriorityScore),
    projectedMedian,
    projectedP90,
    riskDelta: round(projectedMedian - area.area.followupPriorityScore),
    volatility: round(area.volatility),
    rank: 0,
    drivers: area.drivers,
    trajectory,
  };
}

function raceValue(area: WhatIfAreaForecast, point: WhatIfForecastPoint) {
  return round(point.p50 + area.volatility * 0.03);
}

function buildRaceFrames(areas: WhatIfAreaForecast[], horizonMonths: number) {
  const frames: WhatIfRaceFrame[] = [];

  for (let monthIndex = 0; monthIndex < horizonMonths; monthIndex += 1) {
    const standings = areas
      .map<WhatIfRaceStanding>((area) => {
        const point = area.trajectory[monthIndex] ?? area.trajectory.at(-1);
        const value = point ? raceValue(area, point) : area.currentScore;

        return {
          areaId: area.areaId,
          areaName: area.areaName,
          region: area.region,
          value,
          delta: round((point?.p50 ?? value) - area.currentScore),
          rank: 0,
        };
      })
      .sort((first, second) => second.value - first.value)
      .map((standing, index) => ({ ...standing, rank: index + 1 }));

    frames.push({
      monthIndex: monthIndex + 1,
      label: `M+${monthIndex + 1}`,
      standings,
    });
  }

  return frames;
}

export class ScenarioMonteCarloAgent {
  readonly name = "ScenarioMonteCarloAgent";

  run(params: ForecastParameters): Omit<WhatIfForecastResult, "rationale"> {
    const areas = params.areas
      .map((area, index) => runAreaForecast(area, params, index))
      .sort((first, second) => {
        const riskDelta = second.riskDelta - first.riskDelta;
        if (Math.abs(riskDelta) > 0.015) return riskDelta;

        return second.projectedMedian - first.projectedMedian;
      })
      .map((area, index) => ({ ...area, rank: index + 1 }));
    const highest = areas[0];
    const summary = highest
      ? `${params.scenario.label} projects the sharpest risk movement in ${highest.areaName}, with median priority moving from ${Math.round(highest.currentScore * 100)} to ${Math.round(highest.projectedMedian * 100)} over ${params.horizonMonths} months.`
      : "No forecast areas were available from the current workbook.";

    return {
      generatedAt: new Date().toISOString(),
      scenario: params.scenario,
      horizonMonths: params.horizonMonths,
      iterations: params.iterations,
      subAgents: ["MonteCarloParameterAgent", this.name],
      summary,
      areas,
      raceFrames: buildRaceFrames(areas, params.horizonMonths),
    };
  }
}
