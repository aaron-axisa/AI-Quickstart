#!/usr/bin/env node
// beforeSubmitPrompt: track /caveman mode switches via project-local flag file.

const fs = require('fs');
const path = require('path');

const VALID_MODES = new Set([
  'lite', 'full', 'ultra', 'wenyan', 'wenyan-lite', 'wenyan-full', 'wenyan-ultra',
  'commit', 'review', 'compress', 'off',
]);
const INDEPENDENT_MODES = new Set(['commit', 'review', 'compress']);

const root = process.cwd();
const flagPath = path.join(root, '.cursor', '.caveman-active');

function safeWriteFlag(value) {
  fs.mkdirSync(path.dirname(flagPath), { recursive: true });
  fs.writeFileSync(flagPath, value, 'utf8');
}

function readFlag() {
  try {
    if (!fs.existsSync(flagPath)) return null;
    const mode = fs.readFileSync(flagPath, 'utf8').trim();
    return VALID_MODES.has(mode) ? mode : null;
  } catch {
    return null;
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { input += chunk; });
    process.stdin.on('end', () => resolve(input));
  });
}

readStdin().then((input) => {
  try {
    const data = JSON.parse(input || '{}');
    const prompt = (data.prompt || '').trim();
    const lower = prompt.toLowerCase();

    if (
      (/\b(activate|enable|turn on|start|talk like)\b.*\bcaveman\b/i.test(prompt) ||
        /\bcaveman\b.*\b(mode|activate|enable|turn on|start)\b/i.test(prompt) ||
        /\b(less tokens|fewer tokens|be brief|be terse|shorter answers)\b/i.test(prompt)) &&
      !/\b(stop|disable|turn off|deactivate)\b/i.test(prompt)
    ) {
      safeWriteFlag('full');
    }

    if (prompt.startsWith('/caveman')) {
      const parts = lower.split(/\s+/);
      const cmd = parts[0];
      const arg = parts[1] || '';

      let mode = null;
      if (cmd === '/caveman-commit') mode = 'commit';
      else if (cmd === '/caveman-review') mode = 'review';
      else if (cmd === '/caveman-compress') mode = 'compress';
      else if (cmd === '/caveman') {
        if (!arg) mode = 'full';
        else if (['off', 'stop', 'disable'].includes(arg)) mode = 'off';
        else if (arg === 'wenyan-full') mode = 'wenyan';
        else if (VALID_MODES.has(arg) && !INDEPENDENT_MODES.has(arg)) mode = arg;
      }

      if (mode && mode !== 'off') safeWriteFlag(mode);
      else if (mode === 'off') {
        try { fs.unlinkSync(flagPath); } catch {}
      }
    }

    if (
      /\b(stop|disable|deactivate|turn off)\b.*\bcaveman\b/i.test(prompt) ||
      /\bcaveman\b.*\b(stop|disable|deactivate|turn off)\b/i.test(prompt) ||
      /\bnormal mode\b/i.test(prompt)
    ) {
      try { fs.unlinkSync(flagPath); } catch {}
    }

    if (/^\/caveman-stats\b/.test(lower)) {
      process.stdout.write(JSON.stringify({
        continue: false,
        user_message: 'Use the caveman-stats skill output in chat; Cursor hook cannot inject stats here yet.',
      }));
      return;
    }

    readFlag();
    process.stdout.write(JSON.stringify({ continue: true }));
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
});
