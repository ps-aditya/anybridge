import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const facts = JSON.parse(await readFile("video/facts.json", "utf8"));
const narr = JSON.parse(await readFile("video/narration.json", "utf8"));
const durations = JSON.parse(await readFile("video/audio/durations.json", "utf8"));

let errors = [];
let warnings = [];

// 1. Mock watermark rule
if (facts.mock) {
  errors.push("facts.json is mock: true. Release builds must use real data.");
}

// 2. Every number in narration must exist in facts (basic check)
const factText = JSON.stringify(facts);
for (const scene of narr.scenes) {
  const nums = scene.text.match(/\d+(?:\.\d+)?/g) || [];
  for (const n of nums) {
    if (!factText.includes(n) && n !== "10") {
      warnings.push(`Scene ${scene.id} mentions ${n}, which may not appear in facts.json`);
    }
  }
}

// 3. Duration check
const totalSeconds = durations.reduce((a, d) => a + d.duration + 0.15, 0);
if (totalSeconds > 170) {
  errors.push(`Total duration ${totalSeconds.toFixed(1)}s exceeds 170s hard max for 2:50.`);
}
if (totalSeconds > 140) {
  warnings.push(`Total duration ${totalSeconds.toFixed(1)}s is over 2:20 target.`);
}

// 4. Required output
if (!existsSync("dist/anybridge-demo.mp4")) {
  errors.push("dist/anybridge-demo.mp4 not found. Render first.");
}

// 5. Narration locked for release
if (narr.version !== "locked") {
  warnings.push("narration.json is not locked; release render will be refused.");
}

// 6. Limits present
if (!Array.isArray(facts.limits) || facts.limits.length === 0) {
  warnings.push("No limits listed in facts.json.");
}

console.log("QA results");
console.log("==========");
console.log(`Total duration: ${totalSeconds.toFixed(2)}s`);
console.log(`Mock: ${facts.mock}`);
console.log(`Narration locked: ${narr.version === "locked"}`);
console.log(`Output exists: ${existsSync("dist/anybridge-demo.mp4")}`);
console.log(`Limits: ${facts.limits?.length ?? 0}`);

if (warnings.length) {
  console.log("\nWarnings:");
  warnings.forEach((w) => console.log(` - ${w}`));
}

if (errors.length) {
  console.log("\nErrors:");
  errors.forEach((e) => console.log(` - ${e}`));
  process.exit(1);
}

console.log("\nQA passed.");
