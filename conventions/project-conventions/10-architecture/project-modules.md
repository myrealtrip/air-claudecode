# Project Modules

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        bootstrap                            │
│   ┌──────────────────────┐  ┌──────────────────────────┐   │
│   │   {name}-api-app     │  │   {name}-worker-app      │   │
│   │  Controller, Request, │  │  Scheduler, EventHandler │
│   │  Response             │  │                          │   │
│   └──────────┬───────────┘  └───────────┬──────────────┘   │
└──────────────┼──────────────────────────┼───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    infrastructure                            │
│    JPA Entity, Mapper, Repository, Cache, Redis, HTTP Client, │
│    Export, Slack                                              │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                       domain                                 │
│   Domain Model, Policy, Service, Event, UseCase,             │
│   Application Service, DTO                                    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    common / common-web                       │
│   Codes, Exceptions, Values, Utils, Filters, Handlers        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│   test-support (test classpath only)                         │
│   docs (REST Docs generation, compileOnly)                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Module Structure

```
modules/
├── common/                # Codes, Exceptions, Values, Utils, Extensions
├── common-web/            # Filters, Interceptors, ExceptionHandler, ApiResource
├── test-support/          # Test fixtures, REST Docs support
├── domain/                # Domain Model, Policy, Service, Event, UseCase, Application Service, DTO
├── infrastructure/        # JPA Entity, Mapper, Repository, Cache, Redis, RestClient, Export, Slack
├── bootstrap/
│   ├── {name}-api-app/    # API server (Controller, Request, Response)
│   └── {name}-worker-app/ # Worker server
└── docs/                  # REST Docs generation
```

---

## Module Naming

- `-app` suffix: Spring Boot executable (bootJar enabled)
- No suffix: Library module (jar only)

---

## Dependency Direction (unidirectional only)

```
bootstrap    →  domain, infrastructure, common-web
infrastructure  →  domain, common
domain       →  common (only)
common-web   →  common
common       →  nothing
test-support →  domain, common (test classpath)
docs         →  bootstrap, test-support (compileOnly)
```

Dependency rules -- prohibited directions:

| From | May NOT depend on |
|------|-------------------|
| `common` | any other module |
| `domain` | `infrastructure`, `bootstrap`, `common-web` |
| `infrastructure` | `bootstrap`, `common-web` |
| `common-web` | `domain`, `infrastructure`, `bootstrap` |

Within `domain`: Application DTO depends on Domain Model. Domain Model must NOT import DTO.

---

## DataSource Routing by Profile

`@Transactional(readOnly = true)` routes to Slave; `@Transactional` (write) routes to Master. Routing logic lives in `infrastructure/persistence/config/RoutingDataSource.kt`.

| Profile | DataSource |
|---------|-----------|
| `embed`, `local` | H2 in-memory (no routing) |
| `dev`, `test` | MySQL with `RoutingDataSource` Master/Slave |
| `stage`, `prod` | MySQL Master-Slave cluster with `RoutingDataSource` |

---

## HTTP Client Pattern

Use `@HttpExchange` interfaces registered via `@ImportHttpServices`.

```kotlin
@HttpExchange("/api/flights")
interface FlightClient {
    @GetExchange("/{id}")
    fun getFlight(@PathVariable id: Long): FlightResponse
}

@Configuration
@ImportHttpServices(FlightClient::class)
class FlightClientConfig {
    @Bean
    fun flightClientServiceProxyFactory(properties: FlightClientProperties): HttpServiceProxyFactory =
        HttpServiceProxyFactory.builderFor(RestClientAdapter.create(
            RestClient.builder().baseUrl(properties.baseUrl).build(),
        )).build()
}
```

---

## Creating a New Module

### New domain feature

1. Create package `{projectGroup}.domain.{feature}/` with sub-packages: `model/`, `policy/`, `service/`, `event/`, `usecase/`, `dto/`, `exception/`
2. Create `{Feature}Error.kt` (enum implementing `ResponseCode`)
3. Create `{Feature}Exception.kt` (base + `NotFoundException`, etc.)
4. Create Domain Model, Policy, UseCase, Application Service, and DTO classes

### New bootstrap app

```
bootstrap/{name}-api-app/
├── src/main/kotlin/{projectGroup}/{appname}/
│   ├── {AppName}Application.kt      # @SpringBootApplication, TimeZone.setDefault(UTC)
│   ├── presentation/external/{Feature}ExternalController.kt
│   ├── presentation/external/request/
│   ├── presentation/external/response/
│   └── config/WebConfig.kt
└── build.gradle.kts                 # bootJar enabled
```

```kotlin
@SpringBootApplication
class {AppName}Application

fun main(args: Array<String>) {
    TimeZone.setDefault(TimeZone.getTimeZone("UTC"))  // required in every bootstrap app
    runApplication<{AppName}Application>(*args)
}
```

---

## Response Format

All APIs use `ApiResource<T>` wrapping with `status`, `meta`, `data` fields.

```kotlin
ApiResource.success(data)
ApiResource.success(data, "처리가 완료되었습니다.")
```

---

## Exception Types

| Exception | Usage | Log Level |
|-----------|-------|-----------|
| `KnownException` | Expected errors (validation, not found) | INFO |
| `BizRuntimeException` | Business errors (unrecoverable) | ERROR |
| `BizException` | Checked business exceptions | ERROR |

---

## Caching Strategy (Two-Tier)

- L1: Caffeine (local, 200 items, 30min TTL)
- L2: Redis (distributed, configurable TTL)

| Cache Name | TTL |
|------------|-----|
| `SHORT_LIVED` | 10min |
| `DEFAULT` | 30min |
| `MID_LIVED` | 1h |
| `LONG_LIVED` | 24h |
