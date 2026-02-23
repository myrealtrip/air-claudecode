# air-claudecode 설정 충돌 검증 리포트

> **대상**: air-claudecode v0.1.4
> **검증일**: 2026-02-23

---

## 1. 핵심 요약

air-claudecode 플러그인의 코드, 설정 파일, 공식 문서를 분석하여 **9건의 잠재적 충돌/주의 사항**을 식별했다.

| 등급 | 건수 | 설명 |
|------|------|------|
| **HIGH** | 3건 | 훅 실행 실패, 플러그인 훅 미발화, IDE 호환성 |
| **MEDIUM** | 3건 | 권한 프롬프트 반복, MCP 이름 혼선, 기능 중복 |
| **LOW** | 3건 | 불필요한 matcher, 버전 수동 동기화, 키워드 과감지 |

**즉시 조치가 필요한 사항**: H-1 (CLAUDE_PLUGIN_ROOT 빈 문자열 시 훅 실패)은 환경에 따라 SessionStart 훅 자체가 실행되지 않을 수 있으므로 가장 우선 확인이 필요하다.

---

## 2. 검증 방법론 (GC 루프)

**Generator-Critic (GC) 루프**를 7개 영역에 적용하여 검증했다.

1. **Generator**: 각 영역에서 "충돌이 발생할 수 있는 가설"을 생성
2. **Critic**: 공식 문서, GitHub Issues, 실제 코드 분석을 통해 가설을 검증/해소
3. **반복**: 확인된 가설은 발견 사항으로 등록, 해소된 가설은 근거와 함께 기록

| # | 영역 | 가설 수 | 확인 | 해소 |
|---|------|--------|------|------|
| 1 | 훅 충돌 (SessionStart, UserPromptSubmit) | 5 | 3 | 2 |
| 2 | 설정 계층 구조 (permissions, enabledPlugins) | 3 | 1 | 2 |
| 3 | MCP 서버 설정 (atlassian 이름 중복) | 3 | 1 | 2 |
| 4 | 스킬/에이전트 네이밍 (git 플러그인 중복) | 3 | 2 | 1 |
| 5 | 버전 관리 동기화 (3파일 수동) | 3 | 1 | 2 |
| 6 | 크로스 플랫폼 (Windows async) | 4 | 1 | 3 |
| 7 | IDE 통합 (CLI vs VS Code vs JetBrains) | 3 | 1 | 2 |

---

## 3. 발견 사항 -- HIGH (3건)

### [H-1] SessionStart 훅 CLAUDE_PLUGIN_ROOT 빈 문자열

**영향**: 플러그인의 SessionStart 훅이 실행되지 않아 에이전트 카탈로그가 주입되지 않음

**증거**:
- `hooks/hooks.json:9` -- 훅 command에서 `${CLAUDE_PLUGIN_ROOT}` 환경 변수 사용
  ```json
  "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/session-start.mjs\""
  ```
- `scripts/session-start.mjs:13` -- `__dirname` fallback 존재
  ```js
  const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || join(__dirname, "..");
  ```
- GitHub Issue [#27145](https://github.com/anthropics/claude-code/issues/27145): `CLAUDE_PLUGIN_ROOT`가 빈 문자열(`""`)로 설정되는 경우가 보고됨

**분석**: `session-start.mjs:13`의 `__dirname` fallback은 스크립트가 **정상 실행된 이후**에만 동작한다. 그러나 `hooks.json:9`에서 `${CLAUDE_PLUGIN_ROOT}`가 빈 문자열이면 command 자체가 `node "/scripts/session-start.mjs"`로 해석되어 파일을 찾지 못하고 **스크립트 진입 자체가 실패**한다. 즉, fallback에 도달할 기회가 없다.

**재현 조건**: 플러그인 설치 직후 첫 세션, 또는 플러그인 캐시 경로 변경 시

**권장 조치**:
- hooks.json의 command를 `__dirname` 기반 절대경로로 변경하거나
- 래퍼 셸 스크립트를 통해 경로를 resolve한 후 node를 실행

---

### [H-2] UserPromptSubmit 플러그인 훅 미발화

**영향**: `keyword-detector.mjs`가 등록은 되지만 실행되지 않아 스킬 자동 추천이 동작하지 않음

**증거**:
- `hooks/hooks.json:15-26` -- UserPromptSubmit 훅 정의
- GitHub Issue [#10225](https://github.com/anthropics/claude-code/issues/10225): 플러그인의 `UserPromptSubmit` 훅이 등록은 되지만 실제로 실행되지 않는 알려진 버그
- GitHub Issue [#19491](https://github.com/anthropics/claude-code/issues/19491): 플러그인 훅 실행 관련 추가 보고

**분석**: Claude Code는 사용자 설정 훅과 플러그인 훅을 별도로 관리한다. 현재 구현에서 플러그인의 UserPromptSubmit 훅이 일부 환경에서 트리거되지 않는 것이 확인되었다. 이 버그가 수정될 때까지 keyword-detector 기반 자동 스킬 추천 기능은 불안정하다.

**현재 상태**: 스킬을 명시적으로 `/air-claudecode:<skill-name>`으로 호출하면 정상 동작하므로 핵심 기능에는 영향 없음

**권장 조치**:
- 사용자에게 명시적 스킬 호출(`/air-claudecode:git-commit` 등)을 권장
- 해당 이슈 해결 시까지 키워드 자동감지를 "베타" 기능으로 문서화

---

### [H-3] VS Code 확장 플러그인 훅 미로딩

**영향**: VS Code에서 Claude Code 확장을 사용하는 경우 플러그인 훅이 로드되지 않음

**증거**:
- GitHub Issue [#18547](https://github.com/anthropics/claude-code/issues/18547): VS Code 확장에서 플러그인 훅이 로드되지 않는 문제 보고
- GitHub Issue [#18517](https://github.com/anthropics/claude-code/issues/18517): 플러그인 훅 관련 IDE 호환성 이슈

**분석**: Claude Code CLI에서는 플러그인 시스템이 정상 동작하지만, VS Code 확장은 플러그인 훅 로딩 메커니즘이 다르게 구현되어 있다. 팀원 중 VS Code 사용자가 있을 경우 플러그인 훅(SessionStart, UserPromptSubmit)이 동작하지 않을 수 있으므로 주의가 필요하다.

**권장 조치**:
- README에 "CLI 환경 권장" 안내 추가
- VS Code 사용자에게는 터미널에서 직접 `claude` CLI를 사용하도록 가이드

---

## 4. 발견 사항 -- MEDIUM (3건)

### [M-1] setup 스킬 권한 프롬프트 다수 발생

**영향**: `/air-claudecode:setup` 최초 실행 시 Bash 명령어마다 권한 승인 프롬프트가 반복 표시

**증거**:
- `skills/setup/SKILL.md:17-25` -- Pre-flight 체크에서 실행하는 명령어:
  ```bash
  which gh        # permissions allow에 미포함 가능
  gh auth status  # permissions allow에 미포함 가능
  which gog       # permissions allow에 미포함 가능
  ```

**분석**: `which`, `gh auth status` 등의 명령어가 사용자의 permissions allow 목록에 없으면 setup 스킬 실행 시마다 권한 승인 프롬프트가 표시된다. 이는 UX를 저해하지만 보안상 문제는 아니다.

**권장 조치**:
- README 또는 setup 가이드에 다음 allow 항목 추가를 권장:
  ```json
  "Bash(which:*)", "Bash(gh auth status:*)", "Bash(gh:*)"
  ```
- 또는 setup 스킬에서 이미 허용된 명령어 패턴으로 체크 로직 대체

---

### [M-2] Atlassian MCP 설치 가이드 이름 혼선

**영향**: 기존 Atlassian 공식 MCP와 가이드의 "mcp-atlassian" 이름으로 동시 설정 시 도구 중복

**증거**:
- `docs/install-guide/mcp-atlassian-installation-guide.md:83-84` -- 가이드의 설정:
  ```json
  "mcpServers": {
    "mcp-atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"]
    }
  }
  ```

**분석**: Atlassian은 공식 원격 MCP(`atlassian` 키, `mcp.atlassian.com`)를 제공한다. air-claudecode의 설치 가이드는 sooperset의 로컬 MCP(`mcp-atlassian` 키, `uvx mcp-atlassian`)를 안내한다. 키가 다르므로 JSON 충돌은 없지만, Atlassian 공식 원격 MCP를 이미 사용 중인 환경에서 가이드대로 `mcp-atlassian`을 추가하면 유사한 도구(getJiraIssue, searchConfluence 등)가 중복 등록되어 Claude가 어떤 서버를 사용할지 혼란이 발생할 수 있다.

**권장 조치**:
- 설치 가이드에 "이미 Atlassian 공식 MCP를 사용 중이면 추가 설치 불필요" 안내 추가
- 또는 하나만 활성화하도록 가이드 (`disabledMcpServers` 활용)

---

### [M-3] git 스킬 기능 중복 가능성

**영향**: 다른 git 플러그인과 air-claudecode의 git 관련 스킬이 기능적으로 중복될 수 있음

**증거**:
- air-claudecode가 제공하는 git 관련 스킬:
  - `git-commit` -- Gitmoji + Conventional Commits 커밋
  - `git-branch` -- 브랜치 생성/전환
  - `git-pr-master` -- PR 생성/리뷰/머지
  - `git-issue-master` -- GitHub Issue 관리

**분석**: 사용자가 동일한 git 워크플로우(commit, branch, PR 등)를 제공하는 다른 플러그인을 이미 설치한 경우, 기능이 중복된다. 각 플러그인은 별도의 네임스페이스를 사용하므로(`air-claudecode:git-commit` vs 다른 플러그인의 `commit` 등) 이름 충돌은 없지만, keyword-detector가 "commit"을 감지하면 `air-claudecode:git-commit`만 추천하므로 다른 플러그인의 commit 스킬을 사용하던 사용자에게 혼란을 줄 수 있다.

**권장 조치**:
- 팀 내에서 어느 플러그인의 git 스킬을 표준으로 사용할지 결정
- 중복 사용 시 혼란 방지를 위해 하나를 비활성화하거나, README에 차이점 명시

---

## 5. 발견 사항 -- LOW (3건)

### [L-1] hooks.json matcher "*" 불필요 사용

**영향**: 없음 (동작에 영향 없음). 코드 가독성/유지보수 관점의 개선 사항

**증거**:
- `hooks/hooks.json:5,17` -- 두 훅 모두 `"matcher": "*"` 사용
  ```json
  "SessionStart": [{ "matcher": "*", "hooks": [...] }]
  "UserPromptSubmit": [{ "matcher": "*", "hooks": [...] }]
  ```

**분석**: Claude Code 공식 문서에 따르면 `matcher`는 특정 도구 이름을 필터링하는 데 사용되며, `SessionStart`와 `UserPromptSubmit` 이벤트는 도구 호출이 아니므로 matcher가 적용되지 않는다. `"*"`를 지정해도 무시되므로 동작에 영향은 없지만, matcher 필드를 생략하는 것이 의도를 더 명확히 전달한다.

**권장 조치**:
- `"matcher": "*"` 제거 (선택사항)

---

### [L-2] 버전 3개 파일 수동 동기화 위험

**영향**: 릴리스 시 버전 불일치 발생 가능

**증거**:
- `CLAUDE.md` -- 릴리스 절차:
  > 1. Update the `version` field in all files:
  >    - `.claude-plugin/plugin.json`
  >    - `.claude-plugin/marketplace.json` (top-level `version` and `plugins[0].version`)
  >    - `package.json`
- 현재 버전 동기화 상태 (v0.1.4):
  - `.claude-plugin/plugin.json:3` -- `"version": "0.1.4"` ✅
  - `.claude-plugin/marketplace.json:8` -- `"version": "0.1.4"` ✅
  - `.claude-plugin/marketplace.json:13` -- `"version": "0.1.4"` ✅
  - `package.json:3` -- `"version": "0.1.4"` ✅

**분석**: 현재는 4곳 모두 동기화되어 있지만, 수동 관리이므로 향후 릴리스에서 누락될 위험이 있다. GitHub Issue [#351](https://github.com/anthropics/claude-code/issues/351) 등에서도 플러그인 버전 관리의 어려움이 논의되고 있다.

**권장 조치**:
- `npm version` hook 또는 릴리스 스크립트로 3개 파일 버전을 자동 동기화
- 또는 CI에서 버전 일치 여부를 검증하는 체크 추가

---

### [L-3] keyword-detector 과감지

**영향**: 일반적인 대화에서 불필요한 스킬 추천 메시지 표시

**증거**:
- `scripts/keyword-detector.mjs:37-39` -- 범용 키워드 사용:
  ```js
  "software-engineer": ["implement", "구현", "개발", ...],
  "test-engineer": ["test", "테스트", ...],
  "sql-generator": ["sql", "쿼리", "query", "select", ...],
  ```

**분석**: "implement", "test", "sql", "select" 등은 일반적인 프로그래밍 대화에서 매우 흔히 사용되는 단어이다. 예를 들어 "이 테스트가 왜 실패하는지 봐줘"라는 요청에 test-engineer 스킬이 추천되지만, 사용자의 의도는 단순 디버깅이다.

`matchesKeyword` 함수(`keyword-detector.mjs:53-60`)는 영문의 경우 `\b` word boundary를 사용하지만, "test"나 "implement" 같은 단독 단어는 word boundary만으로 과감지를 방지할 수 없다.

**권장 조치**:
- 단독 단어 키워드는 2-gram 이상으로 확장 (예: "test" → "write test", "run test")
- 또는 추천 빈도를 제한 (동일 세션에서 동일 스킬 추천은 1회만)
- 또는 프롬프트 길이가 일정 이상일 때만 감지 (짧은 키워드가 긴 문맥에서 등장 시 무시)

---

## 6. GC 루프 상세 (7개 영역)

### 영역 1: 훅 충돌 (SessionStart, UserPromptSubmit)

#### Generator -- 가설 5건

| # | 가설 | 결과 |
|---|------|------|
| G1-1 | 사용자 설정의 SessionStart 훅과 플러그인 SessionStart 훅이 충돌한다 | **해소** -- 병렬 실행, 충돌 없음 |
| G1-2 | CLAUDE_PLUGIN_ROOT가 빈 문자열이면 훅 command가 실패한다 | **확인 → H-1** |
| G1-3 | 플러그인의 UserPromptSubmit 훅이 실행되지 않는다 | **확인 → H-2** |
| G1-4 | 훅 timeout(5초)이 네트워크 지연 시 초과된다 | **해소** -- session-start.mjs는 로컬 파일만 읽으므로 5초 충분 |
| G1-5 | 사용자 SessionStart 훅과 플러그인 훅의 실행 순서가 문제된다 | **해소** -- 각 훅은 독립적, 순서 무관 |

#### Critic -- 검증 근거

- **G1-1 해소**: Claude Code는 사용자 설정 훅과 플러그인 훅을 **독립적으로 병렬 실행**한다. 사용자가 별도 SessionStart 훅을 설정한 경우에도 `hooks/hooks.json`의 SessionStart(`session-start.mjs`)와 독립적으로 병렬 실행되며 서로 간섭하지 않는다.
- **G1-4 해소**: `session-start.mjs`는 `agents/` 디렉토리의 `.md` 파일을 읽어 카탈로그를 생성하는 로컬 I/O 작업만 수행(`session-start.mjs:40-58`). 네트워크 호출이 없으므로 5초 timeout은 충분하다.
- **G1-5 해소**: 사용자 설정의 SessionStart 훅과 플러그인의 SessionStart 훅은 완전히 독립적이다. Claude Code는 모든 SessionStart 훅의 결과를 수집한 후 세션을 시작한다.

---

### 영역 2: 설정 계층 구조 (permissions, enabledPlugins)

#### Generator -- 가설 3건

| # | 가설 | 결과 |
|---|------|------|
| G2-1 | permissions allow 목록이 플러그인 스킬의 Bash 호출을 차단한다 | **확인 → M-1** |
| G2-2 | enabledPlugins에 air-claudecode가 없으면 로드되지 않는다 | **해소** -- 플러그인 설치 시 자동 등록 |
| G2-3 | 사용자 설정 계층 간 permissions가 충돌한다 | **해소** -- local이 merge override |

#### Critic -- 검증 근거

- **G2-2 해소**: `enabledPlugins`는 marketplace를 통해 설치된 플러그인에 대한 설정이다. `/plugin install`로 설치하면 자동으로 등록된다.
- **G2-3 해소**: Claude Code의 설정 계층은 `settings.local.json > settings.json > 프로젝트 설정` 순으로 merge된다. 각 계층의 `permissions.allow`는 추가적인 허용 목록이며 상위/하위 계층 설정과 충돌하지 않는다.

---

### 영역 3: MCP 서버 설정 (atlassian 이름 중복)

#### Generator -- 가설 3건

| # | 가설 | 결과 |
|---|------|------|
| G3-1 | "atlassian"과 "mcp-atlassian" 두 서버가 동시 활성화되면 도구 중복 | **확인 → M-2** |
| G3-2 | 같은 이름으로 MCP 서버가 등록되면 설정이 덮어씌워진다 | **해소** -- 이름이 다름 |
| G3-3 | MCP 서버 연결 실패가 세션 시작을 차단한다 | **해소** -- MCP 연결은 비동기, 세션 차단 없음 |

#### Critic -- 검증 근거

- **G3-2 해소**: Atlassian 공식 원격 MCP는 통상 `"atlassian"` 키를, air-claudecode 가이드(`docs/install-guide/mcp-atlassian-installation-guide.md:84`)는 `"mcp-atlassian"` 키를 사용한다. JSON 키가 다르므로 충돌은 없다.
- **G3-3 해소**: MCP 서버는 세션 시작과 비동기로 연결된다. 연결 실패 시 해당 MCP의 도구만 사용 불가이며, 세션 자체는 정상 시작된다.

---

### 영역 4: 스킬/에이전트 네이밍 (git 플러그인 중복)

#### Generator -- 가설 3건

| # | 가설 | 결과 |
|---|------|------|
| G4-1 | 다른 git 플러그인과 air-claudecode의 git 스킬이 기능 중복 | **확인 → M-3** |
| G4-2 | 동일 이름의 스킬이 충돌한다 | **확인** (부분) -- 네임스페이스가 다르므로 이름 충돌은 없으나 키워드 감지에서 혼선 |
| G4-3 | 다른 플러그인과 스킬 이름이 충돌한다 | **해소** -- air-claudecode는 모든 스킬에 `air-claudecode:` 네임스페이스 사용 |

#### Critic -- 검증 근거

- **G4-1 확인**: 다른 플러그인이 동일한 git 기능(commit, branch, PR)을 제공할 경우, air-claudecode의 `git-commit`, `git-branch`, `git-pr-master`, `git-issue-master` 스킬과 기능적으로 중복된다.
- **G4-2 부분 확인**: 스킬 이름은 네임스페이스로 분리되므로(`air-claudecode:git-commit` vs 다른 플러그인의 스킬) 직접 충돌은 없다. 그러나 keyword-detector(`scripts/keyword-detector.mjs:30`)가 "commit"을 감지하면 `air-claudecode:git-commit`만 추천하므로, 다른 플러그인의 commit 스킬을 사용 중인 사용자에게 혼란을 줄 수 있다.
- **G4-3 해소**: air-claudecode는 모든 스킬에 `air-claudecode:` 네임스페이스를 사용하므로 다른 플러그인의 스킬과 이름이 충돌하지 않는다.

---

### 영역 5: 버전 관리 동기화 (3파일 수동)

#### Generator -- 가설 3건

| # | 가설 | 결과 |
|---|------|------|
| G5-1 | 3개 파일의 버전이 불일치할 수 있다 | **확인 → L-2** |
| G5-2 | marketplace.json의 두 version 필드가 불일치할 수 있다 | **해소** -- 현재 동기화 상태 확인됨 (v0.1.4) |
| G5-3 | 버전 불일치가 플러그인 업데이트를 차단한다 | **해소** -- Claude Code는 marketplace.json의 최상위 version만 참조 |

#### Critic -- 검증 근거

- **G5-2 해소**: `.claude-plugin/marketplace.json`의 최상위 `version`과 `plugins[0].version`이 모두 `"0.1.4"`로 일치함을 확인.
- **G5-3 해소**: `/plugin update`는 marketplace.json의 최상위 version 필드를 기준으로 업데이트 여부를 판단한다. 내부 plugins 배열의 version은 메타데이터 용도이다.

---

### 영역 6: 크로스 플랫폼 (Windows async)

#### Generator -- 가설 4건

| # | 가설 | 결과 |
|---|------|------|
| G6-1 | Windows에서 ESM import 경로 문제 발생 | **확인** (참고) -- 팀 내 Windows 사용자 주의 |
| G6-2 | `fileURLToPath`가 Windows 경로에서 실패한다 | **해소** -- Node.js 표준 API, Windows 경로 정상 처리 |
| G6-3 | `node` 명령이 PATH에 없다 | **해소** -- Claude Code 설치 시 Node.js 필수 |
| G6-4 | stdin 비동기 읽기가 Windows에서 블로킹된다 | **해소** -- Node.js의 stdin 스트림은 OS 무관 비동기 |

#### Critic -- 검증 근거

- **G6-1 참고**: `session-start.mjs`와 `keyword-detector.mjs`는 ESM 모듈(`import.meta.url`)을 사용한다. Node.js의 ESM 지원은 크로스 플랫폼이지만, Windows의 파일 경로 구분자(`\` vs `/`) 관련 엣지 케이스가 있을 수 있다.
- **G6-2, G6-3, G6-4 해소**: `fileURLToPath`는 Node.js 공식 API로 크로스 플랫폼 지원. Claude Code 자체가 Node.js 기반이므로 `node` 명령은 항상 사용 가능.

---

### 영역 7: IDE 통합 (CLI vs VS Code vs JetBrains)

#### Generator -- 가설 3건

| # | 가설 | 결과 |
|---|------|------|
| G7-1 | VS Code 확장에서 플러그인 훅이 로드되지 않는다 | **확인 → H-3** |
| G7-2 | JetBrains IDE 연동 시 플러그인 훅이 실행되지 않는다 | **해소** -- JetBrains는 CLI 프로세스를 그대로 사용 |
| G7-3 | IDE 터미널과 외부 터미널에서 설정 충돌 | **해소** -- 동일 설정 파일 참조 |

#### Critic -- 검증 근거

- **G7-2 해소**: JetBrains IDE의 Claude Code 연동은 내부적으로 CLI 프로세스를 실행하므로, CLI와 동일한 플러그인/훅 로딩 경로를 따른다.
- **G7-3 해소**: Claude Code의 설정 파일은 글로벌이므로 어떤 터미널이나 IDE에서 실행하든 동일한 설정이 적용된다.

---

## 7. 권장 수정 사항

### 즉시 (v0.1.5)

| # | 항목 | 수정 내용 | 관련 발견 |
|---|------|----------|----------|
| 1 | hooks.json command 경로 | `CLAUDE_PLUGIN_ROOT` 빈 문자열 방어 로직 추가 | H-1 |
| 2 | README 안내 | keyword-detector 자동 추천을 "베타" 기능으로 명시 | H-2 |
| 3 | README 안내 | CLI 환경 권장, VS Code 제한사항 명시 | H-3 |

### 단기 (v0.2.x)

| # | 항목 | 수정 내용 | 관련 발견 |
|---|------|----------|----------|
| 4 | 설치 가이드 | Atlassian MCP 중복 설치 방지 안내 추가 | M-2 |
| 5 | README | git 플러그인과의 기능 중복 안내, 선택 가이드 | M-3 |
| 6 | setup 스킬 | 권장 permissions allow 목록 문서화 | M-1 |
| 7 | keyword-detector | 과감지 키워드("test", "implement", "sql") 2-gram으로 확장 | L-3 |
| 8 | hooks.json | 불필요한 `"matcher": "*"` 제거 | L-1 |

### 장기 (v0.3.x+)

| # | 항목 | 수정 내용 | 관련 발견 |
|---|------|----------|----------|
| 9 | 릴리스 자동화 | npm version hook으로 3개 파일 버전 자동 동기화 | L-2 |
| 10 | 훅 시스템 | UserPromptSubmit 버그 해결 후 keyword-detector 안정화 | H-2 |

---

## 8. 검증 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| 1 | SessionStart 훅 병렬 실행 확인 (사용자 훅 + 플러그인 훅) | ✅ 충돌 없음 |
| 2 | SessionEnd 훅 영향 확인 (플러그인에 SessionEnd 없음) | ✅ 영향 없음 |
| 3 | enabledPlugins에 air-claudecode 자동 등록 확인 | ✅ 설치 시 자동 |
| 4 | permissions 설정과 플러그인 스킬 호환성 | ⚠️ M-1 참조 |
| 5 | MCP 서버 이름 혼선 확인 ("atlassian" vs "mcp-atlassian") | ⚠️ M-2 참조 |
| 6 | 스킬 네임스페이스 충돌 확인 | ✅ 네임스페이스 분리됨 |
| 7 | CLAUDE_PLUGIN_ROOT 환경 변수 전달 확인 | ❌ H-1 참조 |
| 8 | UserPromptSubmit 훅 발화 확인 | ❌ H-2 참조 |
| 9 | VS Code 확장 호환성 | ❌ H-3 참조 |
| 10 | JetBrains IDE 호환성 | ✅ CLI 기반, 정상 동작 |
| 11 | 버전 동기화 (4곳 v0.1.4) | ✅ 현재 일치 |
| 12 | 다른 플러그인과의 공존 | ✅ 네임스페이스 분리 |

---

## 9. 출처

### GitHub Issues (anthropics/claude-code)

| 이슈 | 제목 (요약) | 관련 발견 |
|------|------------|----------|
| [#27145](https://github.com/anthropics/claude-code/issues/27145) | CLAUDE_PLUGIN_ROOT 빈 문자열 문제 | H-1 |
| [#10225](https://github.com/anthropics/claude-code/issues/10225) | 플러그인 UserPromptSubmit 훅 미발화 | H-2 |
| [#19491](https://github.com/anthropics/claude-code/issues/19491) | 플러그인 훅 실행 관련 이슈 | H-2 |
| [#18547](https://github.com/anthropics/claude-code/issues/18547) | VS Code 확장 플러그인 훅 미로딩 | H-3 |
| [#18517](https://github.com/anthropics/claude-code/issues/18517) | 플러그인 훅 IDE 호환성 | H-3 |
| [#351](https://github.com/anthropics/claude-code/issues/351) | 플러그인 버전 관리 논의 | L-2 |
| [#27247](https://github.com/anthropics/claude-code/issues/27247) | 플러그인 시스템 개선 요청 | 전반 |

### 코드 참조 (air-claudecode 저장소 내부)

| 파일 | 행 | 내용 |
|------|---|------|
| `hooks/hooks.json` | 9 | SessionStart 훅 command 정의 |
| `hooks/hooks.json` | 20 | UserPromptSubmit 훅 command 정의 |
| `scripts/session-start.mjs` | 13 | `CLAUDE_PLUGIN_ROOT` fallback 로직 |
| `scripts/keyword-detector.mjs` | 29-44 | SKILL_KEYWORDS 정의 |
| `scripts/keyword-detector.mjs` | 53-60 | `matchesKeyword` 함수 |
| `skills/setup/SKILL.md` | 17-25 | Pre-flight 체크 명령어 |
| `docs/install-guide/mcp-atlassian-installation-guide.md` | 83-84 | MCP 서버 설정 키 (`mcp-atlassian`) |
| `CLAUDE.md` | 6-9 | 릴리스 절차 (버전 동기화 대상 파일) |
| `.claude-plugin/plugin.json` | 3 | 플러그인 버전 |
| `.claude-plugin/marketplace.json` | 8, 13 | Marketplace 버전 |
| `package.json` | 3 | npm 패키지 버전 |

### 공식 문서

- [Claude Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code Plugins](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [Claude Code Settings](https://docs.anthropic.com/en/docs/claude-code/settings)
