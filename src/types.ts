export type Effect = "read" | "write" | "destructive" | "network" | "unknown";

export interface MenuInput {
  name: string;
  type: "string" | "number" | "boolean" | "path" | "date" | "enum";
  required: boolean;
  example?: unknown;
  enumValues?: string[];
}

export interface MenuItem {
  id: string; // a1, a2, ...
  kind: "cli_command" | "cli_flag" | "ui_action" | "ui_input" | "ui_navigation" | "file_io";
  label: string;
  invoke: { argv?: string[] } | { role: string; accessibleName: string; action: string; url?: string };
  inputs: MenuInput[];
  effect: Effect;
  reversible: "yes" | "no" | "unknown";
  evidenceRef: string;
  inferenceNote?: string;
}

export interface Menu {
  target: string;
  items: MenuItem[];
  notObserved?: string[];
}

export interface Capability {
  id: string;
  kind: string;
  invoke: unknown;
  inputs: MenuInput[];
  effect: Effect;
  reversible: "yes" | "no" | "unknown";
  evidenceRef: string;
  inferenceNote?: string;
}

export interface CapabilityMap {
  target: string;
  affordances: Capability[];
  notObserved: string[];
}

export interface Step {
  id: string;
  action: string; // menu id
  args?: Record<string, unknown>;
  expect?: string;
  effect?: Effect;
}

export interface Check {
  id: string;
  kind: string;
  params?: Record<string, unknown>;
}

export interface Workflow {
  workflow_id: string;
  version: number;
  intent: string;
  params: Record<string, { type: string; example: unknown }>;
  capabilities_required: string[];
  preconditions: Array<{ kind: string; value: string }>;
  steps: Step[];
  verification: Check[];
  rollback?: Step[];
  confidence?: number;
  unknowns?: string[];
  status?: "blocked" | "needs_clarification" | "ready";
}

export interface PlanResult {
  plan_id: string;
  hash: string;
  risk_summary: string;
  errors?: Array<{ code: string; message: string; hint: string }>;
}

export interface RunResult {
  plan_id: string;
  status: "passed" | "failed" | "stopped";
  failedStep?: string;
  audit: Array<Record<string, unknown>>;
  verification?: VerifyResult;
}

export interface VerifyResult {
  plan_id: string;
  verdict: "pass" | "fail" | "inconclusive";
  evidence: Array<Record<string, unknown>>;
}

export interface Target {
  kind: "cli" | "browser" | "file";
  name: string;
  origin?: string;
  path?: string;
}
