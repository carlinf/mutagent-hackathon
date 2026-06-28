import type {
  AgentContext,
  AgentResult,
  DetailedReport,
  FollowUpOperationsResult,
} from "../types/domain";

interface ReportAgentData {
  executiveSummary: string;
  sourceAgents: string[];
}

function hasReportData(data: unknown): data is ReportAgentData {
  if (!data || typeof data !== "object") return false;

  const candidate = data as Partial<ReportAgentData>;

  return (
    typeof candidate.executiveSummary === "string" &&
    Array.isArray(candidate.sourceAgents)
  );
}

function isOperationsResult(data: unknown): data is FollowUpOperationsResult {
  if (!data || typeof data !== "object") return false;

  const candidate = data as Partial<FollowUpOperationsResult>;

  return Array.isArray(candidate.actions);
}

export function buildDetailedReport(
  context: AgentContext,
  agentResults: AgentResult[],
): DetailedReport {
  const reportResult = agentResults.find((item) => item.operation === "report");
  const reportData = hasReportData(reportResult?.data)
    ? reportResult.data
    : undefined;
  const operationsResult = agentResults
    .filter((item) => item.operation === "follow-up-operations")
    .map((item) => item.data)
    .find(isOperationsResult);

  return {
    generatedAt: new Date().toISOString(),
    title: "MAFY Sensitisation Detailed Agent Report",
    dataset: context.summary,
    executiveSummary:
      reportData?.executiveSummary ??
      "Agent report generated from deterministic workbook findings.",
    usedLLM: Boolean(reportResult?.usedLLM),
    sourceAgents:
      reportData?.sourceAgents ??
      agentResults
        .filter((item) => item.operation !== "report")
        .map((item) => item.agent),
    agentResults,
    siteMetrics: context.siteMetrics,
    communeMetrics: context.communeMetrics,
    monthlyMetrics: context.monthlyMetrics,
    operations: operationsResult,
    chartData: {
      monthlyActivity: context.monthlyMetrics,
      siteScores: context.siteMetrics,
      communeQueue: context.communeMetrics.slice(0, 12),
      operationsQueue: operationsResult?.actions ?? [],
    },
  };
}
