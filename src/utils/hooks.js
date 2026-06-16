import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * @param {string} repoPath
 * @returns {string[]}
 */
export function detectHookConflicts(repoPath) {
  const warnings = [];

  const cursorHooks = path.join(repoPath, ".cursor", "hooks.json");
  if (fs.existsSync(cursorHooks)) {
    try {
      const content = fs.readFileSync(cursorHooks, "utf8");
      if (content.includes("hooks")) {
        warnings.push(
          `Existing ${cursorHooks} — caveman/graphify/cavemem may merge hook entries; back up first.`,
        );
      }
    } catch {
      warnings.push(`Existing ${cursorHooks} — review before install.`);
    }
  }

  const claudeSettings = path.join(
    os.homedir(),
    ".claude",
    "settings.json",
  );
  if (fs.existsSync(claudeSettings)) {
    try {
      const content = fs.readFileSync(claudeSettings, "utf8");
      if (content.includes("caveman") || content.includes("graphify") || content.includes("cavemem")) {
        warnings.push(
          `~/.claude/settings.json already references AI tool hooks — cavemem install may replace hook arrays.`,
        );
      } else if (content.includes("hooks")) {
        warnings.push(
          `~/.claude/settings.json has hooks — cavemem/caveman may merge; back up first.`,
        );
      }
    } catch {
      // ignore read errors
    }
  }

  return warnings;
}
