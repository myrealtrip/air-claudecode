# 컨트롤러 설계

## URL 설계

### 기본 경로 규칙

모든 API 경로는 `/api/v1/`로 시작한다.

### kebab-case

모든 URL 세그먼트에 kebab-case를 사용한다. camelCase나 snake_case는 사용하지 않는다.

### 복수 리소스 이름

리소스 이름은 복수 명사를 사용한다.

### RESTful URL 패턴

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `/api/v1/orders/{id}` | 단건 조회 |
| GET | `/api/v1/orders` | 페이징 목록 조회 |
| POST | `/api/v1/orders` | 생성 |
| PUT | `/api/v1/orders/{id}` | 전체 수정 |
| PATCH | `/api/v1/orders/{id}` | 부분 수정 |
| DELETE | `/api/v1/orders/{id}` | 삭제 |
| POST | `/api/v1/orders/bulk` | 일괄 생성 |
| GET | `/api/v1/orders/{id}/items` | 하위 리소스 목록 |

**URL 설계 지침**

| 규칙 | 좋은 예 | 나쁜 예 |
|------|---------|---------|
| 동사가 아닌 명사 | `/api/v1/orders` | `/api/v1/getOrders` |
| 계층 구조 | `/api/v1/orders/{id}/items` | `/api/v1/order-items?orderId=` |
| 최대 3단계 | `/api/v1/orders/{id}/items` | `/api/v1/users/{id}/orders/{id}/items/{id}/details` |
| 후행 슬래시 금지 | `/api/v1/orders` | `/api/v1/orders/` |
| 동작은 하위 경로로 | `POST /api/v1/orders/{id}/cancel` | `POST /api/v1/cancelOrder` |

---

## 응답 형식

### ApiResource 메서드

| 메서드 | 용도 |
|--------|------|
| `ApiResource.success()` | DELETE 또는 void 응답 |
| `ApiResource.success(data)` | 단건 객체 응답 |
| `ApiResource.of(data)` | `success(data)`의 별칭 |
| `ApiResource.ofPage(page)` | 페이징 응답 (Page<T>) |
| `ApiResource.ofCollection(list)` | 비페이징 목록 응답 |

### Pageable 기본값

항상 `@PageableDefault(size = 100)`을 사용한다. Spring 기본값(20)에 의존하지 않는다.

### 표준 CRUD 컨트롤러 예시

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

## 검색 엔드포인트

필터 파라미터가 1~2개면 `@RequestParam`을 직접 사용한다. 3개 이상이면 `{Feature}SearchRequest`에 `toSearchCondition()` 메서드를 만들고 `@ModelAttribute`로 바인딩한다.

```kotlin
// 단순: 파라미터 1~2개
@GetMapping
fun getOrders(
    @RequestParam(required = false) status: String?,
    @RequestParam(required = false) userId: Long?,
    @PageableDefault(size = 100) pageable: Pageable,
): ResponseEntity<ApiResource<Page<OrderResponse>>> {
    return ResponseEntity.ok(ApiResource.ofPage(searchOrdersUseCase(status, userId, pageable).map { OrderResponse.from(it) }))
}

// 복합: 파라미터 3개 이상 — SearchRequest + @ModelAttribute 사용
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

날짜 범위 필드에 `SearchDates` 타입을 사용한다.

```kotlin
import {projectGroup}.common.search.SearchDates

SearchDates.of(from = LocalDate.of(2024, 1, 1), to = LocalDate.of(2024, 12, 31))
SearchDates.fromToday()
SearchDates.ofMonth(year = 2024, month = 1)
```

---

## 컨트롤러 구조

### 메서드 크기 규칙

각 컨트롤러 메서드는 **7줄 이하**로 작성한다. 컨트롤러는 HTTP 라우팅만 담당하며 비즈니스 로직을 포함하지 않는다.

### 어노테이션 순서

```kotlin
// 클래스 레벨
@RestController
@RequestMapping("/api/v1/orders")
@Validated
class OrderExternalController

// 메서드 레벨
@GetMapping("/{id}")
@PreAuthorize("hasRole('USER')")
fun getOrder(...)

// 파라미터 레벨
@PathVariable id: Long
@Valid @RequestBody request: CreateOrderRequest
@PageableDefault(size = 100) pageable: Pageable
@RequestParam(required = false) status: String?
@ModelAttribute request: OrderSearchRequest
```

### 의존성

**표준: UseCase를 주입한다.** 컨트롤러는 UseCase를 주 진입점으로 의존한다.

```kotlin
class OrderExternalController(
    private val getOrderUseCase: GetOrderUseCase,
    private val createOrderUseCase: CreateOrderUseCase,
)
```

각 컨트롤러는 여러 UseCase를 주입할 수 있다. 관련 UseCase를 기능별로 하나의 컨트롤러에 그룹화한다.

---

## DateTime 입출력

### 입력: UTC

클라이언트로부터 받는 모든 DateTime 입력은 UTC여야 한다. API 계층에서 KST를 직접 받지 않는다.

```kotlin
// LocalDateTime (암묵적 UTC)
data class CreateOrderRequest(
    val scheduledAt: LocalDateTime,  // 반드시 UTC
)

// ZonedDateTime — toCommand()에서 UTC로 변환
data class CreateOrderRequest(
    val scheduledAt: ZonedDateTime,
) {
    fun toCommand(): CreateOrderCommand =
        CreateOrderCommand(
            scheduledAt = scheduledAt.withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime(),
        )
}
```

### 출력: 응답 경계에서 KST로 변환

컨트롤러가 아닌 Response DTO 내부에서만 KST로 변환한다.

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

### 잘못된 예시

```kotlin
// 나쁜 예: 컨트롤러에서 KST 변환
@GetMapping("/{id}")
fun getOrder(@PathVariable id: Long): ResponseEntity<ApiResource<OrderResponse>> {
    val result = getOrderUseCase(id)
    return ResponseEntity.ok(ApiResource.success(
        OrderResponse(scheduledAtKst = result.scheduledAt.toKst())  // 잘못된 위치
    ))
}
```

---

## 흔한 실수

| 실수 | 나쁜 예 | 올바른 예 |
|------|---------|-----------|
| URL에 동사 사용 | `POST /api/v1/createOrder` | `POST /api/v1/orders` |
| 단수 리소스 이름 | `/api/v1/order/{id}` | `/api/v1/orders/{id}` |
| camelCase URL | `/api/v1/orderItems` | `/api/v1/order-items` |
| 후행 슬래시 | `/api/v1/orders/` | `/api/v1/orders` |
| 컨트롤러에 비즈니스 로직 | 인라인 계산, DB 접근 | UseCase에 위임 |
| 요청 본문에 `@Valid` 누락 | `@RequestBody request: ...` | `@Valid @RequestBody request: ...` |
| 기본 페이지 크기 미지정 | `pageable: Pageable` (size=20) | `@PageableDefault(size = 100) pageable: Pageable` |
| 컨트롤러에서 KST 변환 | 컨트롤러에서 `order.scheduledAt.toKst()` | Response DTO에서 변환 |
| KST 입력 수용 | `scheduledAt: LocalDateTime` (KST) | 항상 UTC를 받고 DTO에서 변환 |
| Repository 직접 주입 | `private val orderRepository: OrderRepository` | UseCase만 주입 |
| 4단계 이상 중첩 | `/api/v1/users/{id}/orders/{id}/items/{id}/details` | `/api/v1/order-items/{id}`로 평탄화 |
| 검색 파라미터 3개 이상 시 개별 사용 | `@RequestParam` x5 | `@ModelAttribute OrderSearchRequest` |
