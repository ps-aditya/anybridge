import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  BASE_URL, MODEL, EXPECTED, PRICING,
  toolDefinitions, newContext, runTool, evaluateTrial, sumUsage, computeCost,
} from "./e0-lib.mjs";

const SYSTEM = [
  "You are running AnyBridge experiment E0 against synthetic MCP stubs.",
  "This is a tool-sequencing test. Use exactly five tool calls, one at a time, in this order:",
  "1. discover_capabilities",
  "2. inspect_interface (target: http://127.0.0.1:4010)",
  "3. propose_workflow (one step using menu id a1, one check)",
  "4. execute_workflow (use the returned plan_id and hash)",
  "5. verify_outcome (use the same plan_id)",
  "Call no other tool, never repeat a call, never invent IDs. After the fifth call, stop.",
].join(" ");

const USER = "Run the five-call E0 sequence now.";

function promptHash() {
  return createHash("sha256").update(SYSTEM + "|" + USER).digest("hex").slice(0, 16);
}

function extractUsage(json) {
  const u = json.usage || {};
  return {
    input: u.prompt_tokens || 0,
    output: u.completion_tokens || 0,
    cached: u.prompt_tokens_details?.cached_tokens || 0,
    reasoning: u.completion_tokens_details?.reasoning_tokens || 0,
  };
}

async function runOneTrial(apiKey, trial) {
  const ctx = newContext(trial);
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: USER },
  ];
  const callLog = [];
  const usages = [];
  const t0 = Date.now();
  let modelSeen = MODEL;

  for (let turn = 0; turn < 8; turn++) {
    const body = {
      model: MODEL,
      messages,
      tools: toolDefinitions(),
      tool_choice: "auto",
      reasoning_effort: "high",
      max_completion_tokens: 2048,
    };
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        trial, pass: false, calls: callLog.map((c) => c.name), reason: "transport",
        error: `HTTP ${res.status}: ${text.slice(0, 600)}`,
        durationMs: Date.now() - t0, usage: sumUsage(usages), cost: computeCost(sumUsage(usages)),
        promptHash: promptHash(), model: modelSeen,
      };
    }
    const json = await res.json();
    modelSeen = json.model || modelSeen;
    usages.push(extractUsage(json));
    const message = json.choices?.[0]?.message;
    if (!message) {
      return { trial, pass: false, calls: callLog.map((c) => c.name), reason: "empty message", error: JSON.stringify(json).slice(0, 400), durationMs: Date.now() - t0, usage: sumUsage(usages), cost: computeCost(sumUsage(usages)), promptHash: promptHash(), model: modelSeen };
    }

    const toolCalls = message.tool_calls || [];
    if (toolCalls.length === 0) {
      messages.push({ role: "assistant", content: message.content || "" });
      break;
    }

    messages.push({
      role: "assistant",
      content: message.content || "",
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })),
    });

    for (const tc of toolCalls) {
      let args = {};
      try { args = JSON.parse(tc.function.arguments || "{}"); } catch { args = {}; }
      const r = runTool(tc.function.name, args, ctx);
      const entry = {
        name: tc.function.name,
        args,
        ok: r.ok,
        status: r.result?.status,
        verdict: r.result?.verdict,
      };
      callLog.push(entry);
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(r.result) });
    }
  }

  const durationMs = Date.now() - t0;
  const usage = sumUsage(usages);
  const cost = computeCost(usage);
  const verdict = evaluateTrial(callLog);
  return {
    trial, pass: verdict.pass, calls: verdict.names, reason: verdict.reason,
    durationMs, usage, cost, promptHash: promptHash(), model: modelSeen,
  };
}

function selfcheck() {
  const ctx = newContext(99);
  const goodCalls = [];
  for (const name of EXPECTED) {
    const args = { target: "http://127.0.0.1:4010" };
    if (name === "propose_workflow") args.steps = [{ id: "s1", action: "a1" }], args.checks = [{ id: "v1", kind: "file_contains" }], args.intent = "demo";
    if (name === "execute_workflow") { args.plan_id = ctx.planId; args.approved_hash = ctx.hash; }
    if (name === "verify_outcome") args.plan_id = ctx.planId;
    const r = runTool(name, args, ctx);
    goodCalls.push({ name, ok: r.ok, status: r.result?.status, verdict: r.result?.verdict });
  }
  const good = evaluateTrial(goodCalls);
  const bad = evaluateTrial(goodCalls.slice(0, 4));
  console.log("selfcheck good:", JSON.stringify(good));
  console.log("selfcheck truncated:", JSON.stringify(bad));
  console.log("selfcheck verdicts ->", good.pass === true && bad.pass === false ? "PASS" : "FAIL");
}

async function main() {
  const arg = process.argv[2];
  if (arg === "--selfcheck") { selfcheck(); return; }
  const trials = arg === "--trials" ? Number(process.argv[3] || 10) : 10;
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    console.error("E0 not run: MODEL_API_KEY is not set. Set it, then rerun `node scripts/e0.mjs`.");
    process.exitCode = 2;
    return;
  }
  const results = [];
  for (let i = 1; i <= trials; i++) {
    const r = await runOneTrial(apiKey, i);
    results.push(r);
    console.log(`trial ${String(i).padStart(2)} pass=${r.pass} ${r.pass ? "" : "reason=" + (r.reason || r.error)} ${(r.durationMs / 1000).toFixed(1)}s in=${r.usage.input} out=${r.usage.output} $${r.cost.total.toFixed(4)}`);
  }
  const passed = results.filter((r) => r.pass).length;
  const totalCost = results.reduce((a, r) => a + (r.cost?.total || 0), 0);
  const summary = {
    date: new Date().toISOString(),
    model: MODEL,
    pricing: PRICING,
    trials: results,
    aggregate: { passed, total: results.length, passRate: passed / results.length, totalCost },
    promptHash: results[0]?.promptHash,
  };
  mkdirSync("results", { recursive: true });
  const file = `results/e0-${Date.now()}.json`;
  writeFileSync(file, JSON.stringify(summary, null, 2));
  console.log(`\nAGGREGATE passed=${passed}/${results.length} rate=${(passed / results.length).toFixed(2)} cost=$${totalCost.toFixed(4)}`);
  console.log(`saved ${file}`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
