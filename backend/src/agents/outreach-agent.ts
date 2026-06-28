import type { AreaMetric } from "../types/domain";
import { result, type SpecialistAgent } from "./base";

export class OutreachAgent implements SpecialistAgent<AreaMetric[]> {
  name = "OutreachAgent";
  operation = "outreach-load" as const;

  async run(context: { siteMetrics: AreaMetric[] }) {
    const leaders = context.siteMetrics
      .slice()
      .sort((a, b) => b.outreachLoadScore - a.outreachLoadScore);

    return result(
      this.name,
      this.operation,
      `${leaders[0]?.name ?? "No site"} has the highest outreach load.`,
      leaders.slice(0, 3).map((area) => ({
        title: `${area.name} outreach load`,
        severity: area.outreachLoadScore >= 0.7 ? "High" : "Medium",
        evidence: [
          `${area.participants} participants`,
          `${area.sessions} sessions`,
          `${area.uniqueFokontany} fokontany reached`,
        ],
        recommendation:
          "Use this load score to assign current follow-up workload, not disease burden.",
      })),
      leaders,
    );
  }
}
