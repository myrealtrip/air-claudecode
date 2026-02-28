---
description: Annotation ordering at class/method/field/parameter level
keywords: [annotation order, "@Service", "@Transactional", "@Valid", "@Column", declaration order]
---

# Annotation Order

## Priority Principle

Framework annotations first, auxiliary annotations last.

| Priority | Category | Examples |
|---|---|---|
| 1st | Core framework | `@Entity`, `@Service`, `@RestController` |
| 2nd | Config/mapping | `@Table`, `@RequestMapping`, `@Transactional` |
| 3rd | Validation/constraints | `@NotNull`, `@Size`, `@Valid` |
| 4th | Custom | `@LogTrace`, `@ExcludeRequestLog` |

## Class Level

| Type | Order |
|---|---|
| Entity | `@Entity` → `@Table` |
| Controller | `@RestController` → `@RequestMapping` |
| UseCase/Service | `@Service` → `@Transactional` (if class-level) |
| Repository | `@Repository` |
| Configuration | `@Configuration` → `@Enable*` |

```kotlin
@Entity
@Table(name = "orders")
class OrderEntity(/* ... */) : BaseEntity()

@RestController
@RequestMapping("/api/v1/orders")
class OrderController(/* ... */)

@Service
@Transactional(readOnly = true)
class OrderService(/* ... */)

@Configuration
@EnableAsync
class AsyncConfig(/* ... */)
```

## Method Level

| Type | Order |
|---|---|
| Controller | `@GetMapping`/`@PostMapping` → `@PreAuthorize` |
| Service | `@Transactional` → `@CacheEvict` |
| Repository | `@Query` → `@Lock` |
| Event | `@Async` → `@TransactionalEventListener` |

```kotlin
// Controller
@PostMapping
@PreAuthorize("hasRole('ADMIN')")
fun createOrder(@Valid @RequestBody request: CreateOrderRequest): ApiResource<OrderResponse>

// Service
@Transactional
@CacheEvict(cacheNames = ["orders"], key = "#orderId")
fun cancel(orderId: Long)

// Repository
@Query("select o from OrderEntity o where o.id = :id")
@Lock(LockModeType.PESSIMISTIC_WRITE)
fun findByIdForUpdate(id: Long): OrderEntity?
```

## Field Level

| Type | Order |
|---|---|
| ID | `@Id` → `@GeneratedValue` |
| Column | `@Enumerated` → `@Column` |
| Audit | `@CreatedDate` → `@Column(updatable = false)` |
| Association (exception) | `@ManyToOne` → `@JoinColumn` |
| Validation (Request DTO) | `@field:NotBlank` → `@field:Pattern` → `@field:Size` |

```kotlin
// Entity
@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
val id: Long = 0L

@Enumerated(EnumType.STRING)
@Column(nullable = false)
var status: OrderStatus

@CreatedDate
@Column(updatable = false)
lateinit var createdAt: LocalDateTime

// Request DTO
@field:NotBlank(message = "항공편 번호는 필수입니다")
@field:Pattern(regexp = "^[A-Z]{2}\\d{1,4}$", message = "항공편 번호 형식이 올바르지 않습니다")
val flightNumber: String
```

## Parameter Level

`@Valid` before `@RequestBody`.

```kotlin
fun createOrder(@Valid @RequestBody request: CreateOrderRequest): ApiResource<OrderResponse>
fun getOrder(@PathVariable orderId: Long): ApiResource<OrderResponse>
fun getOrders(
    @RequestParam(required = false) status: String?,
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") size: Int,
): ApiResource<List<OrderResponse>>
```
