---
description: Event definition, publishing, listener types, async events
keywords: [event, domain event, ApplicationEventPublisher, "@EventListener", "@TransactionalEventListener"]
---

# Event Guide

## Core Principles

| Principle | Rule |
|---|---|
| Spring events | Use `ApplicationEventPublisher` for domain events |
| Sealed class | Group events per domain as `sealed class` |
| `infrastructure/event/` | Event listeners live in infrastructure layer |
| Post-commit side effects | Use `@TransactionalEventListener` for notifications, external calls |
| MDC propagation | Async listeners auto-propagate MDC (traceId, spanId) |

## Event Definition

Group events per domain using `sealed class`.

```kotlin
sealed class OrderEvent {
    data class Created(
        val orderId: Long,
        val userId: Long,
        val totalAmount: Long,
    ) : OrderEvent()

    data class Cancelled(
        val orderId: Long,
        val reason: String,
    ) : OrderEvent()

    data class StatusChanged(
        val orderId: Long,
        val fromStatus: OrderStatus,
        val toStatus: OrderStatus,
    ) : OrderEvent()
}
```

### Naming

| Type | Pattern | Example |
|---|---|---|
| Event class | `{Domain}Event.{Action}` (sealed) | `OrderEvent.Created` |
| Event listener | `{Domain}EventListener` | `OrderEventListener` |
| Package | `infrastructure/event/` | — |

## Publishing

Inject `ApplicationEventPublisher` and publish events.

```kotlin
@Service
class CreateOrderUseCase(
    private val orderService: OrderService,
    private val eventPublisher: ApplicationEventPublisher,
) {
    @Transactional
    fun execute(command: CreateOrderCommand): OrderResult {
        val result = orderService.create(command)

        eventPublisher.publishEvent(
            OrderEvent.Created(
                orderId = result.orderId,
                userId = command.userId,
                totalAmount = result.totalAmount,
            )
        )

        return result
    }
}
```

## Listener Types

### @EventListener (synchronous)

Executes immediately within the transaction. Listener failure causes transaction rollback.

```kotlin
@Component
class OrderEventListener {

    @EventListener
    fun handleOrderCreated(event: OrderEvent.Created) {
        logger.info { "주문 생성 이벤트 수신: orderId=${event.orderId}" }
        // Runs inside transaction — failure causes rollback
    }
}
```

| Aspect | Description |
|---|---|
| Timing | Immediate (within transaction) |
| Failure impact | Listener exception → transaction rollback |
| MDC | Same thread → auto-preserved |
| Use for | Work that must succeed/fail with the transaction |

### @TransactionalEventListener (post-commit)

Executes after transaction commit. Listener failure does NOT affect the original transaction.

```kotlin
@TransactionalEventListener
fun handleOrderCreatedAfterCommit(event: OrderEvent.Created) {
    // Runs after commit — notifications, external API calls, etc.
}
```

| Aspect | Description |
|---|---|
| Timing | After transaction commit (default: `AFTER_COMMIT`) |
| Failure impact | No effect on original transaction |
| MDC | Same thread → auto-preserved |
| Use for | Notifications, external calls, audit logging |

### Phase Options

```kotlin
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)     // default
@TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)   // after rollback
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMPLETION) // after commit or rollback
@TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)    // before commit
```

### @Async + @TransactionalEventListener (async post-commit)

Add `@Async` for async execution. MDC auto-propagated via `ContextPropagatingTaskDecorator`.

```kotlin
@Async
@TransactionalEventListener
fun sendNotification(event: OrderEvent.Created) {
    // Async on separate thread — MDC auto-propagated
    notificationClient.sendOrderConfirmation(event.orderId, event.userId)
}
```

| Aspect | Description |
|---|---|
| Timing | After commit + async |
| Failure impact | No effect on original transaction |
| MDC | Auto-propagated via `ContextPropagatingTaskDecorator` |
| Use for | Time-consuming side effects (email, notifications, external calls) |

## Listener Selection

| Situation | Listener |
|---|---|
| Must succeed/fail with transaction | `@EventListener` |
| Post-commit side effect (sync) | `@TransactionalEventListener` |
| Post-commit side effect (async) | `@Async` + `@TransactionalEventListener` |
| Compensation on rollback | `@TransactionalEventListener(phase = AFTER_ROLLBACK)` |

## Package Structure

```
infrastructure/event/
├── OrderEventListener.kt
├── PaymentEventListener.kt
└── NotificationEventListener.kt
```

## Common Mistakes

| Mistake | Description |
|---|---|
| DB write in `@TransactionalEventListener` | Runs after commit — needs `@Transactional(propagation = REQUIRES_NEW)` |
| External call in `@EventListener` | Performs external I/O inside transaction → use `@TransactionalEventListener` |
| Entity in event payload | Lazy loading fails after transaction ends → include only needed values |
| Ignoring async listener failures | Still must log exceptions in async listeners |
| Depending on listener order | Do NOT write logic that depends on listener execution order |
