import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { run } from "./exec.js";

/** @param {string} p */
function pathExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/**
 * Collect candidate npm paths for Node 20 installs.
 * @returns {string[]}
 */
export function node20NpmCandidates() {
  const home = os.homedir();
  /** @type {string[]} */
  const candidates = [];

  if (process.platform === "darwin") {
    candidates.push(
      "/opt/homebrew/opt/node@20/bin/npm",
      "/usr/local/opt/node@20/bin/npm",
    );
  }

  for (const root of nodeVersionRoots(home)) {
    if (!pathExists(root)) continue;
    try {
      for (const dir of fs.readdirSync(root)) {
        if (!dir.startsWith("v20.")) continue;
        if (root.includes(`${path.sep}fnm${path.sep}`)) {
          candidates.push(
            path.join(root, dir, "installation", "bin", "npm"),
          );
          continue;
        }
        const npm =
          process.platform === "win32"
            ? path.join(root, dir, "npm.cmd")
            : path.join(root, dir, "bin", "npm");
        candidates.push(npm);
      }
    } catch {
      // ignore unreadable version dirs
    }
  }

  return candidates;
}

/**
 * @param {string} home
 * @returns {string[]}
 */
function nodeVersionRoots(home) {
  /** @type {string[]} */
  const roots = [
    path.join(home, ".nvm", "versions", "node"),
    path.join(home, ".local", "share", "fnm", "node-versions"),
  ];

  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    if (local) roots.push(path.join(local, "nvm"));
    if (process.env.NVM_HOME) roots.push(process.env.NVM_HOME);
  } else if (process.env.NVM_DIR) {
    roots.push(path.join(process.env.NVM_DIR, "versions", "node"));
  }

  return roots;
}

/**
 * Resolve npm from a Node 20 install (for native addons like better-sqlite3).
 * @returns {Promise<string|null>}
 */
export async function findNode20Npm() {
  for (const npm of node20NpmCandidates()) {
    if (!pathExists(npm)) continue;

    const nodeDir = path.dirname(npm);
    const nodeBin =
      process.platform === "win32"
        ? path.join(nodeDir, "node.exe")
        : path.join(nodeDir, "node");
    if (!pathExists(nodeBin)) continue;

    const nv = await run(nodeBin, ["-p", "process.versions.node"], {
      verbose: false,
    });
    if (nv.code !== 0 || !nv.stdout.trim().startsWith("20.")) continue;

    const npmCheck = await run(npm, ["-v"], { verbose: false });
    if (npmCheck.code === 0) return npm;
  }
  return null;
}

/**
 * @param {string} npmPath
 * @returns {string}
 */
export function cavememBinFromNpm(npmPath) {
  const dir = path.dirname(npmPath);
  return process.platform === "win32"
    ? path.join(dir, "cavemem.cmd")
    : path.join(dir, "cavemem");
}

/** @returns {string[]} */
export function node20BinDirs() {
  /** @type {string[]} */
  const dirs = [];
  if (process.platform === "darwin") {
    dirs.push(
      "/opt/homebrew/opt/node@20/bin",
      "/usr/local/opt/node@20/bin",
    );
  }
  for (const npm of node20NpmCandidates()) {
    dirs.push(path.dirname(npm));
  }
  return dirs;
}

/** @returns {string[]} */
export function getNode20InstallCommands() {
  const os = process.platform;
  if (os === "darwin") return ["brew install node@20"];
  if (os === "win32") {
    return [
      "nvm install 20",
      "# or: winget install OpenJS.NodeJS.LTS (Node 20 LTS)",
    ];
  }
  return [
    "bash -lc 'command -v fnm >/dev/null && fnm install 20 || (source \"$NVM_DIR/nvm.sh\" 2>/dev/null || source \"$HOME/.nvm/nvm.sh\"; nvm install 20)'",
  ];
}

/**
 * @typedef {Object} CavememRuntime
 * @property {string} npm
 * @property {string} bin
 * @property {boolean} usesNode20
 */

/**
 * Resolve npm/bin for Cavemem. Host Node 23+ requires side-by-side Node 20.
 * @returns {Promise<CavememRuntime|null>}
 */
export async function resolveCavememRuntime() {
  const hostMajor = Number(process.versions.node.split(".")[0]);
  const maxNative = UPSTREAM.cavemem.maxNodeForNative ?? 22;

  if (hostMajor <= maxNative) {
    return { npm: "npm", bin: "cavemem", usesNode20: false };
  }

  const npm20 = await findNode20Npm();
  if (!npm20) return null;
  return { npm: npm20, bin: cavememBinFromNpm(npm20), usesNode20: true };
}

/**
 * Pure helper for prereq/tests (no filesystem).
 * @param {number} hostMajor
 * @param {boolean} hasNode20
 * @returns {boolean}
 */
export function cavememNode20PrereqOk(hostMajor, hasNode20) {
  const maxNative = UPSTREAM.cavemem.maxNodeForNative ?? 22;
  if (hostMajor <= maxNative) return true;
  return hasNode20;
}
