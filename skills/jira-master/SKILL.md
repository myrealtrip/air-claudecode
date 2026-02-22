---
name: jira-master
description: Jira ticket CRUD -- create, read, update, delete with interactive project/type/priority selection
context: fork
agent: jira-master
argument-hint: "[action] [PROJ-123] [details]"
---

# Jira Master

Routes to the jira-master agent for Jira ticket operations.

## Usage

```
/air-claudecode:jira-master <jira task>
```

## Capabilities
- Jira ticket CRUD (create, read, update, delete)
- Pre-fetches available projects, issue types, priorities from Jira
- Interactive selection via AskUserQuestion
- Uses Atlassian MCP tools (`mcp__mcp-atlassian__jira_*`)
- Requires user confirmation before all write operations
