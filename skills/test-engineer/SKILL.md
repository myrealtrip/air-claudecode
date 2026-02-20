---
name: test-engineer
description: Test engineer -- meaningful Kotlin tests with JUnit5, AssertJ, Kotest
model: opus
argument-hint: "[target class or method to test]"
---

# Test Generator

Routes to the test-engineer agent for test generation tasks.

## Usage

```
/air-claudecode:test-engineer <target class or method>
```

## When to Use

- User asks to write tests, generate tests, or add test coverage
- User says "test", "테스트", "테스트 작성", "write tests", "test code"
- Test generation needed for existing production code

## Routing

```
Task(subagent_type="air-claudecode:test-engineer", model="opus", prompt="{{ARGUMENTS}}")
```

## Capabilities
- Meaningful test generation (business logic, edge cases, error paths)
- JUnit5 with given-when-then structure
- AssertJ fluent assertions, Kotest matchers
- Parameterized tests, nested test organization
- Mockito-Kotlin / MockK for dependency mocking

## Workflow

1. **Understand** -- read production code, identify what to test
2. **Plan** -- decide test scope (critical paths, boundaries, error handling)
3. **Write tests** -- meaningful tests following project conventions
4. **Run & verify** -- execute tests, ensure all pass

Task: {{ARGUMENTS}}
