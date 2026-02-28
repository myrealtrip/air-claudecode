#!/usr/bin/env node

/**
 * PreToolUse hook: intercepts `gh pr create` Bash commands.
 *
 * Interactive mode: blocks unless a one-time approval marker exists at /tmp/.air-pr-approved.
 * Auto mode (autopilot, ralph, ultrawork, etc.): allows PR creation without marker.
 *
 * Flow:
 *   1. AI uses AskUserQuestion to show merge direction, title, body, and get confirmation
 *   2. AI runs `touch /tmp/.air-pr-approved`
 *   3. AI runs `gh pr create`
 *   4. This hook sees the marker -> allows PR creation + deletes marker
 */

import { existsSync, unlinkSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MARKER_PATH = "/tmp/.air-pr-approved";

const AUTO_MODES = [
  "autopilot",
  "ralph",
  "ultrawork",
  "ultrapilot",
  "team",
  "pipeline",
];

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
}

function isAutoMode(cwd) {
  if (!cwd) return false;
  const statePath = join(cwd, ".omc", "state");
  try {
    const files = readdirSync(statePath);
    for (const file of files) {
      const matched = AUTO_MODES.some(
        (mode) => file === `${mode}-state.json`
      );
      if (!matched) continue;
      try {
        const content = JSON.parse(
          readFileSync(join(statePath, file), "utf-8")
        );
        if (content.active !== false) return true;
      } catch {
        // malformed state file — treat as inactive
      }
    }
  } catch {
    // .omc/state doesn't exist
  }
  return false;
}

function consumeMarker() {
  try {
    if (existsSync(MARKER_PATH)) {
      unlinkSync(MARKER_PATH);
      return true;
    }
  } catch {
    // marker check failed — treat as absent
  }
  return false;
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

  const toolInput = data.tool_input || {};
  const command = toolInput.command || "";

  const isGhPrCreate = /\bgh\s+pr\s+create\b/.test(command);

  if (!isGhPrCreate) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const cwd = data.cwd || "";

  // Auto mode: allow without interactive confirmation
  if (isAutoMode(cwd)) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Interactive mode: check for one-time approval marker
  if (consumeMarker()) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // No marker, no auto mode: block
  console.log(
    JSON.stringify({
      decision: "block",
      reason:
        "gh pr create가 차단되었습니다. 먼저 AskUserQuestion으로 merge direction(target ← source), PR 제목, 본문을 사용자에게 보여주고 확인을 받은 후, `touch /tmp/.air-pr-approved` 를 실행하고 다시 PR을 생성하세요.",
    })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
