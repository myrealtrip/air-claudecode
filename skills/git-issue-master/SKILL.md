---
name: git-issue-master
description: GitHub issue CRUD -- create, read, update, close with label/milestone/assignee suggestions and Jira linking
context: fork
agent: git-issue-master
argument-hint: "[action] [issue-number] [details]"
---

# Git Issue Master

Routes to the git-issue-master agent for GitHub issue operations.

## Usage

```
/air-claudecode:git-issue-master <issue task>
```

## Capabilities
- GitHub issue CRUD (create, read, update, close)
- Pre-fetches labels, milestones, assignees from repo
- Auto-detects Jira ticket from branch name and links it
- Interactive selection via AskUserQuestion
- Uses `gh` CLI and optionally Atlassian MCP for Jira linking
