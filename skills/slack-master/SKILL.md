---
name: slack-master
description: Slack message CRUD -- read channels, search messages, send/schedule messages, manage canvases
context: fork
agent: slack-master
argument-hint: "[action] [channel-name or keyword] [details]"
---

# Slack Master

Routes to the slack-master agent for Slack operations.

## Usage

```
/air-claudecode:slack-master <slack task>
```

## Capabilities
- Read channel messages and threads
- Search messages across public/private channels
- Send, draft, and schedule messages
- Search channels and users
- Read user profiles
- Create and read Slack canvases
- Uses Slack MCP tools (`mcp__slack__slack_*`)
- Requires user confirmation before all write operations (send, schedule, create)
