---
description: MDC propagation, dispatcher selection, retry, structured concurrency
keywords: [coroutine, concurrency, async, MDC propagation, dispatcher, retry, structured concurrency]
---

# Concurrency & Coroutine Guide

## Core Principles

| Principle | Rule |
|---|---|
| Use project's `CoroutineUtils` | MUST NOT use `runBlocking`, `async`, `launch` directly |
| MDC propagation | Use `*WithMDC` functions to preserve traceId, spanId |
| Virtual Thread preferred | Prefer Virtual Thread dispatcher over IO for blocking I/O |
| Structured concurrency | MUST NOT use `GlobalScope` or unstructured scopes |

## MDC Context Propagation

Use MDC-preserving functions from `com.myrealtrip.air.common.utils.coroutine`. Raw coroutine builders lose MDC context (traceId, requestId).

| Function | Use | Return Type |
|---|---|---|
| `runBlockingWithMDC` | Enter coroutine from blocking code | `T` (blocking) |
| `asyncWithMDC` | Parallel coroutine execution | `Deferred<T>` |
| `launchWithMDC` | Fire-and-forget coroutine | `Job` |

```kotlin
import com.myrealtrip.air.common.utils.coroutine.runBlockingWithMDC
import com.myrealtrip.air.common.utils.coroutine.asyncWithMDC
import com.myrealtrip.air.common.utils.coroutine.launchWithMDC

// Parallel execution — MDC preserved
fun fetchOrderDashboard(userId: Long): DashboardResult = runBlockingWithMDC {
    val orders = asyncWithMDC { orderClient.fetchOrders(userId) }
    val flights = asyncWithMDC { flightClient.fetchFlights(userId) }
    DashboardResult(orders.await(), flights.await())
}

// Fire-and-forget — MDC preserved
fun processOrder(order: Order): Unit = runBlockingWithMDC {
    launchWithMDC { notificationClient.sendConfirmation(order) }
    launchWithMDC { auditService.logOrderCreated(order) }
}
```

## Dispatcher Selection

| Dispatcher | Functions | Use |
|---|---|---|
| **Default** (CPU) | `runBlockingWithMDC`, `asyncWithMDC`, `launchWithMDC` | CPU-bound computation |
| **Virtual Thread** (I/O preferred) | `runBlockingOnVirtualThread`, `asyncOnVirtualThread`, `launchOnVirtualThread` | Blocking I/O (preferred) |
| **IO** (alternative) | `runBlockingOnIoThread`, `asyncOnIoThread`, `launchOnIoThread` | Blocking I/O (alternative) |

Prefer Virtual Thread over IO Dispatcher for blocking I/O.

### By Task Type

| Task | Dispatcher | Example |
|---|---|---|
| CPU computation | Default | Data transformation, calculation |
| HTTP/API calls | Virtual Thread | REST client, gRPC |
| File I/O | IO or Virtual Thread | File read/write |
| DB queries | Virtual Thread | JDBC calls outside JPA transaction |
| Mixed work | Virtual Thread | Composite I/O operations |

```kotlin
import com.myrealtrip.air.common.utils.coroutine.runBlockingOnVirtualThread

fun fetchExternalData(criteria: SearchCriteria): AggregatedResult = runBlockingOnVirtualThread {
    val flights = asyncWithMDC { flightClient.search(criteria) }
    val pricing = asyncWithMDC { pricingClient.calculate(criteria) }
    AggregatedResult(flights.await(), pricing.await())
}
```

Custom dispatcher: `runBlockingWithMDC(myCustomDispatcher) { ... }`

## Retry Pattern

Use project's `retry` and `retryBlocking`. MUST NOT implement retry logic manually.

```kotlin
import com.myrealtrip.air.common.utils.coroutine.retry
import com.myrealtrip.air.common.utils.coroutine.retryBlocking

// Default: 3 attempts, 500ms delay, no backoff
val result = retry { externalApi.call() }

// Custom: exponential backoff, selective exception matching
val result = retry(
    maxAttempts = 5,
    delay = 100.milliseconds,
    backoffMultiplier = 2.0,
    retryOn = { it is IOException || it is TimeoutException },
) { externalApi.call() }

// Blocking version
val result = retryBlocking(maxAttempts = 3) { externalApi.call() }
```

### Parameters

| Parameter | Default | Description |
|---|---|---|
| `maxAttempts` | `3` | Total attempts (min 1) |
| `delay` | `500ms` | Initial delay between retries |
| `backoffMultiplier` | `1.0` | Exponential backoff multiplier (1.0 = fixed delay) |
| `retryOn` | All exceptions | Exception filter for retry |

## Debug Logging

```kotlin
import com.myrealtrip.air.common.utils.coroutine.withLogging

suspend fun fetchOrderData(orderId: Long): OrderData = withLogging("fetchOrderData") {
    val order = asyncWithMDC { orderClient.fetch(orderId) }
    val passengers = asyncWithMDC { passengerClient.fetchByOrder(orderId) }
    OrderData(order.await(), passengers.await())
}
// Log: # >>> fetchOrderData, start thread: 42
// Log: # <<< fetchOrderData, end thread: 43
```

`withLogging` is for debugging only. Remove or guard with log-level check in production-critical paths.

## Structured Concurrency

MUST NOT use `GlobalScope` or unstructured scopes. Always bind child coroutines to parent scope.

```kotlin
// Bad: GlobalScope — coroutine leak if parent fails
fun process(): Unit { GlobalScope.launch { sendNotification() } }

// Good: Structured — cancelled with parent
fun process(): Unit = runBlockingWithMDC { launchWithMDC { sendNotification() } }
```

| Rule | Description |
|---|---|
| `ensureActive()` | Check cancellation in long-running loops |
| `supervisorScope` | Prevent one failure from cancelling siblings |
| `CancellationException` | Never swallow. Always rethrow. |

## Spring Integration

Use coroutines in Service layer for parallel I/O. UseCase manages transaction boundaries.

```kotlin
@Service
class FlightService(
    private val amadeusClient: AmadeusClient,
    private val sabreClient: SabreClient,
) {
    fun searchAllSuppliers(criteria: SearchCriteria): List<FlightResult> =
        runBlockingOnVirtualThread {
            val amadeus = asyncWithMDC { amadeusClient.search(criteria) }
            val sabre = asyncWithMDC { sabreClient.search(criteria) }
            amadeus.await() + sabre.await()
        }
}
```

**WARNING**: MUST NOT perform DB operations inside coroutines. JPA operations must be within UseCase/Service `@Transactional` scope. Parallel coroutines lose transaction context.
