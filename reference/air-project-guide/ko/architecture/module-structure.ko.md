---
description: 패키지 구조, 레이어 의존성 규칙
keywords: [package, layer, module, dependency, domain, infrastructure, adapter]
---

# 모듈 아키텍처

이 문서는 프로젝트의 레이어 구조와 패키지 설계 원칙을 설명합니다.
각 레이어의 역할과 의존 방향을 이해하면 코드를 올바른 위치에 배치할 수 있습니다.

## 레이어 의존 방향 (위 → 아래만 허용)

의존성은 반드시 한 방향으로만 흐릅니다. 하위 레이어가 상위 레이어를 참조해서는 안 됩니다.

```
presentation  →  application  →  domain  ←  infrastructure
                                    ↑
              configuration, support (모든 레이어에서 접근 가능)
```

| 레이어 | 역할 | 의존 대상 |
|---|---|---|
| `presentation` | HTTP 요청/응답 처리 | `application` |
| `application` | 비즈니스 로직 오케스트레이션 | `domain`, `infrastructure` |
| `domain` | 도메인 모델, 비즈니스 규칙 정의 | 없음 (독립) |
| `infrastructure` | 외부 시스템 연동 (DB, 외부 API, 이벤트) | `domain` |
| `configuration` | Spring 설정, 예외 핸들러 | 모든 레이어 |
| `support` | 유틸리티, Enum, 공통 모델 | 없음 (독립) |

## 패키지 구조

실제 코드는 아래 구조로 배치합니다. 각 하위 패키지의 역할을 확인하세요.

```
{module}/src/main/kotlin/com/myrealtrip/air/{module}/
├── presentation/
│   ├── external/              # 외부 클라이언트용 Public API (request/, response/)
│   └── internal/
│       ├── admin/             # 어드민 콘솔용 API (request/, response/)
│       └── proxy/             # 다른 마이크로서비스용 Internal Proxy API (request/, response/)
├── application/
│   ├── usecase/               # 단일 비즈니스 플로우 처리
│   ├── service/               # 여러 UseCase를 조합하는 복합 로직
│   └── dto/
│       ├── command/           # 비즈니스 로직 입력 DTO
│       └── result/            # 비즈니스 로직 출력 DTO
├── domain/                    # 도메인 모델 (엔티티, 값 객체, 도메인 서비스)
├── infrastructure/
│   ├── client/                # 외부 API 클라이언트
│   ├── event/                 # 이벤트 발행/구독
│   └── persistence/           # entity/, repository/
├── configuration/             # properties/, exception/ (전역 예외 핸들러 포함)
└── support/                   # annotation/, aop/, enums/, exception/,
                               # filter/, interceptor/, model/, utils/
```

## 레이어별 역할 상세

### Application 레이어 — UseCase와 Service 구분

Application 레이어에는 `UseCase`와 `Service` 두 가지 컴포넌트가 존재합니다.
각각의 책임 범위가 다르므로 아래 기준을 따라 구분해서 사용해야 합니다.

| 구분 | UseCase | Service |
|---|---|---|
| 책임 범위 | 단일 비즈니스 플로우 처리 | 여러 UseCase를 조합하는 복합 로직 |
| 네이밍 규칙 | `{동사}{명사}UseCase` (예: `CreateOrderUseCase`) | `{명사}Service` (예: `OrderService`) |
| 트랜잭션 | 단일 트랜잭션 단위 | 여러 트랜잭션을 조합할 수 있음 |

### Infrastructure 레이어

Infrastructure 레이어는 외부 시스템과의 연동을 담당합니다.

- `client/`: 외부 API 클라이언트. `RestClient`와 `ObservationRegistry`를 사용합니다.
- `event/`: 도메인 이벤트 발행/구독을 처리합니다.
- `persistence/`: JPA 엔티티와 Repository를 포함합니다. **도메인 모델과 별도로 관리합니다.**

## DTO 흐름

요청이 들어와서 응답이 나가기까지 DTO는 다음 순서로 변환됩니다.

```
request → Command.of(request) → command → result → Response.of(result) → response
```

| 단계 | DTO | 위치 | 역할 |
|---|---|---|---|
| 1 | `request` | `presentation/{scope}/request/` | HTTP 요청 바인딩 |
| 2 | `command` | `application/dto/command/` | 비즈니스 로직 입력 |
| 3 | `result` | `application/dto/result/` | 비즈니스 로직 출력 |
| 4 | `response` | `presentation/{scope}/response/` | HTTP 응답 직렬화 |

**규칙**: 하위 레이어로 파라미터를 3개 이상 전달할 때는 반드시 `data class`로 묶어야 합니다. 2개 이하일 때만 개별 인자로 전달할 수 있습니다.

## 의존성 규칙

잘못된 의존 관계는 레이어 간 강한 결합을 만들고 유지보수를 어렵게 만듭니다.
아래 5가지 규칙을 반드시 준수해야 합니다.

1. **단방향 의존**: 의존성은 위에서 아래로만 흐릅니다. 하위 레이어는 상위 레이어를 참조해서는 안 됩니다.
2. **도메인 독립성**: `domain` 레이어는 아무것도 의존하지 않습니다. 순수한 비즈니스 규칙만 담습니다.
3. **DTO 격리**: 각 레이어는 자체 DTO를 사용합니다. Presentation 레이어의 request/response DTO를 application 레이어로 직접 전달해서는 안 됩니다.
4. **Infrastructure 역전**: `infrastructure`는 `domain` 인터페이스를 구현합니다. `domain`이 `infrastructure`에 의존해서는 안 됩니다.
5. **Support 보편성**: `support`는 모든 레이어에서 접근 가능합니다. 단, `support` 자체는 다른 레이어를 참조해서는 안 됩니다.
