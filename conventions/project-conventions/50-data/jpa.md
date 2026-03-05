# JPA와 Hibernate

## 1. 핵심 원칙

| 원칙 | 규칙 |
|------|------|
| **기본 클래스** | 항상 `BaseEntity` (전체 감사) 또는 `BaseTimeEntity` (시간만)를 상속한다 |
| **Enum 매핑** | 항상 `@Enumerated(EnumType.STRING)` — ORDINAL 사용 금지 |
| **Fetch 타입** | 모든 연관관계에 `FetchType.LAZY` 사용 |
| **테이블명** | 항상 `@Table(name = "xxx")`를 명시적으로 지정한다 |
| **연관관계 없음** | 기본: FK를 단순 ID 값으로 저장하며 엔티티 연관관계를 매핑하지 않는다 |

---

## 2. BaseEntity와 BaseTimeEntity

| 클래스 | 사용 시점 | 필드 |
|--------|-----------|------|
| `BaseTimeEntity` | 시간만 감사 (사용자 추적 불필요) | `createdAt`, `modifiedAt` |
| `BaseEntity` | 전체 감사 (시간 + 사용자) | `createdAt`, `modifiedAt`, `createdBy`, `modifiedBy` |

```kotlin
@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class BaseTimeEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    lateinit var createdAt: LocalDateTime
        protected set

    @LastModifiedDate
    @Column(name = "modified_at", nullable = false)
    lateinit var modifiedAt: LocalDateTime
        protected set
}

@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class BaseEntity : BaseTimeEntity() {

    @CreatedBy
    @Column(name = "created_by", nullable = false, updatable = false, length = 50)
    lateinit var createdBy: String
        protected set

    @LastModifiedBy
    @Column(name = "modified_by", nullable = false, length = 50)
    lateinit var modifiedBy: String
        protected set
}
```

---

## 3. 연관관계 정책

| 규칙 | 설명 |
|------|------|
| **기본** | 엔티티 연관관계를 매핑하지 않는다 — FK를 단순 ID 값으로 저장한다 |
| **예외** | 단방향만 허용, 반드시 필요한 경우에만 |
| **금지** | 양방향 연관관계는 엄격히 금지한다 |
| **조회** | 관련 데이터 조인에 QueryDSL을 사용한다 |

### 올바른 예: 연관관계 없음 (FK를 ID로 저장)

```kotlin
@Entity
@Table(name = "orders")
class Order(
    val userId: Long,       // FK를 단순 Long으로 저장, @ManyToOne User 아님
    val totalAmount: Long,
) : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0
}
```

### 예외: 단방향만 (반드시 필요한 경우에만)

```kotlin
@Entity
@Table(name = "order_items")
class OrderItem(
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    val order: Order,

    val productId: Long,
    val quantity: Int,
) : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0
}
```

---

## 4. 엔티티 구조

### 표준 엔티티 패턴

```kotlin
@Entity
@Table(name = "users")
class User(
    val email: String,

    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    var status: UserStatus,
) : BaseEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0

    fun updateName(newName: String) {
        this.name = newName
    }

    companion object {
        fun create(email: String, name: String): User {
            return User(
                email = email,
                name = name,
                status = UserStatus.ACTIVE,
            )
        }
    }
}
```

### 엔티티 체크리스트

| 항목 | 요구사항 |
|------|----------|
| `@Entity` | 모든 엔티티 클래스에 필수 |
| `@Table(name = "...")` | 항상 테이블명을 명시적으로 지정 |
| 기본 클래스 상속 | `BaseEntity` 또는 `BaseTimeEntity`를 상속해야 함 |
| id에 `val` | 불변 필드(`id`)에 `val` 사용 |
| 가변 필드에 `var` | 변경되는 필드에 `var` 사용 |
| 도메인 Enum | `CommonCode` 인터페이스를 구현해야 함 |
| 상태 변경 메서드 | `update*()` 메서드로 변경 |
| 팩토리 메서드 | `create()` companion object 함수로 생성 |
| DTO 참조 금지 | 엔티티는 DTO 클래스를 참조하지 않는다 |

---

## 5. Enum 매핑

항상 `EnumType.STRING`을 사용한다 — `ORDINAL`은 Enum 값 순서를 변경하면 깨진다.

```kotlin
@Enumerated(EnumType.STRING)
@Column(name = "status", nullable = false, length = 30)
var status: OrderStatus = OrderStatus.PENDING
```

모든 도메인 Enum은 common 모듈의 `CommonCode` 인터페이스를 구현한다:

```kotlin
enum class OrderStatus(
    override val code: String,
    override val displayName: String,
) : CommonCode {
    PENDING("PENDING", "대기중"),
    CONFIRMED("CONFIRMED", "확정"),
    CANCELLED("CANCELLED", "취소"),
}
```

---

## 6. Fetch 전략

항상 `FetchType.LAZY`를 사용한다. JPA에서 `@ManyToOne`과 `@OneToOne`은 기본값이 `EAGER`이므로 반드시 명시적으로 변경한다:

```kotlin
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "order_id")
val order: Order
```

지연 로딩 문제(`LazyInitializationException`, N+1)는 트랜잭션 내에서 QueryDSL로 DTO를 조회하여 해결한다 — `EAGER`로 전환하지 않는다.

---

## 7. 잠금 전략

| 전략 | 어노테이션 | 사용 시점 |
|------|-----------|-----------|
| **낙관적** | `@Version` | 낮은 경합, 읽기 위주, 충돌 시 빠르게 실패 |
| **비관적** | `@Lock(LockModeType.PESSIMISTIC_WRITE)` | 높은 경합, 임계 영역, 동시 접근 차단 |

```kotlin
// 낙관적: 엔티티에 @Version 필드 추가
@Version
val version: Long = 0

// 비관적: 리포지토리 쿼리 메서드에 어노테이션
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select p from Product p where p.id = :id")
fun findByIdWithLock(@Param("id") id: Long): Product?
```

---

## 8. 엔티티 상태와 더티 체킹

`@Transactional` 메서드 내의 관리 상태 엔티티는 자동으로 추적된다 — 업데이트 시 명시적 `save()` 호출이 불필요하며, 엔티티를 변경하기만 하면 된다.

```kotlin
@Transactional
fun updateUserName(userId: Long, newName: String) {
    val user = userRepository.findById(userId)
        ?: throw UserNotFoundException(userId)

    user.updateName(newName)
    // userRepository.save(user) 불필요 — 더티 체킹이 처리
}
```

---

## 9. 설정

### 권장 YAML 설정

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: none              # 프로덕션에서 DDL 자동 생성 금지
    open-in-view: false           # OSIV 비활성화 (필수)
    properties:
      hibernate:
        default_batch_fetch_size: 500
        jdbc.batch_size: 500
        order_updates: true       # UPDATE 문 배치 처리
        order_inserts: true       # INSERT 문 배치 처리
```

### OSIV (Open Session in View)

> **필수**: `open-in-view: false`로 설정한다. OSIV는 전체 HTTP 요청 생명주기 동안 DB 커넥션을 열어두어 부하 시 커넥션 풀 고갈을 유발한다. 비활성화하면 `@Transactional` 스코프 종료 시 커넥션이 반환되며 서비스 계층에서 모든 데이터 조회를 명시적으로 수행해야 한다.
