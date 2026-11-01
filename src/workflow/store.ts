import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Workflow } from "../types.js";

const STORE_DIR = process.env.ANYBRIDGE_STORE_DIR || path.join(process.cwd(), ".anybridge", "workflows");

async function ensureDir(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

function hashWorkflow(wf: Workflow): string {
  const canonical = JSON.stringify(wf, Object.keys(wf).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

export function computeHash(wf: Workflow): string {
  return hashWorkflow(wf);
}

export async function listWorkflows(): Promise<string[]> {
  await ensureDir();
  const files = await fs.readdir(STORE_DIR);
  return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
}

export async function loadWorkflow(name: string): Promise<Workflow | null> {
  await ensureDir();
  const fp = path.join(STORE_DIR, `${name}.json`);
  try {
    const raw = await fs.readFile(fp, "utf8");
    return JSON.parse(raw) as Workflow;
  } catch {
    return null;
  }
}

export async function saveWorkflowFile(name: string, wf: Workflow): Promise<void> {
  await ensureDir();
  const fp = path.join(STORE_DIR, `${name}.json`);
  await fs.writeFile(fp, JSON.stringify(wf, null, 2), "utf8");
}

export { STORE_DIR, hashWorkflow };
