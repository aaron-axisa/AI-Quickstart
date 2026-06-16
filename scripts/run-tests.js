import { readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * @param {string} dir
 * @returns {string[]}
 */
function collectTestFiles(dir) {
  /** @type {string[]} */
  const files = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      files.push(...collectTestFiles(full));
    } else if (ent.name.endsWith(".test.js")) {
      files.push(full);
    }
  }
  return files;
}

const files = collectTestFiles("tests").sort();
if (!files.length) {
  console.error("No test files found under tests/");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...files], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
