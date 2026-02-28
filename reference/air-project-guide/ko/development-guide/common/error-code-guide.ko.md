---
description: ResponseCode 체계, ErrorCode 선택 기준, 에러 응답 형식
keywords: [ErrorCode, ResponseCode, SuccessCode, "400 vs 422", error response]
---

# 에러 코드 가이드

이 문서는 프로젝트에서 에러 코드를 올바르게 선택하고 사용하는 방법을 설명합니다.
HTTP 상태 코드 선택 기준, `ErrorCode` 선택 흐름도, 그리고 에러 메시지 작성 규칙을 다룹니다.

`ResponseCode` / `SuccessCode` / `ErrorCode` 정의는 `cross-cutting-concerns.md`를 참고합니다.
예외 계층 구조와 `GlobalExceptionHandler` 매핑은 `exception-guide.md`를 참고합니다.

## 핵심 원칙

에러 코드를 사용할 때는 다음 4가지 원칙을 반드시 지켜야 합니다.

| 원칙 | 규칙 |
|---|---|
| 예외를 던져야 합니다 | `ApiResource.of(ErrorCode.xxx)`를 직접 반환하면 안 됩니다 — 반드시 예외를 던져야 합니다 |
| 400 vs 422 구분 | 400 = 프레임워크 검증 (Bean Validation), 422 = 비즈니스 로직 검증 |
| 새 ErrorCode 추가 금지 | 기존 `ErrorCode`로 처리 가능하면 새로운 코드를 추가하면 안 됩니다 |
| 식별자 포함 | 에러 메시지에는 항상 식별자(orderId, userId 등)를 포함해야 합니다 |

## ErrorCode 선택 기준

### 400 vs 422

HTTP 상태 코드 400과 422는 혼용하기 쉽지만, 검증 주체에 따라 명확히 구분합니다.

| 기준 | 400 (Bad Request) | 422 (Unprocessable Entity) |
|---|---|---|
| 검증 주체 | 프레임워크 (Bean Validation) | 비즈니스 로직 (서비스 레이어) |
| 원인 | 요청 형식 오류, 타입 불일치, 필수값 누락 | 비즈니스 규칙 위반 |
| 예시 | `userId` 누락, JSON 파싱 실패 | 이미 취소된 주문 재취소, 재고 부족 |
| ErrorCode | `INVALID_ARGUMENT`, `NOT_READABLE` | `ILLEGAL_ARGUMENT`, `ILLEGAL_STATE` |

```kotlin
// 400: 프레임워크가 자동 처리 (Bean Validation)
data class CreateOrderRequest(
    @field:NotBlank(message = "사용자 ID는 필수입니다")
    val userId: String,
)

// 422: 비즈니스 로직에서 직접 검증
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

404와 422 역시 혼용하기 쉬운 상태 코드입니다. URL 경로의 존재 여부로 구분합니다.

| 기준 | NOT_FOUND (404) | DATA_NOT_FOUND (422) |
|---|---|---|
| 의미 | URL 경로 자체가 존재하지 않음 | 비즈니스 데이터 조회 결과 없음 |
| 처리 주체 | Spring MVC (자동 처리) | 서비스 레이어 (예외 던짐) |
| 예시 | `GET /api/v1/unknown-path` 요청 | `orderId=999` 조회 결과 없음 |

### ErrorCode 선택 흐름도

요청이 들어왔을 때 어떤 `ErrorCode`를 사용해야 할지 아래 흐름도를 따릅니다.

```
요청 수신
  ├── 형식 오류? → INVALID_ARGUMENT (400) / NOT_READABLE (400)
  ├── 인증 실패? → UNAUTHORIZED (401) / UNAUTHORIZED_IP (401)
  ├── 권한 없음? → FORBIDDEN (403)
  └── 비즈니스 처리
        ├── 데이터 없음? → DATA_NOT_FOUND (422)
        ├── 잘못된 입력? → ILLEGAL_ARGUMENT (422)
        ├── 잘못된 상태 전환? → ILLEGAL_STATE (422)
        ├── 외부 호출 실패? → CALL_RESPONSE_ERROR (422)
        ├── 미지원 기능? → UNSUPPORTED_OPERATION (422)
        ├── DB 오류? → DB_ACCESS_ERROR (422)
        └── 예상치 못한 오류? → SERVER_ERROR (500)
```

## 메시지 작성 규칙

`ErrorCode.message`는 사용자에게 기본으로 노출되는 메시지입니다.
예외의 `message` 파라미터는 `ApiResource.data`에 담겨 전달됩니다.

에러 메시지를 작성할 때는 다음 규칙을 따릅니다.

| 규칙 | 나쁜 예 | 좋은 예 |
|---|---|---|
| 식별자 포함 | `"주문을 찾을 수 없습니다"` | `"주문을 찾을 수 없습니다: orderId=12345"` |
| 상태 원인 명시 | `"상태 오류"` | `"상태 전환 불가: CANCELLED -> CONFIRMED"` |
| 민감 정보 미포함 | `"카드번호 1234-5678 결제 실패"` | `"결제 처리 실패: paymentId=99"` |
| 한 줄로 작성 | 여러 줄 메시지 | 한 줄 요약 |
| 기술적 세부사항 미포함 | 스택 트레이스, SQL, 클래스명 | 비즈니스 컨텍스트만 |

## 자주 하는 실수

에러 코드를 사용할 때 아래와 같은 실수를 주의해야 합니다.

| 실수 | 설명 |
|---|---|
| 컨트롤러에서 ErrorCode 직접 반환 | `ApiResource.of(ErrorCode.xxx, data)` 형태로 사용하면 안 됩니다 — 반드시 예외를 던져야 합니다 |
| 불필요한 ErrorCode 추가 | 기존 코드로 처리 가능하면 새로운 `ErrorCode`를 추가하면 안 됩니다 |
| 400을 비즈니스 검증에 사용 | 400은 Bean Validation(프레임워크), 422는 비즈니스 로직 검증에 사용합니다 |
| error 레벨 남용 | 예측 가능한 오류는 `KnownBusinessException`(warn)을 사용합니다. `BusinessException`(error)을 남용하면 안 됩니다 |
| 메시지에 식별자 누락 | 추적성을 위해 항상 orderId, userId 등 식별자를 포함해야 합니다 |
