import * as p from "@clack/prompts";
import { cliToConfig, shouldSkipReview } from "./cli.js";
import { PRESETS } from "./constants.js";
import { SKILLS_BUNDLE_DEFAULT } from "./plan-helpers.js";
import { listPluginsByCategory } from "./plugins/index.js";
import { PLATFORMS } from "./platforms.js";
import { buildPreview } from "./runner.js";
import {
  checkPrerequisites,
  formatPrereqTable,
  hasBlockingPrereqs,
} from "./prereqs.js";
import { detectPlatform } from "./utils/detect.js";
import { validateRepoPath, isGitRepo } from "./utils/fs.js";

/**
 * @param {import("./cli.js").CliOptions} cli
 * @returns {Promise<import("./runner.js").RunConfig>}
 */
export async function runInteractive(cli) {
  p.intro("AI-Quickstart");

  let action = cli.action;
  if (!cli.uninstall && !cli.tools.length) {
    const mode = await p.select({
      message: "What would you like to do?",
      options: [
        { value: "install", label: "Install tools" },
        { value: "uninstall", label: "Uninstall tools" },
      ],
    });
    if (p.isCancel(mode)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    action = /** @type {'install'|'uninstall'} */ (mode);
  }

  let repoPath = cli.path;
  if (!repoPath) {
    const input = await p.text({
      message: "Target repository path (required)",
      placeholder: "/path/to/your/repo",
      validate: (v) => {
        if (!v?.trim()) return "Path is required";
        const r = validateRepoPath(v.trim());
        if (!r.ok) return r.error;
      },
    });
    if (p.isCancel(input)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    repoPath = String(input).trim();
  } else {
    const r = validateRepoPath(repoPath);
    if (!r.ok) throw new Error(r.error);
    repoPath = r.resolved;
  }

  if (!isGitRepo(repoPath)) {
    p.log.warn(`${repoPath} is not a git repository. Continuing anyway.`);
  }

  /** @type {import("./cli.js").CliOptions} */
  let mergedCli = {
    ...cli,
    action,
    uninstall: action === "uninstall",
    path: repoPath,
  };

  let tools = cli.tools;
  if (!tools.length) {
    if (action === "install") {
      const pickMode = await p.select({
        message: "How do you want to pick tools?",
        options: [
          { value: "preset", label: "Use a preset bundle" },
          { value: "custom", label: "Pick tools individually" },
        ],
      });
      if (p.isCancel(pickMode)) {
        p.cancel("Cancelled.");
        process.exit(0);
      }

      if (pickMode === "preset") {
        const presetId = await p.select({
          message: "Choose a preset",
          options: PRESETS.map((pr) => ({
            value: pr.id,
            label: pr.label,
            hint: pr.description,
          })),
        });
        if (p.isCancel(presetId)) {
          p.cancel("Cancelled.");
          process.exit(0);
        }
        const preset = PRESETS.find((pr) => pr.id === presetId);
        if (preset) {
          tools = [...preset.tools];
          if (preset.skillsBundleSkills) {
            mergedCli.skillsBundleSkills = [...preset.skillsBundleSkills];
          }
        }
      }
    }

    if (!tools.length) {
      const groups = listPluginsByCategory();
      const options = groups.flatMap(({ category, plugins: pls }) =>
        pls.map((pl) => ({
          value: pl.id,
          label: pl.label,
          hint: `[${category}] ${pl.description}`,
        })),
      );

      const selected = await p.multiselect({
        message:
          action === "uninstall"
            ? "Select tools to uninstall"
            : "Select tools to install",
        options,
        required: true,
      });
      if (p.isCancel(selected)) {
        p.cancel("Cancelled.");
        process.exit(0);
      }
      tools = /** @type {string[]} */ (selected);
    }
  }

  mergedCli.tools = tools;

  let platforms = cli.platforms;
  if (!platforms.length) {
    const detected = await Promise.all(
      PLATFORMS.map(async (pl) => ({
        ...pl,
        detected: await detectPlatform(pl),
      })),
    );

    const selected = await p.multiselect({
      message: "Select AI platforms",
      options: detected.map((pl) => ({
        value: pl.id,
        label: pl.label,
        hint: pl.detected ? "detected on this machine" : undefined,
      })),
      required: true,
    });
    if (p.isCancel(selected)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    platforms = /** @type {string[]} */ (selected);
  }

  mergedCli.platforms = platforms;

  if (action === "install" && tools.includes("caveman")) {
    const withInit = await p.confirm({
      message: "Caveman: install repo-local always-on rules?",
      initialValue: mergedCli.cavemanWithInit,
    });
    if (p.isCancel(withInit)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    mergedCli.cavemanWithInit = withInit;

    if (!mergedCli.cavemanForce) {
      const force = await p.confirm({
        message: "Caveman: force reinstall if already present?",
        initialValue: false,
      });
      if (!p.isCancel(force)) mergedCli.cavemanForce = force;
    }
  }

  if (action === "uninstall" && tools.includes("caveman")) {
    const globalUninstall = await p.confirm({
      message:
        "Caveman: also remove global hooks/plugins (user-level, not just this repo)?",
      initialValue: mergedCli.cavemanGlobalUninstall,
    });
    if (!p.isCancel(globalUninstall)) {
      mergedCli.cavemanGlobalUninstall = globalUninstall;
    }
  }

  if (action === "install" && tools.includes("karpathy")) {
    const merge = await p.confirm({
      message: "Karpathy: merge guidelines into CLAUDE.md / AGENTS.md?",
      initialValue: mergedCli.karpathyMergeClaudeMd,
    });
    if (!p.isCancel(merge)) mergedCli.karpathyMergeClaudeMd = merge;
  }

  if (action === "install" && tools.includes("skills-bundle")) {
    const skillOptions = [
      { value: "grill-me", label: "grill-me", hint: "Plan interrogation" },
      { value: "loop-factory", label: "loop-factory", hint: "Spec loop" },
      {
        value: "junior-to-senior",
        label: "junior-to-senior",
        hint: "Adversarial review",
      },
      { value: "interface-kit", label: "interface-kit", hint: "UI skills" },
    ];
    const initial =
      mergedCli.skillsBundleSkills.length > 0
        ? mergedCli.skillsBundleSkills
        : SKILLS_BUNDLE_DEFAULT;

    const skills = await p.multiselect({
      message: "Skills bundle: select skills to install",
      options: skillOptions,
      initialValues: initial,
      required: true,
    });
    if (!p.isCancel(skills)) {
      mergedCli.skillsBundleSkills = /** @type {string[]} */ (skills);
    }
  }

  if (tools.includes("graphify")) {
    if (action === "install") {
      const project = await p.confirm({
        message: "Graphify: project-scoped install (commit skills to repo)?",
        initialValue: mergedCli.graphifyProject,
      });
      if (!p.isCancel(project)) mergedCli.graphifyProject = project;

      const build = await p.confirm({
        message: "Graphify: run initial AST-only graph build (no API key)?",
        initialValue: mergedCli.graphifyBuild,
      });
      if (!p.isCancel(build)) mergedCli.graphifyBuild = build;

      const hooks = await p.confirm({
        message: "Graphify: install post-commit graph refresh hook?",
        initialValue: mergedCli.graphifyHooks,
      });
      if (!p.isCancel(hooks)) mergedCli.graphifyHooks = hooks;

      const mcp = await p.confirm({
        message: "Graphify: include MCP server extra?",
        initialValue: mergedCli.graphifyMcp,
      });
      if (!p.isCancel(mcp)) mergedCli.graphifyMcp = mcp;

      const extras = await p.multiselect({
        message: "Graphify optional extras (optional)",
        options: [
          { value: "pdf", label: "PDF extraction" },
          { value: "sql", label: "SQL schema extraction" },
          { value: "office", label: "Office documents" },
        ],
        required: false,
      });
      if (!p.isCancel(extras)) {
        mergedCli.graphifyExtras = /** @type {string[]} */ (extras);
      }
    } else {
      const purge = await p.confirm({
        message: "Graphify: delete graphify-out/ directory from repo?",
        initialValue: mergedCli.graphifyPurge,
      });
      if (!p.isCancel(purge)) mergedCli.graphifyPurge = purge;
    }
  }

  const config = cliToConfig(mergedCli);

  if (action === "install") {
    const prereqs = await checkPrerequisites(config.tools);
    p.log.info("Prerequisites:\n" + formatPrereqTable(prereqs));

    if (hasBlockingPrereqs(prereqs)) {
      const install = await p.confirm({
        message: "Install missing prerequisites automatically?",
        initialValue: cli.installPrerequisites,
      });
      if (p.isCancel(install)) {
        p.cancel("Cancelled.");
        process.exit(0);
      }
      if (install) {
        config.installPrerequisites = true;
      } else if (!cli.dryRun) {
        throw new Error(
          "Required prerequisites missing. Install manually or re-run with --install-prerequisites.",
        );
      }
    }
  }

  const preview = buildPreview(config);
  p.log.info("\n" + preview);

  if (!shouldSkipReview(cli)) {
    const verb = action === "uninstall" ? "uninstall" : "install";
    const confirm = await p.confirm({
      message: `Proceed with ${verb}?`,
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
  }

  p.outro(action === "uninstall" ? "Starting uninstall..." : "Starting install...");
  return config;
}
