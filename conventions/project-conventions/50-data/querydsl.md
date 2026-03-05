# QueryDSL

## 핵심 원칙

| 지침 | 설명 |
|------|------|
| **QuerydslRepositorySupport 상속** | 모든 QueryDSL 리포지토리는 프로젝트의 support 클래스를 상속한다 |
| **`QueryRepository` 접미사** | 모든 QueryDSL 리포지토리 클래스는 `QueryRepository` 접미사를 사용한다 (예: `OrderQueryRepository`) |
| **`fetch` 접두사** | 모든 QueryDSL 조회 메서드는 `fetch` 접두사를 사용한다 |
| **`@QueryProjection`** | DTO 생성자에 `@QueryProjection`을 사용한다 — `Projections.constructor` 사용 금지 |
| **연관관계 없음** | 엔티티 연관관계 대신 QueryDSL JOIN을 사용한다 |
| **페이징에 `Pageable`** | 페이징 쿼리에 항상 `Pageable`을 파라미터로 받는다 |
| **복합 필터에 `SearchCondition`** | 여러 검색 파라미터를 전용 `{Feature}SearchCondition` 객체로 캡슐화한다 |

## 리포지토리 구조

### 표준 QueryDSL 리포지토리

```kotlin
@Repository
class OrderQueryRepository(
) : QuerydslRepositorySupport(Order::class.java) {

    private val order = QOrder.order
    private val user = QUser.user

    fun fetchById(id: Long): OrderDto? {
        return select(
            QOrderDto(
                order.id,
                order.totalAmount,
                order.status,
            )
        )
            .from(order)
            .where(order.id.eq(id))
            .fetchOne()
    }

    fun fetchAllByUserId(userId: Long): List<OrderDto> {
        return select(
            QOrderDto(
                order.id,
                order.totalAmount,
                order.status,
            )
        )
            .from(order)
            .where(order.userId.eq(userId))
            .orderBy(order.createdAt.desc())
            .fetch()
    }
}
```

### 네이밍 규칙

| 작업 | 접두사 | 예시 |
|------|--------|------|
| 단건 | `fetchXxx` | `fetchById(id)`, `fetchByEmail(email)` |
| 목록 | `fetchAllXxx` | `fetchAllByUserId(userId)` |
| 페이징 | `fetchPageXxx` | `fetchPageByStatus(status, pageable)` |
| 건수 | `fetchCountXxx` | `fetchCountByStatus(status)` |
| 존재 여부 | `existsXxx` | `existsByEmail(email)` |

```kotlin
// 나쁜 예: fetch 접두사 누락
fun findById(id: Long): OrderDto?
fun getOrdersByUser(userId: Long): List<OrderDto>

// 좋은 예: fetch 접두사 사용
fun fetchById(id: Long): OrderDto?
fun fetchAllByUser(userId: Long): List<OrderDto>
```

## @QueryProjection을 사용한 DTO 프로젝션

```kotlin
data class OrderDto @QueryProjection constructor(
    val id: Long,
    val totalAmount: BigDecimal,
    val status: OrderStatus,
)

data class OrderWithUserDto @QueryProjection constructor(
    val orderId: Long,
    val totalAmount: BigDecimal,
    val userName: String,
    val userEmail: String,
)
```

```kotlin
fun fetchWithUser(orderId: Long): OrderWithUserDto? {
    return select(
        QOrderWithUserDto(
            order.id,
            order.totalAmount,
            user.name,
            user.email,
        )
    )
        .from(order)
        .join(user).on(order.userId.eq(user.id))
        .where(order.id.eq(orderId))
        .fetchOne()
}
```

> **`Projections.constructor` 사용 금지**: 타입 안전하지 않으며 생성자가 변경되면 조용히 깨진다. 항상 `@QueryProjection`을 사용한다.

## 페이징

> **중요**: 페이징 쿼리에 항상 `Pageable`을 사용한다. 원시 `page`/`size` 파라미터를 직접 전달하지 않는다.

### applyPagination 사용

```kotlin
fun fetchPageByCondition(
    condition: OrderSearchCondition,
    pageable: Pageable,
): Page<OrderDto> {
    return applyPagination(
        pageable,
        contentQuery = { queryFactory ->
            queryFactory
                .select(
                    QOrderDto(
                        order.id,
                        order.totalAmount,
                        order.status,
                    )
                )
                .from(order)
                .where(
                    QuerydslExpressions.eq(order.status, condition.status),
                    QuerydslExpressions.dateTimeBetween(
                        order.createdAt, condition.startDate, condition.endDate,
                    ),
                )
                .orderBy(order.createdAt.desc())
        },
        countQuery = { queryFactory ->
            queryFactory
                .select(order.count())
                .from(order)
                .where(
                    QuerydslExpressions.eq(order.status, condition.status),
                    QuerydslExpressions.dateTimeBetween(
                        order.createdAt, condition.startDate, condition.endDate,
                    ),
                )
        },
    )
}
```

## SearchCondition

> **중요**: 복합 검색 파라미터를 전용 `{Feature}SearchCondition` data class로 캡슐화한다. 여러 필터 파라미터를 개별적으로 전달하지 않는다.

```kotlin
// 나쁜 예: 개별 파라미터 여러 개
fun fetchAllByCondition(name: String?, status: UserStatus?, startDate: LocalDate?, endDate: LocalDate?): List<UserDto>

// 좋은 예: SearchCondition 객체
data class UserSearchCondition(
    val name: String? = null,
    val status: UserStatus? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
)

fun fetchAllByCondition(condition: UserSearchCondition): List<UserDto>
```

### 날짜 범위 필드에 SearchDates 사용

> **팁**: 원시 `startDate`/`endDate` 필드 대신 common 모듈의 `SearchDates`를 사용한다. `SearchDates`는 유효하지 않거나 과도하게 넓은 날짜 범위에 대한 기본 보호 장치를 제공한다.

```kotlin
// 나쁜 예: 유효성 검증 없는 원시 날짜 필드
data class OrderSearchCondition(
    val status: OrderStatus? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
)

// 좋은 예: 기본 보호 장치가 있는 SearchDates 사용
data class OrderSearchCondition(
    val status: OrderStatus? = null,
    val searchDates: SearchDates = SearchDates.lastMonth(),
)
```

### SearchDates 팩토리 메서드

| 메서드 | 범위 | 설명 |
|--------|------|------|
| `SearchDates.of(start, end)` | 커스텀 | 자동 조정 기능이 있는 커스텀 날짜 범위 |
| `SearchDates.today()` | 오늘 | 당일 (오늘) |
| `SearchDates.yesterday()` | 어제 | 당일 (어제) |
| `SearchDates.lastDays(n)` | 최근 N일 | N일 전부터 오늘까지 |
| `SearchDates.lastWeeks(n)` | 최근 N주 | N주 전부터 오늘까지 |
| `SearchDates.lastMonths(n)` | 최근 N개월 | N개월 전부터 오늘까지 |
| `SearchDates.thisWeek()` | 이번 주 | 주 시작일부터 오늘까지 |
| `SearchDates.lastWeek()` | 지난 주 | 이전 전체 주 |
| `SearchDates.thisMonth()` | 이번 달 | 1일부터 오늘까지 |
| `SearchDates.lastMonth()` | 지난 달 | 이전 전체 월 |

## 동적 조건

`SearchCondition` 필드를 `QuerydslExpressions` 메서드에 전달하여 null 안전 동적 필터링을 수행한다.

```kotlin
fun fetchAllByCondition(condition: UserSearchCondition): List<UserDto> {
    return select(
        QUserDto(
            user.id,
            user.name,
            user.email,
        )
    )
        .from(user)
        .where(
            QuerydslExpressions.containsIgnoreCase(user.name, condition.name),
            QuerydslExpressions.eq(user.status, condition.status),
            QuerydslExpressions.dateBetween(user.createdAt, condition.startDate, condition.endDate),
        )
        .fetch()
}
```

### 사용 가능한 표현식

| 메서드 | 설명 |
|--------|------|
| `eq(path, value)` | 동등 비교 (String, Boolean, Enum, Number) |
| `gt(path, value)` | 초과 (Number) |
| `gte(path, value)` | 이상 (Number) |
| `lt(path, value)` | 미만 (Number) |
| `lte(path, value)` | 이하 (Number) |
| `contains(path, value)` | 문자열 포함 |
| `containsIgnoreCase(path, value)` | 대소문자 무시 포함 |
| `containsIgnoreCaseAndSpace(path, value)` | 대소문자와 공백 무시 |
| `startsWith(path, value)` | 문자열 시작 |
| `in(path, collection)` | 컬렉션 포함 (String, Enum) |
| `inIgnoreCase(path, collection)` | 대소문자 무시 포함 (String) |
| `dateBetween(path, start, end)` | 날짜 범위 (부분 지원 — 한쪽만 null 가능) |
| `dateTimeBetween(path, start, end)` | DateTime 범위 (부분 지원) |
| `isTrue(path)` | Boolean true 확인 |
| `isFalse(path)` | Boolean false 확인 |

> 모든 메서드는 값이 null이거나 비어 있으면 `null`을 반환한다. QueryDSL은 `where()` 절에서 `null` 조건자를 무시하므로 호출 측에서 별도의 null 체크가 불필요하다.
