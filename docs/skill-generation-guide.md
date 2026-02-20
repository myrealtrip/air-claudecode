# Skill Generation Guide

---

## Skill Types

| Type | When to Use | Example |
|------|-------------|---------|
| **Full skill** | Self-contained, interactive flow | `git-commit`, `sql-generator`, `setup` |
| **Agent-routed** | Complex behavior via specialized agent | `code-review`, `jira-master`, `software-engineer` |

---

## Directory Structure

```
# Full skill                          # Agent-routed skill
skills/{name}/                        skills/{name}/
├── SKILL.md          # all logic     ├── SKILL.md          # thin routing
├── references/       # optional      └── references/       # optional
└── scripts/          # optional
                                      agents/{name}.md      # agent definition
```

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

Task: {{ARGUMENTS}}
```

---

## Agent-Routed Skill Template

### SKILL.md (thin shim)

```markdown
---
name: {skill-name}
description: {one-line description}
argument-hint: "[task description]"
---

# {Skill Title}

## Routing
Delegates to `air-claudecode:{agent-name}` agent.

## Capabilities
- {capability 1}
- {capability 2}

Task: {{ARGUMENTS}}
```

### Agent File (`agents/{name}.md`)

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

### Model Selection

| Model | Use For |
|-------|---------|
| `haiku` | Lightweight lookups |
| `sonnet` | Standard tasks, git/jira ops |
| `opus` | Complex reasoning, code review |

---

## References

Optional files in `skills/{name}/references/` loaded by agents via `Read` tool.

**Link from agent:** `For conventions, see skills/{name}/references/`
**Link from skill:** `- [references/{topic}.md](references/{topic}.md)`

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

**Full skill:** `skills/{name}/SKILL.md` (frontmatter + Use When + Steps + Examples) → keywords in `keyword-detector.mjs` → update `setup/SKILL.md`

**Agent-routed:** `skills/{name}/SKILL.md` (thin) + `agents/{name}.md` (Role + Principles + Workflow + Constraints) → keywords → update `setup/SKILL.md`
