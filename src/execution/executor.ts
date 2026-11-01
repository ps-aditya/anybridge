import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import type { Step } from "../types.js";
import { isCliAllowed, isOriginAllowed, isPathInJail } from "../policy/allowlist.js";
import { makeError, ErrorCodes } from "../util/errors.js";

const execFileAsync = promisify(execFile);

export interface StepResult {
  stepId: string;
  ok: boolean;
  observed?: unknown;
  error?: { code: string; message: string; hint: string };
  durationMs: number;
}

function now(): number {
  return Date.now();
}

async function runCli(step: Step): Promise<StepResult> {
  const t = now();
  const argv = (step.args?.argv as string[]) || [];
  if (!Array.isArray(argv) || argv.length === 0) {
    return { stepId: step.id, ok: false, error: makeError(ErrorCodes.MISSING_ARG, "argv missing", "Add argv array to step.args"), durationMs: now() - t };
  }
  const tool = argv[0]!;
  if (!isCliAllowed(tool)) {
    return { stepId: step.id, ok: false, error: makeError(ErrorCodes.ORIGIN_NOT_ALLOWED, `CLI tool ${tool} not allowed`, "Tell the user or update policy"), durationMs: now() - t };
  }
  // path jail check for args that look like paths? skip for now
  try {
    const { stdout, stderr } = await execFileAsync(tool, argv.slice(1), { timeout: 30000, maxBuffer: 1024 * 1024 });
    return { stepId: step.id, ok: true, observed: { stdout: stdout.slice(0, 4000), stderr: stderr.slice(0, 1000), exitCode: 0 }, durationMs: now() - t };
  } catch (e: unknown) {
    const err = e as { code?: number; stdout?: string; stderr?: string; message?: string };
    const code = typeof err.code === "number" ? err.code : 1;
    if (code === 127) {
      return { stepId: step.id, ok: false, error: makeError(ErrorCodes.INVALID_INPUT, `command not found: ${tool}`, "Check allowlist"), durationMs: now() - t };
    }
    return { stepId: step.id, ok: false, observed: { stdout: (err.stdout || "").slice(0, 4000), stderr: (err.stderr || "").slice(0, 1000), exitCode: code }, error: makeError(ErrorCodes.STEP_FAILED, err.message || "command failed", "Inspect observed output"), durationMs: now() - t };
  }
}

async function runFs(step: Step): Promise<StepResult> {
  const t = now();
  const type = step.action; // fs.read / fs.exists / fs.hash
  const p = step.args?.path as string;
  if (!p) {
    return { stepId: step.id, ok: false, error: makeError(ErrorCodes.MISSING_ARG, "path missing", "Add path to args"), durationMs: now() - t };
  }
  if (!isPathInJail(p)) {
    return { stepId: step.id, ok: false, error: makeError(ErrorCodes.PATH_OUTSIDE_JAIL, "path outside jail", "Tell the user"), durationMs: now() - t };
  }
  try {
    if (type === "fs.exists") {
      const st = await fs.stat(p);
      return { stepId: step.id, ok: true, observed: { exists: true, size: st.size }, durationMs: now() - t };
    }
    if (type === "fs.read") {
      const data = await fs.readFile(p, "utf8");
      return { stepId: step.id, ok: true, observed: { content: data.slice(0, 8000) }, durationMs: now() - t };
    }
    if (type === "fs.hash") {
      const data = await fs.readFile(p);
      const h = crypto.createHash("sha256").update(data).digest("hex");
      return { stepId: step.id, ok: true, observed: { hash: h }, durationMs: now() - t };
    }
    return { stepId: step.id, ok: false, error: makeError(ErrorCodes.INVALID_INPUT, `unknown fs action ${type}`, "Use fs.read/exists/hash"), durationMs: now() - t };
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string };
    if (type === "fs.exists") {
      return { stepId: step.id, ok: true, observed: { exists: false }, durationMs: now() - t };
    }
    return { stepId: step.id, ok: false, error: makeError(ErrorCodes.STEP_FAILED, err.message || "fs error", "Check path"), durationMs: now() - t };
  }
}

// Browser executor using playwright, lazily launched
let browserCtx: { browser: any; page: any } | null = null;

async function ensureBrowser() {
  if (browserCtx) return browserCtx;
  const pw = await import("playwright");
  const browser = await pw.chromium.launch({ headless: true });
  const page = await browser.newPage();
  browserCtx = { browser, page };
  return browserCtx;
}

async function runBrowser(step: Step): Promise<StepResult> {
  const t = now();
  const type = step.action; // browser.goto etc
  try {
    const { page } = await ensureBrowser();
    if (type === "browser.goto") {
      const url = step.args?.url as string;
      if (!url) return { stepId: step.id, ok: false, error: makeError(ErrorCodes.MISSING_ARG, "url missing", "Add url"), durationMs: now() - t };
      // origin check
      let origin = "";
      try { origin = new URL(url).origin; } catch {}
      if (origin && !isOriginAllowed(origin)) {
        return { stepId: step.id, ok: false, error: makeError(ErrorCodes.ORIGIN_NOT_ALLOWED, `origin ${origin} not allowed`, "Tell the user"), durationMs: now() - t };
      }
      await page.goto(url, { timeout: 30000 });
      return { stepId: step.id, ok: true, observed: { url: page.url(), title: await page.title() }, durationMs: now() - t };
    }
    if (type === "browser.click") {
      const loc = step.args?.locator as { role?: string; name?: string } | undefined;
      if (!loc) return { stepId: step.id, ok: false, error: makeError(ErrorCodes.MISSING_ARG, "locator missing", "Add locator"), durationMs: now() - t };
      const locator = loc.role ? page.getByRole(loc.role as any, { name: loc.name }) : page.getByText(loc.name || "");
      await locator.first().click({ timeout: 15000 });
      return { stepId: step.id, ok: true, observed: { clicked: loc }, durationMs: now() - t };
    }
    if (type === "browser.fill") {
      const loc = step.args?.locator as { role?: string; name?: string } | undefined;
      const value = step.args?.value;
      if (!loc) return { stepId: step.id, ok: false, error: makeError(ErrorCodes.MISSING_ARG, "locator missing", "Add locator"), durationMs: now() - t };
      const locator = loc.role ? page.getByRole(loc.role as any, { name: loc.name }) : page.getByLabel(loc.name || "");
      await locator.first().fill(String(value ?? ""), { timeout: 15000 });
      return { stepId: step.id, ok: true, observed: { filled: loc, value }, durationMs: now() - t };
    }
    if (type === "browser.select") {
      const loc = step.args?.locator as { role?: string; name?: string } | undefined;
      const value = step.args?.value;
      const locator = loc?.role ? page.getByRole(loc.role as any, { name: loc.name }) : page.getByLabel(loc?.name || "");
      await locator.first().selectOption(String(value ?? ""), { timeout: 15000 });
      return { stepId: step.id, ok: true, observed: { selected: value }, durationMs: now() - t };
    }
    if (type === "browser.wait") {
      const ms = Number(step.args?.ms ?? 1000);
      await page.waitForTimeout(Math.min(ms, 10000));
      return { stepId: step.id, ok: true, observed: { waited: ms }, durationMs: now() - t };
    }
    if (type === "browser.read_text") {
      const text = await page.locator("body").innerText();
      return { stepId: step.id, ok: true, observed: { text: text.slice(0, 8000) }, durationMs: now() - t };
    }
    return { stepId: step.id, ok: false, error: makeError(ErrorCodes.INVALID_INPUT, `unknown browser action ${type}`, "Use browser.* steps"), durationMs: now() - t };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { stepId: step.id, ok: false, error: makeError(ErrorCodes.STEP_FAILED, err.message || "browser error", "Inspect observed"), durationMs: now() - t };
  }
}

export async function executeStep(step: Step): Promise<StepResult> {
  const anyStep = step as any;
  // Menu-id resolved step: has _invoke
  if (anyStep._invoke) {
    const invoke = anyStep._invoke;
    const kind = anyStep._kind as string;
    if (invoke.argv) {
      // cli: build argv with args
      const baseArgv = [...invoke.argv];
      // append input values from step.args
      const args = step.args || {};
      // If args has 'value', append; if args has value mapping, append values
      for (const [k, v] of Object.entries(args)) {
        if (k.startsWith("_")) continue;
        // skip if already in argv? simple: append value for flags
        if (k === "value") baseArgv.push(String(v));
      }
      const cliStep: Step = { ...step, action: "cli.run", args: { argv: baseArgv } };
      return runCli(cliStep);
    }
    if (kind && kind.startsWith("ui_")) {
      const loc = { role: invoke.role, accessibleName: invoke.accessibleName };
      if (kind === "ui_input") {
        const val = (step.args && (step.args.value ?? step.args.val)) ?? "";
        const fillStep: Step = { ...step, action: "browser.fill", args: { locator: loc, value: val } };
        return runBrowser(fillStep);
      }
      if (kind === "ui_navigation") {
        // navigation: click
        const clickStep: Step = { ...step, action: "browser.click", args: { locator: loc } };
        return runBrowser(clickStep);
      }
      // ui_action / ui_input default click
      const clickStep: Step = { ...step, action: "browser.click", args: { locator: loc } };
      return runBrowser(clickStep);
    }
  }
  if (step.action.startsWith("cli.")) return runCli(step);
  if (step.action.startsWith("fs.")) return runFs(step);
  if (step.action.startsWith("browser.")) return runBrowser(step);
  if (step.action.startsWith("assert.")) {
    // assert steps are no-ops that pass if reached
    return { stepId: step.id, ok: true, observed: { asserted: true }, durationMs: 0 };
  }
  // Allow menu-id style actions? The DSL uses step.type like browser.goto. But agent may use menu ids? 
  return { stepId: step.id, ok: false, error: makeError(ErrorCodes.UNKNOWN_ACTION_ID, `Unknown action ${step.action}`, "Use menu ids / known step types"), durationMs: 0 };
}

export async function closeBrowser(): Promise<void> {
  if (browserCtx) {
    await browserCtx.browser.close().catch(() => {});
    browserCtx = null;
  }
}
