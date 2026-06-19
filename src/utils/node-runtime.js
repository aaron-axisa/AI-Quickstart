import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { resolveSpawnCommand, run } from "./exec.js";

/** @param {string} p */
function pathExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

/** @returns {string} */
export function resolveHostNpm() {
  if (process.platform === "win32") {
    const npmCmd = path.join(path.dirname(process.execPath), "npm.cmd");
    if (pathExists(npmCmd)) return npmCmd;
  }
  return "npm";
}

/** @returns {string[]} */
export function win32NpmPathDirs() {
  /** @type {string[]} */
  const dirs = [];
  const appData = process.env.APPDATA;
  if (appData) dirs.push(path.join(appData, "npm"));
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) dirs.push(path.join(localAppData, "npm"));
  dirs.push(path.dirname(process.execPath));
  if (process.env.NVM_SYMLINK) dirs.push(process.env.NVM_SYMLINK);
  return dirs;
}

/**
 * Collect candidate npm paths for Node 20 installs.
 * @returns {string[]}
 */
export function node20NpmCandidates() {
  const home = os.homedir();
  /** @type {string[]} */
  const candidates = [];

  if (process.platform === "win32" && process.env.NVM_SYMLINK) {
    candidates.push(path.join(process.env.NVM_SYMLINK, "npm.cmd"));
  }

  if (process.platform === "darwin") {
    candidates.push(
      "/opt/homebrew/opt/node@20/bin/npm",
      "/usr/local/opt/node@20/bin/npm",
    );
    for (const cellarRoot of [
      "/opt/homebrew/Cellar/node@20",
      "/usr/local/Cellar/node@20",
    ]) {
      if (!pathExists(cellarRoot)) continue;
      try {
        for (const ver of fs.readdirSync(cellarRoot)) {
          candidates.push(path.join(cellarRoot, ver, "bin", "npm"));
        }
      } catch {
        // ignore
      }
    }
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

/**
 * @param {string} npmPath
 * @returns {string}
 */
export function nodeBinFromNpm(npmPath) {
  const dir = path.dirname(npmPath);
  return process.platform === "win32"
    ? path.join(dir, "node.exe")
    : path.join(dir, "node");
}

/**
 * @param {string} nodeBin
 * @returns {string|null}
 */
export function npmCliFromNodeBin(nodeBin) {
  const dir = path.dirname(nodeBin);
  /** @type {string[]} */
  const candidates = [
    path.join(dir, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(dir, "node_modules", "npm", "bin", "npm-cli.js"),
  ];
  for (const cli of candidates) {
    if (pathExists(cli)) return cli;
  }
  return null;
}

/**
 * @param {string} nodeBin
 * @returns {string|null}
 */
export function npxCliFromNodeBin(nodeBin) {
  const dir = path.dirname(nodeBin);
  /** @type {string[]} */
  const candidates = [
    path.join(dir, "..", "lib", "node_modules", "npm", "bin", "npx-cli.js"),
    path.join(dir, "node_modules", "npm", "bin", "npx-cli.js"),
  ];
  for (const cli of candidates) {
    if (pathExists(cli)) return cli;
  }
  return null;
}

/**
 * Run npx via node + npx-cli.js when available (avoids .cmd quoting on Windows).
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, dryRun?: boolean, verbose?: boolean }} [opts]
 */
export async function runNpx(args, opts = {}) {
  const npxCli = npxCliFromNodeBin(process.execPath);
  if (npxCli) {
    return run(process.execPath, [npxCli, ...args], opts);
  }
  return run(resolveSpawnCommand("npx"), args, opts);
}

/**
 * Env with Node 20 bin dir first so npm/cavemem shebangs resolve correctly.
 * @param {string} npmOrBinPath
 * @returns {NodeJS.ProcessEnv}
 */
export function envWithNode20First(npmOrBinPath) {
  const dir = path.dirname(npmOrBinPath);
  return {
    PATH: `${dir}${path.delimiter}${process.env.PATH || ""}`,
  };
}

/**
 * PATH env with npm global bin and common Windows user npm dirs prepended.
 * @param {string} npmPath
 * @returns {Promise<NodeJS.ProcessEnv>}
 */
export async function envWithNpmGlobalBin(npmPath) {
  /** @type {string[]} */
  const dirs = [];
  const globalBin = await npmGlobalBinDir(npmPath);
  if (globalBin) dirs.push(globalBin);
  if (npmPath !== "npm") dirs.push(path.dirname(npmPath));
  if (process.platform === "win32") dirs.push(...win32NpmPathDirs());

  const seen = new Set();
  const merged = [];
  for (const dir of [...dirs, ...(process.env.PATH || "").split(path.delimiter)]) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    merged.push(dir);
  }
  return { PATH: merged.join(path.delimiter) };
}

/**
 * Global npm bin directory for a given npm executable.
 * @param {string} npmPath
 * @returns {Promise<string|null>}
 */
export async function npmGlobalBinDir(npmPath) {
  if (npmPath === "npm") {
    const res = await run("npm", ["bin", "-g"], { verbose: false });
    return res.code === 0 ? res.stdout.trim() : null;
  }
  const res = await runNpm(npmPath, ["bin", "-g"], { verbose: false });
  return res.code === 0 ? res.stdout.trim() : null;
}

/**
 * Resolve cavemem CLI path after global install (npm global bin may differ from npm dir).
 * @param {string} npmPath
 * @returns {Promise<string|null>}
 */
export async function resolveCavememBin(npmPath) {
  const globalBin = await npmGlobalBinDir(npmPath);
  if (globalBin) {
    const name = process.platform === "win32" ? "cavemem.cmd" : "cavemem";
    const bin = path.join(globalBin, name);
    if (pathExists(bin)) return bin;
  }

  const fallback = cavememBinFromNpm(npmPath);
  if (pathExists(fallback)) return fallback;

  return cavememPackageEntry(npmPath);
}

/**
 * @param {string} npmPath
 * @returns {Promise<string|null>}
 */
export async function cavememPackageEntry(npmPath) {
  const res = await runNpm(npmPath, ["root", "-g"], { verbose: false });
  if (res.code !== 0) return null;

  const pkgJsonPath = path.join(res.stdout.trim(), "cavemem", "package.json");
  if (!pathExists(pkgJsonPath)) return null;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    const binField = pkg.bin;
    const rel =
      typeof binField === "string"
        ? binField
        : binField?.cavemem ?? binField?.["cavemem"];
    if (!rel) return null;
    return path.join(path.dirname(pkgJsonPath), rel);
  } catch {
    return null;
  }
}

/**
 * @param {CavememRuntime} runtime
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, dryRun?: boolean, verbose?: boolean }} [opts]
 */
export async function runCavememCli(runtime, args, opts = {}) {
  const { augmentPrereqPath } = await import("./detect.js");
  augmentPrereqPath();

  const line = `${runtime.npm} exec -g -- cavemem ${args.join(" ")}`;

  if (opts.dryRun) {
    console.log(`[dry-run] ${line}`);
    return { code: 0, stdout: "", stderr: "" };
  }

  if (opts.verbose) console.log(`> ${line}`);

  const env = await envWithNpmGlobalBin(runtime.npm);
  const mergedOpts = { ...opts, env: { ...env, ...opts.env } };

  const res = await runNpm(
    runtime.npm,
    ["exec", "-g", "--", "cavemem", ...args],
    mergedOpts,
  );
  if (res.code === 0) return res;

  const bin = await resolveCavememBin(runtime.npm);
  if (bin && pathExists(bin)) {
    return run(bin, args, mergedOpts);
  }

  const entry = await cavememPackageEntry(runtime.npm);
  if (entry) {
    const nodeBin = runtime.usesNode20
      ? nodeBinFromNpm(runtime.npm)
      : process.execPath;
    return run(nodeBin, [entry, ...args], mergedOpts);
  }

  return res;
}

/**
 * Run npm via the matching node binary (avoids #!/usr/bin/env node picking host Node 23).
 * @param {string} npmPath `"npm"` or absolute path to npm
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, dryRun?: boolean, verbose?: boolean }} [opts]
 */
export async function runNpm(npmPath, args, opts = {}) {
  if (npmPath === "npm") {
    return run("npm", args, opts);
  }

  const nodeBin = nodeBinFromNpm(npmPath);
  const npmCli = npmCliFromNodeBin(nodeBin);
  const node20Env = envWithNode20First(npmPath);
  const mergedOpts = {
    ...opts,
    env: { ...node20Env, ...opts.env },
  };

  if (npmCli) {
    return run(nodeBin, [npmCli, ...args], mergedOpts);
  }

  return run(npmPath, args, mergedOpts);
}

/** @returns {string[]} */
export function node20BinDirs() {
  /** @type {string[]} */
  const dirs = [];
  if (process.platform === "darwin") {
    dirs.push(
      "/opt/homebrew/opt/node@20/bin",
      "/usr/local/opt/node@20/bin",
      "/opt/homebrew/bin",
      "/usr/local/bin",
    );
  }
  if (process.platform === "win32") {
    dirs.push(...win32NpmPathDirs());
  }
  for (const npm of node20NpmCandidates()) {
    dirs.push(path.dirname(npm));
  }
  return dirs;
}

/** @returns {string[]} */
export function getNode20InstallCommands() {
  const os = process.platform;
  if (os === "darwin") {
    return [
      "brew install node@20",
      "brew link --overwrite --force node@20 2>/dev/null || true",
    ];
  }
  if (os === "win32") {
    return [
      "nvm install 20",
      "# Run in a shell where nvm is available (no admin required with nvm-windows)",
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
    return {
      npm: resolveHostNpm(),
      bin: "cavemem",
      usesNode20: false,
    };
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
