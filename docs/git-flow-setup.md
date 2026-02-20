# Git Flow Setup Guide

## Overview

[git-flow-next](https://github.com/gittower/git-flow-next) is a modern Go-based implementation of the [Git Flow](https://git-flow.sh/) branching model by the Tower team. It replaces legacy git-flow with better performance, conflict handling, and error messaging while maintaining backward compatibility.

## Migration from Legacy git-flow

If the older version ([nvie/gitflow](https://github.com/nvie/gitflow)) is installed, remove it first:

```bash
# Check current version
git flow version

# Remove legacy git-flow
brew uninstall git-flow       # Homebrew (nvie/gitflow)
brew uninstall git-flow-avh   # or AVH edition if installed
```

## Installation

### macOS (Homebrew)

```bash
brew install gittower/tap/git-flow-next
```

### Manual

1. Download the latest binary from [releases](https://github.com/gittower/git-flow-next/releases)
2. Extract to a directory in your `PATH`
3. `chmod +x /path/to/git-flow`

## Setup

### Initialize in a repository

```bash
git flow init
```

This configures branch naming conventions (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`).

## Basic Usage

| Command | Description |
|---------|-------------|
| `git flow feature start my-feature` | Create feature branch from develop |
| `git flow feature finish my-feature` | Merge feature back to develop |
| `git flow release start 1.0.0` | Create release branch from develop |
| `git flow release finish 1.0.0` | Merge release to main + develop, tag |
| `git flow hotfix start fix-bug` | Create hotfix branch from main |
| `git flow hotfix finish fix-bug` | Merge hotfix to main + develop, tag |
| `git flow finish` | Auto-detect branch type and finish |

## Key Features

- **Backward compatible** with existing git-flow repositories
- **Customizable** branch naming and merge strategies
- **Enhanced conflict handling** and clear error messaging
- **Shortcut commands** -- `git flow finish` auto-detects current branch type

## References

- [git-flow.sh](https://git-flow.sh/) -- Git Flow workflow documentation
- [git-flow-next](https://github.com/gittower/git-flow-next) -- Source code and releases
- [Git Flow Workflow](https://git-flow.sh/workflows/gitflow/) -- Detailed workflow guide
