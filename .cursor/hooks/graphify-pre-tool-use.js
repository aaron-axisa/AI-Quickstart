#!/usr/bin/env node
// preToolUse: nudge graphify before search/read exploration when graph.json exists.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const graphPath = path.join(root, 'graphify-out', 'graph.json');

const SOURCE_EXT_RE = /\.(py|js|ts|tsx|jsx|go|rs|java|rb|c|h|cpp|hpp|cc|cs|kt|swift|php|scala|lua|sh|md|rst|txt|mdx)\b/i;
const SEARCH_CMD_RE = /(?:^|\s)(?:grep|rg|ripgrep|find|fd|ack|ag)\b/i;

function readStdin() {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { input += chunk; });
    process.stdin.on('end', () => resolve(input));
  });
}

function allow() {
  process.stdout.write(JSON.stringify({ permission: 'allow' }));
}

function nudge(message) {
  process.stdout.write(JSON.stringify({
    permission: 'deny',
    agent_message: message,
    user_message: 'Graphify hook: use graphify query before raw file exploration.',
  }));
}

readStdin().then((input) => {
  try {
    if (!fs.existsSync(graphPath)) {
      allow();
      return;
    }

    const data = JSON.parse(input || '{}');
    const toolName = data.tool_name || '';
    const toolInput = data.tool_input || {};

    const msg =
      'MANDATORY: graphify-out/graph.json exists. Run `graphify query "<question>"` (or graphify path/explain) before grepping or reading source files. Only use Read/Grep/Glob after graphify orients you, or to modify/debug specific lines.';

    if (toolName === 'Shell') {
      const command = String(toolInput.command || '');
      if (SEARCH_CMD_RE.test(command)) {
        nudge(msg);
        return;
      }
    }

    if (toolName === 'Grep' || toolName === 'Glob') {
      nudge(msg);
      return;
    }

    if (toolName === 'Read') {
      const filePath = String(toolInput.path || toolInput.file_path || toolInput.target_file || '')
        .replace(/\\/g, '/')
        .toLowerCase();
      if (filePath.includes('graphify-out/')) {
        allow();
        return;
      }
      if (SOURCE_EXT_RE.test(filePath)) {
        nudge(msg);
        return;
      }
    }

    allow();
  } catch {
    allow();
  }
});
