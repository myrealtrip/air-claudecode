# Transaction Management

> Keep transactions small and fast. No external I/O. Watch for self-invocation.

## Core Rules

- **Keep it small**: Only include necessary DB operations in a transaction
- **No external I/O**: Never perform HTTP calls, file I/O, or messaging inside transactions
- **No self-invocation**: Same-class `@Transactional` method calls bypass proxy -- extract to another service or make caller transactional
- **Fail fast**: Validate before starting a transaction
- **Public methods only**: `@Transactional` proxy only works on public methods

## @Transactional Defaults

- Propagation: `REQUIRED` (joins existing or creates new)
- Isolation: DB default (usually `READ_COMMITTED`)
- Rollback: `RuntimeException` and `Error` only -- use `rollbackFor` for checked exceptions

## Master/Slave Routing

- `@Transactional(readOnly = true)` routes to **Slave** (Reader)
- `@Transactional` (default) routes to **Master** (Writer)
- QueryApplication classes must use `readOnly = true`
- CommandApplication classes use default `@Transactional`
- `LazyConnectionDataSourceProxy` is required for correct routing

## Propagation Levels

| Level | Use case |
|-------|----------|
| `REQUIRED` | Default, join existing or create new |
| `REQUIRES_NEW` | Audit logs, independent operations (always create new) |
| `NESTED` | Savepoint within existing (partial rollback) |
| `SUPPORTS` / `NOT_SUPPORTED` | Read operations / non-transactional operations |

## External Calls After Commit

- Move external calls (HTTP, email, messaging) outside the transaction
- Use `@TransactionalEventListener(AFTER_COMMIT)` for post-commit side effects

## Common Pitfalls

- Self-invocation bypasses proxy -- extract to separate service
- Checked exceptions don't trigger rollback -- use `rollbackFor`
- Long transactions cause lock contention and connection exhaustion
- Missing `readOnly = true` routes read queries to Master
