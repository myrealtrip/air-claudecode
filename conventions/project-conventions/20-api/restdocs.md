# REST Docs

## 핵심 규칙

- **`RestDocsSupport`** 베이스 클래스를 상속한다
- **UseCase**를 모킹한다 (Service가 아님)
- **`DocsFieldType`** 사용: `STRING`, `NUMBER`, `BOOLEAN`, `DATE`, `DATETIME`, `ENUM(Class::class)`
- **Field DSL** 사용: `"fieldName" type TYPE means "설명"`
- 선택 필드: `isOptional true`, 예시값: `example "value"`

---

## RestDocsSupport 베이스 클래스

```kotlin
// test-support 모듈
abstract class RestDocsSupport {
    protected lateinit var mockMvc: MockMvc

    @BeforeEach
    fun setUp() { /* standaloneSetup + documentationConfiguration */ }

    abstract fun initController(): Any
}

// 사용 예
class OrderDocsTest : RestDocsSupport() {
    private val getOrderUseCase: GetOrderUseCase = mockk()
    override fun initController(): Any = OrderExternalController(getOrderUseCase)

    @Test
    fun `get order by id`() {
        every { getOrderUseCase(any()) } returns OrderResult(id = 1L, ...)
        mockMvc.perform(get("/api/v1/orders/{id}", 1L))
            .andExpect(status().isOk)
            .andDo(document("get-order-by-id",
                pathParameters("id" means "주문 ID"),
                responseCommonFieldsSubsection(),
                dataResponseFields(
                    "id" type NUMBER means "주문 ID" example "1",
                    "status" type ENUM(OrderStatus::class) means "주문 상태",
                    "createdAt" type DATETIME means "생성일시",
                ),
            ))
    }
}
```

---

## UseCase를 모킹한다 (Service가 아님)

항상 UseCase를 모킹한다 — 컨트롤러가 직접 의존하는 계층이다. 컨트롤러가 주입하지 않는 Service를 모킹하면 UseCase가 null이 되어 NPE가 발생한다.

```kotlin
// 좋은 예
private val getOrderUseCase: GetOrderUseCase = mockk()
override fun initController(): Any = OrderExternalController(getOrderUseCase)

// 나쁜 예 — getOrderUseCase가 null이 되어 런타임 NPE 발생
private val orderService: OrderService = mockk()
override fun initController(): Any = OrderExternalController(getOrderUseCase)
```

---

## DocsFieldType 참조

| 타입 | 용도 | 예시값 |
|------|------|--------|
| `STRING` | 텍스트 필드 | `"항공권"` |
| `NUMBER` | 정수 또는 소수 | `1`, `9900` |
| `BOOLEAN` | 참/거짓 플래그 | `true` |
| `ARRAY` | JSON 배열 | `[...]` |
| `OBJECT` | 중첩 JSON 객체 | `{...}` |
| `DATE` | 날짜만 (`yyyy-MM-dd`) | `"2024-01-15"` |
| `DATETIME` | 날짜·시간 (`yyyy-MM-dd'T'HH:mm:ss`) | `"2024-01-15T10:00:00"` |
| `ENUM(Class::class)` | 문서화된 값을 가진 Enum | `OrderStatus::class` |

---

## Field DSL 구문

```kotlin
"fieldName" type STRING means "필드 설명"
"fieldName" type STRING means "필드 설명" isOptional true
"fieldName" type NUMBER means "주문 ID" example "1"
"fieldName" type NUMBER means "페이지 번호" withDefaultValue "0"
"status" type ENUM(OrderStatus::class) means "주문 상태"
"desiredDate" type DATE means "희망 날짜" isOptional true example "2024-01-15"
```

---

## 응답 전략

| 응답 유형 | 메서드 조합 |
|-----------|-------------|
| 단건 객체 | `responseCommonFieldsSubsection()` + `dataResponseFields(...)` |
| 배열 | `responseArrayCommonFieldsSubsection()` + `dataResponseFields(...)` |
| 문자열 (DELETE) | `responseStringCommonFields()` |
| 페이징 | `responseCommonFieldsSubsection()` + `dataResponseFields(...)` + `pageRequestFormat()` + `pageCommonFormat()` |

페이징의 경우 요청 파라미터에 `queryParameters(pageRequestFormat())`를, `dataResponseFields(...)` 뒤에 페이지 메타데이터용 `pageCommonFormat()`을 추가한다.

---

## 테스트 메서드 네이밍

테스트 메서드 이름이 스니펫 디렉토리 이름이 된다. 설명적인 영어 구문을 사용한다 — "should" 접두사, "test" 접두사, camelCase를 사용하지 않는다.

```kotlin
fun `get order by id`() { }            // -> get-order-by-id/
fun `list orders with pagination`() { } // -> list-orders-with-pagination/
```

---

## 필드 설명은 한글로 작성한다

모든 필드 설명(`means "..."`)은 **반드시 한글로 작성한다**.

```kotlin
// 좋은 예
"id" type NUMBER means "주문 ID" example "1"
"status" type ENUM(OrderStatus::class) means "주문 상태"

// 나쁜 예
"id" type NUMBER means "Order ID"   // 영어 불가
```

---

## 빠른 참조

```kotlin
class {Feature}DocsTest : RestDocsSupport() {
    private val get{Feature}UseCase: Get{Feature}UseCase = mockk()
    override fun initController(): Any = {Feature}ExternalController(get{Feature}UseCase)

    @Test
    fun `{action} {feature}`() {
        every { get{Feature}UseCase(any()) } returns {stub}
        mockMvc.perform(get("/api/v1/{features}/{id}", 1L))
            .andExpect(status().isOk)
            .andDo(document("{action}-{feature}",
                responseCommonFieldsSubsection(),
                dataResponseFields("id" type NUMBER means "ID" example "1"),
            ))
    }
}
```

---

## 빌드 명령어

```bash
./gradlew clean :modules:docs:docs
./gradlew test --tests "{projectGroup}.docs.{Feature}DocsTest"
```
