import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import { lookupMenuItem } from "../discovery/index.js";
import { executeStep, closeBrowser } from "../execution/executor.js";
import { computeHash, saveWorkflowFile, loadWorkflow, listWorkflows, WorkflowIntegrityError } from "./store.js";
import { getPolicy, isPathInJail } from "../policy/allowlist.js";
import { isRealPathInJail } from "../util/pathJail.js";
import { savePlan, loadPlan, consumeApproval, ApprovalError } from "../approval/index.js";
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

function stepPolicyError(step: Step): { code: string; message: string; hint: string } | null {
  const effect = (step as any)._effect || step.effect;
  if (effect === "destructive" && !getPolicy().destructiveAllowed) {
    return makeError(ErrorCodes.EFFECT_NEEDS_APPROVAL, `Step ${step.id} is destructive`, "Destructive actions are denied by policy");
  }
  return null;
}

async function evaluateChecks(checks: Check[], audit: Array<Record<string, unknown>>): Promise<VerifyResult> {
  const evidence: Array<Record<string, unknown>> = [];
  let allPass = true;
  let anyFail = false;
  for (const c of checks) {
    const params = c.params || {};
    let pass = true;
    let detail: Record<string, unknown> = { check: c.id, kind: c.kind };
    if (c.kind === "dom_row_exists" || c.kind === "dom_text_equals") {
      const lastText = audit.map((a) => JSON.stringify(a.observed || "")).join(" ");
      const target = (params.text || params.value || "") as string;
      pass = target ? lastText.includes(String(target)) : false;
      detail = { ...detail, target, found: pass };
    } else if (c.kind === "file_exists") {
      const targetPath = params.path as string | undefined;
      if (!targetPath || !isPathInJail(targetPath) || !(await isRealPathInJail(targetPath))) {
        pass = false;
        detail = { ...detail, path: targetPath, error: "PATH_OUTSIDE_JAIL" };
      } else {
        try {
          const st = await fs.stat(targetPath);
          pass = st.isFile();
          detail = { ...detail, path: targetPath, exists: pass };
        } catch {
          pass = false;
          detail = { ...detail, path: targetPath, exists: false };
        }
      }
    } else if (c.kind === "file_hash_changed") {
      const fsSteps = audit.filter((a) => (a as any).observed?.hash);
      pass = fsSteps.length > 0;
      detail = { ...detail, fsSteps: fsSteps.length };
    } else if (c.kind === "file_contains") {
      const targetPath = params.path as string | undefined;
      const needle = (params.value ?? params.text ?? "") as string;
      if (!targetPath) {
        pass = false;
        detail = { ...detail, error: "path required" };
      } else if (!isPathInJail(targetPath) || !(await isRealPathInJail(targetPath))) {
        pass = false;
        detail = { ...detail, error: "PATH_OUTSIDE_JAIL", path: targetPath };
      } else if (!needle) {
        pass = false;
        detail = { ...detail, error: "value required" };
      } else {
        try {
          const content = await fs.readFile(targetPath, "utf8");
          pass = content.includes(String(needle));
          detail = { ...detail, path: targetPath, target: String(needle), found: pass };
        } catch {
          pass = false;
          detail = { ...detail, path: targetPath, error: "file not readable" };
        }
      }
    } else if (c.kind === "exit_code") {
      pass = audit.every((a) => (a as any).ok === true);
      detail = { ...detail, allOk: pass };
    } else {
      pass = false;
      anyFail = true;
      detail = { ...detail, error: "unsupported check kind" };
    }
    evidence.push(detail);
    if (!pass) { allPass = false; anyFail = true; }
  }
  return { plan_id: "", verdict: allPass ? "pass" : anyFail ? "fail" : "inconclusive", evidence };
}

function resolveStep(step: Step): Step {
  // A saved step already carries its resolved invoke. Never rebind it to a
  // different target through the mutable menu registry.
  if ((step as any)._invoke) return step;
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
  const knownPrefixes = ["cli.", "fs.", "browser."];
  const allowedChecks = new Set(["exit_code", "file_contains", "file_exists", "file_hash_changed", "dom_text_equals", "dom_row_exists"]);
  for (const c of checks || []) {
    if (!allowedChecks.has(c.kind)) {
      errors.push(makeError(ErrorCodes.INVALID_INPUT, `Unsupported check kind ${c.kind}`, "Use a documented verification kind"));
    }
  }
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
  await savePlan(plan_id, hash, wf);
  return { plan_id, hash, risk_summary };
}

export async function executeWorkflow(plan_id: string, approved_hash: string): Promise<RunResult> {
  let p = pending.get(plan_id);
  if (!p) {
    try {
      const stored = await loadPlan(plan_id);
      if (stored) {
        p = { plan_id, hash: stored.hash, workflow: stored.workflow, audit: [], executed: false };
        pending.set(plan_id, p);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid plan";
      return { plan_id, status: "failed", audit: [{ error: makeError(ErrorCodes.INVALID_INPUT, message, "Use the plan_id returned by propose_workflow") }] };
    }
  }
  if (!p) {
    return { plan_id, status: "failed", audit: [{ error: "plan not found" }] };
  }
  if (p.hash !== approved_hash) {
    return { plan_id, status: "failed", audit: [{ error: makeError(ErrorCodes.UNAPPROVED, "execute_workflow needs the approved hash from the user's yes.", "Get user yes") }] };
  }
  try {
    // The human-created approval file is the authority; the model-supplied
    // hash is only a cross-check. Claiming the file is single-use.
    await consumeApproval(plan_id, p.hash);
  } catch (error) {
    const code = error instanceof ApprovalError ? error.code : ErrorCodes.UNAPPROVED;
    const message = error instanceof Error ? error.message : "approval check failed";
    return {
      plan_id,
      status: "failed",
      audit: [{ error: makeError(code, message, `A human must run: anybridge approve ${plan_id}`) }],
    };
  }
  p.verifyResult = undefined;
  // execute steps
  const audit: Array<Record<string, unknown>> = [];
  let failedStep: string | undefined;
  for (const step of p.workflow.steps) {
    const policyError = stepPolicyError(step);
    if (policyError) {
      audit.push({ step: step.id, ok: false, error: policyError });
      failedStep = step.id;
      break;
    }
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
  const result = await evaluateChecks(p.workflow.verification, p.audit);
  const vr: VerifyResult = { plan_id, verdict: result.verdict, evidence: result.evidence };
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
  let wf: Workflow | null = null;
  try {
    wf = await loadWorkflow(name);
  } catch (error) {
    const code = error instanceof WorkflowIntegrityError ? error.code : ErrorCodes.WORKFLOW_NOT_FOUND;
    const message = error instanceof Error ? error.message : "workflow load failed";
    return { plan_id: name, status: "failed", audit: [{ error: makeError(code, message, "Re-save the workflow from a verified plan") }] };
  }
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
  const audit: Array<Record<string, unknown>> = [];
  let failedStep: string | undefined;
  for (const step of steps) {
    const policyError = stepPolicyError(step);
    if (policyError) {
      audit.push({ step: step.id, ok: false, error: policyError });
      failedStep = step.id;
      break;
    }
    const res = await executeStep(step);
    audit.push({ step: step.id, ...res });
    if (!res.ok) { failedStep = step.id; break; }
  }
  await closeBrowser();
  const verification = await evaluateChecks(wf.verification, audit);
  verification.plan_id = name;
  if (failedStep) return { plan_id: name, status: "failed", failedStep, audit, verification };
  if (verification.verdict !== "pass") {
    return { plan_id: name, status: "failed", failedStep: "verification", audit, verification };
  }
  return { plan_id: name, status: "passed", audit, verification };
}

export function getPending(plan_id: string): PendingPlan | undefined {
  return pending.get(plan_id);
}
