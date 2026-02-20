# Test Rules Reference

## Critical Rules

- **Never modify production code** to make tests pass -- fix the test
- **Always run tests** after writing (`./gradlew test`)
- **No boilerplate tests** -- ask "Would this test catch a real bug?"
- Focus: business logic, edge cases, boundary conditions, error paths
- Do NOT test trivial getters/setters or framework behavior

## Test Format

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
|---------|------|---------|
| Method name | Backticks, descriptive | `` `should calculate total correctly` `` |
| Return type | Explicit `: Unit` | `fun test(): Unit` |
| Structure | given-when-then with comments | Blank lines between sections |

## Naming

- Pattern: `should [expected behavior] when [condition]`
- Alternative: `[method] - [scenario] - [expected result]`

## Parameterized Tests

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

Kotest data-driven:
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

## Test Organization

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

## Quality Checklist

| DO | DO NOT |
|----|--------|
| Test business logic and behavior | Test trivial getters/setters |
| Test edge cases and boundaries | Write tests solely for coverage |
| Test error handling paths | Test framework behavior |
| Verify complex state transitions | Over-mock dependencies |
| Group related scenarios | Copy-paste test boilerplate |
