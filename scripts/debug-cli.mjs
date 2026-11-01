import { parseCliHelp } from "../dist/discovery/cliMenu.js";
import { readFileSync } from "node:fs";
const HELP = readFileSync("tests/cli-help-sample.txt", "utf8");
console.log(JSON.stringify(parseCliHelp("foo", HELP), null, 2));
