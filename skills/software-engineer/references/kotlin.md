# Kotlin Reference

Based on [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html).

## Class Layout

1. Properties & init blocks → 2. Secondary constructors → 3. Methods → 4. Companion object → 5. Nested classes

- Group related methods together (not alphabetically, not by visibility)
- Interface implementation: keep interface member order
- Overloads: always next to each other

```kotlin
class OrderService(private val orderRepository: OrderRepository) {
    private val cache = mutableMapOf<Long, Order>()

    // Group: creation
    fun createOrder(request: CreateOrderRequest): Order { }
    private fun validate(request: CreateOrderRequest) { }

    // Group: retrieval
    fun findOrder(id: Long): Order? { }
    fun findByUser(userId: Long): List<Order> { }

    companion object { private const val MAX_CACHE = 100 }
}
```

### Data Class: required → optional with defaults → timestamps
```kotlin
data class User(
    val id: Long,
    val email: String,
    val name: String = "",
    val role: Role = Role.USER,
    val createdAt: Instant = Instant.now(),
)
```

### Sealed Class: success first → errors → states → common ops
```kotlin
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
    data object Loading : Result<Nothing>()
}
```

## Immutability & Null Safety

```kotlin
val users: List<User> = listOf(user1, user2)          // val, immutable collection
val updated = user.copy(name = "New")                  // copy() over mutation
val length = name?.length ?: 0                         // safe call + elvis
user?.let { saveToDatabase(it) }                       // let for null check
requireNotNull(user) { "User cannot be null" }         // precondition
// NEVER use !!
```

## Idioms

```kotlin
fun doubled(x: Int) = x * 2                           // expression body
fun create(name: String, role: Role = Role.USER) { }   // default params > overloads
println("$name has ${items.size} items")               // string templates
draw(x = 10, y = 10, fill = true)                     // named arguments (use when >1 args)

when (status) {                                        // when for 3+ branches
    Status.ACTIVE -> handle()
    Status.PENDING -> wait()
    Status.INACTIVE -> skip()
}

val names = users                                      // higher-order > loops
    .filter { it.isActive }
    .map { it.name }

hugeList.asSequence()                                  // sequence for large data
    .filter { it.isValid }.map { it.transform() }.take(10).toList()
```

## Early Returns

```kotlin
// Bad: deep nesting
fun process(user: User?) {
    if (user != null) { if (user.isActive) { /* ... */ } }
}

// Good: flat
fun process(user: User?) {
    if (user == null) return
    if (!user.isActive) return
    // main logic
}
```

## Scope Functions

| Function | Use case | Example |
|----------|----------|---------|
| `let` | null check | `value?.let { transform(it) }` |
| `apply` | object config | `User().apply { name = "John" }` |
| `also` | side effects | `user.also { log(it) }` |

## Error Handling

```kotlin
fun findUser(id: Long): User?                          // nullable for expected absence
fun findOrThrow(id: Long): User =                      // exception for unexpected errors
    repo.findById(id) ?: throw UserNotFoundException(id)
```

## Formatting

- 4-space indent, trailing commas, chained calls on next line
- Omit `:Unit`, semicolons, redundant `public`
- Packages: lowercase, no underscores
- Acronyms: 2-letter uppercase (`IO`), longer capitalize first (`Xml`)

## Anti-Patterns

- **Over-engineering**: interface + impl + factory for `fun toUpperCase(s: String) = s.uppercase()`
- **God classes**: split by responsibility
- **Copy-paste**: extract to extension function or interface
- **Over-functional**: break complex chains into clear named steps
