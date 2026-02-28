#!/usr/bin/env node

/**
 * PreToolUse hook: intercepts `git commit` Bash commands
 * and injects a reminder to confirm with user via AskUserQuestion first.
 */

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString();
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

  // Only check for git commit commands (not git commit --amend, etc. edge cases)
  const isGitCommit = /\bgit\s+commit\b/.test(command);

  if (!isGitCommit) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext:
          "MANDATORY: Before executing `git commit`, you MUST have already used `AskUserQuestion` to show the user the changed files and drafted commit message, and received explicit confirmation (e.g., user selected 'Commit'). If you have NOT done this yet, STOP this commit and ask the user first. Only proceed if the user has already confirmed.",
      },
    })
  );
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
