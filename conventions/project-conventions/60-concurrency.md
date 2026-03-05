# 동시성과 코루틴

> 코루틴 작업에 항상 프로젝트의 `CoroutineUtils`를 사용한다. `runBlocking`, `async`, `launch`를 직접 사용하지 않는다.

## MDC 컨텍스트 전파 (필수)

`{projectGroup}.common.utils.coroutine`의 MDC 보존 함수를 사용한다:

| 함수 | 용도 | 반환값 |
|------|------|--------|
| `runBlockingWithMDC` | 블로킹 코드를 MDC 보존 코루틴으로 연결 | `T` (블로킹) |
| `asyncWithMDC` | MDC를 보존하는 동시 코루틴 실행 | `Deferred<T>` |
| `launchWithMDC` | MDC를 보존하는 fire-and-forget 코루틴 | `Job` |

```kotlin
import {projectGroup}.common.utils.coroutine.runBlockingWithMDC
import {projectGroup}.common.utils.coroutine.asyncWithMDC
import {projectGroup}.common.utils.coroutine.launchWithMDC

// MDC를 보존하면서 병렬 실행
fun fetchUserDashboard(userId: Long): DashboardInfo = runBlockingWithMDC {
    val user = asyncWithMDC { userClient.fetchUser(userId) }
    val orders = asyncWithMDC { orderClient.fetchOrders(userId) }
    DashboardInfo(user.await(), orders.await())
}

// MDC를 보존하면서 fire-and-forget
fun processOrder(order: Order): Unit = runBlockingWithMDC {
    launchWithMDC { notificationService.sendConfirmation(order) }
    launchWithMDC { auditService.logOrderCreated(order) }
}
```

`runBlocking`/`async`/`launch`를 직접 사용하면 MDC 컨텍스트(traceId, requestId)가 유실된다 — 항상 MDC 보존 래퍼를 사용한다.

---

## 디스패처 선택

작업 유형에 맞는 디스패처를 선택한다.

| 디스패처 | 함수 | 사용 시점 |
|----------|------|-----------|
| **Default** (CPU) | `runBlockingWithMDC`, `asyncWithMDC`, `launchWithMDC` | CPU 바운드 연산 |
| **Virtual Thread** (I/O 권장) | `runBlockingOnVirtualThread`, `asyncOnVirtualThread`, `launchOnVirtualThread` | 블로킹 I/O (권장) |
| **IO** (대안) | `runBlockingOnIoThread`, `asyncOnIoThread`, `launchOnIoThread` | 블로킹 I/O (대안) |

### 선택 가이드

| 작업 유형 | 디스패처 | 예시 |
|-----------|----------|------|
| CPU 연산 | Default | 데이터 변환, 계산 |
| HTTP/API 호출 | Virtual Thread | REST 클라이언트 호출, gRPC |
| 파일 I/O | IO 또는 Virtual Thread | 파일 읽기/쓰기, 스트림 처리 |
| 데이터베이스 쿼리 | Virtual Thread | JPA 트랜잭션 외부의 JDBC 호출 |
| 혼합 작업 | Virtual Thread | I/O 작업 조합 |

블로킹 I/O에는 IO 디스패처보다 Virtual Thread 함수를 선호한다 — 가상 스레드가 블로킹 호출을 더 효율적으로 처리하며 오버헤드가 낮다.

```kotlin
import {projectGroup}.common.utils.coroutine.runBlockingOnVirtualThread

fun fetchExternalData(): AggregatedData = runBlockingOnVirtualThread {
    val flights = asyncWithMDC { flightClient.search(criteria) }
    val hotels = asyncWithMDC { hotelClient.search(criteria) }
    AggregatedData(flights.await(), hotels.await())
}
```

커스텀 디스패처가 필요하면 `runBlockingWithMDC(myCustomDispatcher) { ... }`로 전달한다.

---

## 재시도 패턴

프로젝트의 `retry`와 `retryBlocking` 함수를 사용한다. 커스텀 재시도 로직을 직접 구현하지 않는다.

```kotlin
import {projectGroup}.common.utils.coroutine.retry
import {projectGroup}.common.utils.coroutine.retryBlocking

// 기본: 3회 시도, 500ms 지연, 백오프 없음
val result = retry { externalApi.call() }

// 커스텀: 지수 백오프, 선택적 예외 매칭
val result = retry(
    maxAttempts = 5,
    delay = 100.milliseconds,
    backoffMultiplier = 2.0,
    retryOn = { it is IOException || it is TimeoutException },
) { externalApi.call() }

// 블로킹 버전
val result = retryBlocking(maxAttempts = 3) { externalApi.call() }
```

### 재시도 파라미터

| 파라미터 | 기본값 | 설명 |
|----------|--------|------|
| `maxAttempts` | `3` | 총 시도 횟수 (1 이상) |
| `delay` | `500ms` | 재시도 간 초기 지연 |
| `backoffMultiplier` | `1.0` | 지수 백오프 배수 (1.0 = 고정 지연) |
| `retryOn` | 모든 예외 | 재시도 가능한 예외를 필터링하는 조건자 |

---

## 디버그 로깅

```kotlin
import {projectGroup}.common.utils.coroutine.withLogging

suspend fun fetchUserData(userId: Long): UserData = withLogging("fetchUserData") {
    val user = asyncWithMDC { userClient.fetch(userId) }
    val orders = asyncWithMDC { orderClient.fetchByUser(userId) }
    UserData(user.await(), orders.await())
}
// 로그: # >>> fetchUserData, start thread: 42
// 로그: # <<< fetchUserData, end thread: 43
```

> `withLogging`은 디버깅용으로만 사용한다. 프로덕션 핵심 경로에서는 제거하거나 로그 레벨로 제어한다.

---

## 구조적 동시성

`GlobalScope`나 비구조적 스코프에서 코루틴을 실행하지 않는다. 항상 자식 코루틴을 부모 스코프에 바인딩한다.

```kotlin
// 나쁜 예: GlobalScope — 부모 실패 시 코루틴 누수
fun process(): Unit { GlobalScope.launch { sendNotification() } }

// 좋은 예: 구조적 — 자식이 부모와 함께 취소됨
fun process(): Unit = runBlockingWithMDC { launchWithMDC { sendNotification() } }
```

장시간 반복에서는 `ensureActive()`로 취소를 확인한다. 하나의 실패가 형제 코루틴을 취소하지 않도록 `supervisorScope`를 사용한다. `CancellationException`을 다시 던진다 — 삼키지 않는다.

---

## Spring과의 통합

병렬 I/O를 위해 Service 계층에서 코루틴을 사용한다. 응용 계층을 트랜잭션 경계로 유지한다.

```kotlin
@Service
class ProductService(
    private val inventoryClient: InventoryClient,
    private val pricingClient: PricingClient,
) {
    fun enrichProducts(products: List<Product>): List<EnrichedProduct> =
        runBlockingOnVirtualThread {
            products.map { product ->
                asyncWithMDC {
                    val inventory = inventoryClient.getStock(product.id)
                    val pricing = pricingClient.getPrice(product.id)
                    EnrichedProduct(product, inventory, pricing)
                }
            }.awaitAll()
        }
}
```

트랜잭션 경계 밖에서 데이터베이스 작업을 수행하는 코루틴을 시작하지 않는다. JPA 작업은 응용 계층이 관리하는 `@Transactional` 스코프 안에 머물러야 한다 — 병렬 코루틴은 트랜잭션 컨텍스트를 잃는다.
