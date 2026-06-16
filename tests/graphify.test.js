import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { UPSTREAM } from "../src/constants.js";

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
