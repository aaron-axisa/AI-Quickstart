import path from "node:path";
import { UPSTREAM } from "../constants.js";
import { resolvePlatforms } from "../platforms.js";
import { getSkillsAgent, skillsSupportsPlatform } from "../platform-maps/skills.js";
import { SKILLS_BUNDLE_DEFAULT, repoFileExists } from "../plan-helpers.js";
import { runNpx } from "../utils/node-runtime.js";
import { deleteDirIfExists } from "../utils/fs.js";

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {string[]}
 */
function selectedSkills(config) {
  return config.skillsBundle.skills.length
    ? config.skillsBundle.skills
    : SKILLS_BUNDLE_DEFAULT;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @param {string} platformId
 * @param {string[]} skills
 */
function skillsAddArgs(platformId, skills) {
  const agent = getSkillsAgent(platformId);
  const args = ["-y", "skills", "add", UPSTREAM.skillsBundle.repo];
  for (const skill of skills) {
    args.push("--skill", skill);
  }
  if (agent) args.push("-a", agent);
  return args;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planInstallSkillsBundle(config) {
  const platforms = resolvePlatforms(config.platforms);
  const skills = selectedSkills(config);
  const items = [];

  for (const platform of platforms) {
    if (!skillsSupportsPlatform(platform.id)) {
      items.push({
        tool: "skills-bundle",
        description: `Skills CLI has no agent mapping for ${platform.label}`,
        skip: true,
      });
      continue;
    }
    items.push({
      tool: "skills-bundle",
      description: `Install skills [${skills.join(", ")}] for ${platform.label}`,
      command: `npx ${skillsAddArgs(platform.id, skills).join(" ")}`,
      path: config.repoPath,
    });
  }

  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 * @returns {import("../plan.js").PlanItem[]}
 */
export function planUninstallSkillsBundle(config) {
  const skills = selectedSkills(config);
  const items = [];

  for (const skill of skills) {
    const rel = `.agents/skills/${skill}`;
    const exists = repoFileExists(config.repoPath, rel);
    items.push({
      tool: "skills-bundle",
      description: exists
        ? `Remove skill directory ${skill}`
        : `Skill ${skill} not present`,
      path: path.join(config.repoPath, rel),
      exists,
      skip: !exists,
    });
  }

  items.push({
    tool: "skills-bundle",
    description: "Run npx skills remove for selected skills (best-effort)",
    command: `npx skills remove ${skills.join(" ")}`,
  });

  return items;
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function installSkillsBundle(config) {
  const platforms = resolvePlatforms(config.platforms);
  const skills = selectedSkills(config);
  const actions = [];

  for (const platform of platforms) {
    if (!skillsSupportsPlatform(platform.id)) {
      console.log(`[skills-bundle] Skipping ${platform.id} — no agent mapping`);
      continue;
    }
    const args = skillsAddArgs(platform.id, skills);
    console.log(`[skills-bundle] npx ${args.join(" ")} (cwd: ${config.repoPath})`);
    const r = await runNpx(args, {
      cwd: config.repoPath,
      dryRun: config.dryRun,
      verbose: config.verbose,
    });
    if (r.code !== 0 && !config.dryRun) {
      throw new Error(
        `skills add failed for ${platform.id}:\n${r.stderr || r.stdout}`,
      );
    }
    actions.push(`skills add for ${platform.id}`);
  }

  return {
    tool: "skills-bundle",
    ok: true,
    summary: actions.join("; ") || `skills: ${skills.join(", ")}`,
  };
}

/**
 * @param {import("../runner.js").RunConfig} config
 */
export async function uninstallSkillsBundle(config) {
  const skills = selectedSkills(config);
  const actions = [];

  for (const skill of skills) {
    const dir = path.join(config.repoPath, ".agents", "skills", skill);
    if (deleteDirIfExists(dir, { dryRun: config.dryRun })) {
      actions.push(`removed ${skill}`);
    }
  }

  const r = await runNpx(
    ["-y", "skills", "remove", ...skills],
    { cwd: config.repoPath, dryRun: config.dryRun, verbose: config.verbose },
  );
  if (r.code === 0 || config.dryRun) {
    actions.push("npx skills remove");
  }

  console.log("\n[skills-bundle] Skills removed.");
  return {
    tool: "skills-bundle",
    ok: true,
    summary: actions.join("; ") || "nothing to remove",
  };
}

export const skillsBundlePlugin = {
  id: "skills-bundle",
  label: "JuliusBrussee Skills",
  description: "grill-me, loop-factory, junior-to-senior, interface-kit",
  category: "skills",
  url: "https://github.com/JuliusBrussee/skills",
  install: installSkillsBundle,
  uninstall: uninstallSkillsBundle,
  planInstall: planInstallSkillsBundle,
  planUninstall: planUninstallSkillsBundle,
};
