---
description: 이벤트 정의, 발행, 리스너 유형, 비동기 이벤트
keywords: [event, domain event, ApplicationEventPublisher, "@EventListener", "@TransactionalEventListener"]
---

# 이벤트 가이드

이 문서는 도메인 이벤트를 정의하고 발행하는 방법, 그리고 이벤트 리스너의 종류와 선택 기준을 설명합니다. Spring의 이벤트 메커니즘을 활용하면 도메인 계층과 사이드 이펙트(알림, 외부 호출 등)를 깔끔하게 분리할 수 있습니다.

## 핵심 원칙

| 원칙 | 규칙 |
|---|---|
| Spring 이벤트 사용 | 도메인 이벤트에는 `ApplicationEventPublisher`를 사용해야 합니다 |
| Sealed class 사용 | 도메인별 이벤트를 `sealed class`로 그룹화합니다 |
| `infrastructure/event/` | 이벤트 리스너는 infrastructure 레이어에 위치합니다 |
| 커밋 후 사이드 이펙트 | 알림, 외부 호출 등에는 `@TransactionalEventListener`를 사용해야 합니다 |
| MDC 전파 | 비동기 리스너는 MDC(traceId, spanId)를 자동으로 전파합니다 |

## 이벤트 정의

하나의 도메인에서 발생하는 이벤트는 `sealed class`로 묶어서 관리합니다. 이렇게 하면 관련 이벤트를 한 곳에서 파악할 수 있고, `when` 표현식을 통해 타입 안전하게 처리할 수 있습니다.

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

### 네이밍 규칙

| 유형 | 패턴 | 예시 |
|---|---|---|
| 이벤트 클래스 | `{Domain}Event.{Action}` (sealed) | `OrderEvent.Created` |
| 이벤트 리스너 | `{Domain}EventListener` | `OrderEventListener` |
| 패키지 | `infrastructure/event/` | — |

## 이벤트 발행

`ApplicationEventPublisher`를 주입받아 이벤트를 발행합니다. 일반적으로 UseCase에서 비즈니스 로직 처리 후 이벤트를 발행합니다.

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

## 리스너 유형

상황에 따라 세 가지 리스너 유형 중 하나를 선택합니다. 각 유형은 실행 타이밍과 트랜잭션 영향이 다릅니다.

### @EventListener (동기 실행)

트랜잭션 내부에서 즉시 실행됩니다. 리스너에서 예외가 발생하면 트랜잭션이 롤백됩니다.

```kotlin
@Component
class OrderEventListener {

    @EventListener
    fun handleOrderCreated(event: OrderEvent.Created) {
        logger.info { "주문 생성 이벤트 수신: orderId=${event.orderId}" }
        // 트랜잭션 내부에서 실행됨 — 예외 발생 시 롤백
    }
}
```

| 항목 | 설명 |
|---|---|
| 실행 시점 | 즉시 (트랜잭션 내부) |
| 실패 영향 | 리스너 예외 → 트랜잭션 롤백 |
| MDC | 동일 스레드 → 자동 보존 |
| 사용 시 | 트랜잭션과 함께 성공/실패해야 하는 작업 |

### @TransactionalEventListener (커밋 후 실행)

트랜잭션 커밋 이후에 실행됩니다. 리스너 실패가 원래 트랜잭션에 영향을 주지 않습니다. 알림 발송, 외부 API 호출, 감사 로깅 등 커밋 이후에 처리해야 하는 사이드 이펙트에 적합합니다.

```kotlin
@TransactionalEventListener
fun handleOrderCreatedAfterCommit(event: OrderEvent.Created) {
    // 커밋 이후 실행 — 알림, 외부 API 호출 등
}
```

| 항목 | 설명 |
|---|---|
| 실행 시점 | 트랜잭션 커밋 이후 (기본: `AFTER_COMMIT`) |
| 실패 영향 | 원래 트랜잭션에 영향 없음 |
| MDC | 동일 스레드 → 자동 보존 |
| 사용 시 | 알림, 외부 호출, 감사 로깅 |

### Phase 옵션

트랜잭션 상태에 따라 다른 시점에 실행되도록 설정할 수 있습니다.

```kotlin
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)     // 기본값
@TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)   // 롤백 이후
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMPLETION) // 커밋 또는 롤백 이후
@TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)    // 커밋 이전
```

### @Async + @TransactionalEventListener (비동기 커밋 후 실행)

시간이 오래 걸리는 사이드 이펙트(이메일, 알림, 외부 호출 등)에는 `@Async`를 추가하여 별도 스레드에서 비동기로 처리합니다. MDC는 `ContextPropagatingTaskDecorator`를 통해 자동으로 전파됩니다.

```kotlin
@Async
@TransactionalEventListener
fun sendNotification(event: OrderEvent.Created) {
    // 별도 스레드에서 비동기 실행 — MDC 자동 전파
    notificationClient.sendOrderConfirmation(event.orderId, event.userId)
}
```

| 항목 | 설명 |
|---|---|
| 실행 시점 | 커밋 이후 + 비동기 |
| 실패 영향 | 원래 트랜잭션에 영향 없음 |
| MDC | `ContextPropagatingTaskDecorator`를 통해 자동 전파 |
| 사용 시 | 시간이 오래 걸리는 사이드 이펙트 (이메일, 알림, 외부 호출) |

## 리스너 선택 기준

상황에 맞는 리스너를 선택하기 위한 기준입니다.

| 상황 | 리스너 |
|---|---|
| 트랜잭션과 함께 성공/실패해야 하는 경우 | `@EventListener` |
| 커밋 후 동기 사이드 이펙트 | `@TransactionalEventListener` |
| 커밋 후 비동기 사이드 이펙트 | `@Async` + `@TransactionalEventListener` |
| 롤백 시 보상 처리 | `@TransactionalEventListener(phase = AFTER_ROLLBACK)` |

## 패키지 구조

이벤트 리스너는 infrastructure 레이어의 `event` 패키지에 위치합니다.

```
infrastructure/event/
├── OrderEventListener.kt
├── PaymentEventListener.kt
└── NotificationEventListener.kt
```

## 자주 하는 실수

| 실수 | 설명 |
|---|---|
| `@TransactionalEventListener`에서 DB 쓰기 | 커밋 이후에 실행되므로 기존 트랜잭션이 없습니다. `@Transactional(propagation = REQUIRES_NEW)`를 추가해야 합니다 |
| `@EventListener`에서 외부 호출 | 트랜잭션 내부에서 외부 I/O를 수행합니다. `@TransactionalEventListener`를 사용해야 합니다 |
| 이벤트 페이로드에 Entity 포함 | 트랜잭션 종료 후 Lazy Loading이 실패합니다. 필요한 값만 포함해야 합니다 |
| 비동기 리스너 예외 무시 | 비동기 리스너에서도 예외를 반드시 로깅해야 합니다 |
| 리스너 실행 순서에 의존 | 리스너 실행 순서에 의존하는 로직을 작성하면 안 됩니다 |
