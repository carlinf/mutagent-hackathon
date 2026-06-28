import type {
  AgentContext,
  AgentRequest,
  FollowUpOperationsResult,
} from "../types/domain";
import {
  result,
  type AgentDependencies,
  type SpecialistAgent,
} from "./base";
import { OperationsRationaleAgent } from "./operations/rationale-agent";
import { OperationsTriageAgent } from "./operations/triage-agent";

export class FollowUpOperationsAgent
  implements SpecialistAgent<FollowUpOperationsResult>
{
  name = "FollowUpOperationsAgent";
  operation = "follow-up-operations" as const;

  private readonly triageAgent = new OperationsTriageAgent();
  private readonly rationaleAgent = new OperationsRationaleAgent();

  async run(
    context: AgentContext,
    request: AgentRequest,
    dependencies: AgentDependencies,
  ) {
    const limit = Math.min(Math.max(request.options?.limit ?? 12, 1), 30);
    const actions = this.triageAgent.run(context.communeMetrics, limit);
    const rationaleOutput = await this.rationaleAgent.run(
      context,
      actions,
      dependencies,
      request,
    );
    const highPriorityCount = actions.filter(
      (action) => action.priority === "High",
    ).length;
    const summary = `${actions.length} follow-up actions are ready from the current workbook; ${highPriorityCount} are high priority.`;
    const operations: FollowUpOperationsResult = {
      generatedAt: new Date().toISOString(),
      subAgents: [this.triageAgent.name, this.rationaleAgent.name],
      summary,
      actions,
      ...(rationaleOutput.rationale ? { rationale: rationaleOutput.rationale } : {}),
    };

    return result(
      this.name,
      this.operation,
      summary,
      actions.slice(0, 5).map((action) => ({
        title: `${action.areaName} ${action.actionType}`,
        severity: action.priority,
        evidence: action.evidence,
        recommendation: `${action.action} Owner: ${action.owner}. Due: ${action.dueWindow}.`,
      })),
      operations,
      rationaleOutput.usedLLM,
    );
  }
}
