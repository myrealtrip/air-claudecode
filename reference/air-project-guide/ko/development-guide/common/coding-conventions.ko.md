---
description: Kotlin/Spring 코딩 규칙, 객체 변환, 설정 관리
keywords: [kotlin style, object mapping, configuration, val, data class]
---

# 코딩 컨벤션

이 문서는 프로젝트에서 Kotlin과 Spring을 사용할 때 지켜야 할 코딩 규칙을 설명합니다. 일관된 코드 스타일을 유지하면 팀원 모두가 코드를 쉽게 이해하고 유지보수할 수 있습니다.


## Kotlin 규칙

### 불변성 우선 원칙

불변 값과 불변 컬렉션을 기본으로 사용해야 합니다.

- 변수는 `val`을 기본으로 선언합니다. 변경이 꼭 필요한 경우에만 `var`를 사용합니다.
- 컬렉션도 불변 컬렉션을 기본으로 사용합니다.
- DTO(데이터 전달 객체)는 `data class`로 정의합니다.

### 안전한 Null 처리

`!!` 연산자는 절대 사용하면 안 됩니다. `NullPointerException`이 런타임에 발생할 수 있어 매우 위험합니다. 대신 안전 호출 연산자(`?.`)와 엘비스 연산자(`?:`)를 사용합니다.

```kotlin
val name = user?.name ?: "Unknown"
val order = repository.findById(id) ?: throw KnownBusinessException(
    code = ErrorCode.DATA_NOT_FOUND, message = "주문을 찾을 수 없습니다: orderId=$id",
)
```

### `when` 표현식 사용

복잡한 `if-else` 체인 대신 `when` 표현식을 사용합니다. 코드의 가독성이 높아지고 모든 케이스를 명시적으로 처리할 수 있습니다.

### 날짜/시간 형식

모든 날짜와 시간은 ISO 8601 형식을 사용합니다. 날짜를 `String` 타입으로 처리하면 안 됩니다. 반드시 `java.time` 패키지의 타입을 사용해야 합니다. Jackson이 ISO 형식을 자동으로 직렬화/역직렬화합니다.

| 타입 | ISO 형식 | 예시 |
|---|---|---|
| `LocalDate` | `yyyy-MM-dd` | `2026-02-28` |
| `LocalTime` | `HH:mm:ss` | `14:30:00` |
| `LocalDateTime` | `yyyy-MM-dd'T'HH:mm:ss` | `2026-02-28T14:30:00` |
| `OffsetDateTime` | `yyyy-MM-dd'T'HH:mm:ssXXX` | `2026-02-28T14:30:00+09:00` |
| `ZonedDateTime` | `yyyy-MM-dd'T'HH:mm:ssXXX'['VV']'` | `2026-02-28T14:30:00+09:00[Asia/Seoul]` |
| `Instant` | `yyyy-MM-dd'T'HH:mm:ss.SSSZ` | `2026-02-28T05:30:00.000Z` |


## Spring 규칙

### 의존성 주입

의존성 주입은 반드시 생성자 주입 방식을 사용해야 합니다. `@Autowired` 필드 주입은 사용하면 안 됩니다. Kotlin에서는 주 생성자(primary constructor)에 의존성을 선언합니다.

필드 주입을 사용하면 테스트 시 의존성을 교체하기 어렵고, 순환 참조 감지가 늦어지는 문제가 있습니다.

### ObservationRegistry

Spring Boot 4에서는 `ObservationRegistry`를 자동으로 구성합니다. 직접 생성하지 말고 반드시 주입받아야 합니다. 직접 생성하면 자동 구성된 옵저버와 핸들러가 연결되지 않아 모니터링이 동작하지 않습니다.

`ObservationRegistry`를 주입받아야 하는 곳:
- `RestClient.Builder`
- 커스텀 `Observation` 생성
- 관찰 가능성(observability)이 필요한 모든 컴포넌트

```kotlin
// 올바른 방법 — ObservationRegistry를 주입받습니다
@Component
class CustomMetricsCollector(
    private val observationRegistry: ObservationRegistry,
) {
    fun recordOperation(name: String, block: () -> Unit) {
        val observation = Observation.createNotStarted(name, observationRegistry)
        observation.observe(block)
    }
}

// 잘못된 방법 — 직접 생성하면 자동 구성된 옵저버/핸들러가 연결되지 않습니다
val registry = ObservationRegistry.create()  // 절대 사용 금지
```

### 레이어 분리

각 레이어는 자신의 역할에 맞는 작업만 수행해야 합니다. 레이어 간 역할이 섞이면 코드가 복잡해지고 테스트가 어려워집니다.

| 레이어 | 허용 | 불허 |
|---|---|---|
| Controller | 요청/응답 변환, 유효성 검사 | 비즈니스 로직, DB 직접 접근 |
| UseCase/Service | 비즈니스 로직 조율 | HTTP 처리, 직접 SQL 사용 |
| Repository | 데이터 접근 | 비즈니스 로직 |

### 하위 레이어로 데이터 전달

하위 레이어에 데이터를 전달할 때 파라미터 개수에 따라 방식이 달라집니다.

- 파라미터가 3개 이상이면 `data class`로 묶어서 전달합니다.
- 파라미터가 2개 이하이면 개별 인자로 전달해도 됩니다.

| 호출 방향 | data class 위치 |
|---|---|
| Controller → UseCase/Service | `application/dto/command/` |
| UseCase → Service | `application/dto/command/` |
| Service → Repository | 도메인 객체를 직접 전달 |


## 객체 변환 규칙

레이어 간 객체를 변환할 때는 일관된 패턴을 사용합니다. 변환 로직은 **변환 대상 타입의 `companion object`에 `of` 팩토리 메서드**로 정의합니다. `of*` 변형이나 `to` 패턴은 사용하면 안 됩니다.

```kotlin
data class CreateOrderCommand(val userId: String, val flightNumber: String) {
    companion object {
        fun of(request: CreateOrderRequest): CreateOrderCommand =
            CreateOrderCommand(userId = request.userId, flightNumber = request.flightNumber)
    }
}
```

| 변환 방향 | 패턴 | 예시 |
|---|---|---|
| request → command | `of` | `CreateOrderCommand.of(request)` |
| result → response | `of` | `OrderResponse.of(result)` |
| domain → result | `of` | `OrderResult.of(order)` |
| command → domain | `of` | `Order.of(command)` |
| domain → entity | `of` | `OrderEntity.of(order)` |
| entity → domain | `toDomain` **(예외)** | `entity.toDomain()` |

**예외 1: entity → domain 변환** — 도메인의 `companion object`가 엔티티에 의존하는 것을 피하기 위해 `toDomain()` 확장 함수를 엔티티에 정의합니다.

**예외 2: ApiResource** — `success`, `of`, `ofPage`, `ofNoOffsetPage` 팩토리 메서드를 허용합니다.


## 설정 관리

환경별 설정은 Spring 프로파일을 통해 관리합니다. 기본 프로파일은 `local`입니다.

| 프로파일 | 용도 |
|---|---|
| `local` | 로컬 개발 환경 |
| `dev` | 개발 서버 |
| `test` | 테스트 서버 |
| `stage` | 스테이징 환경 |
| `prod` | 운영 환경 |

설정 파일 구조:
- `application.yaml`: 모든 환경에서 공통으로 사용하는 설정
- `application-{profile}.yaml`: 각 환경에서 덮어쓸 설정
- `EnvironmentUtil`: 현재 환경을 확인할 때 사용합니다 (`isProduction()`, `isLocal()` 등)
