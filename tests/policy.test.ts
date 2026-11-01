import { describe, it, expect } from "vitest";
import { isCliAllowed, isOriginAllowed, isPathInJail, setPolicy, getPolicy } from "../src/policy/allowlist.js";

describe("policy", () => {
  it("deny by default unknown tool", () => {
    expect(isCliAllowed("rm")).toBe(false);
  });
  it("allow listed tool", () => {
    expect(isCliAllowed("node")).toBe(true);
  });
  it("origin allowlist", () => {
    expect(isOriginAllowed("http://localhost:4010")).toBe(true);
    expect(isOriginAllowed("https://evil.com")).toBe(false);
  });
  it("path jail", () => {
    setPolicy({ pathJail: process.cwd() });
    expect(isPathInJail(process.cwd() + "/foo.txt")).toBe(true);
    expect(isPathInJail("C:\\Windows\\System32\\x")).toBe(false);
  });
});
