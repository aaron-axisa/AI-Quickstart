import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { run } from "../src/utils/exec.js";
import { resolveHostNpm, runNpm } from "../src/utils/node-runtime.js";

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
});
