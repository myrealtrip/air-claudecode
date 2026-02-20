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
| Controller | `{Feature}Controller` | `OrderController` |
| Facade | `{Feature}Facade` | `OrderFacade` |
| QueryApplication | `{Feature}QueryApplication` | `OrderQueryApplication` |
| CommandApplication | `{Feature}CommandApplication` | `OrderCommandApplication` |
| Service | `{Feature}Service` | `OrderService` |
| JpaRepository | `{Feature}Repository` | `OrderRepository` |
| QueryRepository | `{Feature}QueryRepository` | `OrderQueryRepository` |

## DTOs

| Type | Pattern | Package |
|------|---------|---------|
| API Request | `{Action}{Feature}ApiRequest` | `dto/request/` |
| API Response | `{Feature}Dto` | `dto/response/` |
| Domain DTO | `{Feature}Info` | domain `dto/` |
| Domain Request | `Create{Feature}Request` | domain `dto/` |
| Domain Update | `Update{Feature}Request` | domain `dto/` |
| Search Condition | `{Feature}SearchCondition` | domain `dto/` |

## Entity & Domain

| Type | Pattern | Example |
|------|---------|---------|
| Entity | `{Feature}` (noun) | `Order`, `User`, `Payment` |
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
| Event class | `{Feature}Event.{Action}` (sealed) | `OrderEvent.Created`, `OrderEvent.Cancelled` |
| Event listener | `{Feature}EventListener` | `OrderEventListener` |
| Event package | `domain/{feature}/event/` | `domain/order/event/` |
| Listener package | `domain/{feature}/listener/` | `domain/order/listener/` |

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
- `Impl` suffix: `UserServiceImpl` -- avoid (no interface for single impl)
