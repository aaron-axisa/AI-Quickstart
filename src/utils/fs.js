import fs from "node:fs";
import path from "node:path";

/**
 * @param {string} inputPath
 * @returns {{ ok: true, resolved: string } | { ok: false, error: string }}
 */
export function validateRepoPath(inputPath) {
  if (!inputPath || !String(inputPath).trim()) {
    return { ok: false, error: "Path is required." };
  }
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    return { ok: false, error: `Path does not exist: ${resolved}` };
  }
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    return { ok: false, error: `Path is not a directory: ${resolved}` };
  }
  return { ok: true, resolved };
}

/** @param {string} dir */
export function isGitRepo(dir) {
  return fs.existsSync(path.join(dir, ".git"));
}

/**
 * @param {string} filePath
 * @param {string} content
 * @param {{ dryRun?: boolean }} opts
 */
export function writeFileEnsuringDir(filePath, content, opts = {}) {
  if (opts.dryRun) {
    console.log(`[dry-run] write ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Merge content between marker blocks (idempotent).
 * @param {string} existing
 * @param {string} blockName e.g. "karpathy"
 * @param {string} innerContent
 */
export function mergeMarkerBlock(existing, blockName, innerContent) {
  const begin = `<!-- ai-quickstart:${blockName}-begin -->`;
  const end = `<!-- ai-quickstart:${blockName}-end -->`;
  const block = `${begin}\n${innerContent.trim()}\n${end}`;

  const re = new RegExp(
    `${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`,
    "m",
  );
  if (re.test(existing)) {
    return existing.replace(re, block);
  }
  const trimmed = existing.trimEnd();
  if (!trimmed) return `${block}\n`;
  return `${trimmed}\n\n${block}\n`;
}

/** @param {string} s */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** @param {string} filePath */
export function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Remove marker block; returns null if file would be empty.
 * @param {string} existing
 * @param {string} blockName
 */
export function removeMarkerBlock(existing, blockName) {
  const begin = `<!-- ai-quickstart:${blockName}-begin -->`;
  const end = `<!-- ai-quickstart:${blockName}-end -->`;
  const re = new RegExp(
    `\\n?${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}\\n?`,
    "m",
  );
  const next = existing.replace(re, "").trim();
  return next.length ? `${next}\n` : null;
}

/**
 * @param {string} content
 * @param {string} pattern
 */
function gitignoreHasPattern(content, pattern) {
  const trimmed = pattern.trim().replace(/\/$/, "");
  return content.split("\n").some((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return false;
    const normalized = t.replace(/\/$/, "");
    return normalized === trimmed;
  });
}

/**
 * Idempotently append a marked block to .gitignore.
 * @param {string} repoPath
 * @param {string} blockName
 * @param {string} innerContent
 * @param {{ dryRun?: boolean }} opts
 * @returns {{ status: 'added'|'updated'|'skip', path: string }}
 */
export function ensureGitignoreBlock(repoPath, blockName, innerContent, opts = {}) {
  const gitignorePath = path.join(repoPath, ".gitignore");
  const existing = readFileIfExists(gitignorePath) ?? "";
  const begin = `<!-- ai-quickstart:${blockName}-begin -->`;

  for (const line of innerContent.split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && gitignoreHasPattern(existing, t)) {
      return { status: "skip", path: gitignorePath };
    }
  }

  const merged = mergeMarkerBlock(existing, blockName, innerContent);
  if (merged === existing) {
    return { status: "skip", path: gitignorePath };
  }

  if (opts.dryRun) {
    console.log(`[dry-run] update ${gitignorePath} (${blockName} block)`);
    return { status: existing ? "updated" : "added", path: gitignorePath };
  }

  if (!existing) {
    fs.writeFileSync(gitignorePath, `${merged}`, "utf8");
  } else {
    fs.writeFileSync(gitignorePath, merged, "utf8");
  }
  return { status: existing.includes(begin) ? "updated" : "added", path: gitignorePath };
}

/**
 * @param {string} filePath
 * @param {{ dryRun?: boolean }} opts
 */
export function deleteFileIfExists(filePath, opts = {}) {
  if (!fs.existsSync(filePath)) return false;
  if (opts.dryRun) {
    console.log(`[dry-run] delete ${filePath}`);
    return true;
  }
  fs.unlinkSync(filePath);
  return true;
}

/**
 * @param {string} dirPath
 * @param {{ dryRun?: boolean }} opts
 */
export function deleteDirIfExists(dirPath, opts = {}) {
  if (!fs.existsSync(dirPath)) return false;
  if (opts.dryRun) {
    console.log(`[dry-run] rm -rf ${dirPath}`);
    return true;
  }
  fs.rmSync(dirPath, { recursive: true, force: true });
  return true;
}
