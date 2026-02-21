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
- Pre-fetches labels, milestones, reviewers, assignees, branches from repo
- Always asks for target branch (main, develop, release/*)
- Auto-detects Jira ticket from branch name and links it
- Merge pre-check: CI status, review approval, conflicts
- Interactive selection via AskUserQuestion
- Uses `gh` CLI and optionally Atlassian MCP for Jira linking

## PR Body Template

When creating a PR, use this template for the body:

```markdown
## Summary
- [1-3 bullet points describing what this PR does]

## Changes
- [ ] Change 1
- [ ] Change 2

## Related
- Jira: [PROJ-123](https://{jira-host}/browse/PROJ-123)
- Issue: #{issue-number}

## Test Plan
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Edge cases verified

## Checklist
- [ ] Code follows team conventions
- [ ] No unnecessary changes included
- [ ] Self-reviewed before requesting review
```
