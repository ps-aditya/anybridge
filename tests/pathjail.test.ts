import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeStep } from "../src/execution/executor.js";
import { setPolicy } from "../src/policy/allowlist.js";

let jail: string;
let outside: string;

beforeEach(async () => {
  const root = await mkdtemp(join(tmpdir(), "ab-jail-"));
  jail = join(root, "jail");
  outside = join(root, "outside");
  await mkdir(jail);
  await mkdir(outside);
  await writeFile(join(outside, "secret.txt"), "outside", "utf8");
  await writeFile(join(jail, "ok.txt"), "inside", "utf8");
  setPolicy({ pathJail: jail });
});

describe("realpath path jail", () => {
  it("reads a normal in-jail file", async () => {
    const res = await executeStep({ id: "s1", action: "fs.read", args: { path: join(jail, "ok.txt") } });
    expect(res.ok).toBe(true);
  });

  it("blocks a junction that escapes the jail", async () => {
    await symlink(outside, join(jail, "link"), "junction");
    const res = await executeStep({ id: "s1", action: "fs.read", args: { path: join(jail, "link", "secret.txt") } });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("PATH_OUTSIDE_JAIL");
  });
});
