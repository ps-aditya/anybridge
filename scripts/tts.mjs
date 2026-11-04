import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const pyScript = `
import json
import sys
import os
from kokoro_onnx import Kokoro
import soundfile as sf

with open(sys.argv[1], "r", encoding="utf-8") as f:
    narr = json.load(f)

kokoro = Kokoro(sys.argv[2], sys.argv[3])
out_dir = sys.argv[4]
os.makedirs(out_dir, exist_ok=True)

durations = []
for scene in narr["scenes"]:
    wav = os.path.join(out_dir, f"{scene['id']}.wav")
    samples, sr = kokoro.create(scene["text"], voice=narr["voice"], speed=narr.get("speed", 1.0), lang=narr.get("lang", "en-us"))
    sf.write(wav, samples, sr)
    dur = len(samples) / sr
    durations.append({"id": scene["id"], "duration": round(dur, 3), "samples": len(samples), "sr": sr})
    print(f"{scene['id']}: {dur:.3f}s -> {wav}", file=sys.stderr)

with open(os.path.join(out_dir, "durations.json"), "w", encoding="utf-8") as f:
    json.dump(durations, f, indent=2)
`;

async function main() {
  const args = process.argv.slice(2);
  const release = args.includes("--release");
  const narrPath = "video/narration.json";
  const outDir = "video/audio";
  const modelPath = ".venv/kokoro-v1.0.onnx";
  const voicesPath = ".venv/voices-v1.0.bin";

  if (!existsSync(modelPath) || !existsSync(voicesPath)) {
    console.error(`Missing Kokoro model files at ${modelPath} or ${voicesPath}`);
    process.exit(1);
  }

  const narr = JSON.parse(await readFile(narrPath, "utf8"));
  if (narr.version !== "locked" && release) {
    console.error("Refusing release build: narration.json version is not 'locked'.");
    process.exit(1);
  }

  const tmpPy = path.join(process.cwd(), "scripts", "tts-run.py");
  await writeFile(tmpPy, pyScript);

  const proc = spawn(".venv/Scripts/python.exe", [tmpPy, narrPath, modelPath, voicesPath, outDir], {
    stdio: ["ignore", "inherit", "inherit"],
    cwd: process.cwd(),
  });

  await new Promise((resolve, reject) => {
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`tts exited ${code}`))));
  });

  console.log("TTS complete. Durations in video/audio/durations.json");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
