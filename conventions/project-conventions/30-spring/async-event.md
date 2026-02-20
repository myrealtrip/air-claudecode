# Async & Event Handling

> Use `@Async` + `@TransactionalEventListener(AFTER_COMMIT)` for side effects after transaction commit. Never perform external I/O inside a transaction.

## Async Configuration

- Project uses `VirtualThreadTaskExecutor` with `ContextPropagatingTaskDecorator` for MDC propagation
- Never create custom `TaskExecutor` without applying the decorator

## @Async Rules

- **Public methods only** -- proxy cannot intercept private/protected methods
- **No self-invocation** -- extract async methods to a separate `@Component`
- **Fire-and-forget** -- return `Unit` for side effects, `CompletableFuture<T>` when caller needs result

## Standard Event Listener Pattern

- Use `@Async` + `@TransactionalEventListener(phase = AFTER_COMMIT, fallbackExecution = true)`
- Always wrap listener logic in try-catch with explicit error logging
- Prefer `@TransactionalEventListener` over `@EventListener` for transactional events
- `@EventListener` fires before commit -- may process rolled-back data

## Event Publishing

- Publish events via `ApplicationEventPublisher` in Service or Application layer only
- Never publish events in Controller or Facade

## Event Class Conventions

- Use sealed interface/class hierarchy: `{Feature}Event.Created`, `{Feature}Event.Cancelled`
- Include only IDs and minimal context -- never pass entities or DTOs
- Place in `domain/{feature}/event/` package

## Event Listener Location

- Name: `{Feature}EventListener`
- Group related handlers in one class per feature
- Place in `domain/{feature}/listener/` or `infrastructure/{channel}/`

## Transaction Phases

| Phase | Use case |
|-------|----------|
| `AFTER_COMMIT` | Default for side effects (notifications, external API) |
| `AFTER_ROLLBACK` | Compensating actions on failure |
| `AFTER_COMPLETION` | Actions regardless of outcome |
| `BEFORE_COMMIT` | Validation within transaction |

## Common Pitfalls

- External I/O inside `@Transactional` -- use events to defer after commit
- Missing `fallbackExecution = true` -- event not fired without active transaction
- Passing Entity in event -- causes coupling and `LazyInitializationException`
- One listener class per event -- group by feature instead
