import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export async function readTasks(file) {
  try {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.tasks) ? parsed.tasks : [];
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

export async function writeTasks(file, tasks) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ tasks }, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export async function addTask(file, title) {
  const clean = String(title || "").trim();
  if (!clean || clean.length > 120) throw new Error("title must be 1-120 characters");
  const tasks = await readTasks(file);
  const task = { id: crypto.randomUUID(), title: clean, done: false };
  tasks.push(task);
  await writeTasks(file, tasks);
  return task;
}

export async function toggleTask(file, id) {
  const tasks = await readTasks(file);
  const task = tasks.find((t) => t.id === id);
  if (!task) throw new Error("task not found");
  task.done = !task.done;
  await writeTasks(file, tasks);
  return task;
}

export async function resetFromSeed(seedFile, dataFile) {
  const raw = await fs.readFile(seedFile, "utf8");
  const parsed = JSON.parse(raw);
  await writeTasks(dataFile, parsed.tasks || []);
  return parsed.tasks || [];
}
