import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
for (const args of [["--help"],["help"],["-h"]]) {
  try {
    const r = await execFileAsync("git", args, { timeout: 10000, maxBuffer: 1024*1024 });
    console.log("ARGS", args, "OK", r.stdout.length, r.stderr.length);
  } catch (e) {
    console.log("ARGS", args, "ERR", e.code, (e.stdout||"").length, (e.stderr||"").length, (e.message||"").slice(0,100));
  }
}
