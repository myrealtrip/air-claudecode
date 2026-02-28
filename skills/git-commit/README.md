# Git Commit

Conventional Commits 규격에 따라 커밋 메시지를 생성합니다. 연결된 Jira 티켓과 GitHub 이슈를 자동 감지합니다. 변경된 파일과 작성된 메시지를 보여준 후 커밋 전 사용자 확인을 요청합니다.

## 사용 시점
- 사용자가 "commit", "커밋", "commit this", "커밋 해줘"라고 말할 때
- 사용자가 커밋할 스테이징된 또는 스테이징되지 않은 변경 사항이 있을 때
- 사용자가 잘 형식화된 conventional 커밋 메시지를 원할 때

## 사용하지 않을 때
- 사용자가 PR을 만들려 할 때 -- git-pr-master를 대신 사용
- 사용자가 amend나 rebase를 하려 할 때 -- git 명령어를 직접 사용
- 워킹 트리에 변경 사항이 없을 때

## 모드

### 기본 모드
변경된 파일과 작성된 메시지를 보여주고, 커밋 전 `AskUserQuestion`을 통해 사용자 확인을 요청합니다.

### Auto 모드
사용자가 "auto commit", "자동 커밋"이라고 말하거나 인자에 `--auto`가 포함된 경우:
- 사용자 확인을 건너뜀 (`AskUserQuestion` 없음)
- 변경된 모든 파일을 스테이징하고, 메시지를 작성하고, 바로 커밋
- 완료 후 커밋 해시와 요약을 표시

## 단계

1. **변경 사항 확인**
   - `git status`로 스테이징된 파일과 스테이징되지 않은 파일 확인
   - `git diff --cached --stat`으로 스테이징된 파일 요약
   - 스테이징된 것이 없으면 `git diff --stat`을 실행하고 파일 스테이징을 먼저 요청
   - `git log --oneline -5`로 기존 커밋 스타일 확인

2. **참조 감지**
   - **Jira 티켓**: 브랜치 이름에서 추출 (`git branch --show-current`)
     - 패턴: `feature/PROJ-123-desc`, `bugfix/PROJ-456-desc`, `PROJ-789`
   - **GitHub 이슈**: 브랜치 이름 또는 사용자 컨텍스트에서 추출
     - 패턴: `feature/42-add-login`, `issue-42`, `fix-#42`

3. **변경 사항 분석**
   - `git diff --cached` (스테이징된 것이 없으면 `git diff`) 실행하여 실제 변경 내용 파악
   - 성격 판단: 새 기능, 버그 수정, 리팩토링, 문서, 테스트, chore 등
   - 스코프 식별 (영향받는 모듈/컴포넌트)

4. **커밋 메시지 작성** ([Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) 준수):

   ```
   <type>(<scope>): <subject>

   <body>

   <footer>
   ```

   **type**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `build`, `style`
   **scope**: 영향받는 모듈 또는 컴포넌트 (선택이지만 권장)
   **subject**: 명령형, 소문자, 마침표 없음, 최대 50자
   **body**: WHAT이 아닌 WHY를 설명, 72자에서 줄바꿈
   **footer**:
   - Jira: `Refs: PROJ-123` 또는 `Closes: PROJ-123`
   - GitHub: `Closes #42` 또는 `Refs #42`
   - Breaking: `BREAKING CHANGE: 설명`
   - AI 비율: `AI-authored: N%` (정수, 소수점 없음) -- 이 커밋에서 AI가 작성한 코드의 비율 추정. 0% = 전부 사람, 100% = 전부 AI 생성

5. **표시 및 확인** (Auto 모드에서는 건너뛰고 6단계로 직행)

   `AskUserQuestion`을 통해 사용자에게 제시:
   ```
   Changed files:
     M  src/auth/login.ts
     A  src/auth/token.ts
     D  src/auth/legacy.ts

   Commit message:
   ─────────────────
   feat(auth): add JWT refresh token rotation

   Implement automatic token refresh to prevent session expiration
   during active usage. Refresh tokens are rotated on each use
   to limit replay window.

   Refs: PROJ-456
   Closes #42
   AI-authored: 85%
   ─────────────────
   ```

   옵션:
   - **Commit** -- 이 메시지로 진행
   - **Edit** -- 메시지 수정
   - **Cancel** -- 중단

6. **커밋**
   - 기본 모드: 사용자가 "Commit"을 선택한 후에만
   - Auto 모드: 작성 후 즉시 커밋
   - 필요시 파일 스테이징: `git add <특정 파일>`
   - 커밋: `git commit -m "<message>"`
   - 결과 표시: 커밋 해시와 요약

## 예시

**좋은 예:**
브랜치: `feature/PROJ-456-jwt-refresh`
스테이징: auth/에 새로운 토큰 로테이션 로직
```
feat(auth): add JWT refresh token rotation

Implement automatic token refresh to prevent session
expiration during active usage.

Refs: PROJ-456
AI-authored: 90%
```
좋은 이유: 올바른 type, 디렉토리에서 scope 추출, 브랜치에서 Jira 자동 연결, body가 why를 설명, AI 비율 포함.

**나쁜 예:**
브랜치: `feature/PROJ-456-jwt-refresh`
스테이징: auth + config 혼합 변경
메시지: `update files`
나쁜 이유: type 없음, scope 없음, 설명 없음, Jira 참조 누락, 분리 제안 없음.

## 최종 체크리스트
- [ ] 변경 사항 분석 -- 파일 이름뿐 아니라 실제 diff를 읽음
- [ ] 커밋 type이 변경 성격에 맞음
- [ ] subject가 명령형, 소문자, 50자 이하, 마침표 없음
- [ ] 브랜치에서 감지된 경우 Jira 티켓이 footer에 연결
- [ ] 감지된 경우 GitHub 이슈가 footer에 연결
- [ ] 커밋 전 변경 파일과 전체 메시지를 사용자에게 표시 (기본 모드)
- [ ] AskUserQuestion을 통해 사용자가 명시적으로 확인 (기본 모드) 또는 Auto 모드 감지
- [ ] footer에 AI-authored 퍼센트 포함 (정수, 소수점 없음)
- [ ] 여러 관심사가 감지되면 분리를 제안
