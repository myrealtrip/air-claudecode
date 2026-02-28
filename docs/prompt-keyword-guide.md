# Claude Code 프롬프트 키워드 가이드

Claude Code를 더 효과적으로 사용하기 위한 키워드, 패턴, 워크플로우 모음.
공식 [Best Practices](https://docs.anthropic.com/en/docs/claude-code/best-practices) 기반, kopring(Kotlin + Spring) 항공 발권 시스템 실전 예시 포함.

---

## 1. Extended Thinking 키워드

> "생각의 깊이를 조절하는 마법의 단어들"

Claude Code는 특정 키워드로 thinking 토큰 예산을 조절한다.

| 키워드 | 별칭 | 토큰 예산 | 사용 시나리오 |
|--------|------|-----------|--------------|
| `think` | - | 기본 확장 | 단일 버그, 로직 파악, 간단한 분석 |
| `think hard` | `megathink` | 중간 확장 | 서비스 리팩토링, 복잡한 비즈니스 로직 |
| `think harder` | `ultrathink` | 최대 확장 | 아키텍처 설계, 시스템 전체 분석 |

### kopring 실전 예시

```
# think - PNR 파싱 버그 분석
think. PnrParser에서 멀티 세그먼트 PNR 파싱 시 두 번째 여정의 출발일이 누락되는 버그가 있어.
원인을 분석하고 수정해줘.

# think hard - 서비스 리팩토링
think hard. TicketingService가 800줄이 넘었어. 발권/재발행/환불 로직을
각각의 도메인 서비스로 분리하는 리팩토링 계획을 세워줘.

# think harder - GDS 연동 아키텍처
think harder. 현재 Amadeus GDS만 연동되어 있는데 Sabre, Travelport도 추가해야 해.
멀티 GDS 아키텍처를 설계해줘. 각 GDS의 API 차이, 공통 인터페이스, 장애 격리 전략을 포함해서.
```

---

## 2. Slash Commands & 특수 문자

> "Claude Code의 숨은 리모컨"

### 핵심 Slash Commands

| 명령어 | 설명 | 사용 시나리오 |
|--------|------|--------------|
| `/help` | 도움말 표시 | 명령어가 기억 안 날 때 |
| `/clear` | 대화 초기화 | 컨텍스트가 오염됐을 때 |
| `/compact` | 대화 요약 압축 | 컨텍스트 윈도우가 부족할 때 |
| `/plan` | Plan Mode 진입/해제 | 구현 전 계획을 세울 때 |
| `/model` | 모델 변경 | opus/sonnet/haiku 전환 |
| `/cost` | 세션 비용 확인 | 토큰 사용량 모니터링 |
| `/context` | 컨텍스트 상태 확인 | 어떤 파일/스킬이 로드됐는지 확인 |
| `/rewind` | 이전 턴으로 되돌리기 | 잘못된 방향으로 갔을 때 |
| `/memory` | 메모리 편집 | CLAUDE.md 수정 |
| `/doctor` | 설치 상태 진단 | 문제 발생 시 환경 점검 |

### 특수 문자

| 문자 | 용도 | 예시 |
|------|------|------|
| `#` | 메모리에 저장 (CLAUDE.md) | `# 항상 kotest 스타일로 테스트 작성해줘` |
| `!` | bash 명령 즉시 실행 | `! gradle test --tests TicketingServiceTest` |
| `@` | 파일을 컨텍스트에 추가 | `@TicketingService.kt 이 파일 리팩토링해줘` |

### 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Esc` | 현재 생성 중지 |
| `Esc` x 2 | 마지막 턴 되돌리기 (rewind) |
| `Ctrl+G` | 외부 에디터로 입력 (긴 프롬프트) |
| `Cmd+T` | Extended Thinking 토글 |

---

## 3. Plan Mode 워크플로우

> "급할수록 돌아가라 - 먼저 계획, 그 다음 구현"

### 4단계 워크플로우

```
Explore → Plan → Implement → Commit
```

| 단계 | 모드 | 하는 일 |
|------|------|--------|
| **Explore** | Plan Mode | 코드베이스 탐색, 영향 범위 파악 |
| **Plan** | Plan Mode | 구현 계획 수립, 사용자 확인 |
| **Implement** | Normal Mode | 코드 작성, 테스트 |
| **Commit** | Normal Mode | 커밋, PR 생성 |

### 실전 시나리오: 항공권 환불 정책 엔진 구현

```
# Step 1: Explore (Plan Mode)
/plan
항공권 환불 정책 엔진을 구현하려고 해. 먼저 현재 환불 관련 코드를 분석해줘.
- RefundService, RefundPolicy 관련 클래스 탐색
- 항공사별 환불 규정이 어떻게 관리되는지
- 기존 정책 패턴 (할인/위약금 계산)

# Step 2: Plan (Plan Mode에서 계속)
분석 결과를 바탕으로 환불 정책 엔진 구현 계획을 세워줘.
- 도메인 모델 (RefundPolicy, RefundRule, PenaltyCalculator)
- Strategy 패턴 적용 방안
- 테스트 시나리오 (전액환불, 부분환불, 환불불가)

# Step 3: Implement (/plan 재입력으로 Plan Mode 해제)
/plan
좋아, 계획대로 구현해줘. RefundPolicyEngine부터 시작하자.

# Step 4: Commit
/air-claudecode:git-commit
```

---

## 4. 프롬프트 패턴

> "검증된 프롬프트 구조로 실수를 줄이자"

### Interview 패턴

구현 전에 Claude가 먼저 질문하도록 유도한다. (Anthropic PM Thariq Shihipar 제안)

**형식:**
```
[요구사항 설명]. 바로 구현하지 말고, 먼저 이해가 안 되는 부분이나
추가로 필요한 정보가 있으면 질문해줘.
```

**kopring 예시:**
```
GDS 예약 조회 응답을 파싱해서 여정(Itinerary) 도메인 객체로 변환하는 매퍼를 만들어야 해.
Amadeus와 Sabre 두 가지 GDS를 지원해야 하고, 각각 응답 포맷이 달라.
바로 구현하지 말고, 먼저 이해가 안 되는 부분이나 추가로 필요한 정보가 있으면 질문해줘.
```

### 검증 기반 프롬프트

구현과 검증을 한 프롬프트에 묶는다.

**형식:**
```
[구현 요청]. 구현 후 다음을 검증해줘:
1. [검증 항목 1]
2. [검증 항목 2]
3. [테스트 실행]
```

**kopring 예시:**
```
TicketingService에 재발행(reissue) 기능을 추가해줘.
구현 후 다음을 검증해줘:
1. 기존 발권/환불 로직에 영향 없는지 확인
2. 재발행 시 운임 차액 계산이 정확한지 단위 테스트 작성
3. gradle test --tests *TicketingServiceTest* 실행해서 전체 테스트 통과 확인
```

### 피드백 루프

테스트 통과까지 자동으로 반복하게 한다.

**형식:**
```
[구현 요청]. 테스트가 모두 통과할 때까지 수정을 반복해줘.
```

**kopring 예시:**
```
PnrParser의 멀티 세그먼트 파싱 버그를 수정해줘.
수정 후 gradle test --tests *PnrParserTest* 를 실행하고,
실패하는 테스트가 있으면 모두 통과할 때까지 수정을 반복해줘.
```

### Generator-Critique 루프 (GC 루프)

생성 → 비판 → 개선을 반복하는 패턴. deep-dive-plan 스킬의 핵심 원리이기도 하다.

**형식:**
```
[구현 요청]. 완료 후 다음 GC 루프를 수행해줘:
1. 구현 결과를 비판적으로 검토 (보안, 성능, 엣지케이스)
2. 발견한 문제점 목록 작성
3. 문제점을 반영하여 개선
```

**kopring 예시:**
```
항공사별 수하물 정책을 조회하는 BaggageAllowanceService를 구현해줘.
완료 후 다음 GC 루프를 수행해줘:
1. 구현 결과를 비판적으로 검토 (동시성 이슈, null 처리, GDS 타임아웃)
2. 발견한 문제점 목록 작성
3. 문제점을 반영하여 개선
```

### Writer/Reviewer 체이닝

구현(software-engineer) → 리뷰(code-review) 스킬을 연속 사용한다.

**형식:**
```
/air-claudecode:software-engineer [구현 요청]
# 구현 완료 후
/air-claudecode:code-review [리뷰 요청]
```

**kopring 예시:**
```
# 1단계: 구현
/air-claudecode:software-engineer 여정 변경(rerouting) 기능을 FlightChangeService에 추가해줘.

# 2단계: 리뷰
/air-claudecode:code-review 방금 구현한 rerouting 기능을 리뷰해줘.
```

---

## 5. 실전 키워드 모음

> "463개 프롬프트에서 추출한 고빈도 키워드 + 효과적인 영문 키워드"

### 검증 / 품질

| 키워드 | 효과 | kopring 예시 |
|--------|------|-------------|
| `정밀 검증` | 꼼꼼한 검토 모드 진입 | `정밀 검증해줘. RefundCalculator의 위약금 계산 로직이 항공사 규정과 일치하는지` |
| `double check` | 결과 재확인 | `double check. fare basis 매핑이 누락된 케이스 없는지` |
| `are you sure?` | 확신도 재점검 | `are you sure? 이 쿼리가 N+1 문제를 일으키지 않아?` |
| `run tests` | 테스트 실행 지시 | `run tests. gradle test --tests *BookingServiceTest*` |

### 분석 / 탐색

| 키워드 | 효과 | kopring 예시 |
|--------|------|-------------|
| `콜러/콜리` | 호출 관계 추적 | `TicketRepository.findByPnr()의 콜러를 모두 찾아줘` |
| `깃히스토리` | git log 기반 변경 이력 분석 | `깃히스토리 확인해서 FareService가 최근 어떻게 변경됐는지 분석해줘` |
| `dig into` | 깊이 있는 원인 분석 | `dig into. 간헐적으로 발권 실패하는 원인을 파악해줘` |
| `root cause` | 근본 원인 분석 | `root cause 분석해줘. PNR 동기화가 실패하는 이유` |

### 계획 / 참조

| 키워드 | 효과 | kopring 예시 |
|--------|------|-------------|
| `공홈 발췌` | 공식 문서 기반 웹 검색 후 정리 | `Spring WebFlux 공홈 발췌해서 Coroutine 통합 방법 정리해줘` |
| `사용자의견 발췌` | 커뮤니티 의견 웹 검색 후 정리 | `사용자의견 발췌해서 Exposed vs jOOQ 비교해줘` |
| `gc 루프 패턴으로 정밀 검증` | GC 루프 + 정밀 검증 결합 | `gc 루프 패턴으로 정밀 검증해줘. BookingAggregator 구현을` |

### 분해 / 범위 제한

| 키워드 | 효과 | kopring 예시 |
|--------|------|-------------|
| `break down` | 작업 분해 | `break down. GDS 연동 모듈 구현을 작은 단위로 나눠줘` |
| `minimal change` | 최소 변경만 수행 | `minimal change로 수정해줘. 다른 코드 건드리지 말고 이 버그만` |
| `논리단위로 잘게` | 논리적 단위로 분리 | `논리단위로 잘게 나눠서 커밋해줘` |

### 패턴 참조

| 키워드 | 효과 | kopring 예시 |
|--------|------|-------------|
| `follow the pattern` | 기존 코드 패턴 일관성 유지 | `follow the pattern in BookingService. 같은 구조로 CancellationService 만들어줘` |
| `기존 X 패턴 참고` | 특정 패턴 참조 지시 | `기존 FareRule 패턴 참고해서 BaggageRule 구현해줘` |

### 이력 기반 빈도 데이터

팀 내부 사용 이력 463개 프롬프트에서 추출한 상위 키워드 빈도:

```
검증(48) > 커밋(45) > 발췌(34) > 패턴(33) > 정밀(31) > 공홈(28) >
구현(25) > 사용자의견(20) > 계획(20) > 분석(15)
```

---

## 6. air-claudecode 스킬 키워드

> "키워드만 치면 스킬이 알아서 감지된다"

### 호출 방법 3가지

```
# 1. 직접 호출 (가장 정확)
/air-claudecode:code-review 이 PR 리뷰해줘

# 2. 키워드 자동 감지 (keyword-detector가 제안)
코드 리뷰해줘  →  "Detected relevant skill: code-review" 메시지 표시

# 3. 인자 전달
/air-claudecode:jira-master AIR-1234 티켓 상태 확인해줘
```

### 스킬 키워드 매핑

#### Git / 협업

| 스킬 | 키워드 | 설명 |
|------|--------|------|
| `git-commit` | `commit`, `커밋`, `커밋해` | 컨벤셔널 커밋 메시지 생성 |
| `git-branch` | `create branch`, `브랜치 만들`, `브랜치 생성` | 컨벤셔널 브랜치명 생성 |
| `git-pr-master` | `pr`, `pr 만들`, `pull request` | PR 생성/리뷰/머지/클로즈 |
| `git-issue-master` | `git issue`, `깃헙 이슈`, `이슈 만들` | GitHub 이슈 CRUD |

#### 프로젝트 관리

| 스킬 | 키워드 | 설명 |
|------|--------|------|
| `jira-master` | `jira`, `지라`, `티켓 만들`, `티켓 조회` | Jira 티켓 CRUD |
| `slack-master` | `slack`, `슬랙`, `슬랙 메시지` | Slack 메시지 읽기/보내기 |
| `gog-calendar` | `일정`, `스케줄`, `캘린더`, `미팅 잡아` | Google Calendar 관리 |

#### 개발

| 스킬 | 키워드 | 설명 |
|------|--------|------|
| `software-engineer` | `implement`, `구현`, `개발`, `refactor` | 코드 구현/리팩토링 |
| `code-review` | `code review`, `코드 리뷰`, `리뷰해` | 코드 리뷰 (심각도 등급 포함) |
| `test-engineer` | `test`, `테스트`, `테스트 작성` | Kotlin 테스트 작성 (JUnit5, Kotest) |
| `sql-generator` | `sql`, `쿼리`, `DDL`, `create table` | SQL 생성 |
| `log-analyzer` | `log`, `로그`, `로그 분석`, `로그 검색` | OpenSearch 로그 검색/분석 |

#### 문서 / 기획

| 스킬 | 키워드 | 설명 |
|------|--------|------|
| `deep-dive-plan` | `deep dive`, `심층 분석`, `구현 계획` | 심층 분석 + 구현 계획 수립 |
| `technical-writing` | `기술 문서`, `문서 작성`, `가이드 작성` | 기술 문서 작성 |
| `sentence-refiner` | `문장 다듬`, `문장 교정`, `문체 교정` | 한국어 문장 교정 |

#### 설정

| 스킬 | 키워드 | 설명 |
|------|--------|------|
| `setup` | `setup`, `설정`, `설치 확인` | 설치 상태 점검 |

---

## 7. 치트시트

> "복사해서 바로 쓸 수 있는 프롬프트 모음"

### 일상 개발 플로우

```
# 1. 탐색
@TicketingService.kt 이 파일의 구조와 의존성을 분석해줘

# 2. 구현
/air-claudecode:software-engineer TicketingService에 부분 환불 기능을 추가해줘.
기존 전액환불 패턴 참고해서 구현해줘.

# 3. 테스트
/air-claudecode:test-engineer 방금 구현한 부분 환불 기능의 테스트를 작성해줘

# 4. 리뷰
/air-claudecode:code-review 변경된 파일들을 리뷰해줘

# 5. 커밋
/air-claudecode:git-commit

# 6. PR
/air-claudecode:git-pr-master PR 만들어줘
```

### 복잡한 기능 구현

```
# 1. 심층 분석 + 계획
/air-claudecode:deep-dive-plan 멀티 GDS 지원을 위한 아키텍처를 설계해줘.
현재는 Amadeus만 지원하는데 Sabre, Travelport를 추가해야 해.

# 2. 계획 확인 후 구현
/air-claudecode:software-engineer 위 계획대로 GdsAdapter 인터페이스부터 구현해줘
```

### 버그 수정

```
# 1. 원인 분석
dig into. 간헐적으로 PNR 조회가 타임아웃 나는 문제가 있어.
관련 로그 패턴과 코드를 분석해서 root cause를 찾아줘.

# 2. 최소 수정
minimal change로 수정해줘. 다른 코드 건드리지 말고 이 버그만 고쳐줘.

# 3. 테스트 검증
run tests. gradle test --tests *PnrServiceTest*
테스트가 모두 통과할 때까지 수정을 반복해줘.
```

### GC 루프 검증

```
# 한 번에 GC 루프 수행
FareCalculator를 구현해줘. 완료 후 GC 루프를 수행해줘:
1. 비판적 검토 (동시성, null 처리, 엣지케이스, 성능)
2. 문제점 목록 작성
3. 개선 반영
만족할 때까지 반복해줘.
```

---

## References

- [Claude Code Best Practices](https://docs.anthropic.com/en/docs/claude-code/best-practices) - Anthropic 공식 가이드
- [Claude Code Features Overview](https://code.claude.com/docs/en/features-overview) - 기능 전체 문서
- [Claude Code Skills](https://code.claude.com/docs/en/skills) - 스킬 시스템 공식 문서
- [Claude Code Sub-agents](https://code.claude.com/docs/en/sub-agents) - 서브에이전트 공식 문서
- [Extended Thinking Tips](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking#tips-and-best-practices) - Thinking 키워드 공식 안내
