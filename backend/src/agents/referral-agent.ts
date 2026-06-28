import type { AreaMetric } from "../types/domain";
import { result, type SpecialistAgent } from "./base";

export class ReferralAgent implements SpecialistAgent<AreaMetric[]> {
  name = "ReferralAgent";
  operation = "referral-score" as const;

  async run(context: { siteMetrics: AreaMetric[]; communeMetrics: AreaMetric[] }) {
    const ranked = context.communeMetrics
      .slice()
      .sort((a, b) => b.referralScore - a.referralScore);
    const gaps = context.communeMetrics.filter((area) => area.referralGaps > 0);

    return result(
      this.name,
      this.operation,
      `${ranked[0]?.name ?? "No commune"} has the strongest referral signal; ${gaps.length} communes show referral gaps.`,
      [
        ...ranked.slice(0, 2).map((area) => ({
          title: `${area.name} referral signal`,
          severity:
            area.referralScore >= 0.4
              ? ("Medium" as const)
              : ("Low" as const),
          evidence: [
            `${area.referrals} referrals`,
            `${area.participants} participants`,
            `${Math.round(area.referralRate * 1000) / 10}% referral rate`,
          ],
          recommendation:
            "Confirm whether referral volume is expected and whether linked CSBs are prepared.",
        })),
        ...gaps.slice(0, 3).map((area) => ({
          title: `${area.name} referral gap`,
          severity: "Medium" as const,
          evidence: [
            `${area.referralGaps} high-participant zero-referral records`,
            `${area.participants} participants`,
          ],
          recommendation:
            "Review whether referrals were not made or were not recorded in the form.",
        })),
      ],
      ranked,
    );
  }
}
