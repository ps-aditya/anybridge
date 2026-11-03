#!/usr/bin/env node

const args = process.argv.slice(2);

if (args[0] === "approve") {
  const planId = args[1];
  if (!planId) {
    console.error("Usage: anybridge approve <plan_id>");
    process.exitCode = 1;
  } else {
    const { approveCommand } = await import("./approval/command.js");
    process.exitCode = await approveCommand(planId);
  }
} else if (args[0] === "--help" || args[0] === "-h") {
  console.log("Usage: anybridge [approve <plan_id>]");
  console.log("No args starts the MCP stdio server.");
} else {
  const { main } = await import("./server.js");
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
