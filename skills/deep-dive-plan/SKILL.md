---
name: deep-dive-plan
description: Deep dive planning with parallel analysis, strategic planning, and validation before writing code
model: opus
argument-hint: "[feature or task to plan]"
---

# Deep Dive Planning System

## Overview

This skill orchestrates specialized agent teams to produce comprehensive implementation plans before writing any code. Each phase uses parallel sub-agents for speed, while phases run sequentially to maintain data dependencies.

**Use this skill when:**
- Complex features requiring architectural decisions
- High-risk changes needing careful analysis
- Multi-component system modifications
- Unclear implementation paths requiring exploration
- Need for documented decision-making process

**Do NOT use for:**
- Simple bug fixes or trivial changes
- Well-understood patterns with clear implementation
- Quick prototypes or experiments

**IMPORTANT**: When open questions or ambiguities arise at any phase, you MUST use `AskUserQuestion` to clarify with the user before proceeding. Never assume -- ask. Proceeding with unresolved questions leads to flawed plans that fail validation.

## Three-Phase System

```
Phase 1: ANALYZE (parallel)
  Explorer (haiku) + Analyst (opus) + Risk Assessor (sonnet)
  -> Synthesize -> Analysis Report
        |
Phase 2: PLAN (sequential)
  Planner (opus) receives Analysis Report
  -> Implementation Strategy
        |
Phase 3: VALIDATE (parallel)
  Verifier (sonnet) + Critic (opus) + Quality Reviewer (sonnet)
  -> Synthesize -> Validation Report
        |
  APPROVED / NEEDS REVISION / REJECTED
```

## Agent Type Resolution

This skill uses specialized OMC agents when available, with built-in Claude Code fallbacks.

**Detection**: Try the OMC type first. If the Task tool rejects the `subagent_type`, use the fallback.

| Role | OMC Type (preferred) | Fallback Type | Model |
|------|---------------------|---------------|-------|
| Explorer | `oh-my-claudecode:explore` | `Explore` | haiku |
| Analyst | `oh-my-claudecode:analyst` | `general-purpose` | opus |
| Risk Assessor | `oh-my-claudecode:security-reviewer` | `general-purpose` | sonnet |
| Planner | `oh-my-claudecode:planner` | `general-purpose` | opus |
| Verifier | `oh-my-claudecode:verifier` | `general-purpose` | sonnet |
| Critic | `oh-my-claudecode:critic` | `general-purpose` | opus |
| Quality Reviewer | `oh-my-claudecode:quality-reviewer` | `general-purpose` | sonnet |

> **Note**: OMC agents carry role-specific system prompts that improve output quality. Fallbacks work correctly but rely entirely on the prompt you provide, so include the full role description in the prompt when using fallbacks.

## Steps

### 1. Initialize

Summarize the user's request and determine scope:

```
User Request: [what user wants]
Scope: file | module | project | system
Estimated Complexity: Low | Medium | High | Critical
```

### 2. Phase 1 -- Analyze (parallel)

Launch 3 agents in parallel using `Task` with `run_in_background: true`:

1. **Explorer** (haiku) -- codebase structure, file mapping, existing patterns
2. **Analyst** (opus) -- dependencies, constraints, integration points, open questions
3. **Risk Assessor** (sonnet) -- risks by severity, impact areas, security implications

For detailed agent prompts, see [references/agent-prompts.md](references/agent-prompts.md).

```
Launch in parallel (use run_in_background: true for each):

1. Task(subagent_type="oh-my-claudecode:explore",
        model="haiku",
        prompt="[Explorer prompt with USER REQUEST]")

2. Task(subagent_type="oh-my-claudecode:analyst",
        model="opus",
        prompt="[Analyst prompt with USER REQUEST]")

3. Task(subagent_type="oh-my-claudecode:security-reviewer",
        model="sonnet",
        prompt="[Risk Assessor prompt with USER REQUEST]")
```

Wait for all 3 to complete, then **synthesize** into a unified Analysis Report. See [references/output-templates.md](references/output-templates.md) for the synthesis format.

If any agent's findings raise open questions, use `AskUserQuestion` before proceeding to Phase 2.

### 3. Phase 2 -- Plan (sequential)

Launch 1 agent after Analysis is complete:

- **Planner** (opus) -- receives the full Analysis Report, produces Implementation Strategy

```
Task(subagent_type="oh-my-claudecode:planner",
     model="opus",
     prompt="[Planner prompt with SYNTHESIZED ANALYSIS REPORT]")
```

For the detailed planner prompt, see [references/agent-prompts.md](references/agent-prompts.md).

The strategy includes: approach, architectural decisions with rationales, phased task breakdown, parallel opportunities, timeline estimate, success criteria, rollback strategy, and risk mitigation.

Wait for Planner output before proceeding.

### 4. Phase 3 -- Validate (parallel)

Launch 3 agents in parallel using `Task` with `run_in_background: true`:

1. **Verifier** (sonnet) -- cross-validates Plan against Analysis (are all risks addressed?)
2. **Critic** (opus) -- challenges decisions, finds flaws, checks for scope creep
3. **Quality Reviewer** (sonnet) -- risk scoring matrix, feasibility, completeness checklist

Each agent receives both the Analysis Report and Implementation Strategy.

```
Launch in parallel (use run_in_background: true for each):

1. Task(subagent_type="oh-my-claudecode:verifier",
        model="sonnet",
        prompt="[Verifier prompt with ANALYSIS + PLAN]")

2. Task(subagent_type="oh-my-claudecode:critic",
        model="opus",
        prompt="[Critic prompt with ANALYSIS + PLAN]")

3. Task(subagent_type="oh-my-claudecode:quality-reviewer",
        model="sonnet",
        prompt="[Quality Reviewer prompt with ANALYSIS + PLAN]")
```

For detailed agent prompts, see [references/agent-prompts.md](references/agent-prompts.md).

Wait for all 3 to complete, then **synthesize** into a Validation Report with a decision.

### 5. Iteration (If Needed)

| Decision | Action |
|----------|--------|
| APPROVED | Proceed to finalization |
| NEEDS REVISION | Re-run only the failed agent(s) with feedback, then re-validate |
| REJECTED | Re-run Planner with specific feedback, then re-validate |

**Decision logic:**
- Any critical issues -> REJECTED or NEEDS REVISION
- Major concerns only -> NEEDS REVISION
- Minor suggestions only -> APPROVED

**How to iterate:**
1. Read consolidated feedback from all 3 validators
2. Identify which phase needs re-run:
   - Missing analysis / wrong assumptions -> Re-run specific Analyzer agent(s) (not full team)
   - Flawed strategy / poor decisions -> Re-run Planner with feedback
   - Need user clarification -> Use AskUserQuestion tool
3. Re-run only what's needed with Validator feedback included in prompt
4. Always re-validate after changes

**Iteration limit:** Maximum 3 rounds. If still not approved, ask user for guidance.

### 6. Finalize

1. Consolidate all reports into `.claudedocs/deep-dive-plan/{document-name}.md` (or user-specified path)
2. Present executive summary (2-3 sentences: What, Why, How, Risk Level)
3. Confirm with user via `AskUserQuestion` (Approve / Revise / Cancel)

For the final output format, see [references/output-templates.md](references/output-templates.md).

## Rules

- **Always use Task tool** -- never perform agent work directly
- **Parallel within phases** -- launch agents with `run_in_background: true`
- **Sequential between phases** -- each phase needs the previous phase's output
- **Synthesize before handoff** -- combine parallel outputs before passing to next phase
- **Re-run surgically** -- on iteration, only re-run the specific agent(s) that failed
- **User approval required** -- always confirm the final plan before any implementation
- **Right-size agent models** -- haiku for exploration, opus for deep reasoning, sonnet for verification
- **Pass complete context** -- each phase needs full synthesized output from previous phase

## Best Practices

1. **Always use Task tool for agents** -- never perform agent work yourself, delegate to Task agents
2. **Parallel within, sequential between** -- sub-agents run in parallel; phases run sequentially
3. **Use `run_in_background: true`** -- launch parallel agents as background tasks for true concurrency
4. **Synthesize before handoff** -- combine parallel outputs into coherent report before next phase
5. **Let agents work independently** -- don't inject opinions between agent phases
6. **Trust the process** -- if Validator Team rejects, iterate; don't skip validation
7. **Re-run surgically** -- on iteration, only re-run the specific agent(s) that need changes
8. **User approval required** -- always confirm final plan before implementation

## Anti-Patterns to Avoid

- **Doing agent work yourself** -- never perform analysis/planning/validation directly
- **Running phases in parallel** -- Planner needs Analysis; Validators need both; phases must be sequential
- **Using general-purpose for everything** -- use specialized agent types for better results
- **Skipping synthesis** -- don't pass raw parallel outputs directly; synthesize first
- **Skipping Validator Team** -- never implement without validation approval
- **Running full team on iteration** -- if only one sub-area failed, re-run only that agent
- **Rushing to code** -- this skill is about planning, not implementation
- **Analysis paralysis** -- if Validator Team approves, move forward; don't over-iterate

## Output

- Default: `.claudedocs/deep-dive-plan/{document-name}.md` in working directory
- User can specify a custom output path

## Integration

After the plan is approved:
- `/air-claudecode:software-engineer` for implementation
- `/air-claudecode:code-review` after each phase
- `/air-claudecode:git-commit` for incremental commits
- `/air-claudecode:sql-generator` when the plan involves SQL (DDL/DML) -- delegate SQL generation to this skill instead of writing SQL directly

## Final Checklist

- [ ] All 3 phases completed (Analyze, Plan, Validate)
- [ ] Analysis covers: architecture, dependencies, constraints, risks, impact areas
- [ ] Plan includes: approach, decisions with rationale, phased tasks, rollback strategy
- [ ] Validation approves with no critical or major issues remaining
- [ ] Final plan saved to `.claudedocs/deep-dive-plan/{document-name}.md`
- [ ] User confirmed the plan via AskUserQuestion

## User Request

$ARGUMENTS
