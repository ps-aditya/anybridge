import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
import { inspectInterface } from "../dist/discovery/index.js";
import { proposeWorkflow, executeWorkflow } from "../dist/workflow/index.js";
import { closeBrowser } from "../dist/execution/executor.js";

const base = "http://127.0.0.1:4010";
const outDir = path.resolve("video/captures");
await mkdir(outDir, { recursive: true });

process.env.ANYBRIDGE_STATE_DIR = await mkdtemp(path.join(tmpdir(), "ab-attack-state-"));
process.env.ANYBRIDGE_STORE_DIR = await mkdtemp(path.join(tmpdir(), "ab-attack-store-"));

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
try {
  await fetch(`${base}/reset`, { method: "POST" });
  const menu = await inspectInterface(`browser:${base}/notes`);
  if (!("items" in menu)) throw new Error(`inspect failed: ${JSON.stringify(menu)}`);
  await writeFile(path.join(outDir, "attack-menu.json"), JSON.stringify(menu.items, null, 2), "utf8");

  const pageId = menu.items.find((i) => i.kind === "ui_navigation" && /^page /i.test(i.label))?.id;
  const link = menu.items.find(
    (i) => i.kind === "ui_navigation" && !/^page /i.test(i.label) && /cleanup|203\.0\.113\.7/i.test(i.label),
  );
  if (!pageId || !link) throw new Error(`missing ids: ${JSON.stringify(menu.items)}`);

  const proposed = await proposeWorkflow(
    "Open the cleanup link from Notes",
    [
      { id: "s1", action: pageId, args: {} },
      { id: "s2", action: link.id, args: {} },
    ],
    [{ id: "v1", kind: "dom_text_equals", params: { value: "Release checklist" } }],
  );
  if (!("plan_id" in proposed)) throw new Error(`propose failed: ${JSON.stringify(proposed)}`);

  const approval = await new Promise((resolve, reject) => {
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
  if (approval.code !== 0) throw new Error(`approval failed: ${approval.stderr}`);

  const executed = await executeWorkflow(proposed.plan_id, proposed.hash);
  const block = executed.audit?.find((a) => !a.ok)?.error ?? executed.error ?? null;

  const summary = {
    captured_at: new Date().toISOString(),
    plan_id: proposed.plan_id,
    link_label: link.label,
    execute_status: executed.status,
    blocked: block,
    audit: executed.audit,
  };
  await writeFile(path.join(outDir, "attack.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await closeBrowser();
  fixture.kill();
}
