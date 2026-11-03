import type { MenuItem, MenuInput } from "../types.js";

const INTERACTIVE_ROLES = new Set([
  "button", "link", "textbox", "checkbox", "radio", "combobox", "select",
  "menuitem", "tab", "switch", "searchbox", "spinbutton", "slider",
]);

const NAV_ROLES = new Set(["link", "tab", "menuitem"]);

function classifyEffect(role: string, name: string): "read" | "write" | "destructive" | "network" | "unknown" {
  const n = name.toLowerCase();
  if (/delete|remove|destroy|clear all|reset/.test(n)) return "destructive";
  if (role === "link" || role === "tab" || role === "menuitem") return "read"; // navigation is read-ish
  if (/save|submit|add|create|update|edit|send|confirm|apply/.test(n)) return "write";
  if (role === "button") return "write";
  if (role === "textbox" || role === "searchbox" || role === "spinbutton" || role === "combobox" || role === "select" || role === "checkbox" || role === "radio" || role === "slider" || role === "switch") return "write";
  return "unknown";
}

function isInteractive(role: string): boolean {
  return INTERACTIVE_ROLES.has(role);
}

export interface ParsedElement {
  role: string;
  name: string;
  ref?: string;
  level?: number;
  depth: number;
  lineNo: number;
}

export function parseAriaLines(snapshot: string): ParsedElement[] {
  const lines = snapshot.split(/\r?\n/);
  const out: ParsedElement[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line.trim()) continue;
    // match leading dash
    const m = line.match(/^(\s*)-\s+(\w+)(?:\s+"([^"]*)")?(.*)$/);
    if (!m) continue;
    const indent = (m[1] ?? "").length;
    const role = (m[2] ?? "").toLowerCase();
    const name = m[3] || "";
    const rest = m[4] || "";
    const refMatch = rest.match(/\[ref=([^\]]+)\]/);
    const levelMatch = rest.match(/\[level=(\d+)\]/);
    out.push({
      role,
      name: name.trim(),
      ref: refMatch ? refMatch[1]! : undefined,
      level: levelMatch ? Number(levelMatch[1]!) : undefined,
      depth: Math.floor(indent / 2),
      lineNo: i + 1,
    });
  }
  return out;
}

export function buildBrowserMenu(target: string, snapshot: string, opts?: { follow?: string }): MenuItem[] {
  const elems = parseAriaLines(snapshot);
  const items: MenuItem[] = [];
  let counter = 1;
  const nextId = () => `a${counter++}`;

  // A concrete, allowlisted navigation target so a plan can reproduce the
  // inspection page without the model writing a URL.
  items.push({
    id: nextId(),
    kind: "ui_navigation",
    label: `page "${target}"`,
    invoke: { role: "document", accessibleName: target, action: "goto", url: target },
    inputs: [],
    effect: "read",
    reversible: "yes",
    evidenceRef: "aria:1",
    inferenceNote: "open the inspected page",
  });

  // If follow specified, we still parse whole snapshot; follow filtering handled by caller ideally.
  // Here we just number interactive elements.

  for (const e of elems) {
    if (!isInteractive(e.role)) continue;
    const effect = classifyEffect(e.role, e.name);
    const kind = NAV_ROLES.has(e.role) ? "ui_navigation" : (e.role === "textbox" || e.role === "searchbox" || e.role === "spinbutton" || e.role === "combobox" || e.role === "select" || e.role === "checkbox" || e.role === "radio" || e.role === "slider" || e.role === "switch" ? "ui_input" : "ui_action");
    const inputs: MenuInput[] = [];
    if (kind === "ui_input") {
      inputs.push({ name: "value", type: "string", required: true });
    }
    items.push({
      id: nextId(),
      kind,
      label: `${e.role} "${e.name}"`,
      invoke: { role: e.role, accessibleName: e.name, action: kind === "ui_input" ? "fill" : "click" },
      inputs,
      effect,
      reversible: effect === "read" ? "yes" : "unknown",
      evidenceRef: `aria:${e.lineNo}`,
    });
  }

  if (items.length === 0) {
    items.push({
      id: "a1",
      kind: "ui_action",
      label: "page (no interactive elements found)",
      invoke: { role: "document", accessibleName: "", action: "read" },
      inputs: [],
      effect: "read",
      reversible: "yes",
      evidenceRef: "aria:1",
    });
  }
  return items;
}
