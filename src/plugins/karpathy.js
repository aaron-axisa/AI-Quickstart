import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { getKarpathyTarget } from "../platform-maps/karpathy.js";
import { resolvePlatforms } from "../platforms.js";
import {
  hasKarpathyMarker,
  karpathyMergeTarget,
  repoFileExists,
} from "../plan-helpers.js";
import {
  deleteFileIfExists,
  mergeMarkerBlock,
  readFileIfExists,
  removeMarkerBlock,
  writeFileEnsuringDir,
} from "../utils/fs.js";

const RAW_BASE = `https://raw.githubusercontent.com/${UPSTREAM.karpathy.repo}/${UPSTREAM.karpathy.ref}`;

/**
 * @param {string} remotePath
 */
async function fetchUpstream(remotePath) {
  const url = `${RAW_BASE}/${remotePath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planInstallKarpathy(config) {
  const platforms = resolvePlatforms(config.platforms);
  const items = [];

  for (const platform of platforms) {
    if (getKarpathyTarget(platform.id) === "cursor-rule") {
      const rel = ".cursor/rules/karpathy-guidelines.mdc";
      const full = path.join(config.repoPath, rel);
      const exists = repoFileExists(config.repoPath, rel);
      items.push({
        tool: "karpathy",
        description: exists && !config.force
          ? "Skip existing Cursor rule (use --force to overwrite)"
          : "Write Karpathy Cursor rule",
        path: full,
        exists,
        skip: exists && !config.force,
      });
    }
  }

  if (
    config.karpathy.mergeClaudeMd &&
    platforms.some((p) =>
      ["claude-md", "agents-md"].includes(getKarpathyTarget(p.id)),
    )
  ) {
    const seen = new Set();
    for (const platform of platforms) {
      const target = karpathyMergeTarget(config, platform);
      if (!target || seen.has(target)) continue;
      seen.add(target);
      items.push({
        tool: "karpathy",
        description: hasKarpathyMarker(target)
          ? "Update Karpathy marker block in instruction file"
          : "Merge Karpathy guidelines into instruction file",
        path: target,
        exists: Boolean(readFileIfExists(target)),
      });
    }
  }

  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planUninstallKarpathy(config) {
  const platforms = resolvePlatforms(config.platforms);
  const items = [];

  if (platforms.some((p) => getKarpathyTarget(p.id) === "cursor-rule")) {
    const rel = ".cursor/rules/karpathy-guidelines.mdc";
    const full = path.join(config.repoPath, rel);
    const exists = repoFileExists(config.repoPath, rel);
    items.push({
      tool: "karpathy",
      description: exists ? "Remove Karpathy Cursor rule" : "Cursor rule not present",
      path: full,
      exists,
      skip: !exists,
    });
  }

  const seen = new Set();
  for (const platform of platforms) {
    const target = karpathyMergeTarget(config, platform);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    const hasMarker = hasKarpathyMarker(target);
    items.push({
      tool: "karpathy",
      description: hasMarker
        ? "Remove Karpathy marker block from instruction file"
        : "No Karpathy marker block in instruction file",
      path: target,
      exists: hasMarker,
      skip: !hasMarker,
    });
  }

  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function installKarpathy(config) {
  const platforms = resolvePlatforms(config.platforms);
  const actions = [];

  for (const platform of platforms) {
    if (getKarpathyTarget(platform.id) === "cursor-rule") {
      const dest = path.join(
        config.repoPath,
        ".cursor",
        "rules",
        "karpathy-guidelines.mdc",
      );
      const existing = readFileIfExists(dest);
      if (existing && !config.force) {
        console.log(`[karpathy] ${dest} exists — skipping (use --force to overwrite)`);
        actions.push(`skipped ${dest}`);
        continue;
      }
      if (config.dryRun) {
        console.log(`[dry-run] fetch ${UPSTREAM.karpathy.cursorRulePath} -> ${dest}`);
        actions.push(`write ${dest}`);
        continue;
      }
      const content = await fetchUpstream(UPSTREAM.karpathy.cursorRulePath);
      writeFileEnsuringDir(dest, content, { dryRun: false });
      actions.push(`wrote ${dest}`);
    }
  }

  const needsClaudeMerge =
    config.karpathy.mergeClaudeMd &&
    platforms.some((p) =>
      ["claude-md", "agents-md"].includes(getKarpathyTarget(p.id)),
    );

  if (needsClaudeMerge) {
    const claudePlatforms = platforms.filter((p) =>
      ["claude-md", "agents-md"].includes(getKarpathyTarget(p.id)),
    );
    const useAgents = claudePlatforms.some(
      (p) => getKarpathyTarget(p.id) === "agents-md",
    );
    const targetFile = useAgents
      ? path.join(config.repoPath, "AGENTS.md")
      : path.join(config.repoPath, "CLAUDE.md");

    if (config.dryRun) {
      console.log(`[dry-run] merge karpathy into ${targetFile}`);
      actions.push(`merge ${targetFile}`);
    } else {
      const guidelines = await fetchUpstream(UPSTREAM.karpathy.claudeMdPath);
      const existing = readFileIfExists(targetFile) ?? "";
      const merged = mergeMarkerBlock(existing, "karpathy", guidelines);
      writeFileEnsuringDir(targetFile, merged, { dryRun: false });
      actions.push(`merged ${targetFile}`);
    }
  }

  console.log("\n[karpathy] Karpathy guidelines installed.");
  return {
    tool: "karpathy",
    ok: true,
    summary: actions.join("; ") || "karpathy guidelines",
  };
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function uninstallKarpathy(config) {
  const platforms = resolvePlatforms(config.platforms);
  const actions = [];

  if (platforms.some((p) => getKarpathyTarget(p.id) === "cursor-rule")) {
    const dest = path.join(
      config.repoPath,
      ".cursor",
      "rules",
      "karpathy-guidelines.mdc",
    );
    if (deleteFileIfExists(dest, { dryRun: config.dryRun })) {
      actions.push(`removed ${dest}`);
    }
  }

  const seen = new Set();
  for (const platform of platforms) {
    const target = karpathyMergeTarget(config, platform);
    if (!target || seen.has(target)) continue;
    seen.add(target);

    const existing = readFileIfExists(target);
    if (!existing || !existing.includes("<!-- ai-quickstart:karpathy-begin -->")) {
      continue;
    }

    if (config.dryRun) {
      console.log(`[dry-run] remove karpathy marker from ${target}`);
      actions.push(`clean ${target}`);
      continue;
    }

    const cleaned = removeMarkerBlock(existing, "karpathy");
    if (cleaned) {
      writeFileEnsuringDir(target, cleaned, { dryRun: false });
      actions.push(`cleaned ${target}`);
    } else {
      deleteFileIfExists(target, { dryRun: false });
      actions.push(`removed empty ${target}`);
    }
  }

  console.log("\n[karpathy] Karpathy guidelines removed.");
  return {
    tool: "karpathy",
    ok: true,
    summary: actions.join("; ") || "nothing to remove",
  };
}

export const karpathyPlugin = {
  id: "karpathy",
  label: "Karpathy Guidelines",
  description: "Behavioral guidelines to reduce LLM coding mistakes",
  category: "behavior",
  url: "https://github.com/multica-ai/andrej-karpathy-skills",
  install: installKarpathy,
  uninstall: uninstallKarpathy,
  planInstall: planInstallKarpathy,
  planUninstall: planUninstallKarpathy,
};
