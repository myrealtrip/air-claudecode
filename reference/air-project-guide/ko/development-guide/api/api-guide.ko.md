---
description: Request/Response DTO, Bean Validation, 에러 응답 형식
keywords: [request, response, DTO, validation, "@Valid", error response, Bean Validation]
---

# API 요청/응답 가이드

이 문서는 API 요청/응답 DTO를 올바르게 작성하는 방법을 설명합니다.
Kotlin `data class`에서의 Bean Validation 사용법과 에러 응답 형식도 함께 다룹니다.

## Request DTO

Request DTO는 HTTP 요청을 받아서 컨트롤러에서 처리하는 용도로 사용합니다.

- 네이밍 규칙: `{동작}{리소스}Request` (예: `CreateOrderRequest`, `SearchFlightRequest`)
- 위치: `presentation/{scope}/request/`

### Bean Validation

Kotlin `data class`에서는 반드시 `@field:` use-site target을 사용해야 합니다.
`@field:`를 사용하지 않으면 유효성 검증이 동작하지 않습니다.

```kotlin
data class CreateOrderRequest(
    @field:NotBlank(message = "사용자 ID는 필수입니다")
    val userId: String,

    @field:NotBlank(message = "항공편 번호는 필수입니다")
    @field:Pattern(regexp = "^[A-Z]{2}\\d{1,4}$", message = "항공편 번호 형식이 올바르지 않습니다 (예: KE123)")
    val flightNumber: String,

    @field:NotNull(message = "출발일은 필수입니다")
    val departureDate: LocalDate,

    @field:NotNull(message = "좌석 등급은 필수입니다")
    val cabinClass: Cabin,

    @field:Min(value = 1, message = "탑승객은 최소 1명입니다")
    @field:Max(value = 9, message = "탑승객은 최대 9명입니다")
    val passengerCount: Int,
)
```

중첩 객체의 유효성 검증이 필요한 경우, 해당 필드에 `@field:Valid`를 추가해야 합니다.
`@field:Valid`가 없으면 중첩 객체 내부의 유효성 검증 어노테이션이 무시됩니다.

```kotlin
data class CreateOrderRequest(
    @field:NotBlank val userId: String,

    @field:Valid
    @field:NotEmpty(message = "탑승객 정보는 최소 1건 필요합니다")
    val passengers: List<PassengerRequest>,
)
```

### 컨트롤러 바인딩 어노테이션

| 어노테이션 | 사용 상황 |
|---|---|
| `@Valid @RequestBody` | 요청 본문 바인딩 + 유효성 검증 |
| `@PathVariable` | URL 경로 변수 |
| `@RequestParam` | 쿼리 파라미터 |

## Response DTO

Response DTO는 비즈니스 로직의 결과를 HTTP 응답으로 직렬화할 때 사용합니다.

- 네이밍 규칙:
  - 일반적인 경우: `{리소스}Response` (예: `OrderResponse`)
  - 특정 동작에 특화된 경우: `{리소스}{동작}Response` (예: `OrderCreateResponse`)
- 위치: `presentation/{scope}/response/`
- result DTO에서 `of` 팩토리 메서드로 변환합니다. 반환 시 `ApiResource<T>`로 감쌉니다.
- 도메인 객체나 JPA 엔티티를 직접 반환해서는 안 됩니다.

```kotlin
data class OrderResponse(
    val orderId: Long,
    val flightNumber: String,
    val departureDate: LocalDate,
    val status: OrderStatus,
    val passengers: List<PassengerResponse>,
) {
    companion object {
        fun of(result: OrderResult): OrderResponse =
            OrderResponse(
                orderId = result.orderId,
                flightNumber = result.flightNumber,
                departureDate = result.departureDate,
                status = result.status,
                passengers = result.passengers.map { PassengerResponse.of(it) },
            )
    }
}
```

## 에러 응답 형식

예외 처리는 `GlobalExceptionHandler`가 자동으로 처리합니다.
컨트롤러에서 직접 예외를 잡아 에러 응답을 만들 필요가 없습니다.

에러 응답도 성공 응답과 동일하게 `ApiResource` 형식을 따릅니다.
`data` 필드에 오류 상세 정보가 담깁니다.

**비즈니스 오류 (422)**: `data` 필드에 오류 메시지가 문자열로 포함됩니다.

```json
{
  "status": { "status": 422, "code": "DATA_NOT_FOUND", "message": "요청한 데이터가 없습니다." },
  "meta": { "traceId": "...", "spanId": "...", "responseTs": 1709100000000 },
  "data": "주문을 찾을 수 없습니다: orderId=12345"
}
```

**유효성 검증 오류 (400)**: `data` 필드에 필드별 오류 메시지 Map이 포함됩니다.
어느 필드에서 어떤 오류가 발생했는지 한눈에 파악할 수 있습니다.

```json
{
  "status": { "status": 400, "code": "INVALID_ARGUMENT", "message": "요청 인자가 올바르지 않습니다." },
  "meta": { "traceId": "...", "spanId": "...", "responseTs": 1709100000000 },
  "data": {
    "userId": "사용자 ID는 필수입니다",
    "passengerCount": "탑승객은 최소 1명입니다"
  }
}
```
