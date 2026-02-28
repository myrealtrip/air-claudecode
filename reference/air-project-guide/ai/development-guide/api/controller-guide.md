---
description: URL design, controller patterns, pagination, search endpoints
keywords: [controller, URL, endpoint, REST, pagination, search, "@GetMapping", "@PostMapping"]
---

# Controller Guide

## API Scopes & Base Paths

| Scope | Target | Base Path | Package |
|---|---|---|---|
| external | External clients | `/api/v1/{resource}` | `presentation/external/` |
| internal admin | Admin console | `/internal/admin/v1/{resource}` | `presentation/internal/admin/` |
| internal proxy | Other microservices | `/internal/proxy/v1/{resource}` | `presentation/internal/proxy/` |

Version in URL path. Add `/v2/` for breaking changes.

## URL Design Rules

URLs: kebab-case, plural nouns. No verbs in path.

```
GET    /api/v1/orders              # list
GET    /api/v1/orders/{orderId}    # single
POST   /api/v1/orders              # create
PUT    /api/v1/orders/{orderId}    # full update
PATCH  /api/v1/orders/{orderId}    # partial update
DELETE /api/v1/orders/{orderId}    # delete
```

Sub-resources via nested path: `GET /api/v1/orders/{orderId}/passengers`

| Rule | Good | Bad |
|---|---|---|
| Nouns only | `/api/v1/orders` | `/api/v1/getOrders` |
| Plural | `/api/v1/orders/{id}` | `/api/v1/order/{id}` |
| kebab-case | `/api/v1/order-items` | `/api/v1/orderItems` |
| Max 3 nesting levels | `/api/v1/orders/{id}/items` | `/api/v1/users/{id}/orders/{id}/items` |
| No trailing slash | `/api/v1/orders` | `/api/v1/orders/` |
| Actions as sub-path | `POST /api/v1/orders/{id}/cancel` | `POST /api/v1/cancelOrder` |

### HTTP Methods

| Method | Meaning | Idempotent | Request Body |
|---|---|---|---|
| `GET` | Read | Yes | No |
| `POST` | Create, complex query | No | Yes |
| `PUT` | Full replace | Yes | Yes |
| `PATCH` | Partial update | No | Yes |
| `DELETE` | Delete | Yes | No |

Use `POST /search` for complex search criteria.

## Controller Pattern (5 steps)

1. Receive request (`@RequestBody`, `@PathVariable`, `@RequestParam`)
2. Validate (`@Valid`)
3. Convert request → command (`Command.of(request)`)
4. Call UseCase or Service
5. Convert result → response, wrap with `ApiResource`

```kotlin
@RestController
@RequestMapping("/api/v1/orders")
class OrderController(
    private val createOrderUseCase: CreateOrderUseCase,
    private val orderService: OrderService,
) {
    @PostMapping
    fun createOrder(@Valid @RequestBody request: CreateOrderRequest): ApiResource<OrderResponse> {
        val command = CreateOrderCommand.of(request)
        val result = createOrderUseCase.execute(command)
        return ApiResource.success(OrderResponse.of(result))
    }

    @GetMapping("/{orderId}")
    fun getOrder(@PathVariable orderId: Long): ApiResource<OrderResponse> {
        val result = orderService.findById(orderId)
        return ApiResource.success(OrderResponse.of(result))
    }

    @DeleteMapping("/{orderId}")
    fun cancelOrder(@PathVariable orderId: Long): ApiResource<String> {
        orderService.cancel(orderId)
        return ApiResource.success()
    }
}
```

**Rules**:
- Controller injects UseCase or Service. MUST NOT inject Repository directly.
- Controller handles HTTP routing only. MUST NOT contain business logic.

## Pagination

### Offset-based

```kotlin
@GetMapping
fun getOrders(
    @RequestParam userId: String,
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") size: Int,
): ApiResource<List<OrderResponse>> {
    val result = orderUseCase.search(SearchOrderCommand(userId, page, size))
    return ApiResource.ofPage(result.map { OrderResponse.of(it) })
}
```

### Cursor-based

```kotlin
@GetMapping
fun getOrders(
    @RequestParam userId: String,
    @RequestParam(required = false) lastIndex: String?,
    @RequestParam(defaultValue = "20") size: Int,
): ApiResource<List<OrderResponse>> {
    val result = orderUseCase.search(SearchOrderCommand(userId, lastIndex, size))
    val lastIdx = result.content.lastOrNull()?.orderId?.toString() ?: ""
    return ApiResource.ofNoOffsetPage(result.map { OrderResponse.of(it) }, lastIdx)
}
```

## Search Endpoints

| Param Count | Method | Pattern |
|---|---|---|
| 1-2 | `GET` + `@RequestParam` directly | Individual params listed |
| 3+ (GET needed) | `GET` + request `data class` | Query params auto-bound to data class |
| 3+ (complex conditions) | `POST /search` + `@RequestBody` | Nested objects, `SearchDates`, etc. |

```kotlin
// 1) Simple: 1-2 params → @RequestParam directly
@GetMapping
fun getOrders(
    @RequestParam(required = false) status: String?,
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") size: Int,
): ApiResource<List<OrderResponse>>

// 2) GET + 3+ params → request data class (Spring auto-binds query params)
data class SearchOrderRequest(
    val status: String? = null,
    val userId: Long? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val page: Int = 0,
    val size: Int = 20,
)

@GetMapping("/search")
fun searchOrders(
    @Valid request: SearchOrderRequest,
): ApiResource<List<OrderResponse>> {
    val command = SearchOrderCommand.of(request)
    val result = orderService.search(command)
    return ApiResource.ofPage(result.map { OrderResponse.of(it) })
}
// Call: GET /api/v1/orders/search?status=PENDING&userId=123&startDate=2026-01-01&endDate=2026-02-28

// 3) Complex conditions (nested objects, SearchDates) → POST /search + @RequestBody
data class SearchOrderPostRequest(
    val status: String? = null,
    val userId: Long? = null,
    val searchDates: SearchDates? = null,
    val page: Int = 0,
    val size: Int = 20,
)

@PostMapping("/search")
fun searchOrders(
    @Valid @RequestBody request: SearchOrderPostRequest,
): ApiResource<List<OrderResponse>> {
    val command = SearchOrderCommand.of(request)
    val result = orderService.search(command)
    return ApiResource.ofPage(result.map { OrderResponse.of(it) })
}
```

### GET vs POST Selection

| Criteria | GET + data class | POST /search |
|---|---|---|
| Simple value conditions (String, Number, Date) | O | - |
| Nested objects needed (`SearchDates`, etc.) | - | O |
| Browser caching/bookmarking needed | O | - |
| URL length limit concern | - | O |
