---
description: Exception hierarchy, handler mapping, exception selection
keywords: [exception, error handling, GlobalExceptionHandler, BusinessException, KnownBusinessException]
---

# Exception Handling Guide

## Exception Hierarchy

```
RuntimeException
  └── BusinessException            # error-level logging (unexpected business error)
        └── KnownBusinessException   # warn-level logging (expected/predictable error)
```

| Exception | Use | Log Level |
|---|---|---|
| `KnownBusinessException` | Predictable situations (input errors, data not found) | warn |
| `BusinessException` | Unexpected business errors | error |

## Usage

```kotlin
// Expected error → warn
throw KnownBusinessException(
    code = ErrorCode.DATA_NOT_FOUND,
    message = "주문을 찾을 수 없습니다: orderId=$orderId",
)

// Unexpected error → error
throw BusinessException(
    code = ErrorCode.ILLEGAL_STATE,
    message = "상태 전환 불가: $currentStatus -> $targetStatus",
    logStackTrace = true,
)
```

## GlobalExceptionHandler Mapping

`@RestControllerAdvice` auto-handles all controller exceptions. Standard exceptions (e.g., `IllegalArgumentException`) are auto-mapped — no need to wrap them in business exceptions.

| Exception | ErrorCode | Log Level |
|---|---|---|
| `KnownBusinessException` | exception's code | warn |
| `BusinessException` | exception's code | error |
| `MethodArgumentNotValidException` | `INVALID_ARGUMENT` | warn |
| `ConstraintViolationException` | `INVALID_ARGUMENT` | warn |
| `HttpMessageNotReadableException` | `NOT_READABLE` | warn |
| `IllegalArgumentException` | `ILLEGAL_ARGUMENT` | warn |
| `IllegalStateException` | `ILLEGAL_STATE` | warn |
| `NoSuchElementException` | `DATA_NOT_FOUND` | warn |
| `UnsupportedOperationException` | `UNSUPPORTED_OPERATION` | error |
| Other `Exception` | `SERVER_ERROR` | error + stacktrace |

## Exception Selection Guide

| Situation | Exception |
|---|---|
| Data lookup failure | `KnownBusinessException(ErrorCode.DATA_NOT_FOUND)` |
| Input validation failure (service layer) | `KnownBusinessException(ErrorCode.ILLEGAL_ARGUMENT)` |
| Invalid state transition | `BusinessException(ErrorCode.ILLEGAL_STATE)` |
| External API call failure | `BusinessException(ErrorCode.CALL_RESPONSE_ERROR)` |
| Unsupported feature | `UnsupportedOperationException` |
