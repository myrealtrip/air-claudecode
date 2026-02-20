# Project Modules

## Module Structure

```
modules/
├── common/                # Codes, Exceptions, Values, Utils, Extensions
├── common-web/            # Filters, Interceptors, ExceptionHandler, ApiResource
├── test-support/          # Test fixtures, REST Docs support
├── domain/                # Entity, Repository, Service, Application, DTO
├── infrastructure/        # JPA Config, Cache, Redis, RestClient, Export, Slack
├── bootstrap/
│   ├── {name}-api-app/    # API server (Controller, Facade)
│   └── {name}-worker-app/ # Worker server
└── docs/                  # REST Docs generation
```

## Module Naming

- `-app` suffix: Spring Boot executable (bootJar enabled)
- No suffix: Library module (jar only)

## Dependency Direction (unidirectional only)

```
bootstrap → domain, infrastructure, common-web
infrastructure → domain, common
domain → common (only)
common → nothing
```

- Within domain: DTO → Entity (Entity must NOT import DTO)

## Package Convention

- Domain: `{projectGroup}.domain.{feature}/{dto,entity,repository,service,application}/`
- Bootstrap: `{projectGroup}.{appname}/{api,dto/request,dto/response,facade,config}/`

## Response Format

All APIs use `ApiResource<T>` wrapping with `status`, `meta`, `data` fields.

## Exception Types

| Exception | Usage | Log Level |
|-----------|-------|-----------|
| `KnownException` | Expected errors (validation, not found) | INFO |
| `BizRuntimeException` | Business errors (unrecoverable) | ERROR |
| `BizException` | Checked business exceptions | ERROR |

## DataSource Routing

- `embed/local`: H2 in-memory (single pool)
- `dev/test/stage/prod`: MySQL Master-Slave via `RoutingDataSource`
- `@Transactional(readOnly = true)` routes to Slave, otherwise Master

## Caching (Two-Tier)

- L1: Caffeine (local, 200 items, 30min TTL)
- L2: Redis (distributed, configurable TTL)

| Cache Name | TTL |
|------------|-----|
| `SHORT_LIVED` | 10min |
| `DEFAULT` | 30min |
| `MID_LIVED` | 1h |
| `LONG_LIVED` | 24h |

## HTTP Client Pattern

Use `@HttpExchange` interfaces with `@ImportHttpServices` configuration.
