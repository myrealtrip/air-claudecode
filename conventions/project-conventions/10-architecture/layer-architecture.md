# Layer Architecture

## 4-Layer Structure

```
Presentation (Controller)
  → Application (UseCase / Application Service)
    → Domain (Model / Policy / Service / Event)
      ← Infrastructure (Persistence / Client / Event Listener)
```

Upper layers depend on lower layers only. Infrastructure depends on Domain. Reverse dependencies prohibited.

---

## Layer 1: Presentation (HTTP Entry Point)

### Controller

| Item | Rule |
|------|------|
| Location | `presentation/external/{Feature}ExternalController.kt` or `presentation/internal/admin/{Feature}AdminController.kt` |
| Dependency Injection | **UseCase only** (no Service/Repository/Infrastructure) |
| Return Type | `ResponseEntity<ApiResource<T>>` |
| Responsibility | Converts Request to Command, calls UseCase, wraps Result into Response |

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

**DTO Locations:**

| DTO Type | Location | Example |
|----------|----------|---------|
| Presentation Request | `presentation/external/request/` | `CreateHolidayRequest` |
| Presentation Response | `presentation/external/response/` | `HolidayResponse` |
| Application Command | `application/dto/command/` | `CreateHolidayCommand` |
| Application Result | `application/dto/result/` | `HolidayResult` |

---

## Layer 2: Application (Orchestration)

**Package**: `{projectGroup}.{appname}.application`

Orchestrates domain logic through UseCase classes. UseCase owns the transaction boundary. Application Service delegates repository access.

### UseCase

| Item | Rule |
|------|------|
| Annotation | `@Service`, `@Transactional(readOnly = true)` or `@Transactional` |
| Interface | **None** — concrete class only |
| Invocation | `operator fun invoke()` as primary entry point |
| Injection | Application Service, Domain Policy, Domain Service, EventPublisher |

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

| Item | Rule |
|------|------|
| Annotation | `@Service` |
| Transaction | **No** `@Transactional` (propagated from UseCase) |
| Dependency Injection | Repository, Mapper |
| Return Type | `{Feature}Result` |
| Responsibility | Repository access delegation, Domain ↔ JPA Entity mapping via Mapper |

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

## Layer 3: Domain (Business Logic)

**Package**: `{projectGroup}.{appname}.domain`

Pure Kotlin. No Spring, no JPA, no external framework dependencies.

### Domain Model

| Item | Rule |
|------|------|
| Location | `domain/model/{feature}/` |
| Framework | **None** — pure Kotlin |
| Mutations | Via business methods only |
| Factory | `companion object { fun create(...) }` |

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

| Item | Rule |
|------|------|
| Location | `domain/policy/` |
| Annotation | `@Component` |
| Responsibility | Allow/deny validation rules |
| Violation | Throw domain exception |

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

| Item | Rule |
|------|------|
| Location | `domain/service/` |
| Annotation | `@Component` |
| Responsibility | Value computation, multi-aggregate coordination |
| Dependency | Domain Model only (no Repository, no Infrastructure) |

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

### Domain Event

| Item | Rule |
|------|------|
| Location | `domain/event/` |
| Structure | Independent `data class` per event (not sealed) |
| Data | IDs and minimal context only — never entities or DTOs |

```kotlin
data class HolidayCreatedEvent(val holidayId: Long)
data class OrderCreatedEvent(val orderId: Long)
data class OrderCancelledEvent(val orderId: Long, val reason: String)
```

---

## Layer 4: Infrastructure (External Integration)

**Package**: `{projectGroup}.{appname}.infrastructure`

Implements persistence, external API clients, and event listeners. Depends on Domain layer.

### JPA Entity

| Item | Rule |
|------|------|
| Location | `infrastructure/persistence/entity/` |
| Naming | `{Feature}JpaEntity` |
| Framework | JPA annotations, `BaseTimeEntity` |
| Relationship | Completely separate from Domain Model |

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

| Item | Rule |
|------|------|
| Location | `infrastructure/persistence/mapper/` |
| Annotation | `@Component` |
| Methods | `toDomain(entity): DomainModel`, `toEntity(domain): JpaEntity` |

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

### QueryRepository — dynamic conditions, pagination, complex joins. **Methods must use `fetch` prefix**.

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

### Event Listener

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

## Domain Model & Infrastructure Entity

### Separation Principle

Domain Model and JPA Entity are **completely separate classes**. Domain Model is a pure Kotlin class with no framework annotations. JPA Entity is an infrastructure concern annotated with JPA/Hibernate.

| Aspect | Domain Model | JPA Entity |
|--------|-------------|-----------|
| Package | `domain/model/{feature}/` | `infrastructure/persistence/entity/` |
| Annotations | None (pure Kotlin) | `@Entity`, `@Table`, `@Column` |
| Purpose | Business logic, invariants | ORM mapping, persistence |
| Naming | `{Feature}` (e.g. `Holiday`) | `{Feature}JpaEntity` (e.g. `HolidayJpaEntity`) |
| Mutability | Immutable or controlled via business methods | Mutable for JPA dirty checking |

### Mapper Pattern

All conversion between Domain Model and JPA Entity happens through `{Feature}Mapper` in `infrastructure/persistence/mapper/`.

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

## DTO Flow

```
[HTTP Request JSON] → CreateHolidayRequest (Presentation) → CreateHolidayCommand (Application)
  → Holiday Domain Model → HolidayResult (Application) → HolidayResponse (Presentation) → [HTTP Response JSON]
```

| Step | From | To | Where |
|------|------|----|-------|
| HTTP in | JSON body | `{Feature}Request` (Presentation) | Spring deserialization |
| Presentation → Application | `{Feature}Request` | `{Feature}Command` (Application) | Controller (`request.toCommand()`) |
| Application → Domain | `{Feature}Command` | `{Feature}` Domain Model | Application Service (`Model.create()`) |
| Domain → Application | `{Feature}` Domain Model | `{Feature}Result` (Application) | Application Service (`Result.from(model)`) |
| Application → Presentation | `{Feature}Result` | `{Feature}Response` (Presentation) | Controller (`Response.from(result)`) |
| HTTP out | `{Feature}Response` | JSON body | `ApiResource.success()` |

---

## Dependency Direction Rule

`Controller → UseCase → Application Service → Repository` — each layer injects **only the layer immediately below or the Domain layer**.

| Layer | Injects | Prohibited |
|-------|---------|------------|
| Controller | UseCase only | Service, Repository, Infrastructure |
| UseCase | Application Service, Domain Policy, Domain Service, EventPublisher | Repository, other UseCase |
| Application Service | Repository, Mapper | other Application Service |
| Domain Policy / Service | (other Domain components OK) | Repository, Infrastructure |

| Layer | Transaction | DataSource |
|-------|-------------|------------|
| Controller | None | - |
| UseCase (read) | `@Transactional(readOnly = true)` | Slave (Reader) |
| UseCase (write) | `@Transactional` | Master (Writer) |
| Application Service | None (propagated from UseCase) | - |

---

## Cross-Domain Orchestration

### Approach 1: UseCase → Multiple Application Services (Single Transaction)

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

### Approach 2: UseCase → Event → Listener (Eventual Consistency)

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

| Approach | Transaction | Use Case | Risk |
|----------|-------------|----------|------|
| UseCase → multiple Services | Single shared transaction | Write operations requiring atomicity | Longer lock hold time |
| UseCase → Event → Listener | Eventual consistency | Cross-domain side effects | Requires idempotent handlers |

---

## Anti-Patterns

| # | Anti-Pattern | Problem | Correct Method |
|---|--------------|---------|----------------|
| 1 | Controller calls Service directly | Bypasses UseCase orchestration layer | Controller → UseCase → Application Service |
| 2 | Controller calls Repository directly | Bypasses all business layers | Controller → UseCase → Application Service → Repository |
| 3 | UseCase calls Repository directly | Bypasses Application Service; mixes orchestration with data access | UseCase → Application Service → Repository |
| 4 | Application Service returns Response DTO | Creates upward dependency on Presentation | Application Service returns `{Feature}Result` only |
| 5 | Return JPA Entity as API response | Exposes internal structure; no contract | JpaEntity → Domain Model → Result → Response conversion chain |
| 6 | Business logic in UseCase | Role confusion; UseCase is orchestration only | Business logic belongs in Domain Policy/Service |
| 7 | `@Transactional` on Application Service | Duplicate transaction management; conflicts | Manage transactions only at UseCase level |
| 8 | Domain Model with JPA annotations | Domain polluted with infrastructure concerns | Separate Domain Model (pure Kotlin) and JPA Entity |
| 9 | UseCase injecting another UseCase | Breaks layer rule; nested transaction risk | Inject Application Services from multiple domains instead |
| 10 | Controller injecting Service or Repository | Skips UseCase layer | Controller injects UseCase only |
| 11 | Domain Model importing DTO classes | Reversed dependency | Use `{Feature}Result.from(model)` pattern |
| 12 | `.toKst()` in Application Service or Domain | Display concern leaks into business layer | KST conversion only in Response DTO |
