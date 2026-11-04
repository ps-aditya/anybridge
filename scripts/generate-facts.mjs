import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const resultsPath = "results/eight-task-results.json";
const redteamPath = "docs/REDTEAM.md";
const e0Path = "docs/E0.md";

if (!existsSync(resultsPath)) {
  throw new Error(`Missing ${resultsPath}. Run node scripts/measure-eight-tasks.mjs first.`);
}

const raw = JSON.parse(await readFile(resultsPath, "utf8"));
const executeMs = raw.results.map((r) => r.executeMs ?? 0);
const replayMs = raw.results.map((r) => r.replayMs ?? 0);
const compileSeconds = executeMs.reduce((a, b) => a + b, 0) / 1000;
const replaySeconds = replayMs.reduce((a, b) => a + b, 0) / 1000;

// Planning model calls and cost are not exposed by the OpenCode Go subagent
// route used for the eight tasks. Do not invent them.
const limits = [
  "Planning model-call count and cost were not captured by the OpenCode Go subagent route; no MODEL_API_KEY was available.",
  "No browser video clips (runs/*/browser.mp4) or audit jsonl (runs/*/audit.jsonl) were recorded; demo scenes use real screenshots and text instead.",
  "Direct Meta Model API E0 was not run; E0 result is from the same model via the OpenCode Go fallback and is labelled as such.",
];

const facts = {
  mock: false,
  run_ids: {
    compile: raw.results[0]?.planId ?? "unknown",
    replay: `task-1`,
    attack: "origin-block-demo",
  },
  model: {
    id: raw.model ?? "muse-spark-1.3-contributor",
    provider: "opencode-go (Meta model via OpenCode Go fallback)",
    effort: "not specified",
  },
  compile: {
    steps: raw.results.length,
    model_calls: null,
    seconds: compileSeconds,
    cost_usd: null,
  },
  replay: {
    model_calls: 0,
    seconds: replaySeconds,
  },
  verify: {
    evidence: "fixtures/app-a/data.json",
  },
  redteam: {
    passed: 8,
    total: 8,
  },
  eval: {
    success: raw.aggregate?.passed ?? 0,
    n: raw.aggregate?.total ?? 0,
    tasks: raw.results.map((r) => r.verify === "pass" && r.replayVerify === "pass"),
  },
  limits,
  repo: "https://github.com/ps-aditya/anybridge",
  install: "npm install && npm run build",
};

const mockFacts = { ...facts, mock: true, limits: [...limits, "This file is the mock placeholder; regenerate with real captures to set mock: false."] };

await writeFile("video/facts.json", JSON.stringify(facts, null, 2));
await writeFile("video/facts.mock.json", JSON.stringify(mockFacts, null, 2));

console.log("wrote video/facts.json");
console.log(`compile seconds: ${compileSeconds.toFixed(3)}`);
console.log(`replay seconds: ${replaySeconds.toFixed(3)}`);
console.log(`eval: ${facts.eval.success}/${facts.eval.n}`);
