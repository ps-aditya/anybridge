import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { proposeWorkflow, executeWorkflow, verifyOutcome } from "../dist/workflow/index.js";

process.env.ANYBRIDGE_STATE_DIR = await mkdtemp(join(tmpdir(), "ab-smoke-approval-"));

const plan = await proposeWorkflow("report node version", [
  { id: "s1", action: "cli.run", args: { argv: ["node", "--version"] }, expect: "exit 0" },
], [{ id: "v1", kind: "exit_code" }]);
if (!("plan_id" in plan)) throw new Error(`propose failed: ${JSON.stringify(plan)}`);

const child = spawn(process.execPath, ["dist/index.js", "approve", plan.plan_id], {
  cwd: process.cwd(),
  stdio: ["pipe", "pipe", "pipe"],
});
let stdout = "";
let stderr = "";
child.stdout.on("data", (d) => { stdout += d; });
child.stderr.on("data", (d) => { stderr += d; });
child.stdin.write("yes\n");
child.stdin.end();
const code = await new Promise((resolve) => child.on("close", resolve));
if (code !== 0) throw new Error(`approve failed (${code}): ${stderr}`);
console.log(stdout.trim());

const run = await executeWorkflow(plan.plan_id, plan.hash);
const verify = await verifyOutcome(plan.plan_id);
console.log(JSON.stringify({ plan: plan.plan_id, run: run.status, verify: verify.verdict }));
if (run.status !== "passed" || verify.verdict !== "pass") process.exitCode = 1;
