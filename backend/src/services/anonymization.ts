import { createHash } from "node:crypto";
import type {
  AgentContext,
  AgentResult,
  AnonymizationReport,
  AnonymizedRecord,
  SensitisationRecord,
} from "../types/domain";
import { containsAny } from "../utils/scoring";

const defaultSalt = "dfm-mafy-local-anonymization-v1";

const directIdentifierFieldsRemoved = [
  "referral",
  "formid",
  "form.question15.uid_sensibilisation",
  "form.question15.staff_responsible",
  "form.question15.other_staff_responsible",
  "form.observation.nom_du_rapporteur",
  "username",
  "hq_user",
  "form_link",
  "started_time",
  "completed_time",
  "received_on",
  "form.identifiant1.coordonne_gps",
];

const freeTextFieldsMinimized = [
  "form.question_commune_et_personnes_referees_aux_centre_de_sante.participant_questions",
  "form.observation.observation",
  "form.observation.dfis",
  "form.observation.succs",
  "form.activite_de_sensibilisation.activity_description",
];

const generalizedFields = [
  "form.question15.date_activity -> MOIS",
  "start_time/end_time -> duration_minutes",
  "GPS coordinates -> hasGps",
  "free-text questions/observations -> barrierSignal",
];

const pseudonymizedFields = [
  "record identifier -> recordCode",
  "region/district/commune/site -> stable area codes",
  "themes/participant type -> stable category codes",
];

const retainedFields = [
  "month",
  "locationType",
  "participant counts",
  "referralsMade",
  "durationMinutes",
  "derived quality and risk signals",
];

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

function hashCode(prefix: string, value: string, length = 10) {
  const hash = createHash("sha256")
    .update(`${defaultSalt}:${prefix}:${value}`)
    .digest("hex")
    .slice(0, length)
    .toUpperCase();

  return `${prefix}_${hash}`;
}

function boolBarrier(record: SensitisationRecord) {
  return containsAny(
    [
      record.participantQuestions,
      record.observation,
      record.difficulties,
    ].join(" "),
    barrierWords,
  );
}

function boolTheme(record: SensitisationRecord) {
  return containsAny(record.primaryThemeMafy, themeWords);
}

function boolHighRisk(record: SensitisationRecord) {
  return record.participantType.includes("groupe__risque_avc");
}

function hasGps(record: SensitisationRecord) {
  return record.gps.length > 0 && record.gps !== "---";
}

function dataQualityPenalty(record: SensitisationRecord) {
  return (
    (hasGps(record) ? 0 : 1) +
    (record.region ? 0 : 1) +
    (record.commune ? 0 : 1) +
    (record.dateActivity ? 0 : 1) +
    (record.totalParticipants > 0 ? 0 : 1)
  );
}

export function anonymizeRecords(records: SensitisationRecord[]) {
  const rows: AnonymizedRecord[] = records.map((record, index) => ({
    recordCode: hashCode("REC", `${record.uid || record.formid || index}`),
    regionCode: hashCode("REGION", record.region || "UNKNOWN", 8),
    districtCode: hashCode("DISTRICT", record.district || "UNKNOWN", 8),
    communeCode: hashCode("COMMUNE", record.commune || "UNKNOWN", 8),
    siteCode: hashCode("SITE", record.site || "UNKNOWN", 8),
    month: record.month,
    locationType: record.locationType || "unknown",
    themeCode: hashCode("THEME", record.primaryThemeMafy || "UNKNOWN", 8),
    participantTypeCode: hashCode(
      "PARTICIPANT",
      record.participantType || "UNKNOWN",
      8,
    ),
    totalParticipants: record.totalParticipants,
    menCount: record.menCount,
    womenCount: record.womenCount,
    referralsMade: record.referralsMade,
    durationMinutes: record.durationMinutes,
    hasGps: hasGps(record),
    barrierSignal: boolBarrier(record),
    highRiskGroupSignal: boolHighRisk(record),
    themeSignal: boolTheme(record),
    referralGap: record.totalParticipants >= 40 && record.referralsMade === 0,
    dataQualityPenalty: dataQualityPenalty(record),
  }));

  const report: AnonymizationReport = {
    sourceRows: records.length,
    anonymizedRows: rows.length,
    directIdentifierFieldsRemoved,
    freeTextFieldsMinimized,
    generalizedFields,
    pseudonymizedFields,
    retainedFields,
    notes: [
      "No staff names, usernames, form links, GPS coordinates, exact timestamps, raw observations, or raw participant questions are retained.",
      "Geographic labels are converted to stable local codes for analysis without exposing exact names to LLMs or online uploads.",
      "This is a technical de-identification step, not a legal certification of anonymization.",
    ],
  };

  return { rows, report };
}

function buildAreaCodeMap(context: AgentContext) {
  const names = [
    ...context.siteMetrics.map((area) => area.name),
    ...context.communeMetrics.map((area) => area.name),
    ...context.records.flatMap((record) => [
      record.region,
      record.district,
      record.commune,
      record.fokontany,
      record.site,
      record.csbName,
      record.locationName,
    ]),
  ]
    .filter((name) => name && name !== "---")
    .sort((a, b) => b.length - a.length);
  const uniqueNames = [...new Set(names)];

  return new Map(
    uniqueNames.map((name, index) => [
      name,
      `AREA_${String(index + 1).padStart(3, "0")}`,
    ]),
  );
}

function redactString(value: string, areaCodeMap: Map<string, string>) {
  let redacted = value;

  areaCodeMap.forEach((code, name) => {
    redacted = redacted.replaceAll(name, code);
  });

  return redacted
    .replace(/\bR\d{2}-MAFY-S\d+\b/g, "RECORD_CODE")
    .replace(/\b[-+]?\d{1,2}\.\d{4,}\s*,?\s*[-+]?\d{1,3}\.\d{4,}\b/g, "GPS_REDACTED")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "EMAIL_REDACTED")
    .replace(/https?:\/\/\S+/gi, "URL_REDACTED")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "PHONE_REDACTED");
}

function redactUnknown(value: unknown, areaCodeMap: Map<string, string>): unknown {
  if (typeof value === "string") return redactString(value, areaCodeMap);
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item, areaCodeMap));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        redactUnknown(child, areaCodeMap),
      ]),
    );
  }

  return value;
}

export function buildLlmSafePayload(
  context: AgentContext,
  sourceResults: AgentResult[],
  language: string,
) {
  const { report } = anonymizeRecords(context.records);
  const areaCodeMap = buildAreaCodeMap(context);

  return {
    language,
    anonymization: report,
    summary: context.summary,
    agentFindings: redactUnknown(
      sourceResults.map((agentResult) => ({
        agent: agentResult.agent,
        summary: agentResult.summary,
        findings: agentResult.findings,
      })),
      areaCodeMap,
    ),
  };
}
