---
description: QueryRepository 구조, Projection, 페이지네이션, 동적 조건
keywords: [QueryDSL, QueryRepository, projection, dynamic query, BooleanExpression]
---

# QueryDSL 가이드

QueryDSL은 타입 안전한 동적 쿼리를 작성하기 위해 사용합니다. 이 가이드는 프로젝트에서 QueryDSL을 사용하는 표준 방식을 설명합니다.

## 핵심 원칙

| 원칙 | 규칙 |
|---|---|
| `QuerydslRepositorySupport` 상속 | 모든 QueryDSL 레포지토리는 프로젝트의 `QuerydslRepositorySupport`를 상속합니다 |
| `QueryRepository` 접미사 | 예: `OrderQueryRepository` |
| `fetch` 접두사 | 모든 쿼리 메서드는 `fetch` 접두사를 사용합니다 |
| `@QueryProjection` | DTO 생성자에 선언합니다. `Projections.constructor`는 사용하지 않습니다 |
| 연관관계 금지 | 엔티티 연관관계 대신 QueryDSL JOIN을 사용합니다 |
| `Pageable` 파라미터 | 페이지네이션은 항상 `Pageable`을 파라미터로 받습니다 |
| `SearchCondition` | 여러 검색 파라미터는 `{Feature}SearchCondition`으로 묶습니다 |

## 레포지토리 구조

QueryDSL 레포지토리는 다음과 같은 구조로 작성합니다.

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

## 메서드 명명 규칙

쿼리 메서드 이름은 반환 유형에 따라 다음 접두사를 사용합니다.

| 유형 | 접두사 | 예시 |
|---|---|---|
| 단건 조회 | `fetchXxx` | `fetchById`, `fetchByOrderNumber` |
| 목록 조회 | `fetchAllXxx` | `fetchAllByUserId`, `fetchAllByStatus` |
| 페이지 조회 | `fetchPageXxx` | `fetchPageByStatus`, `fetchPageByCondition` |
| 카운트 | `fetchCountXxx` | `fetchCountByStatus` |
| 존재 여부 | `existsXxx` | `existsByOrderNumber` |

## DTO Projection

`@QueryProjection`을 DTO 생성자에 선언하면 Q-type이 생성됩니다. 이를 통해 컴파일 타임에 타입 안전성을 보장합니다.

```kotlin
data class OrderSummaryDto @QueryProjection constructor(
    val orderId: Long,
    val status: String,
    val totalAmount: Long,
)
```

JOIN과 함께 Projection을 사용하는 예시:

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

`Projections.constructor`는 컴파일 타임 타입 검증이 없으므로 사용하면 안 됩니다.

## 페이지네이션

`applyPagination`을 사용해 콘텐츠 쿼리와 카운트 쿼리를 분리합니다. 이렇게 하면 불필요한 카운트 쿼리 실행을 최적화할 수 있습니다.

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

검색 파라미터가 여러 개인 경우, `{Feature}SearchCondition` data class로 묶어서 전달합니다. 파라미터를 개별적으로 나열하면 메서드 시그니처가 복잡해집니다.

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

날짜 범위 조회는 공통 모듈의 `SearchDates`를 사용합니다.

| 메서드 | 설명 |
|---|---|
| `of(startDate, endDate)` | 명시적 시작~종료 날짜 |
| `today()` | 오늘 |
| `yesterday()` | 어제 |
| `lastDays(n)` | 최근 n일 |
| `lastWeeks(n)` | 최근 n주 |
| `lastMonths(n)` | 최근 n개월 |
| `thisWeek()` | 이번 주 |
| `lastWeek()` | 지난 주 |
| `thisMonth()` | 이번 달 |
| `lastMonth()` | 지난 달 |

## 동적 조건 (QuerydslExpressions)

`QuerydslExpressions` 유틸리티를 사용하면 null-safe 동적 조건을 쉽게 작성할 수 있습니다. null이나 빈 값이 들어오면 해당 조건은 null을 반환하고, QueryDSL의 `where()`는 null 조건을 자동으로 무시합니다.

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

### 사용 가능한 표현식

| 메서드 | 설명 |
|---|---|
| `eq` | 동등 비교 |
| `gt` | 초과 (greater than) |
| `gte` | 이상 (greater than or equal) |
| `lt` | 미만 (less than) |
| `lte` | 이하 (less than or equal) |
| `contains` | LIKE %value% |
| `containsIgnoreCase` | 대소문자 무시 LIKE |
| `containsIgnoreCaseAndSpace` | 대소문자 및 공백 무시 LIKE |
| `startsWith` | 시작 문자열 일치 |
| `in` | IN 절 |
| `inIgnoreCase` | 대소문자 무시 IN |
| `dateBetween` | 날짜 범위 (LocalDate) |
| `dateTimeBetween` | 날짜·시간 범위 (LocalDateTime) |
| `isTrue` | true 조건 |
| `isFalse` | false 조건 |
