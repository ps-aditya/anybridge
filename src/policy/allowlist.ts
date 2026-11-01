// Security-critical. Deny by default.
export interface PolicyConfig {
  allowedCliTools: string[];
  allowedOrigins: string[];
  pathJail: string; // root directory all file paths must be inside
  maxSteps: number;
  maxToolCallsPerTask: number;
  destructiveAllowed: boolean;
}

export const DEFAULT_POLICY: PolicyConfig = {
  allowedCliTools: ["git", "node", "npm", "npx", "sqlite3", "jq", "ls", "cat", "echo", "dir"],
  allowedOrigins: ["http://localhost:4010", "http://127.0.0.1:4010"],
  pathJail: process.cwd(),
  maxSteps: 12,
  maxToolCallsPerTask: 20,
  destructiveAllowed: false,
};

let current: PolicyConfig = { ...DEFAULT_POLICY };

export function getPolicy(): PolicyConfig {
  return current;
}

export function setPolicy(p: Partial<PolicyConfig>): void {
  current = { ...current, ...p };
}

export function isCliAllowed(tool: string): boolean {
  return getPolicy().allowedCliTools.includes(tool);
}

export function isOriginAllowed(origin: string): boolean {
  return getPolicy().allowedOrigins.includes(origin);
}

import path from "node:path";

export function isPathInJail(p: string): boolean {
  const { pathJail } = getPolicy();
  const resolved = path.resolve(p);
  const jail = path.resolve(pathJail);
  return resolved === jail || resolved.startsWith(jail + path.sep);
}
