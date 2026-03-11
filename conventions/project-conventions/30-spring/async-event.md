# 비동기와 이벤트 처리

> 트랜잭션 커밋 후 부수 효과에는 `@Async` + `@TransactionalEventListener(AFTER_COMMIT)`을 사용한다. 트랜잭션 내에서 외부 I/O를 수행하지 않는다.

---

## 1. 비동기 설정

| 속성 | 값 |
|------|-----|
| Executor 유형 | `VirtualThreadTaskExecutor` |
| 스레드 접두사 | `virtual-thread-` |
| Task 데코레이터 | `ContextPropagatingTaskDecorator` (MDC 전파) |
| 예외 핸들러 | `GlobalSimpleAsyncUncaughtExceptionHandler` |

- `ContextPropagatingTaskDecorator`를 적용하지 않은 커스텀 `TaskExecutor`를 생성하지 않는다.

---

## 2. @Async 메서드

### 규칙

| 규칙 | 상세 |
|------|------|
| public 메서드만 | 프록시는 private/protected 메서드를 가로챌 수 없다 |
| 자기 호출 금지 | 비동기 메서드를 별도 `@Component`로 추출한다 |
| 반환값 없는 부수 효과 | `Unit`을 반환한다 |
| 반환값 필요 시 | 호출자가 결과를 필요로 할 때만 `CompletableFuture<T>`를 사용한다 |

### 자기 호출 — 나쁜 예와 좋은 예

```kotlin
// 나쁜 예: 자기 호출은 프록시를 우회하여 @Async가 동작하지 않는다
@Service
class OrderService(private val orderRepository: OrderRepository) {

    fun placeOrder(request: PlaceOrderRequest) {
        val order = orderRepository.save(Order.create(request))
        sendConfirmation(order.id)   // this로 호출되어 프록시를 거치지 않는다
    }

    @Async
    fun sendConfirmation(orderId: Long) {
        // ...
    }
}
```

```kotlin
// 좋은 예: 비동기 메서드를 별도 @Component에 배치한다
@Service
class OrderService(
    private val orderRepository: OrderRepository,
    private val orderNotifier: OrderNotifier,
) {

    fun placeOrder(request: PlaceOrderRequest) {
        val order = orderRepository.save(Order.create(request))
        orderNotifier.sendConfirmation(order.id)
    }
}

@Component
class OrderNotifier(private val emailClient: EmailClient) {

    @Async
    fun sendConfirmation(orderId: Long) {
        // ...
    }
}
```

---

## 3. Spring 이벤트 시스템

### 이벤트 생명주기 흐름

```
Service (@Transactional 내부)
  │  applicationEventPublisher.publishEvent(event)
  ▼
Spring ApplicationEventPublisher
  │  트랜잭션 커밋을 대기
  ▼
@TransactionalEventListener(phase = AFTER_COMMIT)
@Async
  │  별도 가상 스레드에서 실행
  ▼
EventListener 메서드
  │
  ▼
외부 I/O (이메일, Slack, HTTP 등)
```

### 이벤트 발행

```kotlin
@Service
@Transactional
class CreateOrderUseCase(
    private val orderService: OrderService,
    private val applicationEventPublisher: ApplicationEventPublisher,
) {
    operator fun invoke(command: CreateOrderCommand): OrderResult {
        val result = orderService.create(command)
        applicationEventPublisher.publishEvent(OrderCreatedEvent(result.id))
        return result
    }
}
```

### 이벤트 발행 위치

| 계층 | 허용 여부 | 이유 |
|------|-----------|------|
| UseCase | 허용 | 트랜잭션 경계와 오케스트레이션을 소유한다 |
| Application Service | 허용 | UseCase에서 전파된 트랜잭션 컨텍스트를 가진다 |
| Domain Service | 금지 | 순수 연산만 수행하며 EventPublisher에 접근하지 않는다 |
| Controller | 금지 | HTTP 계층이 도메인 이벤트를 소유하지 않는다 |

---

## 4. 이벤트 수신

### 표준 패턴

```kotlin
@Component
class OrderEventListener(
    private val notificationService: NotificationService,
) {

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    fun onOrderCreated(event: OrderCreatedEvent) {
        try {
            notificationService.sendOrderConfirmation(event.orderId)
        } catch (e: Exception) {
            logger.error(e) { "Failed to handle OrderCreatedEvent for orderId=${event.orderId}" }
        }
    }
}
```

### 어노테이션 규칙

| 어노테이션 | 규칙 |
|-----------|------|
| `@Async` | `@TransactionalEventListener`과 항상 함께 사용하여 논블로킹으로 실행한다 |
| `@TransactionalEventListener` | 트랜잭션 이벤트에는 `@EventListener`보다 우선한다 |
| `AFTER_COMMIT` | 기본 단계 — 트랜잭션 성공 후 실행을 보장한다 |
| `fallbackExecution = true` | 필수 — 활성 트랜잭션이 없을 때(테스트, 스케줄러 등)도 실행한다 |
| 어노테이션 순서 | `@Async`를 먼저, `@TransactionalEventListener`을 다음에 선언한다 |

### @TransactionalEventListener와 @EventListener 비교

| 관점 | `@TransactionalEventListener` | `@EventListener` |
|------|-------------------------------|-----------------|
| 실행 시점 | 지정된 트랜잭션 단계 이후 | 이벤트 발행 즉시 (트랜잭션 내부) |
| 위험 | 없음 — 핸들러 실행 전에 데이터가 커밋됨 | 나중에 롤백된 데이터를 처리할 수 있음 |
| 부수 효과 기본값 | 사용 | 미사용 |

### 각 단계별 사용 시점

| 단계 | 사용 시점 |
|------|-----------|
| `AFTER_COMMIT` | 부수 효과 기본값 (알림, 외부 API 호출) |
| `AFTER_ROLLBACK` | 실패 시 보상 동작 |
| `AFTER_COMPLETION` | 결과와 무관하게 실행해야 하는 동작 (정리, 메트릭) |
| `BEFORE_COMMIT` | 트랜잭션 내에서 수행해야 하는 검증이나 보강 |

### @Async를 사용하지 않는 경우

- 호출자가 리스너의 결과에 의존할 때
- 리스너 실행 순서가 중요하고 동기적이어야 할 때
- 리스너가 발행자와 같은 트랜잭션에 참여해야 할 때 (`@Async` 없이 `BEFORE_COMMIT` 사용)

---

## 5. 이벤트 리스너 위치

### 네이밍 규칙

| 패턴 | 예시 |
|------|------|
| `{Feature}EventListener` | `OrderEventListener`, `PaymentEventListener` |

### 패키지 위치

| 트리거 컨텍스트 | 패키지 |
|----------------|--------|
| 도메인 소유 부수 효과 | `infrastructure/event/` |
| 인프라 채널 (이메일, Slack, SMS) | `infrastructure/event/` |

한 기능의 모든 핸들러를 하나의 리스너 클래스에 그룹화한다 (예: `OrderEventListener`). 이벤트 유형별로 별도 클래스를 생성하지 않는다. 관련 로직을 모아두면 탐색이 쉬워진다.

---

## 6. 이벤트 정의

### 이벤트 클래스 규칙

| 규칙 | 상세 |
|------|------|
| 구조 | 이벤트별 독립 `data class` (sealed class 아님) |
| 네이밍 | `{Feature}{Action}Event` (예: `OrderCreatedEvent`, `OrderCancelledEvent`) |
| 데이터 | ID와 최소한의 컨텍스트만 — 엔티티나 전체 DTO를 넣지 않는다 |
| 패키지 | `domain/event/` |

### 올바른 이벤트 클래스

```kotlin
data class OrderCreatedEvent(val orderId: Long)

data class OrderCancelledEvent(
    val orderId: Long,
    val reason: String,
)

data class OrderCompletedEvent(val orderId: Long)
```

### 잘못된 과대 이벤트

```kotlin
// 나쁜 예: 전체 엔티티 전달 — 결합도 증가와 LazyInitializationException 유발
data class OrderCreatedEvent(val order: Order)

// 나쁜 예: 전체 DTO 전달 — 계층 관심사가 이벤트에 유출
data class OrderCreatedEvent(val orderResponse: OrderResponse)
```

### 최소 데이터로 부족할 때

리스너가 ID 이상의 데이터를 필요로 하면 리스너 내부에서 조회한다 — 이벤트에 포함하지 않는다.

---

## 7. 에러 처리

리스너 본문을 반드시 try-catch로 감싸고 명시적으로 ERROR 로깅한다 (4절의 표준 패턴 참조). `GlobalSimpleAsyncUncaughtExceptionHandler`는 최후의 안전망이지 리스너별 에러 처리를 대체하지 않는다.

---

## 8. 외부 I/O와 트랜잭션

외부 I/O(HTTP 호출, Slack, 이메일, 메시지 큐 발행)는 `@Transactional` 메서드 안에서 실행하지 않는다. DB 커넥션을 열어둔 채로 유지하며 롤백 결정이 네트워크 장애에 좌우된다.

트랜잭션 안에서 이벤트를 발행하고 `AFTER_COMMIT` 리스너가 별도 가상 스레드에서 I/O를 수행하도록 한다:

```kotlin
@Transactional
fun createOrder(request: CreateOrderRequest): OrderResult {
    val order = orderRepository.save(Order.create(request))
    applicationEventPublisher.publishEvent(OrderCreatedEvent(order.id))
    return OrderResult.from(order)
}

@Async
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
fun onOrderCreated(event: OrderCreatedEvent) {
    try {
        slackClient.send("#orders", "New order: ${event.orderId}")
    } catch (e: Exception) {
        logger.error(e) { "Failed to send Slack notification for orderId=${event.orderId}" }
    }
}
```

---

## 9. 흔한 실수

| 실수 | 문제점 | 해결 방법 |
|------|--------|-----------|
| `@Transactional` 안에서 외부 I/O | DB 커넥션 점유, 장애 시 롤백 | 이벤트 + `AFTER_COMMIT` 리스너로 지연 |
| `fallbackExecution = true` 누락 | 활성 트랜잭션이 없으면 리스너가 무시됨 | 항상 `fallbackExecution = true` 설정 |
| 이벤트에 엔티티 전달 | `LazyInitializationException`, 높은 결합도 | ID만 전달하고 리스너에서 조회 |
| 이벤트에 전체 DTO 전달 | 계층 관심사 유출, 이벤트 비대화 | ID와 최소 컨텍스트만 전달 |
| `@Async`와 자기 호출 | 프록시를 거치지 않아 동기 실행 | 비동기 메서드를 별도 `@Component`로 추출 |
| private/protected 메서드에 `@Async` | 프록시가 가로챌 수 없음 | public 메서드에만 사용 |
| 트랜잭션 이벤트에 `@EventListener` 사용 | 커밋 전에 실행되어 롤백된 데이터를 처리할 수 있음 | `@TransactionalEventListener` 사용 |
| 이벤트 유형별 리스너 클래스 분리 | 파편화되어 탐색이 어려움 | 한 기능의 모든 핸들러를 하나의 리스너 클래스에 그룹화 |
| 리스너에 try-catch 없음 | 예외가 전파되어 관련 없는 리스너에 영향 | 리스너 본문을 try-catch로 감싸고 에러 로깅 |
| Controller에서 이벤트 발행 | HTTP 계층에 도메인 이벤트 배치 | UseCase 또는 Application Service에서만 발행 |
| `CompletableFuture` 없이 `@Async` 반환값 의존 | `Unit` 반환 시 결과가 항상 무시됨 | 호출자가 결과를 필요로 하면 `CompletableFuture<T>` 사용 |
