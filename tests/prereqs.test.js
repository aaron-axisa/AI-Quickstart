import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkPrerequisites,
  formatPrereqTable,
  hasBlockingPrereqs,
} from "../src/prereqs.js";

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
