# XSD to Kotlin Data Class Converter

XML Schema Definition(XSD) 파일을 SOAP/XML 직렬화 및 역직렬화를 위한 Jackson 3(tools.jackson) XML 어노테이션이 적용된 Kotlin data class로 변환합니다.

## Jackson 3 (tools.jackson) 요구사항

이 스킬은 **Jackson 3.x** (`tools.jackson` 패키지)를 대상으로 하며, Jackson 2.x (`com.fasterxml.jackson`)가 아닙니다.

Jackson 3에서 XML 전용 어노테이션이 `tools.jackson.dataformat.xml.annotation` 패키지로 이동했습니다. 그러나 `@JsonRootName`과 `@JsonPropertyOrder` 같은 일부 일반 어노테이션은 하위 호환성을 위해 `com.fasterxml.jackson.annotation` 패키지에 유지됩니다. 각 어노테이션에 올바른 패키지를 항상 사용하세요:

| 어노테이션 | 패키지 (Jackson 3) |
|---|---|
| `@JsonRootName` | `com.fasterxml.jackson.annotation` |
| `@JsonPropertyOrder` | `com.fasterxml.jackson.annotation` |
| `@JacksonXmlProperty` | `tools.jackson.dataformat.xml.annotation` |
| `@JacksonXmlElementWrapper` | `tools.jackson.dataformat.xml.annotation` |

프로젝트에서 `ObjectMapper` 사용을 읽을 때, `com.fasterxml.jackson.databind.ObjectMapper`(Jackson 2)가 아닌 `tools.jackson.databind.ObjectMapper`(Jackson 3)를 예상하세요.

## 사용 시점

- 사용자가 XSD 파일을 제공하고 Kotlin data class 생성을 원할 때
- SOAP API의 요청/응답 모델이 필요할 때
- XML 스키마 타입을 Jackson 어노테이션이 포함된 Kotlin으로 변환하려 할 때
- 키워드: "xsd", "xsd to kotlin", "xml schema", "soap model", "data class from xsd", "xsd 변환", "xsd 코틀린", "스키마 변환", "xml 스키마"

## 사용하지 않을 때

- JSON 스키마 변환이 필요한 경우 (XML/XSD가 아님)
- 런타임 XML 파싱 로직이 필요한 경우 (이 스킬은 모델 클래스만 생성)
- Jackson 대신 JAXB 어노테이션을 원하는 경우

## 단계

### 1. 컨텍스트 수집

사용자에게 누락된 정보를 요청합니다:

- **XSD 파일 경로** -- 변환할 `.xsd` 파일
- **출력 위치** -- 대상 Kotlin 패키지와 파일 경로
- **접미사 규칙** -- 버전 관리를 위한 선택적 클래스 이름 접미사 (예: v24 API용 `24`)
- **루트 클래스 역할** -- 루트 클래스가 인터페이스를 구현해야 하는지 (예: `AmadeusRequest`)

프로젝트에 유사하게 생성된 클래스가 이미 있으면, 하나를 읽어 컨벤션을 자동으로 감지합니다.

### 2. XSD 분석

XSD 파일을 읽고 전체 타입 그래프를 추출합니다:

1. **루트 요소 식별** -- `type` 속성이 있는 최상위 `<xs:element>` 찾기
2. **모든 복합 타입 매핑** -- 각 `<xs:complexType>`에 대해 기록:
   - 타입 이름
   - 모든 하위 `<xs:element>` 항목: `name`, `type`, `minOccurs`, `maxOccurs`
   - 모든 `<xs:attribute>` 항목
3. **타입 참조 해석** -- `type="..."` 참조를 따라가며 전체 의존성 트리 구축
4. **리스트 필드 감지** -- `maxOccurs > 1` 또는 `maxOccurs="unbounded"`인 요소는 반드시 `List<T>`
5. **옵셔널 필드 감지** -- `minOccurs="0"`인 요소는 반드시 nullable (`?`)
6. **단순 타입 매핑** -- `<xs:simpleType>` 제한을 Kotlin 기본 타입으로 해석

### 3. 타입 매핑 규칙 적용

| XSD 타입 | Kotlin 타입 |
|---|---|
| `xs:string`, 이름이 있는 문자열 타입 (`AlphaNumericString_Length1To*` 등) | `String` |
| `xs:integer`, `xs:int`, `xs:short`, `xs:long`, 이름이 있는 숫자 타입 (`NumericInteger_Length1To*` 등) | `Int` (큰 범위는 `Long`) |
| `xs:decimal`, `xs:float`, `xs:double` | `String` (금액 값의 정밀도 보존) |
| `xs:boolean` | `Boolean` |
| 복합 타입 참조 | 대응하는 Kotlin data class |
| `maxOccurs > 1`인 요소 | `List<T>` |
| `minOccurs="0"`인 요소 | Nullable (`?`) |

### 4. Kotlin Data Class 생성

**모든 data class를 단일 파일에** 최상위 클래스로 생성합니다 (inner/nested 클래스 아님).

#### 루트 클래스

```kotlin
@JsonRootName(
    value = "XML_Element_Name",
    namespace = "http://xml.example.com/NAMESPACE",
)
@JsonPropertyOrder(
    value = ["field1", "field2", "field3"],
)
data class RootClassName(
    @JacksonXmlProperty(localName = "field1")
    val field1: ChildType?,

    @JacksonXmlProperty(localName = "field2")
    @JacksonXmlElementWrapper(useWrapping = false)
    val field2: List<ChildType>?,
) : SomeInterface {  // 해당하는 경우
    // 인터페이스 속성
}
```

#### 하위 클래스

```kotlin
data class ChildType(
    @JacksonXmlProperty(localName = "elementName")
    val elementName: String?,

    @JacksonXmlProperty(localName = "listElement")
    @JacksonXmlElementWrapper(useWrapping = false)
    val listElement: List<SubType>?,
)
```

#### 어노테이션 규칙

| 규칙 | 어노테이션 | 시점 |
|---|---|---|
| 모든 필드 | `@JacksonXmlProperty(localName = "xmlElementName")` | 항상 -- Kotlin 필드를 XML 요소 이름에 매핑 |
| List 필드 | `@JacksonXmlElementWrapper(useWrapping = false)` | `maxOccurs > 1`일 때 -- Jackson이 래퍼 요소를 추가하는 것을 방지 |
| 루트 클래스 | `@JsonRootName(value, namespace)` | 루트 요소 클래스에만 |
| 루트 클래스 | `@JsonPropertyOrder(value = [...])` | 루트 요소 클래스에 -- XSD 요소 순서 유지 |

#### 필수 import

```kotlin
import com.fasterxml.jackson.annotation.JsonPropertyOrder
import com.fasterxml.jackson.annotation.JsonRootName
import tools.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper
import tools.jackson.dataformat.xml.annotation.JacksonXmlProperty
```

> **참고:** `@JsonRootName`과 `@JsonPropertyOrder`는 `com.fasterxml.jackson.annotation`에서, `@JacksonXmlProperty`와 `@JacksonXmlElementWrapper`는 `tools.jackson.dataformat.xml.annotation`에서 가져옵니다. 이것을 혼동하지 마세요.

#### 네이밍 규칙

- **클래스 이름**: XSD 타입 이름에 맞는 PascalCase, 선택적 버전 접미사 (예: `NumberOfUnit24`)
- **필드 이름**: XSD 요소 이름에 맞는 camelCase
- **List 필드 이름**: XML 요소 이름이 단수형이면 복수형 사용 (예: `itinerary` → `itineraries`)
- **접미사**: 접미사를 사용하면 (예: `24`) 파일의 모든 클래스에 일관되게 적용

#### 구조 규칙

- **하나의 파일, 모든 클래스**: 모든 data class를 같은 파일에 최상위 선언으로 배치
- **비즈니스 로직 없음**: companion object, factory method, 확장 함수 없음 -- 순수 data class만
- **타입 재사용 없음**: 다른 파일/패키지의 data class를 import하거나 참조하지 않음 -- 모든 것을 로컬에 정의
- **기본 nullable**: `minOccurs`가 `0`이거나 명시되지 않으면 필드를 nullable로
- **필수 필드**: `minOccurs >= 1`일 때만 필드를 non-nullable로
- **섹션 주석**: `// ─── Section Name ───` 주석으로 관련 클래스를 구분

### 5. maxOccurs 정확성 검증

생성 후, 체계적인 교차 확인을 수행합니다:

1. XSD에서 `maxOccurs` > 1인 모든 요소를 검색
2. 각각에 대해 대응하는 Kotlin 필드를 찾음
3. `List<T>` 타입이며 `@JacksonXmlElementWrapper(useWrapping = false)`가 있는지 확인
4. 불일치 수정 -- 이것이 역직렬화 오류의 가장 흔한 원인

### 6. 컴파일 확인

구문이나 타입 오류가 없는지 프로젝트의 컴파일 작업을 실행합니다:

```bash
./gradlew compileKotlin
```

완료 전에 모든 컴파일 오류를 수정합니다.

## 자주 발생하는 실수

| 실수 | 설명 | 해결 |
|---|---|---|
| `@JacksonXmlElementWrapper` 누락 | List 필드가 추가 래퍼 요소와 함께 직렬화됨 | List 필드에 항상 `useWrapping = false` 추가 |
| maxOccurs > 1에 단일 객체 | XSD는 여러 요소를 허용하지만 Kotlin은 단일 객체 사용 | `List<T>`로 변경 -- 가장 흔한 역직렬화 오류 |
| 잘못된 import 패키지 | `com.fasterxml.jackson`과 `tools.jackson` 혼용 | `@JsonRootName`/`@JsonPropertyOrder` → `com.fasterxml.jackson.annotation`, `@JacksonXmlProperty`/`@JacksonXmlElementWrapper` → `tools.jackson.dataformat.xml.annotation` |
| 루트에 namespace 누락 | SOAP 엔벨로프 파싱에 루트 클래스의 namespace 필요 | `@JsonRootName`에 `namespace` 파라미터 추가 |
| Non-nullable 옵셔널 필드 | XSD `minOccurs="0"`이 non-nullable로 매핑됨 | 옵셔널 필드에 항상 `?` 사용 |

## 체크리스트

- [ ] XSD 파일 전체 분석 -- 모든 복합 타입과 요소 식별
- [ ] 루트 클래스에 올바른 `value`와 `namespace`로 `@JsonRootName` 적용
- [ ] 루트 클래스에 XSD 요소 순서에 맞는 `@JsonPropertyOrder` 적용
- [ ] 모든 필드에 `@JacksonXmlProperty(localName = "...")` 적용
- [ ] 모든 `List<T>` 필드에 `@JacksonXmlElementWrapper(useWrapping = false)` 적용
- [ ] 모든 `maxOccurs > 1` 요소가 `List<T>`인지 교차 확인
- [ ] 모든 `minOccurs="0"` 요소가 nullable (`?`)인지 확인
- [ ] 모든 클래스가 단일 파일에 최상위로 배치 (inner/nested 클래스 없음)
- [ ] 다른 패키지에서 타입 재사용 없음 -- 모든 타입 로컬에 정의
- [ ] 버전 접미사가 모든 클래스 이름에 일관되게 적용 (해당하는 경우)
- [ ] `./gradlew compileKotlin`으로 컴파일 성공
