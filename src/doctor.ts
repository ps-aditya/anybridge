import { getPolicy } from "./policy/allowlist.js";

async function main() {
  console.log("AnyBridge doctor");
  console.log("Node:", process.version);
  console.log("CWD:", process.cwd());
  console.log("Policy pathJail:", getPolicy().pathJail);
  // Check playwright
  try {
    const pw = await import("playwright");
    const b = await pw.chromium.launch({ headless: true });
    await b.close();
    console.log("Playwright chromium: OK");
  } catch (e: unknown) {
    console.log("Playwright chromium: MISSING (run npx playwright install chromium)");
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
