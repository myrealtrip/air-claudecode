# Slack MCP Installation Guide

Slack MCP is the official MCP server from Slack that enables reading channels, searching messages, and sending messages from Claude Code.

- Official site: https://slack.engineering/the-official-slack-mcp-server/
- Slack API docs: https://api.slack.com/docs/mcp

---

## Prerequisites

### Slack Workspace Access

You need an active Slack workspace account. The OAuth flow will request permissions scoped to your workspace.

> **Note:** Workspace admin approval may be required depending on your organization's app approval settings.

---

## Installation

Slack MCP uses the **HTTP transport with OAuth** -- no local installation or binary is needed. Claude Code connects directly to Slack's hosted MCP endpoint and handles authentication via OAuth.

---

## Claude Code Configuration

### Config File Location

```bash
# Global config (recommended for Slack)
~/.claude.json

# Project-level config
.mcp.json
```

### Add via CLI (Recommended)

```bash
claude mcp add slack \
  --transport http \
  --url https://mcp.slack.com/mcp \
  --oauth \
  --oauth-client-id "1601185624273.8899143856786" \
  --oauth-callback-port 3118
```

### Manual Configuration

Add the following to `~/.claude.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "slack": {
      "type": "http",
      "url": "https://mcp.slack.com/mcp",
      "oauth": {
        "clientId": "1601185624273.8899143856786",
        "callbackPort": 3118
      }
    }
  }
}
```

---

## OAuth Authentication

After adding the MCP server configuration:

1. Start (or restart) Claude Code
2. On the first Slack tool invocation, a browser window opens for OAuth authorization
3. Sign in to your Slack workspace and approve the requested permissions
4. The browser redirects to `localhost:3118` to complete the OAuth callback
5. Claude Code stores the token automatically -- no manual token management needed

> **Note:** If port `3118` is already in use, change `callbackPort` to another available port.

---

## Verify Installation

Check that the MCP server is properly connected:

```bash
claude mcp list
```

Expected output should include `slack` with status `connected` or `enabled`.

---

## Available Tools

Once connected, the following Slack tools become available:

| Tool | Description |
|---|---|
| `slack_read_channel` | Read recent messages from a channel |
| `slack_read_thread` | Read a specific thread |
| `slack_send_message` | Send a message to a channel |
| `slack_send_message_draft` | Draft a message for review before sending |
| `slack_schedule_message` | Schedule a message for later delivery |
| `slack_search_channels` | Search for channels by name |
| `slack_search_users` | Search for users by name |
| `slack_search_public` | Search public channel messages |
| `slack_search_public_and_private` | Search public and private channel messages |
| `slack_read_user_profile` | Read a user's profile |
| `slack_create_canvas` | Create a Slack canvas |
| `slack_read_canvas` | Read a Slack canvas |

---

## Troubleshooting

### OAuth Window Does Not Open

- Ensure Claude Code is running in a terminal with browser access
- Check that `localhost:3118` is not blocked by a firewall or VPN

### Token Expired or Revoked

Restart Claude Code -- the OAuth flow will re-trigger automatically on the next Slack tool invocation.

### Workspace Admin Approval Required

If your workspace restricts third-party app installations:

1. Contact your Slack workspace admin
2. Request approval for the **Claude Code MCP** integration
3. Retry the OAuth flow after approval

---

## References

- [Slack MCP Server Announcement](https://slack.engineering/the-official-slack-mcp-server/)
- [Slack API - MCP Docs](https://api.slack.com/docs/mcp)
- [Claude Code MCP Configuration](https://docs.anthropic.com/en/docs/claude-code/mcp)
