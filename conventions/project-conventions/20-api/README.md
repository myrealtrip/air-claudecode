# API Layer Conventions

## URL Design

- All paths start with `/api/v1/`
- **kebab-case** for all URL segments
- **Plural nouns** for resource names (`/users`, `/orders`)
- Use nouns, not verbs; max 3 levels of nesting
- Non-CRUD actions as sub-paths: `POST /api/v1/orders/{id}/cancel`

## Response Format

- All controllers return `ResponseEntity<ApiResource<T>>`
- `ApiResource.success(data)` for single objects
- `ApiResource.ofPage(page)` for paginated results
- `ApiResource.success()` for DELETE/void operations
- Default pageable: `Pageable.ofSize(100)`

## Controller Structure

- **7 lines or fewer** per method -- controllers handle HTTP routing only
- Inject **Facade only** (or Application for trivially simple pass-through)
- Use `@Valid @RequestBody` for request DTOs
- Use `toDomainRequest()` on request DTO for conversion
- Add `@Validated` when using constraint annotations on parameters

## Search Endpoints

- 1-2 filters: use `@RequestParam` directly
- 3+ filters: encapsulate in `{Feature}SearchCondition` object
- Use `SearchDates` for date range fields

## Request & Response DTOs

### Package Structure

- Separate into `dto/request/` and `dto/response/` packages
- Do NOT mix request/response DTOs in the same file
- Do NOT place DTOs inside `api/` package

### Naming Convention

| Type | Naming | Package |
|------|--------|---------|
| API Request | `{Action}{Feature}ApiRequest` | `dto/request/` |
| API Response | `{Feature}Dto` | `dto/response/` |
| Domain DTO | `{Feature}Info` | domain `dto/` |
| Domain Request | `Create{Feature}Request` | domain `dto/` |

### JsonFormat Use-Site Targets

| Target | Direction | Use case |
|--------|-----------|----------|
| `@param:JsonFormat` | Request (deserialization) | Constructor parameters |
| `@get:JsonFormat` | Response (serialization) | Getter formatting |
| `@field:JsonFormat` | Both directions | Field-level for both |

- `@param` on response or `@get` on request **will not work**

## REST Docs

- Extend **`RestDocsSupport`** base class
- Mock the **Facade** (not Service)
- Use **`DocsFieldType`**: `STRING`, `NUMBER`, `BOOLEAN`, `DATE`, `DATETIME`, `ENUM(Class::class)`
- Use **Field DSL**: `"fieldName" type TYPE means "description"`
- **Field descriptions in Korean** (project convention)
- Test method names become snippet directories -- use clear English names
  - Good: `` `get holidays by year` `` → `get-holidays-by-year/`
  - Bad: `` `should return holidays` ``

### Response Patterns

| Type | Helper |
|------|--------|
| Single object | `responseCommonFieldsSubsection()` + `dataResponseFields()` |
| Array | `responseArrayCommonFieldsSubsection()` + `dataResponseFields()` |
| String (DELETE) | `responseStringCommonFields()` |
| Pagination | add `pageRequestFormat()` + `pageCommonFormat()` |

### Build

- Generate docs: `./gradlew clean :modules:docs:docs`
- Run specific test: `./gradlew test --tests "...DocsTest"`
