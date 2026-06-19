import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  resolveHostNpm,
  win32NpmPathDirs,
  node20BinDirs,
} from "../src/utils/node-runtime.js";
import { augmentPrereqPath } from "../src/utils/detect.js";

describe("runCavememCli implementation", () => {
  it("does not invoke bare cavemem via runShell", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/utils/node-runtime.js"),
      "utf8",
    );
    assert.doesNotMatch(src, /runShell\s*\(\s*[`'"]cavemem/);
    assert.doesNotMatch(src, /runShell\s*\(\s*`cavemem\s/);
  });
});

describe("resolveHostNpm", () => {
  it("returns npm.cmd sibling on Windows when it exists", () => {
    if (process.platform !== "win32") return;
    const npmCmd = path.join(path.dirname(process.execPath), "npm.cmd");
    if (!fs.existsSync(npmCmd)) return;
    assert.equal(resolveHostNpm(), npmCmd);
  });

  it("returns npm string when no npm.cmd sibling", () => {
    if (process.platform === "win32") {
      const npmCmd = path.join(path.dirname(process.execPath), "npm.cmd");
      if (fs.existsSync(npmCmd)) return;
    }
    assert.equal(resolveHostNpm(), "npm");
  });
});

describe("win32NpmPathDirs", () => {
  it("includes APPDATA npm on Windows", () => {
    if (process.platform !== "win32") return;
    const appData = process.env.APPDATA;
    if (!appData) return;
    const dirs = win32NpmPathDirs();
    assert.ok(dirs.some((d) => d === path.join(appData, "npm")));
  });

  it("includes active node directory", () => {
    if (process.platform !== "win32") return;
    const dirs = win32NpmPathDirs();
    assert.ok(dirs.includes(path.dirname(process.execPath)));
  });
});

describe("augmentPrereqPath on Windows", () => {
  it("prepends APPDATA npm to PATH", () => {
    if (process.platform !== "win32") return;
    const appData = process.env.APPDATA;
    if (!appData) return;
    const target = path.join(appData, "npm");
    const before = process.env.PATH || "";
    augmentPrereqPath();
    const first = (process.env.PATH || "").split(path.delimiter)[0];
    assert.equal(first, target);
    process.env.PATH = before;
  });
});

describe("node20BinDirs on Windows", () => {
  it("includes win32 npm path dirs", () => {
    if (process.platform !== "win32") return;
    const winDirs = win32NpmPathDirs();
    const allDirs = node20BinDirs();
    for (const dir of winDirs) {
      assert.ok(allDirs.includes(dir));
    }
  });
});
