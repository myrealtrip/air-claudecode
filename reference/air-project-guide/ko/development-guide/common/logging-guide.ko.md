---
description: kotlin-logging 설정, 로그 레벨, 로깅 파이프라인, 커스텀 어노테이션
keywords: [logging, log level, kotlin-logging, structured logging, MDC, "@Logging"]
---

# 로깅 가이드

이 문서는 프로젝트에서 로그를 올바르게 작성하는 방법을 설명합니다.
로거 설정 방법, 로그 레벨 선택 기준, 자동 로깅 파이프라인, 그리고 민감 정보 처리 방법을 다룹니다.

## kotlin-logging 설정

프로젝트는 `io.github.oshai:kotlin-logging`을 사용합니다.
SLF4J를 직접 사용하면 안 됩니다.

```kotlin
import io.github.oshai.kotlinlogging.KotlinLogging

private val logger = KotlinLogging.logger {}
```

로거를 선언할 때는 다음 규칙을 따릅니다.

| 규칙 | 설명 |
|---|---|
| 선언 위치 | 파일 최상단, 클래스 외부에 `private val`로 선언합니다 |
| 변수명 | 항상 `logger`로 통일합니다 |
| SLF4J 직접 사용 금지 | `LoggerFactory.getLogger()`를 직접 사용하면 안 됩니다 |

## 로그 레벨

로그 레벨을 올바르게 선택해야 의미 있는 모니터링이 가능합니다.
레벨별 사용 기준은 다음과 같습니다.

| 레벨 | 사용 시점 | 예시 |
|---|---|---|
| `error` | 예상치 못한 오류, 즉각적인 대응 필요 | 외부 API 호출 실패, DB 연결 실패 |
| `warn` | 예측 가능한 오류, 서비스는 정상 동작 중 | 재시도 성공, 폴백 발동, 비즈니스 규칙 위반 |
| `info` | 비즈니스 흐름 추적 | 주문 생성, 결제 완료, 상태 변경 |
| `debug` | 디버깅 상세 정보 | 파라미터 값, 중간 계산 결과 |
| `trace` | 매우 상세한 정보 | 전체 요청/응답, 루프 반복 |

### 레벨 선택 예시

```kotlin
// error: 예상치 못한 오류 — 즉각 대응 필요
logger.error(e) { "결제 처리 중 예상하지 못한 오류 발생: orderId=$orderId" }

// warn: 예측 가능한 오류 — 서비스는 정상 동작
logger.warn { "Amadeus API 타임아웃, Sabre로 폴백: searchId=$searchId" }

// info: 비즈니스 흐름 — 핵심 이벤트만 기록
logger.info { "주문 생성 완료: orderId=$orderId, userId=$userId" }

// debug: 디버깅용 — 운영 환경에서는 보통 비활성화
logger.debug { "운임 계산 결과: fare=$fare, tax=$tax, total=$total" }
```

### 자주 하는 실수

| 실수 | 나쁜 예 | 좋은 예 |
|---|---|---|
| error 레벨 남용 | `logger.error { "데이터 없음" }` | `logger.warn { "데이터 없음" }` (예측 가능한 상황) |
| 문자열 연결 | `logger.info("결과: " + result)` | `logger.info { "결과: $result" }` (람다 사용) |
| 민감 정보 노출 | `logger.info { "카드: $cardNumber" }` | 마스킹하거나 제외합니다 |
| info를 루프 내 남용 | 루프 안에서 `logger.info` 반복 사용 | `logger.debug`를 사용하거나 루프 밖에서 요약합니다 |

> **람다를 사용해야 하는 이유:** `logger.info { "msg: $value" }` 형태로 작성하면,
> 해당 로그 레벨이 비활성화된 경우 문자열 자체를 생성하지 않아 성능에 유리합니다.

## 로깅 파이프라인 (4단계, 자동 동작)

요청이 들어오면 다음 4단계 파이프라인을 자동으로 거칩니다.
별도로 설정할 필요 없이, 어노테이션으로 동작을 제어할 수 있습니다.

```
ContentCachingFilter → LogInterceptor → LogTraceAspect → LogResponseBodyInterceptor
```

### 1단계: ContentCachingFilter

요청/응답 본문을 캐싱하고 처리 시간을 측정합니다.
응답 시간이 8,000ms를 초과하면 warn 레벨로 경고 로그를 남깁니다.
멀티파트 요청은 제외됩니다.

### 2단계: LogInterceptor

요청 정보(IP, URI, 헤더, 본문)를 로깅합니다.
운영 환경에서 특정 엔드포인트의 요청 로깅을 제외하려면 `@ExcludeRequestLog`를 사용합니다.

```kotlin
@ExcludeRequestLog
@GetMapping("/health")
fun healthCheck(): ApiResource<String> = ApiResource.success("OK")
```

### 3단계: LogTraceAspect

메서드 호출 계층을 트리 형태로 시각화합니다.
`*Controller`, `*UseCase`, `*Service` 클래스는 자동으로 트레이싱 대상이 됩니다.
다른 클래스에 트레이싱을 활성화하려면 `@LogTrace`를 사용합니다.
특정 메서드에서 트레이싱을 비활성화하려면 `@ExcludeLogTrace`를 사용합니다.

```
|--> OrderController.createOrder(..)
|    |--> CreateOrderUseCase.execute(..)
|    |    |--> OrderService.validateOrder(..)
|    |    |    |<-- OrderService.validateOrder(..) elapsed=5ms
|    |    |<-- CreateOrderUseCase.execute(..) elapsed=25ms
|<-- OrderController.createOrder(..) elapsed=28ms
```

### 4단계: LogResponseBodyInterceptor

`@LogResponseBody` 어노테이션이 있는 메서드에 한해 응답 본문을 로깅합니다.

```kotlin
@LogResponseBody(maxLength = 1000, logLevel = "DEBUG")
@GetMapping("/{orderId}")
fun getOrder(@PathVariable orderId: Long): ApiResource<OrderResponse> { ... }
```

| 옵션 | 기본값 | 설명 |
|---|---|---|
| `maxLength` | `500` | 로깅할 본문의 최대 길이 |
| `printAll` | `false` | `true`이면 maxLength 무시하고 전체 출력 |
| `logLevel` | `"INFO"` | 로그 레벨 |

## 커스텀 어노테이션 요약

| 어노테이션 | 적용 대상 | 효과 |
|---|---|---|
| `@LogTrace` | 클래스 | Controller/UseCase/Service가 아닌 클래스에 AOP 트레이싱 활성화 |
| `@ExcludeLogTrace` | 메서드 | 특정 메서드에서 AOP 트레이싱 비활성화 |
| `@LogResponseBody` | 메서드 | 응답 본문 로깅 (maxLength, printAll, logLevel 설정 가능) |
| `@ExcludeRequestLog` | 메서드 | 운영 환경에서 요청 로깅 제외 |

## 구조화 로깅 설정

환경에 따라 로그 형식이 다릅니다.

| 환경 | 형식 | 설정 |
|---|---|---|
| 로컬 | 컬러 패턴 로그 | `logging.pattern.console` (traceId/spanId 고정 폭) |
| 그 외 (dev, test, stage, prod) | Logstash JSON | `logging.structured.format.console: logstash` |

### 로컬 환경 설정

```yaml
logging:
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss.SSS} %clr(%5.5p) [%15.15t] [%clr(%-32.32X{traceId:-}){magenta},%clr(%-16.16X{spanId:-})] --- %clr(%-40.40logger{39}){cyan} : %m%n%throwable"
```

### 비로컬 환경 설정 (JSON)

```yaml
logging:
  structured:
    format:
      console: logstash
```

## 로깅 그룹

패키지별로 로그 레벨을 그룹으로 관리합니다.
`transaction`, `query`, `bind` 그룹은 로컬 디버깅 전용이며 운영 환경에서는 활성화하면 안 됩니다.

```yaml
logging:
  group:
    app: com.myrealtrip.air
    hikari: com.zaxxer.hikari
    transaction: org.springframework.transaction, org.springframework.orm.jpa, org.hibernate.engine.transaction
    query: org.hibernate.SQL, org.hibernate.SQL_SLOW
    bind: org.hibernate.orm.jdbc.bind
  level:
    app: INFO
    hikari: WARN
    transaction: DEBUG   # 로컬 디버깅 전용
    query: DEBUG         # 로컬 디버깅 전용
    bind: TRACE          # 로컬 디버깅 전용
```

## 민감 정보 처리

민감 정보는 절대 로그에 남기면 안 됩니다.

| 유형 | 처리 방법 |
|---|---|
| 카드 번호 | 마스킹: `**** **** **** 1234` |
| 비밀번호 | 로깅에서 완전히 제외 |
| 여권 번호 | 마스킹: `M****5678` |
| 이메일 | 마스킹: `u***@example.com` |
| 전체 요청/응답 | `@ExcludeRequestLog` 사용 또는 `maxLength` 제한 |

## 로깅 모범 사례

| 규칙 | 설명 |
|---|---|
| 람다 사용 | `logger.info { "msg: $value" }` — 레벨이 비활성화된 경우 문자열 생성을 방지합니다 |
| 예외 전달 | `logger.error(e) { "msg" }` — 예외를 첫 번째 인자로 전달합니다 |
| 컨텍스트 포함 | 항상 식별자(orderId, userId 등)를 포함합니다 |
| 한 줄 작성 | 로그 메시지는 한 줄로 작성합니다. 줄바꿈을 사용하면 안 됩니다 |
| 예외와 로그 중복 금지 | 예외를 던질 때 동일한 내용을 중복으로 로깅하면 안 됩니다 |
