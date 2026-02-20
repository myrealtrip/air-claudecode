# Architecture & Module Structure

## Module Layout

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

## 4-Layer Structure

```
Controller (bootstrap) → Facade (bootstrap)
  → QueryApplication / CommandApplication (domain)
    → Service (domain)
      → JpaRepository / QueryRepository (domain)
```

Upper layers depend on lower layers only. Reverse dependencies prohibited.

## Layer Responsibilities

| Layer | Class | Annotation | Injects | Prohibited |
|-------|-------|------------|---------|------------|
| Bootstrap | Controller | `@RestController` | Facade only | Service, Application, Repository |
| Bootstrap | Facade | `@Component` | Application only | Service, Repository |
| Domain | QueryApplication | `@Service`, `@Transactional(readOnly = true)` | Service only | Repository, other Application |
| Domain | CommandApplication | `@Service`, `@Transactional` | Service only | Repository, other Application |
| Domain | Service | `@Service` | Repository | (other Services OK) |
| Domain | Repository | `@Repository` | - | - |

## Transaction Ownership

| Layer | Transaction |
|-------|-------------|
| Controller / Facade | None |
| QueryApplication | `@Transactional(readOnly = true)` |
| CommandApplication | `@Transactional` |
| Service | None (propagated from Application) |

## DTO Flow

```
API Request → Controller converts → Domain Request
  → Service creates/queries Entity → {Feature}Info.from(entity)
    → Facade converts → API Response DTO → ApiResource.success()
```

## Cross-Domain Orchestration

- **Facade → multiple Applications**: Separate transactions per call (independent reads)
- **Application → multiple Services**: Single atomic transaction (write operations)

## Package Convention

- Domain: `{projectGroup}.domain.{feature}/{dto,entity,repository,service,application}/`
- Bootstrap: `{projectGroup}.{appname}/{api,dto/request,dto/response,facade,config}/`

## Anti-Patterns

- Calling Service directly from Controller (bypasses Facade)
- Returning Entity as API response (expose via Info → Dto)
- Business logic in Application (belongs in Service)
- `@Transactional` on Service (manage in Application only)
- `entity.toInfo()` (reversed dependency -- use `Info.from(entity)`)
- Application injecting another Application (use Services instead)
