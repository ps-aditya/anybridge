import { getPolicy } from "../policy/allowlist.js";
import { fetchCliHelp, parseCliHelp } from "./cliMenu.js";
import { buildBrowserMenu, parseAriaLines } from "./browserMenu.js";
import type { Menu, MenuItem, CapabilityMap } from "../types.js";
import { makeError, ErrorCodes } from "../util/errors.js";

// Global registry of last inspected menu items, keyed by menu id
const lastMenuRegistry = new Map<string, MenuItem>();
export function registerMenuItems(items: MenuItem[]): void {
  // clear? keep accumulating but overwrite
  for (const it of items) lastMenuRegistry.set(it.id, it);
}
export function lookupMenuItem(id: string): MenuItem | undefined {
  return lastMenuRegistry.get(id);
}
export function allMenuItems(): MenuItem[] {
  return [...lastMenuRegistry.values()];
}
export function clearMenuRegistry(): void {
  lastMenuRegistry.clear();
}

export interface DiscoverResult {
  cliTools: string[];
  origins: string[];
  workflows: string[];
  query?: string;
}

export async function discoverCapabilities(query?: string): Promise<DiscoverResult> {
  const policy = getPolicy();
  // workflows loaded lazily
  let workflows: string[] = [];
  try {
    const { listWorkflows } = await import("../workflow/store.js");
    workflows = await listWorkflows();
  } catch {
    workflows = [];
  }
  return {
    cliTools: policy.allowedCliTools,
    origins: policy.allowedOrigins,
    workflows,
    query,
  };
}

export async function inspectInterface(target: string, follow?: string): Promise<Menu | { error: any }> {
  // target can be "cli:<tool>" or "browser:<origin>" or a tool name
  if (target.startsWith("cli:")) {
    const tool = target.slice(4);
    const help = await fetchCliHelp(tool);
    if (help.error) {
      return { error: makeError(ErrorCodes.TARGET_NOT_FOUND, help.error, "Check allowlist") };
    }
    const items = parseCliHelp(tool, help.text);
    registerMenuItems(items);
    return { target, items, notObserved: ["subcommands not shown", "global flags"] };
  }
  // if plain tool name in allowlist, treat as cli
  const policy = getPolicy();
  if (policy.allowedCliTools.includes(target)) {
    return inspectInterface(`cli:${target}`, follow);
  }
  // browser target: expect target like "browser:http://..." or origin
  if (target.startsWith("browser:")) {
    const origin = target.slice(8);
    if (!getPolicy().allowedOrigins.includes(origin)) {
      // allow any origin? policy deny; but for inspection maybe allow localhost
    }
    // We don't fetch page here; return empty menu prompting use of snapshot? 
    // For tests, support a fixture snapshot via env? Instead, provide a helper to build from snapshot passed? 
    // inspect_interface takes target only. For browser, we need a snapshot. We'll launch playwright and snapshot.
    try {
      const pw = await import("playwright");
      const browser = await pw.chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(origin || target, { timeout: 15000 }).catch(() => {});
      // ARIA snapshot
      const snap = await page.ariaSnapshot({ timeout: 10000 }).catch(() => "");
      await browser.close();
      const items = buildBrowserMenu(origin, snap);
      registerMenuItems(items);
      return { target, items, notObserved: ["collapsed menus", "other pages"] };
    } catch (e: unknown) {
      const err = e as { message?: string };
      return { error: makeError(ErrorCodes.TARGET_NOT_FOUND, err.message || "browser inspect failed", "Check origin allowlist / playwright") };
    }
  }
  // origin directly
  if (target.startsWith("http")) {
    return inspectInterface(`browser:${target}`, follow);
  }
  return { error: makeError(ErrorCodes.TARGET_NOT_FOUND, `unknown target ${target}`, "Use cli:<tool> or browser:<origin> or http url") };
}

// Cartographer: convert observation to capability map (P2). Basic implementation.
export function buildCapabilityMap(target: string, items: MenuItem[]): CapabilityMap {
  return {
    target,
    affordances: items.map((it) => ({
      id: it.id,
      kind: it.kind,
      invoke: it.invoke,
      inputs: it.inputs,
      effect: it.effect,
      reversible: it.reversible,
      evidenceRef: it.evidenceRef,
      inferenceNote: it.inferenceNote,
    })),
    notObserved: [],
  };
}
