# Spring Patterns

## Annotation Order

> Spring/JPA first, Lombok last. Core before config.

### Class-level

| Layer | Order |
|-------|-------|
| Entity | `@Entity` → `@Table` → `@Builder` → `@AllArgsConstructor` → `@NoArgsConstructor(access = PROTECTED)` → `@Getter` |
| Controller | `@RestController` → `@RequestMapping` → `@RequiredArgsConstructor` |
| Service | `@Service` → `@Transactional(readOnly = true)` → `@RequiredArgsConstructor` |
| Configuration | `@Configuration` → `@Enable*` → `@RequiredArgsConstructor` |
| DTO | `@Builder` → `@AllArgsConstructor` → `@Getter` → `@ToString` |

- `@ToString` and `@EqualsAndHashCode` **prohibited on entities** (LazyInitializationException risk)
- `@AllArgsConstructor` **required** when using `@Builder`

### Field / Method / Parameter

| Level | Order |
|-------|-------|
| Field (ID) | `@Id` → `@GeneratedValue` |
| Field (Column) | `@Column` → `@NotBlank` |
| Field (Relation) | `@ManyToOne` → `@JoinColumn` |
| Method (Controller) | `@GetMapping` → `@PreAuthorize` → `@Cacheable` |
| Method (Service) | `@Transactional` → `@CacheEvict` |
| Method (Repository) | `@Query` → `@Lock` → `@EntityGraph` |
| Method (Event) | `@Async` → `@TransactionalEventListener` |
| Parameter | `@Valid` → `@RequestBody` |

### Lombok Internal Order

`@Builder` → Constructors → `@Getter`/`@Setter` → `@ToString` → `@EqualsAndHashCode`

## Transaction Management

> Keep transactions small and fast. No external I/O. Watch for self-invocation.

### Core Rules

- **Keep it small**: Only necessary DB operations inside transaction
- **No external I/O**: No HTTP calls, file I/O, or messaging inside transactions
- **No self-invocation**: Same-class `@Transactional` calls bypass proxy -- extract to another service
- **Public methods only**: Proxy only works on public methods
- **Fail fast**: Validate before starting a transaction

### Master/Slave Routing

- `@Transactional(readOnly = true)` → **Slave** (Reader)
- `@Transactional` (default) → **Master** (Writer)
- `LazyConnectionDataSourceProxy` required for correct routing

### Propagation

| Level | Use case |
|-------|----------|
| `REQUIRED` | Default, join existing or create new |
| `REQUIRES_NEW` | Audit logs, independent operations |
| `NESTED` | Savepoint within existing (partial rollback) |

### Post-Commit Side Effects

- Move external calls outside the transaction
- Use `@TransactionalEventListener(AFTER_COMMIT)` for post-commit side effects

### Pitfalls

- Self-invocation bypasses proxy -- extract to separate service
- Checked exceptions don't trigger rollback -- use `rollbackFor`
- Long transactions cause lock contention and connection exhaustion

## Async & Event Handling

> Use `@Async` + `@TransactionalEventListener(AFTER_COMMIT)` for side effects after commit.

### Configuration

- Project uses `VirtualThreadTaskExecutor` with `ContextPropagatingTaskDecorator` for MDC
- Never create custom `TaskExecutor` without the decorator

### @Async Rules

- **Public methods only** -- proxy cannot intercept private/protected
- **No self-invocation** -- extract to separate `@Component`
- Return `Unit` for fire-and-forget, `CompletableFuture<T>` when caller needs result

### Event Listener Pattern

- Use `@Async` + `@TransactionalEventListener(phase = AFTER_COMMIT, fallbackExecution = true)`
- Always wrap listener logic in try-catch with explicit error logging

### Event Design

- Use sealed interface/class hierarchy: `{Feature}Event.Created`, `{Feature}Event.Cancelled`
- Include only IDs and minimal context -- never pass entities or DTOs
- Place in `domain/{feature}/event/` package
- Listener: `{Feature}EventListener` in `domain/{feature}/listener/`

### Transaction Phases

| Phase | Use case |
|-------|----------|
| `AFTER_COMMIT` | Side effects (notifications, external API) |
| `AFTER_ROLLBACK` | Compensating actions on failure |
| `BEFORE_COMMIT` | Validation within transaction |
