import type { AgentContext, QualityFinding } from "../types/domain";
import { anonymizeRecords } from "../services/anonymization";
import { result, type SpecialistAgent } from "./base";

function codes(values: Array<{ code: string | undefined }>) {
  return values.flatMap(({ code }) => (code ? [code] : []));
}

export class DataQualityAgent implements SpecialistAgent<QualityFinding[]> {
  name = "DataQualityAgent";
  operation = "data-quality" as const;

  async run(context: AgentContext) {
    const anonymizedRows = anonymizeRecords(context.records).rows;
    const duplicateUidCounts = new Map<string, number>();

    context.records.forEach((record) => {
      if (!record.uid) return;
      duplicateUidCounts.set(
        record.uid,
        (duplicateUidCounts.get(record.uid) ?? 0) + 1,
      );
    });

    const duplicateUids = new Set(
      [...duplicateUidCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([uid]) => uid),
    );
    const missingGps = context.records
      .map((record, index) => ({ record, code: anonymizedRows[index]?.recordCode }))
      .filter(({ record }) => record.gps.length === 0 || record.gps === "---");
    const duplicateRows = context.records
      .map((record, index) => ({ record, code: anonymizedRows[index]?.recordCode }))
      .filter(({ record }) => duplicateUids.has(record.uid));
    const blankKeyRows = context.records
      .map((record, index) => ({ record, code: anonymizedRows[index]?.recordCode }))
      .filter(
        ({ record }) =>
          !record.region ||
          !record.commune ||
          !record.dateActivity ||
          record.totalParticipants === 0,
      );

    const findings: QualityFinding[] = [
      {
        id: "missing-gps",
        label: "Missing GPS",
        count: missingGps.length,
        severity: missingGps.length > 10 ? "High" : "Medium",
        description:
          "Rows without coordinates reduce map-based follow-up planning reliability.",
        affectedIds: codes(missingGps),
      },
      {
        id: "duplicate-uids",
        label: "Duplicate UIDs",
        count: duplicateRows.length,
        severity: duplicateRows.length > 0 ? "High" : "Low",
        description:
          "Repeated sensibilisation identifiers can inflate activity counts.",
        affectedIds: codes(duplicateRows),
      },
      {
        id: "blank-key-fields",
        label: "Blank key fields",
        count: blankKeyRows.length,
        severity: blankKeyRows.length > 0 ? "Medium" : "Low",
        description:
          "Region, commune, date, and participant total are required for core aggregation.",
        affectedIds: codes(blankKeyRows),
      },
    ];

    return result(
      this.name,
      this.operation,
      `${findings.filter((finding) => finding.severity !== "Low").length} quality issue groups require review.`,
      findings.map((finding) => ({
        title: finding.label,
        severity: finding.severity,
        evidence: [
          `${finding.count} affected rows`,
          `${finding.affectedIds.slice(0, 4).join(", ") || "No row IDs"}`,
        ],
        recommendation:
          finding.severity === "Low"
            ? "Keep this check in the validation workflow."
            : "Review affected rows before using these data in planning or reporting.",
      })),
      findings,
    );
  }
}
