import type {
  AreaMetric,
  FollowUpAction,
  FollowUpActionType,
  PriorityLevel,
} from "../../types/domain";
import { priorityFromScore, round } from "../../utils/scoring";

function scoreToPriority(score: number): PriorityLevel {
  return priorityFromScore(score);
}

function actionTypeFor(area: AreaMetric): FollowUpActionType {
  if (area.referralGaps > 0) return "Referral recording audit";
  if (area.dataQualityPenalty > 0) return "Data quality cleanup";
  if (area.referrals > 0 || area.riskIntensityScore >= 0.4) {
    return "CSB follow-up coordination";
  }

  return "Outreach load review";
}

function ownerFor(actionType: FollowUpActionType) {
  if (actionType === "Referral recording audit") return "M&E officer";
  if (actionType === "Data quality cleanup") return "Data manager";
  if (actionType === "CSB follow-up coordination") return "Field coordinator";

  return "Outreach lead";
}

function dueWindowFor(priority: PriorityLevel) {
  if (priority === "High") return "Next 7 days";
  if (priority === "Medium") return "Next 14 days";

  return "Next routine review";
}

function actionText(actionType: FollowUpActionType, area: AreaMetric) {
  if (actionType === "Referral recording audit") {
    return `Audit zero-referral high-participant records for ${area.name} and confirm whether referrals were missed or not recorded.`;
  }

  if (actionType === "Data quality cleanup") {
    return `Resolve GPS, duplicate UID, and required-field issues for ${area.name} before field planning.`;
  }

  if (actionType === "CSB follow-up coordination") {
    return `Coordinate with linked CSB teams for referral follow-up and field feedback in ${area.name}.`;
  }

  return `Review outreach load in ${area.name} and decide whether routine support is sufficient.`;
}

function reasonFor(actionType: FollowUpActionType, area: AreaMetric) {
  if (actionType === "Referral recording audit") {
    return `${area.referralGaps} high-participant records have zero referrals.`;
  }

  if (actionType === "Data quality cleanup") {
    return `${area.dataQualityPenalty} data-quality penalties can block reliable field follow-up.`;
  }

  if (actionType === "CSB follow-up coordination") {
    return `${area.referrals} referrals and ${area.highRiskSessions} high-risk participant sessions require operational coordination.`;
  }

  return `${area.participants} participants across ${area.sessions} sessions require routine workload review.`;
}

function evidenceFor(area: AreaMetric) {
  return [
    `${area.participants} participants`,
    `${area.sessions} sessions`,
    `${area.referrals} referrals`,
    `${area.referralGaps} referral gaps`,
    `${area.dataQualityPenalty} data-quality penalties`,
    `${area.highRiskSessions} high-risk participant sessions`,
  ];
}

function blockersFor(area: AreaMetric) {
  const blockers: string[] = [];

  if (area.referralGaps > 0) {
    blockers.push("Referral status needs verification");
  }

  if (area.dataQualityPenalty > 0) {
    blockers.push("Data quality issues need cleanup");
  }

  if (area.participants > 0 && area.referrals === 0) {
    blockers.push("No referrals recorded for active outreach area");
  }

  return blockers.length > 0 ? blockers : ["No immediate data blocker"];
}

export class OperationsTriageAgent {
  readonly name = "OperationsTriageAgent";

  run(areas: AreaMetric[], limit: number): FollowUpAction[] {
    return areas
      .slice()
      .sort((first, second) => {
        const gapDelta = second.referralGaps - first.referralGaps;
        if (gapDelta !== 0) return gapDelta;

        return second.followupPriorityScore - first.followupPriorityScore;
      })
      .slice(0, limit)
      .map((area, index) => {
        const priority = scoreToPriority(area.followupPriorityScore);
        const actionType = actionTypeFor(area);

        return {
          id: `ops-${String(index + 1).padStart(3, "0")}-${area.id}`,
          areaId: area.id,
          areaName: area.name,
          region: area.region,
          district: area.district,
          priority,
          score: round(area.followupPriorityScore),
          actionType,
          action: actionText(actionType, area),
          owner: ownerFor(actionType),
          dueWindow: dueWindowFor(priority),
          status: "Ready for field review",
          reason: reasonFor(actionType, area),
          evidence: evidenceFor(area),
          blockers: blockersFor(area),
          metrics: {
            participants: area.participants,
            sessions: area.sessions,
            referrals: area.referrals,
            referralGaps: area.referralGaps,
            dataQualityPenalty: area.dataQualityPenalty,
            highRiskSessions: area.highRiskSessions,
            outreachLoadScore: area.outreachLoadScore,
            referralScore: area.referralScore,
            riskIntensityScore: area.riskIntensityScore,
            followupPriorityScore: area.followupPriorityScore,
          },
        };
      });
  }
}
