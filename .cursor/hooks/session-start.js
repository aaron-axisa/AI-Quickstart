#!/usr/bin/env node
// SessionStart: activate caveman + reinforce graphify query-first behavior every session.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const flagPath = path.join(root, '.cursor', '.caveman-active');
const cavemanRule = path.join(root, '.cursor', 'rules', 'caveman.mdc');
const graphifyRule = path.join(root, '.cursor', 'rules', 'graphify.mdc');
const graphPath = path.join(root, 'graphify-out', 'graph.json');

fs.mkdirSync(path.dirname(flagPath), { recursive: true });
fs.writeFileSync(flagPath, 'full', 'utf8');

const parts = [];

parts.push(
  'CAVEMAN MODE ACTIVE (full). Respond terse like smart caveman. Technical substance stay. Only fluff die.'
);

if (fs.existsSync(cavemanRule)) {
  const body = fs.readFileSync(cavemanRule, 'utf8').replace(/^---[\s\S]*?---\s*/, '').trim();
  if (body) parts.push(body);
}

if (fs.existsSync(graphifyRule)) {
  const body = fs.readFileSync(graphifyRule, 'utf8').replace(/^---[\s\S]*?---\s*/, '').trim();
  if (body) parts.push(body);
} else {
  parts.push(
    'GRAPHIFY: Before Read/Grep/Glob/Shell codebase exploration, prefer graphify query/path/explain when graphify-out/graph.json exists.'
  );
}

if (fs.existsSync(graphPath)) {
  parts.push(
    'graphify-out/graph.json is present. Run graphify query "<question>" before grepping or reading source files for orientation.'
  );
} else {
  parts.push(
    'No graphify graph yet. Run `graphify .` from the repo root when you need codebase structure.'
  );
}

process.stdout.write(JSON.stringify({ additional_context: parts.join('\n\n') }));
