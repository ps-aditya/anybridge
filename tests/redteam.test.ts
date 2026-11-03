import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setPolicy } from "../src/policy/allowlist.js";
import { registerMenuItems } from "../src/discovery/index.js";
import { saveWorkflowFile } from "../src/workflow/store.js";
import type { Workflow } from "../src/types.js";

let dir: string;
let dataFile: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ab-redteam-"));
  process.env.ANYBRIDGE_STATE_DIR = join(dir, "state");
  process.env.ANYBRIDGE_STORE_DIR = join(dir, "workflows");
  dataFile = join(dir, "tasks.json");
  await writeFile(dataFile, JSON.stringify({ tasks: [{ title: "Ship demo", done: true }] }), "utf8");
  setPolicy({ pathJail: dir, destructiveAllowed: false });
});

const steps = [{ id: "s1", action: "cli.run", args: { argv: ["node", "--version"] }, expect: "exit 0" }];
const checks = [{ id: "v1", kind: "exit_code" }];

async function proposed() {
  const { proposeWorkflow } = await import("../src/workflow/index.js");
  const plan = await proposeWorkflow("red-team", steps, checks);
  if (!("plan_id" in plan)) throw new Error(JSON.stringify(plan));
  return plan;
}

describe("red-team gate", () => {
  it("blocks execution without a human approval", async () => {
    const { executeWorkflow } = await import("../src/workflow/index.js");
    const plan = await proposed();
    const run = await executeWorkflow(plan.plan_id, plan.hash);
    expect(run.status).toBe("failed");
    expect(JSON.stringify(run.audit)).toContain("UNAPPROVED");
  });

  it("blocks a wrong approval hash", async () => {
    const { executeWorkflow } = await import("../src/workflow/index.js");
    const { createApproval } = await import("../src/approval/index.js");
    const plan = await proposed();
    await createApproval(plan.plan_id, plan.hash);
    const run = await executeWorkflow(plan.plan_id, "wrong");
    expect(run.status).toBe("failed");
    expect(JSON.stringify(run.audit)).toContain("UNAPPROVED");
  });

  it("blocks an expired approval", async () => {
    const { executeWorkflow } = await import("../src/workflow/index.js");
    const { createApproval } = await import("../src/approval/index.js");
    const plan = await proposed();
    await createApproval(plan.plan_id, plan.hash, 1, 1000);
    const run = await executeWorkflow(plan.plan_id, plan.hash);
    expect(run.status).toBe("failed");
    expect(JSON.stringify(run.audit)).toContain("expired");
  });

  it("blocks replay of a destructive step under deny policy", async () => {
    const { runSavedWorkflow } = await import("../src/workflow/index.js");
    const wf = {
      workflow_id: "wf-destructive", version: 1, intent: "x", params: {}, capabilities_required: [], preconditions: [],
      steps: [{ id: "s1", action: "cli.run", args: { argv: ["node", "--version"] }, _effect: "destructive" }],
      verification: [{ id: "v1", kind: "exit_code" }],
    } as unknown as Workflow;
    await saveWorkflowFile("destructive", wf);
    const run = await runSavedWorkflow("destructive");
    expect(run.status).toBe("failed");
    expect(JSON.stringify(run.audit)).toContain("EFFECT_NEEDS_APPROVAL");
  });

  it("rejects unknown checks and assert-only steps at proposal", async () => {
    const { proposeWorkflow } = await import("../src/workflow/index.js");
    const unknownCheck = await proposeWorkflow("x", steps, [{ id: "v1", kind: "not_a_real_check" }]);
    expect(JSON.stringify(unknownCheck)).toContain("Unsupported check kind");
    const assertStep = await proposeWorkflow("x", [{ id: "s1", action: "assert.anything" }], checks);
    expect(JSON.stringify(assertStep)).toContain("not in menu");
  });

  it("fails replay when the independent check drifts", async () => {
    const { proposeWorkflow, executeWorkflow, verifyOutcome, saveWorkflow, runSavedWorkflow } = await import("../src/workflow/index.js");
    const { createApproval } = await import("../src/approval/index.js");
    const plan = await proposeWorkflow("drift", steps, [{ id: "v1", kind: "file_contains", params: { path: dataFile, value: "Ship demo" } }]);
    if (!("plan_id" in plan)) throw new Error("propose failed");
    await createApproval(plan.plan_id, plan.hash);
    expect((await executeWorkflow(plan.plan_id, plan.hash)).status).toBe("passed");
    expect((await verifyOutcome(plan.plan_id)).verdict).toBe("pass");
    const saved = await saveWorkflow(plan.plan_id, "drift-check", "x");
    expect(saved.ok).toBe(true);
    await writeFile(dataFile, JSON.stringify({ tasks: [{ title: "Different", done: true }] }), "utf8");
    const replay = await runSavedWorkflow("drift-check");
    expect(replay.status).toBe("failed");
    expect(replay.failedStep).toBe("verification");
  });

  it("blocks arbitrary node eval flags at execution", async () => {
    const { proposeWorkflow, executeWorkflow } = await import("../src/workflow/index.js");
    const { createApproval } = await import("../src/approval/index.js");
    const plan = await proposeWorkflow("eval", [
      { id: "s1", action: "cli.run", args: { argv: ["node", "-e", "console.log('owned')"] } },
    ], checks);
    if (!("plan_id" in plan)) throw new Error("propose failed");
    await createApproval(plan.plan_id, plan.hash);
    const run = await executeWorkflow(plan.plan_id, plan.hash);
    expect(run.status).toBe("failed");
    expect(JSON.stringify(run.audit)).toContain("denied");
  });

  it("does not rebind a saved menu id to a newly inspected target", async () => {
    const { runSavedWorkflow } = await import("../src/workflow/index.js");
    const wf = {
      workflow_id: "wf-rebind", version: 1, intent: "x", params: {}, capabilities_required: [], preconditions: [],
      steps: [{ id: "s1", action: "a1", _invoke: { argv: ["node", "--version"] }, _kind: "cli_command" }],
      verification: [{ id: "v1", kind: "exit_code" }],
    } as unknown as Workflow;
    await saveWorkflowFile("rebind", wf);
    registerMenuItems([{ id: "a1", kind: "cli_command", label: "evil", invoke: { argv: ["node", "-e", "console.log('REBOUND')"] }, inputs: [], effect: "write", reversible: "no", evidenceRef: "test" }]);
    const run = await runSavedWorkflow("rebind");
    expect(run.status).toBe("passed");
    expect(JSON.stringify(run.audit)).toContain("v24");
    expect(JSON.stringify(run.audit)).not.toContain("REBOUND");
  });
});
