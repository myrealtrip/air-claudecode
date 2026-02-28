# air-claudecode Setup

**배워야 할 유일한 명령어**입니다. 이것을 실행하면 나머지는 모두 자동입니다.

## 사전 점검 (항상 먼저 실행)

**중요**: 다른 작업을 하기 전에, 모든 설정 호출 시작 시 이 명령어들을 **즉시 무조건** 실행합니다. 질문 없이 환경 상태를 수집합니다.

**모두 병렬로 실행:**

```bash
# gh CLI 설치 확인
which gh && echo "GH_INSTALLED=true" || echo "GH_INSTALLED=false"

# gh CLI 인증 확인
gh auth status 2>&1

# gogcli 설치 확인
which gog && echo "GOG_INSTALLED=true" || echo "GOG_INSTALLED=false"
```
```
# Atlassian MCP 사용 가능 확인
ToolSearch("+atlassian jira")

# Slack MCP 사용 가능 확인
ToolSearch("+slack")
```

결과를 상태 맵으로 수집합니다. 아직 출력을 표시하지 않습니다 -- 상태 보고서 단계에서 표시됩니다.

### 상태 분류

**gh CLI** (필요 스킬: git-pr-master, git-issue-master, git-commit, git-branch):

| 결과 | 상태 | 해결 |
|------|------|------|
| 설치됨 + 인증됨 | `OK` | 사용자명 표시 |
| 설치됨 + 미인증 | `AUTH` | `gh auth login` |
| 미설치 | `MISS` | `brew install gh && gh auth login` |

**Atlassian MCP** (필요 스킬: jira-master):

| 결과 | 상태 | 해결 |
|------|------|------|
| ToolSearch가 도구 반환 | `OK` | 연결된 인스턴스 표시 |
| ToolSearch가 빈 값 반환 | `MISS` | `docs/mcp-atlassian-installation-guide.md`가 있으면 해당 가이드, 없으면 인라인 안내 |

**gogcli** (필요 스킬: gog-calendar):

| 결과 | 상태 | 해결 |
|------|------|------|
| `which gog` 성공 | `OK` | 가능하면 버전 표시 |
| `which gog` 실패 | `MISS` | `docs/install-guide/gogcli-installation-guide.md`가 있으면 해당 가이드, 없으면 인라인 안내 |

**Slack MCP** (선택 -- Slack 연동 활성화):

| 결과 | 상태 | 해결 |
|------|------|------|
| ToolSearch가 slack 도구 반환 | `OK` | 연결 상태 표시 |
| ToolSearch가 빈 값 반환 | `MISS` | `docs/install-guide/slack-mcp-installation-guide.md`가 있으면 해당 가이드, 없으면 인라인 안내 |

---

## 사전 설정 확인: 이미 설정되었는가?

사전 점검 완료 후, 플러그인이 이미 설치되어 작동 중인지 감지합니다.

확인:
1. `.claude-plugin/plugin.json`이 존재하고 `name`과 `version`이 있음
2. `skills/` 디렉토리에 파일이 있음
3. `agents/` 디렉토리에 파일이 있음
4. `hooks/hooks.json`이 존재

### 이미 설정된 경우 (--force 플래그 없음)

모든 플러그인 구성요소가 있고 `--force` 플래그가 없으면:

`AskUserQuestion`으로 프롬프트:

**질문:** "air-claudecode is already installed and working (v{version}). What would you like to do?"

**옵션:**
1. **Quick health check** - 사전 점검 결과와 플러그인 상태를 보여주고 종료
2. **Run full setup** - 전체 설정 마법사를 진행
3. **Cancel** - 변경 없이 종료

**사용자가 "Quick health check" 선택 시:**
- 상태 보고서 표시 (사전 점검 + 플러그인 무결성)
- 종료

**사용자가 "Run full setup" 선택 시:**
- 아래 Step 1부터 계속

**사용자가 "Cancel" 선택 시:**
- 변경 없이 종료

### Force 플래그 오버라이드

사용자가 `--force` 플래그를 전달하면, 이 확인을 건너뛰고 Step 1로 바로 진행합니다.

---

## 사용 모드

이 스킬은 세 가지 시나리오를 처리합니다:

| 플래그 | 동작 |
|--------|------|
| _(없음)_ | 사전 설정 감지 포함 전체 대화형 설정 마법사 |
| `--check` | 빠른 헬스 체크 -- 사전 점검 + 플러그인 무결성 실행, 보고 후 종료 |
| `--force` | 전체 설정 마법사 강제 실행, 사전 설정 감지 건너뛰기 |
| `--help` | 도움말 텍스트 표시 후 종료 |

### 모드 감지

- `--check` 플래그 있음 -> 사전 점검 + 상태 보고서 실행, 그 후 **중지**
- `--force` 플래그 있음 -> 사전 설정 확인 건너뛰고 Step 1 바로 실행
- `--help` 플래그 있음 -> 도움말 텍스트 표시, 그 후 **중지**
- 플래그 없음 -> 사전 설정 확인 실행, 필요시 Step 1

---

## Step 1: 플러그인 무결성 확인

플러그인 구조가 완전한지 검증합니다. 각 구성요소를 확인하고 상태를 보고합니다.

**플러그인 루트 기준으로 다음 경로를 확인:**

| 구성요소 | 경로 | 확인 |
|----------|------|------|
| 플러그인 설정 | `.claude-plugin/plugin.json` | 파일 존재, 유효한 JSON, `name`과 `version` 있음 |
| 스킬 디렉토리 | `skills/` | 디렉토리 존재, SKILL.md 파일 수 |
| 에이전트 디렉토리 | `agents/` | 디렉토리 존재, `.md` 파일 수 |
| 훅 설정 | `hooks/hooks.json` | 파일 존재, `SessionStart`와 `UserPromptSubmit` 항목 있음 |
| 훅 스크립트 | `scripts/session-start.mjs` | 파일 존재 |
| 훅 스크립트 | `scripts/keyword-detector.mjs` | 파일 존재 |

**플러그인 설정이 없으면 여기서 중지.** 재설치 안내를 표시하고 이후 단계를 진행하지 않습니다.

---

## Step 2: 상태 보고서

사전 점검 결과와 플러그인 무결성을 하나의 통합 보고서로 결합합니다.

버전은 `.claude-plugin/plugin.json` (`version` 필드)에서 읽습니다. 스킬과 에이전트 수는 런타임에 파일을 세어 감지합니다.

```
air-claudecode Setup Report (v{version})
======================================

Plugin Integrity
  Plugin config    OK   .claude-plugin/plugin.json
  Skills           OK   {skill_count} skills found
  Agents           OK   {agent_count} agents found
  Hooks config     OK   SessionStart, UserPromptSubmit
  Hook scripts     OK   session-start.mjs, keyword-detector.mjs

Prerequisites
  gh CLI           OK   authenticated as @{username}
  Atlassian MCP    OK   connected to {instance}
  Slack MCP        OK   connected
  gogcli           OK   installed
```

이슈가 있는 경우:
```
Prerequisites
  gh CLI           OK   authenticated as @username
  Atlassian MCP    MISS not configured -- add mcp-atlassian to Claude settings
  Slack MCP        MISS not configured -- see docs/install-guide/slack-mcp-installation-guide.md
  gogcli           MISS not installed -- see docs/install-guide/gogcli-installation-guide.md
```

플러그인 구성요소에 `FAIL`이 있는 경우:
```
Plugin Integrity
  Hooks config     FAIL hooks/hooks.json not found -- reinstall plugin
```

**`--check` 모드인 경우:** 여기서 중지하고 종료합니다.

---

## Step 3: 사용 가능한 스킬 및 에이전트

호출 명령어와 함께 카테고리별 스킬 및 에이전트 목록을 표시합니다.

### 카테고리별 스킬

```
Git & Version Control
  /air-claudecode:git-commit        Conventional commit with Jira/GitHub linking
  /air-claudecode:git-branch        Create branch from Jira ticket or description
  /air-claudecode:git-pr-master     GitHub PR create/review/update/merge/close
  /air-claudecode:git-issue-master  GitHub issue create/read/update/close

Project Management
  /air-claudecode:jira-master       Jira ticket CRUD with interactive selection
  /air-claudecode:confluence-master Confluence page CRUD with space/label management

Communication
  /air-claudecode:slack-master      Slack read/search/send messages, canvases

Code Quality
  /air-claudecode:code-review       Comprehensive code review (severity-rated, Korean)
  /air-claudecode:software-engineer Code implementation, bug fixes, refactoring
  /air-claudecode:test-engineer     Kotlin test generation (JUnit5, AssertJ, Kotest)

Data & SQL
  /air-claudecode:sql-generator     SQL DDL/DML with strict formatting rules

Productivity
  /air-claudecode:gog-calendar      Google Calendar management via gogcli

Writing & Documentation
  /air-claudecode:technical-writing Technical document writer (toss methodology)
  /air-claudecode:sentence-refiner  Korean sentence refiner (toss sentence rules)

Planning
  /air-claudecode:deep-dive-plan    Deep dive planning (analyze -> plan -> validate)

Setup
  /air-claudecode:setup             This setup wizard
```

### 에이전트 (Task 도구를 통한 위임용)

```
  air-claudecode:software-engineer  Code implementation specialist
  air-claudecode:code-reviewer      Code review with structured Korean output
  air-claudecode:test-engineer      Test engineer for Kotlin projects
  air-claudecode:git-pr-master      GitHub PR management with Jira integration
  air-claudecode:git-issue-master   GitHub issue management with Jira integration
  air-claudecode:jira-master        Jira ticket management via Atlassian MCP
  air-claudecode:confluence-master  Confluence page management via Atlassian MCP
  air-claudecode:slack-master       Slack messaging via Slack MCP
  air-claudecode:technical-writer   Technical document writer (toss methodology)
  air-claudecode:sentence-refiner   Korean sentence refiner (toss sentence rules)
```

---

## Step 4: 키워드 트리거

`keyword-detector.mjs` 훅을 통해 자연어에서 스킬이 자동 감지됨을 설명합니다.

```
Keyword Triggers (메시지에서 자동 감지)

  Git
    "commit", "커밋"                         -> git-commit
    "create branch", "브랜치 만들"            -> git-branch
    "pr", "pull request", "PR 만들"          -> git-pr-master
    "github issue", "이슈 만들"               -> git-issue-master

  Project Management
    "jira", "지라", "티켓"                    -> jira-master

  Communication
    "slack", "슬랙", "슬랙 메시지"            -> slack-master

  Code Quality
    "review", "리뷰", "코드 리뷰"             -> code-review
    "implement", "구현", "개발"               -> software-engineer
    "test", "테스트 작성"                     -> test-engineer

  Data
    "sql", "ddl", "create table"             -> sql-generator

  Productivity
    "calendar", "일정", "캘린더"              -> gog-calendar

  Writing
    "기술 문서", "문서 작성", "write document" -> technical-writing
    "문장 다듬", "문장 교정", "sentence"       -> sentence-refiner

  Planning
    "deep dive plan", "심층 분석", "계획 수립" -> deep-dive-plan
```

---

## Step 5: 다음 동작

사전 점검 결과에 따라 `AskUserQuestion`으로 다음 단계를 제안합니다.

**모든 전제 조건이 OK인 경우:**
- **Done** -- 설정 완료, 사용 준비됨
- **Test a skill** -- 확인을 위해 빠른 스킬 호출 시도

**일부 전제 조건이 누락된 경우:**
- **Done** -- 설정 완료 (일부 기능 제한)
- **Install gh CLI** -- 단계별 설치 가이드 (gh가 누락된 경우만)
- **Configure Atlassian MCP** -- MCP 서버 설정 가이드 (Atlassian이 누락된 경우만)
- **Configure Slack MCP** -- Slack MCP 설정 가이드 (Slack이 누락된 경우만)
- **Install gogcli** -- gogcli 설치 가이드 (gogcli가 누락된 경우만)

실제로 누락된 전제 조건에 대해서만 해결 옵션을 표시합니다.

---

## 도움말 텍스트

사용자가 `/air-claudecode:setup --help`를 실행하면 표시:

```
air-claudecode Setup - Verify installation and configure prerequisites

USAGE:
  /air-claudecode:setup           Run setup wizard (or health check if already configured)
  /air-claudecode:setup --check   Quick health check (pre-flight + plugin integrity only)
  /air-claudecode:setup --force   Force full setup wizard, skip pre-setup detection
  /air-claudecode:setup --help    Show this help

WHAT IT CHECKS:
  Plugin Integrity
    - .claude-plugin/plugin.json    Plugin configuration
    - skills/                       Skill definitions (SKILL.md files)
    - agents/                       Agent definitions (.md files)
    - hooks/hooks.json              Hook configuration
    - scripts/                      Hook scripts (session-start, keyword-detector)

  Prerequisites
    - gh CLI                        GitHub CLI (required for PR, issue, commit, branch skills)
    - Atlassian MCP                 Atlassian MCP server (required for Jira skill)
    - gogcli                        Google Calendar CLI (required for calendar skill)

EXAMPLES:
  /air-claudecode:setup             # First time setup or re-check
  /air-claudecode:setup --check     # Quick status check
  /air-claudecode:setup --force     # Re-run full wizard

For more info: https://github.com/myrealtrip/air-claudecode
```

---

## 출력 스타일 규칙

- 상태 테이블에서 일관된 컬럼 정렬 사용
- 상태 레이블: `OK`, `MISS`, `FAIL`, `AUTH` (고정 너비)
- 보고서 헤더에 버전 번호 표시
- 가능한 한 80자 이내로 줄 유지
- 사용자가 한국어로 말하면 대화 텍스트에 한국어 사용

---

## 최종 체크리스트

- [ ] 사전 점검을 먼저 실행 (gh CLI, Atlassian MCP, Slack MCP, gogcli -- 무조건, 병렬로)
- [ ] 사전 설정 감지: 이미 설정된 경우 전체 마법사 건너뛰기 (--force가 아닌 한)
- [ ] 플러그인 무결성 검증 (plugin.json, skills/, agents/, hooks/, scripts/)
- [ ] 통합 상태 보고서 표시
- [ ] 카테고리별 스킬 목록과 호출 명령어 나열
- [ ] 에이전트 목록과 설명 나열
- [ ] 카테고리별 키워드 트리거 표시
- [ ] 실제 전제 조건 상태에 따른 실행 가능한 다음 단계 제안
- [ ] `--check` 모드는 상태 보고서 후 종료
- [ ] `--force` 모드는 사전 설정 감지 건너뛰기
- [ ] `--help` 모드는 도움말 텍스트 표시 후 종료
