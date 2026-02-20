# Concurrency & Coroutines

> Always use the project's `CoroutineUtils` for coroutine operations. Never use raw `runBlocking`, `async`, or `launch`.

## MDC Context Propagation (required)

Use MDC-preserving functions from `{projectGroup}.common.utils.coroutine`:

| Function | Purpose |
|----------|---------|
| `runBlockingWithMDC` | Bridge blocking code to coroutines with MDC |
| `asyncWithMDC` | Launch concurrent coroutine with MDC |
| `launchWithMDC` | Fire-and-forget coroutine with MDC |

Raw coroutine builders lose MDC context (traceId, requestId).

## Dispatcher Selection

| Dispatcher | Use case | Functions |
|------------|----------|-----------|
| Default (CPU) | CPU-bound computation | `runBlockingWithMDC`, `asyncWithMDC` |
| Virtual Thread (preferred for I/O) | Blocking I/O | `runBlockingOnVirtualThread`, `asyncOnVirtualThread` |
| IO (fallback) | When virtual threads not suitable | `runBlockingOnIoThread`, `asyncOnIoThread` |

Prefer Virtual Thread over IO Dispatcher for blocking I/O.

## Retry Pattern

- Use `retry` (suspend) and `retryBlocking` from `CoroutineUtils`
- Never implement custom retry loops
- Parameters: `maxAttempts` (3), `delay` (500ms), `backoffMultiplier` (1.0), `retryOn`

## Structured Concurrency

- Never use `GlobalScope` -- all coroutines must use structured concurrency
- Use `ensureActive()` in long-running loops for cooperative cancellation
- Never catch `CancellationException` -- rethrow it
- Use `supervisorScope` when sibling failures should not cancel each other

## Transaction Boundary

- Do not start coroutines that perform DB operations outside `@Transactional` scope
- Keep DB operations sequential within transactions
- Use coroutines for parallel I/O outside transaction boundaries

## Pitfalls

| Problem | Solution |
|---------|----------|
| Raw `runBlocking`/`async`/`launch` | MDC context lost -- use `*WithMDC` variants |
| `GlobalScope.launch` | Coroutine leaks -- use structured concurrency |
| `Thread.sleep` in coroutines | Blocks thread -- use `delay()` |
| DB ops in parallel coroutines | Transaction context lost -- keep sequential |
| IO Dispatcher for blocking API | Use Virtual Thread instead |
