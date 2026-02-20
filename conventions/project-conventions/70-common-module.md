# Common Module Reference

## Value Objects (required)

Use typed Value Objects instead of primitive types.

| Type | Instead of | Create | Key methods |
|------|-----------|--------|-------------|
| `Email` | `String` | `Email.of()`, `.asEmail` | `.masked()` |
| `PhoneNumber` | `String` | `PhoneNumber.of()`, `.asPhoneNumber` | `.toE164()`, `.toNational()` |
| `Money` | `BigDecimal`/`Long` | `Money.krw()`, `Money.usd()` | arithmetic operators, `.format()` |
| `Rate` | `Double`/`BigDecimal` | `Rate.ofPercent()` | `.percent`, `.applyTo()`, `.remainderOf()` |

## Exceptions

| Class | Usage | Logging |
|-------|-------|---------|
| `KnownException` | Expected errors (validation, not found) | INFO, no stack trace |
| `BizRuntimeException` | Unrecoverable business errors | ERROR, with stack trace |
| `BizException` | Recoverable business errors | ERROR |

Precondition helpers: `knownRequired`, `knownRequiredNotNull`, `knownNotBlank`

## DateTime Utilities

| Utility | Methods |
|---------|---------|
| `DateFormatter` | `.toDate()`, `.toDateTime()`, `.toStr()`, `.toKorean()` |
| `SearchDates` | `.lastMonth()`, `.lastDays(n)`, `.thisWeek()`, `.of(start, end)` |
| `LocalDateRange` | `.from(start, end)`, `in`, `.overlaps()`, `.daysBetween()` |

## Extensions

### String

`.maskName()`, `.maskDigits()`, `.maskEmail()`, `.ifNullOrBlank()`, `.removeAllSpaces()`

### DateTime

`.isToday()`, `.isPast()`, `.getAge()`, `.getKoreanAge()`, `.toKst()`, `.toUtc()`

## Other Utilities

| Utility | Purpose |
|---------|---------|
| `stopWatch` | Measure execution time |
| `runBlockingWithMDC` / `asyncWithMDC` | Coroutine MDC propagation |
| `AesCipher` | AES encryption/decryption |
