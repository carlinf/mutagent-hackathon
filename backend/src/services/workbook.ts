import { basename, resolve } from "node:path";
import { readFile, utils } from "xlsx";
import type {
  AgentContext,
  AreaMetric,
  DatasetSummary,
  MonthlyMetric,
  SensitisationRecord,
} from "../types/domain";
import {
  containsAny,
  extractLeaf,
  normalizeValues,
  round,
  slugify,
} from "../utils/scoring";

const barrierWords = [
  "cost",
  "access",
  "delay",
  "difficulty",
  "difficult",
  "difficulté",
  "difficulte",
  "accès",
  "acces",
  "retard",
  "frais",
  "argent",
  "transport",
  "loin",
  "distance",
];

const themeWords = [
  "hta",
  "avc",
  "urgence",
  "tabagisme",
  "alcoolisme",
  "dyslipid",
  "sdentaire",
  "sédentaire",
];

function text(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return value === undefined || value === null ? "" : String(value).trim();
}

function numberValue(row: Record<string, unknown>, key: string) {
  const value = row[key];

  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function booleanBarrier(record: SensitisationRecord) {
  return containsAny(
    [
      record.participantQuestions,
      record.observation,
      record.difficulties,
    ].join(" "),
    barrierWords,
  );
}

function themeSignal(record: SensitisationRecord) {
  return containsAny(record.primaryThemeMafy, themeWords);
}

function highRiskSignal(record: SensitisationRecord) {
  return record.participantType.includes("groupe__risque_avc");
}

function gpsMissing(record: SensitisationRecord) {
  return record.gps.length === 0 || record.gps === "---";
}

function keyBlank(record: SensitisationRecord) {
  return (
    record.region.length === 0 ||
    record.commune.length === 0 ||
    record.dateActivity.length === 0 ||
    record.totalParticipants === 0
  );
}

function mapRecord(row: Record<string, unknown>): SensitisationRecord {
  const district = extractLeaf(text(row, "form.identifiant1.district"));
  const commune = extractLeaf(text(row, "form.identifiant1.commune"));
  const site = text(row, "SITE") || district || "Unknown";

  return {
    referral: text(row, "referral"),
    formid: text(row, "formid"),
    region: text(row, "form.identifiant1.region"),
    district,
    commune: commune || text(row, "Commune") || "Unknown",
    fokontany: extractLeaf(text(row, "form.identifiant1.fokontany")),
    gps: text(row, "form.identifiant1.coordonne_gps"),
    uid: text(row, "form.question15.uid_sensibilisation"),
    dateActivity: text(row, "form.question15.date_activity"),
    startTime: text(row, "form.question15.start_time"),
    endTime: text(row, "form.question15.end_time"),
    staffResponsible: text(row, "form.question15.staff_responsible"),
    locationType: text(row, "form.activite_de_sensibilisation.location_type"),
    csbName: text(row, "form.activite_de_sensibilisation.location_name_csb"),
    locationName: text(row, "form.activite_de_sensibilisation.location_name"),
    primaryThemeMafy: text(row, "form.question16.primary_theme_mafy"),
    participantType: text(row, "form.participant.type_de_participant"),
    totalParticipants: numberValue(row, "form.participant.total_participants"),
    menCount: numberValue(row, "form.participant.men_count"),
    womenCount: numberValue(row, "form.participant.women_count"),
    participantQuestions: text(
      row,
      "form.question_commune_et_personnes_referees_aux_centre_de_sante.participant_questions",
    ),
    referralsMade: numberValue(
      row,
      "form.question_commune_et_personnes_referees_aux_centre_de_sante.referrals_made",
    ),
    observation: text(row, "form.observation.observation"),
    difficulties: text(row, "form.observation.dfis"),
    successes: text(row, "form.observation.succs"),
    durationMinutes: numberValue(row, "form.question15.duration_minutes") || 1,
    site,
    month: text(row, "MOIS") || text(row, "PERIODE") || "Unknown",
    period: text(row, "PERIODE") || text(row, "MOIS") || "Unknown",
    raw: row,
  };
}

function duplicateUidSet(records: SensitisationRecord[]) {
  const counts = new Map<string, number>();

  records.forEach((record) => {
    if (!record.uid) return;
    counts.set(record.uid, (counts.get(record.uid) ?? 0) + 1);
  });

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([uid]) => uid),
  );
}

function buildSummary(
  datasetPath: string,
  records: SensitisationRecord[],
  columns: number,
): DatasetSummary {
  const duplicateUids = duplicateUidSet(records);

  return {
    dataset: basename(datasetPath),
    rows: records.length,
    columns,
    participants: records.reduce(
      (total, record) => total + record.totalParticipants,
      0,
    ),
    men: records.reduce((total, record) => total + record.menCount, 0),
    women: records.reduce((total, record) => total + record.womenCount, 0),
    referrals: records.reduce((total, record) => total + record.referralsMade, 0),
    regions: new Set(records.map((record) => record.region)).size,
    sites: new Set(records.map((record) => record.site)).size,
    months: new Set(records.map((record) => record.month)).size,
    gpsMissing: records.filter(gpsMissing).length,
    duplicateUidRows: records.filter((record) => duplicateUids.has(record.uid))
      .length,
  };
}

function groupBy(records: SensitisationRecord[], getKey: (record: SensitisationRecord) => string) {
  return records.reduce<Map<string, SensitisationRecord[]>>((groups, record) => {
    const key = getKey(record) || "Unknown";
    groups.set(key, [...(groups.get(key) ?? []), record]);
    return groups;
  }, new Map());
}

function aggregateGroups(
  groups: Map<string, SensitisationRecord[]>,
  duplicateUids: Set<string>,
): AreaMetric[] {
  const base = [...groups.entries()].map(([name, records]) => {
    const participants = records.reduce(
      (total, record) => total + record.totalParticipants,
      0,
    );
    const referrals = records.reduce(
      (total, record) => total + record.referralsMade,
      0,
    );
    const uniqueFokontany = new Set(
      records.map((record) => record.fokontany).filter(Boolean),
    ).size;
    const dataQualityPenalty = records.reduce((total, record) => {
      return (
        total +
        (gpsMissing(record) ? 1 : 0) +
        (duplicateUids.has(record.uid) ? 1 : 0) +
        (keyBlank(record) ? 1 : 0)
      );
    }, 0);
    const referralGaps = records.filter(
      (record) => record.totalParticipants >= 40 && record.referralsMade === 0,
    ).length;

    return {
      id: slugify(name),
      name,
      region: records[0]?.region ?? "Unknown",
      district: records[0]?.district ?? "Unknown",
      sessions: records.length,
      participants,
      referrals,
      uniqueFokontany,
      totalOutreachMinutes: records.reduce(
        (total, record) => total + record.durationMinutes,
        0,
      ),
      barriers: records.filter(booleanBarrier).length,
      highRiskSessions: records.filter(highRiskSignal).length,
      themeSessions: records.filter(themeSignal).length,
      dataQualityPenalty,
      referralGaps,
      referralRate: participants > 0 ? referrals / participants : 0,
      outreachLoadScore: 0,
      referralScore: 0,
      riskIntensityScore: 0,
      followupPriorityScore: 0,
    };
  });

  const participantNorm = normalizeValues(base, "participants");
  const sessionNorm = normalizeValues(base, "sessions");
  const fokontanyNorm = normalizeValues(base, "uniqueFokontany");
  const minutesNorm = normalizeValues(base, "totalOutreachMinutes");
  const referralNorm = normalizeValues(base, "referrals");
  const referralRateNorm = normalizeValues(base, "referralRate");
  const dataQualityNorm = normalizeValues(base, "dataQualityPenalty");

  return base
    .map((item, index) => {
      const barrierSignal = item.barriers > 0 ? 1 : 0;
      const highRiskSignalValue = item.highRiskSessions > 0 ? 1 : 0;
      const themeSignalValue = item.themeSessions > 0 ? 1 : 0;
      const referralGapSignal = item.referralGaps > 0 ? 1 : 0;
      const outreachLoadScore =
        0.4 * (participantNorm[index] ?? 0) +
        0.25 * (sessionNorm[index] ?? 0) +
        0.2 * (fokontanyNorm[index] ?? 0) +
        0.15 * (minutesNorm[index] ?? 0);
      const referralScore =
        0.45 * (referralNorm[index] ?? 0) +
        0.25 * (referralRateNorm[index] ?? 0) +
        0.2 * barrierSignal +
        0.1 * (participantNorm[index] ?? 0);
      const riskIntensityScore =
        0.3 * (referralNorm[index] ?? 0) +
        0.25 * highRiskSignalValue +
        0.2 * barrierSignal +
        0.15 * themeSignalValue +
        0.1 * (participantNorm[index] ?? 0);
      const followupPriorityScore =
        0.3 * referralScore +
        0.25 * riskIntensityScore +
        0.2 * outreachLoadScore +
        0.15 * referralGapSignal +
        0.1 * (dataQualityNorm[index] ?? 0);

      return {
        ...item,
        referralRate: round(item.referralRate),
        outreachLoadScore: round(outreachLoadScore),
        referralScore: round(referralScore),
        riskIntensityScore: round(riskIntensityScore),
        followupPriorityScore: round(followupPriorityScore),
      };
    })
    .sort((a, b) => b.followupPriorityScore - a.followupPriorityScore);
}

function buildMonthlyMetrics(
  records: SensitisationRecord[],
  duplicateUids: Set<string>,
): MonthlyMetric[] {
  const monthOrder = new Map<string, number>();

  records.forEach((record) => {
    if (!monthOrder.has(record.month)) {
      monthOrder.set(record.month, monthOrder.size);
    }
  });

  return aggregateGroups(
    groupBy(records, (record) => record.month),
    duplicateUids,
  )
    .sort(
      (first, second) =>
        (monthOrder.get(first.name) ?? 0) - (monthOrder.get(second.name) ?? 0),
    )
    .map((metric) => ({
      month: metric.name,
      sessions: metric.sessions,
      participants: metric.participants,
      referrals: metric.referrals,
      uniqueFokontany: metric.uniqueFokontany,
      outreachLoadScore: metric.outreachLoadScore,
      referralScore: metric.referralScore,
      riskIntensityScore: metric.riskIntensityScore,
      followupPriorityScore: metric.followupPriorityScore,
    }));
}

export function loadAgentContext(datasetPath: string): AgentContext {
  const resolvedPath = resolve(import.meta.dir, "../../", datasetPath);
  const workbook = readFile(resolvedPath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("Workbook does not contain any sheets.");
  }

  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error(`Workbook sheet ${firstSheetName} could not be read.`);
  }

  const rawRows = utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });
  const records = rawRows.map(mapRecord);
  const firstRow = rawRows[0] ?? {};
  const duplicateUids = duplicateUidSet(records);
  const siteMetrics = aggregateGroups(
    groupBy(records, (record) => record.site),
    duplicateUids,
  );
  const communeMetrics = aggregateGroups(
    groupBy(records, (record) => record.commune),
    duplicateUids,
  );
  const monthlyMetrics = buildMonthlyMetrics(records, duplicateUids);

  return {
    records,
    summary: buildSummary(datasetPath, records, Object.keys(firstRow).length),
    siteMetrics,
    communeMetrics,
    monthlyMetrics,
  };
}
