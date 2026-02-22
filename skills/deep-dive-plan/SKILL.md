---
name: deep-dive-plan
description: Deep dive planning with parallel analysis, strategic planning, and validation before writing code
model: opus
argument-hint: "[feature or task to plan]"
disable-model-invocation: true
---

# Deep Dive Planning

Orchestrate specialized agents in 3 sequential phases to produce a validated implementation plan before writing any code. Parallel agents within each phase maximize speed; sequential phases preserve data dependencies.

## Use When

- Complex features requiring architectural decisions
- High-risk changes needing careful analysis
- Multi-component system modifications
- Unclear implementation paths requiring exploration
- User says "deep dive plan", "심층 분석", "계획 수립", "deep plan"

## Do Not Use When

- Simple bug fixes or trivial changes
- Well-understood patterns with clear implementation
- Quick prototypes or experiments
- User just wants code review -- use `code-review` instead

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

## Agent Resolution

| Role | Preferred Type | Fallback | Model |
|------|---------------|----------|-------|
| Explorer | `oh-my-claudecode:explore` | `Explore` | haiku |
| Analyst | `oh-my-claudecode:analyst` | `general-purpose` | opus |
| Risk Assessor | `oh-my-claudecode:security-reviewer` | `general-purpose` | sonnet |
| Planner | `oh-my-claudecode:planner` | `general-purpose` | opus |
| Verifier | `oh-my-claudecode:verifier` | `general-purpose` | sonnet |
| Critic | `oh-my-claudecode:critic` | `general-purpose` | opus |
| Quality Reviewer | `oh-my-claudecode:quality-reviewer` | `general-purpose` | sonnet |

Try the preferred type first. If Task tool rejects the `subagent_type`, use the fallback with the full role description in the prompt.

## Steps

### 1. Initialize

Summarize the user's request and determine scope:

```
Request: [what user wants]
Scope: file | module | project | system
Complexity: Low | Medium | High | Critical
```

### 2. Phase 1 -- Analyze (parallel)

Launch 3 agents in parallel using `Task` with `run_in_background: true`:

1. **Explorer** (haiku) -- codebase structure, file mapping, existing patterns
2. **Analyst** (opus) -- dependencies, constraints, integration points, open questions
3. **Risk Assessor** (sonnet) -- risks by severity, impact areas, security implications

For detailed agent prompts, see [references/agent-prompts.md](references/agent-prompts.md).

Wait for all 3 to complete, then **synthesize** into a unified Analysis Report. See [references/output-templates.md](references/output-templates.md) for the synthesis format.

If any agent's findings raise questions, use `AskUserQuestion` before proceeding.

### 3. Phase 2 -- Plan (sequential)

Launch 1 agent after Analysis is complete:

- **Planner** (opus) -- receives the full Analysis Report, produces Implementation Strategy

The strategy includes: approach, architectural decisions with rationales, phased task breakdown, parallel opportunities, success criteria, rollback strategy, and risk mitigation.

Wait for Planner output before proceeding.

### 4. Phase 3 -- Validate (parallel)

Launch 3 agents in parallel using `Task` with `run_in_background: true`:

1. **Verifier** (sonnet) -- cross-validates Plan against Analysis (are all risks addressed?)
2. **Critic** (opus) -- challenges decisions, finds flaws, checks for scope creep
3. **Quality Reviewer** (sonnet) -- risk scoring matrix, feasibility, completeness checklist

Each agent receives both the Analysis Report and Implementation Strategy.

Wait for all 3 to complete, then **synthesize** into a Validation Report with a decision.

### 5. Decision and Iteration

| Decision | Action |
|----------|--------|
| APPROVED | Proceed to finalization |
| NEEDS REVISION | Re-run only the failed agent(s) with feedback, then re-validate |
| REJECTED | Re-run Planner with specific feedback, then re-validate |

**Decision logic:**
- Any critical issues -> REJECTED or NEEDS REVISION
- Major concerns only -> NEEDS REVISION
- Minor suggestions only -> APPROVED

**Iteration limit:** Maximum 3 rounds. If still not approved, ask user for guidance.

### 6. Finalize

1. Consolidate all reports into `.claudedocs/deep-dive-plan-[feature-name].md`
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

## Examples

**Good:**
User: "deep dive plan for adding OAuth2 authentication"
Action: Run all 3 phases, produce validated plan with architectural decisions, risk mitigation, and phased implementation.
Why good: Complex feature with security implications benefits from multi-agent analysis.

**Bad:**
User: "fix the typo in the README"
Action: Launch deep dive planning with 7 agents.
Why bad: Trivial change doesn't need planning. Just fix it directly.

## Integration

After the plan is approved:
- `/air-claudecode:software-engineer` for implementation
- `/air-claudecode:code-review` after each phase
- `/air-claudecode:git-commit` for incremental commits

## Final Checklist

- [ ] All 3 phases completed (Analyze, Plan, Validate)
- [ ] Analysis covers: architecture, dependencies, constraints, risks, impact areas
- [ ] Plan includes: approach, decisions with rationale, phased tasks, rollback strategy
- [ ] Validation approves with no critical or major issues remaining
- [ ] Final plan saved to `.claudedocs/deep-dive-plan-[feature-name].md`
- [ ] User confirmed the plan via AskUserQuestion
