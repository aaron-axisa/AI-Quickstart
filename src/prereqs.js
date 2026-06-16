import {
  getPlatform,
  getNodeVersion,
  getPythonVersion,
  hasUv,
  hasGit,
} from "./utils/detect.js";
import { runShell } from "./utils/exec.js";
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
  const needsGraphify = tools.includes("graphify");
  const needsSpeckit = tools.includes("speckit");
  const needsCavemem = tools.includes("cavemem");
  const needsPython = needsGraphify || needsSpeckit;
  const results = [];

  const node = await getNodeVersion();
  const minNode = needsCavemem ? UPSTREAM.cavemem.minNode : 18;
  results.push({
    id: "node",
    label: `Node.js >= ${minNode}`,
    ok: node !== null && node.major >= minNode,
    detail: node ? node.raw : "not found",
    required: true,
    installCommands: getNodeInstallCommands(),
  });

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

function getUvInstallCommands() {
  const os = getPlatform();
  if (os === "win32") return ["winget install astral-sh.uv"];
  return ["curl -LsSf https://astral.sh/uv/install.sh | sh"];
}

/**
 * @param {PrereqResult[]} results
 * @param {{ dryRun?: boolean, verbose?: boolean }} opts
 */
export async function installMissingPrerequisites(results, opts = {}) {
  const failed = results.filter((r) => r.required && !r.ok && r.installCommands);
  for (const r of failed) {
    const cmd = r.installCommands[0];
    if (cmd.startsWith("#")) continue;
    console.log(`Installing ${r.label}...`);
    const res = await runShell(cmd, opts);
    if (res.code !== 0) {
      throw new Error(
        `Failed to install ${r.label}. Run manually:\n  ${r.installCommands.join("\n  ")}`,
      );
    }
  }

  const uv = results.find((r) => r.id === "uv");
  if (uv && !uv.ok && uv.installCommands && !uv.required) {
    const cmd = uv.installCommands[0];
    console.log(`Installing ${uv.label}...`);
    await runShell(cmd, opts);
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
