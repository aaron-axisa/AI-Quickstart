import { UPSTREAM } from "../constants.js";
import { platform as nodePlatform } from "node:os";

/** @param {string} [ref] */
export function speckitGitSource(ref = UPSTREAM.speckit.ref) {
  return `${UPSTREAM.speckit.gitUrl}@${ref}`;
}

/** @param {{ force?: boolean }} [opts] */
export function speckitInstallArgs(opts = {}) {
  const args = [
    "tool",
    "install",
    UPSTREAM.speckit.cliPackage,
    "--from",
    speckitGitSource(),
  ];
  if (opts.force) args.push("--force");
  return args;
}

/** @param {{ force?: boolean }} [opts] */
export function speckitInstallCommand(opts = {}) {
  const args = speckitInstallArgs(opts);
  return `uv ${args.join(" ")}`;
}

/**
 * uv on Windows fails when specify-cli Scripts are locked by a running process.
 * @param {string} text
 */
export function isSpecifyInstallLockError(text) {
  return /access is denied|os error 5|failed to remove directory/i.test(text);
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

/** Default Spec Kit script flavor for this OS (avoids interactive prompt when stdin is not a TTY). */
export function speckitScriptType() {
  return nodePlatform() === "win32" ? "ps" : "sh";
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
    "--script",
    speckitScriptType(),
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
