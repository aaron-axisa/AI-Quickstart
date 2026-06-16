/**
 * @typedef {Object} GraphifyPlatformMap
 * @property {string|null} cmd - graphify subcommand
 * @property {string|null} platformFlag - graphify install --platform value
 */

/** @type {Record<string, GraphifyPlatformMap>} */
export const GRAPHIFY_MAP = {
  cursor: { cmd: "cursor", platformFlag: null },
  claude: { cmd: "claude", platformFlag: null },
  codex: { cmd: "codex", platformFlag: null },
  opencode: { cmd: "opencode", platformFlag: null },
  windsurf: { cmd: null, platformFlag: "windsurf" },
  cline: { cmd: null, platformFlag: "cline" },
  copilot: { cmd: "copilot", platformFlag: null },
  gemini: { cmd: "gemini", platformFlag: null },
  aider: { cmd: "aider", platformFlag: null },
};

/** @param {string} platformId */
export function getGraphifyMap(platformId) {
  return GRAPHIFY_MAP[platformId] ?? null;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @param {string} platformId
 */
export function graphifyInstallCommand(config, platformId) {
  const m = getGraphifyMap(platformId);
  if (!m) return null;
  const projectFlag = config.graphify.project ? "--project" : "";
  if (m.cmd) {
    return `graphify ${m.cmd} install ${projectFlag}`.trim();
  }
  if (m.platformFlag) {
    return `graphify install --platform ${m.platformFlag} ${projectFlag}`.trim();
  }
  return null;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @param {string} platformId
 */
export function graphifyUninstallCommand(config, platformId) {
  const m = getGraphifyMap(platformId);
  if (!m) return null;
  const projectFlag = config.graphify.project ? "--project" : "";
  if (m.cmd) {
    return `graphify ${m.cmd} uninstall ${projectFlag}`.trim();
  }
  if (m.platformFlag) {
    return `graphify uninstall --platform ${m.platformFlag} ${projectFlag}`.trim();
  }
  return null;
}
