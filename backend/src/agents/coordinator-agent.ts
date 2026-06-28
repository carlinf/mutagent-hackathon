import type {
  AgentContext,
  AgentOperation,
  AgentRequest,
  AgentResult,
} from "../types/domain";
import type { LlmClient } from "../services/llm";
import { DataQualityAgent } from "./data-quality-agent";
import { FollowUpOperationsAgent } from "./follow-up-operations-agent";
import { OutreachAgent } from "./outreach-agent";
import { ReferralAgent } from "./referral-agent";
import { ReportAgent } from "./report-agent";
import { RiskAgent } from "./risk-agent";
import { WhatIfForecastAgent } from "./what-if-forecast-agent";
import type { AgentDependencies, SpecialistAgent } from "./base";

const reviewAgents: SpecialistAgent[] = [
  new DataQualityAgent(),
  new OutreachAgent(),
  new ReferralAgent(),
  new RiskAgent(),
  new FollowUpOperationsAgent(),
];
const specialistAgents: SpecialistAgent[] = [
  ...reviewAgents,
  new WhatIfForecastAgent(),
];

export class CoordinatorAgent {
  private readonly dependencies: AgentDependencies;

  constructor(llm: LlmClient) {
    this.dependencies = { llm };
  }

  listAgents() {
    return [
      {
        name: "CoordinatorAgent",
        operation: "full-review",
        role: "Plans and orchestrates specialist agents.",
      },
      ...specialistAgents.map((agent) => ({
        name: agent.name,
        operation: agent.operation,
        role: `Specialist for ${agent.operation}.`,
      })),
      {
        name: "ReportAgent",
        operation: "report",
        role: "Synthesizes specialist outputs into an operational narrative.",
      },
    ];
  }

  private plan(operation: AgentOperation) {
    if (operation === "full-review") {
      return reviewAgents.map((agent) => agent.operation);
    }

    if (operation === "report") {
      return [
        "data-quality",
        "outreach-load",
        "referral-score",
        "risk-intensity",
        "follow-up-operations",
      ] satisfies AgentOperation[];
    }

    return [operation];
  }

  async run(context: AgentContext, request: AgentRequest) {
    const operations = this.plan(request.operation);
    const results: AgentResult[] = [];

    for (const operation of operations) {
      const agent = specialistAgents.find((item) => item.operation === operation);

      if (!agent) continue;

      results.push(await agent.run(context, request, this.dependencies));
    }

    if (request.operation === "full-review" || request.operation === "report") {
      results.push(
        await new ReportAgent(results).run(
          context,
          request,
          this.dependencies,
        ),
      );
    }

    return {
      coordinator: "CoordinatorAgent",
      operation: request.operation,
      plan: operations,
      results,
    };
  }
}
