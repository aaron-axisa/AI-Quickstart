import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  speckitGitSource,
  speckitInitCommand,
  speckitInstallCommand,
  speckitScriptType,
} from "../src/platform-maps/speckit.js";

describe("speckit platform map", () => {
  it("pins git source to release tag", () => {
    assert.equal(
      speckitGitSource(),
      "git+https://github.com/github/spec-kit.git@v0.10.3",
    );
  });

  it("builds uv install command with pinned tag", () => {
    assert.match(
      speckitInstallCommand(),
      /uv tool install specify-cli --from git\+https:\/\/github\.com\/github\/spec-kit\.git@v0\.10\.3/,
    );
  });

  it("maps cursor platform to cursor-agent integration", () => {
    const cmd = speckitInitCommand("cursor", "/tmp/repo");
    assert.match(cmd, /specify init --here --integration cursor-agent --force/);
    assert.match(cmd, new RegExp(`--script ${speckitScriptType()}`));
    assert.doesNotMatch(cmd, /--no-input/);
  });
});
