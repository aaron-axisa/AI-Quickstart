import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCavemanOnly } from "../src/platform-maps/caveman.js";
import { getSkillsAgent } from "../src/platform-maps/skills.js";
import {
  platformUsesSkillsInstall,
  useNativeCavemanInstall,
} from "../src/utils/caveman-windows.js";
import { envForChildNodeTools } from "../src/utils/node-runtime.js";
import path from "node:path";

describe("useNativeCavemanInstall", () => {
  it("is true on Windows", () => {
    assert.equal(useNativeCavemanInstall(), process.platform === "win32");
  });
});

describe("platformUsesSkillsInstall", () => {
  it("uses skills path for cursor", () => {
    assert.equal(platformUsesSkillsInstall("cursor"), true);
  });

  it("uses native installer for claude", () => {
    assert.equal(platformUsesSkillsInstall("claude"), false);
  });
});

describe("aider profile mapping", () => {
  it("matches upstream aider-desk skills profile", () => {
    assert.equal(getCavemanOnly("aider"), "aider-desk");
    assert.equal(getSkillsAgent("aider"), "aider-desk");
  });
});

describe("copilot profile mapping", () => {
  it("matches upstream github-copilot skills profile", () => {
    assert.equal(getCavemanOnly("copilot"), "github-copilot");
    assert.equal(getSkillsAgent("copilot"), "github-copilot");
  });
});

describe("envForChildNodeTools", () => {
  it("prepends active node directory to PATH on Windows", () => {
    if (process.platform !== "win32") return;
    const env = envForChildNodeTools({ strict: true });
    const first = (env.PATH || "").split(path.delimiter)[0];
    assert.equal(first, path.dirname(process.execPath));
    assert.equal(env.NODE, process.execPath);
  });

  it("strict PATH is shorter than non-strict on Windows", () => {
    if (process.platform !== "win32") return;
    const parentPath = process.env.PATH || "";
    if (parentPath.split(path.delimiter).length < 3) return;

    const strict = envForChildNodeTools({ strict: true });
    const loose = envForChildNodeTools({ strict: false });
    const strictLen = (strict.PATH || "").split(path.delimiter).length;
    const looseLen = (loose.PATH || "").split(path.delimiter).length;
    assert.ok(strictLen < looseLen);
  });
});
