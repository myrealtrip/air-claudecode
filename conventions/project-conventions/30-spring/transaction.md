# 트랜잭션 관리

> 트랜잭션은 작고 빠르게 유지한다. 외부 I/O를 포함하지 않는다. 자기 호출(self-invocation)에 주의한다.

## 핵심 지침

| 규칙 | 설명 |
|------|------|
| **작게 유지** | 트랜잭션 안에 필요한 DB 작업만 포함한다 |
| **외부 I/O 금지** | 트랜잭션 안에서 HTTP 호출, 파일 I/O, 메시징을 수행하지 않는다 |
| **자기 호출 금지** | 같은 클래스의 `@Transactional` 메서드 호출은 프록시를 우회한다 — 별도 서비스로 추출하거나 호출자에 트랜잭션을 건다 |
| **빠른 실패** | 트랜잭션 시작 전에 모든 입력을 검증한다 |
| **public 메서드만** | `@Transactional` 프록시는 public 메서드에만 동작한다 |

## @Transactional 기본값

| 속성 | 기본값 | 설명 |
|------|--------|------|
| `propagation` | `REQUIRED` | 기존 트랜잭션에 참여하거나 새로 생성 |
| `isolation` | DB 기본값 (`READ_COMMITTED`) | 트랜잭션 격리 수준 |
| `rollbackFor` | `RuntimeException`, `Error` | 체크 예외는 기본적으로 롤백하지 **않는다** |
| `timeout` | -1 (타임아웃 없음) | 장시간 작업에는 명시적으로 설정한다 |

```kotlin
@Transactional
fun createOrder(command: CreateOrderCommand): OrderId {
    val order = Order.create(command)
    return orderRepository.save(order).id
}
```

## 전파 수준

| 수준 | 동작 | 사용 시점 |
|------|------|-----------|
| `REQUIRED` | 기존 트랜잭션에 참여하거나 새로 생성 | 기본값 — 대부분의 서비스 메서드 |
| `REQUIRES_NEW` | 기존 트랜잭션을 중단하고 항상 새로 생성 | 감사 로그, 독립 작업 |
| `NESTED` | 기존 트랜잭션 내에 세이브포인트 생성 | 트랜잭션 내 부분 롤백 |
| `SUPPORTS` | 기존 트랜잭션이 있으면 참여, 없으면 비트랜잭션 | 트랜잭션이 필요할 수도 아닐 수도 있는 읽기 작업 |
| `NOT_SUPPORTED` | 기존 트랜잭션을 항상 중단하고 비트랜잭션 실행 | 트랜잭션 안에서 실행하면 안 되는 비트랜잭션 작업 |

```kotlin
// REQUIRES_NEW: 외부 트랜잭션이 롤백되어도 감사 로그를 저장해야 한다
@Transactional(propagation = Propagation.REQUIRES_NEW)
fun saveAuditLog(event: AuditEvent) {
    auditLogRepository.save(AuditLog.from(event))
}
```

## 격리 수준

| 수준 | Dirty Read | Non-Repeatable Read | Phantom Read | 사용 시점 |
|------|-----------|---------------------|--------------|-----------|
| `READ_UNCOMMITTED` | 발생 가능 | 발생 가능 | 발생 가능 | 거의 사용하지 않음 — 미커밋 데이터 읽기 허용 |
| `READ_COMMITTED` | 방지 | 발생 가능 | 발생 가능 | 대부분의 DB 기본값 — 범용 선택 |
| `REPEATABLE_READ` | 방지 | 방지 | 발생 가능 | 트랜잭션 내 일관된 읽기 (MySQL 기본값) |
| `SERIALIZABLE` | 방지 | 방지 | 방지 | 가장 엄격 — 높은 경합, 신중히 사용 |

```kotlin
@Transactional(isolation = Isolation.REPEATABLE_READ)
fun calculateBalance(accountId: Long): BigDecimal {
    val account = accountRepository.findById(accountId)
    val transactions = transactionRepository.findByAccountId(accountId)
    return account.initialBalance + transactions.sumOf { it.amount }
}
```

## 읽기 전용 트랜잭션

`readOnly = true`를 사용하면 다음과 같은 이점이 있다:

- **Slave (Reader)** 데이터 소스로 라우팅한다
- DB 드라이버와 ORM이 읽기 최적화를 적용한다
- 실수로 쓰기를 방지한다 (Hibernate flush를 건너뜀)
- Master DB의 락 경합을 줄인다

```kotlin
@Transactional(readOnly = true)
fun getOrderDetail(orderId: Long): OrderDetailResponse {
    val order = orderRepository.findById(orderId)
        ?: throw OrderNotFoundException(orderId)
    return OrderDetailResponse.from(order)
}
```

## Master/Slave DataSource 라우팅

### 라우팅 규칙

| 조건 | DataSource | 설명 |
|------|-----------|------|
| `@Transactional(readOnly = true)` | **Slave** | 읽기 쿼리를 Reader 레플리카로 라우팅 |
| `@Transactional` (기본) | **Master** | 쓰기 쿼리를 Writer로 라우팅 |
| 트랜잭션 없음 | **Slave** | `LazyConnectionDataSourceProxy` 사용 시 Slave로 폴백 |
| 읽기 전용 내부의 `REQUIRES_NEW` | **Master** | 새 트랜잭션이 외부의 읽기 전용 컨텍스트를 무시 |

### 동작 방식

```
Request
  └─> TransactionSynchronizationManager
        ├─ readOnly = true  →  RoutingDataSource selects Slave
        └─ readOnly = false →  RoutingDataSource selects Master
              └─> LazyConnectionDataSourceProxy
                    └─ Connection acquired lazily at first actual DB access
```

### 코드 예시

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

### YAML 설정

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

### 고려 사항

| 항목 | 설명 |
|------|------|
| **LazyConnectionDataSourceProxy** | 필수 — `@Transactional`이 `readOnly` 플래그를 설정한 후 라우팅 결정이 이루어지도록 보장한다 |
| **복제 지연** | Slave는 Master보다 뒤처질 수 있다. 쓰기 직후 지연이나 Master 재라우팅 없이 읽지 않는다 |
| **읽기 전용 내부의 REQUIRES_NEW** | 중첩된 `REQUIRES_NEW` 메서드는 외부 컨텍스트와 무관하게 항상 Master로 라우팅한다 |
| **비트랜잭션 컨텍스트** | `@Transactional` 없이는 라우팅이 프레임워크 기본값에 의존한다 — 항상 명시적으로 어노테이션을 선언한다 |

## 트랜잭션 타임아웃

```kotlin
@Transactional(timeout = 3)
fun processLargeDataSet(command: ProcessCommand) {
    largeDataRepository.processBatch(command)
}
```

YAML을 통한 전역 타임아웃: `spring.transaction.default-timeout: 30` (초).

## 롤백 규칙

| 시나리오 | 동작 |
|----------|------|
| `RuntimeException` (비체크) | 롤백 (기본) |
| `Error` | 롤백 (기본) |
| 체크 `Exception` | **롤백하지 않음** (기본) — 필요하면 `rollbackFor` 추가 |
| `noRollbackFor` 지정 | 해당 타입에서 롤백하지 않음 |

```kotlin
// 체크 예외에서 롤백
@Transactional(rollbackFor = [PaymentException::class])
fun processPayment(command: PaymentCommand) {
    val result = paymentGateway.charge(command)
    paymentRepository.save(Payment.from(result))
}

// 비핵심 예외에서 롤백하지 않음
@Transactional(noRollbackFor = [NotificationFailedException::class])
fun placeOrder(command: PlaceOrderCommand): OrderId {
    val order = orderRepository.save(Order.create(command))
    notificationService.notifyUser(order)
    return order.id
}
```

## 커밋 후 외부 호출

트랜잭션 안에서 HTTP나 메시징 호출을 하지 않는다. 트랜잭션 안에서 도메인 이벤트를 발행하고 `@TransactionalEventListener`로 커밋 후 외부 호출을 처리한다.

```kotlin
// 트랜잭션 안에서 이벤트 발행
@Transactional
fun createOrder(command: CreateOrderCommand): OrderId {
    val order = orderRepository.save(Order.create(command))
    applicationEventPublisher.publishEvent(OrderCreatedEvent(order.id))
    return order.id
}

// 커밋 후 외부 호출 처리
@Component
class OrderCreatedEventListener(private val slackClient: SlackClient) {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun handle(event: OrderCreatedEvent) {
        slackClient.notify("Order created: ${event.orderId}")
    }
}
```

## 자기 호출 문제

`@Transactional`은 Spring AOP 프록시에 의존한다. 같은 객체의 다른 메서드를 호출하면 프록시를 우회하여 어노테이션이 동작하지 않는다.

**해결 — 별도 `@Component`로 추출한다** (권장):

```kotlin
// 나쁜 예: innerTransactionalMethod()가 this로 호출되어 프록시를 우회
@Service
class OrderService(private val orderRepository: OrderRepository) {
    fun createOrder(command: CreateOrderCommand) {
        innerTransactionalMethod(command)  // @Transactional이 동작하지 않음
    }

    @Transactional
    fun innerTransactionalMethod(command: CreateOrderCommand) {
        orderRepository.save(Order.create(command))
    }
}

// 좋은 예: 트랜잭션 메서드를 별도 빈으로 이동
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
        orderPersistence.save(command)  // 프록시가 올바르게 동작
    }
}
```

또는 외부 호출자에 `@Transactional`을 선언하여 전체 호출을 감쌀 수도 있다.

## 테스트

리포지토리 레벨 테스트에 `@DataJpaTest`를 사용한다. 각 테스트는 트랜잭션 안에서 실행되어 자동으로 롤백된다.

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
