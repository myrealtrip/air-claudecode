---
description: 예외 계층 구조, 핸들러 매핑, 예외 선택 기준
keywords: [exception, error handling, GlobalExceptionHandler, BusinessException, KnownBusinessException]
---

# 예외 처리 가이드

이 문서는 프로젝트에서 예외를 올바르게 정의하고 사용하는 방법을 설명합니다.
예외 계층 구조, `GlobalExceptionHandler` 매핑, 그리고 상황에 맞는 예외 선택 기준을 다룹니다.

## 예외 계층 구조

프로젝트에서 사용하는 예외는 다음과 같은 계층 구조를 따릅니다.

```
RuntimeException
  └── BusinessException            # error 레벨 로깅 (예상치 못한 비즈니스 오류)
        └── KnownBusinessException   # warn 레벨 로깅 (예측 가능한 오류)
```

| 예외 클래스 | 사용 시점 | 로그 레벨 |
|---|---|---|
| `KnownBusinessException` | 예측 가능한 상황 (입력 오류, 데이터 미존재 등) | warn |
| `BusinessException` | 예상치 못한 비즈니스 오류 | error |

두 예외의 가장 큰 차이는 **예측 가능성**입니다.
입력값 오류나 데이터 조회 실패처럼 충분히 예상할 수 있는 상황은 `KnownBusinessException`을 사용합니다.
코드 버그나 잘못된 상태 전환처럼 발생하면 안 되는 상황은 `BusinessException`을 사용합니다.

## 사용 방법

예외를 던질 때는 반드시 적절한 `ErrorCode`와 함께 상황을 설명하는 메시지를 포함해야 합니다.
메시지에는 식별자(orderId, userId 등)를 포함하여 문제를 추적할 수 있도록 합니다.

```kotlin
// 예측 가능한 오류 → KnownBusinessException (warn 레벨)
throw KnownBusinessException(
    code = ErrorCode.DATA_NOT_FOUND,
    message = "주문을 찾을 수 없습니다: orderId=$orderId",
)

// 예상치 못한 오류 → BusinessException (error 레벨)
throw BusinessException(
    code = ErrorCode.ILLEGAL_STATE,
    message = "상태 전환 불가: $currentStatus -> $targetStatus",
    logStackTrace = true,
)
```

`logStackTrace = true`를 설정하면 스택 트레이스를 함께 로깅합니다.
원인 파악이 필요한 심각한 오류에만 사용합니다.

## GlobalExceptionHandler 매핑

`@RestControllerAdvice`가 컨트롤러에서 발생하는 모든 예외를 자동으로 처리합니다.
`IllegalArgumentException`과 같은 표준 예외는 자동으로 매핑되므로, 비즈니스 예외로 따로 감쌀 필요가 없습니다.

| 예외 | ErrorCode | 로그 레벨 |
|---|---|---|
| `KnownBusinessException` | 예외에 설정된 code | warn |
| `BusinessException` | 예외에 설정된 code | error |
| `MethodArgumentNotValidException` | `INVALID_ARGUMENT` | warn |
| `ConstraintViolationException` | `INVALID_ARGUMENT` | warn |
| `HttpMessageNotReadableException` | `NOT_READABLE` | warn |
| `IllegalArgumentException` | `ILLEGAL_ARGUMENT` | warn |
| `IllegalStateException` | `ILLEGAL_STATE` | warn |
| `NoSuchElementException` | `DATA_NOT_FOUND` | warn |
| `UnsupportedOperationException` | `UNSUPPORTED_OPERATION` | error |
| 그 외 `Exception` | `SERVER_ERROR` | error + 스택 트레이스 |

## 예외 선택 기준

상황에 따라 어떤 예외를 사용할지 아래 표를 참고합니다.

| 상황 | 사용할 예외 |
|---|---|
| 데이터 조회 실패 | `KnownBusinessException(ErrorCode.DATA_NOT_FOUND)` |
| 입력값 검증 실패 (서비스 레이어) | `KnownBusinessException(ErrorCode.ILLEGAL_ARGUMENT)` |
| 잘못된 상태 전환 | `BusinessException(ErrorCode.ILLEGAL_STATE)` |
| 외부 API 호출 실패 | `BusinessException(ErrorCode.CALL_RESPONSE_ERROR)` |
| 지원하지 않는 기능 | `UnsupportedOperationException` |

> **핵심 원칙:** 예측 가능하면 `KnownBusinessException`, 예상치 못한 오류면 `BusinessException`을 사용합니다.
> 지원하지 않는 기능에는 Java 표준 `UnsupportedOperationException`을 사용하면 됩니다.
