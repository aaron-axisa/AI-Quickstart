import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  needsSpacedNodeWorkaround,
  platformUsesSkillsInstall,
} from "../src/utils/caveman-windows.js";
import { envForChildNodeTools } from "../src/utils/node-runtime.js";
import path from "node:path";

describe("needsSpacedNodeWorkaround", () => {
  it("is true on Windows when execPath contains a space", () => {
    if (process.platform !== "win32") return;
    if (!process.execPath.includes(" ")) return;
    assert.equal(needsSpacedNodeWorkaround(), true);
  });

  it("is false when execPath has no spaces", () => {
    if (process.execPath.includes(" ")) return;
    assert.equal(needsSpacedNodeWorkaround(), false);
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

describe("envForChildNodeTools", () => {
  it("prepends active node directory to PATH on Windows", () => {
    if (process.platform !== "win32") return;
    const env = envForChildNodeTools();
    const first = (env.PATH || "").split(path.delimiter)[0];
    assert.equal(first, path.dirname(process.execPath));
    assert.equal(env.NODE, process.execPath);
  });
});
