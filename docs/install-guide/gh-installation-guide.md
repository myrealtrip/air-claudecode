# GitHub CLI (gh) Installation Guide

GitHub CLI is the official command-line tool for interacting with GitHub from the terminal.

- Official site: https://cli.github.com/
- GitHub repository: https://github.com/cli/cli

---

## Installation

### macOS

```bash
brew install gh
```

Upgrade:

```bash
brew upgrade gh
```

### Windows

```powershell
winget install --id GitHub.cli
```

Upgrade:

```powershell
winget upgrade --id GitHub.cli
```

> **Note:** When using Windows Terminal, open a new window for PATH changes to take effect.

---

## Verify Installation

```bash
gh --version
```

---

## Authentication Setup

1. Authenticate with your GitHub account:

   ```bash
   gh auth login
   ```

2. Check authentication status:

   ```bash
   gh auth status
   ```

---

## References

- [Official Manual](https://cli.github.com/manual/)
- [Releases Page (Binary Downloads)](https://github.com/cli/cli/releases/latest)
