# air-claudecode 플러그인 검증 리포트

검증 일시: 2026-02-25

---

## 1. 개요

air-claudecode 플러그인이 로컬에 정상 설치되어 있는지 확인하고, 훅 동작(SessionStart, UserPromptSubmit), 키워드 감지, 스킬-에이전트 매핑이 실제로 동작하는지 검증한다.

---

## 2. 테스트 환경

| 항목 | 값 |
|------|-----|
| Claude Code | v2.1.56 |
| Node.js | v24.13.0 |
| 코드베이스 버전 | v0.1.7 |
| 설치된 캐시 버전 | v0.1.5 |
| 플러그인 활성화 | `enabledPlugins`에서 `true` |
| 운영체제 | macOS (Darwin 25.3.0) |

---

## 3. 테스트 결과 요약

| 테스트 그룹 | 테스트 수 | 통과 | 실패 | 결과 |
|-------------|----------|------|------|------|
| 설치 상태 검증 | 5 | 4 | 1 | **버전 불일치** |
| SessionStart 훅 | 2 | 2 | 0 | PASS |
| 키워드 감지 (기본) | 14 | 14 | 0 | PASS |
| 키워드 감지 (경계) | 7 | 7 | 0 | PASS |
| 키워드 감지 (폴백 필드) | 3 | 3 | 0 | PASS |
| 문서 정합성 검증 | 6 | 6 | 0 | PASS |
| **합계** | **37** | **36** | **1** | |

---

## 4. 상세 테스트 결과

### 4.1 설치 상태 검증

| # | 검증 항목 | 기대값 | 실제값 | 결과 |
|---|----------|--------|--------|------|
| 1 | Claude Code 설치 | 설치됨 | v2.1.56 | PASS |
| 2 | Node.js 설치 | 설치됨 | v24.13.0 | PASS |
| 3 | 플러그인 활성화 | `true` | `true` | PASS |
| 4 | 캐시 버전 = 코드베이스 버전 | v0.1.7 | v0.1.5 | **FAIL** |
| 5 | 훅 등록 (hooks.json) | SessionStart, UserPromptSubmit | SessionStart, UserPromptSubmit | PASS |

**버전 불일치 상세:**

| 항목 | 캐시 (v0.1.5) | 코드베이스 (v0.1.7) | 차이 |
|------|--------------|-------------------|------|
| 스킬 수 | 14 | 17 | +3 |
| 에이전트 수 | 8 | 11 | +3 |
| 누락 스킬 | - | confluence-master, slack-master, log-analyzer | v0.1.6~v0.1.7 추가분 |
| 누락 에이전트 | - | confluence-master, slack-master, log-analyzer | 동일 |

### 4.2 SessionStart 훅 테스트

**명령어:**
```bash
echo '{}' | CLAUDE_PLUGIN_ROOT="$(pwd)" node scripts/session-start.mjs
```

**결과:** PASS

- 11개 에이전트 카탈로그가 JSON 형태로 출력되었다.
- 각 에이전트의 `description`이 `agents/*.md` 프론트매터의 원본 값과 11개 모두 정확히 일치함을 확인했다.
- 출력된 에이전트 목록:

| # | 에이전트 | 모델 |
|---|---------|------|
| 1 | code-reviewer | opus |
| 2 | confluence-master | haiku |
| 3 | git-issue-master | haiku |
| 4 | git-pr-master | haiku |
| 5 | jira-master | haiku |
| 6 | log-analyzer | sonnet |
| 7 | sentence-refiner | sonnet |
| 8 | slack-master | haiku |
| 9 | software-engineer | opus |
| 10 | technical-writer | opus |
| 11 | test-engineer | opus |

### 4.3 UserPromptSubmit 훅 테스트 (키워드 감지)

**명령어:**
```bash
echo '{"user_prompt":"<입력>"}' | CLAUDE_PLUGIN_ROOT="$(pwd)" node scripts/keyword-detector.mjs
```

> 주의: 입력 JSON의 필드명은 `user_prompt`이다 (`message`가 아님).

#### 4.3.1 기본 키워드 매칭 (14건, 전체 PASS)

| # | 입력 | 기대 스킬 | 실제 스킬 | 결과 |
|---|------|----------|----------|------|
| 1 | `커밋해` | git-commit | git-commit | PASS |
| 2 | `코드 리뷰해줘` | code-review | code-review | PASS |
| 3 | `지라 티켓 만들어` | jira-master | jira-master | PASS |
| 4 | `오늘 일정 알려줘` | gog-calendar | gog-calendar | PASS |
| 5 | `PR 만들어줘` | git-pr-master | git-pr-master | PASS |
| 6 | `테스트 작성해줘` | test-engineer | test-engineer | PASS |
| 7 | `SQL 쿼리 만들어줘` | sql-generator | sql-generator | PASS |
| 8 | `브랜치 만들어줘` | git-branch | git-branch | PASS |
| 9 | `문서 작성해줘` | technical-writing | technical-writing | PASS |
| 10 | `문장 다듬어줘` | sentence-refiner | sentence-refiner | PASS |
| 11 | `이슈 만들어줘` | git-issue-master | git-issue-master | PASS |
| 12 | `슬랙 보내줘` | slack-master | slack-master | PASS |
| 13 | `deep dive plan 수립` | deep-dive-plan | deep-dive-plan | PASS |
| 14 | `setup` | setup | setup | PASS |

#### 4.3.2 경계 케이스 (7건, 전체 PASS)

| # | 입력 | 기대 결과 | 실제 결과 | 검증 포인트 | 결과 |
|---|------|----------|----------|------------|------|
| 1 | `커밋 메시지 작성해줘` | git-commit | git-commit | 한글 부분 매칭 (includes) | PASS |
| 2 | `testing` | continue: true | continue: true | 영문 단어 경계 (\b) | PASS |
| 3 | `recommit` | continue: true | continue: true | 영문 단어 경계 (\b) | PASS |
| 4 | `hello world` | continue: true | continue: true | 매칭 없음 | PASS |
| 5 | (빈 문자열) | continue: true | continue: true | 빈 입력 처리 | PASS |
| 6 | `not json` (잘못된 JSON) | continue: true | continue: true | JSON 파싱 실패 처리 | PASS |
| 7 | `/air-claudecode:git-commit` | continue: true | continue: true | 명시적 호출 스킵 | PASS |

#### 4.3.3 폴백 입력 필드 (3건, 전체 PASS)

`keyword-detector.mjs`는 `user_prompt`, `userPrompt`, `prompt` 세 가지 필드를 순서대로 탐색한다.

| # | 입력 필드 | 입력값 | 기대 스킬 | 실제 스킬 | 결과 |
|---|----------|--------|----------|----------|------|
| 1 | `user_prompt` | `커밋해` | git-commit | git-commit | PASS |
| 2 | `userPrompt` | `커밋해` | git-commit | git-commit | PASS |
| 3 | `prompt` | `커밋해` | git-commit | git-commit | PASS |

#### 4.3.4 키워드 미등록 스킬 (2건)

| 스킬 | 키워드 매핑 | 호출 방법 |
|------|-----------|----------|
| `confluence-master` | 없음 | `/air-claudecode:confluence-master` 명시 호출만 가능 |
| `log-analyzer` | 없음 | `/air-claudecode:log-analyzer` 명시 호출만 가능 |

### 4.4 문서 정합성 검증

`docs/how-it-works.md` 문서의 내용을 소스 코드와 교차 검증했다.

| # | 검증 항목 | 문서 기재값 | 소스 코드 실제값 | 결과 |
|---|----------|-----------|----------------|------|
| 1 | 전체 스킬 수 | 17개 | 17개 | PASS |
| 2 | 전체 에이전트 수 | 11개 | 11개 | PASS |
| 3 | 키워드 매핑 스킬 수 | 15개 | 15개 | PASS |
| 4 | 키워드 총 수 | 107개 | 107개 | PASS |
| 5 | inline 스킬 수 | 6개 | 6개 (git-commit, git-branch, sql-generator, gog-calendar, deep-dive-plan, setup) | PASS |
| 6 | fork 스킬 수 | 11개 | 11개 | PASS |

**스킬-에이전트 매핑 정합성 (fork 스킬 11개, 전체 일치):**

| 스킬 | 문서 기재 에이전트 | 실제 에이전트 파일 | 결과 |
|------|------------------|------------------|------|
| code-review | code-reviewer | agents/code-reviewer.md 존재 | PASS |
| confluence-master | confluence-master | agents/confluence-master.md 존재 | PASS |
| git-issue-master | git-issue-master | agents/git-issue-master.md 존재 | PASS |
| git-pr-master | git-pr-master | agents/git-pr-master.md 존재 | PASS |
| jira-master | jira-master | agents/jira-master.md 존재 | PASS |
| log-analyzer | log-analyzer | agents/log-analyzer.md 존재 | PASS |
| sentence-refiner | sentence-refiner | agents/sentence-refiner.md 존재 | PASS |
| slack-master | slack-master | agents/slack-master.md 존재 | PASS |
| software-engineer | software-engineer | agents/software-engineer.md 존재 | PASS |
| technical-writing | technical-writer | agents/technical-writer.md 존재 | PASS |
| test-engineer | test-engineer | agents/test-engineer.md 존재 | PASS |

---

## 5. 발견 사항

### 5.1 버전 불일치 (심각도: 중)

설치된 캐시(v0.1.5)가 코드베이스(v0.1.7)보다 2버전 뒤처져 있다. v0.1.6~v0.1.7에서 추가된 3개 스킬/에이전트(confluence-master, slack-master, log-analyzer)가 실제 사용 환경에서 누락된다.

### 5.2 한글 키워드 오탐지 가능성 (심각도: 낮)

한글 키워드는 `includes` 기반 부분 매칭을 사용하므로, 의도하지 않은 매칭이 발생할 수 있다.

- 예시: `"커밋이란 뭐야?"` → "커밋" 포함으로 git-commit 감지됨
- 이는 커밋을 요청한 것이 아니라 커밋에 대해 질문한 것이지만, 키워드 감지는 의도를 구분하지 않는다.
- 현재는 `additionalContext`로 제안만 하고 자동 실행하지 않으므로, 실질적 문제는 제한적이다.

### 5.3 키워드 미등록 스킬 (심각도: 정보)

`confluence-master`와 `log-analyzer`는 SKILL_KEYWORDS에 등록되어 있지 않다. 이는 의도적 설계이며 `docs/how-it-works.md`에 명시되어 있다. 명시적 호출(`/air-claudecode:<name>`)로만 사용 가능하다.

---

## 6. 권장 조치

| # | 조치 | 우선순위 | 설명 |
|---|------|---------|------|
| 1 | 플러그인 업데이트 | 높음 | `claude plugin update air-claudecode` 또는 캐시 삭제 후 재설치로 v0.1.7에 맞춰야 한다 |
| 2 | 키워드 미등록 스킬 검토 | 낮음 | `confluence-master`, `log-analyzer`에 키워드를 추가할지 팀 내 논의 |
| 3 | 한글 오탐지 모니터링 | 낮음 | 현재 제안 방식(additionalContext)이므로 긴급하지 않으나, 사용 빈도에 따라 매칭 로직 개선 검토 |
