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

/** @param {string} dir */
function dirHasGit(dir) {
  const name = process.platform === "win32" ? "git.exe" : "git";
  return pathExists(path.join(dir, name));
}

/**
 * PATH env for child npm/npx processes (Windows Program Files / user npm bin).
 * @param {{ strict?: boolean, npmPath?: string }} [opts]
 * @returns {NodeJS.ProcessEnv}
 */
export function envForChildNodeTools(opts = {}) {
  const strict =
    opts.strict ?? (process.platform === "win32");
  /** @type {string[]} */
  const dirs = [];

  if (opts.npmPath && opts.npmPath !== "npm") {
    dirs.push(path.dirname(opts.npmPath));
  } else {
    dirs.push(path.dirname(process.execPath));
  }

  if (process.platform === "win32") {
    for (const dir of win32NpmPathDirs()) {
      if (!dirs.includes(dir)) dirs.push(dir);
    }
    if (strict) {
      const sysRoot = process.env.SystemRoot || process.env.WINDIR;
      if (sysRoot) {
        const system32 = path.join(sysRoot, "System32");
        if (!dirs.includes(system32)) dirs.push(system32);
      }
      for (const dir of (process.env.PATH || "").split(path.delimiter)) {
        if (dir && dirHasGit(dir) && !dirs.includes(dir)) dirs.push(dir);
      }
    }
  }

  const seen = new Set();
  const merged = [];
  const tail = strict ? [] : (process.env.PATH || "").split(path.delimiter);
  for (const dir of [...dirs, ...tail]) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    merged.push(dir);
  }

  return {
    PATH: merged.join(path.delimiter),
    NODE: opts.npmPath && opts.npmPath !== "npm"
      ? nodeBinFromNpm(opts.npmPath)
      : process.execPath,
    npm_node_execpath:
      opts.npmPath && opts.npmPath !== "npm"
        ? nodeBinFromNpm(opts.npmPath)
        : process.execPath,
  };
}

/**
 * Run npx via node + npx-cli.js when available (avoids .cmd quoting on Windows).
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, dryRun?: boolean, verbose?: boolean }} [opts]
 */
export async function runNpx(args, opts = {}) {
  const toolEnv = envForChildNodeTools({ strict: true });
  const mergedOpts = {
    ...opts,
    env: { ...toolEnv, ...opts.env },
  };

  const npxCli = npxCliFromNodeBin(process.execPath);
  if (npxCli) {
    return run(process.execPath, [npxCli, ...args], mergedOpts);
  }
  return run(resolveSpawnCommand("npx"), args, mergedOpts);
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
 * Global npm prefix directory for a given npm executable.
 * npm 11+ removed `npm bin -g`; use `npm prefix -g` instead.
 * @param {string} npmPath
 * @returns {Promise<string|null>}
 */
export async function npmGlobalBinDir(npmPath) {
  const res =
    npmPath === "npm"
      ? await run("npm", ["prefix", "-g"], { verbose: false })
      : await runNpm(npmPath, ["prefix", "-g"], { verbose: false });
  return res.code === 0 ? res.stdout.trim() : null;
}

/**
 * win32NpmPathDirs minus active host Node global dirs (nvm symlink / execPath).
 * Side-by-side Node 20 installs must not reuse the host-global cavemem copy.
 * @param {{ sideBySide?: boolean }} [opts]
 * @returns {string[]}
 */
export function win32SideBySideNpmPathDirs(opts = {}) {
  if (!opts.sideBySide || process.platform !== "win32") {
    return win32NpmPathDirs();
  }

  const skip = new Set(
    [process.env.NVM_SYMLINK, path.dirname(process.execPath)].filter(Boolean),
  );
  return win32NpmPathDirs().filter((dir) => !skip.has(dir));
}

/**
 * Isolated env for global npm installs via side-by-side Node 20 on Windows.
 * Omits NVM_SYMLINK from PATH and pins npm prefix so npm does not upgrade
 * the active host-global copy (EBUSY when cavemem MCP holds better_sqlite3.node).
 * @param {string} npmPath
 * @param {string|null} prefix
 * @returns {NodeJS.ProcessEnv}
 */
export function envForSideBySideGlobalInstall(npmPath, prefix) {
  const nodeBin = nodeBinFromNpm(npmPath);
  /** @type {string[]} */
  const pathDirs = [path.dirname(nodeBin)];

  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) pathDirs.push(path.join(appData, "npm"));
    const sysRoot = process.env.SystemRoot || process.env.WINDIR;
    if (sysRoot) pathDirs.push(path.join(sysRoot, "System32"));
  }

  /** @type {NodeJS.ProcessEnv} */
  const env = {
    PATH: pathDirs.join(path.delimiter),
    NODE: nodeBin,
    npm_node_execpath: nodeBin,
  };

  if (prefix) {
    env.npm_config_prefix = prefix;
    env.npm_config_global_prefix = prefix;
  }

  return env;
}

/**
 * @param {string} npmPath
 * @param {string[]} packages
 * @param {{ overrides?: string[], sideBySide?: boolean, dryRun?: boolean, verbose?: boolean, env?: NodeJS.ProcessEnv }} [opts]
 */
export async function runNpmGlobalInstall(npmPath, packages, opts = {}) {
  const sideBySide = opts.sideBySide ?? false;
  const prefix = sideBySide ? await npmGlobalBinDir(npmPath) : null;

  /** @type {string[]} */
  const args = ["install", "-g"];
  if (prefix) args.push("--prefix", prefix);
  args.push(...packages);
  for (const ovr of opts.overrides ?? []) {
    args.push("--override", ovr);
  }

  /** @type {NodeJS.ProcessEnv | undefined} */
  let installEnv;
  if (sideBySide && prefix) {
    installEnv = envForSideBySideGlobalInstall(npmPath, prefix);
  }

  return runNpm(npmPath, args, {
    dryRun: opts.dryRun,
    verbose: opts.verbose,
    env: installEnv ? { ...installEnv, ...opts.env } : opts.env,
  });
}

/**
 * @param {string} npmPath
 * @param {{ sideBySide?: boolean }} [opts]
 * @returns {Promise<string|null>}
 */
export async function resolveCavememBin(npmPath, opts = {}) {
  const shimName = process.platform === "win32" ? "cavemem.cmd" : "cavemem";

  const globalBin = await npmGlobalBinDir(npmPath);
  if (globalBin) {
    const bin = path.join(globalBin, shimName);
    if (pathExists(bin)) return bin;
  }

  const fallback = cavememBinFromNpm(npmPath);
  if (pathExists(fallback)) return fallback;

  if (process.platform === "win32") {
    for (const dir of win32SideBySideNpmPathDirs(opts)) {
      const shim = path.join(dir, shimName);
      if (pathExists(shim)) return shim;
    }
  }

  return cavememPackageEntry(npmPath, opts);
}

/**
 * Node binary for a Cavemem runtime (Node 20 side-by-side vs host).
 * @param {CavememRuntime} runtime
 * @returns {string}
 */
export function cavememNodeBin(runtime) {
  return runtime.usesNode20 ? nodeBinFromNpm(runtime.npm) : process.execPath;
}

/**
 * Run a cavemem CLI script (.js) or shim (.cmd on Windows).
 * @param {string} bin
 * @param {CavememRuntime} runtime
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, dryRun?: boolean, verbose?: boolean }} opts
 */
export async function runCavememBin(bin, runtime, args, opts) {
  if (/\.(js|mjs|cjs)$/i.test(bin)) {
    return run(cavememNodeBin(runtime), [bin, ...args], opts);
  }
  return run(bin, args, opts);
}

/**
 * @param {string} pkgJsonPath
 * @returns {string|null}
 */
function cavememEntryFromPkgJson(pkgJsonPath) {
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
 * @param {string} npmPath
 * @returns {Promise<string|null>}
 */
/**
 * @param {string} npmPath
 * @param {{ sideBySide?: boolean }} [opts]
 * @returns {Promise<string|null>}
 */
export async function cavememPackageEntry(npmPath, opts = {}) {
  const res = await runNpm(npmPath, ["root", "-g"], { verbose: false });
  if (res.code !== 0) return null;

  const entry = cavememEntryFromPkgJson(
    path.join(res.stdout.trim(), "cavemem", "package.json"),
  );
  if (entry) return entry;

  if (process.platform === "win32") {
    for (const dir of win32SideBySideNpmPathDirs(opts)) {
      const alt = cavememEntryFromPkgJson(
        path.join(dir, "node_modules", "cavemem", "package.json"),
      );
      if (alt) return alt;
    }
  }

  return null;
}

/**
 * @param {CavememRuntime} runtime
 * @param {string[]} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, dryRun?: boolean, verbose?: boolean }} [opts]
 */
export async function runCavememCli(runtime, args, opts = {}) {
  const { augmentPrereqPath } = await import("./detect.js");
  augmentPrereqPath();

  const sideBySide = runtime.usesNode20;
  const prefix = sideBySide ? await npmGlobalBinDir(runtime.npm) : null;
  const prefixFlag = prefix ? ` --prefix ${prefix}` : "";
  const line = `${runtime.npm} exec -g${prefixFlag} -- cavemem ${args.join(" ")}`;

  if (opts.dryRun) {
    console.log(`[dry-run] ${line}`);
    return { code: 0, stdout: "", stderr: "" };
  }

  if (opts.verbose) console.log(`> ${line}`);

  const env = sideBySide && prefix
    ? envForSideBySideGlobalInstall(runtime.npm, prefix)
    : await envWithNpmGlobalBin(runtime.npm);
  const mergedOpts = { ...opts, env: { ...env, ...opts.env } };

  /** @type {string[]} */
  const execArgs = ["exec", "-g"];
  if (prefix) execArgs.push("--prefix", prefix);
  execArgs.push("--", "cavemem", ...args);

  const res = await runNpm(runtime.npm, execArgs, mergedOpts);
  if (res.code === 0) return res;

  const bin = await resolveCavememBin(runtime.npm, { sideBySide });
  if (bin && pathExists(bin)) {
    return runCavememBin(bin, runtime, args, mergedOpts);
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
  const toolEnv = envForChildNodeTools({
    strict: process.platform === "win32",
    npmPath,
  });

  if (npmPath === "npm") {
    return run("npm", args, {
      ...opts,
      env: { ...toolEnv, ...opts.env },
    });
  }

  const nodeBin = nodeBinFromNpm(npmPath);
  const npmCli = npmCliFromNodeBin(nodeBin);
  const node20Env = envWithNode20First(npmPath);
  const mergedOpts = {
    ...opts,
    env: { ...toolEnv, ...node20Env, ...opts.env },
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
