import { UPSTREAM } from "../constants.js";

/** @param {string} [ref] */
export function speckitGitSource(ref = UPSTREAM.speckit.ref) {
  return `${UPSTREAM.speckit.gitUrl}@${ref}`;
}

/** @returns {string[]} */
export function speckitInstallArgs() {
  return [
    "tool",
    "install",
    UPSTREAM.speckit.cliPackage,
    "--from",
    speckitGitSource(),
  ];
}

/** @returns {string} */
export function speckitInstallCommand() {
  const args = speckitInstallArgs();
  return `uv ${args.join(" ")}`;
}

/** @type {Record<string, string|null>} AI-Quickstart platform id -> specify --integration slug */
export const SPECKIT_INTEGRATION = {
  cursor: "cursor-agent",
  claude: "claude",
  codex: "codex",
  opencode: "opencode",
  copilot: "copilot",
  gemini: "gemini",
  windsurf: "windsurf",
  cline: "cline",
  aider: null,
};

/** @param {string} platformId */
export function getSpeckitIntegration(platformId) {
  if (!(platformId in SPECKIT_INTEGRATION)) return undefined;
  return SPECKIT_INTEGRATION[platformId];
}

/** @param {string} platformId */
export function speckitSupportsPlatform(platformId) {
  const v = getSpeckitIntegration(platformId);
  return v !== undefined && v !== null;
}

/**
 * @param {string} platformId
 * @returns {string[]|null}
 */
export function speckitInitArgs(platformId) {
  const integration = getSpeckitIntegration(platformId);
  if (!integration) return null;
  return [
    "init",
    "--here",
    "--integration",
    integration,
    "--force",
    "--ignore-agent-tools",
  ];
}

/**
 * @param {string} platformId
 * @param {string} _repoPath
 */
export function speckitInitCommand(platformId, _repoPath) {
  const args = speckitInitArgs(platformId);
  if (!args) return null;
  return `specify ${args.join(" ")}`;
}
