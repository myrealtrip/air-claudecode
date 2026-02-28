# Architecture & Module Structure

## Module Layout

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

- `-app` suffix: Spring Boot executable (bootJar enabled)
- No suffix: Library module (jar only)

## Dependency Direction (unidirectional only)

```
bootstrap → domain, infrastructure, common-web
infrastructure → domain, common
domain → common (only)
common → nothing
```

- Within domain: Application DTO → Domain Model (Domain Model must NOT import DTO)

## 4-Layer Structure

```
Controller (bootstrap) → UseCase (domain)
  → Application Service (domain)
    → Domain Model / Policy / Service (domain)
      ← JPA Entity / Repository / Mapper (infrastructure)
```

Upper layers depend on lower layers only. Infrastructure depends on Domain. Reverse dependencies prohibited.

## Layer Responsibilities

| Layer | Class | Annotation | Injects | Prohibited |
|-------|-------|------------|---------|------------|
| Presentation | Controller | `@RestController` | UseCase only | Service, Repository, Infrastructure |
| Application | UseCase | `@Service`, `@Transactional` | Application Service, Domain Policy/Service, EventPublisher | Repository, other UseCase |
| Application | Application Service | `@Service` | Repository, Mapper | other Application Service |
| Domain | Policy | `@Component` | Domain components only | Repository, Infrastructure |
| Domain | Domain Service | `@Component` | Domain components only | Repository, Infrastructure |
| Infrastructure | Repository | `@Repository` | - | - |
| Infrastructure | Mapper | `@Component` | - | - |

## Transaction Ownership

| Layer | Transaction |
|-------|-------------|
| Controller | None |
| UseCase (read) | `@Transactional(readOnly = true)` |
| UseCase (write) | `@Transactional` |
| Application Service | None (propagated from UseCase) |

## DTO Flow

```
API Request → Controller converts → Command (Application)
  → Application Service creates/queries Domain Model → {Feature}Result (Application)
    → Controller converts → Response (Presentation) → ApiResource.success()
```

## Cross-Domain Orchestration

- **UseCase → multiple Application Services**: Single atomic transaction (write operations)
- **UseCase → Event → Listener**: Eventual consistency (cross-domain side effects)

## Package Convention

- Domain: `{projectGroup}.{appname}/{domain/model,domain/policy,domain/service,domain/event,application/usecase,application/service,application/dto}/`
- Presentation: `{projectGroup}.{appname}/{presentation/external,presentation/internal}/`
- Infrastructure: `{projectGroup}.{appname}/{infrastructure/persistence,infrastructure/client,infrastructure/event}/`

## Anti-Patterns

- Calling Service directly from Controller (bypasses UseCase)
- Returning JPA Entity as API response (expose via Domain Model → Result → Response)
- Business logic in UseCase (belongs in Domain Policy/Service)
- `@Transactional` on Application Service (manage in UseCase only)
- JPA annotations on Domain Model (separate Domain Model and JPA Entity)
- UseCase injecting another UseCase (use Application Services instead)
