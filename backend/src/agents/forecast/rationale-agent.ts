import type {
  AgentContext,
  AgentRequest,
  WhatIfForecastResult,
  WhatIfRationale,
} from "../../types/domain";
import type { AgentDependencies } from "../base";

interface RationaleOutput {
  rationale?: WhatIfRationale;
  usedLLM: boolean;
}

function buildSafePayload(context: AgentContext, forecast: WhatIfForecastResult) {
  return {
    dataset: {
      rows: context.summary.rows,
      participants: context.summary.participants,
      referrals: context.summary.referrals,
      months: context.summary.months,
    },
    scenario: {
      id: forecast.scenario.id,
      label: forecast.scenario.label,
      assumptions: forecast.scenario.assumptions,
      horizonMonths: forecast.horizonMonths,
      iterations: forecast.iterations,
    },
    areas: forecast.areas.slice(0, 5).map((area, index) => ({
      areaCode: `AREA_${String(index + 1).padStart(3, "0")}`,
      currentScore: area.currentScore,
      projectedMedian: area.projectedMedian,
      projectedP90: area.projectedP90,
      riskDelta: area.riskDelta,
      drivers: area.drivers,
    })),
  };
}

export class ForecastRationaleAgent {
  readonly name = "ForecastRationaleAgent";

  async run(
    context: AgentContext,
    forecast: WhatIfForecastResult,
    dependencies: AgentDependencies,
    request: AgentRequest,
  ): Promise<RationaleOutput> {
    if (!request.options?.includeRationale) {
      return { usedLLM: false };
    }

    const firstArea = forecast.areas[0];
    const deterministicSummary = firstArea
      ? `${forecast.scenario.label} is a probabilistic what-if forecast, not an operational fact. The largest median movement is ${firstArea.areaName}, driven by ${firstArea.drivers.slice(0, 3).join(", ")}.`
      : "The forecast did not find enough area data to explain scenario movement.";
    let llmSummary: string | undefined;

    if (dependencies.llm.enabled) {
      try {
        const answer = await dependencies.llm.complete([
          {
            role: "system",
            content:
              "You explain public-health what-if forecasts from anonymized aggregate data. Be clear that Monte Carlo output is probabilistic, not a guarantee. Do not invent records, people, diagnoses, travel plans, or outcomes. Return one concise paragraph.",
          },
          {
            role: "user",
            content: JSON.stringify(buildSafePayload(context, forecast)),
          },
        ]);
        const trimmed = answer.trim();

        if (trimmed.length > 0) {
          llmSummary = trimmed;
        }
      } catch {
        llmSummary = undefined;
      }
    }

    return {
      rationale: {
        mode: llmSummary ? "llm-assisted" : "rules",
        summary: llmSummary ?? deterministicSummary,
        agentSteps: [
          {
            agent: "MonteCarloParameterAgent",
            decision: "Converted workbook history and area pressure signals into scenario parameters.",
            evidence: [
              `${forecast.iterations} Monte Carlo iterations`,
              `${forecast.horizonMonths} month horizon`,
              `${forecast.areas.length} areas included`,
            ],
          },
          {
            agent: "ScenarioMonteCarloAgent",
            decision: "Generated percentile trajectories and race standings for the selected scenario.",
            evidence: forecast.areas.slice(0, 3).map((area) => {
              return `${area.areaName}: median delta ${Math.round(area.riskDelta * 100)} points`;
            }),
          },
          {
            agent: this.name,
            decision: "Explained the forecast as a probabilistic planning aid.",
            evidence: forecast.scenario.assumptions,
          },
        ],
        ...(llmSummary ? { llmSummary } : {}),
      },
      usedLLM: Boolean(llmSummary),
    };
  }
}
