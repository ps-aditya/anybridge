import { readFileSync, writeFileSync } from "node:fs";
const svg = readFileSync("assets/anybridge-logo.svg", "utf8");
const transparent = svg.replace('<rect width="2400" height="800" fill="#ffffff"/>', "");
writeFileSync("prototype/video/logo-transparent.svg", transparent);
console.log("wrote prototype/video/logo-transparent.svg");
