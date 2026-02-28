---
description: ResponseCode system, ErrorCode selection, error response format
keywords: [ErrorCode, ResponseCode, SuccessCode, "400 vs 422", error response]
---

# Error Code Guide

## Core Principles

| Principle | Rule |
|---|---|
| Throw exceptions | MUST NOT return `ApiResource.of(ErrorCode.xxx)` directly — throw exception |
| 400 vs 422 | 400 = framework validation (Bean Validation), 422 = business logic validation |
| No new ErrorCode | MUST NOT add new ErrorCode if existing one covers the case |
| Identifier in message | Always include identifiers (orderId, userId, etc.) in error messages |

For `ResponseCode`/`SuccessCode`/`ErrorCode` definitions, see `cross-cutting-concerns.md`. For exception hierarchy and `GlobalExceptionHandler` mapping, see `exception-guide.md`.

## ErrorCode Selection

### 400 vs 422

| Criteria | 400 (Bad Request) | 422 (Unprocessable Entity) |
|---|---|---|
| Validated by | Framework (Bean Validation) | Business logic (service layer) |
| Cause | Request format, type, missing required field | Business rule violation |
| Example | `userId` missing, JSON parse failure | Re-cancel already cancelled order, out of stock |
| ErrorCode | `INVALID_ARGUMENT`, `NOT_READABLE` | `ILLEGAL_ARGUMENT`, `ILLEGAL_STATE` |

```kotlin
// 400: Framework auto-handles (Bean Validation)
data class CreateOrderRequest(
    @field:NotBlank(message = "사용자 ID는 필수입니다")
    val userId: String,
)

// 422: Business logic validates directly
fun cancel(orderId: Long) {
    val order = findById(orderId)
    if (order.status == "CANCELLED") {
        throw KnownBusinessException(
            code = ErrorCode.ILLEGAL_STATE,
            message = "이미 취소된 주문입니다: orderId=$orderId",
        )
    }
}
```

### NOT_FOUND (404) vs DATA_NOT_FOUND (422)

| Criteria | NOT_FOUND (404) | DATA_NOT_FOUND (422) |
|---|---|---|
| Meaning | URL path resource does not exist | Business data lookup returned no result |
| Handled by | Spring MVC (automatic) | Service layer (throw exception) |
| Example | `GET /api/v1/unknown-path` | `orderId=999` query returns empty |

### Selection Flowchart

```
Request received
  ├── Format error? → INVALID_ARGUMENT (400) / NOT_READABLE (400)
  ├── Auth failure? → UNAUTHORIZED (401) / UNAUTHORIZED_IP (401)
  ├── No permission? → FORBIDDEN (403)
  └── Business processing
        ├── Data not found? → DATA_NOT_FOUND (422)
        ├── Invalid input? → ILLEGAL_ARGUMENT (422)
        ├── Invalid state transition? → ILLEGAL_STATE (422)
        ├── External call failure? → CALL_RESPONSE_ERROR (422)
        ├── Unsupported feature? → UNSUPPORTED_OPERATION (422)
        ├── DB error? → DB_ACCESS_ERROR (422)
        └── Unexpected error? → SERVER_ERROR (500)
```

## Message Rules

`ErrorCode.message` = default user-facing message. Exception `message` parameter → `ApiResource.data`.

| Rule | Bad | Good |
|---|---|---|
| Include identifier | `"주문을 찾을 수 없습니다"` | `"주문을 찾을 수 없습니다: orderId=12345"` |
| State cause | `"상태 오류"` | `"상태 전환 불가: CANCELLED -> CONFIRMED"` |
| No sensitive data | `"카드번호 1234-5678 결제 실패"` | `"결제 처리 실패: paymentId=99"` |
| Single line | Multi-line message | One-line summary |
| No technical details | Stacktrace, SQL, class names | Business context only |

## Common Mistakes

| Mistake | Description |
|---|---|
| Direct ErrorCode return in controller | MUST NOT use `ApiResource.of(ErrorCode.xxx, data)` — throw exception |
| Adding unnecessary ErrorCode | MUST NOT add new ErrorCode if existing one covers the case |
| Using 400 for business validation | 400 = Bean Validation (framework), 422 = business logic validation |
| Overusing error log level | Predictable errors → `KnownBusinessException` (warn), not `BusinessException` (error) |
| Missing identifier in message | Always include orderId, userId, etc. for traceability |
