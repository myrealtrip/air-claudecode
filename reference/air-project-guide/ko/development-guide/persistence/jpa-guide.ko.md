---
description: 엔티티 설계, 연관관계, 변환, Enum, Fetch, Lock
keywords: [JPA, Hibernate, entity, "@Entity", association, fetch, lock, enum mapping, converter]
---

# JPA & Hibernate 가이드

JPA와 Hibernate를 사용할 때 지켜야 할 핵심 규칙과 패턴을 설명합니다. 이 가이드를 따르면 일관된 엔티티 설계와 안전한 데이터 처리가 가능합니다.

## 핵심 원칙

| 원칙 | 규칙 |
|---|---|
| 기본 클래스 | 모든 엔티티는 반드시 `BaseEntity` 또는 `BaseTimeEntity`를 상속해야 합니다 |
| Enum 매핑 | `@Enumerated(EnumType.STRING)` 을 사용합니다. ORDINAL은 금지입니다 |
| Fetch 전략 | 모든 연관관계에 `FetchType.LAZY`를 사용합니다 |
| 테이블명 | `@Table(name = "xxx")`를 반드시 명시합니다 |
| 연관관계 금지 | FK는 ID 값으로 저장합니다. 엔티티 연관관계 매핑을 하지 않습니다 |

## BaseEntity / BaseTimeEntity

엔티티에는 생성일시·수정일시 필드가 필요합니다. 감사자(작성자/수정자) 추적이 필요한지에 따라 적절한 기본 클래스를 선택합니다.

| 타입 | 포함 필드 | 사용 시점 |
|---|---|---|
| `BaseTimeEntity` | `createdAt`, `updatedAt` | 타임스탬프만 필요할 때 |
| `BaseEntity` | `createdAt`, `updatedAt`, `createdBy`, `updatedBy` | 생성자/수정자 추적이 필요할 때 |

```kotlin
@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class BaseTimeEntity {
    @CreatedDate
    @Column(updatable = false)
    lateinit var createdAt: LocalDateTime
        protected set

    @LastModifiedDate
    lateinit var updatedAt: LocalDateTime
        protected set
}

@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class BaseEntity : BaseTimeEntity() {
    @CreatedBy
    @Column(updatable = false)
    lateinit var createdBy: String
        protected set

    @LastModifiedBy
    lateinit var updatedBy: String
        protected set
}
```

## 연관관계 정책

연관관계 매핑은 N+1 문제와 복잡도를 높이기 때문에 기본적으로 사용하지 않습니다. FK는 ID 값으로만 저장합니다.

| 정책 | 설명 |
|---|---|
| **기본** | FK를 ID 값(`Long`)으로 저장합니다. 엔티티 연관관계 매핑을 절대 하지 않습니다 |
| **예외** | 단방향 연관관계만 허용됩니다 (진짜 불가피한 경우에 한합니다) |
| **금지** | 양방향 연관관계는 절대 허용되지 않습니다 |
| **조회** | 연관 데이터 조회는 QueryDSL JOIN을 사용합니다 |

기본 패턴 — FK를 ID 값으로 저장:

```kotlin
@Entity
@Table(name = "orders")
class OrderEntity(
    val userId: Long,
    val productId: Long,
) : BaseEntity()
```

예외 패턴 — 단방향 `@ManyToOne` (불가피한 경우에만):

```kotlin
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "user_id")
val user: UserEntity,
```

## 엔티티 작성 패턴

엔티티를 작성할 때는 다음 규칙을 따릅니다.

| 항목 | 규칙 |
|---|---|
| 어노테이션 | `@Entity`, `@Table(name = "...")` 는 반드시 선언합니다 |
| 상속 | `BaseEntity` 또는 `BaseTimeEntity`를 상속합니다 |
| 불변 필드 | `val`을 사용합니다 (id, 생성 시점 값) |
| 가변 필드 | `var` + `protected set`을 사용합니다 |
| 상태 변경 | `update*()` 메서드를 통해서만 변경합니다 |
| 팩토리 | `companion object`의 `of()` 메서드를 사용합니다 (`create`는 사용하지 않습니다) |
| 의존성 | 엔티티에서 DTO 클래스를 import하면 안 됩니다 |

```kotlin
@Entity
@Table(name = "orders")
class OrderEntity(
    val userId: Long,
    var status: String,
    var totalAmount: Long,
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,
) : BaseEntity() {

    fun updateStatus(status: String) {
        this.status = status
    }

    companion object {
        fun of(order: Order): OrderEntity =
            OrderEntity(userId = order.userId, status = order.status, totalAmount = order.totalAmount)
    }
}
```

## 엔티티 ↔ 도메인 변환

엔티티와 도메인 객체 간의 변환은 정해진 패턴을 따릅니다.

| 방향 | 패턴 | 예시 |
|---|---|---|
| 도메인 → 엔티티 | `of` | `OrderEntity.of(order)` |
| 엔티티 → 도메인 | `toDomain` **(예외)** | `entity.toDomain()` |

```kotlin
// OrderEntity 내부
fun toDomain(): Order =
    Order(id = id, userId = userId, status = status, totalAmount = totalAmount)

// 사용 예
val entity = OrderEntity.of(order)
val domain = entity.toDomain()
```

## Enum 매핑

Enum은 반드시 `EnumType.STRING`으로 매핑해야 합니다. ORDINAL을 사용하면 Enum 순서가 바뀔 때 데이터가 깨집니다.

```kotlin
@Enumerated(EnumType.STRING)
@Column(nullable = false)
var status: OrderStatus,
```

## Fetch 전략

모든 연관관계에는 `FetchType.LAZY`를 사용합니다. EAGER는 불필요한 쿼리를 유발하므로 금지합니다.

N+1 문제가 발생하면 QueryDSL의 `fetchJoin()`을 사용합니다. `@EntityGraph`보다 QueryDSL을 우선적으로 사용합니다.

## Lock 전략

동시성 문제를 처리할 때는 상황에 맞는 Lock 전략을 선택합니다.

| 유형 | 낙관적 Lock | 비관적 Lock |
|---|---|---|
| 메커니즘 | `@Version` 필드로 충돌 감지 | `@Lock`으로 DB 행 잠금 |
| 충돌 발생 시 | `OptimisticLockException` 발생 | 대기 후 잠금 획득 |
| 적합한 상황 | 충돌이 드문 경우 (읽기 > 쓰기) | 충돌이 빈번한 경우 (동시 쓰기) |

낙관적 Lock:

```kotlin
@Version
var version: Long = 0L
    protected set
```

비관적 Lock:

```kotlin
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select o from OrderEntity o where o.id = :id")
fun findByIdForUpdate(id: Long): OrderEntity?
```

## Dirty Checking

JPA의 영속성 컨텍스트가 관리하는 엔티티는 필드 값이 바뀌면 트랜잭션 종료 시 자동으로 UPDATE 쿼리를 실행합니다. 수정 후 명시적으로 `save()`를 호출할 필요가 없습니다.

```kotlin
@Transactional
fun updateOrderStatus(orderId: Long, status: String) {
    val entity = orderRepository.findById(orderId)
        ?: throw KnownBusinessException(ErrorCode.DATA_NOT_FOUND, "주문을 찾을 수 없습니다")
    entity.updateStatus(status)
}
```

## 권장 YAML 설정

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: none
    open-in-view: false
    properties:
      hibernate:
        default_batch_fetch_size: 100
        jdbc:
          batch_size: 50
        order_inserts: true
        order_updates: true
```

| 설정 | 값 | 이유 |
|---|---|---|
| `ddl-auto` | `none` | 운영 환경에서 스키마 자동 변경을 방지합니다 |
| `open-in-view` | `false` | OSIV를 비활성화해 DB 커넥션 점유 시간을 최소화합니다 |
| `default_batch_fetch_size` | `100` | 컬렉션 로딩 시 IN 절 배치 처리로 N+1을 완화합니다 |
| `batch_size` | `50` | INSERT/UPDATE 성능 향상을 위해 배치 처리합니다 |

OSIV(`open-in-view: true`)는 HTTP 요청이 끝날 때까지 영속성 컨텍스트를 유지합니다. 이 경우 DB 커넥션을 불필요하게 오래 점유하므로 반드시 `false`로 설정해야 합니다.
