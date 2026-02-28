---
description: Test format, assertions, mocking, test types, quality checklist
keywords: [test, JUnit5, AssertJ, Kotest, MockK, unit test, integration test, "@Nested"]
---

# Testing Guide

## Core Principles

| Principle | Rule |
|---|---|
| No production changes for tests | MUST NOT modify production code to make tests pass — fix the test |
| Always run tests | Run `./gradlew test` after writing tests |
| Real bug focus | Ask: "Would this test catch a real bug?" — no boilerplate tests |
| Business logic first | Focus: business logic, edge cases, boundary conditions, error paths |
| No trivial tests | MUST NOT test trivial getters/setters or framework behavior |

## Test Format

All tests follow given-when-then with blank lines between sections.

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

| Element | Rule | Example |
|---|---|---|
| Method name | Backticks, descriptive | `` `should calculate total correctly` `` |
| Return type | Explicit `: Unit` | `fun test(): Unit` |
| Structure | given-when-then with comments | Blank lines between sections |

## Naming

| Pattern | Example |
|---|---|
| Behavior | `` `should [expected behavior] when [condition]` `` |
| Method | `` `[method] - [scenario] - [expected result]` `` |

## Test Organization (@Nested)

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

## Parameterized Tests

### JUnit5

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

### Kotest data-driven

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

## Assertion Libraries

### AssertJ (primary)

```kotlin
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy

// Basic
assertThat(actual).isEqualTo(expected)
assertThat(result).isNotNull
assertThat(condition).isTrue
assertThat(value).isBetween(1, 100)

// String
assertThat(text).contains("substring")
assertThat(text).startsWith("prefix")
assertThat(text).matches("regex.*pattern")

// Collection
assertThat(list).hasSize(3)
assertThat(list).containsExactly(a, b, c)
assertThat(list).containsExactlyInAnyOrder(c, a, b)
assertThat(users).extracting("name").containsExactly("Alice", "Bob")
assertThat(users).filteredOn { it.isActive }.hasSize(2)

// Exception
assertThatThrownBy { service.process(invalidInput) }
    .isInstanceOf(IllegalArgumentException::class.java)
    .hasMessage("Input cannot be null")

assertThatCode { service.process(validInput) }
    .doesNotThrowAnyException()

// Object (recursive comparison, ignoring fields)
assertThat(actual)
    .usingRecursiveComparison()
    .ignoringFields("id", "createdAt")
    .isEqualTo(expected)

// Soft Assertions (report all failures at once)
assertSoftly { softly ->
    softly.assertThat(user.id).isNotNull
    softly.assertThat(user.name).isEqualTo("John")
    softly.assertThat(user.email).isEqualTo("john@example.com")
}
```

### Kotest (when simpler)

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

## Mocking

### MockK (primary)

```kotlin
import io.mockk.*

val emailService = mockk<EmailService>(relaxed = true)
val userRepository = mockk<UserRepository> {
    every { save(any()) } returns User(id = 1L, name = "John")
}

verify { emailService.sendWelcomeEmail(any()) }
```

### Mockito-Kotlin (alternative)

```kotlin
import org.mockito.kotlin.*

val emailService = mock<EmailService>()
val userRepository = mock<UserRepository> {
    on { save(any()) } doReturn User(id = 1L, name = "John")
}

verify(emailService).sendWelcomeEmail(any())
```

## Test Types

### Unit Test

Isolate business logic. Mock external dependencies.

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

### Integration Test

`@SpringBootTest` with full application context.

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

### Repository Test

`@DataJpaTest` for JPA-isolated tests.

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

## Quality Checklist

| DO | DO NOT |
|---|---|
| Test business logic and behavior | Test trivial getters/setters |
| Test edge cases and boundaries | Write tests solely for coverage |
| Test error handling paths | Test framework behavior |
| Verify complex state transitions | Over-mock dependencies |
| Group related scenarios with @Nested | Copy-paste test boilerplate |
