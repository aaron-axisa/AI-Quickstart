/** @type {Record<string, "cursor-rule"|"claude-md"|"agents-md"|"none">} */
export const KARPATHY_TARGET = {
  cursor: "cursor-rule",
  claude: "claude-md",
  codex: "agents-md",
  opencode: "agents-md",
  windsurf: "none",
  cline: "none",
  copilot: "none",
  gemini: "none",
  aider: "agents-md",
};

/** @param {string} platformId */
export function getKarpathyTarget(platformId) {
  return KARPATHY_TARGET[platformId] ?? "none";
}
