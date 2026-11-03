import { promises as fs } from "node:fs";
import path from "node:path";
import type { Workflow } from "../types.js";

const PLAN_ID = /^plan_[a-f0-9]{12}$/;
const APPROVAL_TTL_MS = 10 * 60 * 1000;

export class ApprovalError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ApprovalError";
  }
}

export interface StoredPlan {
  plan_id: string;
  hash: string;
  workflow: Workflow;
  created_at: string;
}

export interface ApprovalRecord {
  plan_id: string;
  hash: string;
  created_at: string;
  expires_at: string;
}

function stateDir(): string {
  return process.env.ANYBRIDGE_STATE_DIR || path.join(process.cwd(), ".anybridge");
}

function plansDir(): string {
  return path.join(stateDir(), "plans");
}

function approvalsDir(): string {
  return path.join(stateDir(), "approvals");
}

function assertPlanId(planId: string): void {
  if (!PLAN_ID.test(planId)) throw new ApprovalError("INVALID_INPUT", "invalid plan_id");
}

async function writeAtomic(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export async function savePlan(planId: string, hash: string, workflow: Workflow): Promise<void> {
  assertPlanId(planId);
  const record: StoredPlan = { plan_id: planId, hash, workflow, created_at: new Date().toISOString() };
  await writeAtomic(path.join(plansDir(), `${planId}.json`), record);
}

export async function loadPlan(planId: string): Promise<StoredPlan | null> {
  assertPlanId(planId);
  try {
    const raw = await fs.readFile(path.join(plansDir(), `${planId}.json`), "utf8");
    return JSON.parse(raw) as StoredPlan;
  } catch (error) {
    if (error && (error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function createApproval(planId: string, hash: string, now = Date.now(), ttlMs = APPROVAL_TTL_MS): Promise<ApprovalRecord> {
  assertPlanId(planId);
  const record: ApprovalRecord = {
    plan_id: planId,
    hash,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlMs).toISOString(),
  };
  await writeAtomic(path.join(approvalsDir(), `${planId}.json`), record);
  return record;
}

// Single use: claiming the file is an atomic rename, so only one caller wins.
export async function consumeApproval(planId: string, hash: string, now = Date.now()): Promise<ApprovalRecord> {
  assertPlanId(planId);
  const file = path.join(approvalsDir(), `${planId}.json`);
  let record: ApprovalRecord;
  try {
    record = JSON.parse(await fs.readFile(file, "utf8")) as ApprovalRecord;
  } catch (error) {
    if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ApprovalError("UNAPPROVED", "no approval exists for this plan");
    }
    throw error;
  }
  if (record.hash !== hash) throw new ApprovalError("HASH_MISMATCH", "approval hash does not match the plan");
  if (Date.parse(record.expires_at) <= now) throw new ApprovalError("UNAPPROVED", "approval has expired");
  try {
    await fs.rename(file, `${file}.used`);
  } catch (error) {
    if (error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ApprovalError("UNAPPROVED", "approval was already consumed");
    }
    throw error;
  }
  return record;
}

export { stateDir, APPROVAL_TTL_MS };
