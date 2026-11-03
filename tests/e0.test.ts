import { describe, it, expect } from "vitest";
import {
  EXPECTED,
  newContext,
  runTool,
  evaluateTrial,
  computeCost,
  sumUsage,
  toolDefinitions,
} from "../scripts/e0-lib.mjs";

describe("E0 stubs and scoring", () => {
  it("exposes five tools in the documented order", () => {
    const tools = toolDefinitions();
    expect(tools.map((t) => t.function.name)).toEqual(EXPECTED);
  });

  it("runs the five-call sequence to a pass", () => {
    const ctx = newContext(1);
    const log = [];
    const call = (name, args) => {
      const r = runTool(name, args, ctx);
      log.push({ name, ok: r.ok, status: r.result?.status, verdict: r.result?.verdict });
      return r.result;
    };
    const discover = call("discover_capabilities", {});
    expect(discover.origins).toContain("http://127.0.0.1:4010");
    const inspect = call("inspect_interface", { target: "http://127.0.0.1:4010" });
    expect(inspect.items[0].id).toBe("a1");
    const plan = call("propose_workflow", { intent: "demo", steps: [{ id: "s1", action: "a1" }], checks: [{ id: "v1", kind: "file_contains" }] });
    expect(plan.plan_id).toBe(ctx.planId);
    const exec = call("execute_workflow", { plan_id: ctx.planId, approved_hash: ctx.hash });
    expect(exec.status).toBe("passed");
    const verify = call("verify_outcome", { plan_id: ctx.planId });
    expect(verify.verdict).toBe("pass");
    expect(evaluateTrial(log).pass).toBe(true);
  });

  it("fails when calls are truncated or reordered", () => {
    const names = EXPECTED.slice(0, 4).map((name) => ({ name, ok: true }));
    expect(evaluateTrial(names).pass).toBe(false);
    const reordered = [...EXPECTED].reverse().map((name) => ({ name, ok: true }));
    expect(evaluateTrial(reordered).pass).toBe(false);
  });

  it("fails when the model supplies a wrong approval hash", () => {
    const ctx = newContext(2);
    const log = [
      { name: "discover_capabilities", ok: true },
      { name: "inspect_interface", ok: true },
      { name: "propose_workflow", ok: true },
      { name: "execute_workflow", ok: false, status: "failed" },
      { name: "verify_outcome", ok: true, verdict: "pass" },
    ];
    expect(evaluateTrial(log).pass).toBe(false);
  });

  it("sums usage and computes Contributor-mode cost", () => {
    const usage = sumUsage([
      { input: 100, output: 200, cached: 0, reasoning: 100 },
      { input: 300, output: 100, cached: 50, reasoning: 50 },
    ]);
    expect(usage).toEqual({ input: 400, output: 300, cached: 50, reasoning: 150 });
    const cost = computeCost(usage);
    expect(cost.input).toBeCloseTo((350 / 1e6) * 0.1, 12);
    expect(cost.cached).toBeCloseTo((50 / 1e6) * 0.002, 12);
    expect(cost.output).toBeCloseTo((300 / 1e6) * 0.2, 12);
  });
});
