---
description: ConfigurationProperties pattern, validation, nested config
keywords: ["@ConfigurationProperties", "@Value", properties, YAML, config binding, prefix]
---

# ConfigurationProperties Guide

## Core Principles

| Principle | Rule |
|---|---|
| `@ConfigurationProperties` | MUST use for structured config binding — type-safe, IDE-supported |
| No `@Value` | MUST NOT use `@Value` — no type safety, no grouping, no IDE support |
| `data class` + `var` | Spring binding requires mutable fields |
| `Duration` for time | Use `java.time.Duration` for timeout, delay, interval — not `Long` |
| `@Validated` | MUST add validation — fail fast on misconfiguration |
| Prefix convention | `external.{name}` for clients, `app.{feature}` for features |

## Properties Class

Always include `@Validated` + Bean Validation annotations.

```kotlin
@Validated
@ConfigurationProperties(prefix = "external.amadeus")
data class AmadeusProperties(
    @field:NotBlank
    var baseUrl: String,

    @field:NotBlank
    var apiKey: String,

    @field:NotNull
    var connectTimeout: Duration = Duration.ofSeconds(5),

    @field:NotNull
    var readTimeout: Duration = Duration.ofSeconds(10),
)
```

```yaml
external:
  amadeus:
    base-url: https://api.amadeus.com
    api-key: ${AMADEUS_API_KEY}
    connect-timeout: 5s
    read-timeout: 10s
```

### Duration Formats

Spring Boot auto-converts duration strings.

| Format | Example | Meaning |
|---|---|---|
| Simple | `5s`, `500ms`, `2m`, `1h` | Seconds, milliseconds, minutes, hours |
| ISO 8601 | `PT5S`, `PT0.5S`, `PT2M` | Standard duration format |

For `RestClient` config bean usage, see `external-client-guide.md`.

## Enabling

```kotlin
// Scan (recommended) — auto-discovers all @ConfigurationProperties
@ConfigurationPropertiesScan
@SpringBootApplication
class AirOrderApplication

// Or explicit registration
@EnableConfigurationProperties(AmadeusProperties::class)
@Configuration
class AmadeusClientConfig
```

## Nested Properties

Use inner `data class` for grouped config.

```kotlin
@Validated
@ConfigurationProperties(prefix = "external.amadeus")
data class AmadeusProperties(
    @field:NotBlank var baseUrl: String,
    @field:NotBlank var apiKey: String,
    var timeout: TimeoutProperties = TimeoutProperties(),
    var retry: RetryProperties = RetryProperties(),
) {
    data class TimeoutProperties(
        var connect: Duration = Duration.ofSeconds(5),
        var read: Duration = Duration.ofSeconds(10),
    )

    data class RetryProperties(
        var maxAttempts: Int = 3,
        var delay: Duration = Duration.ofMillis(500),
        var backoffMultiplier: Double = 2.0,
    )
}
```

```yaml
external:
  amadeus:
    base-url: https://api.amadeus.com
    api-key: ${AMADEUS_API_KEY}
    timeout:
      connect: 5s
      read: 10s
    retry:
      max-attempts: 3
      delay: 500ms
      backoff-multiplier: 2.0
```

## Naming Convention

| Type | Prefix Pattern | Example |
|---|---|---|
| External client | `external.{name}` | `external.amadeus`, `external.sabre` |
| Feature config | `app.{feature}` | `app.notification`, `app.cache` |
| Common config | `air.common.{feature}` | `air.common.async`, `air.common.retry` |

## Common Mistakes

| Mistake | Description |
|---|---|
| Using `@Value` | MUST NOT use — no type safety, scattered config, no IDE support |
| `val` fields | Use `var` — Spring binding requires mutable fields |
| Missing `@ConfigurationPropertiesScan` | Properties class not registered → injection fails |
| Hardcoded secrets | Use `${ENV_VARIABLE}` placeholder for credentials |
| No `@Validated` | Add validation to fail fast on missing/invalid config at startup |
| `Long` for time values | Use `Duration` — Spring auto-converts `5s`, `500ms`, `2m` |
