import path from "node:path";
import fs from "node:fs";
import { getKarpathyTarget } from "./platform-maps/karpathy.js";
import { readFileIfExists } from "./utils/fs.js";

/** Caveman --with-init repo-local paths (relative to repo root). */
export const CAVEMAN_REPO_RULE_FILES = [
  ".cursor/rules/caveman.mdc",
  ".windsurf/rules/caveman.md",
  ".clinerules/caveman.md",
  ".github/copilot-instructions.md",
];

/** Caveman skill dirs under .agents/skills/ */
export const CAVEMAN_SKILL_DIRS = [
  "caveman",
  "caveman-commit",
  "caveman-review",
  "caveman-stats",
  "caveman-help",
  "caveman-compress",
  "cavecrew",
];

/** JuliusBrussee/skills bundle skill ids */
export const SKILLS_BUNDLE_DEFAULT = [
  "grill-me",
  "loop-factory",
  "junior-to-senior",
  "interface-kit",
];

/**
 * @param {string} repoPath
 * @param {string} rel
 */
export function repoFileExists(repoPath, rel) {
  return fs.existsSync(path.join(repoPath, rel));
}

/**
 * @param {import("./runner.js").RunConfig} config
 * @param {import("./platforms.js").PlatformDef} platform
 */
export function karpathyMergeTarget(config, platform) {
  const target = getKarpathyTarget(platform.id);
  if (target === "agents-md") {
    return path.join(config.repoPath, "AGENTS.md");
  }
  if (target === "claude-md") {
    return path.join(config.repoPath, "CLAUDE.md");
  }
  return null;
}

/**
 * @param {string} filePath
 */
export function hasKarpathyMarker(filePath) {
  const content = readFileIfExists(filePath);
  if (!content) return false;
  return content.includes("<!-- ai-quickstart:karpathy-begin -->");
}
