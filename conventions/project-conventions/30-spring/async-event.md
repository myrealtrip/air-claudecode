# Async & Event Handling

> Use `@Async` + `@TransactionalEventListener(AFTER_COMMIT)` for side effects after transaction commit. Never perform external I/O inside a transaction.

---

## 1. Async Configuration

| Property | Value |
|----------|-------|
| Executor type | `VirtualThreadTaskExecutor` |
| Thread prefix | `virtual-thread-` |
| Task decorator | `ContextPropagatingTaskDecorator` (MDC propagation) |
| Exception handler | `GlobalSimpleAsyncUncaughtExceptionHandler` |

- Never create a custom `TaskExecutor` without applying `ContextPropagatingTaskDecorator`.

---

## 2. @Async Methods

### Rules

| Rule | Detail |
|------|--------|
| Public methods only | Proxy cannot intercept private/protected methods |
| No self-invocation | Extract async methods to a separate `@Component` |
| Fire-and-forget | Return `Unit` for side effects |
| No return reliance | Use `CompletableFuture<T>` only when the caller genuinely needs the result |

### Self-invocation — bad vs good

```kotlin
// BAD: self-invocation bypasses the proxy; @Async has no effect
@Service
class OrderService(private val orderRepository: OrderRepository) {

    fun placeOrder(request: PlaceOrderRequest) {
        val order = orderRepository.save(Order.create(request))
        sendConfirmation(order.id)   // called on `this`, not the proxy
    }

    @Async
    fun sendConfirmation(orderId: Long) {
        // ...
    }
}
```

```kotlin
// GOOD: async method lives in a separate @Component
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

## 3. Spring Event System

### Event lifecycle flow

```
Service (within @Transactional)
  │  applicationEventPublisher.publishEvent(event)
  ▼
Spring ApplicationEventPublisher
  │  waits for transaction commit
  ▼
@TransactionalEventListener(phase = AFTER_COMMIT)
@Async
  │  runs on a separate virtual thread
  ▼
EventListener method
  │
  ▼
External I/O (email, Slack, HTTP, etc.)
```

### Publishing events

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

### Where to publish

| Layer | Allowed | Reason |
|-------|---------|--------|
| UseCase | Yes | Owns the transaction boundary and orchestration |
| Application Service | Yes | Has transaction context (propagated from UseCase) |
| Domain Service | No | Pure computation; no access to EventPublisher |
| Controller | No | HTTP layer must not own domain events |

---

## 4. Listening to Events

### Standard pattern

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

### Annotation rules

| Annotation | Rule |
|-----------|------|
| `@Async` | Always pair with `@TransactionalEventListener` for non-blocking execution |
| `@TransactionalEventListener` | Prefer over `@EventListener` for transactional events |
| `AFTER_COMMIT` | Default phase — guarantees the transaction succeeded before firing |
| `fallbackExecution = true` | Required — fires even when there is no active transaction (e.g. tests, schedulers) |
| Annotation order | `@Async` first, then `@TransactionalEventListener` |

### @TransactionalEventListener vs @EventListener

| Aspect | `@TransactionalEventListener` | `@EventListener` |
|--------|-------------------------------|-----------------|
| When it fires | After the specified transaction phase | Immediately when event is published (within the transaction) |
| Risk | None — data is committed before handler runs | May process data that was later rolled back |
| Default for side effects | Yes | No |

### When to use each phase

| Phase | Use case |
|-------|----------|
| `AFTER_COMMIT` | Default for side effects (notifications, external API calls) |
| `AFTER_ROLLBACK` | Compensating actions on failure |
| `AFTER_COMPLETION` | Actions that must run regardless of outcome (cleanup, metrics) |
| `BEFORE_COMMIT` | Validation or enrichment that must still be within the transaction |

### When NOT to use @Async

- When the caller depends on the result of the listener.
- When ordering of listener execution relative to other listeners matters and must be synchronous.
- When the listener must participate in the same transaction as the publisher (use `BEFORE_COMMIT` without `@Async` instead).

---

## 5. Event Listener Location

### Naming convention

| Pattern | Example |
|---------|---------|
| `{Feature}EventListener` | `OrderEventListener`, `PaymentEventListener` |

### Package location

| Trigger context | Package |
|----------------|---------|
| Domain-owned side effects | `infrastructure/event/` |
| Infrastructure channel (email, Slack, SMS) | `infrastructure/event/` |

Group all handlers for a feature in one listener class (e.g. `OrderEventListener`) rather than creating a separate class per event type. This keeps related logic together and makes the listener easy to navigate.

---

## 6. Defining Events

### Event class conventions

| Convention | Detail |
|-----------|--------|
| Structure | Independent `data class` per event (not sealed) |
| Naming | `{Feature}{Action}Event` (e.g. `OrderCreatedEvent`, `OrderCancelledEvent`) |
| Data carried | IDs and minimal context only — never entities or full DTOs |
| Package | `domain/event/` |

### Correct event classes

```kotlin
data class OrderCreatedEvent(val orderId: Long)

data class OrderCancelledEvent(
    val orderId: Long,
    val reason: String,
)

data class OrderCompletedEvent(val orderId: Long)
```

### Incorrect fat event

```kotlin
// BAD: passes the full entity — causes coupling and LazyInitializationException
data class OrderCreatedEvent(val order: Order)

// BAD: passes a full DTO — leaks layer concerns into the event
data class OrderCreatedEvent(val orderResponse: OrderResponse)
```

### When minimal data is not enough

If the listener needs more data than just the ID, fetch it inside the listener — do not embed it in the event.

---

## 7. Error Handling

Always wrap the listener body in try-catch with explicit ERROR logging (see standard pattern in section 4). `GlobalSimpleAsyncUncaughtExceptionHandler` is a last-resort safety net — it does not replace per-listener error handling.

---

## 8. External I/O and Transactions

External I/O (HTTP calls, Slack, email, message queue publishing) must never run inside a `@Transactional` method. It holds the DB connection open and ties rollback decisions to network failures.

Publish an event inside the transaction and let the `AFTER_COMMIT` listener perform the I/O on a separate virtual thread:

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

## 9. Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| External I/O inside `@Transactional` | Holds DB connection; failure can cause rollback | Defer via event + `AFTER_COMMIT` listener |
| Missing `fallbackExecution = true` | Listener silently skipped when no active transaction | Always set `fallbackExecution = true` |
| Passing an entity in the event | `LazyInitializationException`; tight coupling | Pass only IDs; fetch in the listener |
| Passing a full DTO in the event | Leaks layer concerns; bloats the event | Pass only IDs and minimal context |
| Self-invocation with `@Async` | Proxy not involved; runs synchronously | Extract async method to a separate `@Component` |
| `@Async` on private/protected method | Proxy cannot intercept | Use only on public methods |
| Using `@EventListener` for transactional events | Fires before commit; may act on rolled-back data | Use `@TransactionalEventListener` |
| One listener class per event type | Fragmented, hard to navigate | Group all handlers for a feature in one listener class |
| No try-catch in listener | Exception propagates; may disrupt unrelated listeners | Wrap listener body in try-catch with error logging |
| Publishing events in Controller | Domain events in the HTTP layer | Publish only from UseCase or Application Service |
| Relying on `@Async` return value without `CompletableFuture` | Result is always ignored for `Unit` return | Use `CompletableFuture<T>` when the caller needs the result |
