# Test Libraries Reference

## AssertJ (primary)

```kotlin
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
```

### Basic

```kotlin
assertThat(actual).isEqualTo(expected)
assertThat(result).isNotNull
assertThat(condition).isTrue
assertThat(value).isBetween(1, 100)
```

### String

```kotlin
assertThat(text).contains("substring")
assertThat(text).startsWith("prefix")
assertThat(text).matches("regex.*pattern")
```

### Collection

```kotlin
assertThat(list).hasSize(3)
assertThat(list).containsExactly(a, b, c)
assertThat(list).containsExactlyInAnyOrder(c, a, b)
assertThat(users).extracting("name").containsExactly("Alice", "Bob")
assertThat(users).filteredOn { it.isActive }.hasSize(2)
```

### Exception

```kotlin
assertThatThrownBy { service.process(invalidInput) }
    .isInstanceOf(IllegalArgumentException::class.java)
    .hasMessage("Input cannot be null")

assertThatCode { service.process(validInput) }
    .doesNotThrowAnyException()
```

### Object (recursive comparison)

```kotlin
assertThat(actual)
    .usingRecursiveComparison()
    .ignoringFields("id", "createdAt")
    .isEqualTo(expected)
```

### Soft Assertions

```kotlin
assertSoftly { softly ->
    softly.assertThat(user.id).isNotNull
    softly.assertThat(user.name).isEqualTo("John")
    softly.assertThat(user.email).isEqualTo("john@example.com")
}
```

## Kotest (when simpler)

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

## Mockito-Kotlin

```kotlin
import org.mockito.kotlin.*

val emailService = mock<EmailService>()
val userRepository = mock<UserRepository> {
    on { save(any()) } doReturn User(id = 1L, name = "John")
}

// verify
verify(emailService).sendWelcomeEmail(any())
```

## MockK

```kotlin
import io.mockk.*

val emailService = mockk<EmailService>(relaxed = true)
val userRepository = mockk<UserRepository> {
    every { save(any()) } returns User(id = 1L, name = "John")
}

// verify
verify { emailService.sendWelcomeEmail(any()) }
```
