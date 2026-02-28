---
name: xsd-to-kotlin
description: Convert XSD schema files to Kotlin data classes with Jackson XML annotations for SOAP API serialization/deserialization
model: opus
argument-hint: "[xsd-file-path] [output-package-or-file]"
---

# XSD to Kotlin Data Class Converter

Convert XML Schema Definition (XSD) files into Kotlin data classes with Jackson 3 (tools.jackson) XML annotations for SOAP/XML serialization and deserialization.

## Jackson 3 (tools.jackson) Requirement

This skill targets **Jackson 3.x** (`tools.jackson` package), NOT Jackson 2.x (`com.fasterxml.jackson`).

Jackson 3 moved XML-specific annotations to the `tools.jackson.dataformat.xml.annotation` package. However, some general annotations like `@JsonRootName` and `@JsonPropertyOrder` remain in the `com.fasterxml.jackson.annotation` package for backward compatibility. Always use the correct package for each annotation:

| Annotation | Package (Jackson 3) |
|---|---|
| `@JsonRootName` | `com.fasterxml.jackson.annotation` |
| `@JsonPropertyOrder` | `com.fasterxml.jackson.annotation` |
| `@JacksonXmlProperty` | `tools.jackson.dataformat.xml.annotation` |
| `@JacksonXmlElementWrapper` | `tools.jackson.dataformat.xml.annotation` |

When reading `ObjectMapper` usage in the project, expect `tools.jackson.databind.ObjectMapper` (Jackson 3), not `com.fasterxml.jackson.databind.ObjectMapper` (Jackson 2).

## Use When

- User provides an XSD file and wants Kotlin data classes generated
- User needs request/response models for a SOAP API
- User wants to convert XML schema types to Kotlin with Jackson annotations
- Keywords: "xsd", "xsd to kotlin", "xml schema", "soap model", "data class from xsd", "xsd 변환", "xsd 코틀린", "스키마 변환", "xml 스키마"

## Do Not Use When

- User wants JSON schema conversion (not XML/XSD)
- User needs runtime XML parsing logic (this skill only generates model classes)
- User wants JAXB annotations instead of Jackson

## Steps

### 1. Gather Context

Ask the user for any missing information:

- **XSD file path** — the `.xsd` file to convert
- **Output location** — target Kotlin package and file path
- **Suffix convention** — optional class name suffix for versioning (e.g., `24` for v24 API)
- **Root class role** — whether the root class should implement an interface (e.g., `AmadeusRequest`)

If the project already has similar generated classes, read one to detect conventions automatically.

### 2. Analyze the XSD

Read the XSD file and extract the full type graph:

1. **Identify the root element** — find the top-level `<xs:element>` with its `type` attribute
2. **Map all complex types** — for each `<xs:complexType>`, record:
   - Type name
   - All child `<xs:element>` entries with: `name`, `type`, `minOccurs`, `maxOccurs`
   - All `<xs:attribute>` entries
3. **Resolve type references** — follow `type="..."` references to build the full dependency tree
4. **Detect list fields** — any element with `maxOccurs > 1` or `maxOccurs="unbounded"` must be `List<T>`
5. **Detect optional fields** — any element with `minOccurs="0"` must be nullable (`?`)
6. **Map simple types** — resolve `<xs:simpleType>` restrictions to Kotlin primitives

### 3. Apply Type Mapping Rules

| XSD Type | Kotlin Type |
|---|---|
| `xs:string`, named string types (`AlphaNumericString_Length1To*`, etc.) | `String` |
| `xs:integer`, `xs:int`, `xs:short`, `xs:long`, named numeric types (`NumericInteger_Length1To*`, etc.) | `Int` (or `Long` for large ranges) |
| `xs:decimal`, `xs:float`, `xs:double` | `String` (preserve precision for monetary values) |
| `xs:boolean` | `Boolean` |
| Complex type reference | Corresponding Kotlin data class |
| Element with `maxOccurs > 1` | `List<T>` |
| Element with `minOccurs="0"` | Nullable (`?`) |

### 4. Generate Kotlin Data Classes

Generate **all data classes in a single file** as top-level classes (not inner/nested classes).

#### Root Class

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
) : SomeInterface {  // if applicable
    // interface properties
}
```

#### Supporting Classes

```kotlin
data class ChildType(
    @JacksonXmlProperty(localName = "elementName")
    val elementName: String?,

    @JacksonXmlProperty(localName = "listElement")
    @JacksonXmlElementWrapper(useWrapping = false)
    val listElement: List<SubType>?,
)
```

#### Annotation Rules

| Rule | Annotation | When |
|---|---|---|
| Every field | `@JacksonXmlProperty(localName = "xmlElementName")` | Always — maps Kotlin field to XML element name |
| List fields | `@JacksonXmlElementWrapper(useWrapping = false)` | When `maxOccurs > 1` — prevents Jackson from adding a wrapper element |
| Root class | `@JsonRootName(value, namespace)` | On the root element class only |
| Root class | `@JsonPropertyOrder(value = [...])` | On the root element class — preserves XSD element order |

#### Required Imports

```kotlin
import com.fasterxml.jackson.annotation.JsonPropertyOrder
import com.fasterxml.jackson.annotation.JsonRootName
import tools.jackson.dataformat.xml.annotation.JacksonXmlElementWrapper
import tools.jackson.dataformat.xml.annotation.JacksonXmlProperty
```

> **Note:** `@JsonRootName` and `@JsonPropertyOrder` come from `com.fasterxml.jackson.annotation`, while `@JacksonXmlProperty` and `@JacksonXmlElementWrapper` come from `tools.jackson.dataformat.xml.annotation`. Do NOT mix these up.

#### Naming Conventions

- **Class names**: PascalCase matching the XSD type name, with optional version suffix (e.g., `NumberOfUnit24`)
- **Field names**: camelCase matching the XSD element name
- **List field names**: use plural form if the XML element name is singular (e.g., `itinerary` → `itineraries`)
- **Suffix**: if a suffix is used (e.g., `24`), apply it to ALL classes in the file consistently

#### Structural Rules

- **One file, all classes**: every data class goes in the same file as top-level declarations
- **No business logic**: no companion objects, factory methods, or extension functions — pure data classes only
- **No type reuse**: do not import or reference data classes from other files/packages — define everything locally
- **Nullable by default**: if `minOccurs` is `0` or not specified, make the field nullable
- **Required fields**: only make fields non-nullable when `minOccurs >= 1`
- **Section comments**: use `// ─── Section Name ───` comments to organize related classes

### 5. Validate maxOccurs Accuracy

After generating, perform a systematic cross-check:

1. Search the XSD for ALL elements with `maxOccurs` > 1
2. For each, find the corresponding Kotlin field
3. Verify it is typed as `List<T>` with `@JacksonXmlElementWrapper(useWrapping = false)`
4. Fix any mismatches — this is the most common source of deserialization errors

### 6. Verify Compilation

Run the project's compile task to confirm no syntax or type errors:

```bash
./gradlew compileKotlin
```

Fix any compilation errors before finishing.

## Common Pitfalls

| Pitfall | Description | Fix |
|---|---|---|
| Missing `@JacksonXmlElementWrapper` | List fields serialize with extra wrapper element | Always add `useWrapping = false` on List fields |
| Single object for maxOccurs > 1 | XSD allows multiple elements but Kotlin uses single object | Change to `List<T>` — most common deserialization error |
| Wrong import package | Mixing `com.fasterxml.jackson` with `tools.jackson` | `@JsonRootName`/`@JsonPropertyOrder` → `com.fasterxml.jackson.annotation`, `@JacksonXmlProperty`/`@JacksonXmlElementWrapper` → `tools.jackson.dataformat.xml.annotation` |
| Missing namespace on root | Root class needs namespace for SOAP envelope parsing | Add `namespace` parameter to `@JsonRootName` |
| Non-nullable optional field | XSD `minOccurs="0"` mapped as non-nullable | Always use `?` for optional fields |

## Checklist

- [ ] XSD file fully analyzed — all complex types and elements identified
- [ ] Root class has `@JsonRootName` with correct `value` and `namespace`
- [ ] Root class has `@JsonPropertyOrder` matching XSD element order
- [ ] Every field has `@JacksonXmlProperty(localName = "...")`
- [ ] Every `List<T>` field has `@JacksonXmlElementWrapper(useWrapping = false)`
- [ ] All `maxOccurs > 1` elements are `List<T>` (cross-checked against XSD)
- [ ] All `minOccurs="0"` elements are nullable (`?`)
- [ ] All classes are top-level in a single file (no inner/nested classes)
- [ ] No type reuse from other packages — all types defined locally
- [ ] Version suffix applied consistently to all class names (if applicable)
- [ ] Compilation succeeds with `./gradlew compileKotlin`
