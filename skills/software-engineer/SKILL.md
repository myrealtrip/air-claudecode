---
name: software-engineer
description: Code implementation specialist -- features, bug fixes, refactoring with clean code
context: fork
agent: software-engineer
model: opus
argument-hint: "[task description]"
---

# Software Engineer

Routes to the software-engineer agent for code implementation tasks.

## Usage

```
/air-claudecode:software-engineer <task description>
```

## When to Use

- User asks to implement a feature, fix a bug, or refactor code
- User says "implement", "feature", "refactor", "구현", "개발", "코드 작성"
- Code changes needed with clean code practices

## Capabilities
- Feature implementation following clean code principles (KISS, DRY, YAGNI)
- Bug fixes with root-cause analysis
- Refactoring with human-readable, consistent abstraction levels
- Kotlin/Java/Spring best practices (constructor injection, layer separation, immutability)
- Uses `when` over complex `if-else`, `val` over `var`, safe calls over `!!`

## Workflow

1. **Understand** -- read existing code, understand context and requirements
2. **Plan** -- identify files to change, decide approach (simplest solution that works)
3. **Implement** -- write clean, human-readable code following project conventions
4. **Verify** -- check compilation, review changes for clean code compliance
5. **Test** -- invoke `/air-claudecode:test-engineer` to generate tests
6. **Review** -- invoke `/air-claudecode:code-review` on the changed files
