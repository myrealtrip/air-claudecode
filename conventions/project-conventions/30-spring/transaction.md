# Transaction Management

> Keep transactions small and fast. No external I/O. Watch for self-invocation.

## Core Guidelines

| Rule | Description |
|------|-------------|
| **Keep it small** | Only include necessary DB operations in a transaction |
| **No external I/O** | Never perform HTTP calls, file I/O, or messaging inside transactions |
| **No self-invocation** | Same-class `@Transactional` method calls bypass proxy -- extract to another service or make caller transactional |
| **Fail fast** | Validate all inputs before starting a transaction |
| **Public methods only** | `@Transactional` proxy only works on public methods |

## @Transactional Defaults

| Attribute | Default | Description |
|-----------|---------|-------------|
| `propagation` | `REQUIRED` | Join existing transaction or create new one |
| `isolation` | DB default (`READ_COMMITTED`) | Isolation level for the transaction |
| `rollbackFor` | `RuntimeException`, `Error` | Checked exceptions do NOT roll back by default |
| `timeout` | -1 (no timeout) | Set explicitly for long-running operations |

```kotlin
@Transactional
fun createOrder(command: CreateOrderCommand): OrderId {
    val order = Order.create(command)
    return orderRepository.save(order).id
}
```

## Propagation Levels

| Level | Behavior | Use Case |
|-------|----------|----------|
| `REQUIRED` | Join existing or create new | Default -- most service methods |
| `REQUIRES_NEW` | Always suspend existing and create new | Audit logs, independent operations |
| `NESTED` | Create savepoint within existing | Partial rollback within a transaction |
| `SUPPORTS` | Use existing if present, else non-transactional | Read operations that may or may not need a transaction |
| `NOT_SUPPORTED` | Always suspend existing, run non-transactional | Non-transactional operations that must not run inside a transaction |

```kotlin
// REQUIRES_NEW: audit log must be saved even if the outer transaction rolls back
@Transactional(propagation = Propagation.REQUIRES_NEW)
fun saveAuditLog(event: AuditEvent) {
    auditLogRepository.save(AuditLog.from(event))
}
```

## Isolation Levels

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Use Case |
|-------|-----------|---------------------|--------------|----------|
| `READ_UNCOMMITTED` | Possible | Possible | Possible | Rarely used -- allows reading uncommitted data |
| `READ_COMMITTED` | Prevented | Possible | Possible | Default for most DBs -- good general-purpose choice |
| `REPEATABLE_READ` | Prevented | Prevented | Possible | Consistent reads within a transaction (MySQL default) |
| `SERIALIZABLE` | Prevented | Prevented | Prevented | Strictest -- high contention, use sparingly |

```kotlin
@Transactional(isolation = Isolation.REPEATABLE_READ)
fun calculateBalance(accountId: Long): BigDecimal {
    val account = accountRepository.findById(accountId)
    val transactions = transactionRepository.findByAccountId(accountId)
    return account.initialBalance + transactions.sumOf { it.amount }
}
```

## Read-only Transactions

Using `readOnly = true` provides the following benefits:

- Routes the query to the **Slave (Reader)** data source
- Allows the DB driver and ORM to apply read optimizations
- Prevents accidental writes (Hibernate flushes are skipped)
- Reduces lock contention on the Master DB

```kotlin
@Transactional(readOnly = true)
fun getOrderDetail(orderId: Long): OrderDetailResponse {
    val order = orderRepository.findById(orderId)
        ?: throw OrderNotFoundException(orderId)
    return OrderDetailResponse.from(order)
}
```

## Master/Slave DataSource Routing

### Routing Rules

| Condition | DataSource | Description |
|-----------|-----------|-------------|
| `@Transactional(readOnly = true)` | **Slave** | Read queries routed to Reader replica |
| `@Transactional` (default) | **Master** | Write queries routed to Writer |
| No transaction | **Slave** | Falls back to Slave (with `LazyConnectionDataSourceProxy`) |
| `REQUIRES_NEW` inside read-only | **Master** | New transaction overrides outer read-only context |

### How It Works

```
Request
  └─> TransactionSynchronizationManager
        ├─ readOnly = true  →  RoutingDataSource selects Slave
        └─ readOnly = false →  RoutingDataSource selects Master
              └─> LazyConnectionDataSourceProxy
                    └─ Connection acquired lazily at first actual DB access
```

### Code Examples

```kotlin
@Service
@Transactional(readOnly = true)
class GetOrderUseCase(
    private val orderService: OrderService,
) {
    operator fun invoke(orderId: Long): OrderResult {
        return orderService.findById(orderId)
    }
}

@Service
@Transactional
class CreateOrderUseCase(
    private val orderService: OrderService,
    private val orderLimitPolicy: OrderLimitPolicy,
) {
    operator fun invoke(command: CreateOrderCommand): OrderResult {
        orderLimitPolicy.validate(command.userId)
        return orderService.create(command)
    }
}
```

### Configuration YAML

```yaml
spring:
  datasource:
    master:
      jdbc-url: jdbc:mysql://master-host:3306/mydb
      username: ${DB_MASTER_USERNAME}
      password: ${DB_MASTER_PASSWORD}
      driver-class-name: com.mysql.cj.jdbc.Driver
    slave:
      jdbc-url: jdbc:mysql://slave-host:3306/mydb
      username: ${DB_SLAVE_USERNAME}
      password: ${DB_SLAVE_PASSWORD}
      driver-class-name: com.mysql.cj.jdbc.Driver
```

### Considerations

| Item | Description |
|------|-------------|
| **LazyConnectionDataSourceProxy** | Required -- ensures routing decision is made after `@Transactional` sets `readOnly` flag |
| **Replication lag** | Slave may lag behind Master; avoid reading immediately after a write without a delay or re-routing to Master |
| **REQUIRES_NEW inside read-only** | A nested `REQUIRES_NEW` method always routes to Master regardless of outer context |
| **Non-transactional context** | Without `@Transactional`, routing depends on framework defaults -- always annotate explicitly |

## Transaction Timeout

```kotlin
@Transactional(timeout = 3)
fun processLargeDataSet(command: ProcessCommand) {
    largeDataRepository.processBatch(command)
}
```

Global timeout via YAML: `spring.transaction.default-timeout: 30` (seconds).

## Rollback Rules

| Scenario | Behavior |
|----------|----------|
| `RuntimeException` (unchecked) | Rollback (default) |
| `Error` | Rollback (default) |
| Checked `Exception` | **No rollback** (default) -- add `rollbackFor` if needed |
| `noRollbackFor` specified | No rollback on matching type |

```kotlin
// Roll back on checked exception
@Transactional(rollbackFor = [PaymentException::class])
fun processPayment(command: PaymentCommand) {
    val result = paymentGateway.charge(command)
    paymentRepository.save(Payment.from(result))
}

// Do not roll back on a known non-critical exception
@Transactional(noRollbackFor = [NotificationFailedException::class])
fun placeOrder(command: PlaceOrderCommand): OrderId {
    val order = orderRepository.save(Order.create(command))
    notificationService.notifyUser(order)
    return order.id
}
```

## External Calls After Commit

Never make HTTP or messaging calls inside a transaction. Publish a domain event inside the transaction and handle the external call after commit via `@TransactionalEventListener`.

```kotlin
// Publish event inside transaction
@Transactional
fun createOrder(command: CreateOrderCommand): OrderId {
    val order = orderRepository.save(Order.create(command))
    applicationEventPublisher.publishEvent(OrderCreatedEvent(order.id))
    return order.id
}

// Handle external call after commit
@Component
class OrderCreatedEventListener(private val slackClient: SlackClient) {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun handle(event: OrderCreatedEvent) {
        slackClient.notify("Order created: ${event.orderId}")
    }
}
```

## Self-Invocation Problem

`@Transactional` relies on Spring AOP proxies. When a method calls another method on the **same object**, the proxy is bypassed and the annotation has no effect.

**Solution -- extract to a separate `@Component`** (preferred):

```kotlin
// Bad: innerTransactionalMethod() called on `this` -- proxy bypassed
@Service
class OrderService(private val orderRepository: OrderRepository) {
    fun createOrder(command: CreateOrderCommand) {
        innerTransactionalMethod(command)  // @Transactional has NO effect
    }

    @Transactional
    fun innerTransactionalMethod(command: CreateOrderCommand) {
        orderRepository.save(Order.create(command))
    }
}

// Good: move transactional method to a separate bean
@Component
class OrderPersistence(private val orderRepository: OrderRepository) {
    @Transactional
    fun save(command: CreateOrderCommand) {
        orderRepository.save(Order.create(command))
    }
}

@Service
class OrderService(private val orderPersistence: OrderPersistence) {
    fun createOrder(command: CreateOrderCommand) {
        orderPersistence.save(command)  // Proxy invoked correctly
    }
}
```

Alternatively, annotate the outer caller with `@Transactional` so the entire call is wrapped.

## Testing

Use `@DataJpaTest` for repository-level tests. Each test runs in a transaction that rolls back automatically.

```kotlin
@DataJpaTest
class OrderRepositoryTest(@Autowired private val orderRepository: OrderRepository) {
    @Test
    fun `should save and retrieve order`() {
        val saved = orderRepository.save(Order.create(customerId = 1L, itemId = 42L, quantity = 2))
        assertThat(orderRepository.findById(saved.id)).isNotNull
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    fun `should test without transaction for explicit commit behavior`() {
        val order = orderRepository.save(Order.create(customerId = 2L, itemId = 1L, quantity = 1))
        assertThat(orderRepository.findById(order.id)).isNotNull
        orderRepository.deleteById(order.id)
    }
}
```
