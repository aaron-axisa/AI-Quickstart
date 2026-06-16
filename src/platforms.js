/**
 * Core platform registry — id, label, detection only.
 * Per-plugin command mappings live in src/platform-maps/.
 * @typedef {Object} PlatformDef
 * @property {string} id
 * @property {string} label
 * @property {string[]|string|null} [detectCommand]
 * @property {string[]|null} [detectPaths]
 */

/** @type {PlatformDef[]} */
export const PLATFORMS = [
  {
    id: "cursor",
    label: "Cursor",
    detectCommand: ["cursor", "code"],
    detectPaths: ["~/.cursor"],
  },
  {
    id: "claude",
    label: "Claude Code",
    detectCommand: "claude",
    detectPaths: ["~/.claude"],
  },
  {
    id: "codex",
    label: "Codex CLI",
    detectCommand: "codex",
    detectPaths: ["~/.codex"],
  },
  {
    id: "opencode",
    label: "OpenCode",
    detectPaths: ["~/.config/opencode"],
  },
  {
    id: "windsurf",
    label: "Windsurf",
    detectPaths: ["~/.codeium/windsurf"],
  },
  {
    id: "cline",
    label: "Cline",
    detectPaths: ["~/.cline"],
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    detectCommand: "gh",
    detectPaths: null,
  },
  {
    id: "gemini",
    label: "Gemini CLI",
    detectCommand: "gemini",
    detectPaths: ["~/.gemini"],
  },
  {
    id: "aider",
    label: "Aider",
    detectCommand: "aider",
    detectPaths: null,
  },
];

/** @param {string} id */
export function getPlatform(id) {
  return PLATFORMS.find((p) => p.id === id) ?? null;
}

/** @param {string[]} ids */
export function resolvePlatforms(ids) {
  const unknown = ids.filter((id) => !getPlatform(id));
  if (unknown.length) {
    throw new Error(
      `Unknown platform(s): ${unknown.join(", ")}. Valid: ${PLATFORMS.map((p) => p.id).join(", ")}`,
    );
  }
  return ids.map((id) => getPlatform(id)).filter(Boolean);
}

export function listPlatformIds() {
  return PLATFORMS.map((p) => p.id);
}
