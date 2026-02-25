# Annotation Order

## Priority Rule

Spring/JPA annotations first, Lombok last. Core framework before configuration.

| Priority | Category | Examples |
|----------|----------|----------|
| 1st | Core Framework | `@Entity`, `@Service`, `@RestController` |
| 2nd | Configuration | `@Table`, `@RequestMapping`, `@Transactional` |
| 3rd | Validation/Constraints | `@NotNull`, `@Size`, `@Valid` |
| 4th | Lombok | `@Builder`, `@NoArgsConstructor`, `@Getter`, `@ToString` |

---

## Class-Level Order

- **Entity**: `@Entity` → `@Table` → `@Builder` → `@AllArgsConstructor` → `@NoArgsConstructor` → `@Getter`
- **Controller**: `@RestController` → `@RequestMapping` → `@RequiredArgsConstructor`
- **Service**: `@Service` → `@Transactional` → `@RequiredArgsConstructor`
- **Repository**: `@Repository` (or omit if extending `JpaRepository`)
- **Configuration**: `@Configuration` → `@Enable*` → `@RequiredArgsConstructor`
- **Component**: `@Component` → `@RequiredArgsConstructor`
- **DTO**: `@Builder` → `@AllArgsConstructor` → `@Getter` → `@ToString`

### Comprehensive Example

```kotlin
// Entity
@Entity
@Table(name = "orders")
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
class Order(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: OrderStatus = OrderStatus.PENDING,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @CreatedDate
    @Column(updatable = false)
    val createdAt: LocalDateTime = LocalDateTime.now(),
) : BaseTimeEntity()

// Controller
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
class OrderExternalController(
    private val getOrderUseCase: GetOrderUseCase,
    private val createOrderUseCase: CreateOrderUseCase,
    private val cancelOrderUseCase: CancelOrderUseCase,
) {

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    @Cacheable(cacheNames = [CacheNames.DEFAULT], key = "#id")
    fun getOrder(@PathVariable id: Long): ResponseEntity<ApiResource<OrderResponse>> =
        ResponseEntity.ok(ApiResource.success(OrderResponse.from(getOrderUseCase(id))))

    @PostMapping
    fun createOrder(@Valid @RequestBody request: CreateOrderRequest): ResponseEntity<ApiResource<OrderResponse>> =
        ResponseEntity.ok(ApiResource.success(OrderResponse.from(createOrderUseCase(request.toCommand()))))

    @DeleteMapping("/{id}")
    fun cancelOrder(@PathVariable id: Long): ResponseEntity<Unit> {
        cancelOrderUseCase(id)
        return ResponseEntity.noContent().build()
    }
}

// Service
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
class OrderService(private val orderRepository: OrderRepository) {
    fun findById(id: Long): OrderResult =
        OrderResult.from(orderRepository.findById(id) ?: throw OrderNotFoundException(id))

    @Transactional
    @CacheEvict(cacheNames = [CacheNames.DEFAULT], key = "#id")
    fun cancelOrder(id: Long): OrderResult { }
}

// Repository
interface OrderRepository : JpaRepository<Order, Long> {
    @Query("select o from Order o where o.status = :status")
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = ["user"])
    fun findByStatusWithLock(status: OrderStatus): List<Order>
}

// Configuration
@Configuration
@EnableAsync
@RequiredArgsConstructor
class AsyncConfig(private val asyncProperties: AsyncProperties) {
    @Bean
    fun taskExecutor(): Executor = ThreadPoolTaskExecutor().apply {
        corePoolSize = asyncProperties.corePoolSize
        maxPoolSize = asyncProperties.maxPoolSize
    }
}

// UseCase
@Service
@Transactional(readOnly = true)
class GetOrderUseCase(private val orderService: OrderService) {
    operator fun invoke(id: Long): OrderResult =
        orderService.findById(id)
}

@Service
@Transactional
class CreateOrderUseCase(
    private val orderService: OrderService,
    private val orderLimitPolicy: OrderLimitPolicy,
) {
    operator fun invoke(command: CreateOrderCommand): OrderResult {
        orderLimitPolicy.validate(command.userId)
        return orderService.create(command)
    }
}

// Event listener
@Component
class OrderEventListener(private val slackClient: SlackClient) {
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun onOrderCreated(event: OrderCreatedEvent) { }
}

// Response DTO
@Builder
@AllArgsConstructor
@Getter
@ToString
data class OrderResponse(val id: Long, val status: String, val totalAmount: Long)

// Request DTO (validation before Lombok)
@Builder
@AllArgsConstructor
@Getter
data class CreateOrderRequest(
    @NotBlank val itemName: String,
    @Min(1) val quantity: Int,
)
```

---

## Field-Level Order

- **ID**: `@Id` → `@GeneratedValue`
- **Column**: `@Column` → validation (`@NotBlank`, `@Size`)
- **Enum**: `@Enumerated(EnumType.STRING)` → `@Column`
- **Relationship**: `@ManyToOne` → `@JoinColumn`
- **Audit**: `@CreatedDate` → `@Column(updatable = false)`
- **DI (Java)**: `@Autowired` is prohibited -- use constructor injection

---

## Method-Level Order

- **Controller**: `@GetMapping` / `@PostMapping` → `@PreAuthorize` → `@Cacheable`
- **Service**: `@Transactional` → `@CacheEvict`
- **Repository**: `@Query` → `@Lock` → `@EntityGraph`
- **Async/Event**: `@Async` → `@EventListener` or `@TransactionalEventListener`

---

## Parameter-Level Order

- `@Valid` → `@RequestBody`
- `@PathVariable` / `@RequestParam` need no ordering with each other

```kotlin
fun createOrder(@Valid @RequestBody request: CreateOrderRequest): ResponseEntity<ApiResource<OrderResponse>>
fun getOrder(@PathVariable id: Long): ResponseEntity<ApiResource<OrderResponse>>
fun listOrders(
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") size: Int,
): ResponseEntity<ApiResource<List<OrderResponse>>>
```

---

## Lombok Order

| Order | Annotation | Purpose |
|-------|-----------|---------|
| 1st | `@Builder` | Object creation |
| 2nd | `@NoArgsConstructor` / `@AllArgsConstructor` / `@RequiredArgsConstructor` | Constructors |
| 3rd | `@Getter` / `@Setter` | Accessors |
| 4th | `@ToString` | String representation |
| 5th | `@EqualsAndHashCode` | Equality |

---

## Summary Rules

| Rule | Detail |
|------|--------|
| Framework before Lombok | Spring/JPA annotations always precede Lombok |
| `@AllArgsConstructor` required with `@Builder` | Builder needs all-args constructor to function |
| No `@ToString` on entities | Risk of `LazyInitializationException` on lazy associations |
| No `@EqualsAndHashCode` on entities | Risk of `LazyInitializationException` on lazy associations |
| Validation before Lombok on fields | `@NotNull`, `@Size` etc. precede `@Column` |
