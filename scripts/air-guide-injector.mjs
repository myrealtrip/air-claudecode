#!/usr/bin/env node

/**
 * UserPromptSubmit hook: injects air-project-guide when working in target air-* repos.
 * Fires on every prompt to survive context compression and repo switches.
 */

import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || join(__dirname, "..");
const INDEX_PATH = join(PLUGIN_ROOT, "reference", "air-project-guide", "index.md");

const TARGET_REPOS = [
  "air-console",
  "air-insurance",
  "air-international",
  "air-navigator",
  "air-notification",
  "air-pricing",
  "air-reconciliation",
];

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}

function isTargetRepo(cwd) {
  if (!cwd) return false;
  const parts = cwd.replace(/\\/g, "/").split("/");
  return parts.some((part) => TARGET_REPOS.includes(part));
}

async function main() {
  const input = await readStdin();
  let data;
  try {
    data = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const cwd = data.cwd || "";
  if (!isTargetRepo(cwd)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  let indexContent;
  try {
    indexContent = await readFile(INDEX_PATH, "utf-8");
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const guideRoot = join(PLUGIN_ROOT, "reference", "air-project-guide");
  const message = `[Air Project Guide] You are working in an air-* repo. Before writing code, consult the matched guide.\n\nGuide files are located at: ${guideRoot}\n\n${indexContent}`;

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: message,
      },
    })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
