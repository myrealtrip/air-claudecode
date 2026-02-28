---
description: 테스트 형식, 단언문, 목킹, 테스트 유형, 품질 체크리스트
keywords: [test, JUnit5, AssertJ, Kotest, MockK, unit test, integration test, "@Nested"]
---

# 테스트 가이드

이 문서는 프로젝트에서 테스트를 작성하는 방법과 표준을 설명합니다. 좋은 테스트는 실제 버그를 잡고, 코드 변경 시 안전망 역할을 합니다. 테스트를 위해 프로덕션 코드를 수정하는 것은 올바르지 않으며, 테스트 자체를 올바르게 작성해야 합니다.

## 핵심 원칙

| 원칙 | 규칙 |
|---|---|
| 프로덕션 코드 수정 금지 | 테스트를 통과시키기 위해 프로덕션 코드를 수정하면 안 됩니다. 테스트를 수정해야 합니다 |
| 테스트 실행 필수 | 테스트 작성 후 반드시 `./gradlew test`를 실행해야 합니다 |
| 실제 버그에 집중 | "이 테스트가 실제 버그를 잡을 수 있는가?"라고 스스로 물어보아야 합니다 |
| 비즈니스 로직 우선 | 비즈니스 로직, 엣지 케이스, 경계 조건, 에러 경로에 집중합니다 |
| 불필요한 테스트 금지 | 단순 getter/setter나 프레임워크 동작을 테스트하면 안 됩니다 |

## 테스트 형식

모든 테스트는 given-when-then 구조를 따릅니다. 각 섹션 사이에 빈 줄을 추가하여 가독성을 높입니다.

```kotlin
@Test
fun `should return user when valid id is provided`(): Unit {
    // given
    val userId = 1L
    val expectedUser = User(id = userId, name = "John")

    // when
    val result = userService.findById(userId)

    // then
    assertThat(result).isNotNull
    assertThat(result.name).isEqualTo("John")
}
```

| 요소 | 규칙 | 예시 |
|---|---|---|
| 메서드 이름 | 백틱 사용, 동작 설명 | `` `should calculate total correctly` `` |
| 반환 타입 | `: Unit` 명시 | `fun test(): Unit` |
| 구조 | given-when-then 주석 | 섹션 사이 빈 줄 |

## 테스트 메서드 네이밍

테스트 메서드 이름은 어떤 조건에서 어떤 결과가 기대되는지를 명확히 설명해야 합니다.

| 패턴 | 예시 |
|---|---|
| 동작 기반 | `` `should [기대 동작] when [조건]` `` |
| 메서드 기반 | `` `[메서드] - [시나리오] - [기대 결과]` `` |

## 테스트 구조화 (@Nested)

관련된 테스트를 `@Nested`로 그룹화하면 테스트 보고서가 읽기 쉬워지고, 관련 시나리오를 한 곳에서 파악할 수 있습니다.

```kotlin
@Nested
@DisplayName("UserService.create")
inner class CreateTests {

    @Test
    fun `should create user with valid input`(): Unit { }

    @Test
    fun `should throw exception when email is duplicate`(): Unit { }

    @Nested
    @DisplayName("when user is admin")
    inner class WhenAdmin {
        @Test
        fun `should assign admin role`(): Unit { }
    }
}
```

## 파라미터화 테스트

동일한 로직을 여러 입력값으로 검증할 때는 파라미터화 테스트를 활용합니다. 코드 중복 없이 다양한 케이스를 효율적으로 테스트할 수 있습니다.

### JUnit5 방식

```kotlin
@ParameterizedTest
@CsvSource(
    "user@example.com, true",
    "invalid, false",
    "'', false",
)
fun `should validate email format`(email: String, expected: Boolean): Unit {
    // given
    val validator = EmailValidator()

    // when
    val result = validator.isValid(email)

    // then
    assertThat(result).isEqualTo(expected)
}
```

### Kotest 데이터 주도 방식

```kotlin
context("email validation") {
    withData(
        "user@example.com" to true,
        "invalid" to false,
    ) { (email, expected) ->
        EmailValidator().isValid(email) shouldBe expected
    }
}
```

## 단언문 라이브러리

### AssertJ (기본)

AssertJ는 풍부한 단언문과 명확한 에러 메시지를 제공합니다. 기본적으로 AssertJ를 사용합니다.

```kotlin
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy

// 기본
assertThat(actual).isEqualTo(expected)
assertThat(result).isNotNull
assertThat(condition).isTrue
assertThat(value).isBetween(1, 100)

// 문자열
assertThat(text).contains("substring")
assertThat(text).startsWith("prefix")
assertThat(text).matches("regex.*pattern")

// 컬렉션
assertThat(list).hasSize(3)
assertThat(list).containsExactly(a, b, c)
assertThat(list).containsExactlyInAnyOrder(c, a, b)
assertThat(users).extracting("name").containsExactly("Alice", "Bob")
assertThat(users).filteredOn { it.isActive }.hasSize(2)

// 예외
assertThatThrownBy { service.process(invalidInput) }
    .isInstanceOf(IllegalArgumentException::class.java)
    .hasMessage("Input cannot be null")

assertThatCode { service.process(validInput) }
    .doesNotThrowAnyException()

// 객체 (재귀 비교, 특정 필드 무시)
assertThat(actual)
    .usingRecursiveComparison()
    .ignoringFields("id", "createdAt")
    .isEqualTo(expected)

// Soft Assertions (모든 실패를 한 번에 보고)
assertSoftly { softly ->
    softly.assertThat(user.id).isNotNull
    softly.assertThat(user.name).isEqualTo("John")
    softly.assertThat(user.email).isEqualTo("john@example.com")
}
```

### Kotest (단순한 경우)

단언문이 단순하고 간결함이 중요한 경우에는 Kotest 단언문을 사용할 수 있습니다.

```kotlin
result shouldBe expected
list shouldHaveSize 3
list shouldContainExactly listOf(a, b, c)
text shouldStartWith "prefix"
result.shouldNotBeNull()
result.shouldBeInstanceOf<User>()

shouldThrow<IllegalArgumentException> {
    service.process(invalidInput)
}.message shouldBe "Input cannot be null"
```

## 목킹

### MockK (기본)

Kotlin 친화적인 MockK를 기본으로 사용합니다.

```kotlin
import io.mockk.*

val emailService = mockk<EmailService>(relaxed = true)
val userRepository = mockk<UserRepository> {
    every { save(any()) } returns User(id = 1L, name = "John")
}

verify { emailService.sendWelcomeEmail(any()) }
```

### Mockito-Kotlin (대안)

팀 내에서 Mockito에 익숙한 경우 Mockito-Kotlin도 사용할 수 있습니다.

```kotlin
import org.mockito.kotlin.*

val emailService = mock<EmailService>()
val userRepository = mock<UserRepository> {
    on { save(any()) } doReturn User(id = 1L, name = "John")
}

verify(emailService).sendWelcomeEmail(any())
```

## 테스트 유형

### 단위 테스트 (Unit Test)

비즈니스 로직을 격리하여 테스트합니다. 외부 의존성은 모두 목(Mock)으로 대체합니다.

```kotlin
class CreateOrderUseCaseTest {
    private val orderRepository = mockk<OrderRepository>()
    private val useCase = CreateOrderUseCase(orderRepository)

    @Test
    fun `should create order with valid command`(): Unit {
        // given
        val command = CreateOrderCommand(userId = 1L, flightNumber = "KE123")
        every { orderRepository.save(any()) } returns OrderEntity(id = 1L, userId = 1L, status = "PENDING", totalAmount = 100_000L)

        // when
        val result = useCase.execute(command)

        // then
        assertThat(result.orderId).isEqualTo(1L)
        assertThat(result.status).isEqualTo("PENDING")
        verify(exactly = 1) { orderRepository.save(any()) }
    }
}
```

### 통합 테스트 (Integration Test)

전체 애플리케이션 컨텍스트를 로드하여 컴포넌트 간의 연동을 검증합니다. `@SpringBootTest`와 `@Transactional`을 함께 사용하면 테스트 후 데이터가 자동으로 롤백됩니다.

```kotlin
@SpringBootTest
@Transactional
class OrderIntegrationTest @Autowired constructor(
    private val createOrderUseCase: CreateOrderUseCase,
    private val orderRepository: OrderRepository,
) {
    @Test
    fun `should persist order through full flow`(): Unit {
        // given
        val command = CreateOrderCommand(userId = 1L, flightNumber = "KE123")

        // when
        val result = createOrderUseCase.execute(command)

        // then
        val saved = orderRepository.findById(result.orderId)
        assertThat(saved).isNotNull
        assertThat(saved!!.status).isEqualTo("PENDING")
    }
}
```

### 리포지토리 테스트 (Repository Test)

JPA 쿼리와 데이터 접근 로직을 검증합니다. `@DataJpaTest`를 사용하면 JPA 관련 컴포넌트만 로드하여 빠르게 실행됩니다.

```kotlin
@DataJpaTest
class OrderQueryRepositoryTest @Autowired constructor(
    private val orderQueryRepository: OrderQueryRepository,
    private val entityManager: EntityManager,
) {
    @Test
    fun `should fetch orders by condition`(): Unit {
        // given
        entityManager.persist(OrderEntity(userId = 1L, status = "PENDING", totalAmount = 100_000L))
        entityManager.persist(OrderEntity(userId = 1L, status = "COMPLETED", totalAmount = 200_000L))
        entityManager.flush()

        val condition = OrderSearchCondition(status = "PENDING")

        // when
        val result = orderQueryRepository.fetchAllByCondition(condition)

        // then
        assertThat(result).hasSize(1)
        assertThat(result[0].status).isEqualTo("PENDING")
    }
}
```

## 품질 체크리스트

테스트를 작성하기 전과 후에 다음 체크리스트를 확인합니다.

| 해야 할 것 | 하지 말아야 할 것 |
|---|---|
| 비즈니스 로직과 동작을 테스트합니다 | 단순 getter/setter를 테스트합니다 |
| 엣지 케이스와 경계 조건을 테스트합니다 | 커버리지를 위한 형식적인 테스트를 작성합니다 |
| 에러 처리 경로를 테스트합니다 | 프레임워크 동작을 테스트합니다 |
| 복잡한 상태 전환을 검증합니다 | 의존성을 과도하게 목킹합니다 |
| `@Nested`로 관련 시나리오를 그룹화합니다 | 테스트 보일러플레이트를 복사·붙여넣기합니다 |
