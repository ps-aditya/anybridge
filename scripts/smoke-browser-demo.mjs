import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inspectInterface } from "../dist/discovery/index.js";
import { proposeWorkflow, executeWorkflow, verifyOutcome, saveWorkflow, runSavedWorkflow } from "../dist/workflow/index.js";
import { closeBrowser } from "../dist/execution/executor.js";

process.env.ANYBRIDGE_STATE_DIR = await mkdtemp(join(tmpdir(), "ab-demo-"));
await fetch("http://127.0.0.1:4010/reset", { method: "POST" });

const menu = await inspectInterface("browser:http://127.0.0.1:4010");
if (!("items" in menu)) throw new Error(`inspect failed: ${JSON.stringify(menu)}`);
const page = menu.items.find((i) => i.label.startsWith("page \""));
const input = menu.items.find((i) => i.label.includes("New task"));
const add = menu.items.find((i) => i.label === 'button "Add"');
if (!page || !input || !add) throw new Error(`menu missing page/input/add: ${JSON.stringify(menu.items.map((i) => i.label))}`);

const dataFile = resolve("fixtures/app-a/data.json");
const plan = await proposeWorkflow("Add Ship demo to the task list", [
  { id: "s0", action: page.id, expect: "opened" },
  { id: "s1", action: input.id, args: { value: "Ship demo" }, expect: "filled" },
  { id: "s2", action: add.id, expect: "added" },
], [{ id: "v1", kind: "file_contains", params: { path: dataFile, value: "Ship demo" } }]);
if (!("plan_id" in plan)) throw new Error(`propose failed: ${JSON.stringify(plan)}`);

const child = spawn(process.execPath, ["dist/index.js", "approve", plan.plan_id], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });
let out = "";
child.stdout.on("data", (d) => { out += d; });
child.stderr.on("data", (d) => { out += d; });
child.stdin.write("yes\n");
child.stdin.end();
const code = await new Promise((r) => child.on("close", r));
if (code !== 0) throw new Error(`approval failed: ${out}`);
console.log(out.split("\n").filter((l) => l.includes("Approved")).join("\n"));

const run = await executeWorkflow(plan.plan_id, plan.hash);
const verify = await verifyOutcome(plan.plan_id);
const saved = await saveWorkflow(plan.plan_id, "add-ship-demo", "Add Ship demo to the task list");
if (!saved.ok) throw new Error(`save failed: ${JSON.stringify(saved)}`);
await fetch("http://127.0.0.1:4010/reset", { method: "POST" });
const replay = await runSavedWorkflow("add-ship-demo");
console.log(JSON.stringify({ menu: { page: page.id, input: input.id, add: add.id }, plan: plan.plan_id, run: run.status, verify: verify.verdict, evidence: verify.evidence, replay: replay.status, replayVerification: replay.verification?.verdict }));
await closeBrowser();
if (run.status !== "passed" || verify.verdict !== "pass" || replay.status !== "passed" || replay.verification?.verdict !== "pass") process.exitCode = 1;
