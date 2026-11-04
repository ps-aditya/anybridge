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

// Normalize audio to -16 LUFS (two-pass approximation using first-pass values).
const tmpOut = `${outFile}.tmp.mp4`;
const ffmpeg = "C:\\Users\\Admin\\MCP\\tools\\ffmpeg-9.0.2-essentials_build\\bin\\ffmpeg.exe";
const measure = await new Promise((resolve, reject) => {
  let stderr = "";
  const p = spawn(ffmpeg, ["-i", outFile, "-af", "loudnorm=print_format=json", "-f", "null", "-"], {
    stdio: ["ignore", "ignore", "pipe"],
    shell: false,
  });
  p.stderr.on("data", (d) => (stderr += d));
  p.on("close", (code) => (code === 0 ? resolve(stderr) : reject(new Error(`loudnorm measure exited ${code}`))));
});
const parsed = JSON.parse(measure.match(/\{[\s\S]*\}/)?.[0] || "{}");
const normArgs = [
  "-i", outFile,
  "-af",
  `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${parsed.input_i}:measured_TP=${parsed.input_tp}:measured_LRA=${parsed.input_lra}:measured_thresh=${parsed.input_thresh}:offset=${parsed.target_offset}`,
  "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-y", tmpOut,
];
await new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, normArgs, { stdio: ["ignore", "inherit", "inherit"], shell: false });
  p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`loudnorm apply exited ${code}`))));
});
const fs = await import("node:fs/promises");
await fs.rename(tmpOut, outFile);

console.log(`Rendered and normalized ${outFile}`);
