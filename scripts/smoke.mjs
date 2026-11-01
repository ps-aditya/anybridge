import { proposeWorkflow, executeWorkflow, verifyOutcome, saveWorkflow, runSavedWorkflow } from "../dist/workflow/index.js";

const p = await proposeWorkflow("check node version", [
  { id: "s1", action: "cli.run", args: { argv: ["node", "--version"] }, expect: "exit 0" }
], [ { id: "v1", kind: "exit_code" } ]);
console.log("PROPOSE", p);
const e = await executeWorkflow(p.plan_id, p.hash);
console.log("EXEC", e.status);
const v = await verifyOutcome(p.plan_id);
console.log("VERIFY", v.verdict);
const s = await saveWorkflow(p.plan_id, "check-node-version-2", "desc", []);
console.log("SAVE", s);
const r = await runSavedWorkflow("check-node-version-2", {});
console.log("RUN", r.status);
