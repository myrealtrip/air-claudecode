# Controller Design

## URL Design

### Base Path Rules

All API paths must start with `/api/v1/`.

### kebab-case

Use kebab-case for all URL segments. Never use camelCase or snake_case.

### Plural Resource Names

Resource names must be plural nouns.

### RESTful URL Patterns

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/v1/orders/{id}` | Get single resource |
| GET | `/api/v1/orders` | Get paginated list |
| POST | `/api/v1/orders` | Create resource |
| PUT | `/api/v1/orders/{id}` | Replace resource (full update) |
| PATCH | `/api/v1/orders/{id}` | Partial update |
| DELETE | `/api/v1/orders/{id}` | Delete resource |
| POST | `/api/v1/orders/bulk` | Bulk create |
| GET | `/api/v1/orders/{id}/items` | Sub-resource list |

**URL Design Guidelines**

| Rule | Good | Bad |
|------|------|-----|
| Nouns not verbs | `/api/v1/orders` | `/api/v1/getOrders` |
| Hierarchy | `/api/v1/orders/{id}/items` | `/api/v1/order-items?orderId=` |
| Max 3 levels | `/api/v1/orders/{id}/items` | `/api/v1/users/{id}/orders/{id}/items/{id}/details` |
| No trailing slashes | `/api/v1/orders` | `/api/v1/orders/` |
| Actions as sub-paths | `POST /api/v1/orders/{id}/cancel` | `POST /api/v1/cancelOrder` |

---

## Response Format

### ApiResource Methods

| Method | Usage |
|--------|-------|
| `ApiResource.success()` | DELETE or void response |
| `ApiResource.success(data)` | Single object response |
| `ApiResource.of(data)` | Alias for `success(data)` |
| `ApiResource.ofPage(page)` | Paginated response (Page<T>) |
| `ApiResource.ofCollection(list)` | Non-paginated list response |

### Pageable Default

Always use `@PageableDefault(size = 100)`. Never rely on Spring's default (20).

### Standard CRUD Controller Example

```kotlin
@RestController
@RequestMapping("/api/v1/orders")
class OrderExternalController(
    private val getOrderUseCase: GetOrderUseCase,
    private val getOrdersUseCase: GetOrdersUseCase,
    private val createOrderUseCase: CreateOrderUseCase,
    private val updateOrderUseCase: UpdateOrderUseCase,
    private val deleteOrderUseCase: DeleteOrderUseCase,
) {

    @GetMapping("/{id}")
    fun getOrder(
        @PathVariable id: Long,
    ): ResponseEntity<ApiResource<OrderResponse>> {
        return ResponseEntity.ok(ApiResource.success(OrderResponse.from(getOrderUseCase(id))))
    }

    @GetMapping
    fun getOrders(
        @PageableDefault(size = 100) pageable: Pageable,
    ): ResponseEntity<ApiResource<Page<OrderResponse>>> {
        return ResponseEntity.ok(ApiResource.ofPage(getOrdersUseCase(pageable).map { OrderResponse.from(it) }))
    }

    @PostMapping
    fun createOrder(
        @Valid @RequestBody request: CreateOrderRequest,
    ): ResponseEntity<ApiResource<OrderResponse>> {
        return ResponseEntity.ok(ApiResource.success(OrderResponse.from(createOrderUseCase(request.toCommand()))))
    }

    @PutMapping("/{id}")
    fun updateOrder(
        @PathVariable id: Long,
        @Valid @RequestBody request: UpdateOrderRequest,
    ): ResponseEntity<ApiResource<OrderResponse>> {
        return ResponseEntity.ok(ApiResource.success(OrderResponse.from(updateOrderUseCase(id, request.toCommand()))))
    }

    @DeleteMapping("/{id}")
    fun deleteOrder(
        @PathVariable id: Long,
    ): ResponseEntity<ApiResource<Unit>> {
        deleteOrderUseCase(id)
        return ResponseEntity.ok(ApiResource.success())
    }
}
```

---

## Search Endpoints

For 1-2 filter parameters, use `@RequestParam` directly. For 3 or more, encapsulate in a `{Feature}SearchRequest` with a `toSearchCondition()` method and bind with `@ModelAttribute`.

```kotlin
// Simple: 1-2 params
@GetMapping
fun getOrders(
    @RequestParam(required = false) status: String?,
    @RequestParam(required = false) userId: Long?,
    @PageableDefault(size = 100) pageable: Pageable,
): ResponseEntity<ApiResource<Page<OrderResponse>>> {
    return ResponseEntity.ok(ApiResource.ofPage(searchOrdersUseCase(status, userId, pageable).map { OrderResponse.from(it) }))
}

// Complex: 3+ params — use SearchRequest + @ModelAttribute
data class OrderSearchRequest(
    val status: String?,
    val userId: Long?,
    val productName: String?,
    val searchDates: SearchDates?,
) {
    fun toSearchCondition(): OrderSearchCondition =
        OrderSearchCondition(
            status = status,
            userId = userId,
            productName = productName,
            dateFrom = searchDates?.from,
            dateTo = searchDates?.to,
        )
}

@GetMapping
fun searchOrders(
    @ModelAttribute request: OrderSearchRequest,
    @PageableDefault(size = 100) pageable: Pageable,
): ResponseEntity<ApiResource<Page<OrderResponse>>> {
    return ResponseEntity.ok(ApiResource.ofPage(searchOrdersUseCase(request.toSearchCondition(), pageable).map { OrderResponse.from(it) }))
}
```

### SearchDates

Use the `SearchDates` type for date range fields.

```kotlin
import {projectGroup}.common.search.SearchDates

SearchDates.of(from = LocalDate.of(2024, 1, 1), to = LocalDate.of(2024, 12, 31))
SearchDates.fromToday()
SearchDates.ofMonth(year = 2024, month = 1)
```

---

## Controller Structure

### Method Size Rule

Each controller method must be **7 lines or fewer**. Controllers handle HTTP routing only -- no business logic.

### Annotation Order

```kotlin
// Class level
@RestController
@RequestMapping("/api/v1/orders")
@Validated
class OrderExternalController

// Method level
@GetMapping("/{id}")
@PreAuthorize("hasRole('USER')")
fun getOrder(...)

// Parameter level
@PathVariable id: Long
@Valid @RequestBody request: CreateOrderRequest
@PageableDefault(size = 100) pageable: Pageable
@RequestParam(required = false) status: String?
@ModelAttribute request: OrderSearchRequest
```

### Dependencies

**Standard: Inject UseCase.** Controllers depend on UseCase as the primary entry point.

```kotlin
class OrderExternalController(
    private val getOrderUseCase: GetOrderUseCase,
    private val createOrderUseCase: CreateOrderUseCase,
)
```

Each controller may inject multiple UseCases. Group related UseCases per controller by feature.

---

## DateTime Input/Output

### Input: UTC

All datetime inputs received from clients must be UTC. Never accept KST directly from the API layer.

```kotlin
// LocalDateTime (implicit UTC)
data class CreateOrderRequest(
    val scheduledAt: LocalDateTime,  // must be UTC
)

// ZonedDateTime — convert to UTC in toCommand()
data class CreateOrderRequest(
    val scheduledAt: ZonedDateTime,
) {
    fun toCommand(): CreateOrderCommand =
        CreateOrderCommand(
            scheduledAt = scheduledAt.withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime(),
        )
}
```

### Output: KST at Response Boundary

Convert to KST only inside the Response DTO, never inside the controller.

```kotlin
data class OrderResponse(
    val scheduledAtKst: LocalDateTime,
) {
    companion object {
        fun from(result: OrderResult): OrderResponse =
            OrderResponse(scheduledAtKst = result.scheduledAt.toKst())
    }
}
```

### Incorrect Example

```kotlin
// Bad: KST conversion inside controller
@GetMapping("/{id}")
fun getOrder(@PathVariable id: Long): ResponseEntity<ApiResource<OrderResponse>> {
    val result = getOrderUseCase(id)
    return ResponseEntity.ok(ApiResource.success(
        OrderResponse(scheduledAtKst = result.scheduledAt.toKst())  // wrong place
    ))
}
```

---

## Common Pitfalls

| Pitfall | Wrong | Right |
|---------|-------|-------|
| Verb in URL | `POST /api/v1/createOrder` | `POST /api/v1/orders` |
| Singular resource name | `/api/v1/order/{id}` | `/api/v1/orders/{id}` |
| camelCase URL | `/api/v1/orderItems` | `/api/v1/order-items` |
| Trailing slash | `/api/v1/orders/` | `/api/v1/orders` |
| Business logic in controller | Inline calculation, DB access | Delegate to UseCase |
| No `@Valid` on request body | `@RequestBody request: ...` | `@Valid @RequestBody request: ...` |
| Default pageable size | `pageable: Pageable` (size=20) | `@PageableDefault(size = 100) pageable: Pageable` |
| KST conversion in controller | `order.scheduledAt.toKst()` in controller | Convert in Response DTO |
| Accepting KST input | `scheduledAt: LocalDateTime` (KST) | Always accept UTC, convert in DTO |
| Injecting Repository directly | `private val orderRepository: OrderRepository` | Inject UseCase only |
| Deep nesting (4+ levels) | `/api/v1/users/{id}/orders/{id}/items/{id}/details` | Flatten to `/api/v1/order-items/{id}` |
| Using `in` for search params (3+) | `@RequestParam` x5 | `@ModelAttribute OrderSearchRequest` |
