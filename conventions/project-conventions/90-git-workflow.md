# Git Workflow

## Branch Structure ([Git Flow](https://git-flow.sh/workflows/gitflow/))

| Branch | Base | Merges Into | Purpose |
|--------|------|-------------|---------|
| `main` | - | - | Production-ready code |
| `develop` | `main` | - | Integration branch |
| `feature/*` | `develop` | `develop` | New features |
| `release/*` | `develop` | `main` + `develop` | Release preparation |
| `hotfix/*` | `main` | `main` + `develop` | Critical production fixes |

- Format: `{type}/{description}` (lowercase, hyphens)
- Include Jira ticket: `feature/PROJ-123-add-login`

## Conventional Commits

Format: `{type}({scope}): {description}`

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring |
| `test` | Add or fix tests |
| `docs` | Documentation |
| `chore` | Build, CI, tooling |

Rules: imperative mood, no capitalize after type, no period, under 72 chars.

## Merge Strategy

| Action | Strategy |
|--------|----------|
| Feature → develop | **Squash and merge** (clean history, one commit per feature) |
| Release → main | **Merge commit** (preserve release history) |
| Hotfix → main + develop | **Merge commit** (preserve fix history) |
| Update feature from develop | **Rebase** (keep linear) |

## Release

- Update `projectVersion` in `gradle.properties` (remove `-SNAPSHOT`)
- Tag format: `v{major}.{minor}.{patch}` (Semantic Versioning)

## Protected Branches

- `main` / `develop`: PR only, no force push, no delete
- `feature/*` / `hotfix/*`: direct push allowed, delete after merge
