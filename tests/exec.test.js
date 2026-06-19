import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { run, resolveSpawnCommand } from "../src/utils/exec.js";
import {
  npxCliFromNodeBin,
  resolveHostNpm,
  runNpm,
  runNpx,
} from "../src/utils/node-runtime.js";
import { UPSTREAM } from "../src/constants.js";

describe("run() paths with spaces on Windows", () => {
  it("runs node.exe when execPath contains spaces", async () => {
    if (process.platform !== "win32") return;
    if (!process.execPath.includes(" ")) return;

    const r = await run(process.execPath, ["-p", "process.version"], {
      verbose: false,
    });
    assert.equal(r.code, 0);
    assert.match(r.stdout.trim(), /^v?\d+\.\d+\.\d+/);
  });

  it("runs resolveHostNpm() when npm.cmd path contains spaces", async () => {
    if (process.platform !== "win32") return;
    const npm = resolveHostNpm();
    if (npm === "npm" || !npm.includes(" ")) return;
    assert.ok(fs.existsSync(npm));

    const r = await runNpm(npm, ["-v"], { verbose: false });
    assert.equal(r.code, 0);
    assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("does not use shell:true for argv spawn", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/utils/exec.js"),
      "utf8",
    );
    assert.doesNotMatch(src, /shell:\s*process\.platform\s*===\s*["']win32["']/);
    assert.doesNotMatch(src, /shell:\s*true/);
  });

  it("does not use cmd /s /c with joined quoted line for .cmd files", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/utils/exec.js"),
      "utf8",
    );
    assert.doesNotMatch(src, /\/s.*\/c.*winCmdArg/);
    assert.doesNotMatch(src, /winCmdArg/);
    assert.match(src, /\[["']\/d["'],\s*["']\/c["'],\s*command,\s*\.\.\.args\]/);
  });

  it("resolves bare npx to npx.cmd beside node on Windows", () => {
    if (process.platform !== "win32") return;
    const npxCmd = path.join(path.dirname(process.execPath), "npx.cmd");
    if (!fs.existsSync(npxCmd)) return;
    assert.equal(resolveSpawnCommand("npx"), npxCmd);
  });

  it("runs bare npx on Windows", async () => {
    if (process.platform !== "win32") return;
    const npxCmd = path.join(path.dirname(process.execPath), "npx.cmd");
    if (!fs.existsSync(npxCmd)) return;

    const r = await run("npx", ["--version"], { verbose: false });
    assert.equal(r.code, 0);
    assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("runNpx uses npx-cli.js beside node when present", () => {
    if (process.platform !== "win32") return;
    const cli = npxCliFromNodeBin(process.execPath);
    if (!cli) return;
    assert.ok(fs.existsSync(cli));
    assert.match(cli, /npx-cli\.js$/);
  });

  it("runNpx --version via node+cli on Windows", async () => {
    if (process.platform !== "win32") return;
    if (!npxCliFromNodeBin(process.execPath)) return;

    const r = await runNpx(["--version"], { verbose: false });
    assert.equal(r.code, 0);
    assert.match(r.stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("runNpx with caveman-like args on Windows", async () => {
    if (process.platform !== "win32") return;
    if (!npxCliFromNodeBin(process.execPath)) return;

    const r = await runNpx(
      ["-y", `github:${UPSTREAM.caveman.repo}`, "--", "--help"],
      { verbose: false },
    );
    assert.equal(r.code, 0);
    assert.ok(r.stdout.length > 0 || r.stderr.length > 0);
  });
});
