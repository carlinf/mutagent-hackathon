import type {
  AgentContext,
  AgentFinding,
  AgentOperation,
  AgentRequest,
  AgentResult,
} from "../types/domain";
import type { LlmClient } from "../services/llm";

export interface AgentDependencies {
  llm: LlmClient;
}

export interface SpecialistAgent<T = unknown> {
  name: string;
  operation: AgentOperation;
  run(
    context: AgentContext,
    request: AgentRequest,
    dependencies: AgentDependencies,
  ): Promise<AgentResult<T>>;
}

export function result<T>(
  agent: string,
  operation: AgentOperation,
  summary: string,
  findings: AgentFinding[],
  data: T,
  usedLLM = false,
): AgentResult<T> {
  return {
    agent,
    operation,
    summary,
    findings,
    data,
    usedLLM,
  };
}
