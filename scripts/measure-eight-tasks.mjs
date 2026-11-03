import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectInterface } from "../dist/discovery/index.js";
import { proposeWorkflow, executeWorkflow, verifyOutcome, saveWorkflow, runSavedWorkflow } from "../dist/workflow/index.js";
import { createApproval } from "../dist/approval/index.js";
import { closeBrowser } from "../dist/execution/executor.js";

const base = "http://127.0.0.1:4010";
process.env.ANYBRIDGE_STATE_DIR = await mkdtemp(join(tmpdir(), "ab-eight-state-"));
process.env.ANYBRIDGE_STORE_DIR = await mkdtemp(join(tmpdir(), "ab-eight-store-"));

const plans = JSON.parse(await readFile("results/eight-task-plans.json", "utf8"));
const intents = [
  "Add task Ship demo",
  "Add task Measure replay",
  "Mark Review fixture spec done",
  "Unmark Connect MCP client",
  "Read the Notes page",
  "Report Node version",
  "Report Git version",
  "Mark Record rough demo done",
];
const browserTasks = new Set([1, 2, 3, 4, 5, 8]);
const results = [];

const reset = () => fetch(`${base}/reset`, { method: "POST" });

for (const plan of plans) {
  const row = { task: plan.task, intent: intents[plan.task - 1], plan: false, execute: "not-run", verify: "not-run", replay: "not-run", replayVerify: "not-run", planId: null, error: null, executeMs: null, replayMs: null };
  try {
    await reset();
    if (browserTasks.has(plan.task)) {
      const menu = await inspectInterface(`browser:${base}`);
      if (!("items" in menu)) throw new Error(`inspect failed: ${JSON.stringify(menu)}`);
    }
    const proposed = await proposeWorkflow(row.intent, plan.steps, plan.checks);
    if (!("plan_id" in proposed)) throw new Error(`propose failed: ${JSON.stringify(proposed)}`);
    row.plan = true;
    row.planId = proposed.plan_id;
    await createApproval(proposed.plan_id, proposed.hash);
    const t0 = Date.now();
    const run = await executeWorkflow(proposed.plan_id, proposed.hash);
    row.executeMs = Date.now() - t0;
    row.execute = run.status;
    const verify = await verifyOutcome(proposed.plan_id);
    row.verify = verify.verdict;
    const saved = await saveWorkflow(proposed.plan_id, `task-${plan.task}`, row.intent);
    if (!saved.ok) throw new Error(`save failed: ${JSON.stringify(saved)}`);
    await reset();
    const t1 = Date.now();
    const replay = await runSavedWorkflow(`task-${plan.task}`);
    row.replayMs = Date.now() - t1;
    row.replay = replay.status;
    row.replayVerify = replay.verification?.verdict || "missing";
  } catch (error) {
    row.error = error instanceof Error ? error.message : String(error);
  }
  results.push(row);
  console.log(`${row.task} plan=${row.plan} run=${row.execute} verify=${row.verify} replay=${row.replay} replayVerify=${row.replayVerify} ${row.error || ""}`);
  await closeBrowser();
}

const passed = results.filter((r) => r.plan && r.execute === "passed" && r.verify === "pass" && r.replay === "passed" && r.replayVerify === "pass").length;
const summary = { date: new Date().toISOString(), model: "opencode-go/muse-spark-1.3-contributor", route: "planner via OpenCode Go; engine local", aggregate: { passed, total: results.length }, results };
await writeFile("results/eight-task-results.json", JSON.stringify(summary, null, 2));
const md = ["| # | Task | Plan | Execute | Verify | Replay | Replay verify | Execute ms | Replay ms |", "|---|---|---|---|---|---|---|---:|---:|", ...results.map((r) => `| ${r.task} | ${r.intent} | ${r.plan} | ${r.execute} | ${r.verify} | ${r.replay} | ${r.replayVerify} | ${r.executeMs ?? "—"} | ${r.replayMs ?? "—"} |`)].join("\n");
await writeFile("results/eight-task-results.md", `# Eight measured tasks\n\n${md}\n\nPassed: ${passed}/${results.length}. Token/cost not captured on the OpenCode Go subagent route.\n`);
console.log(`PASSED ${passed}/${results.length}`);
if (passed !== results.length) process.exitCode = 1;
