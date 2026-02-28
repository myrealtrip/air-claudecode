---
description: Kotlin/Spring coding rules, object conversion, config management
keywords: [kotlin style, object mapping, configuration, val, data class]
---

# Coding Conventions

## Kotlin Rules

### Immutability First
- Use `val` by default. Use immutable collections by default.
- Define DTOs as `data class`.

### Safe Null Handling
- MUST NOT use `!!` operator. Use safe call (`?.`) and elvis (`?:`).

```kotlin
val name = user?.name ?: "Unknown"
val order = repository.findById(id) ?: throw KnownBusinessException(
    code = ErrorCode.DATA_NOT_FOUND, message = "주문을 찾을 수 없습니다: orderId=$id",
)
```

### Expression Usage
- Use `when` expression instead of complex if-else chains.

### Date/Time Format
- All date/time uses ISO 8601 format. Use `java.time` types, MUST NOT use `String` for dates.
- Jackson auto-serializes/deserializes ISO format.

| Type | ISO Format | Example |
|---|---|---|
| `LocalDate` | `yyyy-MM-dd` | `2026-02-28` |
| `LocalTime` | `HH:mm:ss` | `14:30:00` |
| `LocalDateTime` | `yyyy-MM-dd'T'HH:mm:ss` | `2026-02-28T14:30:00` |
| `OffsetDateTime` | `yyyy-MM-dd'T'HH:mm:ssXXX` | `2026-02-28T14:30:00+09:00` |
| `ZonedDateTime` | `yyyy-MM-dd'T'HH:mm:ssXXX'['VV']'` | `2026-02-28T14:30:00+09:00[Asia/Seoul]` |
| `Instant` | `yyyy-MM-dd'T'HH:mm:ss.SSSZ` | `2026-02-28T05:30:00.000Z` |

## Spring Rules

### Dependency Injection
- Constructor injection only. MUST NOT use `@Autowired` field injection.
- In Kotlin, declare in primary constructor.

### ObservationRegistry
- Spring Boot 4 auto-configures `ObservationRegistry`. MUST inject — do NOT create manually.
- Applies to: `RestClient.Builder`, custom `Observation`, any component needing observability.

```kotlin
// CORRECT — inject ObservationRegistry
@Component
class CustomMetricsCollector(
    private val observationRegistry: ObservationRegistry,
) {
    fun recordOperation(name: String, block: () -> Unit) {
        val observation = Observation.createNotStarted(name, observationRegistry)
        observation.observe(block)
    }
}

// WRONG — manual creation loses auto-configured observers/handlers
val registry = ObservationRegistry.create()  // NEVER do this
```

### Layer Separation

| Layer | Allowed | Not Allowed |
|---|---|---|
| Controller | Request/response conversion, validation | Business logic, DB access |
| UseCase/Service | Business logic orchestration | HTTP handling, direct SQL |
| Repository | Data access | Business logic |

### Data Passing to Lower Layers
- 3+ parameters → wrap in `data class`.
- ≤2 parameters → individual args allowed.

| Call Direction | data class Location |
|---|---|
| Controller → UseCase/Service | `application/dto/command/` |
| UseCase → Service | `application/dto/command/` |
| Service → Repository | Pass domain objects directly |

## Object Conversion Rules

All conversions use `of` factory method in target type's `companion object`. Do NOT use `of*` variants or `to` pattern.

```kotlin
data class CreateOrderCommand(val userId: String, val flightNumber: String) {
    companion object {
        fun of(request: CreateOrderRequest): CreateOrderCommand =
            CreateOrderCommand(userId = request.userId, flightNumber = request.flightNumber)
    }
}
```

| Direction | Pattern | Example |
|---|---|---|
| request → command | `of` | `CreateOrderCommand.of(request)` |
| result → response | `of` | `OrderResponse.of(result)` |
| domain → result | `of` | `OrderResult.of(order)` |
| command → domain | `of` | `Order.of(command)` |
| domain → entity | `of` | `OrderEntity.of(order)` |
| entity → domain | `toDomain` **(exception)** | `entity.toDomain()` |

**Exception 1: entity → domain** — `toDomain()` allowed to avoid entity dependency in domain's companion object.

**Exception 2: ApiResource** — `success`, `of`, `ofPage`, `ofNoOffsetPage` factory methods allowed.

## Configuration Management

Environment-specific config via Spring profiles. Default profile: `local`.

| Profile | Use |
|---|---|
| `local` | Local development |
| `dev` | Development server |
| `test` | Test server |
| `stage` | Staging |
| `prod` | Production |

- `application.yaml`: Shared config
- `application-{profile}.yaml`: Environment overrides
- `EnvironmentUtil` to check current env (`isProduction()`, `isLocal()`, etc.)
