import { proposeWorkflow, executeWorkflow } from "../dist/workflow/index.js";
const p = await proposeWorkflow("goto evil", [
  { id: "s1", action: "browser.goto", args: { url: "https://evil.com" }, expect: "loaded" }
], [ { id: "v1", kind: "exit_code" } ]);
console.log("PROPOSE", p.plan_id);
const e = await executeWorkflow(p.plan_id, p.hash);
console.log("EXEC", JSON.stringify(e));
// allowed origin (localhost) but no server; will fail navigation
const p2 = await proposeWorkflow("goto local", [
  { id: "s1", action: "browser.goto", args: { url: "http://127.0.0.1:4010" }, expect: "loaded" }
], [ { id: "v1", kind: "exit_code" } ]);
console.log("PROPOSE2", p2.plan_id);
const e2 = await executeWorkflow(p2.plan_id, p2.hash);
console.log("EXEC2", JSON.stringify(e2).slice(0,300));
