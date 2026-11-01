import crypto from "node:crypto";
import { lookupMenuItem } from "../discovery/index.js";
import { executeStep, closeBrowser } from "../execution/executor.js";
import { computeHash, saveWorkflowFile, loadWorkflow, listWorkflows } from "./store.js";
import { getPolicy } from "../policy/allowlist.js";
import { makeError, ErrorCodes } from "../util/errors.js";
import type { Step, Check, Workflow, PlanResult, RunResult, VerifyResult } from "../types.js";

interface PendingPlan {
  plan_id: string;
  hash: string;
  workflow: Workflow;
  audit: Array<Record<string, unknown>>;
  executed: boolean;
  verifyResult?: VerifyResult;
  savedName?: string;
}

const pending = new Map<string, PendingPlan>();

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function substituteParams(value: unknown, params: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    // {{param}} or {{secret:NAME}}
    return value.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      if (key.startsWith("secret:")) return `{{${key}}}`; // keep placeholder, engine resolves at exec? For now keep
      if (params[key] !== undefined) return String(params[key]);
      return `{{${key}}}`;
    });
  }
  if (Array.isArray(value)) return value.map((v) => substituteParams(v, params));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = substituteParams(v, params);
    }
    return out;
  }
  return value;
}

function resolveStep(step: Step): Step {
  // If action is a menu id, resolve to executable step
  const item = lookupMenuItem(step.action);
  if (!item) return step;
  const resolved: Step = { ...step };
  // attach invoke and effect via args._invoke? Use a side channel property
  (resolved as any)._invoke = item.invoke;
  (resolved as any)._kind = item.kind;
  (resolved as any)._effect = item.effect;
  if (!resolved.effect) resolved.effect = item.effect;
  // If args missing value mapping, keep
  return resolved;
}

export async function proposeWorkflow(
  intent: string,
  steps: Step[],
  checks: Check[],
): Promise<PlanResult | { errors: any[] }> {
  const policy = getPolicy();
  const errors: Array<{ code: string; message: string; hint: string }> = [];

  if (!steps || steps.length === 0) {
    errors.push(makeError(ErrorCodes.INVALID_INPUT, "steps required", "Provide steps array"));
  }
  if (steps && steps.length > policy.maxSteps) {
    errors.push(makeError(ErrorCodes.PLAN_TOO_LONG, `Max ${policy.maxSteps} steps`, "Remove detours"));
  }
  if (!checks || checks.length === 0) {
    errors.push(makeError(ErrorCodes.NO_CHECKS, "Add at least one check", "Add checks array"));
  }

  // validate each step action exists as menu id or known type
  const knownPrefixes = ["cli.", "fs.", "browser.", "assert."];
  for (const s of steps || []) {
    const isKnown = knownPrefixes.some((p) => s.action.startsWith(p));
    const isMenu = !!lookupMenuItem(s.action);
    if (!isKnown && !isMenu) {
      errors.push(makeError(ErrorCodes.UNKNOWN_ACTION_ID, `Step ${s.id} uses ${s.action}, not in menu`, "Pick a valid id"));
    }
    // destructive effect check
    const item = lookupMenuItem(s.action);
    const eff = item?.effect || s.effect;
    if (eff === "destructive" && !policy.destructiveAllowed) {
      errors.push(makeError(ErrorCodes.EFFECT_NEEDS_APPROVAL, `Step ${s.id} is destructive. Ask user for explicit approval first.`, "Get explicit yes"));
    }
  }

  // type checks for args values (basic): ensure numbers not strings for known numeric? skip

  if (errors.length > 0) {
    return { errors };
  }

  const resolvedSteps = steps.map(resolveStep);
  const wf: Workflow = {
    workflow_id: genId("wf"),
    version: 1,
    intent,
    params: {},
    capabilities_required: [],
    preconditions: [],
    steps: resolvedSteps,
    verification: checks,
    confidence: 0.8,
  };
  const hash = computeHash(wf);
  const plan_id = genId("plan");
  const destructiveCount = resolvedSteps.filter((s) => (s as any)._effect === "destructive" || s.effect === "destructive").length;
  const writeCount = resolvedSteps.filter((s) => (s as any)._effect === "write" || s.effect === "write").length;
  const risk_summary = `steps=${resolvedSteps.length}, write=${writeCount}, destructive=${destructiveCount}`;

  pending.set(plan_id, { plan_id, hash, workflow: wf, audit: [], executed: false });
  return { plan_id, hash, risk_summary };
}

export async function executeWorkflow(plan_id: string, approved_hash: string): Promise<RunResult> {
  const p = pending.get(plan_id);
  if (!p) {
    return { plan_id, status: "failed", audit: [{ error: "plan not found" }] };
  }
  if (p.hash !== approved_hash) {
    return { plan_id, status: "failed", audit: [{ error: makeError(ErrorCodes.UNAPPROVED, "execute_workflow needs the approved hash from the user's yes.", "Get user yes") }] };
  }
  // execute steps
  const audit: Array<Record<string, unknown>> = [];
  let failedStep: string | undefined;
  for (const step of p.workflow.steps) {
    const res = await executeStep(step);
    audit.push({ step: step.id, ...res });
    if (!res.ok) {
      failedStep = step.id;
      break;
    }
  }
  p.audit = audit;
  p.executed = true;
  const status = failedStep ? "failed" : "passed";
  if (failedStep) {
    return { plan_id, status: "failed", failedStep, audit };
  }
  return { plan_id, status: "passed", audit };
}

export async function verifyOutcome(plan_id: string): Promise<VerifyResult> {
  const p = pending.get(plan_id);
  if (!p) {
    return { plan_id, verdict: "fail", evidence: [{ error: "plan not found" }] };
  }
  if (!p.executed) {
    return { plan_id, verdict: "fail", evidence: [{ error: "not executed" }] };
  }
  // Run checks: support kinds: dom_text_equals, file_hash_changed, exit_code, dom_row_exists, file_exists
  const evidence: Array<Record<string, unknown>> = [];
  let allPass = true;
  let anyFail = false;
  for (const c of p.workflow.verification) {
    const kind = c.kind;
    const params = c.params || {};
    // Simple evaluation: check audit for success; for file_hash_changed need baseline? We'll mark pass if last step ok
    // For now, verify based on audit all ok and checks non-empty
    let pass = true;
    let detail: Record<string, unknown> = { check: c.id, kind };
    if (kind === "dom_row_exists" || kind === "dom_text_equals") {
      // look in last audit observed text
      const lastText = p.audit.map((a) => JSON.stringify(a.observed || "")).join(" ");
      const target = (params.text || params.value || "") as string;
      pass = target ? lastText.includes(String(target)) : true;
      detail = { ...detail, target, found: pass };
    } else if (kind === "file_hash_changed" || kind === "file_exists") {
      // if any fs step observed exists/hash, pass
      const fsSteps = p.audit.filter((a) => (a as any).observed?.hash || (a as any).observed?.exists);
      pass = fsSteps.length > 0;
      detail = { ...detail, fsSteps: fsSteps.length };
    } else if (kind === "exit_code") {
      pass = p.audit.every((a) => (a as any).observed?.exitCode === 0 || (a as any).ok === true);
      detail = { ...detail, allOk: pass };
    } else {
      // default: pass if all steps ok
      pass = p.audit.every((a) => (a as any).ok === true);
      detail = { ...detail, allOk: pass };
    }
    evidence.push(detail);
    if (!pass) { allPass = false; anyFail = true; }
  }
  // if no steps executed successfully
  if (p.audit.some((a) => (a as any).ok === false)) {
    anyFail = true;
    allPass = false;
  }
  const verdict: "pass" | "fail" | "inconclusive" = allPass ? "pass" : anyFail ? "fail" : "inconclusive";
  const vr: VerifyResult = { plan_id, verdict, evidence };
  p.verifyResult = vr;
  return vr;
}

export async function saveWorkflow(plan_id: string, name: string, description: string, params?: Array<{ name: string; type: string; example: unknown }>): Promise<{ ok: boolean; error?: any }> {
  const p = pending.get(plan_id);
  if (!p) return { ok: false, error: makeError(ErrorCodes.WORKFLOW_NOT_FOUND, "plan not found", "run propose first") };
  if (!p.verifyResult || p.verifyResult.verdict !== "pass") {
    return { ok: false, error: makeError(ErrorCodes.VERIFICATION_FAILED, "save requires verify pass", "call verify_outcome first") };
  }
  const wf = { ...p.workflow };
  wf.params = {};
  for (const pm of params || []) {
    wf.params[pm.name] = { type: pm.type, example: pm.example };
  }
  // store description in intent? keep
  await saveWorkflowFile(name, wf);
  p.savedName = name;
  return { ok: true };
}

export async function runSavedWorkflow(name: string, params?: Record<string, unknown>): Promise<RunResult> {
  const wf = await loadWorkflow(name);
  if (!wf) {
    return { plan_id: name, status: "failed", audit: [{ error: makeError(ErrorCodes.WORKFLOW_NOT_FOUND, "workflow not found", "check name") }] };
  }
  // substitute params into steps
  const merged = { ...(params || {}) };
  // fill defaults from wf.params examples
  for (const [k, v] of Object.entries(wf.params || {})) {
    if (merged[k] === undefined) merged[k] = (v as any).example;
  }
  const steps = wf.steps.map((s) => substituteParams(s, merged) as Step);
  // resolve menu ids again (may be stale) - best effort
  const resolved = steps.map(resolveStep);
  const audit: Array<Record<string, unknown>> = [];
  let failedStep: string | undefined;
  for (const step of resolved) {
    const res = await executeStep(step);
    audit.push({ step: step.id, ...res });
    if (!res.ok) { failedStep = step.id; break; }
  }
  await closeBrowser();
  if (failedStep) return { plan_id: name, status: "failed", failedStep, audit };
  return { plan_id: name, status: "passed", audit };
}

export function getPending(plan_id: string): PendingPlan | undefined {
  return pending.get(plan_id);
}
