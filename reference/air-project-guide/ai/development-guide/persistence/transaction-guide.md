---
description: Transaction scope, propagation, external call separation, rollback rules
keywords: [transaction, "@Transactional", propagation, rollback, external call separation]
---

# Transaction Guide

## Core Principles

| Principle | Rule |
|---|---|
| Minimal scope | Include only necessary DB operations in transaction |
| No external I/O | MUST NOT perform HTTP calls, file I/O, or messaging inside transaction |
| No self-invocation | Same-class `@Transactional` calls bypass proxy. Extract to separate service. |
| Pre-validation | Validate all inputs before starting transaction |
| Public methods only | `@Transactional` proxy works only on public methods |

## @Transactional Placement

| Layer | Approach |
|---|---|
| UseCase | Declare on `execute()` method |
| Service | Individual method or class-level |
| Controller | Do NOT declare |
| Repository | Do NOT declare |

UseCase = single business flow in one transaction:

```kotlin
@Service
class CreateOrderUseCase(
    private val orderService: OrderService,
    private val orderRepository: OrderRepository,
) {
    @Transactional
    fun execute(command: CreateOrderCommand): OrderResult {
        val order = Order.of(command)
        val entity = OrderEntity.of(order)
        val saved = orderRepository.save(entity)
        return OrderResult.of(saved.toDomain())
    }
}
```

## Read-Only Transaction

Use `readOnly = true` for query-only operations. Optimizes performance and prevents unintended data changes.

```kotlin
@Service
class OrderService(private val orderRepository: OrderRepository) {
    @Transactional(readOnly = true)
    fun findById(orderId: Long): OrderResult {
        val entity = orderRepository.findById(orderId)
            ?: throw KnownBusinessException(
                code = ErrorCode.DATA_NOT_FOUND,
                message = "주문을 찾을 수 없습니다: orderId=$orderId",
            )
        return OrderResult.of(entity.toDomain())
    }
}
```

## Propagation

| Type | Behavior | When |
|---|---|---|
| `REQUIRED` (default) | Join existing or create new | Most cases |
| `REQUIRES_NEW` | Always create new (suspend existing) | Independent audit logging, etc. |
| `MANDATORY` | Execute only within existing transaction | Must-have transaction context |

`REQUIRES_NEW` holds additional DB connection. Use only when necessary.

## External Call Separation Pattern

External I/O (HTTP, messaging) MUST be outside transaction. Order: validation → DB work → external call.

```kotlin
@Service
class CreateOrderUseCase(
    private val orderService: OrderService,
    private val notificationClient: NotificationClient,
) {
    fun execute(command: CreateOrderCommand): OrderResult {
        command.validate()
        val result = orderService.create(command)
        notificationClient.sendOrderCreated(result.orderId)
        return result
    }
}

@Service
class OrderService(private val orderRepository: OrderRepository) {
    @Transactional
    fun create(command: CreateOrderCommand): OrderResult {
        val entity = OrderEntity.of(Order.of(command))
        return OrderResult.of(orderRepository.save(entity).toDomain())
    }
}
```

In this pattern, UseCase's `execute()` has NO `@Transactional`. Transaction scope is limited to Service's DB work. External calls execute after commit.

## Self-Invocation Workaround

Same-class `@Transactional` method calls bypass proxy → transaction not applied. Extract to separate service.

```kotlin
// Bad: self-invocation — transaction not applied
@Service
class OrderService {
    fun process(id: Long) { save(id) }

    @Transactional
    fun save(id: Long) { /* ... */ }
}

// Good: separate service
@Service
class OrderService(private val orderWriter: OrderWriter) {
    fun process(id: Long) { orderWriter.save(id) }
}

@Service
class OrderWriter(private val orderRepository: OrderRepository) {
    @Transactional
    fun save(id: Long) { /* ... */ }
}
```

## Rollback Rules

Spring default: rollback on unchecked exception (`RuntimeException`), commit on checked exception. Kotlin: all exceptions are unchecked → all exceptions trigger rollback.

Use `rollbackFor` / `noRollbackFor` to override:

```kotlin
@Transactional(noRollbackFor = [KnownBusinessException::class])
fun updateWithPartialFailure(command: UpdateCommand): UpdateResult {
    // Commits even if KnownBusinessException is thrown
}
```
