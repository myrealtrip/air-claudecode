---
description: MDC 전파, 디스패처 선택, 재시도, 구조적 동시성
keywords: [coroutine, concurrency, async, MDC propagation, dispatcher, retry, structured concurrency]
---

# 동시성 & 코루틴 가이드

이 문서는 프로젝트에서 코루틴을 올바르게 사용하는 방법을 설명합니다. 표준 코루틴 빌더 대신 프로젝트 전용 유틸리티를 사용해야 하며, 그 이유와 사용법을 상세히 안내합니다.

## 핵심 원칙

| 원칙 | 규칙 |
|---|---|
| 프로젝트 `CoroutineUtils` 사용 | `runBlocking`, `async`, `launch`를 직접 사용하면 안 됩니다 |
| MDC 전파 | traceId, spanId 보존을 위해 `*WithMDC` 함수를 사용해야 합니다 |
| Virtual Thread 우선 | 블로킹 I/O에는 IO 디스패처보다 Virtual Thread 디스패처를 사용해야 합니다 |
| 구조적 동시성 | `GlobalScope` 또는 비구조적 스코프를 사용하면 안 됩니다 |

## MDC 컨텍스트 전파

표준 코루틴 빌더(`launch`, `async` 등)를 사용하면 MDC 컨텍스트(traceId, requestId 등)가 자동으로 전파되지 않습니다. 로그 추적이 끊어지는 문제를 방지하려면 반드시 `com.myrealtrip.air.common.utils.coroutine` 패키지의 MDC 보존 함수를 사용해야 합니다.

| 함수 | 용도 | 반환 타입 |
|---|---|---|
| `runBlockingWithMDC` | 블로킹 코드에서 코루틴 진입 | `T` (블로킹) |
| `asyncWithMDC` | 병렬 코루틴 실행 | `Deferred<T>` |
| `launchWithMDC` | 결과를 기다리지 않는 코루틴 실행 | `Job` |

아래 예시는 두 외부 API를 병렬로 호출하면서 MDC를 보존하는 방법입니다.

```kotlin
import com.myrealtrip.air.common.utils.coroutine.runBlockingWithMDC
import com.myrealtrip.air.common.utils.coroutine.asyncWithMDC
import com.myrealtrip.air.common.utils.coroutine.launchWithMDC

// 병렬 실행 — MDC 보존됨
fun fetchOrderDashboard(userId: Long): DashboardResult = runBlockingWithMDC {
    val orders = asyncWithMDC { orderClient.fetchOrders(userId) }
    val flights = asyncWithMDC { flightClient.fetchFlights(userId) }
    DashboardResult(orders.await(), flights.await())
}

// Fire-and-forget — MDC 보존됨
fun processOrder(order: Order): Unit = runBlockingWithMDC {
    launchWithMDC { notificationClient.sendConfirmation(order) }
    launchWithMDC { auditService.logOrderCreated(order) }
}
```

## 디스패처 선택

작업 유형에 따라 적절한 디스패처를 선택해야 합니다. 블로킹 I/O 작업에는 Virtual Thread를 기본으로 사용합니다.

| 디스패처 | 함수 | 용도 |
|---|---|---|
| **Default** (CPU) | `runBlockingWithMDC`, `asyncWithMDC`, `launchWithMDC` | CPU 집약적 연산 |
| **Virtual Thread** (I/O 권장) | `runBlockingOnVirtualThread`, `asyncOnVirtualThread`, `launchOnVirtualThread` | 블로킹 I/O (권장) |
| **IO** (대안) | `runBlockingOnIoThread`, `asyncOnIoThread`, `launchOnIoThread` | 블로킹 I/O (대안) |

블로킹 I/O 작업에는 IO 디스패처보다 Virtual Thread를 우선적으로 사용합니다.

### 작업 유형별 디스패처 선택 기준

| 작업 | 디스패처 | 예시 |
|---|---|---|
| CPU 연산 | Default | 데이터 변환, 계산 |
| HTTP/API 호출 | Virtual Thread | REST 클라이언트, gRPC |
| 파일 I/O | IO 또는 Virtual Thread | 파일 읽기/쓰기 |
| DB 쿼리 | Virtual Thread | JPA 트랜잭션 외부의 JDBC 호출 |
| 복합 작업 | Virtual Thread | 여러 I/O 작업이 혼합된 경우 |

```kotlin
import com.myrealtrip.air.common.utils.coroutine.runBlockingOnVirtualThread

fun fetchExternalData(criteria: SearchCriteria): AggregatedResult = runBlockingOnVirtualThread {
    val flights = asyncWithMDC { flightClient.search(criteria) }
    val pricing = asyncWithMDC { pricingClient.calculate(criteria) }
    AggregatedResult(flights.await(), pricing.await())
}
```

커스텀 디스패처가 필요한 경우 다음과 같이 사용합니다.

```kotlin
runBlockingWithMDC(myCustomDispatcher) { ... }
```

## 재시도 패턴

네트워크 오류나 일시적 장애에 대응하기 위해 재시도 로직이 필요한 경우, 프로젝트 전용 `retry` 및 `retryBlocking` 함수를 사용해야 합니다. 직접 재시도 로직을 구현하면 안 됩니다.

```kotlin
import com.myrealtrip.air.common.utils.coroutine.retry
import com.myrealtrip.air.common.utils.coroutine.retryBlocking

// 기본 설정: 3회 시도, 500ms 지연, 백오프 없음
val result = retry { externalApi.call() }

// 커스텀: 지수 백오프, 특정 예외만 재시도
val result = retry(
    maxAttempts = 5,
    delay = 100.milliseconds,
    backoffMultiplier = 2.0,
    retryOn = { it is IOException || it is TimeoutException },
) { externalApi.call() }

// 블로킹 버전
val result = retryBlocking(maxAttempts = 3) { externalApi.call() }
```

### 파라미터 설명

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| `maxAttempts` | `3` | 총 시도 횟수 (최소 1) |
| `delay` | `500ms` | 재시도 간 초기 대기 시간 |
| `backoffMultiplier` | `1.0` | 지수 백오프 배수 (1.0 = 고정 지연) |
| `retryOn` | 모든 예외 | 재시도할 예외 필터 |

## 디버그 로깅

코루틴 실행 흐름을 추적할 때 `withLogging`을 사용할 수 있습니다. 이 함수는 코루틴 시작과 종료 시 스레드 정보를 로그에 기록합니다.

```kotlin
import com.myrealtrip.air.common.utils.coroutine.withLogging

suspend fun fetchOrderData(orderId: Long): OrderData = withLogging("fetchOrderData") {
    val order = asyncWithMDC { orderClient.fetch(orderId) }
    val passengers = asyncWithMDC { passengerClient.fetchByOrder(orderId) }
    OrderData(order.await(), passengers.await())
}
// 로그 출력: # >>> fetchOrderData, start thread: 42
// 로그 출력: # <<< fetchOrderData, end thread: 43
```

`withLogging`은 디버깅 전용입니다. 운영 환경의 성능 중요 경로에서는 제거하거나 로그 레벨 조건을 추가해야 합니다.

## 구조적 동시성

코루틴 누수를 방지하려면 항상 자식 코루틴을 부모 스코프에 바인딩해야 합니다. `GlobalScope`나 비구조적 스코프를 사용하면 안 됩니다.

```kotlin
// 잘못된 예: GlobalScope — 부모 실패 시 코루틴 누수 발생
fun process(): Unit { GlobalScope.launch { sendNotification() } }

// 올바른 예: 구조적 — 부모와 함께 취소됨
fun process(): Unit = runBlockingWithMDC { launchWithMDC { sendNotification() } }
```

구조적 동시성 관련 추가 규칙은 다음과 같습니다.

| 규칙 | 설명 |
|---|---|
| `ensureActive()` | 장시간 실행되는 루프에서 취소 여부를 확인합니다 |
| `supervisorScope` | 하나의 자식 실패가 형제 코루틴을 취소하지 않도록 합니다 |
| `CancellationException` | 절대로 삼켜서는 안 됩니다. 항상 다시 던져야 합니다 |

## Spring 통합

Service 레이어에서 병렬 I/O에 코루틴을 사용합니다. 트랜잭션 경계는 UseCase에서 관리합니다.

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

> **주의**: 코루틴 내부에서 DB 작업을 수행하면 안 됩니다. JPA 작업은 UseCase/Service의 `@Transactional` 스코프 안에서만 실행해야 합니다. 병렬 코루틴은 트랜잭션 컨텍스트를 잃어버리기 때문입니다.
