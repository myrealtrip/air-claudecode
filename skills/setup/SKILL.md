---
name: setup
description: Verify air-claudecode installation and configure prerequisites (gh CLI, Atlassian MCP)
model: sonnet
---

# air-claudecode Setup

This is the **only command you need to learn**. After running this, everything else is automatic.

## Pre-flight Checks (always runs first)

**CRITICAL**: Before doing anything else, run these commands **immediately and unconditionally** at the start of every setup invocation. No questions asked -- just collect environment status.

**Run all of these in parallel:**

```bash
# gh CLI installation check
which gh && echo "GH_INSTALLED=true" || echo "GH_INSTALLED=false"

# gh CLI authentication check
gh auth status 2>&1

# gogcli installation check
which gog && echo "GOG_INSTALLED=true" || echo "GOG_INSTALLED=false"
```
```
# Atlassian MCP availability check
ToolSearch("+atlassian jira")

# Slack MCP availability check
ToolSearch("+slack")
```

Collect results into a status map. Do not display output yet -- it will be shown in the Status Report step.

### Status Classification

**gh CLI** (required for: git-pr-master, git-issue-master, git-commit, git-branch):

| Result | Status | Fix |
|--------|--------|-----|
| Installed + authenticated | `OK` | Show username |
| Installed + not authenticated | `AUTH` | `gh auth login` |
| Not installed | `MISS` | `brew install gh && gh auth login` |

**Atlassian MCP** (required for: jira-master):

| Result | Status | Fix |
|--------|--------|-----|
| ToolSearch returns tools | `OK` | Show connected instance |
| ToolSearch returns nothing | `MISS` | Guide from `docs/mcp-atlassian-installation-guide.md` if exists, otherwise inline instructions |

**gogcli** (required for: gog-calendar):

| Result | Status | Fix |
|--------|--------|-----|
| `which gog` succeeds | `OK` | Show version if available |
| `which gog` fails | `MISS` | Guide from `docs/install-guide/gogcli-installation-guide.md` if exists, otherwise inline instructions |

**Slack MCP** (optional -- enables Slack integration):

| Result | Status | Fix |
|--------|--------|-----|
| ToolSearch returns slack tools | `OK` | Show connected status |
| ToolSearch returns nothing | `MISS` | Guide from `docs/install-guide/slack-mcp-installation-guide.md` if exists, otherwise inline instructions |

---

## Pre-Setup Check: Already Configured?

After pre-flight checks complete, detect if the plugin is already installed and working.

Check:
1. `.claude-plugin/plugin.json` exists and has `name` and `version`
2. `skills/` directory is populated
3. `agents/` directory is populated
4. `hooks/hooks.json` exists

### If Already Configured (and no --force flag)

If all plugin components are present AND no `--force` flag:

Use `AskUserQuestion` to prompt:

**Question:** "air-claudecode is already installed and working (v{version}). What would you like to do?"

**Options:**
1. **Quick health check** - Show pre-flight results and plugin status, then exit
2. **Run full setup** - Go through the complete setup wizard
3. **Cancel** - Exit without changes

**If user chooses "Quick health check":**
- Show the Status Report (pre-flight + plugin integrity)
- Exit

**If user chooses "Run full setup":**
- Continue with Step 1 below

**If user chooses "Cancel":**
- Exit without any changes

### Force Flag Override

If user passes `--force` flag, skip this check and proceed directly to Step 1.

---

## Usage Modes

This skill handles three scenarios:

| Flag | Behavior |
|------|----------|
| _(none)_ | Full interactive setup wizard with pre-setup detection |
| `--check` | Quick health check -- run pre-flight + plugin integrity, report and exit |
| `--force` | Force full setup wizard, skip pre-setup detection |
| `--help` | Show help text and exit |

### Mode Detection

- If `--check` flag present -> Run Pre-flight + Status Report, then **STOP**
- If `--force` flag present -> Skip Pre-Setup Check, run Step 1 directly
- If `--help` flag present -> Show Help Text, then **STOP**
- If no flags -> Run Pre-Setup Check, then Step 1 if needed

---

## Step 1: Plugin Integrity Check

Verify the plugin structure is complete. Check each component and report status.

**Check these paths relative to the plugin root:**

| Component | Path | Check |
|-----------|------|-------|
| Plugin config | `.claude-plugin/plugin.json` | File exists, valid JSON, has `name` and `version` |
| Skills directory | `skills/` | Directory exists, count SKILL.md files |
| Agents directory | `agents/` | Directory exists, count `.md` files |
| Hooks config | `hooks/hooks.json` | File exists, has `SessionStart` and `UserPromptSubmit` entries |
| Hook scripts | `scripts/session-start.mjs` | File exists |
| Hook scripts | `scripts/keyword-detector.mjs` | File exists |

**Stop here if plugin config is missing.** Show reinstallation instructions and do not proceed to further steps.

---

## Step 2: Status Report

Combine Pre-flight results and Plugin Integrity into a single consolidated report.

Version is read from `.claude-plugin/plugin.json` (`version` field). Skill and agent counts are detected by counting files at runtime.

```
air-claudecode Setup Report (v{version})
======================================

Plugin Integrity
  Plugin config    OK   .claude-plugin/plugin.json
  Skills           OK   {skill_count} skills found
  Agents           OK   {agent_count} agents found
  Hooks config     OK   SessionStart, UserPromptSubmit
  Hook scripts     OK   session-start.mjs, keyword-detector.mjs

Prerequisites
  gh CLI           OK   authenticated as @{username}
  Atlassian MCP    OK   connected to {instance}
  Slack MCP        OK   connected
  gogcli           OK   installed
```

With issues:
```
Prerequisites
  gh CLI           OK   authenticated as @username
  Atlassian MCP    MISS not configured -- add mcp-atlassian to Claude settings
  Slack MCP        MISS not configured -- see docs/install-guide/slack-mcp-installation-guide.md
  gogcli           MISS not installed -- see docs/install-guide/gogcli-installation-guide.md
```

If any plugin component has `FAIL`:
```
Plugin Integrity
  Hooks config     FAIL hooks/hooks.json not found -- reinstall plugin
```

**If `--check` mode:** Stop here and exit.

---

## Step 3: Available Skills & Agents

Show categorized skill and agent listings with invocation commands.

### Skills by Category

```
Git & Version Control
  /air-claudecode:git-commit        Conventional commit with Jira/GitHub linking
  /air-claudecode:git-branch        Create branch from Jira ticket or description
  /air-claudecode:git-pr-master     GitHub PR create/review/update/merge/close
  /air-claudecode:git-issue-master  GitHub issue create/read/update/close

Project Management
  /air-claudecode:jira-master       Jira ticket CRUD with interactive selection
  /air-claudecode:confluence-master Confluence page CRUD with space/label management

Communication
  /air-claudecode:slack-master      Slack read/search/send messages, canvases

Code Quality
  /air-claudecode:code-review       Comprehensive code review (severity-rated, Korean)
  /air-claudecode:software-engineer Code implementation, bug fixes, refactoring
  /air-claudecode:test-engineer     Kotlin test generation (JUnit5, AssertJ, Kotest)

Data & SQL
  /air-claudecode:sql-generator     SQL DDL/DML with strict formatting rules

Productivity
  /air-claudecode:gog-calendar      Google Calendar management via gogcli

Writing & Documentation
  /air-claudecode:technical-writing Technical document writer (toss methodology)
  /air-claudecode:sentence-refiner  Korean sentence refiner (toss sentence rules)

Planning
  /air-claudecode:deep-dive-plan    Deep dive planning (analyze -> plan -> validate)

Setup
  /air-claudecode:setup             This setup wizard
```

### Agents (for delegation via Task tool)

```
  air-claudecode:software-engineer  Code implementation specialist
  air-claudecode:code-reviewer      Code review with structured Korean output
  air-claudecode:test-engineer      Test engineer for Kotlin projects
  air-claudecode:git-pr-master      GitHub PR management with Jira integration
  air-claudecode:git-issue-master   GitHub issue management with Jira integration
  air-claudecode:jira-master        Jira ticket management via Atlassian MCP
  air-claudecode:confluence-master  Confluence page management via Atlassian MCP
  air-claudecode:slack-master       Slack messaging via Slack MCP
  air-claudecode:technical-writer   Technical document writer (toss methodology)
  air-claudecode:sentence-refiner   Korean sentence refiner (toss sentence rules)
```

---

## Step 4: Keyword Triggers

Explain that skills are auto-detected from natural language via the `keyword-detector.mjs` hook.

```
Keyword Triggers (auto-detected from your messages)

  Git
    "commit", "커밋"                         -> git-commit
    "create branch", "브랜치 만들"            -> git-branch
    "pr", "pull request", "PR 만들"          -> git-pr-master
    "github issue", "이슈 만들"               -> git-issue-master

  Project Management
    "jira", "지라", "티켓"                    -> jira-master

  Communication
    "slack", "슬랙", "슬랙 메시지"            -> slack-master

  Code Quality
    "review", "리뷰", "코드 리뷰"             -> code-review
    "implement", "구현", "개발"               -> software-engineer
    "test", "테스트 작성"                     -> test-engineer

  Data
    "sql", "ddl", "create table"             -> sql-generator

  Productivity
    "calendar", "일정", "캘린더"              -> gog-calendar

  Writing
    "기술 문서", "문서 작성", "write document" -> technical-writing
    "문장 다듬", "문장 교정", "sentence"       -> sentence-refiner

  Planning
    "deep dive plan", "심층 분석", "계획 수립" -> deep-dive-plan
```

---

## Step 5: Next Action

Use `AskUserQuestion` to offer next steps based on Pre-flight results.

**If all prerequisites are OK:**
- **Done** -- setup complete, ready to use
- **Test a skill** -- try a quick skill invocation to verify

**If some prerequisites are missing:**
- **Done** -- setup complete (some features limited)
- **Install gh CLI** -- step-by-step installation guide (only if gh is missing)
- **Configure Atlassian MCP** -- MCP server setup guide (only if Atlassian is missing)
- **Configure Slack MCP** -- Slack MCP setup guide (only if Slack is missing)
- **Install gogcli** -- gogcli installation guide (only if gogcli is missing)

Only show fix options for prerequisites that are actually missing.

---

## Help Text

When user runs `/air-claudecode:setup --help`, display:

```
air-claudecode Setup - Verify installation and configure prerequisites

USAGE:
  /air-claudecode:setup           Run setup wizard (or health check if already configured)
  /air-claudecode:setup --check   Quick health check (pre-flight + plugin integrity only)
  /air-claudecode:setup --force   Force full setup wizard, skip pre-setup detection
  /air-claudecode:setup --help    Show this help

WHAT IT CHECKS:
  Plugin Integrity
    - .claude-plugin/plugin.json    Plugin configuration
    - skills/                       Skill definitions (SKILL.md files)
    - agents/                       Agent definitions (.md files)
    - hooks/hooks.json              Hook configuration
    - scripts/                      Hook scripts (session-start, keyword-detector)

  Prerequisites
    - gh CLI                        GitHub CLI (required for PR, issue, commit, branch skills)
    - Atlassian MCP                 Atlassian MCP server (required for Jira skill)
    - gogcli                        Google Calendar CLI (required for calendar skill)

EXAMPLES:
  /air-claudecode:setup             # First time setup or re-check
  /air-claudecode:setup --check     # Quick status check
  /air-claudecode:setup --force     # Re-run full wizard

For more info: https://github.com/myrealtrip/air-claudecode
```

---

## Output Style Rules

- Use consistent column alignment in status tables
- Status labels: `OK`, `MISS`, `FAIL`, `AUTH` (fixed width)
- Show version number in report header
- Keep lines under 80 characters where possible
- Use Korean in conversational text if the user is speaking Korean

---

## Final Checklist

- [ ] Pre-flight checks executed first (gh CLI, Atlassian MCP, Slack MCP, gogcli -- unconditionally, in parallel)
- [ ] Pre-setup detection: skip full wizard if already configured (unless --force)
- [ ] Plugin integrity verified (plugin.json, skills/, agents/, hooks/, scripts/)
- [ ] Combined status report displayed
- [ ] Skills listed by category with invocation commands
- [ ] Agents listed with descriptions
- [ ] Keyword triggers shown by category
- [ ] Actionable next steps offered based on actual prerequisite status
- [ ] `--check` mode exits after status report
- [ ] `--force` mode skips pre-setup detection
- [ ] `--help` mode shows help text and exits
