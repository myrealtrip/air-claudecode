---
name: git-pr-master
description: GitHub PR CRUD -- create, review, update, merge, close with label/reviewer/milestone suggestions and Jira linking
context: fork
agent: git-pr-master
argument-hint: "[action] [PR-number] [details]"
---

# Git PR Master

Routes to the git-pr-master agent for GitHub pull request operations.

## Usage

```
/air-claudecode:git-pr-master <PR task>
```

## Capabilities
- GitHub PR CRUD (create, review, update, merge, close)
- Pre-fetches labels, milestones, reviewers, assignees, branches in a single Bash call
- Always asks for target branch (main, develop, release/*)
- Auto-detects Jira ticket from branch name and links it
- Merge pre-check: CI status, review approval, conflicts
- Interactive selection via AskUserQuestion
- Uses `gh` CLI and optionally Atlassian MCP for Jira linking

## Details

PR body template, confirmation flow, and all rules are defined in the agent (`agents/git-pr-master.md`).
