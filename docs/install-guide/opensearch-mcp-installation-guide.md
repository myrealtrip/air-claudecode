# OpenSearch MCP Installation Guide

OpenSearch MCP is an MCP server that enables searching, querying, and managing OpenSearch clusters from Claude Code.

- GitHub repository: https://github.com/opensearch-project/opensearch-mcp-server-py
- PyPI: https://pypi.org/project/opensearch-mcp-server-py/

---

## Prerequisites

### 1. Verify Python Installation

```bash
python3 --version
```

### 2. Verify uvx Installation

```bash
uvx --version
```

> **Note:** If uvx is not installed, install it via `pip install uv`.

---

## Installation

### uvx (Recommended)

Runs directly without permanent installation. Downloads automatically on first run.

```bash
uvx opensearch-mcp-server-py
```

### pip

```bash
pip install opensearch-mcp-server-py
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
# Global config (recommended)
~/.claude.json

# Project-level config
.mcp.json
```

### Basic Auth (Username / Password)

```json
{
  "mcpServers": {
    "opensearch": {
      "type": "stdio",
      "command": "uvx",
      "args": ["opensearch-mcp-server-py"],
      "env": {
        "OPENSEARCH_URL": "https://your-opensearch-host:9200",
        "OPENSEARCH_USERNAME": "your_username",
        "OPENSEARCH_PASSWORD": "your_password"
      }
    }
  }
}
```

> **Note:** For self-signed certificates, add `"OPENSEARCH_SSL_VERIFY": "false"`.

### AWS IAM Role

```json
{
  "mcpServers": {
    "opensearch": {
      "type": "stdio",
      "command": "uvx",
      "args": ["opensearch-mcp-server-py"],
      "env": {
        "OPENSEARCH_URL": "https://your-domain.us-east-1.es.amazonaws.com",
        "AWS_IAM_ARN": "arn:aws:iam::123456789012:role/OpenSearchRole",
        "AWS_REGION": "us-east-1"
      }
    }
  }
}
```

### AWS Profile

```json
{
  "mcpServers": {
    "opensearch": {
      "type": "stdio",
      "command": "uvx",
      "args": ["opensearch-mcp-server-py"],
      "env": {
        "OPENSEARCH_URL": "https://your-domain.us-east-1.es.amazonaws.com",
        "AWS_REGION": "us-east-1",
        "AWS_PROFILE": "your-aws-profile"
      }
    }
  }
}
```

### AWS OpenSearch Serverless

```json
{
  "mcpServers": {
    "opensearch": {
      "type": "stdio",
      "command": "uvx",
      "args": ["opensearch-mcp-server-py"],
      "env": {
        "OPENSEARCH_URL": "https://collection-id.us-east-1.aoss.amazonaws.com",
        "AWS_REGION": "us-east-1",
        "AWS_PROFILE": "your-aws-profile",
        "AWS_OPENSEARCH_SERVERLESS": "true"
      }
    }
  }
}
```

### No Auth (Local Development)

```json
{
  "mcpServers": {
    "opensearch": {
      "type": "stdio",
      "command": "uvx",
      "args": ["opensearch-mcp-server-py"],
      "env": {
        "OPENSEARCH_URL": "http://localhost:9200",
        "OPENSEARCH_NO_AUTH": "true"
      }
    }
  }
}
```

---

## Environment Variables Reference

### Connection

| Variable | Description |
|---|---|
| `OPENSEARCH_URL` | OpenSearch cluster endpoint (required) |
| `OPENSEARCH_SSL_VERIFY` | SSL verification (default: `true`) |
| `OPENSEARCH_TIMEOUT` | Connection timeout in seconds |
| `OPENSEARCH_MAX_RESPONSE_SIZE` | Max response bytes (default: `10485760`) |

### Authentication

| Variable | Description |
|---|---|
| `OPENSEARCH_USERNAME` | Basic auth username |
| `OPENSEARCH_PASSWORD` | Basic auth password |
| `OPENSEARCH_NO_AUTH` | Set to `true` for unauthenticated clusters |
| `OPENSEARCH_HEADER_AUTH` | Set to `true` for header-based auth |
| `AWS_IAM_ARN` | IAM role ARN |
| `AWS_REGION` | AWS region |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_SESSION_TOKEN` | AWS temporary session token |
| `AWS_PROFILE` | AWS profile name |
| `AWS_OPENSEARCH_SERVERLESS` | Set to `true` for serverless |

### Tool Filtering

| Variable | Description |
|---|---|
| `OPENSEARCH_ENABLED_TOOLS` | Comma-separated list of enabled tool names |
| `OPENSEARCH_DISABLED_TOOLS` | Comma-separated list of disabled tool names |
| `OPENSEARCH_ENABLED_CATEGORIES` | Comma-separated list of enabled categories |
| `OPENSEARCH_DISABLED_CATEGORIES` | Comma-separated list of disabled categories |
| `OPENSEARCH_ENABLED_TOOLS_REGEX` | Regex pattern for enabled tools |
| `OPENSEARCH_DISABLED_TOOLS_REGEX` | Regex pattern for disabled tools |
| `OPENSEARCH_SETTINGS_ALLOW_WRITE` | Enable write operations (default: disabled) |

---

## Multi-Cluster Mode

For managing multiple clusters, use a YAML config file with `--mode multi`:

```bash
python -m mcp_server_opensearch --mode multi --config config.yml
```

### Example `config.yml`

```yaml
version: "1.0"
clusters:
  local-dev:
    opensearch_url: "http://localhost:9200"
    opensearch_username: "admin"
    opensearch_password: "admin123"

  production:
    opensearch_url: "https://prod.es.amazonaws.com"
    iam_arn: "arn:aws:iam::123456789012:role/OpenSearchRole"
    aws_region: "us-east-1"
    profile: "production"

  serverless:
    opensearch_url: "https://collection-id.us-east-1.aoss.amazonaws.com"
    aws_region: "us-east-1"
    profile: "your-aws-profile"
    is_serverless: true
```

> **Note:** In multi-mode, tools require an `opensearch_cluster_name` parameter to specify the target cluster.

---

## Streaming Transport (SSE)

For SSE/HTTP transport instead of stdio:

```bash
python -m mcp_server_opensearch --transport stream --host 0.0.0.0 --port 9900
```

---

## Troubleshooting

### SSL Certificate Errors

For internal or self-signed certificates, set `OPENSEARCH_SSL_VERIFY` to `false`:

```json
"env": {
  "OPENSEARCH_SSL_VERIFY": "false"
}
```

### Connection Timeout

Increase the timeout value:

```json
"env": {
  "OPENSEARCH_TIMEOUT": "30"
}
```

### Too Many Tools Loaded

Disable unnecessary tool categories to reduce MCP tool count:

```json
"env": {
  "OPENSEARCH_DISABLED_CATEGORIES": "cluster_state,segments,nodes"
}
```

---

## References

- [GitHub Repository](https://github.com/opensearch-project/opensearch-mcp-server-py)
- [User Guide](https://github.com/opensearch-project/opensearch-mcp-server-py/blob/main/USER_GUIDE.md)
- [PyPI Package](https://pypi.org/project/opensearch-mcp-server-py/)
