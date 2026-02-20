---
name: jira-master
description: Jira ticket CRUD -- create, read, update, delete with interactive project/type/priority selection
argument-hint: "[action] [PROJ-123] [details]"
---

# Jira Master

Routes to the jira-master agent for Jira ticket operations.

## Usage

```
/air-claudecode:jira-master <jira task>
```

## Routing

```
Task(subagent_type="air-claudecode:jira-master", prompt="{{ARGUMENTS}}")
```

## Capabilities
- Jira ticket CRUD (create, read, update, delete)
- Pre-fetches available projects, issue types, priorities from Jira
- Interactive selection via AskUserQuestion
- Uses Atlassian MCP tools (`mcp__mcp-atlassian__jira_*`)
- Requires user confirmation before all write operations

Task: {{ARGUMENTS}}
