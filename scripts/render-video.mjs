import { readFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const release = process.argv.includes("--release");
const facts = JSON.parse(await readFile("video/facts.json", "utf8"));

if (facts.mock && release) {
  console.error("Refusing release render: facts.json has mock: true.");
  console.error("Capture real footage and regenerate facts.json first.");
  process.exit(1);
}

if (release) {
  const narr = JSON.parse(await readFile("video/narration.json", "utf8"));
  if (narr.version !== "locked") {
    console.error("Refusing release render: narration.json version is not 'locked'.");
    process.exit(1);
  }
}

const outDir = path.resolve("dist");
const outFile = path.join(outDir, "anybridge-demo.mp4");
await mkdir(outDir, { recursive: true });

const args = [
  "remotion",
  "render",
  "src/index.tsx",
  "AnyBridgeDemo",
  path.relative("video", outFile),
  "--props",
  "props.json",
  "--log",
  "warn",
];

if (release) {
  args.push("--concurrency", "4");
}

console.log(`Rendering to ${outFile} (release=${release})`);
const isWin = process.platform === "win32";
const cmd = isWin ? "cmd.exe" : "npx";
const spawnArgs = isWin ? ["/c", "npx", ...args] : args;
const proc = spawn(cmd, spawnArgs, {
  stdio: ["ignore", "inherit", "inherit"],
  cwd: path.resolve("video"),
  shell: false,
});

await new Promise((resolve, reject) => {
  proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`render exited ${code}`))));
});

console.log(`Rendered ${outFile}`);
