import type {
  AgentContext,
  AgentRequest,
  WhatIfForecastResult,
} from "../types/domain";
import {
  result,
  type AgentDependencies,
  type SpecialistAgent,
} from "./base";
import { ScenarioMonteCarloAgent } from "./forecast/monte-carlo-agent";
import { MonteCarloParameterAgent } from "./forecast/parameter-agent";
import { ForecastRationaleAgent } from "./forecast/rationale-agent";

export class WhatIfForecastAgent
  implements SpecialistAgent<WhatIfForecastResult>
{
  name = "WhatIfForecastAgent";
  operation = "what-if-forecast" as const;

  private readonly parameterAgent = new MonteCarloParameterAgent();
  private readonly monteCarloAgent = new ScenarioMonteCarloAgent();
  private readonly rationaleAgent = new ForecastRationaleAgent();

  async run(
    context: AgentContext,
    request: AgentRequest,
    dependencies: AgentDependencies,
  ) {
    const parameters = this.parameterAgent.run(context, request);
    const forecast = this.monteCarloAgent.run(parameters);
    const rationaleOutput = await this.rationaleAgent.run(
      context,
      forecast,
      dependencies,
      request,
    );
    const output: WhatIfForecastResult = {
      ...forecast,
      subAgents: [
        this.parameterAgent.name,
        this.monteCarloAgent.name,
        this.rationaleAgent.name,
      ],
      ...(rationaleOutput.rationale
        ? { rationale: rationaleOutput.rationale }
        : {}),
    };

    return result(
      this.name,
      this.operation,
      output.summary,
      output.areas.slice(0, 5).map((area) => ({
        title: `${area.areaName} what-if pressure`,
        severity:
          area.projectedP90 >= 0.7
            ? "High"
            : area.projectedP90 >= 0.4
              ? "Medium"
              : "Low",
        evidence: [
          `Current score ${Math.round(area.currentScore * 100)}`,
          `Median projection ${Math.round(area.projectedMedian * 100)}`,
          `P90 projection ${Math.round(area.projectedP90 * 100)}`,
          ...area.drivers.slice(0, 2),
        ],
        recommendation:
          "Use this as a scenario stress test alongside current operational actions.",
      })),
      output,
      rationaleOutput.usedLLM,
    );
  }
}
