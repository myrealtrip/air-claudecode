# Request & Response Conventions

## Never Return Entities

- Never return JPA entities as API responses -- always convert to a response DTO
- Conversion flow: `Entity → {Feature}Info (domain) → {Feature}Dto (API response)`

## DTO Package Structure

- Separate into `dto/request/` and `dto/response/` packages
- Do NOT mix request/response DTOs in the same file
- Do NOT place DTOs inside `api/` package

## Naming Convention

| Type | Naming | Package |
|------|--------|---------|
| API Request | `{Action}{Feature}ApiRequest` | `dto/request/` |
| API Response | `{Feature}Dto` | `dto/response/` |
| Domain DTO | `{Feature}Info` | domain `dto/` |
| Domain Request | `Create{Feature}Request` | domain `dto/` |

## JsonFormat Use-Site Targets

| Target | Direction | Use case |
|--------|-----------|----------|
| `@param:JsonFormat` | Request (deserialization) | Constructor parameters |
| `@get:JsonFormat` | Response (serialization) | Getter formatting |
| `@field:JsonFormat` | Both directions | Field-level for both |

- Using `@param` on response or `@get` on request **will not work**
