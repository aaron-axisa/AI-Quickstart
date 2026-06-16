# Graph Report - AI-Quickstart  (2026-06-16)

## Corpus Check
- 75 files · ~23,434 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 448 nodes · 823 edges · 43 communities (40 shown, 3 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1daaa9fc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 42|Community 42]]

## God Nodes (most connected - your core abstractions)
1. `resolvePlatforms()` - 27 edges
2. `run()` - 15 edges
3. `validate()` - 14 edges
4. `repoFileExists()` - 14 edges
5. `checkPrerequisites()` - 13 edges
6. `runInteractive()` - 13 edges
7. `runAction()` - 13 edges
8. `AI-Quickstart` - 12 edges
9. `compress_file()` - 12 edges
10. `runShell()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Test-NodeVersion()` --calls--> `node`  [INFERRED]
  install.ps1 → package.json
- `planUninstallGraphify()` --calls--> `repoFileExists()`  [INFERRED]
  src/plugins/graphify.js → src/plan-helpers.js
- `installGraphify()` --calls--> `hasUv()`  [INFERRED]
  src/plugins/graphify.js → src/utils/detect.js
- `installGraphify()` --calls--> `run()`  [INFERRED]
  src/plugins/graphify.js → src/utils/exec.js
- `uninstallGraphify()` --calls--> `deleteDirIfExists()`  [INFERRED]
  src/plugins/graphify.js → src/utils/fs.js

## Import Cycles
- None detected.

## Communities (43 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (40): main(), cavemanPlugin, cavememPlugin, graphifyPlugin, getOrderedPlugins(), listPlugins(), listPluginsByCategory(), PLUGINS (+32 more)

### Community 1 - "Community 1"
Cohesion: 0.35
Nodes (10): getSkillsAgent(), SKILLS_AGENT, skillsSupportsPlatform(), installSkillsBundle(), planInstallSkillsBundle(), planUninstallSkillsBundle(), selectedSkills(), skillsAddArgs() (+2 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (27): Path, Path, main(), print_usage(), backup_dir_for(), build_compress_prompt(), build_fix_prompt(), call_claude() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (22): Path, Path, benchmark_pair(), count_tokens(), main(), print_table(), count_bullets(), extract_code_blocks() (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (30): CAVEMEM_IDE, cavememCommand(), cavememSupportsPlatform(), getCavememIde(), getGraphifyMap(), GRAPHIFY_MAP, graphifyInstallCommand(), graphifyUninstallCommand() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (20): Test-NodeVersion(), bin, ai-quickstart, dependencies, @clack/prompts, description, engines, node (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (16): checkPrerequisites(), getNodeInstallCommands(), getPythonInstallCommands(), getUvInstallCommands(), detectPlatform(), firstWorkingCommand(), getHome(), getNodeVersion() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (28): CAVEMAN_ONLY, getCavemanOnly(), getKarpathyTarget(), KARPATHY_TARGET, cavemanInstallCommand(), installCaveman(), planInstallCaveman(), planUninstallCaveman() (+20 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (15): AI-Quickstart, CLI reference, Contributing, License, Modes, Platform matrix, Quick start, Required (non-interactive) (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (13): Before / After, Benchmarks, How It Work, <img src="../../docs/assets/dancing-rock.svg" width="20" height="20" alt="rock"/> Caveman (285 tokens), Install, 📄 Original (706 tokens), Part of Caveman, Security (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (11): Boundaries, Caveman Compress, Compress, Compression Rules, Pattern, Preserve EXACTLY (never modify), Preserve Structure, Process (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.20
Nodes (9): Adding a platform, Architecture, Flow, InstallConfig, Platform registry, Plugin API, Plugin order, Prerequisites (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.20
Nodes (6): flagPath, fs, INDEPENDENT_MODES, path, root, VALID_MODES

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (8): cavemanRule, flagPath, fs, graphifyRule, graphPath, parts, path, root

### Community 14 - "Community 14"
Cohesion: 0.25
Nodes (7): Auth behavior, File size limit, Reporting a vulnerability, Security, Snyk High Risk Rating, What the skill does NOT do, What triggers the rating

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (7): Caveman Help, Configure Default Mode, Deactivate, Language, Modes, More, Skills

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (7): [0.1.0] - 2026-06-16, [0.2.0] - 2026-06-16, [0.3.0] - 2026-06-16, Added, Added, Added, Changelog

### Community 17 - "Community 17"
Cohesion: 0.25
Nodes (7): Adding a new tool (plugin), Code of conduct, Commit messages, Contributing to AI-Quickstart, Getting started, Pull request checklist, Questions

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (4): fs, graphPath, path, root

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (6): Auto-clarity (inherited), Chaining patterns, Output contracts, What NOT to do, When to use cavecrew vs alternatives, Why this exists (the real win)

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (5): cavecrew, Example chaining, How to invoke, See also, What it does

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): caveman-commit, Example output, How to invoke, See also, What it does

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (5): caveman-help, Example output, How to invoke, See also, What it does

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (5): caveman, Example output, How to invoke, See also, What it does

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): caveman-review, Example output, How to invoke, See also, What it does

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (5): Auto-Clarity, Boundaries, Intensity, Persistence, Rules

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (5): caveman-stats, Example output, How to invoke, See also, What it does

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (5): Attribution, Contributor Covenant Code of Conduct, Enforcement, Our Pledge, Our Standards

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (5): Caveman plugin, Command, Flags, Prerequisites, Uninstall

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (5): Flags, Graphify plugin, Prerequisites, Steps, Uninstall

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (5): Claude-style agents, Cursor, Flags, Karpathy Guidelines plugin, Prerequisites

### Community 31 - "Community 31"
Cohesion: 0.40
Nodes (4): Auto-Clarity, Boundaries, Examples, Rules

### Community 32 - "Community 32"
Cohesion: 0.40
Nodes (4): Auto-Clarity, Boundaries, Examples, Rules

### Community 33 - "Community 33"
Cohesion: 0.50
Nodes (3): Checklist, Summary, Test plan

## Knowledge Gaps
- **161 isolated node(s):** `Supported tools`, `Quick start`, `Requirements`, `Uninstall`, `Review before proceeding` (+156 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `resolvePlatforms()` connect `Community 4` to `Community 0`, `Community 1`, `Community 7`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `validate()` connect `Community 3` to `Community 2`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `run()` connect `Community 6` to `Community 1`, `Community 4`, `Community 7`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `resolvePlatforms()` (e.g. with `installCaveman()` and `planInstallCaveman()`) actually correct?**
  _`resolvePlatforms()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `run()` (e.g. with `installCaveman()` and `uninstallCaveman()`) actually correct?**
  _`run()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `repoFileExists()` (e.g. with `planInstallCaveman()` and `planUninstallCaveman()`) actually correct?**
  _`repoFileExists()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Supported tools`, `Quick start`, `Requirements` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._