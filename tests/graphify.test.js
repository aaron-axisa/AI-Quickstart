import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UPSTREAM } from "../src/constants.js";
import { resolveGraphifyPackageInstaller } from "../src/plugins/graphify.js";

/**
 * Mirrors graphifyPackageSpec from graphify plugin for unit testing.
 * @param {string[]} extras
 */
function graphifyPackageSpec(extras) {
  const pkg = UPSTREAM.graphify.package;
  if (!extras.length) return pkg;
  return `${pkg}[${extras.join(",")}]`;
}

/** @param {string} spec */
function graphifyUvInstallCommand(spec) {
  return `uv tool install ${spec}`;
}

describe("resolveGraphifyPackageInstaller", () => {
  it("uses uv in dry-run without spawning pipx", async () => {
    const installer = await resolveGraphifyPackageInstaller({ dryRun: true });
    assert.equal(installer.via, "uv");
    assert.equal(installer.cmd, "uv");
    assert.deepEqual(installer.argsFor("graphifyy"), ["tool", "install", "graphifyy"]);
  });
});

describe("graphify install command", () => {
  it("builds extras package spec without shell quotes", () => {
    assert.equal(graphifyPackageSpec(["pdf", "mcp"]), "graphifyy[pdf,mcp]");
    assert.equal(
      graphifyUvInstallCommand("graphifyy[pdf,mcp]"),
      "uv tool install graphifyy[pdf,mcp]",
    );
    assert.doesNotMatch(
      graphifyUvInstallCommand("graphifyy[pdf,mcp]"),
      /"/,
    );
  });
});
