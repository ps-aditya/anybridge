import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";

describe("workflow store", () => {
  it("save and load", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ab-"));
    process.env.ANYBRIDGE_STORE_DIR = dir;
    const { saveWorkflowFile, loadWorkflow, listWorkflows } = await import("../src/workflow/store.js");
    const wf = { workflow_id: "wf1", version: 1, intent: "x", params: {}, capabilities_required: [], preconditions: [], steps: [], verification: [] } as any;
    await saveWorkflowFile("w1", wf);
    const loaded = await loadWorkflow("w1");
    expect(loaded?.workflow_id).toBe("wf1");
    const list = await listWorkflows();
    expect(list).toContain("w1");
  });
});
