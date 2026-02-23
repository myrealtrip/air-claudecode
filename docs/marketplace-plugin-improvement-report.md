# air-claudecode 마켓플레이스 플러그인 개선 검증 리포트

> **대상**: air-claudecode v0.1.4
> **검증일**: 2026-02-23

---

## 1. 핵심 요약

사용자 피드백 3건을 공식 문서와 코드 분석으로 검증하여 **3건의 개선 사항**을 식별했다.

| 등급 | 건수 | 설명 |
|------|------|------|
| **HIGH** | 1건 | 스킬 호출 명칭 불일치 (`/air-claudecode:setup` vs `/setup`) |
| **MEDIUM** | 1건 | MCP Atlassian 설치 가이드에 uv 설치 안내 부재 |
| **LOW** | 1건 | plugins 폴더 관심사 분리 (검토 결과: 시기상조) |

**즉시 조치가 필요한 사항**: HIGH -- 14개 SKILL.md의 `name:` frontmatter로 인한 Claude Code 버그([#22063](https://github.com/anthropics/claude-code/issues/22063))가 스킬 호출 명칭, keyword-detector guard, 추천 메시지, 문서 카탈로그에 걸쳐 불일치를 유발한다. #22063 OPEN + 커뮤니티 최신 보고(v2.1.49, 02-21) 기반 확인.

---

## 2. 검증 방법론 (GC 루프)

**Generator-Critic (GC) 루프**를 3개 영역에 적용하여 검증했다.

1. **Generator**: 각 영역에서 "개선이 필요한 가설"을 생성
2. **Critic**: 공식 문서, GitHub Issues, 실제 코드 분석을 통해 가설을 검증/해소
3. **반복**: 확인된 가설은 발견 사항으로 등록, 해소된 가설은 근거와 함께 기록

| # | 영역 | 가설 수 | 확인 | 해소 |
|---|------|--------|------|------|
| 1 | uv 설치 안내 부재 | 4 | 2 | 2 |
| 2 | 스킬 호출 명칭 불일치 | 5 | 4 | 1 |
| 3 | plugins 폴더 관심사 분리 | 6 | 5 | 1 |

---

## 3. 발견 사항 -- HIGH (1건)

### [H-1] 스킬 호출 명칭 불일치

**영향**: `/` 자동완성에서 스킬이 접두사 없이 등록되어, 문서/코드의 호출 형식과 불일치한다.

**증거**:
- [#22063](https://github.com/anthropics/claude-code/issues/22063) OPEN + 커뮤니티 보고(v2.1.49, 02-21): `name:` 있으면 접두사 누락 확인
- 14개 SKILL.md 전부 `name:` frontmatter 보유 (목록은 영역 2 G2-2 참조)
- README:37, setup SKILL.md:187-214의 호출 형식(`/air-claudecode:setup`)이 실제 동작(`/setup`)과 불일치
- `keyword-detector.mjs:106` guard의 `/air-claudecode:` 접두사 체크가 실제 호출 패턴과 불일치
- `keyword-detector.mjs:120-128` 추천 메시지가 잘못된 호출 형식(`/air-claudecode:${match.name}`)을 안내

**분석**: [#22063](https://github.com/anthropics/claude-code/issues/22063)(namespace 접두사 누락)은 [#17271](https://github.com/anthropics/claude-code/issues/17271)(visibility 버그)과 별개 이슈이다. #17271은 v2.1.29에서 수정되었으나, #22063은 v2.1.50까지 미수정이다. 현재 세션의 시스템 내부 스킬 목록에서는 접두사가 포함되지만, 이는 내부 추적용이며 사용자 대면 `/` 자동완성과 별개 경로이다. 상세 검증은 영역 2 G2-1 참조.

**권장 조치**:
- 14개 SKILL.md에서 `name:` frontmatter 행 제거 (디렉토리명과 동일하므로 동작 변화 없음, #22063 우회 -- 커뮤니티 다수 검증)
- README, setup SKILL.md의 호출 명칭을 현재 동작에 맞게 검증 후 업데이트

---

## 4. 발견 사항 -- MEDIUM (1건)

### [M-1] MCP Atlassian 설치 가이드 uv 설치 안내 부재

**영향**: uvx를 권장 설치 방법으로 안내하지만, uv 자체의 설치 단계가 누락되어 있음

**증거**:
- `docs/install-guide/mcp-atlassian-installation-guide.md:35-41` -- uvx를 권장 방법으로 안내:
  ```
  ### uvx (Recommended)
  Runs directly without permanent installation. Downloads automatically on first run.
  uvx mcp-atlassian
  ```
- `docs/install-guide/mcp-atlassian-installation-guide.md:10-28` -- Prerequisites에 "Python 설치 확인"만 있고, uv 설치 단계 없음

**분석**: uv는 Python과 별도로 설치가 필요한 도구이다 (`brew install uv` 또는 `curl -LsSf https://astral.sh/uv/install.sh | sh`). Prerequisites에 uv 설치 단계가 없으면 `uvx` 명령을 실행할 수 없다.

**대조**: 다른 설치 가이드는 자체 완결적이다.
- `docs/install-guide/gh-installation-guide.md:14` -- `brew install gh` 명시
- `docs/install-guide/gogcli-installation-guide.md:14` -- `brew install steipete/tap/gogcli` 명시

**권장 조치**:
- MCP Atlassian 가이드 Prerequisites에 "3. uv 설치" 단계 추가
- setup 스킬 Pre-flight에 `which uvx` 체크 추가

---

## 5. 발견 사항 -- LOW (1건)

### [L-1] plugins 폴더 관심사 분리 -- 시기상조

**제안**: `marketplace.json`의 plugins 배열에 여러 서브 플러그인을 등록하여 짧은 네임스페이스와 선택적 설치를 구현

**공식 지원**: marketplace 공식 문서에서 `source: "./plugins/..."` 패턴을 시연하고 있어, 기술적으로는 가능하다.

#### 비판적 검토 -- 분리 반대 근거

**1. 플러그인 간 의존성 미지원 (확정)**
- [#9444](https://github.com/anthropics/claude-code/issues/9444): 플러그인 Dependencies 요청 → **"계획되지 않음"으로 종료**
- [#15944](https://github.com/anthropics/claude-code/issues/15944): 플러그인 간 스킬 참조 교차 요청 → **"계획되지 않음"으로 종료**
- 분리 시 hooks(`session-start.mjs`, `keyword-detector.mjs`)와 agents(8개)를 각 서브 플러그인에 **중복 복사**해야 함

**2. 코드 중복 실사례 ([#9444](https://github.com/anthropics/claude-code/issues/9444))**
- 사용자가 7개 플러그인에 32개 에이전트를 복사한 실사례 보고
- "유지보수 부담 -- 모든 복사본에 업데이트를 적용해야 함"
- "일관성 위험 -- 복사본이 서로 다르게 변할 수 있음"

**3. 상위 경로 참조 불가 (공식 문서)**
- 공식 문서: "Installed plugins cannot reference files outside their directory. Paths that traverse outside the plugin root (such as `../shared-utils`) will not work"
- air-claudecode의 `hooks/`, `scripts/`, `agents/`가 모든 스킬에 걸쳐 동작 → 분리 시 공유 불가

**4. 컨텍스트 토큰 오버헤드 ([#23522](https://github.com/anthropics/claude-code/issues/23522))**
- 플러그인 수 증가 → 시스템 프롬프트 토큰 증가
- 142개 도구에서 ~150k 토큰 오버헤드 보고 (95% 낭비)
- 공식 권장: "5개 잘 선택된 플러그인 > 20개 평범한 플러그인"

**5. 버전 관리 복잡도 급증**
- 현재: 4곳 수동 동기화 (`plugin.json` + `marketplace.json` x2 + `package.json`)
- 5개 서브 플러그인 분리 시: 11곳 이상으로 증가

**6. name 버그 미해결 ([#22063](https://github.com/anthropics/claude-code/issues/22063))**
- 분리해도 SKILL.md에 `name:` 필드가 있으면 동일 접두사 누락 발생
- 근본 원인은 Claude Code 코어 버그이지 플러그인 구조 문제가 아님

#### 비판적 검토 -- 분리 찬성 근거

1. **선택적 설치**: 사용자가 필요한 스킬 그룹만 설치 가능
2. **짧은 네임스페이스**: `/git:commit` vs `/air-claudecode:git-commit`
3. **공식 패턴**: marketplace 공식 문서에서 multi-plugin 구조 시연

#### 최종 판단

**현시점 분리 불가** -- 플러그인 간 의존성([#9444](https://github.com/anthropics/claude-code/issues/9444), [#15944](https://github.com/anthropics/claude-code/issues/15944))이 "계획되지 않음"으로 종료된 상태에서, hooks/agents 공유 없는 분리는 코드 중복만 야기한다. [#22063](https://github.com/anthropics/claude-code/issues/22063) 해결 + 플러그인 의존성 지원이 전제조건이다.

---

## 6. GC 루프 상세 (3개 영역)

### 영역 1: uv 설치 안내 부재

#### Generator -- 가설 4건

| # | 가설 | 결과 |
|---|------|------|
| G1-1 | MCP Atlassian 가이드 Prerequisites에 uv 설치 단계가 누락되어 있다 | **확인 → M-1** |
| G1-2 | gh CLI 가이드도 동일한 문제가 있다 | **해소** -- `brew install gh` 명시로 자체 완결 |
| G1-3 | gogcli 가이드도 동일한 문제가 있다 | **해소** -- `brew install steipete/tap/gogcli` 명시로 자체 완결 |
| G1-4 | pip 대안으로 uv 없이도 설치 가능하므로 문제가 아니다 | **부분 확인** -- pip 우회 존재하나 uvx가 기본 권장(35행에 "Recommended") |

#### Critic -- 검증 근거

- **G1-1 확인**: `docs/install-guide/mcp-atlassian-installation-guide.md:10-28`의 Prerequisites에는 "1. Generate API Token"과 "2. Verify Python Installation"만 존재한다. uv는 Python 표준 도구가 아니며 별도 설치가 필요하다.
- **G1-2 해소**: `docs/install-guide/gh-installation-guide.md:14`에 `brew install gh`가 명시되어 있어 gh CLI 설치 가이드는 자체 완결적이다.
- **G1-3 해소**: `docs/install-guide/gogcli-installation-guide.md:14`에 `brew install steipete/tap/gogcli`가 명시되어 있어 gogcli 설치 가이드 역시 자체 완결적이다.
- **G1-4 부분 확인**: `docs/install-guide/mcp-atlassian-installation-guide.md:43-47`에 `pip install mcp-atlassian`이 대안으로 존재하나, 35행에서 uvx를 "(Recommended)"로 안내하고 있다. 권장 방법의 전제조건이 누락된 것은 개선이 필요하다.

---

### 영역 2: 스킬 호출 명칭 불일치

#### Generator -- 가설 5건

| # | 가설 | 결과 |
|---|------|------|
| G2-1 | SKILL.md에 `name:` frontmatter가 있으면 Claude Code 버그로 플러그인 접두사가 누락된다 | **확인 → H-1** |
| G2-2 | 14개 SKILL.md 전부가 영향을 받는다 | **확인** -- 14개 모두 `name:` 필드 보유 |
| G2-3 | `name:` 행을 제거하면 우회할 수 있다 | **확인** -- 디렉토리명과 동일하므로 name 필드 없이도 스킬명 결정 가능 |
| G2-4 | `name:` 제거 시 부작용이 있다 | **해소** -- 디렉토리명이 스킬명으로 사용되므로 동작 변화 없음 |
| G2-5 | keyword-detector의 guard가 무력화된다 | **확인** -- `keyword-detector.mjs:106`의 `/air-claudecode:` 접두사 체크가 실제 호출 패턴과 불일치 |

#### Critic -- 검증 근거

- **G2-1 확인**: [#22063](https://github.com/anthropics/claude-code/issues/22063)에서 보고된 버그로, SKILL.md에 `name:` frontmatter가 존재하면 `{plugin-name}:{skill-name}` 대신 `{name}` 값만으로 스킬이 등록된다. 결과적으로 `/air-claudecode:setup` 대신 `/setup`으로 호출된다.

  **#17271(visibility) vs #22063(namespace) 구분**:

  | | [#17271](https://github.com/anthropics/claude-code/issues/17271) | [#22063](https://github.com/anthropics/claude-code/issues/22063) |
  |---|---|---|
  | **증상** | 스킬이 `/` 자동완성에 **아예 안 보임** | 스킬은 보이지만 **접두사가 빠짐** |
  | **근본 원인** | `isHidden` 하드코딩 | `name:` frontmatter가 접두사 대체 |
  | **v2.1.29** | **수정됨** | **미수정** |

  > @hxnk ([#22063 코멘트](https://github.com/anthropics/claude-code/issues/22063#issuecomment-3827900887), 2026-01-31):
  > "#17271 reports that plugin skills don't appear in slash autocomplete **at all**... **This issue (#22063)** reports that the `name` frontmatter field causes the plugin namespace prefix to be stripped."

  **커뮤니티 검증 타임라인**:

  | 날짜 | 사용자 | 버전 | 내용 | 해석 |
  |------|--------|------|------|------|
  | 01-29 | @Jamie-BitFlight | - | "`name:` 제거하면 자동완성 정상 동작" | #22063 우회법 발견 |
  | 01-30 | @PabloLION | - | "`name:` 제거 후 자동완성 안 됨" | #17271이 아직 막고 있던 상태 |
  | 02-02 | @dnlopes 외 | **v2.1.29** | "스킬이 자동완성에 나타남!" | **#17271 수정 확인** |
  | 02-03 | @PabloLION | v2.1.29 | "`name:` + `commands` 제거 → 정상" | #17271 수정 + #22063 우회 |
  | **02-16** | **@maigentic** | - | "27개 스킬 `name:` → 접두사 없이 등록" | **#22063 재현** |
  | **02-21** | **@arledesma** | **v2.1.49** | "`name:` 제거가 해결책" | **v2.1.49에서도 #22063 미수정** |

  > @maigentic ([#17271 코멘트](https://github.com/anthropics/claude-code/issues/17271), 02-16):
  > "Because the `name` frontmatter field strips the plugin namespace prefix, all 27 skills appear as standalone entries"

  > @arledesma ([#17271 코멘트](https://github.com/anthropics/claude-code/issues/17271), 02-21, v2.1.49):
  > "Simply removing the `name` from the skill did work for me with a local plugin."

  **체인지로그 교차 검증**:

  | 버전 | 변경 사항 | #22063 관련성 |
  |------|----------|-------------|
  | v2.1.29 | 세션 재개 성능 개선 | 없음 (#17271 수정은 미기재) |
  | v2.1.33 | 스킬 설명에 플러그인 이름 추가 | 표시 개선, 네임스페이스 수정 아님 |
  | v2.1.47 | bare name 참조 시 로드 실패 수정 | 내부 해석 개선, 접두사 수정 아님 |

  체인지로그 v2.1.27~v2.1.50에 #22063 수정 기록 없음.

  **현재 세션 관찰 (v2.1.50)**:

  | 관찰 포인트 | 값 | 해석 |
  |------------|---|------|
  | 시스템 리마인더 스킬 목록 | `air-claudecode:setup` (접두사 포함) | 내부 추적용 ID |
  | Skill 도구 호출 형식 | `Skill(skill="air-claudecode:setup")` | 내부 API 레벨 |
  | `/` 자동완성 | 중첩 세션 제한으로 직접 테스트 불가 | -- |

  시스템 내부 표현과 사용자 대면 `/` 자동완성은 별개 경로이다.

  **최종 판정**: 커뮤니티 최신 보고(v2.1.49, 02-21)에서 `name:` 제거 우회가 여전히 필요하며, 체인지로그에 수정 기록이 없다. **#22063 버그는 미수정으로 확정**한다.

- **G2-2 확인**: `grep "^name:"` 결과 14개 SKILL.md 전부에 `name:` 필드가 존재한다.

  ```
  skills/code-review/SKILL.md:2    → name: code-review
  skills/deep-dive-plan/SKILL.md:2 → name: deep-dive-plan
  skills/git-branch/SKILL.md:2     → name: git-branch
  skills/git-commit/SKILL.md:2     → name: git-commit
  skills/git-issue-master/SKILL.md:2 → name: git-issue-master
  skills/git-pr-master/SKILL.md:2  → name: git-pr-master
  skills/gog-calendar/SKILL.md:2   → name: gog-calendar
  skills/jira-master/SKILL.md:2    → name: jira-master
  skills/sentence-refiner/SKILL.md:2 → name: sentence-refiner
  skills/setup/SKILL.md:2          → name: setup
  skills/software-engineer/SKILL.md:2 → name: software-engineer
  skills/sql-generator/SKILL.md:2  → name: sql-generator
  skills/technical-writing/SKILL.md:2 → name: technical-writing
  skills/test-engineer/SKILL.md:2  → name: test-engineer
  ```

- **G2-3 확인**: `name:` 필드 값은 모두 디렉토리명과 동일하다 (예: `skills/setup/SKILL.md`의 `name: setup`). 따라서 `name:` 행을 제거해도 Claude Code가 디렉토리명으로 스킬명을 결정하므로 동작이 변경되지 않으며, #22063 버그를 우회할 수 있다.
- **G2-4 해소**: `name:` 필드가 디렉토리명과 다른 경우는 없다. 14개 모두 디렉토리명 = name 값이므로 제거 시 부작용 없음.
- **G2-5 확인**: `scripts/keyword-detector.mjs:106`의 `userPrompt.startsWith("/air-claudecode:")`는 실제로 사용자가 `/setup`으로 호출하는 상황에서 guard로 작동하지 않는다. 또한 120-128행의 추천 메시지도 `/air-claudecode:${match.name}` 형식으로 출력되어 잘못된 호출 명칭을 안내한다.

---

### 영역 3: plugins 폴더 관심사 분리

#### Generator -- 가설 6건

| # | 가설 | 결과 |
|---|------|------|
| G3-1 | marketplace.json의 plugins 배열에 multi-plugin 구조가 공식 지원된다 | **확인** -- marketplace 공식 문서에서 `source: "./plugins/..."` 패턴 시연 |
| G3-2 | 분리 시 독립 네임스페이스를 얻을 수 있다 | **확인** -- 각 서브 플러그인이 자체 `plugin.json`의 `name`을 네임스페이스로 사용 |
| G3-3 | 공유 자원(hooks, agents, scripts)을 서브 플러그인 간에 참조할 수 있다 | **확인 (불가)** -- 공식 문서: "상위 경로 참조 불가", #9444/#15944: "의존성 계획되지 않음" |
| G3-4 | 분리하면 name 버그가 해결된다 | **해소** -- #22063는 Claude Code 코어 버그이므로 플러그인 구조와 무관 |
| G3-5 | 분리 시 버전 관리 복잡도가 증가한다 | **확인** -- 현재 4곳 → 서브 플러그인 5개 시 11곳 이상 |
| G3-6 | 분리 시 코드 중복이 필수적이다 | **확인** -- 의존성 미지원으로 hooks/agents를 각 플러그인에 복사해야 함 |

#### Critic -- 검증 근거

- **G3-1 확인**: marketplace 공식 문서에서 multi-plugin source 패턴을 시연하고 있다. `.claude-plugin/marketplace.json`의 `plugins[].source` 필드로 서브 디렉토리를 지정할 수 있다.
- **G3-2 확인**: 서브 플러그인 분리 시 각각 독립된 `plugin.json`의 `name` 필드가 네임스페이스가 된다. 예: `git` 플러그인이면 `/git:commit`으로 호출 가능.
- **G3-3 확인 (불가)**: 공식 문서에서 "Installed plugins cannot reference files outside their directory"를 명시한다. [#9444](https://github.com/anthropics/claude-code/issues/9444)(Dependencies)와 [#15944](https://github.com/anthropics/claude-code/issues/15944)(크로스 참조) 모두 "계획되지 않음"으로 종료되었다. air-claudecode의 `hooks/`, `scripts/`, `agents/`는 모든 스킬에 걸쳐 동작하므로 분리 시 공유가 불가능하다.
- **G3-4 해소**: [#22063](https://github.com/anthropics/claude-code/issues/22063)는 SKILL.md의 `name:` 필드 처리 버그이다. 구조를 분리해도 `name:` 필드가 존재하는 한 동일 문제가 발생한다.
- **G3-5 확인**: 현재 버전 동기화 대상은 `plugin.json`, `marketplace.json`(x2), `package.json`의 4곳이다. 5개 서브 플러그인으로 분리하면 각 서브 플러그인의 `plugin.json` + 상위 `marketplace.json`(x5+1) + `package.json`으로 11곳 이상이 된다. [#23522](https://github.com/anthropics/claude-code/issues/23522)에서도 플러그인 수 증가로 인한 토큰 오버헤드가 보고되었다.
- **G3-6 확인**: [#9444](https://github.com/anthropics/claude-code/issues/9444)에서 사용자가 7개 플러그인에 32개 에이전트를 복사한 실사례를 보고했다. "유지보수 부담"과 "일관성 위험"이 실제로 발생했다.

---

## 7. 권장 수정 사항

### 즉시 (v0.1.5)

| # | 수정 내용 | 영역 |
|---|----------|------|
| 1 | 14개 SKILL.md에서 `name:` frontmatter 행 제거 (디렉토리명과 동일하므로 동작 변화 없음, [#22063](https://github.com/anthropics/claude-code/issues/22063) 우회) | 영역 2 |
| 2 | README, setup SKILL.md의 호출 명칭을 현재 동작에 맞게 검증 후 업데이트 | 영역 2 |

### 단기 (v0.2.x)

| # | 수정 내용 | 영역 |
|---|----------|------|
| 3 | `keyword-detector.mjs:106` guard에 접두사 없는 패턴도 추가 (방어적 호환성) | 영역 2 |
| 4 | MCP Atlassian 가이드 Prerequisites에 "3. uv 설치" 단계 추가 | 영역 1 |
| 5 | setup 스킬 Pre-flight에 `which uvx` 체크 추가 | 영역 1 |

### 장기 (전제조건 충족 시)

| # | 수정 내용 | 전제조건 | 영역 |
|---|----------|---------|------|
| 6 | plugins 폴더 분리 PoC | [#22063](https://github.com/anthropics/claude-code/issues/22063) 해결 + 플러그인 의존성 지원 ([#9444](https://github.com/anthropics/claude-code/issues/9444)) | 영역 3 |
| 7 | 다중 플러그인 버전 자동화 | 위 PoC 성공 시 | 영역 3 |

---

## 8. 검증 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| 1 | 14개 SKILL.md `name:` frontmatter 존재 확인 | ✅ 14개 전부 확인 |
| 2 | `name:` 값과 디렉토리명 일치 확인 | ✅ 14개 전부 일치 |
| 3 | keyword-detector guard 동작 확인 | ❌ H-1 -- 실제 호출 패턴과 불일치 |
| 4 | keyword-detector 추천 메시지 호출 형식 확인 | ❌ H-1 -- 잘못된 접두사 형식 출력 |
| 5 | README 호출 명칭과 실제 동작 일치 확인 | ❌ H-1 -- `/air-claudecode:setup` vs `/setup` |
| 6 | setup SKILL.md 카탈로그 호출 형식 확인 | ❌ H-1 -- 카탈로그 전체 불일치 |
| 7 | MCP Atlassian 가이드 Prerequisites 자체 완결성 | ⚠️ M-1 -- uv 설치 단계 누락 |
| 8 | gh CLI 가이드 Prerequisites 자체 완결성 | ✅ `brew install gh` 명시 |
| 9 | gogcli 가이드 Prerequisites 자체 완결성 | ✅ `brew install steipete/tap/gogcli` 명시 |
| 10 | plugins 폴더 분리 가능성 확인 | ❌ L-1 -- 의존성 미지원으로 시기상조 |
| 11 | 현행 단일 플러그인 구조 적정성 | ✅ 현시점 최적 |

---

## 9. 출처

### GitHub Issues (anthropics/claude-code)

| 이슈 | 제목 (요약) | 관련 발견 |
|------|------------|----------|
| [#22063](https://github.com/anthropics/claude-code/issues/22063) | SKILL.md `name:` frontmatter로 인한 플러그인 접두사 누락 | H-1 |
| [#17271](https://github.com/anthropics/claude-code/issues/17271) | 플러그인 스킬 `/` 자동완성 미표시 (visibility 버그, H-1과 구분 필요) | H-1 |
| [#9444](https://github.com/anthropics/claude-code/issues/9444) | 플러그인 의존성/공유 리소스 요청 → "계획되지 않음" 종료 | L-1 |
| [#15944](https://github.com/anthropics/claude-code/issues/15944) | 플러그인 간 스킬 참조 교차 → "계획되지 않음" 종료 | L-1 |
| [#23522](https://github.com/anthropics/claude-code/issues/23522) | 플러그인 토큰 오버헤드 150k (95% 낭비) | L-1 |

### 코드 참조 (air-claudecode 저장소 내부)

| 파일 | 행 | 내용 |
|------|---|------|
| `README.md` | 37 | 스킬 호출 명칭 (`/air-claudecode:setup`) |
| `README.md` | 45-46 | 스킬 호출 예시 (`/air-claudecode:git-commit` 등) |
| `skills/*/SKILL.md` | 2 | `name:` frontmatter (14개 전부) |
| `skills/setup/SKILL.md` | 187-214 | 스킬 카탈로그 (호출 형식 불일치) |
| `scripts/keyword-detector.mjs` | 106 | `/air-claudecode:` 접두사 guard |
| `scripts/keyword-detector.mjs` | 120-128 | 추천 메시지 호출 형식 |
| `docs/install-guide/mcp-atlassian-installation-guide.md` | 10-28 | Prerequisites (uv 설치 누락) |
| `docs/install-guide/mcp-atlassian-installation-guide.md` | 35-41 | uvx 권장 설치 방법 |
| `docs/install-guide/gh-installation-guide.md` | 14 | `brew install gh` (자체 완결) |
| `docs/install-guide/gogcli-installation-guide.md` | 14 | `brew install steipete/tap/gogcli` (자체 완결) |
| `.claude-plugin/marketplace.json` | 9-26 | 단일 플러그인 구조 |

### 공식 문서

- [Claude Code Skills](https://code.claude.com/docs/en/skills) -- `name` 필드 정의: "Display name for the skill. If omitted, uses the directory name"
- [Claude Code Plugins](https://code.claude.com/docs/en/plugins) -- "상위 경로 참조 불가" 명시
- [Claude Code Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) -- multi-plugin source 패턴 시연
- [Claude Code Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) -- v2.1.27~v2.1.50에 #22063 수정 기록 없음
