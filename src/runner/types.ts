import { CheckSuiteResult } from '../checks/types';

export interface AgentResult {
  responseText: string;
  actualTools?: string[];
  latencyMs?: number;
  toolCallCount?: number;
  cost?: number;
}

export type AgentFn = (query: string) => Promise<AgentResult>;

export interface CaseResult {
  id: string;
  query: string;
  passed: boolean;
  checks: CheckSuiteResult;
  metadata?: Record<string, unknown>;
  agentResult: AgentResult;
}

export interface SuiteResult {
  name: string;
  passed: number;
  failed: number;
  total: number;
  cases: CaseResult[];
  duration: number;
}
