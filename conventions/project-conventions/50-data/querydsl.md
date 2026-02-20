# QueryDSL

## Core Principles

- Extend **QuerydslRepositorySupport** for all QueryDSL repositories
- Use **`QueryRepository` suffix** for class names (e.g., `OrderQueryRepository`)
- Prefix all select methods with **`fetch`** (`fetchById`, `fetchAllByXxx`, `fetchPageByXxx`)
- Use **`@QueryProjection`** on DTO constructors -- avoid `Projections.constructor`
- Use QueryDSL JOINs instead of entity associations

## Method Naming

| Pattern | Example |
|---------|---------|
| Single result | `fetchById`, `fetchByCode` |
| List result | `fetchAllByUserId`, `fetchAllByStatus` |
| Paged result | `fetchPageByStatus`, `fetchPageByCondition` |
| Count | `fetchCountByStatus` |
| Exists | `existsByEmail` |

## Pagination

- Always accept **`Pageable`** -- never raw `page`/`size` parameters
- Use `applyPagination` with separate content and count queries

## SearchCondition

- Encapsulate complex filters in **`{Feature}SearchCondition`** data class
- Use **`SearchDates`** from common module for date range fields (not raw `startDate`/`endDate`)

## Dynamic Conditions

Use **`QuerydslExpressions`** for null-safe dynamic filtering:

| Method | Description |
|--------|-------------|
| `eq` | Equals |
| `gt` / `gte` / `lt` / `lte` | Comparison |
| `contains` / `containsIgnoreCase` | String contains |
| `startsWith` | String prefix |
| `in` | Collection membership |
| `dateBetween` / `dateTimeBetween` | Date range |
| `isTrue` / `isFalse` | Boolean |

All methods return `null` when value is null/empty (ignored by QueryDSL `where()`).
