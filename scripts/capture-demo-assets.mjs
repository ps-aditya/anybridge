import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";
import { inspectInterface } from "../dist/discovery/index.js";
import { proposeWorkflow, executeWorkflow, verifyOutcome, saveWorkflow, runSavedWorkflow } from "../dist/workflow/index.js";
import { closeBrowser } from "../dist/execution/executor.js";

const base = "http://127.0.0.1:4010";
const outDir = path.resolve("video/captures");
await mkdir(outDir, { recursive: true });

// Isolated state so this capture does not depend on prior runs.
process.env.ANYBRIDGE_STATE_DIR = await mkdtemp(path.join(tmpdir(), "ab-capture-state-"));
process.env.ANYBRIDGE_STORE_DIR = await mkdtemp(path.join(tmpdir(), "ab-capture-store-"));

const plans = JSON.parse(await readFile("results/eight-task-plans.json", "utf8"));
const task = plans.find((p) => p.task === 1);
if (!task) throw new Error("task 1 plan not found");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: process.cwd(), ...opts });
    let stdout = "";
    let stderr = "";
    p.stdout?.on("data", (d) => (stdout += d));
    p.stderr?.on("data", (d) => (stderr += d));
    p.on("close", (code) => resolve({ code, stdout, stderr }));
    p.on("error", reject);
  });
}

async function startFixture() {
  const p = spawn(process.execPath, ["fixtures/app-a/server.mjs"], { cwd: process.cwd() });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("fixture start timeout")), 10000);
    p.stdout.on("data", (d) => {
      if (String(d).includes("fixture app A")) {
        clearTimeout(timer);
        resolve();
      }
    });
    p.on("exit", (code) => reject(new Error(`fixture exited ${code}`)));
  });
  return p;
}

const fixture = await startFixture();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

try {
  await fetch(`${base}/reset`, { method: "POST" });

  await page.goto(`${base}/tasks`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "tasks-before.png"), fullPage: false });

  await page.goto(`${base}/notes`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "notes.png"), fullPage: false });

  const menu = await inspectInterface(`browser:${base}`);
  if (!("items" in menu)) throw new Error(`inspect failed: ${JSON.stringify(menu)}`);
  const items = menu.items;
  const pageId = items.find((i) => i.kind === "ui_navigation" && /^page /i.test(i.label))?.id;
  const inputId = items.find((i) => i.kind === "ui_input" && /new task/i.test(i.label))?.id;
  const addId = items.find((i) => i.kind === "ui_action" && /button "add"/i.test(i.label))?.id;
  if (!pageId || !inputId || !addId) throw new Error(`menu missing ids: ${JSON.stringify(items)}`);

  const steps = [
    { id: "s1", action: pageId, args: {} },
    { id: "s2", action: inputId, args: { value: "Ship demo" } },
    { id: "s3", action: addId, args: {} },
  ];
  const proposed = await proposeWorkflow("Add task Ship demo", steps, task.checks);
  if (!("plan_id" in proposed)) throw new Error(`propose failed: ${JSON.stringify(proposed)}`);

  // Drive the real approval CLI and feed the human response over stdin.
  const approval2 = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ["dist/index.js", "approve", proposed.plan_id], {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.stdin.write("yes\n");
    p.stdin.end();
    p.on("close", (code) => resolve({ code, stdout, stderr }));
    p.on("error", reject);
  });
  if (approval2.code !== 0) throw new Error(`approval failed: ${approval2.stderr}`);
  await writeFile(path.join(outDir, "approve-output.txt"), approval2.stdout, "utf8");

  const executed = await executeWorkflow(proposed.plan_id, proposed.hash);
  const verified = await verifyOutcome(proposed.plan_id);
  await writeFile(
    path.join(outDir, "verify.json"),
    JSON.stringify({ plan_id: proposed.plan_id, executed, verified }, null, 2),
    "utf8",
  );

  await page.goto(`${base}/tasks`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "tasks-after.png"), fullPage: false });

  const saved = await saveWorkflow(proposed.plan_id, "capture-add-ship-demo", "Add task Ship demo");
  if (!saved.ok) throw new Error(`save failed: ${JSON.stringify(saved)}`);

  await fetch(`${base}/reset`, { method: "POST" });
  const replay = await runSavedWorkflow("capture-add-ship-demo");
  await writeFile(
    path.join(outDir, "replay.json"),
    JSON.stringify({ replay }, null, 2),
    "utf8",
  );

  await page.goto(`${base}/tasks`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "tasks-after-replay.png"), fullPage: false });

  const summary = {
    captured_at: new Date().toISOString(),
    plan_id: proposed.plan_id,
    execute_status: executed.status,
    verify_verdict: verified.verdict,
    replay_status: replay.status,
    replay_verdict: replay.verification?.verdict ?? "missing",
  };
  await writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser.close();
  await closeBrowser();
  fixture.kill();
}
