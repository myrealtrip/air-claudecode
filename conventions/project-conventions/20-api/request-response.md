# Request & Response Conventions

## Never Return Entities

Never return JPA entities as API responses -- always convert to a response DTO. Conversion flow: `JPA Entity → Domain Model → {Feature}Result (Application) → {Feature}Response (Presentation)`.

```kotlin
// Bad: exposes JPA entity directly
fun getOrder(@PathVariable id: Long): OrderJpaEntity = orderService.getOrderEntity(id)

// Good: JPA entity -> domain model -> result -> response
fun getOrder(@PathVariable id: Long): ResponseEntity<ApiResource<OrderResponse>> =
    ResponseEntity.ok(ApiResource.success(OrderResponse.from(getOrderUseCase(id))))
```

---

## DTO Package Structure

```
{appname}/
├── presentation/
│   ├── external/
│   │   ├── OrderExternalController.kt
│   │   ├── request/
│   │   │   ├── CreateOrderRequest.kt
│   │   │   └── UpdateOrderRequest.kt
│   │   └── response/
│   │       └── OrderResponse.kt
│   └── internal/
│       └── admin/
│           └── OrderAdminController.kt
└── application/
    └── dto/
        ├── command/
        │   └── CreateOrderCommand.kt
        └── result/
            └── OrderResult.kt
```

- Separate Presentation DTOs into `request/` and `response/` packages
- Separate Application DTOs into `command/` and `result/` packages
- Do NOT mix request/response DTOs in the same file

---

## Naming Convention

| Type | Naming | Package |
|------|--------|---------|
| Presentation Request | `{Action}{Feature}Request` | `presentation/{scope}/request/` |
| Presentation Response | `{Feature}Response` | `presentation/{scope}/response/` |
| Application Command | `{Action}{Feature}Command` | `application/dto/command/` |
| Application Result | `{Feature}Result` | `application/dto/result/` |

---

## DTO Examples

```kotlin
// Presentation Request DTO
data class CreateOrderRequest(
    @NotBlank val itemName: String,
    @Min(1) val quantity: Int,
    @param:JsonFormat(pattern = "yyyy-MM-dd") val desiredDate: LocalDate,
) {
    fun toCommand(): CreateOrderCommand = CreateOrderCommand(itemName, quantity, desiredDate)
}

// Presentation Response DTO
data class OrderResponse(
    val id: Long,
    val itemName: String,
    val status: String,
    @get:JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") val createdAt: LocalDateTime,
) {
    companion object {
        fun from(result: OrderResult): OrderResponse = OrderResponse(result.id, result.itemName, result.status.code, result.createdAt)
    }
}
```

---

## JsonFormat Use-Site Targets

| Target | Direction | Use case |
|--------|-----------|----------|
| `@param:JsonFormat` | Request (deserialization) | Constructor parameters |
| `@get:JsonFormat` | Response (serialization) | Getter formatting |
| `@field:JsonFormat` | Both directions | Field-level for both |

Using `@param` on response or `@get` on request **will not work**.

```kotlin
// Request -- @param:
@param:JsonFormat(pattern = "yyyy-MM-dd") val desiredDate: LocalDate

// Response -- @get:
@get:JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") val createdAt: LocalDateTime

// Both directions -- @field:
@field:JsonFormat(pattern = "yyyy-MM-dd") val startDate: LocalDate

// Bad: missing use-site target -- ambiguous in Kotlin, may not work
@JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") val createdAt: LocalDateTime
```
