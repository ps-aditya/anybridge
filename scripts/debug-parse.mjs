import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseCliHelp } from "../dist/discovery/cliMenu.js";
const execFileAsync = promisify(execFile);
const r = await execFileAsync("git", ["--help"], { timeout: 10000, maxBuffer: 1024*1024 });
const items = parseCliHelp("git", r.stdout);
console.log("COUNT", items.length);
console.log(items.map(i=>i.label).slice(0,20));
