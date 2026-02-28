---
description: ApiResource wrapper, response codes, logging, observability, Virtual Thread
keywords: [ApiResource, response code, virtual thread, observability, cross-cutting]
---

# Cross-Cutting Concerns

## Unified Response Format (ApiResource)

All API responses MUST be wrapped in `ApiResource<T>`.

```json
{
  "status": { "status": 200, "code": "SUCCESS", "message": "OK" },
  "meta": { "traceId": "...", "spanId": "...", "responseTs": 1709100000000 },
  "data": { ... }
}
```

- `status`: HTTP status code, response code, message
- `meta`: traceId, spanId, response timestamp, collection size, page info (null fields excluded from JSON)
- `data`: actual response payload

### Factory Methods

| Method | Use |
|---|---|
| `success()` / `success(data)` | Success response |
| `of(code, data)` | Custom code response (auto type detection) |
| `ofPage(page)` | Offset-based pagination (meta.pageInfo included) |
| `ofNoOffsetPage(page, lastIndex)` | Cursor-based pagination (meta.offsetInfo included) |

## Response Code System

`ResponseCode` interface → `SuccessCode` and `ErrorCode`.

```kotlin
interface ResponseCode {
    val status: Int      // HTTP status code
    val name: String     // code name
    val message: String  // user message
}
```

### SuccessCode

| Code | Status | Message |
|---|---|---|
| `SUCCESS` | 200 | OK |
| `CREATED` | 201 | Created |
| `ACCEPTED` | 202 | Accepted |

### ErrorCode

| Code | Status |
|---|---|
| `UNAUTHORIZED` | 401 |
| `UNAUTHORIZED_IP` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `INVALID_ARGUMENT` | 400 |
| `NOT_READABLE` | 400 |
| `ILLEGAL_ARGUMENT` | 422 |
| `ILLEGAL_STATE` | 422 |
| `DATA_NOT_FOUND` | 422 |
| `UNSUPPORTED_OPERATION` | 422 |
| `DB_ACCESS_ERROR` | 422 |
| `CALL_RESPONSE_ERROR` | 422 |
| `SERVER_ERROR` | 500 |

## Logging Pipeline

4-stage pipeline on request lifecycle:

```
ContentCachingFilter → LogInterceptor → LogTraceAspect → LogResponseBodyInterceptor
```

| Stage | Role | Notes |
|---|---|---|
| `ContentCachingFilter` | Cache request/response body, measure elapsed time | Warns if >8000ms. Excludes multipart. |
| `LogInterceptor` | Log request info (IP, URI, headers, body) | `@ExcludeRequestLog` to skip in prod |
| `LogTraceAspect` | Visualize method call hierarchy as tree | Auto-targets `*Controller`, `*UseCase`, `*Service` |
| `LogResponseBodyInterceptor` | Log response body | Only when `@LogResponseBody` is present |

### AOP Trace Output Example

```
|--> OrderController.createOrder(..)
|    |--> CreateOrderUseCase.execute(..)
|    |    |<-- CreateOrderUseCase.execute(..) elapsed=25ms
|<-- OrderController.createOrder(..) elapsed=28ms
```

### Custom Annotations

| Annotation | Effect |
|---|---|
| `@LogTrace` | Enable tracing on classes outside Controller/UseCase/Service |
| `@ExcludeLogTrace` | Disable tracing on specific methods |
| `@LogResponseBody` | Log response body (options: maxLength, printAll, logLevel) |
| `@ExcludeRequestLog` | Skip request logging in production |

## Observability — Distributed Tracing

- Uses `spring-boot-starter-opentelemetry` with W3C Trace Context. Sampling probability: 1.0 (all requests).
- `traceId`, `spanId` auto-set in MDC and included in `ApiResource.Meta`.
- `ObservationRegistry` auto-configured by Spring Boot 4. MUST inject — do NOT create manually (`ObservationRegistry.create()`).
- `RestClient.Builder` auto-configured with `ObservationRegistry`. MUST inject — do NOT create manually (`RestClient.builder()`).
- Any component needing custom observations MUST inject `ObservationRegistry`.

## Async & Virtual Thread

- `spring.threads.virtual.enabled: true` — Tomcat uses Virtual Threads.
- `@Async` methods use `VirtualThreadTaskExecutor` + `ContextPropagatingTaskDecorator` → MDC (traceId, spanId) propagated to async threads.
- Thread name prefix: `async-vt-`
