---
name: code-review
description: Comprehensive code review with severity-rated feedback, security/performance/testing checks, and structured Korean output
context: fork
agent: code-reviewer
argument-hint: "[target file or directory]"
---

# Code Review

Routes to the code-reviewer agent for comprehensive code review.

## Usage

```
/air-claudecode:code-review <target>
```

## Capabilities
- Code quality review (KISS, DRY, YAGNI, clean code)
- Security vulnerability detection (OWASP Top 10)
- Performance bottleneck identification (N+1, resource leaks)
- Test coverage assessment
- Documentation completeness check
- Severity-rated output: P0 (blocking), P1 (major), P2 (minor), NIT
- Inline comment prefixes: `[BLOCKING]`, `[MAJOR]`, `[MINOR]`, `[NIT]`, `[SUGGESTION]`, `[QUESTION]`, `[PRAISE]`
- All review output in Korean
