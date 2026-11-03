import { describe, it, expect } from "vitest";
import { inspectInterface } from "../src/discovery/index.js";

describe("browser inspection origin policy", () => {
  it("refuses a disallowed origin before navigating", async () => {
    const result = await inspectInterface("browser:http://203.0.113.7");
    const payload = JSON.stringify(result);
    expect(payload).toContain("ORIGIN_NOT_ALLOWED");
  });

  it("rejects an invalid browser target", async () => {
    const result = await inspectInterface("browser:not-a-url");
    expect(JSON.stringify(result)).toContain("INVALID_INPUT");
  });
});
