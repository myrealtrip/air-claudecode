# DateTime Handling

> Store and process in UTC. Convert to KST only at the final display boundary.

## Core Rules

| Rule | Description |
|------|-------------|
| Internal timezone | UTC everywhere (JVM, DB, domain logic) |
| Controller input | Must be UTC. If KST arrives, convert to UTC immediately |
| Controller output | UTC by default. Convert to KST only when display requires it |
| KST conversion | Use `.toKst()` extension only at the response boundary (Facade / Response DTO) |
| Utilities | Use `{projectGroup}.common.utils.datetime` for all datetime operations |

## JVM Configuration

Set `TimeZone.setDefault(TimeZone.getTimeZone("UTC"))` in every bootstrap `-app` main() method.

## DateTime Lifecycle

```
Client Request (UTC, or KST → convert to UTC immediately)
  → Controller/Facade (ensure UTC before passing to domain)
    → Domain (all operations in UTC, no KST awareness)
      → Database (stored as UTC)
        → Facade/Response DTO (convert to KST with .toKst() only if display requires)
          → Client Response
```

## Timezone Conversion

- `LocalDateTime.toKst()` / `ZonedDateTime.toKst()` -- UTC to KST for display
- `LocalDateTime.toUtc()` / `ZonedDateTime.toUtc()` -- KST to UTC for storage
- Import from `{projectGroup}.common.utils.extensions`

## Common Utilities (`{projectGroup}.common.utils.datetime`)

- **DateFormatter**: `toDate()`, `toDateTime()`, `toStr()`, `toKorean()` for parsing/formatting
- **SearchDates**: `lastMonth()`, `lastDays(n)`, `thisWeek()`, `of(start, end)` for date range queries
- **LocalDateRange / LocalDateTimeRange**: containment, overlap, duration calculation

## Anti-Patterns

- Missing `TimeZone.setDefault(UTC)` in main() → `now()` returns KST
- KST input passed to domain as-is → mixed UTC/KST in DB
- `.toKst()` in Service or Application → domain polluted with display concern
- `plusHours(9)` for conversion → fragile, use `.toKst()` / `.toUtc()`
- Raw `DateTimeFormatter` → use `DateFormatter` from common module
- `String` type for date fields → use `LocalDate`, `LocalDateTime`, `ZonedDateTime`
