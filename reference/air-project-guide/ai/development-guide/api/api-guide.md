---
description: Request/Response DTO, Bean Validation, error response format
keywords: [request, response, DTO, validation, "@Valid", error response, Bean Validation]
---

# API Request/Response Rules

## Request DTO

- Naming: `{Action}{Resource}Request` (e.g., `CreateOrderRequest`, `SearchFlightRequest`)
- Location: `presentation/{scope}/request/`

### Bean Validation

In Kotlin `data class`, MUST use `@field:` use-site target. Without it, validation does not work.

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

For nested objects, add `@field:Valid` to trigger inner validation:

```kotlin
data class CreateOrderRequest(
    @field:NotBlank val userId: String,

    @field:Valid
    @field:NotEmpty(message = "탑승객 정보는 최소 1건 필요합니다")
    val passengers: List<PassengerRequest>,
)
```

### Controller Binding

| Annotation | Use |
|---|---|
| `@Valid @RequestBody` | Request body + validation |
| `@PathVariable` | Path variable |
| `@RequestParam` | Query parameter |

## Response DTO

- Naming: `{Resource}Response` (generic) or `{Resource}{Action}Response` (action-specific)
- Location: `presentation/{scope}/response/`
- Convert from result using `of` factory pattern. Wrap with `ApiResource<T>`.
- MUST NOT return domain objects or entities directly.

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

## Error Response Format

`GlobalExceptionHandler` handles all exceptions automatically.

**Business error (422)**:
```json
{
  "status": { "status": 422, "code": "DATA_NOT_FOUND", "message": "요청한 데이터가 없습니다." },
  "meta": { "traceId": "...", "spanId": "...", "responseTs": 1709100000000 },
  "data": "주문을 찾을 수 없습니다: orderId=12345"
}
```

**Validation error (400)** — `data` contains field-level error Map:
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
