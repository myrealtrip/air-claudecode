---
description: 트랜잭션 범위, 전파, 외부 호출 분리, 롤백 규칙
keywords: [transaction, "@Transactional", propagation, rollback, external call separation]
---

# 트랜잭션 가이드

트랜잭션을 잘못 사용하면 데이터 정합성 문제, 커넥션 고갈, 성능 저하가 발생할 수 있습니다. 이 가이드는 프로젝트에서 `@Transactional`을 올바르게 사용하는 방법을 설명합니다.

## 핵심 원칙

| 원칙 | 규칙 |
|---|---|
| 최소 범위 | 트랜잭션 안에는 꼭 필요한 DB 작업만 포함합니다 |
| 외부 I/O 금지 | 트랜잭션 안에서 HTTP 호출, 파일 I/O, 메시지 발행을 하면 안 됩니다 |
| 자기 호출 금지 | 같은 클래스 내의 `@Transactional` 메서드 호출은 프록시를 우회합니다. 별도 서비스로 분리해야 합니다 |
| 사전 유효성 검증 | 트랜잭션 시작 전에 모든 입력값을 검증합니다 |
| public 메서드만 | `@Transactional` 프록시는 public 메서드에서만 동작합니다 |

## @Transactional 선언 위치

`@Transactional`은 레이어에 따라 선언 위치가 다릅니다.

| 레이어 | 방식 |
|---|---|
| UseCase | `execute()` 메서드에 선언합니다 |
| Service | 개별 메서드 또는 클래스 레벨에 선언합니다 |
| Controller | 선언하지 않습니다 |
| Repository | 선언하지 않습니다 |

UseCase는 하나의 비즈니스 흐름을 하나의 트랜잭션으로 처리합니다.

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

## 읽기 전용 트랜잭션

조회만 하는 메서드에는 `readOnly = true`를 사용합니다. 성능이 향상되고 의도치 않은 데이터 변경을 방지할 수 있습니다.

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

## 전파 타입 (Propagation)

트랜잭션 전파 타입은 메서드가 기존 트랜잭션과 어떻게 상호작용할지를 결정합니다.

| 유형 | 동작 | 사용 시점 |
|---|---|---|
| `REQUIRED` (기본값) | 기존 트랜잭션에 참여하거나 새로 생성합니다 | 대부분의 경우 |
| `REQUIRES_NEW` | 항상 새 트랜잭션을 생성합니다 (기존 트랜잭션은 일시 중단) | 독립적인 감사 로그 등 |
| `MANDATORY` | 기존 트랜잭션이 반드시 있어야 실행됩니다 | 트랜잭션 컨텍스트가 필수인 경우 |

`REQUIRES_NEW`는 추가 DB 커넥션을 점유합니다. 꼭 필요한 경우에만 사용합니다.

## 외부 호출 분리 패턴

HTTP 호출, 메시지 발행 같은 외부 I/O는 트랜잭션 밖에서 실행해야 합니다. 순서는 **유효성 검증 → DB 작업 → 외부 호출**입니다.

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

이 패턴에서 UseCase의 `execute()`에는 `@Transactional`을 선언하지 않습니다. 트랜잭션 범위는 Service의 DB 작업으로 한정됩니다. 외부 호출은 커밋 이후에 실행됩니다.

## 자기 호출(Self-Invocation) 해결 방법

같은 클래스 안에서 `@Transactional` 메서드를 직접 호출하면 Spring 프록시를 거치지 않아 트랜잭션이 적용되지 않습니다. 이 경우 별도 서비스로 분리해야 합니다.

```kotlin
// Bad: 자기 호출 — 트랜잭션이 적용되지 않습니다
@Service
class OrderService {
    fun process(id: Long) { save(id) }

    @Transactional
    fun save(id: Long) { /* ... */ }
}

// Good: 별도 서비스로 분리
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

## 롤백 규칙

Spring의 기본 동작은 unchecked exception(`RuntimeException`) 발생 시 롤백, checked exception 발생 시 커밋입니다. Kotlin에서는 모든 예외가 unchecked이므로 모든 예외에서 롤백이 발생합니다.

`rollbackFor` / `noRollbackFor`로 롤백 동작을 재정의할 수 있습니다.

```kotlin
@Transactional(noRollbackFor = [KnownBusinessException::class])
fun updateWithPartialFailure(command: UpdateCommand): UpdateResult {
    // KnownBusinessException이 발생해도 커밋됩니다
}
```
