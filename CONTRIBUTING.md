# Contributing to AI-Quickstart

Thanks for helping improve AI-Quickstart. This project orchestrates upstream installers — we delegate to [caveman](https://github.com/JuliusBrussee/caveman), [karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills), and [graphify](https://github.com/safishamsi/graphify) rather than vendoring their files.

## Getting started

```bash
git clone https://github.com/aaron-axisa/AI-Quickstart.git
cd AI-Quickstart
npm install
npm test
```

Run locally without publishing:

```bash
node bin/install.js --path /path/to/test-repo --dry-run
```

## Adding a new tool (plugin)

1. Create `src/plugins/<id>.js` implementing:
   - `id`, `label`, `description`, `category`, `url`
   - `planInstall(config)`, `planUninstall(config)`
   - `install(config)`, `uninstall(config)` async functions
2. Register in `src/plugins/index.js` and add to `PLUGIN_ORDER` / `UNINSTALL_ORDER` in `src/constants.js`
3. Add platform command mappings in `src/platform-maps/<id>.js` (not `platforms.js`)
4. Document in `docs/plugins/<id>.md` and README
5. Add dry-run test coverage

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the plugin API.

## Pull request checklist

- [ ] Changes are focused — no unrelated refactors
- [ ] `npm test` passes
- [ ] README / docs updated if CLI or behavior changed
- [ ] Dry-run tested on your OS if you changed install commands

## Commit messages

Use conventional commits:

- `feat: add support for X platform`
- `fix: handle missing uv on Windows`
- `docs: clarify --path requirement`

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Questions

Open a [GitHub Discussion](https://github.com/aaron-axisa/AI-Quickstart/discussions) or [Issue](https://github.com/aaron-axisa/AI-Quickstart/issues).
