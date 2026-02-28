---
description: QueryRepository structure, Projection, pagination, dynamic conditions
keywords: [QueryDSL, QueryRepository, projection, dynamic query, BooleanExpression]
---

# QueryDSL Guide

## Core Principles

| Principle | Rule |
|---|---|
| Extend `QuerydslRepositorySupport` | All QueryDSL repositories extend project's `QuerydslRepositorySupport` |
| `QueryRepository` suffix | e.g., `OrderQueryRepository` |
| `fetch` prefix | All query methods use `fetch` prefix |
| `@QueryProjection` | Use on DTO constructors. Do NOT use `Projections.constructor`. |
| No associations | Use QueryDSL JOIN instead of entity associations |
| `Pageable` parameter | Pagination always receives `Pageable` |
| `SearchCondition` | Encapsulate multiple search params in `{Feature}SearchCondition` |

## Repository Structure

```kotlin
@Repository
class OrderQueryRepository : QuerydslRepositorySupport(OrderEntity::class.java) {

    private val order = QOrderEntity.orderEntity

    fun fetchById(id: Long): OrderEntity? =
        from(order)
            .where(order.id.eq(id))
            .fetchOne()

    fun fetchAllByUserId(userId: Long): List<OrderEntity> =
        from(order)
            .where(order.userId.eq(userId))
            .orderBy(order.id.desc())
            .fetch()
}
```

## Method Naming

| Type | Prefix | Example |
|---|---|---|
| Single | `fetchXxx` | `fetchById`, `fetchByOrderNumber` |
| List | `fetchAllXxx` | `fetchAllByUserId`, `fetchAllByStatus` |
| Page | `fetchPageXxx` | `fetchPageByStatus`, `fetchPageByCondition` |
| Count | `fetchCountXxx` | `fetchCountByStatus` |
| Exists | `existsXxx` | `existsByOrderNumber` |

## DTO Projection

Use `@QueryProjection` on DTO constructor → generates Q-type for type-safe projection.

```kotlin
data class OrderSummaryDto @QueryProjection constructor(
    val orderId: Long,
    val status: String,
    val totalAmount: Long,
)
```

JOIN projection:

```kotlin
data class OrderWithUserDto @QueryProjection constructor(
    val orderId: Long,
    val userName: String,
    val totalAmount: Long,
)

fun fetchAllWithUser(): List<OrderWithUserDto> {
    val user = QUserEntity.userEntity
    return from(order)
        .join(user).on(user.id.eq(order.userId))
        .select(QOrderWithUserDto(order.id, user.name, order.totalAmount))
        .fetch()
}
```

Do NOT use `Projections.constructor` — no compile-time type verification.

## Pagination

Use `applyPagination` to separate content and count queries.

```kotlin
fun fetchPageByStatus(status: String, pageable: Pageable): Page<OrderEntity> {
    val contentQuery = { query: JPAQuery<OrderEntity> ->
        query.from(order)
            .where(order.status.eq(status))
            .orderBy(order.id.desc())
    }
    val countQuery = { query: JPAQuery<Long> ->
        query.from(order)
            .where(order.status.eq(status))
    }
    return applyPagination(pageable, contentQuery, countQuery)
}
```

## SearchCondition

Multiple search params → wrap in `{Feature}SearchCondition` data class.

```kotlin
// Bad
fun fetchAll(status: String?, userId: Long?, startDate: LocalDate?, endDate: LocalDate?)

// Good
fun fetchAllByCondition(condition: OrderSearchCondition): List<OrderEntity>
```

```kotlin
data class OrderSearchCondition(
    val status: String? = null,
    val userId: Long? = null,
    val searchDates: SearchDates? = null,
)
```

### SearchDates

Use common module's `SearchDates` for date range queries.

| Method | Description |
|---|---|
| `of(startDate, endDate)` | Explicit start~end |
| `today()` | Today |
| `yesterday()` | Yesterday |
| `lastDays(n)` | Last n days |
| `lastWeeks(n)` | Last n weeks |
| `lastMonths(n)` | Last n months |
| `thisWeek()` | This week |
| `lastWeek()` | Last week |
| `thisMonth()` | This month |
| `lastMonth()` | Last month |

## Dynamic Conditions (QuerydslExpressions)

`QuerydslExpressions` utility for null-safe dynamic conditions. All methods return null for null/empty values, and QueryDSL `where()` ignores null conditions.

```kotlin
fun fetchAllByCondition(condition: OrderSearchCondition): List<OrderEntity> =
    from(order)
        .where(
            QuerydslExpressions.eq(order.status, condition.status),
            QuerydslExpressions.eq(order.userId, condition.userId),
            QuerydslExpressions.dateBetween(order.orderDate, condition.searchDates),
        )
        .orderBy(order.id.desc())
        .fetch()
```

### Available Expressions

| Method | Description |
|---|---|
| `eq` | Equals |
| `gt` | Greater than |
| `gte` | Greater than or equal |
| `lt` | Less than |
| `lte` | Less than or equal |
| `contains` | LIKE %value% |
| `containsIgnoreCase` | Case-insensitive LIKE |
| `containsIgnoreCaseAndSpace` | Case + space insensitive LIKE |
| `startsWith` | Starts with |
| `in` | IN clause |
| `inIgnoreCase` | Case-insensitive IN |
| `dateBetween` | Date range (LocalDate) |
| `dateTimeBetween` | DateTime range (LocalDateTime) |
| `isTrue` | True condition |
| `isFalse` | False condition |
