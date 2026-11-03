import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Workflow } from "../src/types.js";

let state: string;

function wf(): Workflow {
  return {
    workflow_id: "wf_test",
    version: 1,
    intent: "test",
    params: {},
    capabilities_required: [],
    preconditions: [],
    steps: [],
    verification: [],
  };
}

beforeEach(async () => {
  state = await mkdtemp(join(tmpdir(), "ab-approval-"));
  process.env.ANYBRIDGE_STATE_DIR = state;
});

describe("out-of-band approval", () => {
  it("stores and reloads a plan", async () => {
    const { savePlan, loadPlan } = await import("../src/approval/index.js");
    await savePlan("plan_abcdef123456", "hash1", wf());
    const loaded = await loadPlan("plan_abcdef123456");
    expect(loaded?.hash).toBe("hash1");
    expect(loaded?.workflow.intent).toBe("test");
  });

  it("consumes an approval exactly once", async () => {
    const { createApproval, consumeApproval } = await import("../src/approval/index.js");
    await createApproval("plan_abcdef123456", "hash1", 1000, 60_000);
    const first = await consumeApproval("plan_abcdef123456", "hash1", 2000);
    expect(first.hash).toBe("hash1");
    await expect(consumeApproval("plan_abcdef123456", "hash1", 3000)).rejects.toThrow(/already consumed|no approval/);
  });

  it("rejects wrong hashes and expired approvals", async () => {
    const { createApproval, consumeApproval } = await import("../src/approval/index.js");
    await createApproval("plan_abcdef123456", "hash1", 1000, 60_000);
    await expect(consumeApproval("plan_abcdef123456", "wrong", 2000)).rejects.toThrow(/hash/i);
    await expect(consumeApproval("plan_abcdef123456", "hash1", 70_000)).rejects.toThrow(/expired/);
  });

  it("refuses execution without a human-created approval", async () => {
    const { proposeWorkflow, executeWorkflow } = await import("../src/workflow/index.js");
    const plan = await proposeWorkflow("version", [
      { id: "s1", action: "cli.run", args: { argv: ["node", "--version"] }, expect: "exit 0" },
    ], [{ id: "v1", kind: "exit_code" }]);
    expect("plan_id" in plan).toBe(true);
    if (!("plan_id" in plan)) return;
    const run = await executeWorkflow(plan.plan_id, plan.hash);
    expect(run.status).toBe("failed");
    expect(JSON.stringify(run.audit)).toContain("UNAPPROVED");
  });

  it("executes after approval and verifies the result", async () => {
    const { proposeWorkflow, executeWorkflow, verifyOutcome } = await import("../src/workflow/index.js");
    const { createApproval } = await import("../src/approval/index.js");
    const plan = await proposeWorkflow("version", [
      { id: "s1", action: "cli.run", args: { argv: ["node", "--version"] }, expect: "exit 0" },
    ], [{ id: "v1", kind: "exit_code" }]);
    if (!("plan_id" in plan)) throw new Error("propose failed");
    await createApproval(plan.plan_id, plan.hash);
    const run = await executeWorkflow(plan.plan_id, plan.hash);
    expect(run.status).toBe("passed");
    const verify = await verifyOutcome(plan.plan_id);
    expect(verify.verdict).toBe("pass");
  });
});
