# Architecture

AI-Quickstart is a thin orchestrator. It does not vendor upstream tool files — each plugin delegates to the upstream project's native install path.

## Flow

```
install.sh / install.ps1
       │
       ▼
  bin/install.js
       │
       ├── interactive? → src/prompts.js (@clack/prompts)
       └── else         → src/cli.js (parseArgs)
       │
       ▼
  src/runner.js
       │
       ├── src/prereqs.js (check / install deps)
       └── src/plugins/*.js (in PLUGIN_ORDER)
```

## Plugin order

Install order is fixed in `src/constants.js`:

1. **karpathy** — static file fetch/merge (no deps on other plugins)
2. **caveman** — skills, rules, hooks via upstream installer
3. **skills-bundle** — JuliusBrussee/skills via `npx skills add`
4. **speckit** — global `specify-cli` + `specify init` in repo
5. **cavemem** — global npm CLI + `cavemem install --ide`
6. **graphify** — global CLI + project-scoped skill (optional graph build + hooks last)

## Plugin API

Each plugin exports:

```js
export const myPlugin = {
  id: "my-tool",
  label: "My Tool",
  description: "...",
  category: "behavior|context|memory|workflow|skills",
  url: "https://...",
  planInstall: (config) => [...PlanItem],
  planUninstall: (config) => [...PlanItem],
  install: async (config) => { ... return { tool, ok, summary }; },
  uninstall: async (config) => { ... return { tool, ok, summary }; },
};
```

### InstallConfig

| Field | Type | Description |
|-------|------|-------------|
| `repoPath` | string | Absolute path to target repo |
| `tools` | string[] | Selected tool ids |
| `platforms` | string[] | Selected platform ids |
| `dryRun` | boolean | Log commands only |
| `verbose` | boolean | Show subprocess output |
| `force` | boolean | Overwrite existing |
| `installPrerequisites` | boolean | Auto-install missing deps |
| `caveman` | object | `{ withInit, minimal, force }` |
| `karpathy` | object | `{ mergeClaudeMd }` |
| `graphify` | object | `{ project, build, extras, purge, hooks, mcp }` |
| `cavemem` | object | `{}` |
| `speckit` | object | `{}` |
| `skillsBundle` | object | `{ skills: string[] }` |

## Platform registry

`src/platforms.js` holds core platform ids, labels, and detection heuristics only.

Per-plugin command mappings live in `src/platform-maps/`:

- `caveman.js` — `--only` slug for caveman installer
- `graphify.js` — `graphify <cmd> install --project`
- `karpathy.js` — `cursor-rule` | `claude-md` | `agents-md` | `none`
- `cavemem.js` — `cavemem install --ide <value>`
- `speckit.js` — `specify init --integration <value>`
- `skills.js` — vercel-labs/skills agent slug

Detection heuristics (`detectCommand`, `detectPaths`) are best-effort for the interactive TUI "detected" hints.

Hook conflict warnings (`src/utils/hooks.js`) appear in the preview when caveman, graphify, or cavemem are selected.

## Prerequisites

`src/prereqs.js` runs before plugins:

| Id | Required when | Auto-install |
|----|---------------|--------------|
| node | always (20+ for cavemem) | winget / brew / fnm hint |
| python | graphify or speckit | winget / brew / apt hint |
| uv | graphify (recommended) or speckit (required) | astral install script |
| git | optional warning | manual only |

## Adding a platform

1. Add entry to `PLATFORMS` in `src/platforms.js`
2. Add mappings in each relevant `src/platform-maps/*.js` file
3. Update README platform matrix

## Security

- No telemetry
- Interactive mode confirms before running prerequisite install commands
- Karpathy files fetched from pinned GitHub ref in `src/constants.js`
- Caveman/graphify use latest upstream via npx/uv (document version bumps in CHANGELOG)
