import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(pathToFileURL("C:/Users/Admin/MCP/prototype/video/anybridge-demo-prototype.webm").href);
const duration = await page.evaluate(() => new Promise((resolve) => {
  const video = document.querySelector("video");
  if (!video) return resolve(null);
  if (Number.isFinite(video.duration)) return resolve(video.duration);
  video.addEventListener("loadedmetadata", () => resolve(video.duration), { once: true });
}));
console.log(`duration=${duration}`);
await browser.close();
