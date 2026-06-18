import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { node20BinDirs } from "./node-runtime.js";
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

/**
 * Prepend common install locations so freshly installed brew/python/uv
 * binaries are visible without restarting the shell.
 */
export function augmentPrereqPath() {
  const home = getHome();
  /** @type {string[]} */
  const extras = [
    path.join(home, ".local", "bin"),
    path.join(home, ".cargo", "bin"),
  ];

  if (process.platform === "darwin") {
    extras.push(
      "/opt/homebrew/bin",
      "/opt/homebrew/opt/python@3.12/bin",
      "/opt/homebrew/opt/python@3.11/bin",
      "/usr/local/bin",
      "/usr/local/opt/python@3.12/bin",
      "/usr/local/opt/python@3.11/bin",
      ...node20BinDirs(),
    );
  } else if (process.platform === "linux") {
    extras.push("/usr/local/bin", ...node20BinDirs());
  } else if (process.platform === "win32") {
    extras.push(...node20BinDirs());
  }

  const current = (process.env.PATH || "").split(path.delimiter);
  const seen = new Set();
  const merged = [];
  for (const dir of [...extras, ...current]) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    merged.push(dir);
  }
  process.env.PATH = merged.join(path.delimiter);
}

/**
 * @param {string} cmd
 * @returns {Promise<{ major: number, minor: number, raw: string, cmd: string } | null>}
 */
async function readPythonVersion(cmd) {
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

/** @returns {Promise<{ major: number, minor: number, raw: string, cmd: string } | null>} */
export async function getPythonVersion() {
  /** @type {string[]} */
  const candidates =
    process.platform === "win32"
      ? ["py", "python3", "python"]
      : [
          "python3.12",
          "python3.11",
          "python3.10",
          "python3",
          "python",
        ];

  /** @type {{ major: number, minor: number, raw: string, cmd: string } | null} */
  let best = null;
  for (const cmd of candidates) {
    const version = await readPythonVersion(cmd);
    if (!version) continue;
    if (
      !best ||
      version.major > best.major ||
      (version.major === best.major && version.minor > best.minor)
    ) {
      best = version;
    }
  }
  return best;
}

/** @returns {Promise<boolean>} */
export async function hasUv() {
  if (await commandExists("uv")) return true;

  const home = getHome();
  const candidates = [
    path.join(home, ".local", "bin", "uv"),
    path.join(home, ".cargo", "bin", "uv"),
  ];
  for (const bin of candidates) {
    if (pathExists(bin) && (await commandExists(bin))) return true;
  }
  return false;
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
