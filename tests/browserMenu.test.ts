import { describe, it, expect } from "vitest";
import { buildBrowserMenu, parseAriaLines } from "../src/discovery/browserMenu.js";

const SNAP = `- heading "Inventory" [level=1]
- navigation:
  - link "Home"
  - link "Items"
- button "Add item"
- textbox "Item name"
- button "Delete"
`;

describe("browserMenu", () => {
  it("numbers interactive elements plus the inspected page", () => {
    const items = buildBrowserMenu("http://x", SNAP);
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(items.map((i) => i.id)).toEqual(["a1", "a2", "a3", "a4", "a5", "a6"]);
  });
  it("exposes the inspected page as a navigation action", () => {
    const items = buildBrowserMenu("http://127.0.0.1:4010", SNAP);
    const page = items[0];
    expect(page?.kind).toBe("ui_navigation");
    expect(page?.invoke).toMatchObject({ action: "goto", url: "http://127.0.0.1:4010" });
  });
  it("classifies delete as destructive", () => {
    const items = buildBrowserMenu("http://x", SNAP);
    const del = items.find((i) => i.label.includes("Delete"));
    expect(del?.effect).toBe("destructive");
  });
  it("marks textbox as ui_input", () => {
    const items = buildBrowserMenu("http://x", SNAP);
    const tb = items.find((i) => i.label.includes("Item name"));
    expect(tb?.kind).toBe("ui_input");
  });
});
