# Karpathy Guidelines plugin

Fetches files from [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) (pinned ref in `src/constants.js`).

## Cursor

Writes `.cursor/rules/karpathy-guidelines.mdc` with `alwaysApply: true`.

## Claude-style agents

When `--karpathy-merge-claude-md` is set (default), merges upstream `CLAUDE.md` content into:

- `CLAUDE.md` for Claude Code
- `AGENTS.md` for Codex and similar agents

Uses idempotent marker blocks:

```html
<!-- ai-quickstart:karpathy-begin -->
...
<!-- ai-quickstart:karpathy-end -->
```

## Flags

| Flag | Effect |
|------|--------|
| `--karpathy-merge-claude-md` | Merge into CLAUDE.md/AGENTS.md (default: true) |
| `--force` | Overwrite existing cursor rule file |

## Prerequisites

None (HTTP fetch only).
