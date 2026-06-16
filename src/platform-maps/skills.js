/** vercel-labs/skills agent slug per platform id */
/** @type {Record<string, string|null>} */
export const SKILLS_AGENT = {
  cursor: "cursor",
  claude: "claude-code",
  codex: "codex",
  opencode: "opencode",
  windsurf: "windsurf",
  cline: "cline",
  copilot: "copilot",
  gemini: "gemini",
  aider: "aider",
};

/** @param {string} platformId */
export function getSkillsAgent(platformId) {
  if (!(platformId in SKILLS_AGENT)) return undefined;
  return SKILLS_AGENT[platformId];
}

/** @param {string} platformId */
export function skillsSupportsPlatform(platformId) {
  return getSkillsAgent(platformId) != null;
}
