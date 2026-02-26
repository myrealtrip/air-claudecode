# 요청 및 응답 규칙

## 엔티티를 직접 반환하지 않는다

JPA 엔티티를 API 응답으로 직접 반환하지 않는다 — 반드시 Response DTO로 변환한다. 변환 흐름: `JPA Entity → Domain Model → {Feature}Result (응용 계층) → {Feature}Response (표현 계층)`.

```kotlin
// 나쁜 예: JPA 엔티티를 직접 노출
fun getOrder(@PathVariable id: Long): OrderJpaEntity = orderService.getOrderEntity(id)

// 좋은 예: JPA 엔티티 → 도메인 모델 → 결과 → 응답
fun getOrder(@PathVariable id: Long): ResponseEntity<ApiResource<OrderResponse>> =
    ResponseEntity.ok(ApiResource.success(OrderResponse.from(getOrderUseCase(id))))
```

---

## DTO 패키지 구조

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

- 표현 계층 DTO는 `request/`와 `response/` 패키지로 분리한다
- 응용 계층 DTO는 `command/`와 `result/` 패키지로 분리한다
- 요청/응답 DTO를 같은 파일에 혼합하지 않는다

---

## 네이밍 규칙

| 유형 | 네이밍 | 패키지 |
|------|--------|--------|
| 표현 계층 요청 | `{Action}{Feature}Request` | `presentation/{scope}/request/` |
| 표현 계층 응답 | `{Feature}Response` | `presentation/{scope}/response/` |
| 응용 계층 커맨드 | `{Action}{Feature}Command` | `application/dto/command/` |
| 응용 계층 결과 | `{Feature}Result` | `application/dto/result/` |

---

## DTO 예시

```kotlin
// 표현 계층 요청 DTO
data class CreateOrderRequest(
    @NotBlank val itemName: String,
    @Min(1) val quantity: Int,
    @param:JsonFormat(pattern = "yyyy-MM-dd") val desiredDate: LocalDate,
) {
    fun toCommand(): CreateOrderCommand = CreateOrderCommand(itemName, quantity, desiredDate)
}

// 표현 계층 응답 DTO
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

## JsonFormat 사용 위치 지정

| 대상 | 방향 | 용도 |
|------|------|------|
| `@param:JsonFormat` | 요청 (역직렬화) | 생성자 파라미터 |
| `@get:JsonFormat` | 응답 (직렬화) | Getter 포맷팅 |
| `@field:JsonFormat` | 양방향 | 필드 레벨 적용 |

`@param`을 응답에, `@get`을 요청에 사용하면 **동작하지 않는다**.

```kotlin
// 요청 — @param:
@param:JsonFormat(pattern = "yyyy-MM-dd") val desiredDate: LocalDate

// 응답 — @get:
@get:JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") val createdAt: LocalDateTime

// 양방향 — @field:
@field:JsonFormat(pattern = "yyyy-MM-dd") val startDate: LocalDate

// 나쁜 예: 사용 위치 미지정 — Kotlin에서 모호하여 동작하지 않을 수 있음
@JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") val createdAt: LocalDateTime
```
