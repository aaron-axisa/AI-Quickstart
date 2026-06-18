/** @type {Record<string, string|null>} platform id -> cavemem --ide (null = Claude Code default) */
export const CAVEMEM_IDE = {
  cursor: "cursor",
  claude: null,
  codex: "codex",
  opencode: "opencode",
  gemini: "gemini-cli",
};

/** @param {string} platformId */
export function getCavememIde(platformId) {
  if (!(platformId in CAVEMEM_IDE)) return undefined;
  return CAVEMEM_IDE[platformId];
}

/** @param {string} platformId */
export function cavememSupportsPlatform(platformId) {
  return platformId in CAVEMEM_IDE;
}

/**
 * @param {string} platformId
 * @param {"install"|"uninstall"} action
 * @returns {string[]|null}
 */
export function cavememCliArgs(platformId, action = "install") {
  const ide = getCavememIde(platformId);
  if (ide === undefined) return null;
  const verb = action === "uninstall" ? "uninstall" : "install";
  if (ide === null) return [verb];
  return [verb, "--ide", ide];
}

/**
 * @param {string} platformId
 * @param {"install"|"uninstall"} action
 * @param {{ bin?: string }} [opts]
 */
export function cavememCommand(platformId, action = "install", opts = {}) {
  const args = cavememCliArgs(platformId, action);
  if (!args) return null;
  const bin = opts.bin ?? "cavemem";
  const quoted = bin.includes(" ") ? `"${bin}"` : bin;
  return `${quoted} ${args.join(" ")}`;
}
