---
description: 클래스/메서드/필드/파라미터 레벨의 어노테이션 순서
keywords: [annotation order, "@Service", "@Transactional", "@Valid", "@Column", declaration order]
---

# 어노테이션 순서

이 문서는 Kotlin/Spring 코드에서 어노테이션을 작성하는 순서를 정의합니다. 어노테이션 순서를 일관성 있게 유지하면 코드를 읽을 때 어떤 역할을 하는 클래스/메서드인지 빠르게 파악할 수 있습니다.


## 기본 원칙

**핵심 프레임워크 어노테이션을 먼저, 보조 어노테이션을 나중에** 작성합니다.

| 우선순위 | 분류 | 예시 |
|---|---|---|
| 1순위 | 핵심 프레임워크 | `@Entity`, `@Service`, `@RestController` |
| 2순위 | 설정/매핑 | `@Table`, `@RequestMapping`, `@Transactional` |
| 3순위 | 검증/제약 | `@NotNull`, `@Size`, `@Valid` |
| 4순위 | 커스텀 | `@LogTrace`, `@ExcludeRequestLog` |


## 클래스 레벨

클래스에 붙이는 어노테이션은 다음 순서를 따릅니다.

| 클래스 유형 | 순서 |
|---|---|
| Entity | `@Entity` → `@Table` |
| Controller | `@RestController` → `@RequestMapping` |
| UseCase/Service | `@Service` → `@Transactional` (클래스 레벨 적용 시) |
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


## 메서드 레벨

메서드에 붙이는 어노테이션도 유형별로 정해진 순서가 있습니다.

| 메서드 유형 | 순서 |
|---|---|
| Controller | `@GetMapping`/`@PostMapping` → `@PreAuthorize` |
| Service | `@Transactional` → `@CacheEvict` |
| Repository | `@Query` → `@Lock` |
| Event 리스너 | `@Async` → `@TransactionalEventListener` |

```kotlin
// Controller 메서드
@PostMapping
@PreAuthorize("hasRole('ADMIN')")
fun createOrder(@Valid @RequestBody request: CreateOrderRequest): ApiResource<OrderResponse>

// Service 메서드
@Transactional
@CacheEvict(cacheNames = ["orders"], key = "#orderId")
fun cancel(orderId: Long)

// Repository 메서드
@Query("select o from OrderEntity o where o.id = :id")
@Lock(LockModeType.PESSIMISTIC_WRITE)
fun findByIdForUpdate(id: Long): OrderEntity?
```


## 필드 레벨

엔티티 필드와 요청 DTO 필드에 붙이는 어노테이션 순서는 다음과 같습니다.

| 필드 유형 | 순서 |
|---|---|
| ID 필드 | `@Id` → `@GeneratedValue` |
| 일반 컬럼 | `@Enumerated` → `@Column` |
| 감사(Audit) 필드 | `@CreatedDate` → `@Column(updatable = false)` |
| 연관 관계 (예외) | `@ManyToOne` → `@JoinColumn` |
| 요청 DTO 검증 | `@field:NotBlank` → `@field:Pattern` → `@field:Size` |

```kotlin
// Entity 필드
@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
val id: Long = 0L

@Enumerated(EnumType.STRING)
@Column(nullable = false)
var status: OrderStatus

@CreatedDate
@Column(updatable = false)
lateinit var createdAt: LocalDateTime

// Request DTO 필드
@field:NotBlank(message = "항공편 번호는 필수입니다")
@field:Pattern(regexp = "^[A-Z]{2}\\d{1,4}$", message = "항공편 번호 형식이 올바르지 않습니다")
val flightNumber: String
```


## 파라미터 레벨

컨트롤러 메서드의 파라미터에 어노테이션을 붙일 때는 `@Valid`를 `@RequestBody` 앞에 작성합니다. 이 순서를 지키면 요청 본문 바인딩 전에 검증이 먼저 적용됩니다.

```kotlin
// @Valid를 @RequestBody 앞에 작성합니다
fun createOrder(@Valid @RequestBody request: CreateOrderRequest): ApiResource<OrderResponse>

// PathVariable과 RequestParam은 별도 검증 어노테이션 없이 사용합니다
fun getOrder(@PathVariable orderId: Long): ApiResource<OrderResponse>

fun getOrders(
    @RequestParam(required = false) status: String?,
    @RequestParam(defaultValue = "0") page: Int,
    @RequestParam(defaultValue = "20") size: Int,
): ApiResource<List<OrderResponse>>
```
