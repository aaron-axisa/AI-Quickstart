import { parseArgs } from "node:util";
import { TOOL_IDS, getPreset, listPresetIds } from "./constants.js";
import { listPlatformIds } from "./platforms.js";

/**
 * @typedef {Object} CliOptions
 * @property {'install'|'uninstall'} action
 * @property {string|null} path
 * @property {string[]} tools
 * @property {string[]} platforms
 * @property {string|null} preset
 * @property {boolean} nonInteractive
 * @property {boolean} yes
 * @property {boolean} dryRun
 * @property {boolean} installPrerequisites
 * @property {boolean} verbose
 * @property {boolean} force
 * @property {boolean} uninstall
 * @property {boolean} cavemanWithInit
 * @property {boolean} cavemanMinimal
 * @property {boolean} cavemanForce
 * @property {boolean} cavemanGlobalUninstall
 * @property {boolean} karpathyMergeClaudeMd
 * @property {boolean} graphifyProject
 * @property {boolean} graphifyBuild
 * @property {boolean} graphifyPurge
 * @property {boolean} graphifyHooks
 * @property {boolean} graphifyMcp
 * @property {string[]} graphifyExtras
 * @property {string[]} skillsBundleSkills
 * @property {boolean} help
 */

/** @returns {CliOptions} */
export function parseCli(argv = process.argv.slice(2)) {
  const { values, tokens } = parseArgs({
    args: argv,
    options: {
      path: { type: "string" },
      tools: { type: "string" },
      platforms: { type: "string" },
      preset: { type: "string" },
      uninstall: { type: "boolean", default: false },
      "non-interactive": { type: "boolean", default: false },
      yes: { type: "boolean", short: "y", default: false },
      "dry-run": { type: "boolean", default: false },
      "install-prerequisites": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      "caveman-with-init": { type: "boolean" },
      "caveman-minimal": { type: "boolean", default: false },
      "caveman-force": { type: "boolean", default: false },
      "caveman-global-uninstall": { type: "boolean", default: false },
      "karpathy-merge-claude-md": { type: "boolean" },
      "graphify-project": { type: "boolean" },
      "graphify-build": { type: "boolean", default: false },
      "graphify-purge": { type: "boolean", default: false },
      "graphify-hooks": { type: "boolean", default: false },
      "graphify-mcp": { type: "boolean", default: false },
      "graphify-extras": { type: "string" },
      "skills-bundle-skills": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
    strict: true,
    tokens: true,
  });

  const positionals = tokens?.filter((t) => t.kind === "positional") ?? [];
  if (positionals.length) {
    throw new Error(`Unknown argument: ${positionals[0].value}`);
  }

  const pathValue = values.path?.trim() || null;
  let tools = parseCsv(values.tools, TOOL_IDS);
  const platforms = parseCsv(values.platforms, listPlatformIds());
  let skillsBundleSkills = parseCsv(values["skills-bundle-skills"], []);

  const presetId = values.preset?.trim().toLowerCase() || null;
  if (presetId) {
    const preset = getPreset(presetId);
    if (!preset) {
      throw new Error(
        `Unknown preset: ${presetId}. Valid: ${listPresetIds().join(", ")}`,
      );
    }
    if (!tools.length) tools = [...preset.tools];
    if (!skillsBundleSkills.length && preset.skillsBundleSkills) {
      skillsBundleSkills = [...preset.skillsBundleSkills];
    }
  }

  const cavemanWithInit =
    values["caveman-with-init"] ?? (pathValue ? true : false);
  const karpathyMergeClaudeMd = values["karpathy-merge-claude-md"] ?? true;
  const graphifyProject = values["graphify-project"] ?? true;

  return {
    action: values.uninstall ? "uninstall" : "install",
    path: pathValue,
    tools,
    platforms,
    preset: presetId,
    nonInteractive: values["non-interactive"],
    yes: values.yes,
    dryRun: values["dry-run"],
    installPrerequisites: values["install-prerequisites"],
    verbose: values.verbose,
    force: values.force,
    uninstall: values.uninstall,
    cavemanWithInit,
    cavemanMinimal: values["caveman-minimal"],
    cavemanForce: values["caveman-force"],
    cavemanGlobalUninstall: values["caveman-global-uninstall"],
    karpathyMergeClaudeMd,
    graphifyProject,
    graphifyBuild: values["graphify-build"],
    graphifyPurge: values["graphify-purge"],
    graphifyHooks: values["graphify-hooks"],
    graphifyMcp: values["graphify-mcp"],
    graphifyExtras: parseCsv(values["graphify-extras"], []),
    skillsBundleSkills,
    help: values.help,
  };
}

/**
 * @param {string|undefined} raw
 * @param {string[]} valid
 */
function parseCsv(raw, valid) {
  if (!raw) return [];
  const items = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!valid.length) return items;
  const validSet = new Set(valid);
  const bad = items.filter((i) => !validSet.has(i));
  if (bad.length) {
    throw new Error(
      `Invalid value(s): ${bad.join(", ")}. Valid: ${valid.join(", ")}`,
    );
  }
  return items;
}

export function printHelp() {
  console.log(`ai-quickstart — install or uninstall AI coding assistant tools in a repo

Usage:
  ai-quickstart [options]

Required (non-interactive):
  --path <dir>              Target repository path (never defaults to cwd)

Action:
  --uninstall               Remove selected tools from the repo (default: install)

Tool selection:
  --tools <csv>             caveman,karpathy,graphify,cavemem,speckit,skills-bundle
  --preset <name>           minimal|context|efficiency|full|spec-heavy (sets --tools)
  --platforms <csv>         cursor,claude,codex,opencode,windsurf,cline,copilot,gemini,aider

Modes:
  --non-interactive         Fail instead of prompting; skip review confirmation
  -y, --yes                 Auto-confirm review step (interactive only)
  --dry-run                 Print planned actions only
  --install-prerequisites   Attempt to install missing Node/Python/uv (install only)
  --verbose                 Show upstream output
  --force                   Force overwrite where supported

Caveman:
  --caveman-with-init       Repo-local rules (default: true when --path set)
  --caveman-minimal         Plugin only, no hooks
  --caveman-force           Re-run caveman installer
  --caveman-global-uninstall  Also remove user-level caveman hooks/plugins

Karpathy:
  --karpathy-merge-claude-md  Merge CLAUDE.md/AGENTS.md (default: true)

Graphify:
  --graphify-project        Project-scoped skill install (default: true)
  --graphify-build          Run initial AST graph build (install only)
  --graphify-hooks          Install post-commit graph refresh hook
  --graphify-mcp            Include graphifyy[mcp] extra
  --graphify-purge          Delete graphify-out/ on uninstall
  --graphify-extras <csv>   e.g. pdf,sql (mcp auto-added with --graphify-mcp)

Skills bundle:
  --skills-bundle-skills <csv>  grill-me,loop-factory,junior-to-senior,interface-kit

Examples:
  ai-quickstart --path ./my-app
  ai-quickstart --path ./my-app --preset full --platforms cursor --non-interactive -y
  ai-quickstart --path ./my-app --tools caveman,graphify,cavemem --platforms cursor --non-interactive
  ai-quickstart --path ./my-app --uninstall --tools graphify,karpathy --platforms cursor -y
`);
}

/**
 * @param {CliOptions} cli
 * @returns {import("./runner.js").RunConfig}
 */
export function cliToConfig(cli) {
  return {
    action: cli.action,
    repoPath: cli.path,
    tools: cli.tools,
    platforms: cli.platforms,
    dryRun: cli.dryRun,
    verbose: cli.verbose,
    force: cli.force || cli.cavemanForce,
    installPrerequisites: cli.installPrerequisites,
    caveman: {
      withInit: cli.cavemanWithInit,
      minimal: cli.cavemanMinimal,
      force: cli.cavemanForce || cli.force,
      globalUninstall: cli.cavemanGlobalUninstall,
    },
    karpathy: {
      mergeClaudeMd: cli.karpathyMergeClaudeMd,
    },
    graphify: {
      project: cli.graphifyProject,
      build: cli.graphifyBuild,
      extras: cli.graphifyExtras,
      purge: cli.graphifyPurge,
      hooks: cli.graphifyHooks,
      mcp: cli.graphifyMcp,
    },
    cavemem: {},
    speckit: {},
    skillsBundle: {
      skills: cli.skillsBundleSkills,
    },
  };
}

/** @param {CliOptions} cli */
export function needsInteractive(cli) {
  if (cli.nonInteractive) return false;
  return !cli.path || !cli.tools.length || !cli.platforms.length;
}

/** Skip review confirmation when automating via flags. */
export function shouldSkipReview(cli) {
  return cli.nonInteractive || cli.yes;
}
