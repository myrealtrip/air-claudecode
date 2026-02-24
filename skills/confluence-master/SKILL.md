---
name: confluence-master
description: Confluence page CRUD -- search, create, update, delete with space/label/attachment management
context: fork
agent: confluence-master
argument-hint: "[action] [page-title or page-id] [details]"
---

# Confluence Master

Routes to the confluence-master agent for Confluence page operations.

## Usage

```
/air-claudecode:confluence-master <confluence task>
```

## Capabilities
- Confluence page CRUD (search, create, update, delete)
- Comments, labels, and attachment management
- Page hierarchy navigation (child pages, history, views)
- Pre-fetches spaces and pages from Confluence
- Interactive selection via AskUserQuestion
- Uses Atlassian MCP tools (`mcp__mcp-atlassian__confluence_*`)
- Requires user confirmation before all write operations

## Content Generation

This skill does **not** generate page content. For drafting documentation or technical writing, use:

```
/air-claudecode:technical-writing
```

Then use this skill to publish the drafted content to Confluence.
