---
description: ConfigurationProperties 패턴, 검증, 중첩 설정
keywords: ["@ConfigurationProperties", "@Value", properties, YAML, config binding, prefix]
---

# ConfigurationProperties 가이드

이 문서는 Spring Boot 애플리케이션에서 외부 설정값을 안전하고 구조적으로 관리하는 방법을 설명합니다. `@ConfigurationProperties`를 활용하면 타입 안전한 설정 바인딩을 구현할 수 있습니다.


## 핵심 원칙

| 원칙 | 규칙 |
|---|---|
| `@ConfigurationProperties` 사용 | 구조화된 설정 바인딩에는 반드시 사용합니다. 타입 안전성과 IDE 지원을 제공합니다. |
| `@Value` 사용 금지 | 타입 안전성이 없고, 설정이 분산되며, IDE 지원이 부족합니다. 절대 사용하면 안 됩니다. |
| `data class` + `var` 사용 | Spring이 설정값을 바인딩하려면 가변(mutable) 필드가 필요합니다. |
| 시간 값에 `Duration` 사용 | 타임아웃, 딜레이, 인터벌 등 시간 관련 값은 `Long` 대신 `java.time.Duration`을 사용합니다. |
| `@Validated` 필수 적용 | 설정이 잘못된 경우 애플리케이션 시작 시 빠르게 실패하도록 반드시 추가합니다. |
| 프리픽스 규칙 | 외부 클라이언트: `external.{name}` / 기능 설정: `app.{feature}` |


## Properties 클래스 작성 방법

`@ConfigurationProperties` 클래스에는 항상 `@Validated`와 Bean Validation 어노테이션을 함께 적용합니다. 이를 통해 필수 설정이 누락되거나 잘못된 값이 들어오면 애플리케이션 시작 시점에 바로 오류를 확인할 수 있습니다.

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

대응하는 YAML 설정 파일은 다음과 같이 작성합니다.

```yaml
external:
  amadeus:
    base-url: https://api.amadeus.com
    api-key: ${AMADEUS_API_KEY}
    connect-timeout: 5s
    read-timeout: 10s
```

### Duration 형식

Spring Boot는 다음 형식의 duration 문자열을 자동으로 `Duration` 타입으로 변환합니다.

| 형식 | 예시 | 의미 |
|---|---|---|
| 간단한 형식 | `5s`, `500ms`, `2m`, `1h` | 초, 밀리초, 분, 시간 |
| ISO 8601 형식 | `PT5S`, `PT0.5S`, `PT2M` | 표준 duration 형식 |

`RestClient` 설정 Bean에서의 활용 방법은 `external-client-guide.md`를 참고합니다.


## Properties 클래스 등록 방법

작성한 `@ConfigurationProperties` 클래스는 Spring 컨텍스트에 등록해야 주입이 가능합니다. 두 가지 방법 중 하나를 사용합니다.

```kotlin
// 방법 1: 스캔 방식 (권장) — @ConfigurationProperties가 붙은 클래스를 자동으로 찾아 등록합니다
@ConfigurationPropertiesScan
@SpringBootApplication
class AirOrderApplication

// 방법 2: 명시적 등록 — 특정 Properties 클래스만 명시적으로 등록합니다
@EnableConfigurationProperties(AmadeusProperties::class)
@Configuration
class AmadeusClientConfig
```

스캔 방식을 사용하면 새로운 Properties 클래스를 추가할 때마다 별도 등록 코드를 작성할 필요가 없어 더 편리합니다.


## 중첩 Properties 구성

관련된 설정을 논리적으로 묶고 싶을 때는 내부 `data class`를 활용합니다. 이렇게 하면 설정 구조가 명확해지고 YAML 파일의 계층 구조와 자연스럽게 대응됩니다.

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


## 프리픽스 네이밍 규칙

Properties 클래스의 `prefix`는 설정의 성격에 따라 다음 규칙을 따릅니다.

| 유형 | 프리픽스 패턴 | 예시 |
|---|---|---|
| 외부 클라이언트 | `external.{name}` | `external.amadeus`, `external.sabre` |
| 기능 설정 | `app.{feature}` | `app.notification`, `app.cache` |
| 공통 설정 | `air.common.{feature}` | `air.common.async`, `air.common.retry` |


## 자주 발생하는 실수

다음은 설정 관리에서 흔히 발생하는 실수입니다. 코드 리뷰 시 반드시 확인합니다.

| 실수 | 설명 |
|---|---|
| `@Value` 사용 | 타입 안전성이 없고 설정이 분산되며 IDE 지원이 없습니다. 절대 사용하면 안 됩니다. |
| `val` 필드 사용 | Spring 바인딩이 동작하려면 `var`를 사용해야 합니다. |
| `@ConfigurationPropertiesScan` 누락 | Properties 클래스가 등록되지 않아 주입에 실패합니다. |
| 시크릿 하드코딩 | 인증 정보는 반드시 `${ENV_VARIABLE}` 플레이스홀더를 사용합니다. |
| `@Validated` 누락 | 잘못된 설정을 시작 시점에 빠르게 발견하려면 반드시 추가해야 합니다. |
| 시간 값에 `Long` 사용 | `Duration`을 사용하면 Spring이 `5s`, `500ms`, `2m` 등을 자동으로 변환합니다. |
