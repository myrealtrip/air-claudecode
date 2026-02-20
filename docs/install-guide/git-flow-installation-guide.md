# git-flow-next Installation Guide

git-flow-next is a modern Go-based implementation of the Git Flow branching model by the Tower team. It replaces legacy git-flow with better performance, conflict handling, and error messaging while maintaining backward compatibility.

- Official site: https://git-flow.sh/
- GitHub repository: https://github.com/gittower/git-flow-next

---

## Prerequisites

If the older version ([nvie/gitflow](https://github.com/nvie/gitflow)) is installed, remove it first:

```bash
git flow version
brew uninstall git-flow       # Homebrew (nvie/gitflow)
brew uninstall git-flow-avh   # AVH edition
```

---

## Installation

### macOS

```bash
brew install gittower/tap/git-flow-next
```

### Windows

Download the latest binary from [releases](https://github.com/gittower/git-flow-next/releases) and add it to your `PATH`.

---

## Verify Installation

```bash
git flow version
```

---

## Setup

Initialize in a repository:

```bash
git flow init
```

This configures branch naming conventions (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`).

---

## Basic Usage

| Command | Description |
|---|---|
| `git flow feature start my-feature` | Create feature branch from develop |
| `git flow feature finish my-feature` | Merge feature back to develop |
| `git flow release start 1.0.0` | Create release branch from develop |
| `git flow release finish 1.0.0` | Merge release to main + develop, tag |
| `git flow hotfix start fix-bug` | Create hotfix branch from main |
| `git flow hotfix finish fix-bug` | Merge hotfix to main + develop, tag |
| `git flow finish` | Auto-detect branch type and finish |

---

## References

- [Git Flow Workflow](https://git-flow.sh/workflows/gitflow/)
- [GitHub Repository](https://github.com/gittower/git-flow-next)
