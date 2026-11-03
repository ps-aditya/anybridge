import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Workflow } from "../types.js";

function storeDir(): string {
  return process.env.ANYBRIDGE_STORE_DIR || path.join(process.cwd(), ".anybridge", "workflows");
}
const NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export class WorkflowIntegrityError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "WorkflowIntegrityError";
  }
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(storeDir(), { recursive: true });
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeHash(wf: Workflow): string {
  return crypto.createHash("sha256").update(canonical(wf)).digest("hex").slice(0, 32);
}

export function assertWorkflowName(name: string): void {
  if (!NAME.test(name) || name.includes("..")) {
    throw new WorkflowIntegrityError("INVALID_INPUT", "invalid workflow name");
  }
}

export async function listWorkflows(): Promise<string[]> {
  await ensureDir();
  const files = await fs.readdir(storeDir());
  return files
    .filter((f) => f.endsWith(".json") && !/\.v\d+\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ""));
}

export async function loadWorkflow(name: string): Promise<Workflow | null> {
  assertWorkflowName(name);
  await ensureDir();
  const fp = path.join(storeDir(), `${name}.json`);
  let parsed: { schema_version?: number; hash?: string; workflow?: Workflow };
  try {
    parsed = JSON.parse(await fs.readFile(fp, "utf8"));
  } catch (error) {
    if (error && (error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (!parsed.workflow || !parsed.hash) {
    throw new WorkflowIntegrityError("HASH_MISMATCH", "workflow is not hash-pinned");
  }
  const actual = computeHash(parsed.workflow);
  if (actual !== parsed.hash) {
    throw new WorkflowIntegrityError("HASH_MISMATCH", "workflow hash does not match its contents");
  }
  return parsed.workflow;
}

export async function saveWorkflowFile(name: string, wf: Workflow): Promise<Workflow> {
  assertWorkflowName(name);
  await ensureDir();
  const fp = path.join(storeDir(), `${name}.json`);
  let existing: { hash?: string; workflow?: Workflow } | null = null;
  try {
    existing = JSON.parse(await fs.readFile(fp, "utf8"));
  } catch (error) {
    if (!error || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (existing?.workflow && existing.hash) {
    const existingHash = computeHash(existing.workflow);
    if (existingHash !== existing.hash) {
      throw new WorkflowIntegrityError("HASH_MISMATCH", "refusing to overwrite a tampered workflow");
    }
    if (existingHash !== computeHash(wf)) {
      const previous = path.join(storeDir(), `${name}.v${existing.workflow.version}.json`);
      await fs.writeFile(previous, JSON.stringify(existing, null, 2), "utf8");
      wf.version = existing.workflow.version + 1;
    }
  }
  const envelope = {
    schema_version: 1,
    name,
    hash: computeHash(wf),
    saved_at: new Date().toISOString(),
    workflow: wf,
  };
  const tmp = `${fp}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(envelope, null, 2), "utf8");
  await fs.rename(tmp, fp);
  return wf;
}

export { storeDir };
