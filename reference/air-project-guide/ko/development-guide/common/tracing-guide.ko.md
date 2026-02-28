---
description: 분산 트레이싱, OpenTelemetry, MDC 전파, ObservationRegistry
keywords: [tracing, OpenTelemetry, span, trace ID, MDC propagation, ObservationRegistry]
---

# 트레이싱 가이드

이 문서는 프로젝트의 분산 트레이싱 구조와 올바른 사용 방법을 설명합니다.
OpenTelemetry 설정, MDC 컨텍스트 전파, `ObservationRegistry` 주입 방법, 그리고 비동기 환경에서의 트레이스 전파 방법을 다룹니다.

## 핵심 원칙

| 원칙 | 설명 |
|---|---|
| W3C Trace Context | `traceparent`, `tracestate` 헤더로 트레이스를 전파합니다 |
| 전체 샘플링 | 샘플링 확률 1.0 — 모든 요청을 트레이싱합니다 |
| MDC 자동 설정 | `traceId`와 `spanId`가 MDC에 자동으로 설정됩니다 |
| 응답에 포함 | `ApiResource.Meta`에 `traceId`와 `spanId`가 포함됩니다 |

## OpenTelemetry 설정

```yaml
management:
  tracing:
    sampling:
      probability: 1.0
  otlp:
    tracing:
      endpoint: ${OTEL_EXPORTER_OTLP_ENDPOINT:http://localhost:4318/v1/traces}
```

### 자동 계측 대상

별도 설정 없이 다음 영역이 자동으로 트레이싱됩니다.

| 대상 | 설명 |
|---|---|
| HTTP 인바운드 | Spring MVC 컨트롤러 요청/응답 |
| HTTP 아웃바운드 | `RestClient`, `WebClient` 외부 호출 |
| JDBC | DB 쿼리 실행 |
| JMS/Kafka | 메시지 발행/구독 |

## 트레이스 컨텍스트 구조

여러 서비스에 걸친 요청은 동일한 `traceId`를 공유하며, 각 서비스 구간마다 별도의 `spanId`를 가집니다.

```
[클라이언트] ──traceparent──> [air-order] ──traceparent──> [air-pricing]
                               traceId=abc                  traceId=abc
                               spanId=001                   spanId=002
                                   │
                                   └──traceparent──> [air-notification]
                                                      traceId=abc
                                                      spanId=003
```

### W3C traceparent 헤더

```
traceparent: 00-{traceId}-{spanId}-{flags}
traceparent: 00-abc123def456789012345678-0123456789abcdef-01
```

| 필드 | 길이 | 설명 |
|---|---|---|
| version | 2 | 항상 `00` |
| traceId | 32 | 전체 요청의 고유 ID |
| spanId | 16 | 개별 작업의 ID |
| flags | 2 | `01` = 샘플링됨 |

## MDC 컨텍스트

`traceId`와 `spanId`는 MDC에 자동으로 설정되며, 모든 로그에 자동으로 포함됩니다.
별도로 MDC를 설정할 필요가 없습니다.

```kotlin
// 자동 설정 — 별도 MDC 설정 불필요
// MDC.get("traceId") → "abc123def456"
// MDC.get("spanId")  → "789ghi012"

logger.info { "주문 생성: orderId=$orderId" }
// → [abc123def456/789ghi012] INFO ... 주문 생성: orderId=12345
```

### ApiResource.Meta

모든 API 응답의 `meta` 필드에 `traceId`와 `spanId`가 포함됩니다.
클라이언트는 이 값을 사용해 서버 측 로그를 추적할 수 있습니다.

```json
{
  "meta": {
    "traceId": "abc123def456789012345678",
    "spanId": "0123456789abcdef",
    "responseTs": 1709100000000
  }
}
```

## ObservationRegistry 주입

Spring Boot 4는 모든 `ObservationHandler`와 `ObservationFilter`가 등록된 `ObservationRegistry`를 자동으로 구성합니다.
반드시 주입받아 사용해야 합니다. 직접 생성하면 안 됩니다.

```kotlin
// 올바른 방법 — 자동 구성된 ObservationRegistry 주입
@Component
class FlightSearchObserver(
    private val observationRegistry: ObservationRegistry,
) {
    fun <T> observe(name: String, block: () -> T): T {
        val observation = Observation.createNotStarted(name, observationRegistry)
        return observation.observe(block)
    }
}
```

| 패턴 | 규칙 |
|---|---|
| `ObservationRegistry` | 반드시 주입받아야 합니다 — 핸들러, 필터, 익스포터가 자동 구성됩니다 |
| `RestClient.Builder` | 반드시 주입받아야 합니다 — `ObservationRegistry`가 자동 구성됩니다 |
| `ObservationRegistry.create()` | 절대 사용하면 안 됩니다 — 자동 구성된 모든 옵저버를 잃습니다 |
| `RestClient.builder()` | 절대 사용하면 안 됩니다 — 트레이스 전파가 동작하지 않습니다 |

## RestClient 트레이스 전파

Spring Boot 4는 `RestClient.Builder`에 `ObservationRegistry`를 자동으로 구성합니다.
반드시 `RestClient.Builder`를 주입받아 사용해야 합니다. 빌더를 직접 생성하면 트레이스 전파가 동작하지 않습니다.

```kotlin
@Configuration
class RestClientConfig(
    private val observationRegistry: ObservationRegistry,
) {
    @Bean
    fun amadeusRestClient(restClientBuilder: RestClient.Builder): RestClient =
        restClientBuilder
            .baseUrl("https://api.amadeus.com")
            .observationRegistry(observationRegistry)
            .build()
}
```

주입받은 `RestClient.Builder`를 사용하면 다음이 자동으로 동작합니다.
- `ObservationRegistry`가 사전 등록되어 `traceparent` 헤더가 자동으로 전파됩니다.
- 외부 호출마다 자식 스팬(child span)이 자동으로 생성됩니다.
- HTTP 메서드, 상태 코드, 대상 호스트별로 메트릭이 자동 수집됩니다.

### 수동 헤더 전파

gRPC나 커스텀 HTTP 클라이언트처럼 `RestClient`를 사용할 수 없는 경우에는 MDC에서 직접 값을 가져와 전파합니다.

```kotlin
val traceId = MDC.get("traceId") ?: ""
val spanId = MDC.get("spanId") ?: ""
// traceparent 헤더 형식으로 조합하여 요청에 전달
```

## 비동기 컨텍스트 전파

비동기 처리 환경에서는 MDC 컨텍스트가 유실될 수 있습니다.
환경별로 다음 방법을 사용해야 합니다.

### Virtual Thread / @Async

`VirtualThreadTaskExecutor`와 `ContextPropagatingTaskDecorator`를 함께 사용하면 MDC가 자동으로 전파됩니다.

```kotlin
@Configuration
@EnableAsync
class AsyncConfig {
    @Bean
    fun taskExecutor(): AsyncTaskExecutor {
        val executor = VirtualThreadTaskExecutor("async-vt-")
        executor.setTaskDecorator(ContextPropagatingTaskDecorator())
        return executor
    }
}
```

위 설정을 적용하면 `@Async` 메서드에서 별도 설정 없이 MDC가 보존됩니다.

### 코루틴

`runBlocking`, `async`, `launch` 같은 기본 코루틴 빌더는 MDC를 유실합니다.
반드시 프로젝트에서 제공하는 MDC 보존 코루틴 함수를 사용해야 합니다.

```kotlin
import com.myrealtrip.air.common.utils.coroutine.runBlockingWithMDC
import com.myrealtrip.air.common.utils.coroutine.asyncWithMDC

fun fetchOrderDashboard(userId: Long): DashboardResult = runBlockingWithMDC {
    val orders = asyncWithMDC { orderClient.fetchOrders(userId) }
    val flights = asyncWithMDC { flightClient.fetchFlights(userId) }
    DashboardResult(orders.await(), flights.await())
}
```

### 이벤트 기반

- 동기 `@EventListener` — 동일 스레드에서 실행되므로 MDC가 자동 보존됩니다.
- `@Async @EventListener` — `ContextPropagatingTaskDecorator`를 통해 MDC가 전파됩니다.

## AOP 메서드 트레이싱

`LogTraceAspect`는 메서드 호출 계층을 트리 형태로 시각화합니다.
`*Controller`, `*UseCase`, `*Service` 클래스는 자동으로 트레이싱 대상이 됩니다.

```
|--> OrderController.createOrder(..)
|    |--> CreateOrderUseCase.execute(..)
|    |    |--> AmadeusClient.createBooking(..)
|    |    |    |<-- AmadeusClient.createBooking(..) elapsed=120ms
|    |    |<-- CreateOrderUseCase.execute(..) elapsed=150ms
|<-- OrderController.createOrder(..) elapsed=155ms
```

## 자주 하는 실수

| 실수 | 설명 |
|---|---|
| `ObservationRegistry.create()` 직접 생성 | 주입받은 `ObservationRegistry`를 사용해야 합니다. 직접 생성하면 자동 구성된 핸들러/필터/익스포터를 모두 잃습니다. |
| `RestClient.builder()` 직접 생성 | 주입받은 `RestClient.Builder`를 사용해야 합니다. 직접 생성하면 트레이스 전파가 동작하지 않습니다. |
| MDC 수동 설정 | `MDC.put("traceId", ...)`를 직접 호출하면 안 됩니다. OpenTelemetry가 관리합니다. |
| 기본 코루틴 빌더 사용 | `runBlocking`, `async`, `launch`는 MDC를 유실합니다. `*WithMDC` 함수를 사용해야 합니다. |
| ThreadLocal 의존 | Virtual Thread 전환 시 `ThreadLocal` 컨텍스트가 유실될 수 있습니다. MDC를 사용해야 합니다. |
