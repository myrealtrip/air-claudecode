# Output Templates

Templates for synthesizing agent outputs and the final plan document.

---

## Analysis Report (Phase 1 Synthesis)

Synthesize Explorer + Analyst + Risk Assessor findings into:

```markdown
## Analysis Report

### 1. Current State
[From Explorer: architecture, code locations, patterns]

### 2. Dependencies
[From Analyst: internal, external, infrastructure]

### 3. Constraints
[From Analyst: technical, business]

### 4. Risks Identified
[From Risk Assessor: all severity levels]

### 5. Impact Areas
[From Risk Assessor: files, components, tests]

### 6. Recommendations for Planner
[Synthesized from all three agents]
- Preferred approach
- Approaches to avoid
- Open questions for user
```

---

## Validation Report (Phase 3 Synthesis)

Synthesize Verifier + Critic + Quality Reviewer findings into:

```markdown
## Validation Report

### 1. Risk Assessment
[From Quality Reviewer: risk scoring matrix]

### 2. Cross-Validation Results
[From Verifier: risk/dependency/impact coverage]

### 3. Strategic Assessment
[From Critic: decision challenges, flaws, assumptions]

### 4. Completeness Assessment
[From Quality Reviewer: checklist results]

### 5. Issues Found
[Consolidated from all three agents]
- Critical Issues (Must Fix)
- Major Concerns (Should Fix)
- Minor Suggestions (Nice to Have)

### 6. Decision
Status: [APPROVED | NEEDS REVISION | REJECTED]

Decision Logic:
- If ANY critical issues -> REJECTED or NEEDS REVISION
- If major concerns only -> NEEDS REVISION
- If minor suggestions only -> APPROVED

Reasoning: [Why this decision]
Required Actions: [If not approved, what must change]
```

---

## Final Plan Document

Save to `.claudedocs/deep-dive-plan-[feature-name].md`:

```markdown
# Deep Dive Plan: [Feature Name]

Created: [Date]
Status: Validated and Approved
Overall Risk: [Low / Medium / High / Critical]

---

## Executive Summary
[2-3 sentences: What, Why, How]

---

## Analysis Report
[Full synthesized analysis from Phase 1]

---

## Implementation Strategy
[Full planner output from Phase 2]

---

## Validation Report
[Full synthesized validation from Phase 3]

---

## Next Steps

Ready to implement? Use this plan with:
- `/air-claudecode:software-engineer` for implementation
- `/air-claudecode:code-review` after each phase
- `/air-claudecode:git-commit` for incremental commits

Recommendation: Implement one phase at a time, validate, then proceed.
```
