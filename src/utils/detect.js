import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { commandExists, run } from "./exec.js";

/** @returns {"win32"|"darwin"|"linux"|string} */
export function getPlatform() {
  return process.platform;
}

/** @returns {string} */
export function getHome() {
  return os.homedir();
}

/**
 * @param {string} name
 * @param {string[]} candidates
 */
export async function firstWorkingCommand(name, candidates) {
  for (const cmd of candidates) {
    if (await commandExists(cmd)) return cmd;
  }
  return null;
}

/** @returns {Promise<{ major: number, minor: number, raw: string } | null>} */
export async function getNodeVersion() {
  try {
    const r = await run("node", ["-p", "process.versions.node"], {
      verbose: false,
    });
    if (r.code !== 0) return null;
    const raw = r.stdout.trim();
    const [major, minor] = raw.split(".").map(Number);
    return { major, minor, raw };
  } catch {
    return null;
  }
}

/** @returns {Promise<{ major: number, minor: number, raw: string, cmd: string } | null>} */
export async function getPythonVersion() {
  const cmd = await firstWorkingCommand("python", [
    "python3",
    "python",
    "py",
  ]);
  if (!cmd) return null;

  const args = cmd === "py" ? ["-3", "--version"] : ["--version"];
  try {
    const r = await run(cmd, args, { verbose: false });
    const text = `${r.stdout}${r.stderr}`.trim();
    const m = text.match(/Python\s+(\d+)\.(\d+)/i);
    if (!m) return null;
    return {
      major: Number(m[1]),
      minor: Number(m[2]),
      raw: text,
      cmd,
    };
  } catch {
    return null;
  }
}

/** @returns {Promise<boolean>} */
export async function hasUv() {
  return commandExists("uv");
}

/** @returns {Promise<boolean>} */
export async function hasGit() {
  return commandExists("git");
}

/** @returns {Promise<boolean>} */
export async function hasNpx() {
  return commandExists("npx");
}

/** @param {string} p */
function pathExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/** @param {import("../platforms.js").PlatformDef} platform */
export async function detectPlatform(platform) {
  if (platform.detectCommand) {
    const cmds = Array.isArray(platform.detectCommand)
      ? platform.detectCommand
      : [platform.detectCommand];
    for (const c of cmds) {
      if (await commandExists(c.split(" ")[0], ["--version"])) return true;
    }
  }
  if (platform.detectPaths) {
    const home = getHome();
    for (const rel of platform.detectPaths) {
      const expanded = rel.replace(/^~/, home);
      if (pathExists(expanded)) return true;
    }
  }
  return false;
}
