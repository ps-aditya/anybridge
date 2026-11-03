// E0 pure logic: stub tools + trial scoring. No network, no model.
// Imported by scripts/e0.mjs (driver) and tests/e0.test.ts.

export const MODEL = "muse-spark-1.3-contributor";
export const BASE_URL = "https://api.meta.ai/v1";
export const EXPECTED = [
  "discover_capabilities",
  "inspect_interface",
  "propose_workflow",
  "execute_workflow",
  "verify_outcome",
];

export const PRICING = { input: 0.1, cached: 0.002, output: 0.2 }; // USD per 1M tokens

export function toolDefinitions() {
  const fn = (name, description, properties, required) => ({
    type: "function",
    function: {
      name,
      description,
      parameters: { type: "object", properties, required, additionalProperties: false },
    },
  });
  return [
    fn("discover_capabilities", "List reachable capabilities. Call this first.", { query: { type: "string" } }, []),
    fn("inspect_interface", "Open ONE target and return a numbered menu of actions.", { target: { type: "string" }, follow: { type: "string" } }, ["target"]),
    fn("propose_workflow", "Submit a typed plan. Does NOT run it.", {
      intent: { type: "string" },
      steps: { type: "array", items: { type: "object" } },
      checks: { type: "array", items: { type: "object" } },
    }, ["intent", "steps", "checks"]),
    fn("execute_workflow", "Run an approved plan using the returned hash.", { plan_id: { type: "string" }, approved_hash: { type: "string" } }, ["plan_id", "approved_hash"]),
    fn("verify_outcome", "Run independent checks and return evidence.", { plan_id: { type: "string" } }, ["plan_id"]),
  ];
}

export function newContext(trial) {
  return {
    trial,
    planId: `plan_${trial}`,
    hash: `hash_${trial}_e0`,
  };
}

// Returns { ok, result } where result is what the model sees as tool output.
export function runTool(name, args, ctx) {
  switch (name) {
    case "discover_capabilities":
      return {
        ok: true,
        result: { cliTools: ["git", "node"], origins: ["http://127.0.0.1:4010"], workflows: [] },
      };
    case "inspect_interface": {
      const target = String(args.target || "");
      const origin = target.startsWith("browser:") ? target.slice(8) : target;
      if (origin !== "http://127.0.0.1:4010") {
        return { ok: false, result: { error: "ORIGIN_NOT_ALLOWED" } };
      }
      return {
        ok: true,
        result: {
          target,
          items: [{ id: "a1", kind: "ui_action", label: 'button "Add"', effect: "write", inputs: [] }],
          notObserved: [],
        },
      };
    }
    case "propose_workflow":
      return {
        ok: true,
        result: { plan_id: ctx.planId, hash: ctx.hash, risk_summary: "steps=1, write=1, destructive=0" },
      };
    case "execute_workflow": {
      const ok = args.plan_id === ctx.planId && args.approved_hash === ctx.hash;
      return {
        ok,
        result: ok
          ? { plan_id: ctx.planId, status: "passed", audit: [{ step: "s1", ok: true }] }
          : { plan_id: args.plan_id, status: "failed", audit: [{ error: "UNAPPROVED" }] },
      };
    }
    case "verify_outcome":
      return {
        ok: true,
        result: { plan_id: args.plan_id, verdict: "pass", evidence: [{ kind: "file_contains", path: "data/tasks.json", found: true }] },
      };
    default:
      return { ok: false, result: { error: "UNKNOWN_TOOL" } };
  }
}

// callLog: [{ name, args, ok, status, verdict }]
export function evaluateTrial(callLog) {
  const names = callLog.map((c) => c.name);
  const inOrder = names.length === EXPECTED.length && names.every((n, i) => n === EXPECTED[i]);
  const execute = callLog.find((c) => c.name === "execute_workflow");
  const verify = callLog.find((c) => c.name === "verify_outcome");
  const allOk = callLog.every((c) => c.ok !== false);
  const reasons = [];
  if (!inOrder) reasons.push(`order=${names.join(",")}`);
  if (execute && execute.status !== "passed") reasons.push("execute not passed");
  if (verify && verify.verdict !== "pass") reasons.push("verify not pass");
  if (!allOk) reasons.push("a tool returned error");
  const pass = inOrder && allOk && execute?.status === "passed" && verify?.verdict === "pass";
  return { pass, names, reason: reasons.join("; ") || (pass ? "ok" : "missing calls") };
}

export function sumUsage(list) {
  return list.reduce(
    (acc, u) => ({
      input: acc.input + (u.input || 0),
      output: acc.output + (u.output || 0),
      cached: acc.cached + (u.cached || 0),
      reasoning: acc.reasoning + (u.reasoning || 0),
    }),
    { input: 0, output: 0, cached: 0, reasoning: 0 },
  );
}

export function computeCost(usage) {
  const cached = (usage.cached / 1e6) * PRICING.cached;
  const input = ((usage.input - (usage.cached || 0)) / 1e6) * PRICING.input;
  const output = (usage.output / 1e6) * PRICING.output;
  return { cached, input, output, total: cached + input + output };
}
