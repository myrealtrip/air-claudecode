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

    Follow the conventions exactly. Return ONLY a JSON object matching the output format
    specified in conventions-summary.md. Do not include any markdown or explanation outside the JSON.
  "
)
```

Where `{plugin_path}` is the absolute path to `plugins/air-scaffold/`.

### 3. Critique (Task → haiku)

Launch a critic agent to validate the generated structure.

```
Task(
  subagent_type: "general-purpose",
  model: "haiku",
  prompt: "
    Read the validation checklist at: {plugin_path}/skills/init-package/references/validation-checklist.md

    Validate the following generated structure against every check in the checklist:

    {generated_json_from_step_2}

    Return ONLY a JSON object matching the output format specified in validation-checklist.md.
    Be strict -- flag any deviation from the checklist.
  "
)
```

### 4. Iterate (if FAIL)

If the Critic returns `FAIL`:

1. Extract `issues[]` from the Critic's response
2. Re-run Step 2 (Generate) with feedback:
   ```
   Previous attempt had these issues:
   {issues_list}

   Fix all issues and regenerate.
   ```
3. Re-run Step 3 (Critique) on the new output
4. **Maximum 2 rounds** — if still FAIL after 2 rounds, present issues to user and ask how to proceed

### 5. User Confirmation

When Critic returns `PASS`, present the structure to the user:

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
- [references/validation-checklist.md](references/validation-checklist.md) — Critic prompt: validation checklist

## Final Checklist

- [ ] Project name and base package collected
- [ ] Generator produced valid JSON structure
- [ ] Critic validated with PASS
- [ ] User confirmed the structure
- [ ] All directories created with .gitkeep
- [ ] build.gradle.kts, settings.gradle.kts written
- [ ] Application.kt with @SpringBootApplication + UTC TimeZone written
- [ ] application.yml written
- [ ] Final tree matches expected structure

## User Request

$ARGUMENTS
