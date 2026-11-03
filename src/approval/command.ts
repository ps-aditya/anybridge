import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createApproval, loadPlan, APPROVAL_TTL_MS } from "./index.js";

export async function approveCommand(planId: string): Promise<number> {
  const plan = await loadPlan(planId).catch((error: unknown) => {
    console.error(`Cannot read plan ${planId}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  if (!plan) {
    console.error(`Unknown plan: ${planId}`);
    return 1;
  }

  console.log("AnyBridge approval");
  console.log(`Plan:     ${plan.plan_id}`);
  console.log(`Intent:   ${plan.workflow.intent}`);
  console.log(`Hash:     ${plan.hash}`);
  console.log(`Steps:    ${plan.workflow.steps.length}`);
  for (const step of plan.workflow.steps) {
    const resolved = step as unknown as { _effect?: string };
    console.log(`  ${step.id}  ${step.action}  effect=${step.effect || resolved._effect || "unknown"}`);
  }
  console.log(`Checks:   ${plan.workflow.verification.length}`);
  console.log("");

  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question("Type yes to approve this exact plan: ");
  rl.close();
  if (answer.trim() !== "yes") {
    console.log("Not approved.");
    return 1;
  }

  const record = await createApproval(planId, plan.hash);
  console.log(`Approved · single use · expires ${record.expires_at} (${APPROVAL_TTL_MS / 60000}m)`);
  return 0;
}
