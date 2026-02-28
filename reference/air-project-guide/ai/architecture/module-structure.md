---
description: Package structure, layer dependency rules
keywords: [package, layer, module, dependency, domain, infrastructure, adapter]
---

# Module Architecture

## Layer Dependency (top → bottom only)

```
presentation  →  application  →  domain  ←  infrastructure
                                    ↑
              configuration, support (accessible from all layers)
```

| Layer | Role | Depends On |
|---|---|---|
| `presentation` | HTTP request/response | `application` |
| `application` | Business logic orchestration | `domain`, `infrastructure` |
| `domain` | Domain models, business rules | nothing |
| `infrastructure` | External systems (DB, API, events) | `domain` |
| `configuration` | Spring config, exception handlers | all layers |
| `support` | Utilities, enums, shared models | nothing |

## Package Structure

```
{module}/src/main/kotlin/com/myrealtrip/air/{module}/
├── presentation/
│   ├── external/              # Public API (request/, response/)
│   └── internal/
│       ├── admin/             # Admin API (request/, response/)
│       └── proxy/             # Internal proxy API (request/, response/)
├── application/
│   ├── usecase/               # Single business flow
│   ├── service/               # Composite logic
│   └── dto/
│       ├── command/           # Input DTO
│       └── result/            # Output DTO
├── domain/                    # Domain models
├── infrastructure/
│   ├── client/                # External API clients
│   ├── event/                 # Event publish/subscribe
│   └── persistence/           # entity/, repository/
├── configuration/             # properties/, exception/
└── support/                   # annotation/, aop/, enums/, exception/,
                               # filter/, interceptor/, model/, utils/
```

## Layer Roles

### Application — UseCase vs Service

| Aspect | UseCase | Service |
|---|---|---|
| Responsibility | Single business flow | Composite logic, combines multiple UseCases |
| Naming | `{Verb}{Noun}UseCase` | `{Noun}Service` |
| Transaction | Single transaction unit | May combine multiple transactions |

### Infrastructure

- `client/`: External API clients (`RestClient` + `ObservationRegistry`)
- `event/`: Domain event publish/subscribe
- `persistence/`: JPA entities and repositories. Separated from domain models.

## DTO Flow

```
request → Command.of(request) → command → result → Response.of(result) → response
```

| Stage | DTO | Location | Role |
|---|---|---|---|
| 1 | `request` | `presentation/{scope}/request/` | HTTP request binding |
| 2 | `command` | `application/dto/command/` | Business logic input |
| 3 | `result` | `application/dto/result/` | Business logic output |
| 4 | `response` | `presentation/{scope}/response/` | HTTP response serialization |

**Rule**: When passing 3+ parameters to a lower layer, wrap them in a `data class`. Allow individual args only for ≤2 parameters.

## Dependency Rules

1. **Unidirectional**: Dependencies flow top-down only. Lower layers MUST NOT reference upper layers.
2. **Domain independence**: `domain` layer depends on nothing.
3. **DTO isolation**: Each layer uses its own DTOs. Presentation request/response MUST NOT be passed directly to application layer.
4. **Infrastructure inversion**: `infrastructure` implements `domain` interfaces. `domain` MUST NOT depend on `infrastructure`.
5. **Support universality**: `support` is accessible from all layers. `support` MUST NOT reference other layers.
