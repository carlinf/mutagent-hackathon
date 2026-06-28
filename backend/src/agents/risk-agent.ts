import type { AreaMetric } from "../types/domain";
import { result, type SpecialistAgent } from "./base";

export class RiskAgent implements SpecialistAgent<AreaMetric[]> {
  name = "RiskAgent";
  operation = "risk-intensity" as const;

  async run(context: { communeMetrics: AreaMetric[] }) {
    const ranked = context.communeMetrics
      .slice()
      .sort((a, b) => b.riskIntensityScore - a.riskIntensityScore);

    return result(
      this.name,
      this.operation,
      `${ranked.filter((area) => area.riskIntensityScore >= 0.4).length} communes are medium-or-higher operational risk.`,
      ranked.slice(0, 5).map((area) => ({
        title: `${area.name} operational risk`,
        severity: area.riskIntensityScore >= 0.7 ? "High" : "Medium",
        evidence: [
          `${area.highRiskSessions} high-risk participant sessions`,
          `${area.referrals} referrals`,
          `${area.barriers} barrier signals`,
        ],
        recommendation:
          "Use this as operational intensity, not clinical severity, because the dataset has no patient outcomes.",
      })),
      ranked,
    );
  }
}
