# Validation Checklist (Critic Reference)

Validate the generated package structure against these rules. Return `PASS` or `FAIL` with specific issues.

## Structure Checks

### Top-Level Packages (6 required)

All must exist directly under `{basePackagePath}/`:

- [ ] `application/`
- [ ] `domain/`
- [ ] `infrastructure/`
- [ ] `presentation/`
- [ ] `configuration/`
- [ ] `support/`

### Sub-Package Completeness

**application/**:
- [ ] `dto/command/` exists
- [ ] `dto/result/` exists
- [ ] `service/` exists
- [ ] `usecase/` exists

**infrastructure/**:
- [ ] `client/` exists
- [ ] `event/` exists
- [ ] `persistence/entity/` exists
- [ ] `persistence/mapper/` exists
- [ ] `persistence/repository/` exists

**presentation/**:
- [ ] `external/request/` exists
- [ ] `external/response/` exists
- [ ] `internal/admin/request/` exists
- [ ] `internal/admin/response/` exists
- [ ] `internal/proxy/request/` exists
- [ ] `internal/proxy/response/` exists

**configuration/**:
- [ ] `exception/` exists
- [ ] `properties/` exists

**support/**:
- [ ] `enums/` exists
- [ ] `model/` exists
- [ ] `utils/` exists

## Naming Checks

- [ ] All package names are **lowercase only** (no underscores, no hyphens, no uppercase)
- [ ] `basePackagePath` matches source root path
- [ ] Application class name is PascalCase + `Application` suffix

## Convention Anti-Pattern Checks

- [ ] `domain/` does NOT contain `entity/` (entities go in `infrastructure/persistence/entity/`)
- [ ] `presentation/` does NOT contain `dto/` (uses `request/` and `response/` instead)
- [ ] No `controller/` directory under `presentation/` (controllers go directly in `external/` or `internal/`)
- [ ] No `repository/` directly under `domain/` (goes in `infrastructure/persistence/repository/`)

## Gradle Checks

- [ ] `build.gradle.kts` contains `kotlin("jvm")`
- [ ] `build.gradle.kts` contains `kotlin("plugin.spring")`
- [ ] `build.gradle.kts` contains `org.springframework.boot`
- [ ] `build.gradle.kts` contains `spring-boot-starter-web`
- [ ] `build.gradle.kts` contains `jackson-module-kotlin`
- [ ] `build.gradle.kts` contains `kotlin-reflect`
- [ ] `settings.gradle.kts` contains correct `rootProject.name`

## Application Checks

- [ ] `Application.kt` has `@SpringBootApplication` annotation
- [ ] `Application.kt` sets `TimeZone.setDefault(TimeZone.getTimeZone("UTC"))`
- [ ] `Application.kt` package declaration matches `basePackage`
- [ ] `application.yml` exists with `spring.application.name`

## Output Format

```json
{
  "result": "PASS" | "FAIL",
  "issues": [
    {
      "category": "structure|naming|convention|gradle|application",
      "severity": "critical|major|minor",
      "message": "Description of the issue"
    }
  ]
}
```

- **PASS**: Zero critical or major issues
- **FAIL**: Any critical or major issue found
