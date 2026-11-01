import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as discovery from "./discovery/index.js";
import * as workflow from "./workflow/index.js";
import { makeError, ErrorCodes } from "./util/errors.js";

export function createServer(): McpServer {
  const server = new McpServer(
    { name: "anybridge", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  // Tool annotations: readOnly/destructive
  server.registerTool(
    "discover_capabilities",
    {
      description:
        "List what AnyBridge can reach on this machine: allowed CLI tools, allowed web origins, saved workflows. Call this first. Read-only.",
      inputSchema: z.object({ query: z.string().optional() }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const res = await discovery.discoverCapabilities(args.query);
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    },
  );

  server.registerTool(
    "inspect_interface",
    {
      description:
        "Open ONE target from discover_capabilities and return a numbered menu of actions with inputs and effect (read/write/destructive). Use `follow` with a nav id to open another page. Read-only.",
      inputSchema: z.object({
        target: z.string(),
        follow: z.string().optional(),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const res = await discovery.inspectInterface(args.target, args.follow);
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    },
  );

  server.registerTool(
    "propose_workflow",
    {
      description:
        "Submit a plan. Does NOT run it. Each step: {id, action: <menu id>, args, expect}. Each check says how to prove success. Returns plan_id, hash, risk summary, or fixable errors.",
      inputSchema: z.object({
        intent: z.string(),
        steps: z.array(
          z.object({
            id: z.string(),
            action: z.string(),
            args: z.record(z.string(), z.unknown()).optional(),
            expect: z.string().optional(),
            effect: z.string().optional(),
          }),
        ),
        checks: z.array(
          z.object({
            id: z.string(),
            kind: z.string(),
            params: z.record(z.string(), z.unknown()).optional(),
          }),
        ),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      const res = await workflow.proposeWorkflow(args.intent, args.steps as any, args.checks as any);
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    },
  );

  server.registerTool(
    "execute_workflow",
    {
      description:
        "Run a plan the user approved. Stops at the first failed step. Requires approved_hash from the user's yes.",
      inputSchema: z.object({
        plan_id: z.string(),
        approved_hash: z.string(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async (args) => {
      const res = await workflow.executeWorkflow(args.plan_id, args.approved_hash);
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    },
  );

  server.registerTool(
    "verify_outcome",
    {
      description:
        "Run the independent checks. Returns pass, fail or inconclusive with evidence. Only this result counts as success.",
      inputSchema: z.object({ plan_id: z.string() }),
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async (args) => {
      const res = await workflow.verifyOutcome(args.plan_id);
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    },
  );

  server.registerTool(
    "save_workflow",
    {
      description:
        "Store a verified plan for reuse. Fails unless verify_outcome passed.",
      inputSchema: z.object({
        plan_id: z.string(),
        name: z.string(),
        description: z.string(),
        params: z
          .array(z.object({ name: z.string(), type: z.string(), example: z.unknown() }))
          .optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (args) => {
      const res = await workflow.saveWorkflow(args.plan_id, args.name, args.description, args.params as any);
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    },
  );

  server.registerTool(
    "run_saved_workflow",
    {
      description: "Replay a saved workflow with new parameter values. No planning needed.",
      inputSchema: z.object({
        name: z.string(),
        params: z.record(z.string(), z.unknown()).optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    async (args) => {
      const res = await workflow.runSavedWorkflow(args.name, args.params as any);
      return { content: [{ type: "text", text: JSON.stringify(res) }] };
    },
  );

  return server;
}

export async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // log to stderr only
  console.error("anybridge mcp server started");
  // keep process alive for stdio transport
  process.stdin.resume();
  await new Promise(() => {});
}

// Only run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
