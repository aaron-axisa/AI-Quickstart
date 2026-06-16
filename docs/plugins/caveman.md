# Caveman plugin

Delegates to [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) unified installer.

## Command

```bash
npx -y github:JuliusBrussee/caveman -- \
  --only cursor --only claude \
  --with-init \
  --non-interactive
```

Runs with `cwd` set to the target repo so `--with-init` writes repo-local rules.

## Flags

| AI-Quickstart flag | Upstream effect |
|--------------------|-----------------|
| `--caveman-with-init` | `--with-init` |
| `--caveman-minimal` | `--minimal` |
| `--caveman-force` | `--force` |

## Prerequisites

Node.js >= 18.

## Uninstall

See [caveman INSTALL.md](https://github.com/JuliusBrussee/caveman/blob/main/INSTALL.md#uninstall).
