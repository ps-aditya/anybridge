import { promises as fs } from "node:fs";
import path from "node:path";
import { getPolicy } from "../policy/allowlist.js";

async function realpathAllowMissing(target: string): Promise<string | null> {
  let current = path.resolve(target);
  const suffix: string[] = [];
  for (;;) {
    try {
      const real = await fs.realpath(current);
      return path.join(real, ...suffix.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return null;
      suffix.push(path.basename(current));
      current = parent;
    }
  }
}

export async function isRealPathInJail(target: string): Promise<boolean> {
  try {
    const jail = await fs.realpath(path.resolve(getPolicy().pathJail));
    const real = await realpathAllowMissing(target);
    if (!real) return false;
    const relative = path.relative(jail, real);
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
  } catch {
    return false;
  }
}
