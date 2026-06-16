/** @type {Record<string, string|null>} platform id -> specify init --integration */
export const SPECKIT_INTEGRATION = {
  cursor: "cursor",
  claude: "claude",
  codex: "codex",
  opencode: "opencode",
  copilot: "copilot",
  gemini: "gemini",
  windsurf: null,
  cline: null,
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
 * @param {string} repoPath
 */
export function speckitInitCommand(platformId, repoPath) {
  const integration = getSpeckitIntegration(platformId);
  if (!integration) return null;
  return `specify init . --integration ${integration} --no-input`;
}
