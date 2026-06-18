# AI-Quickstart

One-line installer for popular AI coding assistant tools. Point it at any repository, pick your tools and platforms, and go.

## Supported tools

| Tool | What it does | Upstream |
|------|--------------|----------|
| **Caveman** | Cuts ~75% of output tokens via terse caveman-speak | [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) |
| **Karpathy Guidelines** | Reduces LLM coding mistakes (think first, simplify, surgical edits) | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) |
| **Graphify** | Queryable knowledge graph for your codebase | [safishamsi/graphify](https://github.com/safishamsi/graphify) |
| **Cavemem** | Cross-agent persistent memory (local SQLite + MCP) | [JuliusBrussee/cavemem](https://github.com/JuliusBrussee/cavemem) |
| **Spec Kit** | Spec-driven development (`/speckit.*` commands) | [github/spec-kit](https://github.com/github/spec-kit) |
| **Skills bundle** | Planning & review skills (grill-me, loop-factory, …) | [JuliusBrussee/skills](https://github.com/JuliusBrussee/skills) |

## Quick start

**Interactive** (prompts for path, tools, platforms):

```bash
# macOS / Linux / WSL / Git Bash
curl -fsSL https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.sh | bash

# Windows — recommended (works with nvm-windows, full TTY)
npx.cmd -y github:aaron-axisa/AI-Quickstart

# Windows — alternate (run inside an open PowerShell window, not nested powershell -Command)
Set-ExecutionPolicy -Scope Process Bypass
irm https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.ps1 | iex
```

> **Do not use** `powershell -Command "irm ... | iex"` for interactive install — nested PowerShell has no TTY and the installer will exit immediately or appear hung. Use `npx.cmd` or `irm | iex` directly in your open PowerShell session.

> **Windows + flags:** `irm | iex` cannot pass `--path` etc. Use `npx.cmd` for non-interactive:
>
> ```powershell
> npx.cmd -y github:aaron-axisa/AI-Quickstart --path C:\path\to\repo --preset full --platforms cursor -y
> ```

**Preset bundle** (non-interactive):

```bash
curl -fsSL https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.sh | bash -s -- \
  --path "$HOME/projects/my-app" \
  --preset full \
  --platforms cursor \
  --non-interactive -y
```

Presets: `minimal` | `context` | `efficiency` | `full` | `spec-heavy`

**Non-interactive** (automation / CI):

```bash
curl -fsSL https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.sh | bash -s -- \
  --path "$HOME/projects/my-app" \
  --tools caveman,karpathy,graphify \
  --platforms cursor,claude \
  --caveman-with-init \
  --graphify-project \
  --install-prerequisites \
  --non-interactive
```

> **Security note:** Piping a script into your shell runs it sight-unseen. Review [`install.sh`](install.sh) first if you prefer: download it, read it, then run `bash install.sh`.

## Requirements

| Dependency | Required for | Minimum |
|------------|--------------|---------|
| Node.js | CLI + Caveman + Graphify | 18+ |
| Node.js | Cavemem | 20+ (host Node 23+ needs side-by-side Node 20 — installer handles this) |
| Python | Graphify + Spec Kit | 3.10+ (3.11+ for Spec Kit) |
| uv | Graphify + Spec Kit | any (required for Spec Kit) |
| git | recommended | any |

Use `--install-prerequisites` to attempt automatic installation of missing deps (with confirmation in interactive mode). When Cavemem is selected on **Node 23+**, this also installs **Node 20 side-by-side** (e.g. `brew install node@20`) — your default Node stays unchanged; only Cavemem uses Node 20.

## Uninstall

Remove project-scoped tool files from a repo:

```bash
curl -fsSL https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.sh | bash -s -- \
  --path "$HOME/projects/my-app" \
  --uninstall \
  --tools caveman,karpathy,graphify \
  --platforms cursor \
  --graphify-purge \
  --non-interactive
```

| Flag | Effect |
|------|--------|
| `--uninstall` | Remove instead of install |
| `--graphify-purge` | Delete `graphify-out/` from repo |
| `--caveman-global-uninstall` | Also remove user-level caveman hooks/plugins |

## Review before proceeding

Before install or uninstall runs, a **preview** lists every file and command that will change. You must confirm in interactive mode.

Skip the confirmation step with flags:

| Flag | Behavior |
|------|----------|
| `--non-interactive` | Show preview once, proceed without prompt (for CI/scripts) |
| `-y` / `--yes` | Auto-confirm in interactive mode |

If you pass all required flags interactively but omit both `--yes` and `--non-interactive`, the CLI prints the preview and exits — re-run with `-y` to confirm.

## CLI reference

### Required (non-interactive)

| Flag | Description |
|------|-------------|
| `--path <dir>` | Target repository. **Never defaults to current directory.** |

### Tool selection

| Flag | Description |
|------|-------------|
| `--tools <csv>` | `caveman,karpathy,graphify` |
| `--platforms <csv>` | `cursor,claude,codex,opencode,windsurf,cline,copilot,gemini,aider` |

### Modes

| Flag | Description |
|------|-------------|
| `--non-interactive` | Fail instead of prompting |
| `-y, --yes` | Auto-confirm summary |
| `--dry-run` | Print commands only |
| `--install-prerequisites` | Install missing Node/Python/uv; on Node 23+ with Cavemem, also installs side-by-side Node 20 |
| `--verbose` | Show upstream output |
| `--force` | Overwrite existing files where supported |

See `ai-quickstart --help` for plugin-specific flags.

## What changes in my repo?

Example after installing all three for Cursor:

```
your-repo/
├── .cursor/
│   ├── rules/
│   │   ├── caveman.mdc
│   │   ├── graphify.mdc
│   │   └── karpathy-guidelines.mdc
│   └── hooks.json              # if caveman/graphify install hooks
├── .agents/skills/             # caveman skills (Cursor)
├── AGENTS.md                   # optional karpathy merge
└── graphify-out/               # generated; added to .gitignore on install
```

Re-running is safe. Upstream installers are idempotent where possible.

## Platform matrix

| Platform | Caveman | Graphify | Karpathy |
|----------|---------|----------|----------|
| Cursor | skills + rules | `graphify cursor install --project` | `.cursor/rules/karpathy-guidelines.mdc` |
| Claude Code | plugin | `graphify claude install --project` | merge `CLAUDE.md` |
| Codex | skills | `graphify codex install --project` | merge `AGENTS.md` |
| Others | `--only <id>` | platform-specific | merge where applicable |

## Troubleshooting

**PowerShell execution policy / unsigned `npx.ps1` (nvm-windows)**

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
irm https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.ps1 | iex
```

Preferred on Windows: `npx.cmd -y github:aaron-axisa/AI-Quickstart` (no execution-policy issues).

**Installer appears hung / does nothing (Windows)**

Nested `powershell -Command "irm ... | iex"` has no interactive terminal. Use `npx.cmd` or run `irm | iex` in an already-open PowerShell window.

**Interactive mode needs a real terminal (TTY)**

- **macOS / Linux:** `curl ... | bash` is supported — `install.sh` re-attaches `/dev/tty` automatically. If you still see this error, run `bash install.sh` from a cloned repo or use non-interactive flags (below).
- **Windows:** use `npx.cmd -y github:aaron-axisa/AI-Quickstart` (not nested `powershell -Command`).
- **CI / headless:** no TTY available — pass flags via `bash -s --`:

```bash
curl -fsSL https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.sh | bash -s -- \
  --path "$PWD/my-app" \
  --preset full \
  --platforms cursor \
  --non-interactive -y
```

**`Invoke-Expression` / null Path error with `irm | iex`**

Fixed in current `install.ps1` — pull latest from `main`. Older shims called `Split-Path` on an empty path when the script runs from a pipe instead of a file.

**`graphify: command not found` after install**

Use `uv tool install graphifyy` instead of plain `pip`. Ensure `~/.local/bin` (Linux) or uv's bin dir is on PATH.

**Hook conflicts in `.cursor/hooks.json`**

Back up existing hooks before install. Caveman and Graphify upstream installers merge hook entries.

**Path required error**

Always pass `--path`. Interactive mode prompts if omitted.

**Cavemem on Node 23+ (`better-sqlite3` / `GetPrototype`)**

Cavemem depends on native `better-sqlite3`, which does not reliably build on Node 23+. The installer handles this automatically:

1. **Prerequisite check** — if Cavemem is selected and host Node is 23+, the prereq table shows `Node 20 LTS (side-by-side, for Cavemem)`.
2. **`--install-prerequisites`** — installs Node 20 alongside your current Node (`brew install node@20` on macOS, `nvm install 20` on Windows/Linux).
3. **Cavemem install** — runs only through Node 20 npm; hooks register the Node 20 binary. Host Node 23 unchanged.

Manual fallback:

```bash
brew install node@20          # macOS
nvm install 20                # nvm / nvm-windows
```

Skip Cavemem if you don't need persistent memory: omit from `--tools`.

**Note:** npm package `caveman` ≠ [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman). Use `npx -y github:JuliusBrussee/caveman` for the token-saving skill.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and PRs welcome on [GitHub Issues](https://github.com/aaron-axisa/AI-Quickstart/issues).

## License

Apache-2.0 — see [LICENSE](LICENSE).

Upstream tools have their own licenses (all MIT).
