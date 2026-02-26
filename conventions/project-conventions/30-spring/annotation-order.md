# 어노테이션 순서

## 우선순위 규칙

Spring/JPA 어노테이션을 먼저, Lombok을 마지막에 선언한다. 핵심 프레임워크를 설정보다 앞에 둔다.

| 우선순위 | 분류 | 예시 |
|----------|------|------|
| 1순위 | 핵심 프레임워크 | `@Entity`, `@Service`, `@RestController` |
| 2순위 | 설정 | `@Table`, `@RequestMapping`, `@Transactional` |
| 3순위 | 유효성 검증/제약 | `@NotNull`, `@Size`, `@Valid` |
| 4순위 | Lombok | `@Builder`, `@NoArgsConstructor`, `@Getter`, `@ToString` |

---

## 클래스 레벨 순서

- **Entity**: `@Entity` → `@Table` → `@Builder` → `@AllArgsConstructor` → `@NoArgsConstructor` → `@Getter`
- **Controller**: `@RestController` → `@RequestMapping` → `@RequiredArgsConstructor`
- **Service**: `@Service` → `@Transactional` → `@RequiredArgsConstructor`
- **Repository**: `@Repository` (`JpaRepository` 상속 시 생략 가능)
- **Configuration**: `@Configuration` → `@Enable*` → `@RequiredArgsConstructor`
- **Component**: `@Component` → `@RequiredArgsConstructor`
- **DTO**: `@Builder` → `@AllArgsConstructor` → `@Getter` → `@ToString`

### 종합 예시

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

// 이벤트 리스너
@Component
class OrderEventListener(private val slackClient: SlackClient) {
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun onOrderCreated(event: OrderCreatedEvent) { }
}

// 응답 DTO
@Builder
@AllArgsConstructor
@Getter
@ToString
data class OrderResponse(val id: Long, val status: String, val totalAmount: Long)

// 요청 DTO (유효성 검증이 Lombok보다 앞)
@Builder
@AllArgsConstructor
@Getter
data class CreateOrderRequest(
    @NotBlank val itemName: String,
    @Min(1) val quantity: Int,
)
```

---

## 필드 레벨 순서

- **ID**: `@Id` → `@GeneratedValue`
- **Column**: `@Column` → 유효성 검증 (`@NotBlank`, `@Size`)
- **Enum**: `@Enumerated(EnumType.STRING)` → `@Column`
- **관계**: `@ManyToOne` → `@JoinColumn`
- **감사**: `@CreatedDate` → `@Column(updatable = false)`
- **DI (Java)**: `@Autowired` 사용 금지 — 생성자 주입을 사용한다

---

## 메서드 레벨 순서

- **Controller**: `@GetMapping` / `@PostMapping` → `@PreAuthorize` → `@Cacheable`
- **Service**: `@Transactional` → `@CacheEvict`
- **Repository**: `@Query` → `@Lock` → `@EntityGraph`
- **Async/Event**: `@Async` → `@EventListener` 또는 `@TransactionalEventListener`

---

## 파라미터 레벨 순서

- `@Valid` → `@RequestBody`
- `@PathVariable` / `@RequestParam`은 서로 순서가 없다

```kotlin
fun createOrder(@Valid @RequestBody request: CreateOrderRequest): ResponseEntity<ApiResource<OrderResponse>>
fun getOrder(@PathVariable id: Long): ResponseEntity<ApiResource<OrderResponse>>
fun listOrders(
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") size: Int,
): ResponseEntity<ApiResource<List<OrderResponse>>>
```

---

## Lombok 순서

| 순서 | 어노테이션 | 용도 |
|------|-----------|------|
| 1순위 | `@Builder` | 객체 생성 |
| 2순위 | `@NoArgsConstructor` / `@AllArgsConstructor` / `@RequiredArgsConstructor` | 생성자 |
| 3순위 | `@Getter` / `@Setter` | 접근자 |
| 4순위 | `@ToString` | 문자열 표현 |
| 5순위 | `@EqualsAndHashCode` | 동등성 |

---

## 요약 규칙

| 규칙 | 상세 |
|------|------|
| 프레임워크가 Lombok보다 먼저 | Spring/JPA 어노테이션을 항상 Lombok보다 앞에 선언한다 |
| `@Builder` 사용 시 `@AllArgsConstructor` 필수 | Builder가 전체 인자 생성자를 필요로 한다 |
| 엔티티에 `@ToString` 금지 | 지연 로딩 연관관계에서 `LazyInitializationException` 위험 |
| 엔티티에 `@EqualsAndHashCode` 금지 | 지연 로딩 연관관계에서 `LazyInitializationException` 위험 |
| 필드에서 유효성 검증이 Lombok보다 먼저 | `@NotNull`, `@Size` 등이 `@Column`보다 앞에 온다 |
