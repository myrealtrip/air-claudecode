# Controller Design

## URL Design

- All paths start with `/api/v1/`
- **kebab-case** for all URL segments (not camelCase or snake_case)
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
- Inject **Facade only** (or Application for trivially simple pass-through cases)
- Use `@Valid @RequestBody` for request DTOs
- Use `toDomainRequest()` on request DTO for conversion logic
- Add `@Validated` when using constraint annotations on parameters

## Search Endpoints

- 1-2 filters: use `@RequestParam` directly
- 3+ filters: encapsulate in `{Feature}SearchCondition` object
- Use `SearchDates` for date range fields

## DateTime

- All datetime inputs must be **UTC**
- KST conversion only in Facade or Response DTO (`.toKst()`)
- Convert KST input to UTC in request DTO's `toDomainRequest()`
