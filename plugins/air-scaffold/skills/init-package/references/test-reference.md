# Test Reference — Dry-Run Test Cases

Verify the Generator-Evaluator loop by running these test cases. Each case validates a different aspect of the pipeline.

---

## TC1: Happy Path

**Purpose**: Verify a correct generation passes evaluation on the first round.

**Input**:
```
/air-scaffold:init-package order-service com.myrealtrip.orderservice
```

**Expected Evaluator Result**: `PASS`

**Verification Checklist**:
- [ ] `reasoning` field is present and non-empty in Generator output
- [ ] 21 directories created under `src/main/kotlin/com/myrealtrip/orderservice/`:
  - `application/dto/command/`, `application/dto/result/`, `application/service/`, `application/usecase/`
  - `domain/`
  - `infrastructure/client/`, `infrastructure/event/`, `infrastructure/persistence/entity/`, `infrastructure/persistence/mapper/`, `infrastructure/persistence/repository/`
  - `presentation/external/request/`, `presentation/external/response/`, `presentation/internal/admin/request/`, `presentation/internal/admin/response/`, `presentation/internal/proxy/request/`, `presentation/internal/proxy/response/`
  - `configuration/exception/`, `configuration/properties/`
  - `support/enums/`, `support/model/`, `support/utils/`
- [ ] 4 files generated:
  - `build.gradle.kts` with `kotlin("jvm")`, `kotlin("plugin.spring")`, `org.springframework.boot`, `spring-boot-starter-web`, `jackson-module-kotlin`, `kotlin-reflect`
  - `settings.gradle.kts` with `rootProject.name = "order-service"`
  - `src/main/kotlin/com/myrealtrip/orderservice/OrderServiceApplication.kt` with `@SpringBootApplication` and UTC TimeZone
  - `src/main/resources/application.yml` with `spring.application.name: order-service`
- [ ] Evaluator returns `"result": "PASS"` with zero critical/major issues

---

## TC2: Anti-Pattern Trap

**Purpose**: Verify the Generator does NOT produce common anti-pattern directories.

**Input**:
```
/air-scaffold:init-package payment-gateway com.myrealtrip.paymentgateway
```

**Expected Evaluator Result**: `PASS`

**Verification Checklist**:
- [ ] `domain/` does NOT contain `entity/` subdirectory
- [ ] `domain/` does NOT contain `repository/` subdirectory
- [ ] `presentation/` does NOT contain `dto/` subdirectory
- [ ] `presentation/` does NOT contain `controller/` subdirectory
- [ ] No underscores or uppercase letters in any package name
- [ ] `appClassName` is `PaymentGatewayApplication` (PascalCase, no hyphen artifact)

---

## TC3: Incomplete Structure (NEEDS_IMPROVEMENT)

**Purpose**: Verify the Evaluator correctly identifies major issues in an incomplete structure.

**Method**: Directly pass the following intentionally flawed JSON to the Evaluator Task (bypass the Generator).

**Input JSON**:
```json
{
  "reasoning": "Intentionally incomplete for testing.",
  "projectName": "order-service",
  "basePackage": "com.myrealtrip.orderservice",
  "basePackagePath": "com/myrealtrip/orderservice",
  "appClassName": "OrderServiceApplication",
  "directories": [
    "src/main/kotlin/com/myrealtrip/orderservice/application/service",
    "src/main/kotlin/com/myrealtrip/orderservice/application/usecase",
    "src/main/kotlin/com/myrealtrip/orderservice/domain",
    "src/main/kotlin/com/myrealtrip/orderservice/infrastructure/persistence/repository",
    "src/main/kotlin/com/myrealtrip/orderservice/presentation/external",
    "src/main/kotlin/com/myrealtrip/orderservice/configuration",
    "src/main/kotlin/com/myrealtrip/orderservice/support"
  ],
  "files": {
    "build.gradle.kts": "plugins {\n    kotlin(\"jvm\") version \"1.9.25\"\n    kotlin(\"plugin.spring\") version \"1.9.25\"\n    id(\"org.springframework.boot\") version \"3.4.1\"\n    id(\"io.spring.dependency-management\") version \"1.1.7\"\n}\n\ngroup = \"com.myrealtrip.orderservice\"\nversion = \"0.0.1-SNAPSHOT\"\n\njava {\n    toolchain {\n        languageVersion = JavaLanguageVersion.of(21)\n    }\n}\n\nrepositories {\n    mavenCentral()\n}\n\ndependencies {\n    implementation(\"org.springframework.boot:spring-boot-starter-web\")\n    implementation(\"com.fasterxml.jackson.module:jackson-module-kotlin\")\n    implementation(\"org.jetbrains.kotlin:kotlin-reflect\")\n\n    testImplementation(\"org.springframework.boot:spring-boot-starter-test\")\n    testImplementation(\"org.jetbrains.kotlin:kotlin-test-junit5\")\n    testRuntimeOnly(\"org.junit.platform:junit-platform-launcher\")\n}\n\nkotlin {\n    compilerOptions {\n        freeCompilerArgs.addAll(\"-Xjsr305=strict\")\n    }\n}\n\ntasks.withType<Test> {\n    useJUnitPlatform()\n}",
    "settings.gradle.kts": "rootProject.name = \"order-service\"",
    "src/main/kotlin/com/myrealtrip/orderservice/OrderServiceApplication.kt": "package com.myrealtrip.orderservice\n\nimport org.springframework.boot.autoconfigure.SpringBootApplication\nimport org.springframework.boot.runApplication\nimport java.util.TimeZone\n\n@SpringBootApplication\nclass OrderServiceApplication\n\nfun main(args: Array<String>) {\n    TimeZone.setDefault(TimeZone.getTimeZone(\"UTC\"))\n    runApplication<OrderServiceApplication>(*args)\n}",
    "src/main/resources/application.yml": "spring:\n  application:\n    name: order-service"
  }
}
```

**Expected Evaluator Result**: `NEEDS_IMPROVEMENT`

**Expected Issues** (8 major):
1. Missing `application/dto/command/`
2. Missing `application/dto/result/`
3. Missing `infrastructure/client/`
4. Missing `infrastructure/event/`
5. Missing `infrastructure/persistence/entity/`
6. Missing `infrastructure/persistence/mapper/`
7. Missing `presentation/external/request/`, `presentation/external/response/`
8. Missing `presentation/internal/` (admin + proxy subtree)

Additional expected issues (structure):
- Missing `configuration/exception/`, `configuration/properties/`
- Missing `support/enums/`, `support/model/`, `support/utils/`

**Verification**:
- [ ] Evaluator returns `"result": "NEEDS_IMPROVEMENT"` (not FAIL — all 6 top-level packages present)
- [ ] `feedback` field contains actionable guidance referencing the missing sub-packages
- [ ] `issues` array contains at least 8 entries with `"severity": "major"`

---

## TC4: Critical Violations (FAIL)

**Purpose**: Verify the Evaluator correctly returns FAIL on critical violations.

**Method**: Directly pass the following critically flawed JSON to the Evaluator Task (bypass the Generator).

**Input JSON**:
```json
{
  "reasoning": "Intentionally broken for testing.",
  "projectName": "order_service",
  "basePackage": "com.myrealtrip.order_service",
  "basePackagePath": "com/myrealtrip/order_service",
  "appClassName": "OrderServiceApplication",
  "directories": [
    "src/main/kotlin/com/myrealtrip/order_service/application/service",
    "src/main/kotlin/com/myrealtrip/order_service/domain/entity",
    "src/main/kotlin/com/myrealtrip/order_service/domain/repository",
    "src/main/kotlin/com/myrealtrip/order_service/presentation/controller",
    "src/main/kotlin/com/myrealtrip/order_service/presentation/dto"
  ],
  "files": {}
}
```

**Expected Evaluator Result**: `FAIL`

**Expected Issues** (critical):
1. Underscore in package name: `order_service` violates lowercase-only naming rule
2. `domain/entity/` is an anti-pattern (entities belong in `infrastructure/persistence/entity/`)
3. `domain/repository/` is an anti-pattern (repositories belong in `infrastructure/persistence/repository/`)
4. `presentation/controller/` is an anti-pattern (controllers go in `external/` or `internal/`)
5. `presentation/dto/` is an anti-pattern (use `request/` and `response/` instead)
6. Missing top-level packages: `infrastructure/`, `configuration/`, `support/`
7. Empty `files` object — no build.gradle.kts, Application.kt, etc.

**Verification**:
- [ ] Evaluator returns `"result": "FAIL"` (critical naming violation + missing top-level packages + empty files)
- [ ] `feedback` field clearly states the structure is irrecoverably broken
- [ ] `issues` array contains at least 5 entries with `"severity": "critical"`

---

## Loop Convergence Test

**Purpose**: Verify the full Generate → Evaluate → Retry loop converges to PASS.

**Method**:
1. Feed TC3's flawed JSON as the "previous attempt" to the Generator via `{context_if_retry}`
2. Include the Evaluator's feedback from TC3 as `{evaluator_feedback}` and `{evaluator_issues_json}`
3. Run the Generator → expect a corrected output
4. Run the Evaluator on the corrected output → expect `PASS`

**Verification**:
- [ ] Generator's new `reasoning` field references the specific issues from TC3 feedback
- [ ] Generator produces all 21 directories and 4 complete files
- [ ] Evaluator returns `"result": "PASS"` on the retried output
