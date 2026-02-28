# Git Branch

컨벤션에 맞는 Git 브랜치를 생성합니다. 가능한 경우 Jira 티켓 상세 정보를 가져오고, 그렇지 않으면 사용자 설명으로부터 생성합니다. 생성 전 확인을 요청합니다.

## 사용 시점
- 사용자가 "create branch", "브랜치 만들어", "branch from ticket"이라고 말할 때
- 사용자가 Jira 티켓 ID를 제공할 때 (예: PROJ-123)
- 사용자가 Jira 연결 유무와 관계없이 컨벤션에 맞는 브랜치를 원할 때

## 사용하지 않을 때
- 사용자가 브랜치를 전환하려 할 때 -- `git checkout`을 직접 사용
- 사용자가 브랜치를 삭제하거나 이름을 변경하려 할 때 -- git 명령어를 직접 사용

## 단계

1. **소스 결정**

   **Jira 티켓이 있는 경우** (티켓 ID가 제공되었거나 컨텍스트에서 발견):
   - 첫 MCP 사용 전 `ToolSearch("+atlassian jira")` 호출
   - `mcp__mcp-atlassian__jira_get_issue`로 조회
   - 추출: 티켓 키, 요약, 이슈 유형

   **Jira 티켓이 없는 경우** (티켓 ID 없음):
   - 사용자에게 질문: 브랜치 목적(feature, fix)과 간단한 설명
   - 또는 사용자의 자연어 설명에서 추론

2. **브랜치 이름 생성**

   접두사 규칙:
   | 소스 | 접두사 |
   |------|--------|
   | Bug, Defect 또는 사용자가 "fix"/"bugfix"라고 언급 | `fix/` |
   | 그 외 모든 경우 | `feature/` |

   Jira 포함 형식: `{prefix}{PROJ-123}-{kebab-요약}`
   Jira 미포함 형식: `{prefix}{kebab-요약}`
   - 요약: 소문자, 공백을 하이픈으로, 특수문자 제거
   - 최대 3~4단어 -- 짧고 인식 가능하게
   - 전체 브랜치 이름 35자 이하

   예시:
   - Jira 포함: `feature/PROJ-123-jwt-refresh-token`
   - Jira 미포함: `fix/login-timeout-mobile`

3. **사용자에게 확인** (`AskUserQuestion` 사용)

   제시 내용:
   ```
   Jira: PROJ-123 - Add JWT refresh token rotation  (또는 "No Jira ticket")
   Type: Story

   Branch: feature/PROJ-123-jwt-refresh-token
   ```

   질문:
   - **베이스 브랜치**: 사용 가능한 브랜치에서 선택 (`develop`, `main` 제안)
   - **브랜치 이름**: 확인 또는 수정
   - 최종: 생성 / 수정 / 취소

4. **브랜치 생성** (사용자 확인 후에만)
   - `git fetch origin`
   - `git checkout -b {branch-name} origin/{base-branch}`
   - 결과 표시: 브랜치 이름과 현재 상태

## 예시

**좋은 예 (Jira 포함):**
사용자: "PROJ-456 브랜치 만들어"
조회 결과: PROJ-456 "Fix login timeout on mobile Safari" (Bug)
생성: `fix/PROJ-456-login-timeout-mobile`
좋은 이유: Bug에 대한 올바른 접두사, Jira 연결, 사용자 확인 완료.

**좋은 예 (Jira 미포함):**
사용자: "유저 프로필 기능 브랜치 만들어줘"
생성: `feature/user-profile-page`
좋은 이유: Jira 불필요, 사용자 입력에서 설명 추출, 접두사 올바름.

**나쁜 예:**
사용자: "브랜치 만들어"
동작: 설명을 묻지 않고 `feature/new-branch` 생성.
나쁜 이유: 일반적인 이름, 컨텍스트 수집 없음, 사용자 확인 없음.

## 최종 체크리스트
- [ ] 티켓 ID가 제공되었거나 감지 가능한 경우 Jira 티켓 조회
- [ ] Jira가 없으면 사용자 입력에서 설명 수집
- [ ] 브랜치 접두사가 유형에 맞음 (버그는 fix/, 그 외는 feature/)
- [ ] 요약이 kebab-case, 최대 3~4단어, 전체 브랜치 이름 35자 이하
- [ ] 베이스 브랜치를 사용자가 명시적으로 선택
- [ ] AskUserQuestion을 통해 사용자가 브랜치 이름 확인
- [ ] 최신 리모트에서 브랜치 생성 (checkout 전 `git fetch`)
