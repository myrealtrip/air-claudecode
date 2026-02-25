# Domain Patterns

## Common Codes & Enums

All categorized domain codes must implement `CommonCode` from `{projectGroup}.common.codes`.

```kotlin
interface CommonCode {
    val code: String        // Machine-readable code value
    val description: String // Human-readable description
    val name: String        // Enum constant name
}
```

### Rules

- Implement `CommonCode` with `code` and `description` properties
- Enum class: `PascalCase` (`OrderStatus`), constants: `SCREAMING_SNAKE_CASE` (`PENDING`)
- Provide `fromCode()` companion method for external code mapping
- Always `@Enumerated(EnumType.STRING)` -- never `ORDINAL`
- Set `@Column(length = N)` to match longest constant name

### When to Use CommonCode

| Yes | No |
|-----|----|
| Business status codes | Response codes (use `ResponseCode`) |
| Category/type classifications | Internal flags (plain enum) |
| Role/permission types | Sealed classes for type hierarchies |

### Package Location

- Domain-specific: `domain/{feature}/entity/`
- Shared across features: `domain/common/codes/`
- Common module: `common/codes/`

## Domain Exception Handling

> Each feature has its own `{Feature}Error` enum, `{Feature}Exception` base class, and specific subclasses.

### Exception Hierarchy

| Class | Base | Usage | Log |
|-------|------|-------|-----|
| `KnownException` | common | Expected errors (validation, not found) | INFO, no stack trace |
| `BizRuntimeException` | common | Unrecoverable business errors | ERROR, with stack trace |
| `{Feature}Exception` | `KnownException` | Feature-specific base (`open class`) | INFO |
| `{Feature}NotFoundException` | `{Feature}Exception` | Specific subclass | INFO |

### Error Code Enum

- Each feature defines `{Feature}Error` enum implementing `ResponseCode`
- Messages use Korean description
- All domain business exceptions use HTTP status code `406`

### Package Structure

Each feature: `domain/{feature}/exception/`
- `{Feature}Error.kt` (enum)
- `{Feature}Exception.kt` (base + subclasses)

### Usage Rules

- Throw exceptions in **Service layer only** -- not in UseCase or Controller
- Include relevant context (id, date, name) in error messages
- Use `knownRequired` / `knownRequiredNotNull` for precondition validation

## DateTime Handling

> Store and process in UTC. Convert to KST only at the final display boundary.

### Core Rules

| Rule | Description |
|------|-------------|
| Internal timezone | UTC everywhere (JVM, DB, domain logic) |
| Controller input | Must be UTC. If KST arrives, convert immediately |
| Controller output | UTC by default. KST only for display |
| KST conversion | `.toKst()` only at Response DTO |

### JVM Configuration

Set `TimeZone.setDefault(TimeZone.getTimeZone("UTC"))` in every bootstrap `-app` main().

### DateTime Lifecycle

```
Client Request (UTC, or KST → convert to UTC immediately)
  → Controller (ensure UTC)
    → Domain (all operations in UTC)
      → Database (stored as UTC)
        → Response DTO (.toKst() only if display requires)
```

### Conversion Extensions

- `LocalDateTime.toKst()` / `.toUtc()` from `{projectGroup}.common.utils.extensions`
- Never use `plusHours(9)` -- always use `.toKst()` / `.toUtc()`
- Never use raw `DateTimeFormatter` -- use `DateFormatter` from common module

### Anti-Patterns

- Missing `TimeZone.setDefault(UTC)` in main() → `now()` returns KST
- `.toKst()` in Domain or UseCase → domain polluted with display concern
- `String` type for date fields → use `LocalDate`, `LocalDateTime`, `ZonedDateTime`
