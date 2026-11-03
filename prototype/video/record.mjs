import { chromium } from "playwright";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { pathToFileURL } from "node:url";

const root = "C:/Users/Admin/MCP/prototype/video";
const storyDir = `${root}/storyboard`;
const recDir = `${root}/recording-tmp`;
const out = `${root}/anybridge-demo-prototype.webm`;

mkdirSync(storyDir, { recursive: true });
rmSync(recDir, { recursive: true, force: true });
mkdirSync(recDir, { recursive: true });

const frames = [
  [6, "01-hook"],
  [18, "02-connect"],
  [37, "03-explore"],
  [60, "04-plan"],
  [80, "05-approval"],
  [102, "06-verify"],
  [129, "07-replay"],
  [150, "08-attack"],
  [170, "09-close"],
];

const browser = await chromium.launch({ headless: true });

const stillPage = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [time, name] of frames) {
  await stillPage.goto(`${pathToFileURL(`${root}/index.html`).href}?still=1&t=${time}`);
  await stillPage.waitForTimeout(900);
  await stillPage.screenshot({ path: `${storyDir}/${name}.png`, type: "png" });
  console.log(`still ${name}`);
}

if (process.argv.includes("--stills")) {
  await browser.close();
  console.log("stills only");
  process.exit(0);
}

const videoContext = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: recDir, size: { width: 1920, height: 1080 } },
});
const videoPage = await videoContext.newPage();
await videoPage.goto(`${pathToFileURL(`${root}/index.html`).href}?record=1`);
await videoPage.waitForTimeout(179000);
const video = videoPage.video();
await videoContext.close();
if (video) {
  const src = await video.path();
  copyFileSync(src, out);
  console.log(`video ${out}`);
}

await browser.close();
rmSync(recDir, { recursive: true, force: true });
console.log("done");
