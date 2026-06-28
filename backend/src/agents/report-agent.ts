import type { AgentContext, AgentRequest, AgentResult } from "../types/domain";
import { buildLlmSafePayload } from "../services/anonymization";
import { result, type AgentDependencies, type SpecialistAgent } from "./base";

interface ReportData {
  executiveSummary: string;
  sourceAgents: string[];
}

export class ReportAgent implements SpecialistAgent<ReportData> {
  name = "ReportAgent";
  operation = "report" as const;

  constructor(private readonly sourceResults: AgentResult[] = []) {}

  async run(
    context: AgentContext,
    request: AgentRequest,
    dependencies: AgentDependencies,
  ) {
    const deterministicSummary = [
      `Dataset contains ${context.summary.rows} rows and ${context.summary.participants} participants.`,
      `Top follow-up site is ${context.siteMetrics[0]?.name ?? "not available"}.`,
      `${context.summary.gpsMissing} rows are missing GPS coordinates and ${context.summary.duplicateUidRows} rows have duplicate UID signals.`,
    ].join(" ");

    let executiveSummary = deterministicSummary;
    let usedLLM = false;

    if (dependencies.llm.enabled) {
      executiveSummary = await dependencies.llm.complete([
        {
          role: "system",
          content:
            "You are an M&E data assistant for Doctors for Madagascar. Summarize deterministic findings. Do not invent clinical diagnoses. Keep recommendations operational and concise.",
        },
        {
          role: "user",
          content: JSON.stringify(
            buildLlmSafePayload(
              context,
              this.sourceResults,
              request.language ?? "en",
            ),
          ),
        },
      ]);
      usedLLM = executiveSummary.length > 0;
    }

    return result(
      this.name,
      this.operation,
      "Generated an operational narrative from specialist agent findings.",
      [
        {
          title: "Operational summary",
          severity: context.summary.gpsMissing > 0 ? "Medium" : "Low",
          evidence: [
            `${context.summary.participants} participants`,
            `${context.summary.referrals} referrals`,
            `${context.summary.sites} sites`,
          ],
          recommendation:
            "Use this report after reviewing data quality flags and referral gaps.",
        },
      ],
      {
        executiveSummary,
        sourceAgents: this.sourceResults.map((agentResult) => agentResult.agent),
      },
      usedLLM,
    );
  }
}
