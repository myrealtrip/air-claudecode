# Domain Exception Handling

> Each domain feature has its own `{Feature}Error` enum, `{Feature}Exception` base class, and specific exception subclasses.

## Exception Hierarchy

```
BizRuntimeException (common) -- unrecoverable business errors, with stack trace
KnownException (common) -- expected errors (validation, not found), no stack trace
  └── {Feature}Exception (domain) -- feature-specific base, open class
        ├── {Feature}NotFoundException
        ├── {Feature}AlreadyExistsException
        └── {Feature}InvalidStateException
```

## Error Code Enum

- Each feature defines `{Feature}Error` enum implementing `ResponseCode`
- Constants use `SCREAMING_SNAKE_CASE`
- Messages use Korean description
- All domain business exceptions use HTTP status code `406`
- Feature-specific errors use `{Feature}Error`, generic errors use common `ErrorCode`

## Package Structure

Each feature must have `domain/{feature}/exception/` package:
- `{Feature}Error.kt` (enum)
- `{Feature}Exception.kt` (base + subclasses)

## Exception Classes

- Base exception: `open class {Feature}Exception` extending `KnownException`
- Accepts `{Feature}Error` and optional custom message (defaults to error code message)
- Specific exceptions placed in same file as base exception
- Common patterns: `NotFoundException`, `AlreadyExistsException`, `InvalidStateException`

## Usage Rules

- Throw exceptions in **Service layer only** -- not in Application or Facade
- Include relevant context (id, date, name) in error messages
- Use base exception directly when dedicated subclass is unnecessary
- Use `knownRequired` / `knownRequiredNotNull` / `knownNotBlank` for precondition validation

## Common Pitfalls

- Using common `ErrorCode` for feature-specific errors -- loses domain context
- Throwing raw `KnownException` -- no feature-level taxonomy
- Missing `open` modifier on base exception -- cannot create subclasses
- Hardcoded messages without context -- difficult to debug
