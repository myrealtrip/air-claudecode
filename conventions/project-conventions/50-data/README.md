# Data Access

## JPA & Hibernate

### Core Rules

- Extend **BaseEntity** (full auditing) or **BaseTimeEntity** (timestamps only)
- Always `@Enumerated(EnumType.STRING)` -- never ORDINAL
- Always `FetchType.LAZY` for all associations
- Always specify `@Table(name = "xxx")`

### Association Policy

| Rule | Description |
|------|-------------|
| Default | Do NOT map entity associations -- store FK as plain ID |
| Exception | Unidirectional only, when absolutely necessary |
| Prohibited | Bidirectional associations strictly forbidden |
| Querying | Use QueryDSL for joining related data |

### Entity Structure

- `@Entity` + `@Table(name = "xxx")` + extend `BaseEntity`/`BaseTimeEntity`
- `val` for immutable fields (`id`), `var` for mutable fields
- Mutations via `update()` method, factory via `create()` companion
- **Entity must NOT import DTO**

### Configuration

- `ddl-auto: none` -- never auto-generate DDL in production
- `open-in-view: false` -- disable OSIV (mandatory)
- `default_batch_fetch_size: 500`, `batch_size: 500`

### Locking

| Strategy | Use case |
|----------|----------|
| Optimistic (`@Version`) | Low contention, read-heavy |
| Pessimistic (`@Lock`) | High contention, critical sections |

### Pitfalls

- Solve LazyInitializationException by fetching as DTO via QueryDSL
- Solve N+1 with QueryDSL JOIN
- Dirty checking: no explicit `save()` needed for updates within `@Transactional`

## QueryDSL

### Core Rules

- Extend **QuerydslRepositorySupport**
- Use **`QueryRepository` suffix** (`OrderQueryRepository`)
- Prefix all select methods with **`fetch`**
- Use **`@QueryProjection`** on DTO constructors

### Method Naming

| Pattern | Example |
|---------|---------|
| Single | `fetchById`, `fetchByCode` |
| List | `fetchAllByUserId` |
| Paged | `fetchPageByStatus` |
| Count | `fetchCountByStatus` |
| Exists | `existsByEmail` |

### Pagination

- Always accept **`Pageable`** -- never raw `page`/`size`
- Use `applyPagination` with separate content and count queries

### Dynamic Conditions

- Use **`QuerydslExpressions`** for null-safe dynamic filtering
- Available: `eq`, `gt/gte/lt/lte`, `contains`, `startsWith`, `in`, `dateBetween`
- All methods return `null` when value is null/empty (ignored by QueryDSL `where()`)

### SearchCondition

- Encapsulate complex filters in **`{Feature}SearchCondition`** data class
- Use **`SearchDates`** for date range fields

## SQL Style

- **ANSI SQL**, **lowercase** keywords and identifiers
- **Leading commas**, **right-align** main clauses
- Tables: **snake_case**, **plural** nouns
- **Do NOT use ENUM** for code/status columns -- use `varchar`
- **Do NOT add FK constraints or indexes by default** -- suggest as comments
- Constraint naming: `pk_`, `uk_`, `fk_`, `idx_` + `{table_name}` + `_01`, `_02`
- Avoid `select *`, use explicit `JOIN`, prefer `CTE` over subqueries, prefer `exists` over `in`
