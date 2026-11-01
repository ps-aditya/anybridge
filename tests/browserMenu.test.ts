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
  it("numbers interactive elements", () => {
    const items = buildBrowserMenu("http://x", SNAP);
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.map((i) => i.id)).toEqual(["a1", "a2", "a3", "a4", "a5"]);
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
