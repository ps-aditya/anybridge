import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setPolicy } from "../src/policy/allowlist.js";

let dir: string;
let dataFile: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ab-verify-"));
  process.env.ANYBRIDGE_STATE_DIR = join(dir, "state");
  dataFile = join(dir, "tasks.json");
  await writeFile(dataFile, JSON.stringify({ tasks: [{ title: "Ship demo", done: true }] }), "utf8");
  setPolicy({ pathJail: dir });
});

async function runPlan(value: string) {
  const { proposeWorkflow, executeWorkflow, verifyOutcome } = await import("../src/workflow/index.js");
  const { createApproval } = await import("../src/approval/index.js");
  const plan = await proposeWorkflow("verify demo", [
    { id: "s1", action: "cli.run", args: { argv: ["node", "--version"] }, expect: "exit 0" },
  ], [{ id: "v1", kind: "file_contains", params: { path: dataFile, value } }]);
  if (!("plan_id" in plan)) throw new Error("propose failed");
  await createApproval(plan.plan_id, plan.hash);
  const run = await executeWorkflow(plan.plan_id, plan.hash);
  const verify = await verifyOutcome(plan.plan_id);
  return { run, verify };
}

describe("independent file verification", () => {
  it("passes by reading the file, not the audit", async () => {
    const { run, verify } = await runPlan("Ship demo");
    expect(run.status).toBe("passed");
    expect(verify.verdict).toBe("pass");
    expect(JSON.stringify(verify.evidence)).toContain("file_contains");
  });

  it("fails when the file does not contain the value", async () => {
    const { verify } = await runPlan("Not present");
    expect(verify.verdict).toBe("fail");
    expect(JSON.stringify(verify.evidence)).toContain("found");
  });
});
