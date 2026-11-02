import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const W = 2400;
const H = 800;
const cx = 300;
const cy = 400;

const colors = ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa"];
const outerRadii = [188, 214, 176, 222, 196, 232, 184, 210, 198, 224, 190, 206];
const widths = [38, 34, 42, 32, 40, 36, 44, 34, 38, 32, 40, 36];

let strokes = "";
for (let i = 0; i < 12; i++) {
  const angle = (-90 + i * 30) * (Math.PI / 180);
  const inner = 82;
  const outer = outerRadii[i];
  const curve = i % 2 === 0 ? 22 : -22;
  const sx = cx + Math.cos(angle) * inner;
  const sy = cy + Math.sin(angle) * inner;
  const ex = cx + Math.cos(angle) * outer;
  const ey = cy + Math.sin(angle) * outer;
  const mx = cx + Math.cos(angle) * ((inner + outer) / 2);
  const my = cy + Math.sin(angle) * ((inner + outer) / 2);
  const qx = mx + Math.cos(angle + Math.PI / 2) * curve;
  const qy = my + Math.sin(angle + Math.PI / 2) * curve;
  strokes += `<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${colors[i % colors.length]}" stroke-width="${widths[i]}" stroke-linecap="round"/>`;

  if (i % 3 === 1) {
    strokes += `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="11" fill="#1e40af"/>`;
  }
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="hub" cx="38%" cy="32%" r="72%">
      <stop offset="0%" stop-color="#7db4ff"/>
      <stop offset="55%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#163da8"/>
    </radialGradient>
    <linearGradient id="word" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0%" stop-color="#d8e3f5"/>
      <stop offset="55%" stop-color="#c7d6ee"/>
      <stop offset="100%" stop-color="#b7c9e4"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <g>${strokes}</g>
  <circle cx="${cx}" cy="${cy}" r="52" fill="url(#hub)"/>
  <circle cx="${cx}" cy="${cy}" r="16" fill="#eff6ff" opacity="0.92"/>
  <text x="640" y="512" font-family="'Ink Free','Segoe Script','Segoe Print',cursive" font-size="300" font-style="italic" letter-spacing="3" fill="url(#word)">anybridge</text>
</svg>`;

mkdirSync("assets", { recursive: true });
writeFileSync("assets/anybridge-logo.svg", svg, "utf8");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL("C:/Users/Admin/MCP/assets/anybridge-logo.svg").href);
await page.screenshot({ path: "assets/anybridge-logo.png", type: "png" });
await browser.close();
console.log("wrote assets/anybridge-logo.svg and assets/anybridge-logo.png");
