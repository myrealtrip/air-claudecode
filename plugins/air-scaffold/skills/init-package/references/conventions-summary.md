# Package Structure Conventions (Generator Reference)

## Layer-First Package Structure

Generate the following directory tree under `src/main/kotlin/{basePackagePath}/`:

```
application/
├── dto/
│   ├── command/              # Input DTOs (Create/Update commands)
│   └── result/               # Output DTOs ({Feature}Info)
├── service/                  # Application Service (CQRS: QueryApplication / CommandApplication)
└── usecase/                  # Use Case (business flow orchestration)
domain/                       # Domain Entity, Value Object
infrastructure/
├── client/                   # HTTP Client (@HttpExchange interfaces)
├── event/                    # Event Publisher/Listener
└── persistence/
    ├── entity/               # JPA Entity (extends BaseTimeEntity)
    ├── mapper/               # Entity ↔ Domain mapper
    └── repository/           # JpaRepository, QueryRepository
presentation/
├── external/                 # External API (customer-facing)
│   ├── request/
│   └── response/
└── internal/                 # Internal API
    ├── admin/                # Admin API
    │   ├── request/
    │   └── response/
    └── proxy/                # Inter-service proxy API
        ├── request/
        └── response/
configuration/
├── exception/                # Exception Handler, Error Code
└── properties/               # @ConfigurationProperties
support/
├── enums/                    # Shared Enum types
├── model/                    # Value Object, shared models
└── utils/                    # Utility functions
```

## Naming Rules

- Packages: **lowercase only**, no underscores, no hyphens
- Base package format: `com.myrealtrip.{projectname}` (dots to directory separators)
- Source root: `src/main/kotlin/{basePackagePath}/`

## build.gradle.kts Template

```kotlin
plugins {
    kotlin("jvm") version "1.9.25"
    kotlin("plugin.spring") version "1.9.25"
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "{basePackage}"
version = "0.0.1-SNAPSHOT"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll("-Xjsr305=strict")
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

## settings.gradle.kts Template

```kotlin
rootProject.name = "{projectName}"
```

## Application.kt Template

```kotlin
package {basePackage}

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import java.util.TimeZone

@SpringBootApplication
class {AppName}Application

fun main(args: Array<String>) {
    TimeZone.setDefault(TimeZone.getTimeZone("UTC"))
    runApplication<{AppName}Application>(*args)
}
```

- `{AppName}`: PascalCase from project name (e.g., `my-service` → `MyService`)

## application.yml Template

```yaml
spring:
  application:
    name: {projectName}
```

## Output Format

Return a JSON object with the following structure:

```json
{
  "reasoning": "Explain your convention application process: which rules you applied, how you resolved any ambiguities, and (if this is a retry) how you addressed each piece of feedback from the previous evaluation.",
  "projectName": "my-service",
  "basePackage": "com.myrealtrip.myservice",
  "basePackagePath": "com/myrealtrip/myservice",
  "appClassName": "MyServiceApplication",
  "directories": [
    "src/main/kotlin/com/myrealtrip/myservice/application/dto/command",
    "src/main/kotlin/com/myrealtrip/myservice/application/dto/result",
    "..."
  ],
  "files": {
    "build.gradle.kts": "...",
    "settings.gradle.kts": "...",
    "src/main/kotlin/com/myrealtrip/myservice/MyServiceApplication.kt": "...",
    "src/main/resources/application.yml": "..."
  }
}
```
