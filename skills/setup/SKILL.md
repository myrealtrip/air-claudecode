---
name: setup
description: Verify air-claudecode installation and configure prerequisites (gh CLI, Atlassian MCP)
model: sonnet
---

# Setup

Verify air-claudecode plugin installation and check prerequisites. This is the only command you need to learn -- after running this, everything else is automatic.

## Use When
- First time using air-claudecode
- User says "setup", "설정", "설치 확인", "configure air-claudecode"
- Something isn't working and user wants to diagnose

## Do Not Use When
- User wants to create a skill -- guide them to `skills/<name>/SKILL.md`
- User wants to create an agent -- guide them to `agents/<name>.md`

## Steps

1. **Check plugin installation**

   Run `claude plugin list` or check if plugin directory exists:
   - Verify `.claude-plugin/plugin.json` is present
   - Verify `skills/` directory exists with skill files
   - Verify `agents/` directory exists with agent files
   - Verify `hooks/hooks.json` exists

   Report:
   ```
   air-claudecode plugin status:
     Plugin config:  OK (.claude-plugin/plugin.json)
     Skills:         14 found
     Agents:         8 found
     Hooks:          OK (SessionStart, UserPromptSubmit)
   ```

2. **Check prerequisites**

   **gh CLI** (required for git-pr-master, git-issue-master):
   - Run `which gh` to check installation
   - Run `gh auth status` to check authentication
   - If missing: show installation guide from `docs/gh-installation-guide.md`

   **Atlassian MCP** (required for jira-master):
   - Call `ToolSearch("+atlassian jira")` to check if MCP tools are available
   - If available: report OK with connected instance
   - If missing: show installation guide from `docs/mcp-atlassian-installation-guide.md`

   **gogcli** (required for gog-calendar):
   - Run `which gogcli` to check installation
   - If missing: show installation guide from `docs/gogcli-installation-guide.md`

   Report:
   ```
   Prerequisites:
     gh CLI:         OK (authenticated as @username)
     Atlassian MCP:  OK (connected to team.atlassian.net)
   ```

   Or if something is missing:
   ```
   Prerequisites:
     gh CLI:         MISSING -- run: brew install gh && gh auth login
     Atlassian MCP:  NOT CONFIGURED -- see docs/mcp-atlassian-installation-guide.md
   ```

3. **Show available skills and agents**

   List all skills with invocation examples:
   ```
   Available skills:
     /air-claudecode:setup            -- This setup wizard
     /air-claudecode:git-commit       -- Conventional commit with Jira/GitHub linking
     /air-claudecode:git-branch       -- Create branch from Jira ticket or description
     /air-claudecode:git-pr-master    -- GitHub PR create/review/update/merge
     /air-claudecode:git-issue-master -- GitHub issue create/read/update/close
     /air-claudecode:jira-master      -- Jira ticket CRUD
     /air-claudecode:code-review      -- Comprehensive code review with severity-rated feedback
     /air-claudecode:software-engineer -- Code implementation (features, bug fixes, refactoring)
     /air-claudecode:test-engineer    -- Kotlin test generation (JUnit5, AssertJ, Kotest)
     /air-claudecode:sql-generator    -- SQL DDL/DML generation with strict formatting rules
     /air-claudecode:gog-calendar     -- Google Calendar management via gogcli
     /air-claudecode:technical-writing -- Technical document writer (toss methodology)
     /air-claudecode:sentence-refiner  -- Korean sentence refiner (toss sentence rules)
     /air-claudecode:deep-dive-plan   -- Deep dive planning (analyze → plan → validate)

   Available agents:
     air-claudecode:git-pr-master    -- GitHub PR management with Jira integration
     air-claudecode:git-issue-master -- GitHub issue management with Jira integration
     air-claudecode:jira-master      -- Jira ticket management via Atlassian MCP
     air-claudecode:code-reviewer    -- Code review specialist with structured Korean output
     air-claudecode:software-engineer -- Code implementation specialist
     air-claudecode:test-engineer    -- Test engineer for Kotlin projects
     air-claudecode:technical-writer -- Technical document writer (toss methodology)
     air-claudecode:sentence-refiner -- Korean sentence refiner (toss sentence rules)
   ```

4. **Show keyword triggers**

   Explain that natural language also works:
   ```
   Keyword triggers (auto-detected from your messages):
     "commit", "커밋"                    -> git-commit
     "create branch", "브랜치 만들"       -> git-branch
     "pr", "pull request"                -> git-pr-master
     "github issue", "이슈 만들"          -> git-issue-master
     "jira", "지라", "티켓"               -> jira-master
     "review", "리뷰", "코드 리뷰"        -> code-review
     "implement", "구현", "개발"          -> software-engineer
     "test", "테스트 작성"                -> test-engineer
     "sql", "ddl", "create table"        -> sql-generator
     "calendar", "일정", "캘린더"         -> gog-calendar
     "기술 문서", "문서 작성", "write document" -> technical-writing
     "문장 다듬", "문장 교정", "sentence refine" -> sentence-refiner
     "deep dive plan", "심층 분석", "계획 수립"  -> deep-dive-plan
   ```

5. **Ask next action** via `AskUserQuestion`

   Options:
   - **Done** -- setup complete, ready to use
   - **Install gh CLI** -- show step-by-step guide
   - **Configure Atlassian MCP** -- show MCP setup guide
   - **Test a skill** -- try a quick skill invocation

## Examples

**Good:**
User: "/air-claudecode:setup"
Action: Check all prerequisites, report status, show available skills.
Why good: Comprehensive check, clear status report, actionable next steps.

**Good (diagnosis):**
User: "jira 연동이 안돼"
Action: Run setup, focus on Atlassian MCP status, show fix instructions.
Why good: Targeted diagnosis with specific fix.

**Bad:**
Action: Skip prerequisite checks, just list skills.
Why bad: Misses the point -- setup should verify everything works.

## Final Checklist
- [ ] Plugin files verified (plugin.json, skills/, agents/, hooks/)
- [ ] gh CLI checked (installed + authenticated)
- [ ] Atlassian MCP checked (available via ToolSearch)
- [ ] All skills listed with invocation examples
- [ ] Keyword triggers shown
- [ ] Actionable next steps offered if anything is missing
