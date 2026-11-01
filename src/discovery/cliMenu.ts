import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { MenuItem, MenuInput } from "../types.js";
import { isCliAllowed } from "../policy/allowlist.js";

const execFileAsync = promisify(execFile);

export interface CliHelpResult {
  tool: string;
  text: string;
  error?: string;
}

export async function fetchCliHelp(tool: string): Promise<CliHelpResult> {
  if (!isCliAllowed(tool)) {
    return { tool, text: "", error: "ORIGIN_NOT_ALLOWED" };
  }
  // Try --help, then help, then -h
  for (const flag of ["--help", "help", "-h"]) {
    try {
      const args = flag === "help" ? ["help"] : [flag];
      const { stdout, stderr } = await execFileAsync(tool, args, {
        timeout: 10000,
        maxBuffer: 1024 * 1024,
      });
      const text = (stdout || "") + (stderr || "");
      if (text.trim().length > 0) return { tool, text };
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; message?: string };
      const text = (err.stdout || "") + (err.stderr || "");
      if (text.trim().length > 0) return { tool, text };
      // continue trying
    }
  }
  return { tool, text: "", error: "no help output" };
}

function classifyEffect(label: string, desc: string): "read" | "write" | "destructive" | "network" | "unknown" {
  const l = (label + " " + desc).toLowerCase();
  if (/delete|remove|rm\b|drop|truncate|destroy|kill/.test(l)) return "destructive";
  if (/write|create|insert|update|set|add|save|modify|edit/.test(l)) return "write";
  if (/http|fetch|curl|wget|network/.test(l)) return "network";
  if (/list|show|get|read|cat|print|status|version|help/.test(l)) return "read";
  return "unknown";
}

function parseOptionLine(line: string): { flags: string; desc: string } | null {
  // matches: "  -f, --foo VALUE   description" or "  --foo=VALUE  desc"
  const m = line.match(/^\s{2,}(-[A-Za-z0-9],?\s+)?(--?[A-Za-z0-9][A-Za-z0-9-]*)([ =]\S*)?\s{2,}(.*)$/);
  if (!m) return null;
  const flagPart = (m[1] || "") + (m[2] || "") + (m[3] || "");
  const desc = (m[4] || "").trim();
  if (!flagPart.trim()) return null;
  return { flags: flagPart.trim(), desc };
}

export function parseCliHelp(tool: string, helpText: string): MenuItem[] {
  const lines = helpText.split(/\r?\n/);
  const items: MenuItem[] = [];
  let counter = 1;
  const nextId = () => `a${counter++}`;

  // Subcommands section: "Commands:\n  foo  desc"
  let inCommands = false;
  for (const line of lines) {
    if (/^commands:/i.test(line.trim()) || /^available commands:/i.test(line.trim())) {
      inCommands = true;
      continue;
    }
    if (inCommands) {
      if (line.trim() === "" ) { inCommands = false; continue; }
      const m = line.match(/^\s{2,}(.+?)\s{2,}(\S.*)$/);
      if (m) {
        const name = m[1]!;
        const desc = (m[2] || "").trim();
        items.push({
          id: nextId(),
          kind: "cli_command",
          label: `${tool} ${name}`,
          invoke: { argv: [tool, name] },
          inputs: [],
          effect: classifyEffect(name, desc),
          reversible: "unknown",
          evidenceRef: `help:${lines.indexOf(line) + 1}`,
        });
        continue;
      }
      if (!/^\s/.test(line)) inCommands = false;
    }
  }

  // Options
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const parsed = parseOptionLine(line);
    if (!parsed) continue;
    const { flags, desc } = parsed;
    // determine input
    const inputs: MenuInput[] = [];
    const flagMatch = flags.match(/--?([A-Za-z0-9-]+)/);
    const flagName = flagMatch ? (flagMatch[1] ?? flags) : flags;
    // value placeholder?
    const valueMatch = flags.match(/[ =]<[^>]+>|[ =][A-Z_]+/);
    if (valueMatch) {
      inputs.push({ name: "value", type: "string", required: false, example: valueMatch[0].trim() });
    }
    items.push({
      id: nextId(),
      kind: "cli_flag",
      label: `${tool} ${flags}`,
      invoke: { argv: [tool, (flags.split(/\s+/)[0] ?? flags)] },
      inputs,
      effect: classifyEffect(flagName, desc),
      reversible: "unknown",
      evidenceRef: `help:${i + 1}`,
      inferenceNote: desc || undefined,
    });
  }

  // If nothing parsed, add a generic run item
  if (items.length === 0) {
    items.push({
      id: "a1",
      kind: "cli_command",
      label: `${tool} (run)`,
      invoke: { argv: [tool] },
      inputs: [],
      effect: "unknown",
      reversible: "unknown",
      evidenceRef: "help:1",
    });
  }
  return items;
}
