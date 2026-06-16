#!/usr/bin/env bash
# AI-Quickstart — installer shim (forwards to bin/install.js).
#
# curl -fsSL https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.sh | bash
# curl -fsSL .../install.sh | bash -s -- --path /abs/path/to/repo

set -euo pipefail

REPO="aaron-axisa/AI-Quickstart"

if ! command -v node >/dev/null 2>&1; then
  echo "ai-quickstart: Node.js (>=18) required. Install:" >&2
  echo "  macOS:  brew install node" >&2
  echo "  Linux:  https://nodejs.org or nvm" >&2
  echo "  Windows: winget install OpenJS.NodeJS.LTS" >&2
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "ai-quickstart: Node $NODE_MAJOR too old. Need Node >=18." >&2
  exit 1
fi

here="$(cd "$(dirname "${BASH_SOURCE[0]:-}")" 2>/dev/null && pwd)" || here=""
if [ -n "$here" ] && [ -f "$here/bin/install.js" ]; then
  exec node "$here/bin/install.js" "$@"
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "ai-quickstart: npx required (ships with Node >=18)." >&2
  exit 1
fi

exec npx -y "github:$REPO" "$@"
