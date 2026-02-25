# air-claudecode 동작 원리

이 문서는 air-claudecode 플러그인의 내부 동작 원리와 실전 사용 예시를 설명한다.

---

## 1. 아키텍처 개요

### 디렉토리 구조

```
air-claudecode/
├── .claude-plugin/
│   ├── plugin.json          # 플러그인 메타데이터
│   └── marketplace.json     # 마켓플레이스 등록 정보
├── agents/                  # 에이전트 프롬프트 (11개)
│   ├── code-reviewer.md
│   ├── confluence-master.md
│   ├── git-issue-master.md
│   ├── git-pr-master.md
│   ├── jira-master.md
│   ├── log-analyzer.md
│   ├── sentence-refiner.md
│   ├── slack-master.md
│   ├── software-engineer.md
│   ├── technical-writer.md
│   └── test-engineer.md
├── skills/                  # 스킬 정의 (17개)
│   ├── code-review/
│   ├── confluence-master/
│   ├── deep-dive-plan/
│   ├── git-branch/
│   ├── git-commit/
│   ├── git-issue-master/
│   ├── git-pr-master/
│   ├── gog-calendar/
│   ├── jira-master/
│   ├── log-analyzer/
│   ├── sentence-refiner/
│   ├── setup/
│   ├── slack-master/
│   ├── software-engineer/
│   ├── sql-generator/
│   ├── technical-writing/
│   └── test-engineer/
├── hooks/
│   └── hooks.json           # 훅 설정 (2개)
├── scripts/
│   ├── session-start.mjs    # 세션 시작 훅 스크립트
│   └── keyword-detector.mjs # 키워드 감지 훅 스크립트
└── conventions/             # 팀 개발 컨벤션
```

### 핵심 컴포넌트

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| **Skills** | `skills/*/SKILL.md` | 사용자가 `/air-claudecode:<name>`으로 호출하는 작업 단위 |
| **Agents** | `agents/*.md` | fork 스킬에서 위임받아 실행되는 전문 프롬프트 |
| **Hooks** | `hooks/hooks.json` | 세션 시작/사용자 입력 시 자동 실행되는 훅 |
| **Scripts** | `scripts/*.mjs` | 훅에서 실행하는 Node.js 스크립트 |

---

## 2. 핵심 컴포넌트 상세

### 2.1 Skill (`skills/*/SKILL.md`)

각 스킬은 YAML 프론트매터와 마크다운 본문으로 구성된다.

```yaml
---
name: software-engineer              # 스킬 이름
description: Code implementation ... # 설명
context: fork                        # 실행 모드 (fork 또는 생략)
agent: software-engineer             # fork 시 위임할 에이전트
model: opus                          # 사용할 모델 (opus/sonnet/haiku)
argument-hint: "[task description]"  # 호출 시 인자 힌트
---
```

**두 가지 실행 모드:**

- **inline** (`context` 없음): 스킬 프롬프트가 현재 컨텍스트에서 직접 실행된다. 별도 에이전트 프로세스를 생성하지 않는다.
- **fork** (`context: fork`): 별도 에이전트 프로세스(Task)를 생성하여 대응하는 에이전트에 작업을 위임한다. 메인 컨텍스트 윈도우를 보호하면서 전문 프롬프트로 실행된다.

### 2.2 Agent (`agents/*.md`)

에이전트는 fork 스킬에서 위임받아 실행되는 전문 프롬프트다.

```yaml
---
name: software-engineer                    # 에이전트 이름
description: Code implementation ...       # 설명
tools: Read, Grep, Glob, Bash, Edit, Write # 사용 가능한 도구
model: opus                                # 모델
---
```

에이전트는 `tools` 필드에 명시된 도구만 사용할 수 있다. 예를 들어 code-reviewer는 `Edit`과 `Write` 없이 읽기 전용으로 동작한다.

### 2.3 Hook (`hooks/hooks.json`)

두 개의 훅이 등록되어 있다.

| 이벤트 | 스크립트 | 역할 |
|--------|---------|------|
| `SessionStart` | `session-start.mjs` | Claude Code 시작 시 에이전트 카탈로그를 컨텍스트에 주입 |
| `UserPromptSubmit` | `keyword-detector.mjs` | 사용자 입력에서 키워드를 감지하여 스킬/에이전트 제안 |

두 훅 모두 `matcher: "*"`로 설정되어 모든 프로젝트에서 동작한다.

### 2.4 Script (`scripts/`)

**`session-start.mjs`**
- `agents/` 디렉토리의 모든 `.md` 파일을 읽는다.
- 각 파일의 프론트매터에서 `name`, `description`, `model`을 파싱한다.
- 사용 가능한 에이전트 카탈로그를 컨텍스트 메시지로 주입한다.

**`keyword-detector.mjs`**
- 사용자 입력(prompt)을 stdin으로 받는다.
- 15개 스킬에 매핑된 107개 키워드와 대조한다.
- 매칭되면 해당 스킬 호출을 제안하는 메시지를 `additionalContext`로 반환한다.
- `/air-claudecode:`로 시작하는 명시적 호출은 감지를 건너뛴다.

---

## 3. 호출 흐름

### 3.1 세션 시작 흐름

```
Claude Code 시작
       │
       ▼
SessionStart 훅 트리거
       │
       ▼
session-start.mjs 실행
       │
       ▼
agents/ 디렉토리 스캔
       │
       ▼
프론트매터 파싱 (name, description, model)
       │
       ▼
에이전트 카탈로그 컨텍스트 주입
       │
       ▼
"Available agents: ..." 메시지가 Claude에 전달
```

### 3.2 사용자 입력 → 키워드 자동 감지 흐름

```
사용자 입력 (예: "커밋해")
       │
       ▼
UserPromptSubmit 훅 트리거
       │
       ▼
keyword-detector.mjs 실행
       │
       ├─ /air-claudecode: 접두사? → 스킵 (명시적 호출)
       │
       ▼
SKILL_KEYWORDS 순회 매칭
       │
       ├─ 매칭 없음 → { continue: true }
       │
       ▼
매칭됨 (예: "커밋해" → git-commit)
       │
       ▼
additionalContext로 스킬 제안:
"Use /air-claudecode:git-commit for this task"
```

### 3.3 스킬 호출 흐름 (inline vs fork)

```
/air-claudecode:<skill-name> 호출
              │
              ▼
      SKILL.md 프론트매터 로드
              │
       ┌──────┴──────┐
       │             │
   context 없음    context: fork
   (inline)          │
       │             ▼
       │      Task(agent) 생성
       │             │
       ▼             ▼
스킬 프롬프트    agents/<name>.md 로드
직접 실행             │
                     ▼
              에이전트 프롬프트로
              독립 프로세스 실행
                     │
                     ▼
              결과를 메인 컨텍스트에 반환
```

---

## 4. 스킬-에이전트 매핑 테이블

### Inline 스킬 (에이전트 없이 직접 실행)

| 스킬 | 모델 | 설명 | 외부 의존성 |
|------|------|------|------------|
| `git-commit` | sonnet | 컨벤셔널 커밋 메시지 생성 | Git |
| `git-branch` | sonnet | 컨벤셔널 브랜치 생성 | Git, Jira MCP (선택) |
| `sql-generator` | sonnet | DDL/DML SQL 생성 | - |
| `gog-calendar` | haiku | Google Calendar 관리 | gogcli |
| `deep-dive-plan` | opus | 심층 분석 기반 구현 계획 수립 | - |
| `setup` | sonnet | 플러그인 설치 확인 및 설정 | - |

### Fork 스킬 (에이전트에 위임)

| 스킬 | 에이전트 | 모델 | 설명 | 외부 의존성 |
|------|---------|------|------|------------|
| `software-engineer` | software-engineer | opus | 코드 구현 (Kotlin/Java/Spring) | - |
| `code-review` | code-reviewer | opus | 코드 리뷰 (한글, 심각도 등급) | - |
| `test-engineer` | test-engineer | opus | 테스트 생성 (JUnit5/AssertJ/Kotest) | - |
| `technical-writing` | technical-writer | opus | 기술 문서 작성 (toss 방법론) | - |
| `sentence-refiner` | sentence-refiner | sonnet | 한글 문장 다듬기 | - |
| `git-pr-master` | git-pr-master | haiku | GitHub PR CRUD | gh CLI, Jira MCP (선택) |
| `git-issue-master` | git-issue-master | haiku | GitHub Issue CRUD | gh CLI, Jira MCP (선택) |
| `jira-master` | jira-master | haiku | Jira 티켓 CRUD | Atlassian MCP |
| `confluence-master` | confluence-master | haiku | Confluence 페이지 CRUD | Atlassian MCP |
| `slack-master` | slack-master | haiku | Slack 메시지 CRUD | Slack MCP |
| `log-analyzer` | log-analyzer | sonnet | 로그 검색/분석 (OpenSearch) | OpenSearch MCP |

---

## 5. 키워드 자동 감지

### 매칭 로직

`keyword-detector.mjs`는 두 가지 방식으로 키워드를 매칭한다.

- **영문 키워드**: 단어 경계(`\b`)를 사용한 정규식 매칭 (대소문자 무시). `"test"`가 `"testing"`에는 매칭되지 않는다.
- **한글 키워드**: 단순 포함 검사 (`includes`). `"커밋"`이 `"커밋해줘"`에 매칭된다.

명시적으로 `/air-claudecode:`로 시작하는 입력은 키워드 감지를 건너뛴다.

### 키워드 매핑 전체 목록

| 스킬 | 키워드 |
|------|--------|
| `git-commit` | commit, 커밋, 커밋해, commit this, 커밋 만들 |
| `git-branch` | create branch, 브랜치 만들, branch from, new branch, 브랜치 생성 |
| `git-pr-master` | pr, pr 만들, pr 생성, create pr, open pr, merge pr, pull request, 풀 리퀘스트 |
| `git-issue-master` | git issue, github issue, 깃 이슈, 깃헙 이슈, 이슈 만들, 이슈 생성, create issue, file issue, open issue |
| `jira-master` | jira, 지라, 티켓 만들, 티켓 생성, 티켓 조회, 티켓 수정, jira ticket, jira issue |
| `slack-master` | slack, 슬랙, 슬랙 메시지, 슬랙 채널, slack message, slack channel, send slack, read slack, 슬랙 보내 |
| `setup` | setup, 설정, 설치 확인, configure air, air-claudecode setup |
| `code-review` | code review, 코드 리뷰, 리뷰해, review this, pr review, 코드리뷰 |
| `software-engineer` | implement, 구현, 개발, add feature, refactor, 코드 작성, software engineer |
| `test-engineer` | test, 테스트, 테스트 작성, write test, test code, 테스트 코드, 테스트 만들 |
| `sql-generator` | sql, 쿼리, query, ddl, dml, select, create table, 테이블 생성 |
| `gog-calendar` | 일정, 스케줄, schedule, calendar, 캘린더, 오늘 일정, 이번주 일정, 내일 일정, meeting, 미팅 잡아 |
| `technical-writing` | 기술 문서, 문서 작성, technical writing, write document, write a guide, 가이드 작성, 문서화 |
| `sentence-refiner` | 문장 다듬, 문장 교정, sentence refine, refine sentence, 문장 수정, 문체 교정 |
| `deep-dive-plan` | deep dive plan, deep plan, 심층 분석, 계획 수립, deep dive, implementation plan, 구현 계획 |

> `confluence-master`와 `log-analyzer`는 키워드 매핑이 없다. `/air-claudecode:confluence-master` 또는 `/air-claudecode:log-analyzer`로 명시적으로 호출해야 한다.

---

## 6. 사용 예시

### 6.1 코드 구현 → 테스트 → 리뷰 워크플로우

기능 구현부터 테스트, 코드 리뷰까지 일관된 흐름으로 처리한다.

```
사용자: /air-claudecode:software-engineer PROJ-123 로그인 기능 구현
         │
         ▼
   software-engineer 에이전트 실행 (opus)
   - 코드베이스 분석
   - 기능 구현
   - 구현 완료
         │
         ▼
사용자: /air-claudecode:test-engineer LoginService
         │
         ▼
   test-engineer 에이전트 실행 (opus)
   - 구현 코드 분석
   - JUnit5 + AssertJ 테스트 생성
         │
         ▼
사용자: /air-claudecode:code-review
         │
         ▼
   code-reviewer 에이전트 실행 (opus)
   - git diff로 변경사항 확인
   - 심각도별 피드백 (한글)
```

### 6.2 커밋 → PR 워크플로우

```
사용자: "커밋해"
         │
         ▼
   keyword-detector가 "커밋" 감지 → git-commit 스킬 제안
         │
         ▼
사용자: /air-claudecode:git-commit
         │
         ▼
   git-commit 스킬 실행 (inline, sonnet)
   - git diff 분석
   - Jira 티켓 번호 자동 추출 (브랜치명에서)
   - 컨벤셔널 커밋 메시지 생성
   - 사용자 확인 후 커밋
         │
         ▼
사용자: /air-claudecode:git-pr-master create
         │
         ▼
   git-pr-master 에이전트 실행 (fork, haiku)
   - 커밋 히스토리 분석
   - PR 제목/본문 생성
   - 라벨, 리뷰어, 마일스톤 제안
   - Jira 티켓 자동 링크
```

### 6.3 Jira 티켓 관리

```
사용자: "지라 티켓 만들어줘"
         │
         ▼
   keyword-detector가 "지라" 감지 → jira-master 스킬 제안
         │
         ▼
사용자: /air-claudecode:jira-master create PROJ
         │
         ▼
   jira-master 에이전트 실행 (fork, haiku)
   - Atlassian MCP 도구 탐색 (ToolSearch)
   - 프로젝트 목록, 이슈 타입, 우선순위 조회
   - 사용자에게 선택지 제시
   - 확인 후 티켓 생성
```

### 6.4 기술 문서 작성

```
사용자: /air-claudecode:technical-writing Redis 캐싱 전략 가이드
         │
         ▼
   technical-writer 에이전트 실행 (fork, opus)
   - 문서 타입 분류 (개념 설명 / 사용 가이드 / 문제 해결 등)
   - 구조 설계 (독자, 목표, 목차)
   - 초안 작성
         │
         ▼
사용자: /air-claudecode:sentence-refiner docs/redis-caching.md
         │
         ▼
   sentence-refiner 에이전트 실행 (fork, sonnet)
   - toss/technical-writing 문장 규칙 5가지 적용
   - 문장 다듬기 (능동태, 간결한 표현, 쉬운 단어 등)
```

---

## 7. 스킬 간 연계 패턴

아래는 자주 함께 사용되는 스킬 조합이다.

### 구현 → 검증

```
deep-dive-plan  →  software-engineer  →  test-engineer  →  code-review
  (계획 수립)         (코드 구현)          (테스트 생성)      (코드 리뷰)
```

### 문서 작성 → 교정

```
technical-writing  →  sentence-refiner
  (초안 작성)           (문장 다듬기)
```

### 커밋 → 배포

```
git-commit  →  git-pr-master
 (커밋 생성)     (PR 생성/머지)
```

### 이슈 기반 개발

```
jira-master  →  git-branch  →  software-engineer  →  git-commit  →  git-pr-master
(티켓 생성)     (브랜치 생성)     (기능 구현)          (커밋)          (PR 생성)
```
