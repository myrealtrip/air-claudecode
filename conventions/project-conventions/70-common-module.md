# 공통 모듈 참조

## 값 객체 (필수)

원시 타입 대신 타입이 지정된 값 객체를 사용한다.

| 타입 | 대체 대상 | 생성 | 주요 메서드 |
|------|-----------|------|-------------|
| `Email` | `String` | `Email.of()`, `.asEmail` | `.masked()`, `.isValid` |
| `PhoneNumber` | `String` | `PhoneNumber.of()`, `.asPhoneNumber` | `.toE164()`, `.toNational()`, `.isValid`, `.isValidMobile` |
| `Money` | `BigDecimal`/`Long` | `Money.krw()`, `Money.usd()`, 확장 함수 | 산술 연산자, `.format()` |
| `Rate` | `Double`/`BigDecimal` | `Rate.ofPercent()`, `.percent`, `.of()` | `.applyTo()`, `.remainderOf()` |

---

### Email

```kotlin
val email = Email.of("user@example.com")   // 팩토리
val email = "user@example.com".asEmail     // 확장 함수
val isValid = Email.isValid("user@example.com")  // true
val masked = email.masked()                // "us**@example.com"
```

---

### Money

```kotlin
val price = Money.krw(10_000L)             // 팩토리
val price = 10_000L.krw                    // 확장 함수

val total    = price + fee.toKrw()         // 덧셈
val doubled  = price * 2                   // 스칼라 곱
val discount = price * BigDecimal("0.9")
val formatted = price.format()             // "10,000"

val discountRate = Rate.ofPercent(10)
val discounted   = price.applyRate(discountRate)  // price * 0.90
```

`PhoneNumber`과 `Rate`도 위와 같은 팩토리/확장 함수/메서드 패턴을 따른다. 각 타입별 메서드는 위 테이블을 참조한다.

---

## 예외

| 클래스 | 용도 | 로깅 |
|--------|------|------|
| `KnownException` | 예상 가능한 오류 (유효성 검증, 미존재) | INFO, 스택 트레이스 없음 |
| `BizRuntimeException` | 복구 불가 비즈니스 오류 | ERROR, 스택 트레이스 포함 |
| `BizException` | 복구 가능 비즈니스 오류 | ERROR |

```kotlin
// 기능별 예외 계층 (domain/{feature}/exception/)
open class OrderException(error: OrderError, message: String? = null) :
    KnownException(error, message ?: error.message)

class OrderNotFoundException(id: Long) : OrderException(
    OrderError.NOT_FOUND, "Order not found: id=$id",
)
class OrderAlreadyCancelledException(id: Long) : OrderException(
    OrderError.ALREADY_CANCELLED, "Order already cancelled: id=$id",
)
```

### 전제 조건 검증

```kotlin
knownRequired(order.status == OrderStatus.PENDING, OrderError.INVALID_STATE) {
    "Order must be PENDING to confirm. current=${order.status}"
}
val user = knownRequiredNotNull(userRepository.findById(userId), UserError.NOT_FOUND) {
    "User not found: id=$userId"
}
knownNotBlank(request.reason, OrderError.REASON_REQUIRED) { "Reason must not be blank" }
```

---

## DateTime 유틸리티

| 유틸리티 | 메서드 |
|----------|--------|
| `DateFormatter` | `.toDate()`, `.toDateTime()`, `.toStr()`, `.toKorean()` |
| `SearchDates` | `.lastMonth()`, `.lastDays(n)`, `.thisWeek()`, `.of(start, end)` |
| `LocalDateRange` | `.from(start, end)`, `in`, `.overlaps()`, `.daysBetween()` |

---

## 확장 함수

### String

`.maskName()`, `.maskDigits()`, `.maskEmail()`, `.ifNullOrBlank()`, `.removeAllSpaces()`

### DateTime

`.isToday()`, `.isPast()`, `.getAge()`, `.getKoreanAge()`, `.toKst()`, `.toUtc()`

---

## 기타 유틸리티

| 유틸리티 | 용도 |
|----------|------|
| `stopWatch` | 실행 시간 측정 |
| `runBlockingWithMDC` / `asyncWithMDC` | 코루틴 MDC 전파 |
| `AesCipher` | AES 암호화/복호화 |

```kotlin
val elapsed = stopWatch { processOrder(order) }
log.info("processOrder took ${elapsed}ms")

val cipher = AesCipher(secretKey = "your-32-char-secret-key-here!!!!")
val encrypted = cipher.encrypt("sensitive-data")
val decrypted = cipher.decrypt(encrypted)
```
