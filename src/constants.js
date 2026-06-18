/** Pinned upstream refs for reproducible fetches. */
export const UPSTREAM = {
  karpathy: {
    repo: "multica-ai/andrej-karpathy-skills",
    ref: "main",
    cursorRulePath: ".cursor/rules/karpathy-guidelines.mdc",
    claudeMdPath: "CLAUDE.md",
  },
  caveman: {
    repo: "JuliusBrussee/caveman",
  },
  graphify: {
    package: "graphifyy",
  },
  cavemem: {
    package: "cavemem",
    minNode: 20,
    maxNodeForNative: 22,
  },
  speckit: {
    gitUrl: "git+https://github.com/github/spec-kit.git",
    ref: "v0.10.3",
    cliPackage: "specify-cli",
  },
  skillsBundle: {
    repo: "JuliusBrussee/skills",
  },
};

export const TOOL_IDS = [
  "caveman",
  "karpathy",
  "graphify",
  "cavemem",
  "speckit",
  "skills-bundle",
];

export const PLUGIN_ORDER = [
  "karpathy",
  "caveman",
  "skills-bundle",
  "speckit",
  "cavemem",
  "graphify",
];

export const UNINSTALL_ORDER = [
  "graphify",
  "cavemem",
  "speckit",
  "skills-bundle",
  "caveman",
  "karpathy",
];

/**
 * @typedef {Object} PresetDef
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {string[]} tools
 * @property {string[]} [skillsBundleSkills]
 */

/** @type {PresetDef[]} */
export const PRESETS = [
  {
    id: "minimal",
    label: "Minimal",
    description: "Karpathy behavioral guidelines only",
    tools: ["karpathy"],
  },
  {
    id: "context",
    label: "Context",
    description: "Karpathy + Graphify for large codebases",
    tools: ["karpathy", "graphify"],
  },
  {
    id: "efficiency",
    label: "Efficiency",
    description: "Karpathy + Caveman + Graphify (token savings + context)",
    tools: ["karpathy", "caveman", "graphify"],
  },
  {
    id: "full",
    label: "Full stack",
    description: "All tools + grill-me & loop-factory skills",
    tools: ["karpathy", "caveman", "graphify", "cavemem", "speckit", "skills-bundle"],
    skillsBundleSkills: ["grill-me", "loop-factory"],
  },
  {
    id: "spec-heavy",
    label: "Spec-heavy",
    description: "Karpathy + Spec Kit + Graphify for greenfield work",
    tools: ["karpathy", "speckit", "graphify"],
  },
];

/** @param {string} id */
export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) ?? null;
}

export function listPresetIds() {
  return PRESETS.map((p) => p.id);
}
