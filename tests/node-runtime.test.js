import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  resolveHostNpm,
  win32NpmPathDirs,
  node20BinDirs,
  resolveCavememBin,
  runCavememBin,
  findNode20Npm,
  npmGlobalBinDir,
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

  it("uses npm prefix -g instead of removed npm bin -g", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/utils/node-runtime.js"),
      "utf8",
    );
    assert.match(src, /prefix", "-g"/);
    assert.doesNotMatch(src, /bin", "-g"/);
  });

  it("runCavememBin runs .js entry via node on Windows", async () => {
    if (process.platform !== "win32") return;
    const npm = await findNode20Npm();
    if (!npm) return;

    const bin = await resolveCavememBin(npm);
    if (!bin || !/\.js$/i.test(bin)) return;

    const runtime = { npm, bin, usesNode20: true };
    const r = await runCavememBin(bin, runtime, ["--version"], {
      verbose: false,
    });
    assert.equal(r.code, 0);
    assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("resolveCavememBin finds nvm-windows global shim when present", async () => {
    if (process.platform !== "win32") return;
    const npm = await findNode20Npm();
    if (!npm) return;

    const bin = await resolveCavememBin(npm);
    if (!bin) return;

    const nvmShim = process.env.NVM_SYMLINK
      ? path.join(process.env.NVM_SYMLINK, "cavemem.cmd")
      : null;
    if (nvmShim && fs.existsSync(nvmShim)) {
      assert.equal(bin, nvmShim);
      return;
    }

    assert.ok(fs.existsSync(bin));
  });

  it("npmGlobalBinDir uses prefix -g on Windows", async () => {
    if (process.platform !== "win32") return;
    const npm = await findNode20Npm();
    if (!npm) return;

    const dir = await npmGlobalBinDir(npm);
    assert.ok(dir);
    assert.ok(dir.length > 0);
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
