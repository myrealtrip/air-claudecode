# Skill Generation Guide

Based on the official Claude Code documentation:
- [Skills](https://code.claude.com/docs/en/skills)
- [Subagents](https://code.claude.com/docs/en/sub-agents)
- [Features Overview](https://code.claude.com/docs/en/features-overview)

---

## Choosing the Right Extension

Before creating a skill, understand which extension type fits your goal.

### Feature Comparison

| Feature | What it does | When to use it |
|---------|-------------|----------------|
| **CLAUDE.md** | Persistent context loaded every session | "Always do X" rules, project conventions |
| **Skill** | Instructions, knowledge, and workflows Claude can use | Reusable content, reference docs, repeatable tasks |
| **Subagent** | Isolated execution context that returns summarized results | Context isolation, parallel tasks, specialized workers |
| **MCP** | Connect to external services | External data or actions (database, Slack, browser) |
| **Hook** | Deterministic script that runs on events | Predictable automation, no LLM involved (lint, format) |

### Skill vs Subagent

| Aspect | Skill | Subagent |
|--------|-------|----------|
| **What it is** | Reusable instructions, knowledge, or workflows | Isolated worker with its own context |
| **Key benefit** | Share content across contexts | Context isolation -- only summary returns |
| **Best for** | Reference material, invocable workflows | Tasks that read many files, parallel work |

They combine: a skill can run in a subagent (`context: fork`), and a subagent can preload skills (`skills:` field).

### CLAUDE.md vs Skill

| Aspect | CLAUDE.md | Skill |
|--------|-----------|-------|
| **Loads** | Every session, automatically | On demand |
| **Can trigger workflows** | No | Yes, with `/<name>` |
| **Best for** | "Always do X" rules | Reference material, invocable workflows |

Rule of thumb: keep CLAUDE.md under ~500 lines. Move reference content to skills.

### Context Cost

| Feature | When it loads | Context cost |
|---------|--------------|-------------|
| **CLAUDE.md** | Session start | Every request (full content) |
| **Skill** | Description at start, full content when used | Low (descriptions only until invoked) |
| **Subagent** | When spawned | Isolated from main session |
| **Hook** | On trigger | Zero (runs externally) |

> Use `disable-model-invocation: true` for skills you only trigger manually -- this reduces context cost to zero until invoked.

### How Features Layer

- **CLAUDE.md** -- additive: all levels contribute content simultaneously
- **Skills & subagents** -- override by name: higher-priority location wins (managed > user > project)
- **Hooks** -- merge: all registered hooks fire for matching events regardless of source

---

## Skill Types

| Type | When to Use | Example |
|------|-------------|---------|
| **Full skill** | Self-contained, interactive flow with step-by-step instructions | `git-commit`, `sql-generator`, `setup` |
| **Agent-routed** | Complex behavior delegated to a specialized subagent via `context: fork` | `code-review`, `jira-master`, `software-engineer` |

### Content Categories

| Category | Purpose | Invocation |
|----------|---------|------------|
| **Reference** | Knowledge Claude applies to current work (conventions, style guides) | Usually auto-invoked by Claude |
| **Task** | Step-by-step instructions for a specific action (deploy, commit) | Usually manually invoked with `/skill-name` |

---

## Directory Structure

```
# Full skill                          # Agent-routed skill
skills/{name}/                        skills/{name}/
├── SKILL.md          # all logic     ├── SKILL.md          # thin routing shim
├── references/       # optional      └── references/       # optional
├── examples/         # optional
└── scripts/          # optional
                                      agents/{name}.md      # subagent definition
```

### Where Skills Live

| Location | Path | Applies to |
|----------|------|------------|
| Enterprise | Managed settings | All users in organization |
| Personal | `~/.claude/skills/<name>/SKILL.md` | All your projects |
| Project | `.claude/skills/<name>/SKILL.md` | This project only |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | Where plugin is enabled |

Priority: enterprise > personal > project. Plugin skills use `plugin-name:skill-name` namespace.

---

## Full Skill Template

```markdown
---
name: {skill-name}
description: {one-line description}
model: sonnet                         # haiku | sonnet | opus
argument-hint: "[task description]"
---

# {Skill Title}

## Use When
- User says "keyword", "한국어키워드"

## Do Not Use When
- {when another skill is more appropriate}

## Steps
1. **{Step}** - {details}
2. **Confirm** via `AskUserQuestion` (Proceed / Edit / Cancel)
3. **Execute** only after user confirms

## Examples

**Good:** {scenario} → Why good: {reason}
**Bad:** {scenario} → Why bad: {reason}

## Final Checklist
- [ ] {verification item}
```

---

## Agent-Routed Skill Template

### SKILL.md (thin shim)

The skill content becomes the prompt that drives the subagent. Use `context: fork` + `agent` frontmatter to route to a subagent.

```markdown
---
name: {skill-name}
description: {one-line description}
context: fork
agent: {agent-name}
model: opus
argument-hint: "[task description]"
---

# {Skill Title}

Routes to the {agent-name} agent for {purpose}.

## Usage

/air-claudecode:{skill-name} <task description>

## Capabilities
- {capability 1}
- {capability 2}
```

> **Note:** The subagent runs in isolation without access to conversation history. The skill content becomes the task prompt. Only use `context: fork` for skills with explicit instructions, not guidelines-only content.

### Agent File (`agents/{name}.md`)

Subagent files use YAML frontmatter for configuration, followed by the system prompt in Markdown. Subagents receive only this system prompt (plus basic environment details), not the full Claude Code system prompt.

```markdown
---
name: {agent-name}
description: {one-line description}
tools: Read, Grep, Glob, Bash, AskUserQuestion
model: sonnet
---

<Role>You are a {role description}.</Role>

<Principles>
- **{Name}**: {description}
</Principles>

<Workflow>
1. {Step}
2. {Step}
</Workflow>

<Constraints>
- NEVER {guardrail}
- ALWAYS {required behavior}
</Constraints>
```

### Agent Tools

| Purpose | Tools |
|---------|-------|
| Read-only | `Read, Grep, Glob, Bash, AskUserQuestion` |
| Implementation | + `Edit, Write` |
| MCP integration | + `ToolSearch` |

Use `disallowedTools` to deny specific tools from inherited set:

```yaml
tools: Read, Grep, Glob, Bash
disallowedTools: Write, Edit
```

### Model Selection

| Model | Use For |
|-------|---------|
| `haiku` | Lightweight lookups, fast searches |
| `sonnet` | Standard tasks, git/jira ops, implementation |
| `opus` | Complex reasoning, code review, architecture |
| `inherit` | Same model as main conversation (default) |

---

## Frontmatter Reference

### Skill Frontmatter

All fields are optional. Only `description` is recommended.

| Field | Required | Description |
|-------|----------|-------------|
| `name` | No | Skill name (becomes `/slash-command`). Lowercase, numbers, hyphens only (max 64 chars). Defaults to directory name |
| `description` | Recommended | What it does and when to use. Claude uses this for auto-invocation |
| `argument-hint` | No | Hint for autocomplete (e.g., `[issue-number]`, `[filename] [format]`) |
| `model` | No | Model override: `haiku`, `sonnet`, `opus` |
| `context` | No | Set to `fork` to run in a forked subagent context |
| `agent` | No | Which subagent to use when `context: fork` is set. Built-in (`Explore`, `Plan`, `general-purpose`) or custom agent name |
| `allowed-tools` | No | Tools allowed without permission prompts when skill is active |
| `disable-model-invocation` | No | `true` to prevent Claude from auto-loading this skill. Default: `false` |
| `user-invocable` | No | `false` to hide from `/` menu. Default: `true` |
| `hooks` | No | Hooks scoped to this skill's lifecycle |

### Invocation Control

| Frontmatter | You can invoke | Claude can invoke | When loaded into context |
|-------------|----------------|-------------------|--------------------------|
| (default) | Yes | Yes | Description always in context, full skill loads when invoked |
| `disable-model-invocation: true` | Yes | No | Description not in context, full skill loads when you invoke |
| `user-invocable: false` | No | Yes | Description always in context, full skill loads when invoked |

### Agent Frontmatter

Only `name` and `description` are required.

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Agent identifier (lowercase, hyphens) |
| `description` | Yes | When Claude should delegate to this agent |
| `tools` | No | Tools the agent can use. Inherits all tools if omitted |
| `disallowedTools` | No | Tools to deny, removed from inherited or specified list |
| `model` | No | `haiku`, `sonnet`, `opus`, or `inherit`. Default: `inherit` |
| `permissionMode` | No | `default`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan` |
| `maxTurns` | No | Maximum agentic turns before the subagent stops |
| `skills` | No | Skills to preload into agent context (full content injected, not just available) |
| `memory` | No | Persistent memory scope: `user`, `project`, `local` |
| `mcpServers` | No | MCP servers available to this subagent |
| `hooks` | No | Lifecycle hooks scoped to this subagent |
| `background` | No | `true` to always run as background task. Default: `false` |
| `isolation` | No | `worktree` to run in a temporary git worktree |

### Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Standard permission checking with prompts |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny permission prompts (explicitly allowed tools still work) |
| `bypassPermissions` | Skip all permission checks (use with caution) |
| `plan` | Plan mode (read-only exploration) |

### Persistent Memory

| Scope | Location | Use When |
|-------|----------|----------|
| `user` | `~/.claude/agent-memory/<name>/` | Learnings should apply across all projects |
| `project` | `.claude/agent-memory/<name>/` | Knowledge is project-specific, shareable via VCS |
| `local` | `.claude/agent-memory-local/<name>/` | Project-specific, not checked into VCS |

### String Substitutions

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed when invoking |
| `$ARGUMENTS[N]` | Specific argument by 0-based index |
| `$N` | Shorthand for `$ARGUMENTS[N]` |
| `${CLAUDE_SESSION_ID}` | Current session ID |

> If `$ARGUMENTS` is not present in content, arguments are auto-appended as `ARGUMENTS: <value>`.

### Dynamic Context Injection

The `` !`command` `` syntax runs shell commands before skill content is sent to Claude. The command output replaces the placeholder.

```markdown
## Context
- PR diff: !`gh pr diff`
- Changed files: !`gh pr diff --name-only`

## Your task
Summarize this pull request...
```

This is preprocessing -- Claude only sees the final result with command output inserted.

---

## Supporting Files

Keep `SKILL.md` under 500 lines. Move detailed reference material to separate files.

```
my-skill/
├── SKILL.md           # Main instructions (required)
├── reference.md       # Detailed API docs (loaded when needed)
├── examples.md        # Usage examples (loaded when needed)
└── scripts/
    └── helper.py      # Utility script (executed, not loaded)
```

Reference from SKILL.md:
```markdown
## Additional resources
- For complete API details, see [reference.md](reference.md)
- For usage examples, see [examples.md](examples.md)
```

Reference from agent:
```markdown
For conventions, see skills/{name}/references/
```

---

## Agent Hooks

Subagents can define lifecycle hooks in frontmatter:

| Event | Matcher | When it fires |
|-------|---------|---------------|
| `PreToolUse` | Tool name | Before the subagent uses a tool |
| `PostToolUse` | Tool name | After the subagent uses a tool |
| `Stop` | (none) | When the subagent finishes |

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
```

---

## Restricting Subagent Spawning

When an agent runs as the main thread with `claude --agent`, use `Task(agent_type)` in the `tools` field to restrict which subagents it can spawn:

```yaml
tools: Task(worker, researcher), Read, Bash
```

- `Task` without parentheses: allow spawning any subagent
- `Task(name1, name2)`: only allow specific subagents (allowlist)
- Omit `Task` entirely: cannot spawn any subagents
- This only applies to agents running as main thread, not subagents (subagents cannot spawn other subagents)

---

## Keyword Detection

Add to `scripts/keyword-detector.mjs`:

```js
"{skill-name}": ["english keyword", "한국어 키워드"],
```

- English lowercase, include Korean keywords
- Detector suggests but does **not** auto-invoke

---

## Checklist

**Full skill:**
1. `skills/{name}/SKILL.md` (frontmatter + Use When + Steps + Examples)
2. Keywords in `keyword-detector.mjs`
3. Update `setup/SKILL.md`

**Agent-routed:**
1. `skills/{name}/SKILL.md` (thin shim with `context: fork` + `agent`)
2. `agents/{name}.md` (Role + Principles + Workflow + Constraints)
3. Keywords in `keyword-detector.mjs`
4. Update `setup/SKILL.md`
