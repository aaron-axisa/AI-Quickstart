import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  cavememNode20PrereqOk,
  getNode20InstallCommands,
  node20BinDirs,
  npmCliFromNodeBin,
  nodeBinFromNpm,
} from "../src/utils/node-runtime.js";
import {
  checkPrerequisites,
  formatPrereqTable,
  getUvInstallCommands,
  hasBlockingPrereqs,
} from "../src/prereqs.js";
import { uvBinCandidates } from "../src/utils/detect.js";

describe("cavememNode20PrereqOk", () => {
  it("passes when host Node is 22 or below", () => {
    assert.equal(cavememNode20PrereqOk(20, false), true);
    assert.equal(cavememNode20PrereqOk(22, false), true);
  });

  it("requires side-by-side Node 20 when host is 23+", () => {
    assert.equal(cavememNode20PrereqOk(23, false), false);
    assert.equal(cavememNode20PrereqOk(23, true), true);
  });
});

describe("getNode20InstallCommands", () => {
  it("returns platform-specific install commands", () => {
    const cmds = getNode20InstallCommands();
    assert.ok(cmds.length >= 1);
    assert.ok(cmds[0].length > 0);
  });
});

describe("node20BinDirs", () => {
  it("includes brew node@20 paths on darwin", () => {
    if (process.platform !== "darwin") return;
    const dirs = node20BinDirs();
    assert.ok(dirs.some((d) => d.includes("node@20")));
  });
});

describe("npmCliFromNodeBin", () => {
  it("returns null when npm-cli.js is absent", () => {
    assert.equal(npmCliFromNodeBin("/nonexistent/node"), null);
  });
});

describe("nodeBinFromNpm", () => {
  it("maps npm path to node binary", () => {
    if (process.platform === "win32") {
      assert.equal(
        nodeBinFromNpm("C:\\nvm\\v20.0.0\\npm.cmd"),
        "C:\\nvm\\v20.0.0\\node.exe",
      );
    } else {
      assert.equal(
        nodeBinFromNpm("/opt/homebrew/opt/node@20/bin/npm"),
        "/opt/homebrew/opt/node@20/bin/node",
      );
    }
  });
});

describe("getUvInstallCommands", () => {
  it("uses Astral install.ps1 on Windows", () => {
    if (process.platform !== "win32") return;
    const cmds = getUvInstallCommands();
    assert.match(cmds[0], /install\.ps1/);
    assert.doesNotMatch(cmds[0], /winget/);
    assert.match(cmds[1], /winget/);
  });

  it("uses curl install.sh on non-Windows", () => {
    if (process.platform === "win32") return;
    const cmds = getUvInstallCommands();
    assert.match(cmds[0], /install\.sh/);
  });
});

describe("uvBinCandidates", () => {
  it("includes uv.exe on Windows", () => {
    if (process.platform !== "win32") return;
    assert.ok(uvBinCandidates().some((p) => p.endsWith("uv.exe")));
  });

  it("includes .local/bin/uv on Unix", () => {
    if (process.platform === "win32") return;
    assert.ok(
      uvBinCandidates().some((p) => p.endsWith(path.join(".local", "bin", "uv"))),
    );
  });
});

describe("checkPrerequisites", () => {
  it("always includes node check", async () => {
    const results = await checkPrerequisites([]);
    const node = results.find((r) => r.id === "node");
    assert.ok(node);
    assert.equal(node.required, true);
  });

  it("includes python and uv when graphify selected", async () => {
    const results = await checkPrerequisites(["graphify"]);
    assert.ok(results.find((r) => r.id === "python"));
    assert.ok(results.find((r) => r.id === "uv"));
  });

  it("does not require python for karpathy only", async () => {
    const results = await checkPrerequisites(["karpathy"]);
    assert.ok(!results.find((r) => r.id === "python" && r.required));
  });

  it("includes node20-cavemem when cavemem selected on Node 23+", async () => {
    const hostMajor = Number(process.versions.node.split(".")[0]);
    const results = await checkPrerequisites(["cavemem"]);
    const node20 = results.find((r) => r.id === "node20-cavemem");
    if (hostMajor > 22) {
      assert.ok(node20);
      assert.equal(node20.required, true);
    } else {
      assert.equal(node20, undefined);
    }
  });
});

describe("formatPrereqTable", () => {
  it("formats results", () => {
    const text = formatPrereqTable([
      { id: "node", label: "Node", ok: true, detail: "20.0", required: true },
    ]);
    assert.match(text, /Node/);
    assert.match(text, /ok/);
  });
});

describe("hasBlockingPrereqs", () => {
  it("detects missing required deps", () => {
    assert.equal(
      hasBlockingPrereqs([
        { required: true, ok: false },
        { required: false, ok: false },
      ]),
      true,
    );
    assert.equal(
      hasBlockingPrereqs([{ required: true, ok: true }]),
      false,
    );
  });
});
