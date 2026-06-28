import type {
  AgentContext,
  AgentRequest,
  FollowUpAction,
  OperationsRationale,
} from "../../types/domain";
import type { AgentDependencies } from "../base";

interface RationaleOutput {
  rationale?: OperationsRationale;
  usedLLM: boolean;
}

function buildSafePayload(context: AgentContext, actions: FollowUpAction[]) {
  return {
    dataset: {
      rows: context.summary.rows,
      participants: context.summary.participants,
      referrals: context.summary.referrals,
      gpsMissing: context.summary.gpsMissing,
      duplicateUidRows: context.summary.duplicateUidRows,
    },
    actions: actions.map((action, index) => ({
      actionCode: `ACTION_${String(index + 1).padStart(3, "0")}`,
      priority: action.priority,
      actionType: action.actionType,
      owner: action.owner,
      dueWindow: action.dueWindow,
      evidence: action.evidence,
      blockers: action.blockers,
      score: action.score,
    })),
  };
}

export class OperationsRationaleAgent {
  readonly name = "OperationsRationaleAgent";

  async run(
    context: AgentContext,
    actions: FollowUpAction[],
    dependencies: AgentDependencies,
    request: AgentRequest,
  ): Promise<RationaleOutput> {
    if (!request.options?.includeRationale) {
      return { usedLLM: false };
    }

    const agentSteps = [
      {
        agent: "OperationsTriageAgent",
        decision: "Converted current workbook evidence into follow-up actions.",
        evidence: [
          `${actions.length} actions prepared`,
          `${actions.filter((action) => action.priority === "High").length} high-priority actions`,
          "Ranking uses referral gaps, data quality, outreach load, referrals, and operational risk scores.",
        ],
      },
      {
        agent: this.name,
        decision: "Explained why these actions should be handled by field and M&E teams.",
        evidence: actions.slice(0, 3).map((action) => action.reason),
      },
    ];
    const deterministicSummary =
      actions.length > 0
        ? `${actions.length} follow-up actions are ready for field review. The top action is ${actions[0]?.actionType.toLowerCase()} for ${actions[0]?.areaName}, assigned to ${actions[0]?.owner} for ${actions[0]?.dueWindow.toLowerCase()}.`
        : "No follow-up actions were generated from the current dataset.";
    let llmSummary: string | undefined;

    if (dependencies.llm.enabled) {
      try {
        const answer = await dependencies.llm.complete([
          {
            role: "system",
            content:
              "You are an operations assistant for a public-health field team. Explain the current action queue from anonymized aggregate evidence only. Do not invent records, people, diagnoses, travel plans, or outcomes. Return one concise paragraph.",
          },
          {
            role: "user",
            content: JSON.stringify(buildSafePayload(context, actions)),
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
        agentSteps,
        ...(llmSummary ? { llmSummary } : {}),
      },
      usedLLM: Boolean(llmSummary),
    };
  }
}
