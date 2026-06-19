import {
  augmentPrereqPath,
  getPlatform,
  getNodeVersion,
  getPythonVersion,
  hasUv,
  hasGit,
} from "./utils/detect.js";
import {
  getNode20InstallCommands,
  resolveCavememRuntime,
} from "./utils/node-runtime.js";
import { run, runShell } from "./utils/exec.js";
import { UPSTREAM } from "./constants.js";

/**
 * @typedef {Object} PrereqResult
 * @property {string} id
 * @property {string} label
 * @property {boolean} ok
 * @property {string} detail
 * @property {boolean} required
 * @property {string[]|null} installCommands
 */

/**
 * @param {string[]} tools
 * @returns {Promise<PrereqResult[]>}
 */
export async function checkPrerequisites(tools) {
  augmentPrereqPath();

  const needsGraphify = tools.includes("graphify");
  const needsSpeckit = tools.includes("speckit");
  const needsCavemem = tools.includes("cavemem");
  const needsPython = needsGraphify || needsSpeckit;
  const results = [];

  const node = await getNodeVersion();
  const hostMajor = Number(process.versions.node.split(".")[0]);
  const minNode = needsCavemem ? UPSTREAM.cavemem.minNode : 18;
  results.push({
    id: "node",
    label: `Node.js >= ${minNode}`,
    ok: node !== null && node.major >= minNode,
    detail: node ? node.raw : "not found",
    required: true,
    installCommands: getNodeInstallCommands(),
  });

  const maxNative = UPSTREAM.cavemem.maxNodeForNative ?? 22;
  if (needsCavemem && node && hostMajor > maxNative) {
    const runtime = await resolveCavememRuntime();
    results.push({
      id: "node20-cavemem",
      label: "Node 20 LTS (side-by-side, for Cavemem)",
      ok: runtime !== null,
      detail: runtime
        ? runtime.npm
        : `not found (Node ${node.raw} active)`,
      required: true,
      installCommands: getNode20InstallCommands(),
    });
  }

  if (needsPython) {
    const minPy = needsSpeckit ? "3.11" : "3.10";
    const py = await getPythonVersion();
    const pyOk =
      py !== null &&
      (py.major > 3 ||
        (py.major === 3 &&
          py.minor >= (needsSpeckit ? 11 : 10)));
    results.push({
      id: "python",
      label: `Python >= ${minPy}`,
      ok: pyOk,
      detail: py ? py.raw : "not found",
      required: true,
      installCommands: getPythonInstallCommands(),
    });

    const uvOk = await hasUv();
    results.push({
      id: "uv",
      label: needsSpeckit ? "uv (required for Spec Kit)" : "uv (recommended)",
      ok: uvOk,
      detail: uvOk ? "found" : "not found",
      required: needsSpeckit,
      installCommands: getUvInstallCommands(),
    });
  }

  const gitOk = await hasGit();
  results.push({
    id: "git",
    label: "git (recommended)",
    ok: gitOk,
    detail: gitOk ? "found" : "not found",
    required: false,
    installCommands: null,
  });

  return results;
}

function getNodeInstallCommands() {
  const os = getPlatform();
  if (os === "win32") return ["winget install OpenJS.NodeJS.LTS"];
  if (os === "darwin") return ["brew install node"];
  return [
    "curl -fsSL https://fnm.vercel.app/install | bash",
    "# or: https://nodejs.org",
  ];
}

function getPythonInstallCommands() {
  const os = getPlatform();
  if (os === "win32") return ["winget install Python.Python.3.12"];
  if (os === "darwin") return ["brew install python@3.12"];
  return ["sudo apt install python3 python3-pip", "# or use pyenv"];
}

/** User-level Windows uv install (no winget/admin). */
export const UV_INSTALL_PS1_COMMAND =
  'powershell -ExecutionPolicy Bypass -NoProfile -Command "irm https://astral.sh/uv/install.ps1 | iex"';

export function getUvInstallCommands() {
  const os = getPlatform();
  if (os === "win32") {
    return [
      UV_INSTALL_PS1_COMMAND,
      "# Admin alternative: winget install astral-sh.uv",
    ];
  }
  return ["curl -LsSf https://astral.sh/uv/install.sh | sh"];
}

/**
 * @param {{ dryRun?: boolean, verbose?: boolean }} opts
 */
export async function installUv(opts = {}) {
  if (getPlatform() === "win32") {
    if (opts.dryRun) {
      console.log("[dry-run] install uv via Astral install.ps1");
      augmentPrereqPath();
      return { code: 0, stdout: "", stderr: "" };
    }
    if (opts.verbose) {
      console.log(
        "> powershell.exe -ExecutionPolicy Bypass -NoProfile -Command irm https://astral.sh/uv/install.ps1 | iex",
      );
    }
    const res = await run(
      "powershell.exe",
      [
        "-ExecutionPolicy",
        "Bypass",
        "-NoProfile",
        "-Command",
        "irm https://astral.sh/uv/install.ps1 | iex",
      ],
      opts,
    );
    if (res.code !== 0) {
      throw new Error(
        `Failed to install uv. Run manually:\n  ${getUvInstallCommands().join("\n  ")}`,
      );
    }
    augmentPrereqPath();
    return res;
  }

  const cmd = getUvInstallCommands()[0];
  const res = await runShell(cmd, opts);
  if (res.code !== 0) {
    throw new Error(
      `Failed to install uv. Run manually:\n  ${getUvInstallCommands().join("\n  ")}`,
    );
  }
  augmentPrereqPath();
  return res;
}

/**
 * @param {PrereqResult[]} results
 * @param {{ dryRun?: boolean, verbose?: boolean }} opts
 */
export async function installMissingPrerequisites(results, opts = {}) {
  const failed = results.filter((r) => r.required && !r.ok && r.installCommands);
  for (const r of failed) {
    if (r.id === "uv") {
      console.log(`Installing ${r.label}...`);
      await installUv(opts);
      continue;
    }
    const commands = r.installCommands.filter((c) => !c.startsWith("#"));
    if (!commands.length) continue;
    console.log(`Installing ${r.label}...`);
    for (const cmd of commands) {
      const res = await runShell(cmd, opts);
      if (res.code !== 0) {
        throw new Error(
          `Failed to install ${r.label}. Run manually:\n  ${r.installCommands.join("\n  ")}`,
        );
      }
      augmentPrereqPath();
    }
  }

  const uv = results.find((r) => r.id === "uv");
  if (uv && !uv.ok && uv.installCommands && !uv.required) {
    console.log(`Installing ${uv.label}...`);
    await installUv(opts);
  }
}

/** @param {PrereqResult[]} results */
export function formatPrereqTable(results) {
  return results
    .map((r) => {
      const mark = r.ok ? "ok" : r.required ? "MISSING" : "optional";
      return `  [${mark}] ${r.label}: ${r.detail}`;
    })
    .join("\n");
}

/** @param {PrereqResult[]} results */
export function hasBlockingPrereqs(results) {
  return results.some((r) => r.required && !r.ok);
}
