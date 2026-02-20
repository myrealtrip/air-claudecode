# MCP Atlassian Installation Guide

MCP Atlassian is an MCP server that enables using Jira and Confluence from Claude Code.

- Official docs: https://personal-1d37018d.mintlify.app/docs/installation
- GitHub repository: https://github.com/sooperset/mcp-atlassian

---

## Prerequisites

### 1. Generate API Token

Atlassian Cloud users need an API token:

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Enter a token name and create
4. Copy the generated token to a safe location

> **Note:** Data Center / Server users should use a **Personal Access Token (PAT)** instead.

### 2. Verify Python Installation

```bash
python3 --version
```

> **Note:** Python 3.14 is not supported due to compatibility issues. Python 3.12 is recommended.

---

## Installation

### uvx (Recommended)

Runs directly without permanent installation. Downloads automatically on first run.

```bash
uvx mcp-atlassian
```

### pip

```bash
pip install mcp-atlassian
```

### Docker

```bash
docker run --env-file .env ghcr.io/sooperset/mcp-atlassian:latest
```

---

## Verify Installation

Check that the MCP server is properly connected in Claude Code:

```bash
claude mcp list
```

---

## Claude Code Configuration

### Config File Location

```bash
# Project-level config
.mcp.json

# Global config
~/.claude.json
```

### Jira Cloud + Confluence Cloud

```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "env": {
        "JIRA_URL": "https://your-company.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "your_api_token",
        "CONFLUENCE_URL": "https://your-company.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your.email@company.com",
        "CONFLUENCE_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

> **Note:** For Python 3.14 environments, change args to `["--python=3.12", "mcp-atlassian"]`.

### Jira Only

```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "env": {
        "JIRA_URL": "https://your-company.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

### Confluence Only

```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "env": {
        "CONFLUENCE_URL": "https://your-company.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your.email@company.com",
        "CONFLUENCE_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

### Data Center / Server

Use a Personal Access Token instead of Cloud authentication variables.

```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "env": {
        "JIRA_URL": "https://jira.your-company.com",
        "JIRA_PERSONAL_TOKEN": "your_personal_access_token",
        "CONFLUENCE_URL": "https://confluence.your-company.com",
        "CONFLUENCE_PERSONAL_TOKEN": "your_personal_access_token"
      }
    }
  }
}
```

> **Note:** For self-signed certificates, add `"JIRA_SSL_VERIFY": "false"`.

---

## Environment Variables Reference

### Authentication

| Variable | Description | Target |
|---|---|---|
| `JIRA_URL` | Jira server URL | All |
| `JIRA_USERNAME` | Jira login email | Cloud |
| `JIRA_API_TOKEN` | Jira API token | Cloud |
| `JIRA_PERSONAL_TOKEN` | Jira PAT | Data Center / Server |
| `CONFLUENCE_URL` | Confluence server URL | All |
| `CONFLUENCE_USERNAME` | Confluence login email | Cloud |
| `CONFLUENCE_API_TOKEN` | Confluence API token | Cloud |
| `CONFLUENCE_PERSONAL_TOKEN` | Confluence PAT | Data Center / Server |

### Filtering / Security

| Variable | Description |
|---|---|
| `JIRA_PROJECTS_FILTER` | Restrict accessible Jira projects |
| `CONFLUENCE_SPACES_FILTER` | Restrict accessible Confluence spaces |
| `ENABLED_TOOLS` | Restrict enabled tools |
| `READ_ONLY_MODE` | Set to `true` for read-only mode |
| `JIRA_SSL_VERIFY` | Set to `false` to disable SSL verification |

### Proxy

| Variable | Description |
|---|---|
| `HTTP_PROXY` | HTTP proxy |
| `HTTPS_PROXY` | HTTPS proxy |
| `SOCKS_PROXY` | SOCKS proxy |

### Debugging

| Variable | Description |
|---|---|
| `MCP_VERBOSE` | Enable verbose logging |
| `MCP_VERY_VERBOSE` | Enable more detailed logging |

---

## References

- [Official Docs](https://personal-1d37018d.mintlify.app/docs/installation)
- [GitHub Repository](https://github.com/sooperset/mcp-atlassian)
- [API Token Management](https://id.atlassian.com/manage-profile/security/api-tokens)
