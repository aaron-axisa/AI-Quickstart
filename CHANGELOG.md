# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] - 2026-06-16

### Added

- **Cavemem** plugin — cross-agent persistent memory (npm global + `cavemem install --ide`)
- **Spec Kit** plugin — GitHub spec-driven workflow (`specify-cli` + `specify init`)
- **Skills bundle** plugin — JuliusBrussee/skills (grill-me, loop-factory, etc.)
- TUI **preset bundles**: minimal, context, efficiency, full, spec-heavy
- `--preset` flag for non-interactive preset selection
- `--graphify-hooks` and `--graphify-mcp` Graphify extension flags
- Hook conflict warnings in install/uninstall preview
- Per-plugin platform command maps (`src/platform-maps/`)

## [0.2.0] - 2026-06-16

### Added

- `--uninstall` mode to remove caveman, karpathy, and graphify from a target repo
- Detailed install/uninstall **preview** before any changes run
- Review confirmation in interactive mode; skip with `--non-interactive` or `-y`
- `--graphify-purge` to delete `graphify-out/` on uninstall
- `--caveman-global-uninstall` for optional user-level caveman cleanup

## [0.1.0] - 2026-06-16

### Added

- Initial release: cross-platform Node.js CLI installer
- Interactive TUI (`@clack/prompts`) for tool/platform multi-select
- Non-interactive mode with full CLI flags
- Required `--path` for target repository (never defaults to cwd)
- Plugins: caveman, karpathy-guidelines, graphify
- Prerequisite checks for Node, Python, uv, git
- Optional `--install-prerequisites` for missing deps
- `--dry-run` mode
- Unified platform registry (cursor, claude, codex, opencode, windsurf, cline, copilot, gemini, aider)
- `install.sh` / `install.ps1` one-liner shims via `npx github:aaron-axisa/AI-Quickstart`
- Documentation: README, CONTRIBUTING, ARCHITECTURE, plugin docs
- GitHub Actions CI on ubuntu/macos/windows

[0.1.0]: https://github.com/aaron-axisa/AI-Quickstart/releases/tag/v0.1.0
