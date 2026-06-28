# MAFY Agentic Infrastructure

This document summarizes how MAFY uses agents to turn an anonymized sensitisation workbook into follow-up actions, scenario planning, and downloadable health operations reports.

The design goal is not to make the AI invent answers. The agents are grounded in workbook-derived metrics, deterministic scoring, anonymized aggregate payloads, and clear operational boundaries.

## System View

```mermaid
flowchart TB
  U[Field, healthcare, programme, and M&E users] --> F[MAFY Health Operations Console]
  F --> API[MAFY Agent Service]

  API --> W[Workbook Loader]
  W --> A[Anonymization Layer]
  A --> C[CoordinatorAgent]

  C --> DQ[DataQualityAgent]
  C --> OL[OutreachAgent]
  C --> RS[ReferralAgent]
  C --> RI[RiskAgent]
  C --> FO[FollowUpOperationsAgent]
  C --> WF[WhatIfForecastAgent]
  C --> RP[ReportAgent]

  FO --> OT[OperationsTriageAgent]
  FO --> OR[OperationsRationaleAgent]

  WF --> MP[MonteCarloParameterAgent]
  WF --> MC[ScenarioMonteCarloAgent]
  WF --> FR[ForecastRationaleAgent]

  OR -. optional LLM text .-> LLM[OpenAI Responses API]
  FR -. optional LLM text .-> LLM
  RP -. optional LLM text .-> LLM

  C --> O[Structured JSON Payloads]
  O --> F
```

## Agent Roles

| Agent | Role | Output |
| --- | --- | --- |
| `CoordinatorAgent` | Selects and runs the required MAFY specialist workflow. | Plans, ordered agent results, structured response payloads. |
| `DataQualityAgent` | Reviews missing GPS, duplicate UID, and reliability signals. | Data quality findings and recommendations. |
| `OutreachAgent` | Measures outreach concentration and field activity load. | Outreach load metrics and findings. |
| `ReferralAgent` | Reviews referral activity and possible referral gaps. | Referral score findings and recommendations. |
| `RiskAgent` | Classifies operational risk intensity from outreach, referral, theme, and barrier signals. | Risk-intensity findings. |
| `FollowUpOperationsAgent` | Converts workbook evidence into current follow-up actions. | Field-ready action queue. |
| `WhatIfForecastAgent` | Runs probabilistic scenario forecasts for planning conversations. | Monte Carlo trajectories and animated race frames. |
| `ReportAgent` | Synthesizes agent outputs into report-ready narrative and export data. | Detailed report payload. |

## Operations Workflow

```mermaid
sequenceDiagram
  participant UI as Operations Page
  participant API as MAFY Agent Service
  participant C as CoordinatorAgent
  participant T as OperationsTriageAgent
  participant R as OperationsRationaleAgent
  participant L as Optional LLM

  UI->>API: POST /api/operations/follow-up
  API->>C: operation = follow-up-operations
  C->>T: rank current commune metrics
  T-->>C: actions, owners, due windows, evidence
  C->>R: explain action queue
  alt OPENAI_API_KEY configured
    R->>L: anonymized aggregate action payload
    L-->>R: concise rationale text
  else no LLM key
    R-->>C: deterministic rationale
  end
  C-->>API: structured agent result
  API-->>UI: current action queue
```

The operations workflow is used for real current actions. It does not simulate the future.

## What-if Forecast Workflow

```mermaid
sequenceDiagram
  participant UI as What-if Page
  participant API as MAFY Agent Service
  participant C as CoordinatorAgent
  participant P as MonteCarloParameterAgent
  participant M as ScenarioMonteCarloAgent
  participant R as ForecastRationaleAgent
  participant L as Optional LLM

  UI->>API: POST /api/forecast/what-if
  API->>C: operation = what-if-forecast
  C->>P: build scenario parameters from workbook history
  P-->>C: horizon, iterations, drift, volatility, drivers
  C->>M: run seeded Monte Carlo forecast
  M-->>C: P10/P50/P90 trajectories and race frames
  C->>R: explain probabilistic forecast
  alt OPENAI_API_KEY configured
    R->>L: anonymized aggregate forecast payload
    L-->>R: concise scenario explanation
  else no LLM key
    R-->>C: deterministic scenario explanation
  end
  C-->>API: forecast result
  API-->>UI: animated trajectories and risk-pressure race
```

The what-if workflow is explicitly probabilistic. It helps teams discuss possible pressure if a scenario is not prioritized, but it is not an operational fact or clinical prediction.

## Report Workflow

```mermaid
flowchart LR
  A[Specialist agent outputs] --> B[ReportAgent]
  B --> C[Executive summary]
  B --> D[Chart data]
  B --> E[Operations queue]
  B --> F[Agent findings]
  C --> G[HTML download]
  D --> G
  E --> G
  F --> G
  B --> H[JSON download]
  B --> I[CSV download]
```

The report workflow packages the current MAFY evidence, specialist findings, chart data, and action queue into exportable formats for review and sharing.

## LLM Boundaries

The project can run without an LLM key. Deterministic scoring and Monte Carlo calculations still work.

When `OPENAI_API_KEY` is configured, the LLM is used for narrative support only:

- explaining current follow-up actions,
- explaining probabilistic what-if forecasts,
- improving report summary language.

Before LLM-facing payloads are built, sensitive workbook fields are removed, minimized, or pseudonymized. The LLM is not given raw staff names, exact GPS strings, raw free-text observations, raw participant questions, form links, or direct record identifiers.

## Safety Position

This is an M&E and operations assistant, not a clinical decision system.

- It does not diagnose patients.
- It does not infer confirmed disease burden.
- It does not replace local field review.
- It does not claim that Monte Carlo outcomes will happen.
- It supports prioritization, explanation, data quality review, and planning.

## Main API Surfaces

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Service health and LLM availability. |
| `GET /api/agents` | Lists coordinator and specialist agents. |
| `GET /api/dataset/summary` | Returns workbook summary and chart metrics. |
| `GET /api/dataset/anonymization-report` | Describes anonymization coverage. |
| `POST /api/operations/follow-up` | Runs current follow-up operations workflow. |
| `POST /api/forecast/what-if` | Runs Monte Carlo scenario forecasting workflow. |
| `POST /api/reports/detailed` | Runs detailed report workflow. |
| `POST /api/agents/run` | Generic coordinator entry point. |

## Pitch Summary

The agentic infrastructure is designed for trustworthy M&E assistance: deterministic analytics where decisions need evidence, optional LLM narrative where explanation helps humans, and clear scenario labeling where forecasting is probabilistic.
