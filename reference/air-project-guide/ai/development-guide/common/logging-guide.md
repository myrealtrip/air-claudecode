---
description: kotlin-logging, log levels, logging pipeline, custom annotations
keywords: [logging, log level, kotlin-logging, structured logging, MDC, "@Logging"]
---

# Logging Guide

## kotlin-logging Setup

Use `io.github.oshai:kotlin-logging`. MUST NOT use SLF4J directly.

```kotlin
import io.github.oshai.kotlinlogging.KotlinLogging

private val logger = KotlinLogging.logger {}
```

| Rule | Description |
|---|---|
| Declaration | Top of file, outside class, as `private val` |
| Name | Always `logger` |
| SLF4J prohibited | Do NOT use `LoggerFactory.getLogger()` directly |

## Log Levels

| Level | Use | Example |
|---|---|---|
| `error` | Unexpected errors, immediate response needed | External API failure, DB connection failure |
| `warn` | Expected errors, service still functioning | Retry success, fallback triggered, business rule violation |
| `info` | Business flow tracking | Order created, payment completed, status change |
| `debug` | Debugging details | Parameter values, intermediate calculation results |
| `trace` | Highly detailed info | Full request/response, loop iterations |

### Level Selection

```kotlin
// error: Unexpected — needs immediate attention
logger.error(e) { "결제 처리 중 예상하지 못한 오류 발생: orderId=$orderId" }

// warn: Expected — service still works
logger.warn { "Amadeus API 타임아웃, Sabre로 폴백: searchId=$searchId" }

// info: Business flow — key events only
logger.info { "주문 생성 완료: orderId=$orderId, userId=$userId" }

// debug: Debugging only — usually disabled in prod
logger.debug { "운임 계산 결과: fare=$fare, tax=$tax, total=$total" }
```

### Anti-Patterns

| Mistake | Bad | Good |
|---|---|---|
| Overusing error | `logger.error { "데이터 없음" }` | `logger.warn { "데이터 없음" }` (predictable) |
| String concatenation | `logger.info("결과: " + result)` | `logger.info { "결과: $result" }` (lambda) |
| Sensitive data | `logger.info { "카드: $cardNumber" }` | Mask or exclude |
| Excessive info | `logger.info` inside loop | `logger.debug` or summarize outside loop |

## Logging Pipeline (4 stages, automatic)

```
ContentCachingFilter → LogInterceptor → LogTraceAspect → LogResponseBodyInterceptor
```

### Stage 1: ContentCachingFilter
- Caches request/response body, measures elapsed time.
- Warns if >8000ms. Excludes multipart requests.

### Stage 2: LogInterceptor
- Logs request info: IP, URI, headers, body.
- `@ExcludeRequestLog` to skip in production.

```kotlin
@ExcludeRequestLog
@GetMapping("/health")
fun healthCheck(): ApiResource<String> = ApiResource.success("OK")
```

### Stage 3: LogTraceAspect
- Visualizes method call hierarchy as tree.
- Auto-targets: `*Controller`, `*UseCase`, `*Service`.
- Use `@LogTrace` on other classes to enable. Use `@ExcludeLogTrace` on methods to disable.

```
|--> OrderController.createOrder(..)
|    |--> CreateOrderUseCase.execute(..)
|    |    |--> OrderService.validateOrder(..)
|    |    |    |<-- OrderService.validateOrder(..) elapsed=5ms
|    |    |<-- CreateOrderUseCase.execute(..) elapsed=25ms
|<-- OrderController.createOrder(..) elapsed=28ms
```

### Stage 4: LogResponseBodyInterceptor
- Logs response body only when `@LogResponseBody` is present.

```kotlin
@LogResponseBody(maxLength = 1000, logLevel = "DEBUG")
@GetMapping("/{orderId}")
fun getOrder(@PathVariable orderId: Long): ApiResource<OrderResponse> { ... }
```

| Option | Default | Description |
|---|---|---|
| `maxLength` | `500` | Max body length to log |
| `printAll` | `false` | If true, ignore maxLength |
| `logLevel` | `"INFO"` | Log level |

## Custom Annotations Summary

| Annotation | Target | Effect |
|---|---|---|
| `@LogTrace` | Class | Enable AOP tracing on non-Controller/UseCase/Service classes |
| `@ExcludeLogTrace` | Method | Disable AOP tracing on specific methods |
| `@LogResponseBody` | Method | Log response body (maxLength, printAll, logLevel) |
| `@ExcludeRequestLog` | Method | Skip request logging in production |

## Structured Logging

| Environment | Format | Config |
|---|---|---|
| Local | Colored pattern log | `logging.pattern.console` (traceId/spanId fixed-width) |
| Others (dev, test, stage, prod) | Logstash JSON | `logging.structured.format.console: logstash` |

### Local Config

```yaml
logging:
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss.SSS} %clr(%5.5p) [%15.15t] [%clr(%-32.32X{traceId:-}){magenta},%clr(%-16.16X{spanId:-})] --- %clr(%-40.40logger{39}){cyan} : %m%n%throwable"
```

### Non-Local Config (JSON)

```yaml
logging:
  structured:
    format:
      console: logstash
```

## Logging Groups

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
    transaction: DEBUG   # local debugging only
    query: DEBUG         # local debugging only
    bind: TRACE          # local debugging only
```

## Sensitive Data

MUST NOT log sensitive data.

| Type | Handling |
|---|---|
| Card number | Mask: `**** **** **** 1234` |
| Password | Exclude from logging |
| Passport | Mask: `M****5678` |
| Email | Mask: `u***@example.com` |
| Full request/response | Use `@ExcludeRequestLog`, `maxLength` limit |

## Best Practices

| Rule | Description |
|---|---|
| Use lambdas | `logger.info { "msg: $value" }` — avoids string creation when level disabled |
| Pass exception | `logger.error(e) { "msg" }` — exception as first arg |
| Include context | Always include identifiers (orderId, userId, etc.) |
| Single line | Log messages in one line. No line breaks. |
| Logging vs exception | Do NOT duplicate-log the same content when throwing an exception |
