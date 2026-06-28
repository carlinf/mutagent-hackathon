export type AgentOperation =
  | "full-review"
  | "data-quality"
  | "outreach-load"
  | "referral-score"
  | "risk-intensity"
  | "follow-up-operations"
  | "what-if-forecast"
  | "report";

export type PriorityLevel = "High" | "Medium" | "Low";

export interface SensitisationRecord {
  referral: string;
  formid: string;
  region: string;
  district: string;
  commune: string;
  fokontany: string;
  gps: string;
  uid: string;
  dateActivity: string;
  startTime: string;
  endTime: string;
  staffResponsible: string;
  locationType: string;
  csbName: string;
  locationName: string;
  primaryThemeMafy: string;
  participantType: string;
  totalParticipants: number;
  menCount: number;
  womenCount: number;
  participantQuestions: string;
  referralsMade: number;
  observation: string;
  difficulties: string;
  successes: string;
  durationMinutes: number;
  site: string;
  month: string;
  period: string;
  raw: Record<string, unknown>;
}

export interface DatasetSummary {
  dataset: string;
  rows: number;
  columns: number;
  participants: number;
  men: number;
  women: number;
  referrals: number;
  regions: number;
  sites: number;
  months: number;
  gpsMissing: number;
  duplicateUidRows: number;
}

export interface AreaMetric {
  id: string;
  name: string;
  region: string;
  district: string;
  sessions: number;
  participants: number;
  referrals: number;
  uniqueFokontany: number;
  totalOutreachMinutes: number;
  barriers: number;
  highRiskSessions: number;
  themeSessions: number;
  dataQualityPenalty: number;
  referralGaps: number;
  referralRate: number;
  outreachLoadScore: number;
  referralScore: number;
  riskIntensityScore: number;
  followupPriorityScore: number;
}

export interface MonthlyMetric {
  month: string;
  sessions: number;
  participants: number;
  referrals: number;
  uniqueFokontany: number;
  outreachLoadScore: number;
  referralScore: number;
  riskIntensityScore: number;
  followupPriorityScore: number;
}

export interface QualityFinding {
  id: string;
  label: string;
  count: number;
  severity: PriorityLevel;
  description: string;
  affectedIds: string[];
}

export type FollowUpActionType =
  | "Referral recording audit"
  | "Data quality cleanup"
  | "CSB follow-up coordination"
  | "Outreach load review";

export interface OperationsAgentStep {
  agent: string;
  decision: string;
  evidence: string[];
}

export interface FollowUpAction {
  id: string;
  areaId: string;
  areaName: string;
  region: string;
  district: string;
  priority: PriorityLevel;
  score: number;
  actionType: FollowUpActionType;
  action: string;
  owner: string;
  dueWindow: string;
  status: "Ready for field review";
  reason: string;
  evidence: string[];
  blockers: string[];
  metrics: {
    participants: number;
    sessions: number;
    referrals: number;
    referralGaps: number;
    dataQualityPenalty: number;
    highRiskSessions: number;
    outreachLoadScore: number;
    referralScore: number;
    riskIntensityScore: number;
    followupPriorityScore: number;
  };
}

export interface OperationsRationale {
  mode: "rules" | "llm-assisted";
  summary: string;
  agentSteps: OperationsAgentStep[];
  llmSummary?: string;
}

export interface FollowUpOperationsResult {
  generatedAt: string;
  subAgents: string[];
  summary: string;
  actions: FollowUpAction[];
  rationale?: OperationsRationale;
}

export type WhatIfScenarioId =
  | "followup-delay"
  | "referral-backlog"
  | "data-quality-drift";

export interface WhatIfScenarioConfig {
  id: WhatIfScenarioId;
  label: string;
  description: string;
  assumptions: string[];
}

export interface WhatIfForecastPoint {
  monthIndex: number;
  label: string;
  baseline: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface WhatIfAreaForecast {
  areaId: string;
  areaName: string;
  region: string;
  district: string;
  currentScore: number;
  projectedMedian: number;
  projectedP90: number;
  riskDelta: number;
  volatility: number;
  rank: number;
  drivers: string[];
  trajectory: WhatIfForecastPoint[];
}

export interface WhatIfRaceStanding {
  areaId: string;
  areaName: string;
  region: string;
  value: number;
  delta: number;
  rank: number;
}

export interface WhatIfRaceFrame {
  monthIndex: number;
  label: string;
  standings: WhatIfRaceStanding[];
}

export interface WhatIfRationale {
  mode: "rules" | "llm-assisted";
  summary: string;
  agentSteps: OperationsAgentStep[];
  llmSummary?: string;
}

export interface WhatIfForecastResult {
  generatedAt: string;
  scenario: WhatIfScenarioConfig;
  horizonMonths: number;
  iterations: number;
  subAgents: string[];
  summary: string;
  areas: WhatIfAreaForecast[];
  raceFrames: WhatIfRaceFrame[];
  rationale?: WhatIfRationale;
}

export interface AgentRequest {
  operation: AgentOperation;
  options?: {
    limit?: number;
    includeRationale?: boolean;
    scenarioId?: WhatIfScenarioId;
    horizonMonths?: number;
    iterations?: number;
  } | undefined;
  language?: "en" | "fr" | undefined;
}

export interface AgentFinding {
  title: string;
  severity: PriorityLevel;
  evidence: string[];
  recommendation: string;
}

export interface AgentResult<T = unknown> {
  agent: string;
  operation: AgentOperation;
  summary: string;
  findings: AgentFinding[];
  data: T;
  usedLLM: boolean;
}

export interface DetailedReport {
  generatedAt: string;
  title: string;
  dataset: DatasetSummary;
  executiveSummary: string;
  usedLLM: boolean;
  sourceAgents: string[];
  agentResults: AgentResult[];
  siteMetrics: AreaMetric[];
  communeMetrics: AreaMetric[];
  monthlyMetrics: MonthlyMetric[];
  operations: FollowUpOperationsResult | undefined;
  chartData: {
    monthlyActivity: MonthlyMetric[];
    siteScores: AreaMetric[];
    communeQueue: AreaMetric[];
    operationsQueue: FollowUpAction[];
  };
}

export interface AgentContext {
  records: SensitisationRecord[];
  summary: DatasetSummary;
  siteMetrics: AreaMetric[];
  communeMetrics: AreaMetric[];
  monthlyMetrics: MonthlyMetric[];
}

export interface AnonymizedRecord {
  recordCode: string;
  regionCode: string;
  districtCode: string;
  communeCode: string;
  siteCode: string;
  month: string;
  locationType: string;
  themeCode: string;
  participantTypeCode: string;
  totalParticipants: number;
  menCount: number;
  womenCount: number;
  referralsMade: number;
  durationMinutes: number;
  hasGps: boolean;
  barrierSignal: boolean;
  highRiskGroupSignal: boolean;
  themeSignal: boolean;
  referralGap: boolean;
  dataQualityPenalty: number;
}

export interface AnonymizationReport {
  sourceRows: number;
  anonymizedRows: number;
  directIdentifierFieldsRemoved: string[];
  freeTextFieldsMinimized: string[];
  generalizedFields: string[];
  pseudonymizedFields: string[];
  retainedFields: string[];
  notes: string[];
}
