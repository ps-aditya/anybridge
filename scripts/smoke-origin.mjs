import { executeStep, closeBrowser } from "../dist/execution/executor.js";

const goto = (url) => executeStep({ id: "s", action: "browser.goto", args: { url } });
const click = (name) => executeStep({ id: "s", action: "browser.click", args: { locator: { role: "link", name } } });

const one = await goto("http://127.0.0.1:4010/tasks");
const two = await goto("http://127.0.0.1:4010/notes");
const three = await click("this cleanup page");
console.log(JSON.stringify({
  allowedTasks: one.ok,
  allowedNotes: two.ok,
  hostileClickOk: three.ok,
  hostileClickCode: three.error?.code,
  hostileClickMessage: three.error?.message,
}));
await closeBrowser();
if (!one.ok || !two.ok || three.ok || three.error?.code !== "ORIGIN_NOT_ALLOWED") process.exitCode = 1;
