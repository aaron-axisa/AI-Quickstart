import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseCli, cliToConfig, shouldSkipReview } from "../src/cli.js";
import { buildPlan } from "../src/plan.js";

describe("parseCli", () => {
  it("parses required flags for non-interactive mode", () => {
    const cli = parseCli([
      "--path",
      "/tmp/repo",
      "--tools",
      "caveman,karpathy",
      "--platforms",
      "cursor",
      "--non-interactive",
    ]);
    assert.equal(cli.path, "/tmp/repo");
    assert.deepEqual(cli.tools, ["caveman", "karpathy"]);
    assert.deepEqual(cli.platforms, ["cursor"]);
    assert.equal(cli.nonInteractive, true);
    assert.equal(cli.action, "install");
  });

  it("parses uninstall action", () => {
    const cli = parseCli([
      "--path",
      "/tmp/repo",
      "--tools",
      "graphify",
      "--platforms",
      "cursor",
      "--uninstall",
    ]);
    assert.equal(cli.action, "uninstall");
    assert.equal(cli.uninstall, true);
  });

  it("defaults caveman-with-init when path is set", () => {
    const cli = parseCli(["--path", "/tmp/repo"]);
    assert.equal(cli.cavemanWithInit, true);
  });

  it("rejects unknown tools", () => {
    assert.throws(
      () => parseCli(["--tools", "unknown"]),
      /Invalid value/,
    );
  });

  it("rejects unknown platforms", () => {
    assert.throws(
      () => parseCli(["--platforms", "not-a-platform"]),
      /Invalid value/,
    );
  });

  it("parses graphify extras", () => {
    const cli = parseCli([
      "--path",
      "/tmp",
      "--graphify-extras",
      "pdf,sql",
    ]);
    assert.deepEqual(cli.graphifyExtras, ["pdf", "sql"]);
  });

  it("parses preset flag", () => {
    const cli = parseCli([
      "--path",
      "/tmp/repo",
      "--preset",
      "efficiency",
      "--platforms",
      "cursor",
    ]);
    assert.deepEqual(cli.tools, ["karpathy", "caveman", "graphify"]);
  });

  it("parses graphify hooks and mcp", () => {
    const cli = parseCli([
      "--path",
      "/tmp",
      "--graphify-hooks",
      "--graphify-mcp",
    ]);
    assert.equal(cli.graphifyHooks, true);
    assert.equal(cli.graphifyMcp, true);
  });

  it("parses skills bundle skills", () => {
    const cli = parseCli([
      "--path",
      "/tmp",
      "--skills-bundle-skills",
      "grill-me,loop-factory",
    ]);
    assert.deepEqual(cli.skillsBundleSkills, ["grill-me", "loop-factory"]);
  });
});

describe("shouldSkipReview", () => {
  it("skips when non-interactive", () => {
    assert.equal(shouldSkipReview({ nonInteractive: true, yes: false }), true);
  });

  it("skips when --yes", () => {
    assert.equal(shouldSkipReview({ nonInteractive: false, yes: true }), true);
  });

  it("requires review otherwise", () => {
    assert.equal(shouldSkipReview({ nonInteractive: false, yes: false }), false);
  });
});

describe("cliToConfig", () => {
  it("maps cli options to install config", () => {
    const config = cliToConfig(
      parseCli([
        "--path",
        "/tmp/repo",
        "--tools",
        "graphify",
        "--platforms",
        "cursor",
        "--graphify-build",
      ]),
    );
    assert.equal(config.repoPath, "/tmp/repo");
    assert.equal(config.graphify.build, true);
    assert.equal(config.graphify.project, true);
    assert.equal(config.action, "install");
  });

  it("maps uninstall options", () => {
    const config = cliToConfig(
      parseCli([
        "--path",
        "/tmp/repo",
        "--tools",
        "karpathy",
        "--platforms",
        "cursor",
        "--uninstall",
        "--caveman-global-uninstall",
      ]),
    );
    assert.equal(config.action, "uninstall");
    assert.equal(config.caveman.globalUninstall, true);
  });
});

describe("buildPlan", () => {
  it("builds uninstall plan items", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aiqs-plan-"));
    try {
      const config = cliToConfig(
        parseCli([
          "--path",
          dir,
          "--tools",
          "karpathy",
          "--platforms",
          "cursor",
          "--uninstall",
        ]),
      );
      const plan = buildPlan(config);
      assert.ok(plan.some((p) => p.tool === "karpathy"));
      assert.ok(plan.some((p) => /cursor rule/i.test(p.description)));
    } finally {
      fs.rmSync(dir, { recursive: true });
    }
  });
});
