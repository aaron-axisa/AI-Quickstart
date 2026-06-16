# Graphify plugin

Installs [graphifyy](https://pypi.org/project/graphifyy/) and registers project-scoped skills via [safishamsi/graphify](https://github.com/safishamsi/graphify).

## Steps

1. `uv tool install graphifyy` (or `pipx install graphifyy` fallback)
2. Per platform: `graphify <platform> install --project` in target repo
3. Optional: `graphify update <path> --no-cluster` (AST-only, no API key)
4. Append `graphify-out/` to `.gitignore` (idempotent; skips if already ignored)

## Flags

| Flag | Effect |
|------|--------|
| `--graphify-project` | Pass `--project` to graphify install (default: true) |
| `--graphify-build` | Run initial AST graph build |
| `--graphify-extras <csv>` | Install extras e.g. `pdf,sql` → `graphifyy[pdf,sql]` |

## Prerequisites

- Python >= 3.10
- uv (recommended) or pipx

## Uninstall

```bash
graphify uninstall --project --platform cursor
uv tool uninstall graphifyy
```

See [graphify README](https://github.com/safishamsi/graphify) for full uninstall options.
