import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ensureGitignoreBlock } from "../src/utils/fs.js";

describe("ensureGitignoreBlock", () => {
  it("creates .gitignore with graphify-out/", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aiqs-gi-"));
    try {
      const r = ensureGitignoreBlock(
        dir,
        "graphify",
        "# Graphify generated knowledge graph\ngraphify-out/",
      );
      assert.equal(r.status, "added");
      const content = fs.readFileSync(path.join(dir, ".gitignore"), "utf8");
      assert.match(content, /graphify-out\//);
      assert.match(content, /ai-quickstart:graphify-begin/);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("skips when graphify-out/ already present", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aiqs-gi-"));
    try {
      fs.writeFileSync(path.join(dir, ".gitignore"), "graphify-out/\n", "utf8");
      const r = ensureGitignoreBlock(
        dir,
        "graphify",
        "# Graphify generated knowledge graph\ngraphify-out/",
      );
      assert.equal(r.status, "skip");
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("respects dry-run", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aiqs-gi-"));
    try {
      const r = ensureGitignoreBlock(
        dir,
        "graphify",
        "# Graphify generated knowledge graph\ngraphify-out/",
        { dryRun: true },
      );
      assert.equal(r.status, "added");
      assert.equal(fs.existsSync(path.join(dir, ".gitignore")), false);
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
