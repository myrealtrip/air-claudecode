# 계층 아키텍처

## 4계층 구조

```
Presentation (Controller)
  → Application (UseCase / Application Service)
    → Domain (Model / Policy / Service / Event)
      ← Infrastructure (Persistence / Client / Event Listener)
```

상위 계층만 하위 계층에 의존한다. 인프라 계층은 도메인 계층에 의존한다. 역방향 의존은 금지한다.

---

## 계층 1: 표현 계층 (HTTP 진입점)

### Controller

| 항목 | 규칙 |
|------|------|
| 위치 | `presentation/external/{Feature}ExternalController.kt` 또는 `presentation/internal/admin/{Feature}AdminController.kt` |
| 의존성 주입 | **UseCase만** (Service/Repository/Infrastructure 금지) |
| 반환 타입 | `ResponseEntity<ApiResource<T>>` |
| 책임 | Request를 Command로 변환하고, UseCase를 호출하고, Result를 Response로 감싼다 |

```kotlin
@RestController
@RequestMapping("/api/v1/holidays")
class HolidayExternalController(
    private val getHolidayUseCase: GetHolidayUseCase,
    private val createHolidayUseCase: CreateHolidayUseCase,
) {
    @GetMapping("/{id}")
    fun getById(@PathVariable id: Long): ResponseEntity<ApiResource<HolidayResponse>> =
        ResponseEntity.ok(ApiResource.success(HolidayResponse.from(getHolidayUseCase(id))))

    @PostMapping
    fun create(@Valid @RequestBody request: CreateHolidayRequest): ResponseEntity<ApiResource<HolidayResponse>> =
        ResponseEntity.ok(ApiResource.success(HolidayResponse.from(createHolidayUseCase(request.toCommand()))))
}
```

**DTO 위치:**

| DTO 유형 | 위치 | 예시 |
|----------|------|------|
| 표현 계층 요청 | `presentation/external/request/` | `CreateHolidayRequest` |
| 표현 계층 응답 | `presentation/external/response/` | `HolidayResponse` |
| 응용 계층 커맨드 | `application/dto/command/` | `CreateHolidayCommand` |
| 응용 계층 결과 | `application/dto/result/` | `HolidayResult` |

---

## 계층 2: 응용 계층 (오케스트레이션)

**패키지**: `{projectGroup}.{appname}.application`

도메인 로직을 UseCase 클래스로 오케스트레이션한다. UseCase가 트랜잭션 경계를 소유한다. Application Service는 리포지토리 접근을 위임받는다.

### UseCase

| 항목 | 규칙 |
|------|------|
| 어노테이션 | `@Service`, `@Transactional(readOnly = true)` 또는 `@Transactional` |
| 인터페이스 | **없음** — 구상 클래스만 사용 |
| 호출 방식 | `operator fun invoke()`를 주 진입점으로 사용 |
| 주입 대상 | Application Service, Domain Policy, Domain Service, EventPublisher |

```kotlin
@Service
@Transactional(readOnly = true)
class GetHolidayUseCase(private val holidayService: HolidayService) {
    operator fun invoke(id: Long): HolidayResult =
        holidayService.findById(id)
}

@Service
@Transactional
class CreateHolidayUseCase(
    private val holidayService: HolidayService,
    private val holidayLimitPolicy: HolidayLimitPolicy,
    private val applicationEventPublisher: ApplicationEventPublisher,
) {
    operator fun invoke(command: CreateHolidayCommand): HolidayResult {
        holidayLimitPolicy.validate(command.holidayDate)
        val result = holidayService.create(command)
        applicationEventPublisher.publishEvent(HolidayCreatedEvent(result.id))
        return result
    }
}
```

### Application Service

| 항목 | 규칙 |
|------|------|
| 어노테이션 | `@Service` |
| 트랜잭션 | `@Transactional` **금지** (UseCase에서 전파) |
| 의존성 주입 | Repository, Mapper |
| 반환 타입 | `{Feature}Result` |
| 책임 | 리포지토리 접근 위임, Mapper를 통한 Domain ↔ JPA Entity 변환 |

```kotlin
@Service
class HolidayService(
    private val holidayJpaRepository: HolidayJpaRepository,
    private val holidayQueryRepository: HolidayQueryRepository,
    private val holidayMapper: HolidayMapper,
) {
    fun findById(id: Long): HolidayResult =
        holidayJpaRepository.findById(id)
            .map { holidayMapper.toDomain(it) }
            .map { HolidayResult.from(it) }
            .orElseThrow { HolidayNotFoundException(id) }

    fun create(command: CreateHolidayCommand): HolidayResult {
        val domain = Holiday.create(command.holidayDate, command.name)
        val entity = holidayMapper.toEntity(domain)
        val saved = holidayJpaRepository.save(entity)
        return HolidayResult.from(holidayMapper.toDomain(saved))
    }

    fun findPageByYear(year: Int, pageable: Pageable): Page<HolidayResult> =
        holidayQueryRepository.fetchPageByYear(year, pageable)
}
```

---

## 계층 3: 도메인 계층 (비즈니스 로직)

**패키지**: `{projectGroup}.{appname}.domain`

순수 Kotlin으로 작성한다. Spring, JPA, 외부 프레임워크 의존성을 사용하지 않는다.

### Domain Model

| 항목 | 규칙 |
|------|------|
| 위치 | `domain/model/{feature}/` |
| 프레임워크 | **없음** — 순수 Kotlin |
| 상태 변경 | 비즈니스 메서드로만 변경 |
| 팩토리 | `companion object { fun create(...) }` |

```kotlin
class Holiday private constructor(
    val id: Long? = null,
    val holidayDate: LocalDate,
    val name: String,
) {
    fun update(holidayDate: LocalDate, name: String): Holiday =
        Holiday(id = this.id, holidayDate = holidayDate, name = name)

    companion object {
        fun create(holidayDate: LocalDate, name: String): Holiday =
            Holiday(holidayDate = holidayDate, name = name)
    }
}

data class Money(val amount: BigDecimal, val currency: Currency) {
    operator fun plus(other: Money): Money {
        require(currency == other.currency) { "Currency mismatch" }
        return Money(amount + other.amount, currency)
    }
}
```

### Domain Policy

| 항목 | 규칙 |
|------|------|
| 위치 | `domain/policy/` |
| 어노테이션 | `@Component` |
| 책임 | 허용/거부 검증 규칙 |
| 위반 시 | 도메인 예외 발생 |

```kotlin
@Component
class HolidayLimitPolicy {
    fun validate(holidayDate: LocalDate) {
        require(holidayDate.isAfter(LocalDate.now())) {
            throw HolidayInvalidStateException("Holiday date must be in the future")
        }
    }
}

@Component
class OrderLimitPolicy(private val orderService: OrderService) {
    fun validate(userId: Long) {
        val count = orderService.countActiveByUserId(userId)
        if (count >= MAX_ACTIVE_ORDERS) {
            throw OrderLimitExceededException(userId, count)
        }
    }

    companion object {
        private const val MAX_ACTIVE_ORDERS = 10
    }
}
```

### Domain Service

| 항목 | 규칙 |
|------|------|
| 위치 | `domain/service/` |
| 어노테이션 | `@Component` |
| 책임 | 값 계산, 다중 애그리게이트 조정 |
| 의존성 | Domain Model만 (Repository, Infrastructure 금지) |

```kotlin
@Component
class DiscountCalculator {
    fun calculate(order: Order, membership: Membership): Money {
        val baseDiscount = when (membership.grade) {
            Grade.GOLD -> order.totalAmount * 0.1
            Grade.SILVER -> order.totalAmount * 0.05
            else -> Money.ZERO
        }
        return baseDiscount
    }
}
```

### 도메인 이벤트

| 항목 | 규칙 |
|------|------|
| 위치 | `domain/event/` |
| 구조 | 이벤트별 독립 `data class` (sealed class 아님) |
| 데이터 | ID와 최소한의 컨텍스트만 포함 — 엔티티나 DTO를 넣지 않는다 |

```kotlin
data class HolidayCreatedEvent(val holidayId: Long)
data class OrderCreatedEvent(val orderId: Long)
data class OrderCancelledEvent(val orderId: Long, val reason: String)
```

---

## 계층 4: 인프라 계층 (외부 통합)

**패키지**: `{projectGroup}.{appname}.infrastructure`

영속성, 외부 API 클라이언트, 이벤트 리스너를 구현한다. 도메인 계층에 의존한다.

### JPA Entity

| 항목 | 규칙 |
|------|------|
| 위치 | `infrastructure/persistence/entity/` |
| 네이밍 | `{Feature}JpaEntity` |
| 프레임워크 | JPA 어노테이션, `BaseTimeEntity` |
| 관계 | Domain Model과 완전히 분리 |

```kotlin
@Entity
@Table(name = "holidays")
class HolidayJpaEntity(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    @Column(nullable = false) var holidayDate: LocalDate,
    @Column(nullable = false, length = 100) var name: String,
) : BaseTimeEntity()
```

### Mapper

| 항목 | 규칙 |
|------|------|
| 위치 | `infrastructure/persistence/mapper/` |
| 어노테이션 | `@Component` |
| 메서드 | `toDomain(entity): DomainModel`, `toEntity(domain): JpaEntity` |

```kotlin
@Component
class HolidayMapper {
    fun toDomain(entity: HolidayJpaEntity): Holiday =
        Holiday(id = entity.id, holidayDate = entity.holidayDate, name = entity.name)

    fun toEntity(domain: Holiday): HolidayJpaEntity =
        HolidayJpaEntity(
            id = domain.id,
            holidayDate = domain.holidayDate,
            name = domain.name,
        )
}
```

### JPA Repository

```kotlin
@Repository
interface HolidayJpaRepository : JpaRepository<HolidayJpaEntity, Long> {
    @Query("select h from HolidayJpaEntity h where year(h.holidayDate) = :year order by h.holidayDate")
    fun findByYear(year: Int): List<HolidayJpaEntity>
}
```

### QueryRepository — 동적 조건, 페이징, 복잡한 조인에 사용한다. **메서드는 `fetch` 접두사를 사용한다.**

```kotlin
@Repository
class HolidayQueryRepository : QuerydslRepositorySupport(HolidayJpaEntity::class.java) {
    fun fetchPageByYear(year: Int, pageable: Pageable): Page<HolidayResult> =
        applyPagination(
            pageable,
            contentQuery = { it.selectFrom(holidayJpaEntity).where(holidayJpaEntity.holidayDate.year().eq(year)).orderBy(holidayJpaEntity.holidayDate.asc()) },
            countQuery = { it.select(holidayJpaEntity.count()).from(holidayJpaEntity).where(holidayJpaEntity.holidayDate.year().eq(year)) },
        ).map { HolidayResult.from(it) }
}
```

### 이벤트 리스너

```kotlin
@Component
class HolidayEventListener(private val slackClient: SlackClient) {
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    fun onHolidayCreated(event: HolidayCreatedEvent) {
        try {
            slackClient.notify("Holiday created: ${event.holidayId}")
        } catch (e: Exception) {
            logger.error(e) { "Failed to handle HolidayCreatedEvent" }
        }
    }
}
```

---

## Domain Model과 인프라 Entity

### 분리 원칙

Domain Model과 JPA Entity는 **완전히 분리된 클래스**다. Domain Model은 프레임워크 어노테이션이 없는 순수 Kotlin 클래스다. JPA Entity는 JPA/Hibernate 어노테이션을 가진 인프라 관심사다.

| 관점 | Domain Model | JPA Entity |
|------|-------------|-----------|
| 패키지 | `domain/model/{feature}/` | `infrastructure/persistence/entity/` |
| 어노테이션 | 없음 (순수 Kotlin) | `@Entity`, `@Table`, `@Column` |
| 목적 | 비즈니스 로직, 불변식 | ORM 매핑, 영속성 |
| 네이밍 | `{Feature}` (예: `Holiday`) | `{Feature}JpaEntity` (예: `HolidayJpaEntity`) |
| 가변성 | 불변 또는 비즈니스 메서드로 제어 | JPA 더티 체킹을 위해 가변 |

### Mapper 패턴

Domain Model과 JPA Entity 간 모든 변환은 `infrastructure/persistence/mapper/`의 `{Feature}Mapper`를 통해 수행한다.

```kotlin
@Component
class OrderMapper {
    fun toDomain(entity: OrderJpaEntity): Order =
        Order(
            id = entity.id,
            userId = entity.userId,
            status = entity.status,
            totalAmount = Money(entity.totalAmount, entity.currency),
        )

    fun toEntity(domain: Order): OrderJpaEntity =
        OrderJpaEntity(
            id = domain.id,
            userId = domain.userId,
            status = domain.status,
            totalAmount = domain.totalAmount.amount,
            currency = domain.totalAmount.currency,
        )
}
```

---

## DTO 흐름

```
[HTTP Request JSON] → CreateHolidayRequest (Presentation) → CreateHolidayCommand (Application)
  → Holiday Domain Model → HolidayResult (Application) → HolidayResponse (Presentation) → [HTTP Response JSON]
```

| 단계 | 출발 | 도착 | 위치 |
|------|------|------|------|
| HTTP 수신 | JSON body | `{Feature}Request` (표현 계층) | Spring 역직렬화 |
| 표현 → 응용 | `{Feature}Request` | `{Feature}Command` (응용 계층) | Controller (`request.toCommand()`) |
| 응용 → 도메인 | `{Feature}Command` | `{Feature}` Domain Model | Application Service (`Model.create()`) |
| 도메인 → 응용 | `{Feature}` Domain Model | `{Feature}Result` (응용 계층) | Application Service (`Result.from(model)`) |
| 응용 → 표현 | `{Feature}Result` | `{Feature}Response` (표현 계층) | Controller (`Response.from(result)`) |
| HTTP 송신 | `{Feature}Response` | JSON body | `ApiResource.success()` |

---

## 의존성 방향 규칙

`Controller → UseCase → Application Service → Repository` — 각 계층은 **바로 아래 계층 또는 도메인 계층만** 주입한다.

| 계층 | 주입 대상 | 주입 금지 |
|------|-----------|-----------|
| Controller | UseCase만 | Service, Repository, Infrastructure |
| UseCase | Application Service, Domain Policy, Domain Service, EventPublisher | Repository, 다른 UseCase |
| Application Service | Repository, Mapper | 다른 Application Service |
| Domain Policy / Service | (다른 도메인 컴포넌트 허용) | Repository, Infrastructure |

| 계층 | 트랜잭션 | DataSource |
|------|----------|------------|
| Controller | 없음 | - |
| UseCase (읽기) | `@Transactional(readOnly = true)` | Slave (Reader) |
| UseCase (쓰기) | `@Transactional` | Master (Writer) |
| Application Service | 없음 (UseCase에서 전파) | - |

---

## 교차 도메인 오케스트레이션

### 방법 1: UseCase → 여러 Application Service (단일 트랜잭션)

```kotlin
@Service
@Transactional
class CreateBookingUseCase(
    private val bookingService: BookingService,
    private val paymentService: PaymentService,
    private val inventoryService: InventoryService,
) {
    operator fun invoke(command: CreateBookingCommand): BookingResult {
        val booking = bookingService.create(command)
        paymentService.reserve(booking.id, command.paymentId)
        inventoryService.decrease(command.scheduleId)
        return booking
    }
}
```

### 방법 2: UseCase → Event → Listener (최종 일관성)

```kotlin
@Service
@Transactional
class CreateOrderUseCase(
    private val orderService: OrderService,
    private val applicationEventPublisher: ApplicationEventPublisher,
) {
    operator fun invoke(command: CreateOrderCommand): OrderResult {
        val order = orderService.create(command)
        applicationEventPublisher.publishEvent(OrderCreatedEvent(order.id))
        return order
    }
}

@Component
class OrderCreatedEventListener(private val inventoryService: InventoryService) {
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    fun onOrderCreated(event: OrderCreatedEvent) {
        inventoryService.decreaseStock(event.orderId)
    }
}
```

| 방법 | 트랜잭션 | 사용 시점 | 위험 요소 |
|------|----------|-----------|-----------|
| UseCase → 여러 Service | 단일 공유 트랜잭션 | 원자성이 필요한 쓰기 작업 | 긴 락 유지 시간 |
| UseCase → Event → Listener | 최종 일관성 | 교차 도메인 부수 효과 | 멱등성 핸들러 필요 |

---

## 안티패턴

| # | 안티패턴 | 문제점 | 올바른 방법 |
|---|----------|--------|-------------|
| 1 | Controller에서 Service를 직접 호출 | UseCase 오케스트레이션 계층을 우회 | Controller → UseCase → Application Service |
| 2 | Controller에서 Repository를 직접 호출 | 모든 비즈니스 계층을 우회 | Controller → UseCase → Application Service → Repository |
| 3 | UseCase에서 Repository를 직접 호출 | Application Service를 우회하여 오케스트레이션과 데이터 접근이 혼합 | UseCase → Application Service → Repository |
| 4 | Application Service에서 Response DTO를 반환 | 표현 계층에 대한 상향 의존성 발생 | Application Service는 `{Feature}Result`만 반환 |
| 5 | JPA Entity를 API 응답으로 반환 | 내부 구조 노출, 계약 없음 | JpaEntity → Domain Model → Result → Response 변환 체인 |
| 6 | UseCase에 비즈니스 로직 작성 | 역할 혼동, UseCase는 오케스트레이션 전용 | 비즈니스 로직은 Domain Policy/Service에 작성 |
| 7 | Application Service에 `@Transactional` 선언 | 중복 트랜잭션 관리, 충돌 가능 | UseCase에서만 트랜잭션 관리 |
| 8 | Domain Model에 JPA 어노테이션 사용 | 도메인이 인프라 관심사에 오염 | Domain Model(순수 Kotlin)과 JPA Entity를 분리 |
| 9 | UseCase에서 다른 UseCase를 주입 | 계층 규칙 위반, 중첩 트랜잭션 위험 | 여러 도메인의 Application Service를 주입 |
| 10 | Controller에서 Service나 Repository를 주입 | UseCase 계층을 건너뜀 | Controller는 UseCase만 주입 |
| 11 | Domain Model에서 DTO 클래스를 참조 | 역방향 의존성 | `{Feature}Result.from(model)` 패턴 사용 |
| 12 | Application Service나 Domain에서 `.toKst()` 호출 | 표시 관심사가 비즈니스 계층에 유출 | KST 변환은 Response DTO에서만 수행 |
