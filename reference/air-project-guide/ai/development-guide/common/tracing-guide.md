---
description: Distributed tracing, OpenTelemetry, MDC propagation, ObservationRegistry
keywords: [tracing, OpenTelemetry, span, trace ID, MDC propagation, ObservationRegistry]
---

# Tracing Guide

## Core Principles

| Principle | Description |
|---|---|
| W3C Trace Context | Propagate via `traceparent`, `tracestate` headers |
| Full sampling | Probability 1.0 — all requests traced |
| MDC auto-set | `traceId`, `spanId` automatically set in MDC |
| Response included | `ApiResource.Meta` contains `traceId`, `spanId` |

## OpenTelemetry Config

```yaml
management:
  tracing:
    sampling:
      probability: 1.0
  otlp:
    tracing:
      endpoint: ${OTEL_EXPORTER_OTLP_ENDPOINT:http://localhost:4318/v1/traces}
```

### Auto-Instrumented Targets

| Target | Description |
|---|---|
| HTTP inbound | Spring MVC controller request/response |
| HTTP outbound | `RestClient`, `WebClient` external calls |
| JDBC | DB query execution |
| JMS/Kafka | Message publish/subscribe |

## Trace Context Structure

```
[Client] ──traceparent──> [air-order] ──traceparent──> [air-pricing]
                           traceId=abc                  traceId=abc
                           spanId=001                   spanId=002
                               │
                               └──traceparent──> [air-notification]
                                                  traceId=abc
                                                  spanId=003
```

### W3C traceparent Header

```
traceparent: 00-{traceId}-{spanId}-{flags}
traceparent: 00-abc123def456789012345678-0123456789abcdef-01
```

| Field | Length | Description |
|---|---|---|
| version | 2 | Always `00` |
| traceId | 32 | Unique ID for entire request |
| spanId | 16 | ID for individual operation |
| flags | 2 | `01` = sampled |

## MDC Context

`traceId` and `spanId` auto-set in MDC, included in all logs.

```kotlin
// Auto-set — no manual setup needed
// MDC.get("traceId") → "abc123def456"
// MDC.get("spanId")  → "789ghi012"

logger.info { "주문 생성: orderId=$orderId" }
// → [abc123def456/789ghi012] INFO ... 주문 생성: orderId=12345
```

### ApiResource.Meta

All API responses include `traceId` and `spanId` in `meta`. Clients use these to trace server-side logs.

```json
{
  "meta": {
    "traceId": "abc123def456789012345678",
    "spanId": "0123456789abcdef",
    "responseTs": 1709100000000
  }
}
```

## ObservationRegistry Injection

Spring Boot 4 auto-configures `ObservationRegistry` with all registered `ObservationHandler`s and `ObservationFilter`s. MUST inject — do NOT create manually.

```kotlin
// CORRECT — inject auto-configured ObservationRegistry
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

| Pattern | Rule |
|---|---|
| `ObservationRegistry` | MUST inject — auto-configured with handlers, filters, exporters |
| `RestClient.Builder` | MUST inject — auto-configured with `ObservationRegistry` |
| `ObservationRegistry.create()` | NEVER — loses all auto-configured observers |
| `RestClient.builder()` | NEVER — loses trace propagation |

## RestClient Trace Propagation

Spring Boot 4 auto-configures `RestClient.Builder` with `ObservationRegistry`. Inject `RestClient.Builder` — do NOT create builder manually.

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

- Injected `RestClient.Builder` has `ObservationRegistry` pre-registered → auto `traceparent` propagation
- Child span auto-created per external call
- Metrics auto-collected by HTTP method, status code, target host

### Manual Header Propagation

For non-RestClient calls (gRPC, custom HTTP client):

```kotlin
val traceId = MDC.get("traceId") ?: ""
val spanId = MDC.get("spanId") ?: ""
// Compose traceparent header format and pass to request
```

## Async Context Propagation

### Virtual Thread / @Async

`VirtualThreadTaskExecutor` + `ContextPropagatingTaskDecorator` auto-propagates MDC.

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

`@Async` methods preserve MDC without extra configuration.

### Coroutines

Use project MDC-preserving coroutine functions. Raw builders (`runBlocking`, `async`, `launch`) lose MDC.

```kotlin
import com.myrealtrip.air.common.utils.coroutine.runBlockingWithMDC
import com.myrealtrip.air.common.utils.coroutine.asyncWithMDC

fun fetchOrderDashboard(userId: Long): DashboardResult = runBlockingWithMDC {
    val orders = asyncWithMDC { orderClient.fetchOrders(userId) }
    val flights = asyncWithMDC { flightClient.fetchFlights(userId) }
    DashboardResult(orders.await(), flights.await())
}
```

### Event-Based

- Synchronous `@EventListener` — same thread, MDC preserved.
- `@Async @EventListener` — MDC propagated via `ContextPropagatingTaskDecorator`.

## AOP Method Tracing

`LogTraceAspect` visualizes method call hierarchy as tree.

Auto-targets: `*Controller`, `*UseCase`, `*Service`.

```
|--> OrderController.createOrder(..)
|    |--> CreateOrderUseCase.execute(..)
|    |    |--> AmadeusClient.createBooking(..)
|    |    |    |<-- AmadeusClient.createBooking(..) elapsed=120ms
|    |    |<-- CreateOrderUseCase.execute(..) elapsed=150ms
|<-- OrderController.createOrder(..) elapsed=155ms
```

## Common Mistakes

| Mistake | Description |
|---|---|
| Manual `ObservationRegistry.create()` | Use injected `ObservationRegistry`. Manual creation loses all auto-configured handlers/filters/exporters. |
| Manual `RestClient.builder()` | Use injected `RestClient.Builder` (auto-configured with `ObservationRegistry`). Manual builder skips trace propagation. |
| Manual MDC set | Do NOT call `MDC.put("traceId", ...)`. OpenTelemetry manages it. |
| Raw coroutines | `runBlocking`, `async`, `launch` lose MDC. Use `*WithMDC` functions. |
| ThreadLocal dependency | `ThreadLocal` context may be lost on Virtual Thread switch. Use MDC. |
