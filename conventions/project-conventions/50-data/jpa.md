# JPA & Hibernate

## Core Principles

- Extend **BaseEntity** (full auditing) or **BaseTimeEntity** (timestamps only)
- Always use `@Enumerated(EnumType.STRING)` -- never ORDINAL
- Always use `FetchType.LAZY` for all associations
- Always specify `@Table(name = "xxx")`

## Base Entity Structure

```kotlin
@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class BaseTimeEntity {

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    lateinit var createdAt: LocalDateTime
        protected set

    @LastModifiedDate
    @Column(name = "modified_at", nullable = false)
    lateinit var modifiedAt: LocalDateTime
        protected set
}

@MappedSuperclass
@EntityListeners(AuditingEntityListener::class)
abstract class BaseEntity : BaseTimeEntity() {

    @CreatedBy
    @Column(name = "created_by", nullable = false, updatable = false, length = 50)
    lateinit var createdBy: String
        protected set

    @LastModifiedBy
    @Column(name = "modified_by", nullable = false, length = 50)
    lateinit var modifiedBy: String
        protected set
}
```

## Entity Structure

- `@Entity` + `@Table(name = "xxx")` + extend `BaseEntity`/`BaseTimeEntity`
- Use `val` for immutable fields (`id`), `var` for mutable fields
- Domain enums must implement `CommonCode`
- Mutations via `update()` method, factory via `create()` companion
- **Entity must NOT import DTO** -- dependency direction: DTO depends on Entity

## Association Policy

| Rule | Description |
|------|-------------|
| **Default** | Do NOT map entity associations -- store FK as plain ID value |
| **Exception** | Unidirectional only, when absolutely necessary |
| **Prohibited** | Bidirectional associations are strictly forbidden |
| **Querying** | Use QueryDSL for joining related data |

## Fetch Strategies

- **LAZY**: Always use -- load on access
- **EAGER**: Never use -- loads unnecessary data
- Solve LazyInitializationException by fetching as DTO via QueryDSL
- Solve N+1 with QueryDSL JOIN

## Locking

| Strategy | Use case |
|----------|----------|
| **Optimistic** (`@Version`) | Low contention, read-heavy scenarios |
| **Pessimistic** (`@Lock`) | High contention, critical sections |

## Configuration

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: none              # never auto-generate DDL in production
    open-in-view: false            # disable OSIV (mandatory)
    properties:
      hibernate:
        default_batch_fetch_size: 500
        jdbc.batch_size: 500
```

## Dirty Checking

- Managed entities are auto-tracked -- no explicit `save()` needed for updates within `@Transactional`
