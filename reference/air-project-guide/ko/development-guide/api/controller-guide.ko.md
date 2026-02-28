---
description: URL 설계 규칙, 컨트롤러 패턴, 페이지네이션, 검색 엔드포인트
keywords: [controller, URL, endpoint, REST, pagination, search, "@GetMapping", "@PostMapping"]
---

# 컨트롤러 가이드

이 문서는 REST API 컨트롤러를 작성할 때 따라야 할 규칙을 설명합니다.
URL 설계부터 컨트롤러 구현 패턴, 페이징, 검색 엔드포인트 처리 방법까지 다룹니다.

## API 스코프와 기본 경로

API는 호출 주체에 따라 세 가지 스코프로 구분됩니다.
각 스코프마다 기본 경로와 패키지 위치가 다르므로 반드시 맞게 배치해야 합니다.

| 스코프 | 대상 | 기본 경로 | 패키지 |
|---|---|---|---|
| external | 외부 클라이언트 | `/api/v1/{resource}` | `presentation/external/` |
| internal admin | 어드민 콘솔 | `/internal/admin/v1/{resource}` | `presentation/internal/admin/` |
| internal proxy | 다른 마이크로서비스 | `/internal/proxy/v1/{resource}` | `presentation/internal/proxy/` |

버전은 URL 경로에 포함합니다. 하위 호환이 깨지는 변경이 생기면 `/v2/`를 추가합니다.

## URL 설계 규칙

URL은 리소스를 표현하는 명사를 사용합니다. 동사는 HTTP 메서드로 표현합니다.

- URL은 kebab-case와 복수 명사를 사용합니다.
- 경로에 동사를 넣으면 안 됩니다.

```
GET    /api/v1/orders              # 목록 조회
GET    /api/v1/orders/{orderId}    # 단건 조회
POST   /api/v1/orders              # 생성
PUT    /api/v1/orders/{orderId}    # 전체 수정
PATCH  /api/v1/orders/{orderId}    # 부분 수정
DELETE /api/v1/orders/{orderId}    # 삭제
```

하위 리소스는 중첩 경로로 표현합니다: `GET /api/v1/orders/{orderId}/passengers`

| 규칙 | 올바른 예 | 잘못된 예 |
|---|---|---|
| 명사만 사용 | `/api/v1/orders` | `/api/v1/getOrders` |
| 복수형 사용 | `/api/v1/orders/{id}` | `/api/v1/order/{id}` |
| kebab-case 사용 | `/api/v1/order-items` | `/api/v1/orderItems` |
| 중첩은 최대 3단계 | `/api/v1/orders/{id}/items` | `/api/v1/users/{id}/orders/{id}/items` |
| 끝에 슬래시 없음 | `/api/v1/orders` | `/api/v1/orders/` |
| 동작은 하위 경로로 표현 | `POST /api/v1/orders/{id}/cancel` | `POST /api/v1/cancelOrder` |

### HTTP 메서드 선택 기준

| 메서드 | 의미 | 멱등성 | 요청 본문 |
|---|---|---|---|
| `GET` | 조회 | 있음 | 없음 |
| `POST` | 생성, 복잡한 검색 | 없음 | 있음 |
| `PUT` | 전체 교체 | 있음 | 있음 |
| `PATCH` | 부분 수정 | 없음 | 있음 |
| `DELETE` | 삭제 | 있음 | 없음 |

복잡한 검색 조건이 필요한 경우에는 `POST /search`를 사용합니다.

## 컨트롤러 구현 패턴 (5단계)

컨트롤러는 HTTP 처리에만 집중합니다. 비즈니스 로직은 UseCase나 Service에 위임해야 합니다.
아래 5단계 패턴을 따르면 일관성 있는 컨트롤러를 작성할 수 있습니다.

1. 요청 수신 (`@RequestBody`, `@PathVariable`, `@RequestParam`)
2. 유효성 검증 (`@Valid`)
3. request → command 변환 (`Command.of(request)`)
4. UseCase 또는 Service 호출
5. result → response 변환 후 `ApiResource`로 감싸서 반환

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

**주의사항**:
- 컨트롤러는 UseCase 또는 Service를 주입받습니다. Repository를 직접 주입해서는 안 됩니다.
- 컨트롤러는 HTTP 라우팅만 담당합니다. 비즈니스 로직을 포함해서는 안 됩니다.

## 페이징 처리

### 오프셋 기반 페이징

페이지 번호와 크기를 사용하는 전통적인 방식입니다. `ApiResource.ofPage()`를 사용합니다.

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

### 커서 기반 페이징

마지막으로 조회한 항목의 인덱스를 기준으로 다음 페이지를 가져오는 방식입니다.
무한 스크롤 등 실시간성이 중요한 목록에 적합합니다. `ApiResource.ofNoOffsetPage()`를 사용합니다.

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

## 검색 엔드포인트

검색 파라미터 수와 복잡도에 따라 구현 방식을 선택합니다.

| 파라미터 수 | HTTP 메서드 | 패턴 |
|---|---|---|
| 1~2개 | `GET` + `@RequestParam` 직접 선언 | 파라미터를 개별로 나열 |
| 3개 이상 (GET 필요) | `GET` + request `data class` | 쿼리 파라미터를 data class에 자동 바인딩 |
| 3개 이상 (복잡한 조건) | `POST /search` + `@RequestBody` | 중첩 객체, SearchDates 등 사용 가능 |

```kotlin
// 1) 단순 검색: 1~2개 파라미터 → @RequestParam 직접 선언
@GetMapping
fun getOrders(
    @RequestParam(required = false) status: String?,
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") size: Int,
): ApiResource<List<OrderResponse>>

// 2) GET + 3개 이상 파라미터 → request data class (Spring이 쿼리 파라미터를 자동 바인딩)
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
// 호출 예시: GET /api/v1/orders/search?status=PENDING&userId=123&startDate=2026-01-01&endDate=2026-02-28

// 3) 복잡한 조건 (중첩 객체, SearchDates 등) → POST /search + @RequestBody
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

### GET vs POST 선택 기준

| 조건 | GET + data class | POST /search |
|---|---|---|
| 단순 값 조건 (String, Number, Date) | O | - |
| 중첩 객체 필요 (`SearchDates` 등) | - | O |
| 브라우저 캐싱/북마크 필요 | O | - |
| URL 길이 제한이 우려되는 경우 | - | O |
