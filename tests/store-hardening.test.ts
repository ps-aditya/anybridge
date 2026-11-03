import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Workflow } from "../src/types.js";
import { computeHash, loadWorkflow, saveWorkflowFile } from "../src/workflow/store.js";

let dir: string;

function wf(argv: string[] = ["node", "--version"]): Workflow {
  return {
    workflow_id: "wf1",
    version: 1,
    intent: "x",
    params: {},
    capabilities_required: [],
    preconditions: [],
    steps: [{ id: "s1", action: "cli.run", args: { argv } }],
    verification: [{ id: "v1", kind: "exit_code" }],
  };
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ab-store-"));
  process.env.ANYBRIDGE_STORE_DIR = dir;
});

describe("hash-pinned workflow store", () => {
  it("hashes nested step and check semantics", () => {
    const one = wf(["node", "--version"]);
    const two = wf(["node", "--help"]);
    const three = { ...one, verification: [{ id: "v1", kind: "file_exists", params: { path: "x" } }] } as Workflow;
    expect(computeHash(one)).not.toBe(computeHash(two));
    expect(computeHash(one)).not.toBe(computeHash(three));
  });

  it("writes an envelope and verifies the hash on load", async () => {
    await saveWorkflowFile("version-check", wf());
    const raw = JSON.parse(await readFile(join(dir, "version-check.json"), "utf8"));
    expect(raw.schema_version).toBe(1);
    expect(raw.hash).toHaveLength(32);
    expect((await loadWorkflow("version-check"))?.workflow_id).toBe("wf1");
  });

  it("rejects tampered workflow contents", async () => {
    await saveWorkflowFile("tampered", wf());
    const file = join(dir, "tampered.json");
    const raw = JSON.parse(await readFile(file, "utf8"));
    raw.workflow.steps[0].args.argv[1] = "--help";
    await writeFile(file, JSON.stringify(raw), "utf8");
    await expect(loadWorkflow("tampered")).rejects.toThrow(/hash/i);
  });

  it("rejects path traversal in workflow names", async () => {
    await expect(saveWorkflowFile("../escape", wf())).rejects.toThrow(/invalid/i);
    await expect(loadWorkflow("..\\escape")).rejects.toThrow(/invalid/i);
  });

  it("archives an old version when a workflow changes", async () => {
    await saveWorkflowFile("versioned", wf());
    const changed = wf(["node", "--help"]);
    const saved = await saveWorkflowFile("versioned", changed);
    expect(saved.version).toBe(2);
    const files = await readdir(dir);
    expect(files).toContain("versioned.v1.json");
  });
});
