/** @type {Record<string, string>} platform id -> caveman --only value */
export const CAVEMAN_ONLY = {
  cursor: "cursor",
  claude: "claude",
  codex: "codex",
  opencode: "opencode",
  windsurf: "windsurf",
  cline: "cline",
  copilot: "copilot",
  gemini: "gemini",
  aider: "aider",
};

/** @param {string} platformId */
export function getCavemanOnly(platformId) {
  return CAVEMAN_ONLY[platformId] ?? null;
}
