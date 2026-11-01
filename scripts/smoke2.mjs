import { proposeWorkflow, executeWorkflow } from "../dist/workflow/index.js";
const p = await proposeWorkflow("read secret", [
  { id: "s1", action: "fs.read", args: { path: "C:\\Windows\\System32\\drivers\\etc\\hosts" }, expect: "content" }
], [ { id: "v1", kind: "file_exists" } ]);
console.log("PROPOSE", p.plan_id);
const e = await executeWorkflow(p.plan_id, p.hash);
console.log("EXEC", JSON.stringify(e));
// origin not allowed
const p2 = await proposeWorkflow("goto", [
  { id: "s1", action: "browser.goto", args: { url: "https://evil.com" }, expect: "loaded" }
], [ { id: "v1", kind: "exit_code" } ]);
console.log("PROPOSE2", p2);
if (p2.plan_id) {
  const e2 = await executeWorkflow(p2.plan_id, p2.hash);
  console.log("EXEC2", JSON.stringify(e2));
}
// unapproved hash
const p3 = await proposeWorkflow("node", [
  { id: "s1", action: "cli.run", args: { argv: ["node", "--version"] }, expect: "exit 0" }
], [ { id: "v1", kind: "exit_code" } ]);
const bad = await executeWorkflow(p3.plan_id, "wronghash");
console.log("UNAPPROVED", JSON.stringify(bad));
