# Naming Conventions

## General

| Type | Convention | Example |
|------|-----------|---------|
| Classes/interfaces | `PascalCase` | `UserService`, `OrderRepository` |
| Functions/methods | `camelCase` (verbs) | `findUserById()`, `calculateTotal()` |
| Variables | `camelCase` | `userName`, `orderCount` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| Packages | `lowercase`, no underscores | `{projectGroup}.domain.order` |
| Booleans | Question form | `isValid`, `hasPermission`, `canExecute` |
| Acronyms (2-letter) | Both uppercase | `IOStream`, `ID` |
| Acronyms (3+ letter) | Capitalize first only | `XmlParser`, `HttpClient` |

## Layer Classes

| Layer | Pattern | Example |
|-------|---------|---------|
| External Controller | `{Feature}ExternalController` | `OrderExternalController` |
| Admin Controller | `{Feature}AdminController` | `OrderAdminController` |
| UseCase | `{Action}{Feature}UseCase` | `CreateOrderUseCase` |
| Application Service | `{Feature}Service` | `OrderService` |
| Domain Policy | `{Feature}{Rule}Policy` | `OrderLimitPolicy` |
| Domain Service | `{Concept}Service` | `DiscountService` |
| JPA Entity | `{Feature}JpaEntity` | `OrderJpaEntity` |
| JPA Repository | `{Feature}JpaRepository` | `OrderJpaRepository` |
| QueryRepository | `{Feature}QueryRepository` | `OrderQueryRepository` |
| Mapper | `{Feature}Mapper` | `OrderMapper` |

## DTOs

| Type | Pattern | Package |
|------|---------|---------|
| Presentation Request | `{Feature}{Action}Request` | `presentation/{scope}/request/` |
| Presentation Response | `{Feature}Response` | `presentation/{scope}/response/` |
| Application Command | `{Action}{Feature}Command` | `application/dto/command/` |
| Application Result | `{Feature}Result` | `application/dto/result/` |
| Search Condition | `{Feature}SearchCondition` | `application/dto/command/` |

## Entity & Domain

| Type | Pattern | Example |
|------|---------|---------|
| Domain Model | `{Feature}` (noun) | `Order`, `User`, `Payment` |
| JPA Entity | `{Feature}JpaEntity` | `OrderJpaEntity`, `UserJpaEntity` |
| Table name | `snake_case`, plural | `orders`, `users`, `payment_methods` |
| Column name | `snake_case` | `created_at`, `order_status` |
| Enum class | `PascalCase` | `OrderStatus`, `PaymentMethod` |
| Enum constant | `SCREAMING_SNAKE_CASE` | `PENDING`, `IN_PROGRESS` |

## DateTime Fields

| Type | Suffix | Example |
|------|--------|---------|
| `LocalDate` | `Date` | `startDate`, `birthDate` |
| `LocalTime` | `Time` | `departureTime`, `checkInTime` |
| `LocalDateTime` | `At` | `createdAt`, `expiredAt` |
| `ZonedDateTime` | `AtZoned` | `scheduledAtZoned`, `publishedAtZoned` |

## Exceptions

| Type | Pattern | Example |
|------|---------|---------|
| Error enum | `{Feature}Error` | `OrderError`, `PaymentError` |
| Base exception | `{Feature}Exception` | `OrderException` |
| Not found | `{Feature}NotFoundException` | `OrderNotFoundException` |
| Already exists | `{Feature}AlreadyExistsException` | `UserAlreadyExistsException` |
| Invalid state | `{Feature}InvalidStateException` | `OrderInvalidStateException` |

## Events

| Type | Pattern | Example |
|------|---------|---------|
| Event class | `{Feature}{Action}Event` | `OrderCreatedEvent`, `OrderCancelledEvent` |
| Event listener | `{Feature}EventListener` | `OrderEventListener` |
| Event package | `domain/event/` | `domain/event/` |
| Listener package | `infrastructure/event/` | `infrastructure/event/` |

## QueryDSL Methods

| Type | Prefix | Example |
|------|--------|---------|
| Single result | `fetch` | `fetchById`, `fetchByCode` |
| List result | `fetchAll` | `fetchAllByUserId` |
| Paged result | `fetchPage` | `fetchPageByStatus` |
| Count | `fetchCount` | `fetchCountByStatus` |
| Exists | `exists` | `existsByEmail` |

## URLs

| Rule | Example |
|------|---------|
| Base path | `/api/v1/` |
| **kebab-case** segments | `/api/v1/order-items` |
| **Plural nouns** | `/api/v1/users`, `/api/v1/orders` |
| Non-CRUD actions | `POST /api/v1/orders/{id}/cancel` |
| Max 3 levels nesting | `/api/v1/users/{id}/orders` |

## Git

| Type | Pattern | Example |
|------|---------|---------|
| Branch | `{type}/{description}` | `feature/PROJ-123-add-login` |
| Commit | `{type}({scope}): {description}` | `feat(order): add cancel endpoint` |

## Test Methods

| Convention | Example |
|------------|---------|
| Behavior pattern | `` `should calculate discount when gold member` `` |
| Method pattern | `` `findById - existing user - returns user` `` |
| REST Docs (English, clear) | `` `get holidays by year` `` |

## Anti-Patterns

- Abbreviations: `usr`, `ord`, `calc` -- use full words
- Hungarian notation: `strName`, `intCount` -- not needed
- Generic names: `data`, `info`, `manager`, `handler` (without feature prefix)
- Inconsistent casing: `userId` vs `user_id` in Kotlin code
- `Impl` suffix: `UserServiceImpl` -- avoid (UseCase and Service are concrete classes, no interface needed)
