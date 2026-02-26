---
name: init-package
description: Generate single-module Kotlin/Spring project package structure with convention validation. Use for project initialization, package scaffolding.
model: sonnet
argument-hint: "[project-name] [base-package]"
---

# Init Package

Generate a single-module Kotlin/Spring project with layer-first package structure, validated against air-international conventions.

## Use When

- New single-module project initialization
- Keywords: "init package", "패키지 구조", "프로젝트 생성", "scaffold", "초기 구조"

## Do Not Use When

- Multi-module project setup (use manual configuration)
- Project already has package structure

## Steps

### 1. Collect Input

Parse arguments: `$ARGUMENTS`

Expected format: `[project-name] [base-package]`

- `$0` → project name (kebab-case, e.g., `my-service`)
- `$1` → base package (dot-separated, e.g., `com.myrealtrip.myservice`)

If either argument is missing, use `AskUserQuestion` to collect:

```
프로젝트 정보를 입력해주세요:
- 프로젝트명 (kebab-case): 예) my-service
- 베이스 패키지: 예) com.myrealtrip.myservice
```

Optionally ask:
- 제외할 패키지 (쉼표 구분)
- 추가 feature 도메인명

### 2. Generate (Task → sonnet)

Launch a generator agent to produce the package structure plan.

```
Task(
  subagent_type: "general-purpose",
  model: "sonnet",
  prompt: "
    Read the conventions file at: {plugin_path}/skills/init-package/references/conventions-summary.md

    Generate a package structure plan for:
    - Project name: {projectName}
    - Base package: {basePackage}
    - Excluded packages: {excludedPackages or 'none'}
    - Additional domains: {additionalDomains or 'none'}

    {context_if_retry}

    Follow the conventions exactly. Include a 'reasoning' field explaining your convention
    application process and (if retrying) how you addressed each piece of prior feedback.
    Return ONLY a JSON object matching the output format specified in conventions-summary.md.
    Do not include any markdown or explanation outside the JSON.
  "
)
```

Where `{plugin_path}` is the absolute path to `plugins/air-scaffold/`.

**`{context_if_retry}`** — included only on retry (rounds 2+):

```
## Previous Attempt

Below is the complete JSON from your previous attempt:

{previous_attempt_json}

## Evaluator Feedback

The evaluator identified the following issues. Address EVERY item:

{evaluator_feedback}

Issues:
{evaluator_issues_json}

Regenerate the full JSON, fixing all identified issues while preserving correct parts.
```

### 3. Evaluate (Task → sonnet)

Launch an evaluator agent to validate the generated structure.

```
Task(
  subagent_type: "general-purpose",
  model: "sonnet",
  prompt: "
    You are an evaluator. Your role is to evaluate ONLY — do not attempt to solve, fix,
    or rewrite the structure. Identify issues precisely and provide actionable feedback.

    Read the validation checklist at: {plugin_path}/skills/init-package/references/validation-checklist.md

    Validate the following generated structure against every check in the checklist:

    {generated_json_from_step_2}

    Return ONLY a JSON object matching the output format specified in validation-checklist.md.
    Be strict — flag any deviation from the checklist.
    Include a 'feedback' field with a high-level summary and specific guidance for the Generator.
  "
)
```

### 4. Iterate (based on Evaluator verdict)

Branch on the Evaluator's `result` field:

- **PASS** → proceed to Step 5
- **NEEDS_IMPROVEMENT** → re-run the Generate → Evaluate loop:
  1. Store the full previous attempt JSON and the Evaluator's `feedback` + `issues[]`
  2. Re-run Step 2 (Generate) with `{context_if_retry}` populated (previous attempt JSON + evaluator feedback + issues)
  3. Re-run Step 3 (Evaluate) on the new output
  4. **Maximum 2 rounds** — if still not PASS after 2 rounds, present issues to user and ask how to proceed
- **FAIL** → immediately present issues to user and ask how to proceed (do not auto-retry on critical failures)

### 5. User Confirmation

When Evaluator returns `PASS`, present the structure to the user:

```
AskUserQuestion:
  생성할 패키지 구조를 확인해주세요:

  프로젝트: {projectName}
  패키지: {basePackage}

  디렉토리 ({count}개):
  {directory_tree}

  파일:
  - build.gradle.kts
  - settings.gradle.kts
  - {AppName}Application.kt
  - application.yml

  [확인] 생성 진행 / [수정] 구조 변경 / [취소] 중단
```

- **확인** → proceed to Step 6
- **수정** → go back to Step 2 with user's modification request
- **취소** → stop

### 6. Execute

Create all directories and files in the **current working directory**:

**Directories** — create with `.gitkeep`:

```bash
# For each directory in the plan:
mkdir -p {directory_path}
touch {directory_path}/.gitkeep
```

Use `Bash` tool for directory creation (single command with all `mkdir -p` calls).

**Files** — create with `Write` tool:

1. `build.gradle.kts`
2. `settings.gradle.kts`
3. `src/main/kotlin/{basePackagePath}/{AppName}Application.kt`
4. `src/main/resources/application.yml`

### 7. Verify

Run verification and display results:

```bash
find src -type d | sort
find src -name ".gitkeep" | wc -l
```

Display final summary:

```
패키지 구조 생성 완료!

프로젝트: {projectName}
패키지: {basePackage}
디렉토리: {count}개
.gitkeep: {count}개
파일: build.gradle.kts, settings.gradle.kts, {AppName}Application.kt, application.yml
```

## References

- [references/conventions-summary.md](references/conventions-summary.md) — Generator prompt: package structure rules and templates
- [references/validation-checklist.md](references/validation-checklist.md) — Evaluator prompt: validation checklist
- [references/test-reference.md](references/test-reference.md) — Dry-run test cases for verifying Generator-Evaluator loop

## Final Checklist

- [ ] Project name and base package collected
- [ ] Generator produced valid JSON structure
- [ ] Evaluator validated with PASS
- [ ] User confirmed the structure
- [ ] All directories created with .gitkeep
- [ ] build.gradle.kts, settings.gradle.kts written
- [ ] Application.kt with @SpringBootApplication + UTC TimeZone written
- [ ] application.yml written
- [ ] Final tree matches expected structure

## User Request

$ARGUMENTS
