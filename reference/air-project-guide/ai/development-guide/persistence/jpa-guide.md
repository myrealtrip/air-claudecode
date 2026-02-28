---
description: Entity design, associations, conversion, Enum, Fetch, Lock
keywords: [JPA, Hibernate, entity, "@Entity", association, fetch, lock, enum mapping, converter]
---

# JPA & Hibernate Guide

## Core Principles

| Principle | Rule |
|---|---|
| Base class | All entities MUST extend `BaseEntity` or `BaseTimeEntity` |
| Enum mapping | `@Enumerated(EnumType.STRING)` — ORDINAL is prohibited |
| Fetch strategy | `FetchType.LAZY` on all associations |
| Table name | `@Table(name = "xxx")` is mandatory |
| No associations | Store FK as plain ID value. Do NOT map entity associations. |

## BaseEntity / BaseTimeEntity

| Type | Fields | When |
|---|---|---|
| `BaseTimeEntity` | `createdAt`, `updatedAt` | Only timestamps needed |
| `BaseEntity` | `createdAt`, `updatedAt`, `createdBy`, `updatedBy` | Auditor tracking needed |

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

## Association Policy

| Policy | Description |
|---|---|
| **Default** | Store FK as plain ID value (`Long`). Never map entity associations. |
| **Exception** | Only unidirectional allowed when truly unavoidable. |
| **Prohibited** | Bidirectional associations are never allowed. |
| **Query** | Use QueryDSL JOIN for associated data retrieval. |

Default pattern — FK as ID value:

```kotlin
@Entity
@Table(name = "orders")
class OrderEntity(
    val userId: Long,
    val productId: Long,
) : BaseEntity()
```

Exception pattern — unidirectional `@ManyToOne` when unavoidable:

```kotlin
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "user_id")
val user: UserEntity,
```

## Entity Writing Pattern

| Item | Rule |
|---|---|
| Annotations | `@Entity`, `@Table(name = "...")` required |
| Inheritance | Extend `BaseEntity` or `BaseTimeEntity` |
| Immutable fields | Use `val` (id, creation-time values) |
| Mutable fields | Use `var` + `protected set` |
| State change | Via `update*()` methods |
| Factory | `companion object`'s `of()` method (never `create`) |
| Dependencies | Entity MUST NOT import DTO classes |

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

## Entity ↔ Domain Conversion

| Direction | Pattern | Example |
|---|---|---|
| domain → entity | `of` | `OrderEntity.of(order)` |
| entity → domain | `toDomain` **(exception)** | `entity.toDomain()` |

```kotlin
// Inside OrderEntity
fun toDomain(): Order =
    Order(id = id, userId = userId, status = status, totalAmount = totalAmount)

// Usage
val entity = OrderEntity.of(order)
val domain = entity.toDomain()
```

## Enum Mapping

MUST use `EnumType.STRING`. ORDINAL breaks data when enum order changes.

```kotlin
@Enumerated(EnumType.STRING)
@Column(nullable = false)
var status: OrderStatus,
```

## Fetch Strategy

All associations: `FetchType.LAZY`. EAGER is prohibited (causes unnecessary queries).

For N+1 problems, use QueryDSL `fetchJoin()`. Prefer QueryDSL over `@EntityGraph`.

## Lock Strategy

| Type | Optimistic Lock | Pessimistic Lock |
|---|---|---|
| Mechanism | `@Version` field for conflict detection | `@Lock` for DB row locking |
| On conflict | `OptimisticLockException` | Wait then acquire |
| Best for | Rare conflicts (reads > writes) | Frequent conflicts (concurrent writes) |

Optimistic Lock:
```kotlin
@Version
var version: Long = 0L
    protected set
```

Pessimistic Lock:
```kotlin
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select o from OrderEntity o where o.id = :id")
fun findByIdForUpdate(id: Long): OrderEntity?
```

## Dirty Checking

Managed entities auto-trigger UPDATE on field change. No explicit `save()` needed after modification.

```kotlin
@Transactional
fun updateOrderStatus(orderId: Long, status: String) {
    val entity = orderRepository.findById(orderId)
        ?: throw KnownBusinessException(ErrorCode.DATA_NOT_FOUND, "주문을 찾을 수 없습니다")
    entity.updateStatus(status)
}
```

## Recommended YAML Config

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

| Setting | Value | Reason |
|---|---|---|
| `ddl-auto` | `none` | Prevent auto schema changes in production |
| `open-in-view` | `false` | Disable OSIV to minimize DB connection holding |
| `default_batch_fetch_size` | `100` | Batch IN clause for collection loading (mitigates N+1) |
| `batch_size` | `50` | Batch INSERT/UPDATE for performance |

OSIV (`open-in-view: true`) keeps persistence context until HTTP request ends, unnecessarily holding DB connections. MUST be `false`.
