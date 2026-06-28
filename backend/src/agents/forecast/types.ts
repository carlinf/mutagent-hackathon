import type {
  AreaMetric,
  WhatIfScenarioConfig,
} from "../../types/domain";

export interface ForecastAreaParameters {
  area: AreaMetric;
  drift: number;
  volatility: number;
  drivers: string[];
}

export interface ForecastParameters {
  scenario: WhatIfScenarioConfig;
  horizonMonths: number;
  iterations: number;
  horizonLabels: string[];
  baselineTrend: number;
  areas: ForecastAreaParameters[];
  seed: number;
}
