---
description: Class, DTO, entity, URL, Git naming rules
keywords: [naming, class name, DTO name, entity name, URL path, git branch, git commit]
---

# Naming Conventions

## Basic Rules

| Type | Convention | Example |
|---|---|---|
| Class/Interface | `PascalCase` | `UserService`, `OrderRepository` |
| Function/Method | `camelCase` (verb) | `findUserById()`, `calculateTotal()` |
| Variable | `camelCase` | `userName`, `orderCount` |
| Constant | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| Package | `lowercase`, no underscores | `com.myrealtrip.air.order.domain` |
| Boolean | Question form | `isValid`, `hasPermission`, `canExecute` |
| Abbreviation (2 chars) | All uppercase | `IOStream`, `ID` |
| Abbreviation (3+ chars) | First letter only | `XmlParser`, `HttpClient` |

## Layer Classes

| Layer | Pattern | Example |
|---|---|---|
| Application | `{Service}Application` | `AirOrderApplication` |
| Controller | `{Domain}Controller` | `OrderController` |
| UseCase | `{Verb}{Noun}UseCase` | `CreateOrderUseCase` |
| Service | `{Noun}Service` | `OrderService` |
| Repository (JPA) | `{Noun}Repository` | `OrderRepository` |
| QueryRepository | `{Noun}QueryRepository` | `OrderQueryRepository` |
| Entity | `{Noun}Entity` | `OrderEntity` |
| Config | `{Feature}Config` | `AsyncConfig` |

## DTO Naming

```
request → command → result → response
```

| Stage | Pattern | Location | Example |
|---|---|---|---|
| Request | `{Action}{Resource}Request` | `presentation/{scope}/request/` | `CreateOrderRequest` |
| Response | `{Resource}Response` | `presentation/{scope}/response/` | `OrderResponse` |
| Command | `{Action}{Resource}Command` | `application/dto/command/` | `CreateOrderCommand` |
| Result | `{Resource}Result` | `application/dto/result/` | `OrderResult` |
| SearchCondition | `{Feature}SearchCondition` | `application/dto/command/` | `OrderSearchCondition` |

Action-specific response: `{Resource}{Action}Response` (e.g., `OrderCancelResponse`).

## Entity & Domain

| Type | Pattern | Example |
|---|---|---|
| Entity class | `{Noun}Entity` | `OrderEntity`, `PassengerEntity` |
| Domain class | `{Noun}` (no suffix) | `Order`, `Passenger` |
| Table name | `snake_case`, plural | `orders`, `payment_methods` |
| Column name | `snake_case` | `created_at`, `order_status` |
| Enum class | `PascalCase` | `OrderStatus`, `PaymentMethod` |
| Enum constant | `SCREAMING_SNAKE_CASE` | `PENDING`, `IN_PROGRESS` |

## Date/Time Field Suffixes

| Type | Suffix | Example |
|---|---|---|
| `LocalDate` | `Date` | `startDate`, `birthDate` |
| `LocalTime` | `Time` | `departureTime`, `checkInTime` |
| `LocalDateTime` | `At` | `createdAt`, `expiredAt` |
| `ZonedDateTime` | `AtZoned` | `scheduledAtZoned`, `publishedAtZoned` |

## Exception Naming

Use project exceptions (`KnownBusinessException`, `BusinessException`) with `ErrorCode` enum. MUST NOT create domain-specific exception classes.

| Type | Pattern | Example |
|---|---|---|
| Predictable error | `KnownBusinessException` + `ErrorCode` | `KnownBusinessException(ErrorCode.DATA_NOT_FOUND, "...")` |
| Unexpected error | `BusinessException` + `ErrorCode` | `BusinessException(ErrorCode.ILLEGAL_STATE, "...")` |
| ErrorCode | `SCREAMING_SNAKE_CASE` | `DATA_NOT_FOUND`, `INVALID_ARGUMENT` |

## Event Naming

| Type | Pattern | Example |
|---|---|---|
| Event class | `{Domain}Event.{Action}` (sealed) | `OrderEvent.Created`, `OrderEvent.Cancelled` |
| Event listener | `{Domain}EventListener` | `OrderEventListener` |
| Event package | `infrastructure/event/` | — |

```kotlin
sealed class OrderEvent {
    data class Created(val orderId: Long) : OrderEvent()
    data class Cancelled(val orderId: Long, val reason: String) : OrderEvent()
}
```

## QueryDSL Method Naming

| Type | Prefix | Example |
|---|---|---|
| Single | `fetchXxx` | `fetchById`, `fetchByOrderNumber` |
| List | `fetchAllXxx` | `fetchAllByUserId` |
| Page | `fetchPageXxx` | `fetchPageByStatus` |
| Count | `fetchCountXxx` | `fetchCountByStatus` |
| Exists | `existsXxx` | `existsByEmail` |

## URL Naming

kebab-case, plural nouns.

| Rule | Example |
|---|---|
| Base path | `/api/v1/{resource}` |
| kebab-case | `/api/v1/order-items` |
| Plural nouns | `/api/v1/users`, `/api/v1/orders` |
| Non-CRUD action | `POST /api/v1/orders/{id}/cancel` |
| Max 3 nesting levels | `/api/v1/users/{id}/orders` |

## Git Naming

| Type | Pattern | Example |
|---|---|---|
| Branch | `{type}/{description}` | `feat/PROJ-123-add-login` |
| Commit | `{type}({scope}): {description}` | `feat(order): add cancel endpoint` |

## Test Method Naming

| Convention | Example |
|---|---|
| Behavior pattern | `` `should calculate discount when gold member` `` |
| Method pattern | `` `findById - existing user - returns user` `` |

## Anti-Patterns

| Mistake | Bad | Good |
|---|---|---|
| Abbreviations | `usr`, `ord`, `calc` | `user`, `order`, `calculate` |
| Hungarian notation | `strName`, `intCount` | `name`, `count` |
| Generic names | `data`, `info`, `manager` | `OrderData`, `FlightInfo` |
| Mixed casing in Kotlin | `userId` vs `user_id` | `userId` consistently |
| `Impl` suffix | `UserServiceImpl` | No interface needed for single impl |
| Missing Entity suffix | `Order` (entity) | `OrderEntity` |
| Domain-specific exception | `OrderNotFoundException` | `KnownBusinessException(ErrorCode.DATA_NOT_FOUND)` |
| Non-`of` factory name | `from()`, `create()`, `toXxx()` | `of()` (exception: `toDomain()`) |
