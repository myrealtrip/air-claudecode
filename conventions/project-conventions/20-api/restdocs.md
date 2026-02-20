# REST Docs

## Core Rules

- Extend **`RestDocsSupport`** base class
- Mock the **Facade** (not Service)
- Use **`DocsFieldType`**: `STRING`, `NUMBER`, `BOOLEAN`, `DATE`, `DATETIME`, `ENUM(Class::class)`
- Use **Field DSL**: `"fieldName" type TYPE means "description"`
- Optional fields: `isOptional true`; examples: `example "value"`

## Response Patterns

| Type | Helper |
|------|--------|
| Single object | `responseCommonFieldsSubsection()` + `dataResponseFields()` |
| Array | `responseArrayCommonFieldsSubsection()` + `dataResponseFields()` |
| String (DELETE) | `responseStringCommonFields()` |
| Pagination | add `pageRequestFormat()` + `pageCommonFormat()` |

## Conventions

- **Field descriptions in Korean** (project convention)
- Test method names become snippet directories -- use clear English names
  - Good: `` `get holidays by year` `` → `get-holidays-by-year/`
  - Bad: `` `should return holidays` ``

## Build

- Generate docs: `./gradlew clean :modules:docs:docs`
- Run specific test: `./gradlew test --tests "...DocsTest"`
