import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runAction } from "../../src/runner.js";
import { mergeMarkerBlock, removeMarkerBlock, validateRepoPath } from "../../src/utils/fs.js";
import { resolvePlatforms } from "../../src/platforms.js";

describe("validateRepoPath", () => {
  it("rejects missing path", () => {
    const r = validateRepoPath("/nonexistent/path/12345");
    assert.equal(r.ok, false);
  });

  it("accepts temp directory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aiqs-"));
    const r = validateRepoPath(dir);
    assert.equal(r.ok, true);
    fs.rmSync(dir, { recursive: true });
  });
});

describe("mergeMarkerBlock", () => {
  it("inserts new block", () => {
    const out = mergeMarkerBlock("", "karpathy", "guidelines");
    assert.match(out, /ai-quickstart:karpathy-begin/);
    assert.match(out, /guidelines/);
  });

  it("replaces existing block", () => {
    const existing = mergeMarkerBlock("before", "karpathy", "old");
    const out = mergeMarkerBlock(existing, "karpathy", "new");
    assert.match(out, /new/);
    assert.doesNotMatch(out, /old/);
    assert.match(out, /before/);
  });
});

describe("resolvePlatforms", () => {
  it("resolves known platforms", () => {
    const pl = resolvePlatforms(["cursor", "claude"]);
    assert.equal(pl.length, 2);
    assert.equal(pl[0].id, "cursor");
  });

  it("throws on unknown platform", () => {
    assert.throws(() => resolvePlatforms(["fake"]), /Unknown platform/);
  });
});

describe("removeMarkerBlock", () => {
  it("removes marker block content", () => {
    const merged = mergeMarkerBlock("hello", "karpathy", "guidelines");
    const cleaned = removeMarkerBlock(merged, "karpathy");
    assert.equal(cleaned, "hello\n");
  });
});

describe("runAction dry-run", () => {
  /** @returns {import("../../src/runner.js").RunConfig} */
  function baseConfig(dir, overrides = {}) {
    return {
      action: "install",
      repoPath: dir,
      tools: ["karpathy"],
      platforms: ["cursor"],
      dryRun: true,
      verbose: false,
      force: false,
      installPrerequisites: false,
      caveman: { withInit: true, minimal: false, force: false, globalUninstall: false },
      karpathy: { mergeClaudeMd: false },
      graphify: { project: true, build: false, extras: [], purge: false, hooks: false, mcp: false },
      cavemem: {},
      speckit: {},
      skillsBundle: { skills: [] },
      ...overrides,
    };
  }

  it("runs karpathy dry-run without network side effects for cursor skip path", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aiqs-dry-"));
    const results = await runAction(baseConfig(dir), { skipPlanPreview: true });
    assert.equal(results.length, 1);
    assert.equal(results[0].tool, "karpathy");
    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run caveman prints npx command", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aiqs-dry-"));
    const logs = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    try {
      await runAction(
        baseConfig(dir, {
          tools: ["caveman"],
          karpathy: { mergeClaudeMd: true },
        }),
        { skipPlanPreview: true },
      );
      const output = logs.join("\n");
      assert.match(output, /dry-run/);
      assert.match(output, /JuliusBrussee\/caveman/);
    } finally {
      console.log = orig;
      fs.rmSync(dir, { recursive: true });
    }
  });

  it("dry-run uninstall shows preview and graphify uninstall command", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aiqs-dry-"));
    const logs = [];
    const orig = console.log;
    console.log = (...args) => logs.push(args.join(" "));
    try {
      await runAction(
        baseConfig(dir, {
          action: "uninstall",
          tools: ["graphify"],
          graphify: { project: true, build: false, extras: [], purge: true },
        }),
        { skipPlanPreview: true },
      );
      const output = logs.join("\n");
      assert.match(output, /graphify cursor uninstall/);
    } finally {
      console.log = orig;
      fs.rmSync(dir, { recursive: true });
    }
  });
});
