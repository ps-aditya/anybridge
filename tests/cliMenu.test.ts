import { describe, it, expect } from "vitest";
import { parseCliHelp } from "../src/discovery/cliMenu.js";

const HELP = `Usage: foo [options] [command]

Options:
  -V, --version       output the version number
  -h, --help          display help for command

Commands:
  list                List all items
  add <name>          Add an item
  delete <id>         Delete an item
`;

describe("cliMenu parseCliHelp", () => {
  it("parses subcommands", () => {
    const items = parseCliHelp("foo", HELP);
    const cmds = items.filter((i) => i.kind === "cli_command");
    expect(cmds.length).toBeGreaterThanOrEqual(3);
    expect(cmds.map((c) => c.label)).toContain("foo list");
  });
  it("parses options", () => {
    const items = parseCliHelp("foo", HELP);
    const flags = items.filter((i) => i.kind === "cli_flag");
    expect(flags.length).toBeGreaterThanOrEqual(2);
  });
  it("classifies delete as destructive", () => {
    const items = parseCliHelp("foo", HELP);
    const del = items.find((i) => i.label.includes("delete"));
    expect(del?.effect).toBe("destructive");
  });
});
