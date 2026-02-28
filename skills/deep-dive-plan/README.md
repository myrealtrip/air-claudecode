# Deep Dive Planning System

## 개요

이 스킬은 코드를 작성하기 전에 포괄적인 구현 계획을 생성하기 위해 전문 에이전트 팀을 조율합니다. 각 단계(phase)는 속도를 위해 병렬 서브 에이전트를 사용하며, 단계 간에는 데이터 의존성을 유지하기 위해 순차적으로 실행됩니다.

**이 스킬을 사용할 때:**
- 아키텍처 결정이 필요한 복잡한 기능
- 신중한 분석이 필요한 고위험 변경
- 여러 컴포넌트에 걸친 시스템 수정
- 구현 경로가 불명확하여 탐색이 필요한 경우
- 문서화된 의사결정 프로세스가 필요한 경우

**사용하지 않을 때:**
- 단순한 버그 수정이나 사소한 변경
- 구현 방법이 명확한 잘 알려진 패턴
- 빠른 프로토타입이나 실험

**중요**: 어느 단계에서든 열린 질문이나 모호한 점이 발생하면, 진행하기 전에 반드시 `AskUserQuestion`을 사용하여 사용자에게 확인해야 합니다. 절대 추측하지 마세요. 미해결 질문을 안고 진행하면 검증에서 실패하는 결함 있는 계획이 만들어집니다.

## 3단계 시스템

```
Phase 1: 분석 (ANALYZE) - 병렬
  Explorer (haiku) + Analyst (opus) + Risk Assessor (sonnet)
  -> 종합 -> 분석 보고서
        |
Phase 2: 계획 (PLAN) - 순차
  Planner (opus)가 분석 보고서를 수신
  -> 구현 전략
        |
Phase 3: 검증 (VALIDATE) - 병렬
  Verifier (sonnet) + Critic (opus) + Quality Reviewer (sonnet)
  -> 종합 -> 검증 보고서
        |
  APPROVED / NEEDS REVISION / REJECTED
```

## 에이전트 타입 해석

이 스킬은 사용 가능한 경우 전문 OMC 에이전트를 사용하며, 내장 Claude Code 폴백을 제공합니다.

**감지**: OMC 타입을 먼저 시도합니다. Task 도구가 `subagent_type`을 거부하면 폴백을 사용합니다.

| 역할 | OMC 타입 (우선) | 폴백 타입 | 모델 |
|------|----------------|-----------|------|
| Explorer | `oh-my-claudecode:explore` | `Explore` | haiku |
| Analyst | `oh-my-claudecode:analyst` | `general-purpose` | opus |
| Risk Assessor | `oh-my-claudecode:security-reviewer` | `general-purpose` | sonnet |
| Planner | `oh-my-claudecode:planner` | `general-purpose` | opus |
| Verifier | `oh-my-claudecode:verifier` | `general-purpose` | sonnet |
| Critic | `oh-my-claudecode:critic` | `general-purpose` | opus |
| Quality Reviewer | `oh-my-claudecode:quality-reviewer` | `general-purpose` | sonnet |

> **참고**: OMC 에이전트는 역할별 시스템 프롬프트를 포함하여 출력 품질을 향상시킵니다. 폴백은 정상 작동하지만 전적으로 프롬프트에 의존하므로, 폴백 사용 시 프롬프트에 전체 역할 설명을 포함하세요.

## 단계

### 1. 초기화

사용자 요청을 요약하고 범위를 결정합니다:

```
User Request: [사용자가 원하는 것]
Scope: file | module | project | system
Estimated Complexity: Low | Medium | High | Critical
```

### 2. Phase 1 -- 분석 (병렬)

`run_in_background: true`로 3개 에이전트를 병렬 실행합니다:

1. **Explorer** (haiku) -- 코드베이스 구조, 파일 매핑, 기존 패턴
2. **Analyst** (opus) -- 의존성, 제약 조건, 통합 지점, 열린 질문
3. **Risk Assessor** (sonnet) -- 심각도별 위험, 영향 범위, 보안 영향

상세 에이전트 프롬프트는 [references/agent-prompts.md](references/agent-prompts.md)를 참조하세요.

```
병렬 실행 (각각 run_in_background: true 사용):

1. Task(subagent_type="oh-my-claudecode:explore",
        model="haiku",
        prompt="[Explorer 프롬프트 + USER REQUEST]")

2. Task(subagent_type="oh-my-claudecode:analyst",
        model="opus",
        prompt="[Analyst 프롬프트 + USER REQUEST]")

3. Task(subagent_type="oh-my-claudecode:security-reviewer",
        model="sonnet",
        prompt="[Risk Assessor 프롬프트 + USER REQUEST]")
```

3개 모두 완료될 때까지 대기한 후, 통합 분석 보고서로 **종합**합니다. 종합 형식은 [references/output-templates.md](references/output-templates.md)를 참조하세요.

에이전트 결과에서 열린 질문이 발견되면, Phase 2 진행 전에 `AskUserQuestion`을 사용하세요.

### 3. Phase 2 -- 계획 (순차)

분석 완료 후 1개 에이전트를 실행합니다:

- **Planner** (opus) -- 전체 분석 보고서를 수신하여 구현 전략 수립

```
Task(subagent_type="oh-my-claudecode:planner",
     model="opus",
     prompt="[Planner 프롬프트 + 종합된 분석 보고서]")
```

상세 planner 프롬프트는 [references/agent-prompts.md](references/agent-prompts.md)를 참조하세요.

전략에 포함되는 항목: 접근 방식, 근거가 있는 아키텍처 결정, 단계별 작업 분해, 병렬 실행 기회, 일정 추정, 성공 기준, 롤백 전략, 위험 완화.

Planner 출력이 완료될 때까지 대기합니다.

### 4. Phase 3 -- 검증 (병렬)

`run_in_background: true`로 3개 에이전트를 병렬 실행합니다:

1. **Verifier** (sonnet) -- 계획과 분석의 교차 검증 (모든 위험이 대응되었는가?)
2. **Critic** (opus) -- 결정에 도전, 결함 발견, 범위 이탈 점검
3. **Quality Reviewer** (sonnet) -- 위험 점수 매트릭스, 실현 가능성, 완전성 체크리스트

각 에이전트는 분석 보고서와 구현 전략을 모두 수신합니다.

```
병렬 실행 (각각 run_in_background: true 사용):

1. Task(subagent_type="oh-my-claudecode:verifier",
        model="sonnet",
        prompt="[Verifier 프롬프트 + 분석 + 계획]")

2. Task(subagent_type="oh-my-claudecode:critic",
        model="opus",
        prompt="[Critic 프롬프트 + 분석 + 계획]")

3. Task(subagent_type="oh-my-claudecode:quality-reviewer",
        model="sonnet",
        prompt="[Quality Reviewer 프롬프트 + 분석 + 계획]")
```

상세 에이전트 프롬프트는 [references/agent-prompts.md](references/agent-prompts.md)를 참조하세요.

3개 모두 완료될 때까지 대기한 후, 결정이 포함된 검증 보고서로 **종합**합니다.

### 5. 반복 (필요 시)

| 결정 | 조치 |
|------|------|
| APPROVED | 최종화 단계로 진행 |
| NEEDS REVISION | 실패한 에이전트만 피드백과 함께 재실행 후 재검증 |
| REJECTED | 구체적 피드백과 함께 Planner 재실행 후 재검증 |

**결정 로직:**
- 치명적 이슈 있음 -> REJECTED 또는 NEEDS REVISION
- 주요 우려만 있음 -> NEEDS REVISION
- 사소한 제안만 있음 -> APPROVED

**반복 방법:**
1. 3개 검증자의 통합 피드백을 읽음
2. 재실행이 필요한 단계를 식별:
   - 분석 누락 / 잘못된 가정 -> 특정 Analyzer 에이전트만 재실행 (전체 팀이 아님)
   - 결함 있는 전략 / 잘못된 결정 -> 피드백과 함께 Planner 재실행
   - 사용자 확인 필요 -> AskUserQuestion 도구 사용
3. 검증자 피드백을 프롬프트에 포함하여 필요한 부분만 재실행
4. 변경 후 항상 재검증

**반복 제한:** 최대 3회. 여전히 승인되지 않으면 사용자에게 안내를 요청합니다.

### 6. 최종화

1. 모든 보고서를 `.claudedocs/deep-dive-plan/{문서명}.md`(또는 사용자 지정 경로)에 통합
2. 경영진 요약 제시 (2~3문장: 무엇을, 왜, 어떻게, 위험 수준)
3. `AskUserQuestion`을 통해 사용자 확인 (승인 / 수정 / 취소)

최종 출력 형식은 [references/output-templates.md](references/output-templates.md)를 참조하세요.

## 규칙

- **항상 Task 도구 사용** -- 에이전트 작업을 직접 수행하지 않음
- **단계 내 병렬** -- `run_in_background: true`로 에이전트 실행
- **단계 간 순차** -- 각 단계는 이전 단계의 출력이 필요
- **핸드오프 전 종합** -- 병렬 출력을 다음 단계로 전달하기 전에 결합
- **외과적 재실행** -- 반복 시 실패한 특정 에이전트만 재실행
- **사용자 승인 필수** -- 구현 전 반드시 최종 계획 확인
- **에이전트 모델 적절히 배분** -- 탐색은 haiku, 깊은 추론은 opus, 검증은 sonnet
- **완전한 컨텍스트 전달** -- 각 단계는 이전 단계의 전체 종합 출력이 필요

## 모범 사례

1. **에이전트에게 항상 Task 도구 사용** -- 에이전트 작업을 직접 수행하지 말고 Task 에이전트에 위임
2. **단계 내 병렬, 단계 간 순차** -- 서브 에이전트는 병렬 실행; 단계는 순차 실행
3. **`run_in_background: true` 사용** -- 병렬 에이전트를 백그라운드 작업으로 실행하여 진정한 동시성 달성
4. **핸드오프 전 종합** -- 다음 단계 전에 병렬 출력을 일관된 보고서로 결합
5. **에이전트가 독립적으로 작업하게 함** -- 에이전트 단계 사이에 의견을 주입하지 않음
6. **프로세스를 신뢰** -- 검증 팀이 거부하면 반복; 검증을 건너뛰지 않음
7. **외과적 재실행** -- 반복 시 변경이 필요한 특정 에이전트만 재실행
8. **사용자 승인 필수** -- 구현 전 반드시 최종 계획 확인

## 피해야 할 안티패턴

- **에이전트 작업을 직접 수행** -- 분석/계획/검증을 직접 수행하지 않음
- **단계를 병렬로 실행** -- Planner는 분석이 필요하고; 검증자는 둘 다 필요; 단계는 순차여야 함
- **모든 곳에 general-purpose 사용** -- 더 나은 결과를 위해 전문 에이전트 타입 사용
- **종합 건너뛰기** -- 병렬 출력을 직접 전달하지 말고 먼저 종합
- **검증 팀 건너뛰기** -- 검증 승인 없이 구현하지 않음
- **반복 시 전체 팀 실행** -- 하나의 하위 영역만 실패했으면 해당 에이전트만 재실행
- **코드 작성 서두르기** -- 이 스킬은 계획에 관한 것이지 구현이 아님
- **분석 마비** -- 검증 팀이 승인하면 진행; 과도하게 반복하지 않음

## 출력

- 기본: 작업 디렉토리의 `.claudedocs/deep-dive-plan/{문서명}.md`
- 사용자가 커스텀 출력 경로를 지정할 수 있음

## 연계

계획 승인 후:
- `/air-claudecode:software-engineer` -- 구현
- `/air-claudecode:code-review` -- 각 단계 후 리뷰
- `/air-claudecode:git-commit` -- 점진적 커밋
- `/air-claudecode:sql-generator` -- 계획에 SQL(DDL/DML)이 포함될 때 SQL 생성을 이 스킬에 위임

## 최종 체크리스트

- [ ] 3개 단계 모두 완료 (분석, 계획, 검증)
- [ ] 분석에 포함: 아키텍처, 의존성, 제약 조건, 위험, 영향 범위
- [ ] 계획에 포함: 접근 방식, 근거 있는 결정, 단계별 작업, 롤백 전략
- [ ] 검증에서 치명적 또는 주요 이슈 없이 승인
- [ ] 최종 계획이 `.claudedocs/deep-dive-plan/{문서명}.md`에 저장
- [ ] AskUserQuestion을 통해 사용자 확인 완료

## 사용자 요청

$ARGUMENTS
