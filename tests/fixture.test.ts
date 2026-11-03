import { describe, it, expect, beforeEach } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTask, readTasks, resetFromSeed, toggleTask } from "../fixtures/app-a/store.mjs";

let file;
let seed;

beforeEach(async () => {
  const dir = await mkdtemp(join(tmpdir(), "ab-fixture-"));
  file = join(dir, "data.json");
  seed = join(dir, "seed.json");
  await writeFile(seed, JSON.stringify({ tasks: [{ id: "t1", title: "Seed", done: false }] }), "utf8");
  await resetFromSeed(seed, file);
});

describe("fixture app A store", () => {
  it("resets from seed", async () => {
    expect(await readTasks(file)).toHaveLength(1);
    expect((await readTasks(file))[0].title).toBe("Seed");
  });

  it("adds a task with a generated id", async () => {
    const task = await addTask(file, "Ship demo");
    expect(task.title).toBe("Ship demo");
    expect(task.done).toBe(false);
    expect(typeof task.id).toBe("string");
    expect(await readTasks(file)).toHaveLength(2);
  });

  it("toggles a task", async () => {
    await addTask(file, "Ship demo");
    const [seed, added] = await readTasks(file);
    const toggled = await toggleTask(file, added.id);
    expect(toggled.done).toBe(true);
    expect((await readTasks(file)).find((t) => t.id === seed.id)?.done).toBe(false);
  });

  it("rejects empty or overlong titles", async () => {
    await expect(addTask(file, "")).rejects.toThrow();
    await expect(addTask(file, "x".repeat(121))).rejects.toThrow();
  });
});
