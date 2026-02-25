# air-claudecode

**Lightweight skill-sharing plugin for Claude Code teams. Zero dependencies, zero config.**

---

## Requirements

| Tool                                                          | Required            | Description                                                                           |
|---------------------------------------------------------------|---------------------|---------------------------------------------------------------------------------------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Yes                 | Anthropic's official CLI for Claude                                                   |
| [GitHub CLI (gh)](https://cli.github.com/)                    | Yes                 | GitHub command-line tool ([Installation Guide](docs/gh-installation-guide.md))        |
| [MCP Atlassian](https://github.com/sooperset/mcp-atlassian)   | For Jira/Confluence | Atlassian MCP server ([Installation Guide](docs/mcp-atlassian-installation-guide.md)) |
| [gogcli](https://github.com/steipete/gogcli)                 | For Google Calendar  | Google Workspace CLI ([Installation Guide](docs/gogcli-installation-guide.md))        |

---

## Installation

### 1. Add marketplace

In Claude Code, run:

```
/plugin marketplace add https://github.com/myrealtrip/air-claudecode
```

### 2. Install the plugin

```
/plugin install air-claudecode
```

### 3. Verify installation

```
/air-claudecode:setup
```

This checks all prerequisites (Claude Code, gh CLI, Atlassian MCP, gogcli) and reports any missing dependencies.

### 4. Start using

```
/air-claudecode:git-commit
/air-claudecode:jira-master
```

---

## Update

### Update to the latest version

```
/plugin marketplace update air-claudecode
/plugin update air-claudecode
```

### Reinstall (if update fails)

```
/plugin uninstall air-claudecode
/plugin install air-claudecode
```

---

## Project Conventions

Team-specific development conventions in [`conventions/project-conventions/`](conventions/project-conventions/).

---

## Docs

- [GitHub CLI Installation Guide](docs/gh-installation-guide.md)
- [MCP Atlassian Installation Guide](docs/mcp-atlassian-installation-guide.md)
- [gogcli Installation Guide](docs/gogcli-installation-guide.md)
- [Git Flow Setup Guide](docs/git-flow-setup.md)
- [Prompt Keyword Guide](docs/prompt-keyword-guide.md)

---

## Authors

- **YoungKwang Kim** - [@gykk16](https://github.com/gykk16)
- **SungHoon Lee** - [@hooniis](https://github.com/hooniis)
