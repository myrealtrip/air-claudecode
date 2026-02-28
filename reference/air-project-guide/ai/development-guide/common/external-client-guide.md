---
description: RestClient setup, @HttpExchange, error handling, retry, parallel calls
keywords: [RestClient, external API, timeout, retry, "@HttpExchange", ObservationRegistry]
---

# External API Client Guide

## Core Principles

| Principle | Rule |
|---|---|
| Use `RestClient` | Default over `WebClient` |
| Inject `RestClient.Builder` | Spring Boot 4 auto-configures — do NOT create builder manually |
| Inject `ObservationRegistry` | MUST inject and apply via `.observationRegistry(observationRegistry)` on every `RestClient` |
| `@ConfigurationProperties` | MUST use for client config — MUST NOT use `@Value` |
| `infrastructure/client/` | Client classes live in infrastructure layer |
| Outside transaction | External API calls MUST be outside transaction scope |
| Timeout required | All external calls MUST have connect/read timeout |

## RestClient Configuration

Spring Boot 4 auto-configures `RestClient.Builder`. Inject `RestClient.Builder` instead of creating it manually. MUST also inject `ObservationRegistry` and explicitly apply via `.observationRegistry(observationRegistry)` on every `RestClient` build. Use `@ConfigurationProperties` for client config — MUST NOT use `@Value`.

### Properties Class

```kotlin
@ConfigurationProperties(prefix = "external.amadeus")
data class AmadeusProperties(
    var baseUrl: String,
    var connectTimeout: Duration = Duration.ofSeconds(5),
    var readTimeout: Duration = Duration.ofSeconds(10),
)
```

### Config Bean

```kotlin
@Configuration
class ExternalClientConfig(
    private val amadeusProperties: AmadeusProperties,
    private val observationRegistry: ObservationRegistry,
) {

    @Bean
    fun amadeusRestClient(restClientBuilder: RestClient.Builder): RestClient =
        restClientBuilder
            .baseUrl(amadeusProperties.baseUrl)
            .observationRegistry(observationRegistry)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .requestFactory(clientHttpRequestFactory())
            .build()

    private fun clientHttpRequestFactory(): ClientHttpRequestFactory {
        val factory = SimpleClientHttpRequestFactory()
        factory.setConnectTimeout(amadeusProperties.connectTimeout.toMillis().toInt())
        factory.setReadTimeout(amadeusProperties.readTimeout.toMillis().toInt())
        return factory
    }
}
```

### YAML Config

```yaml
external:
  amadeus:
    base-url: https://api.amadeus.com
    connect-timeout: 5s
    read-timeout: 10s
```

## Client Approach Selection

| Criteria | RestClient (direct) | @HttpExchange (declarative) |
|---|---|---|
| Simple 1-2 endpoints | O | - |
| Custom error handling per call | O | - |
| Many endpoints with uniform patterns | - | O |
| CRUD-style API with consistent structure | - | O |
| Dynamic URI / header manipulation | O | - |

## Approach 1: RestClient Direct (simple requests)

Use for simple, one-off calls or when per-call error handling is needed.

```kotlin
@Component
class AmadeusClient(
    private val amadeusRestClient: RestClient,
) {
    fun searchFlights(criteria: FlightSearchCriteria): List<FlightResult> {
        val response = amadeusRestClient.post()
            .uri("/v2/shopping/flight-offers")
            .body(criteria)
            .retrieve()
            .body(AmadeusSearchResponse::class.java)
            ?: throw BusinessException(
                code = ErrorCode.CALL_RESPONSE_ERROR,
                message = "Amadeus API 응답이 없습니다",
            )

        return response.data.map { FlightResult.of(it) }
    }
}
```

### Error Handling (RestClient direct)

Use `onStatus` for HTTP status-based error handling.

```kotlin
fun getBooking(bookingId: String): BookingResult {
    return amadeusRestClient.get()
        .uri("/v1/booking/{id}", bookingId)
        .retrieve()
        .onStatus(HttpStatusCode::is4xxClientError) { _, response ->
            throw KnownBusinessException(
                code = ErrorCode.DATA_NOT_FOUND,
                message = "예약을 찾을 수 없습니다: bookingId=$bookingId, status=${response.statusCode}",
            )
        }
        .onStatus(HttpStatusCode::is5xxServerError) { _, response ->
            throw BusinessException(
                code = ErrorCode.CALL_RESPONSE_ERROR,
                message = "Amadeus API 서버 오류: status=${response.statusCode}",
            )
        }
        .body(BookingResult::class.java)
        ?: throw BusinessException(
            code = ErrorCode.CALL_RESPONSE_ERROR,
            message = "Amadeus API 응답이 없습니다",
        )
}
```

## Approach 2: @HttpExchange (complex/multi-endpoint APIs)

Use for APIs with many endpoints or uniform CRUD patterns. Define a declarative interface and let Spring generate the implementation.

### Interface Definition

```kotlin
@HttpExchange("/v1")
interface AmadeusApi {

    @PostExchange("/shopping/flight-offers")
    fun searchFlights(@RequestBody criteria: FlightSearchCriteria): AmadeusSearchResponse

    @GetExchange("/booking/{bookingId}")
    fun getBooking(@PathVariable bookingId: String): AmadeusBookingResponse

    @PostExchange("/booking")
    fun createBooking(@RequestBody request: AmadeusBookingRequest): AmadeusBookingResponse

    @DeleteExchange("/booking/{bookingId}")
    fun cancelBooking(@PathVariable bookingId: String)
}
```

### Bean Registration

```kotlin
@Configuration
class ExternalClientConfig(
    private val amadeusProperties: AmadeusProperties,
    private val observationRegistry: ObservationRegistry,
) {

    @Bean
    fun amadeusApi(restClientBuilder: RestClient.Builder): AmadeusApi {
        val restClient = restClientBuilder
            .baseUrl(amadeusProperties.baseUrl)
            .observationRegistry(observationRegistry)
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .requestFactory(clientHttpRequestFactory())
            .build()

        val factory = HttpServiceProxyFactory
            .builderFor(RestClientAdapter.create(restClient))
            .build()

        return factory.createClient(AmadeusApi::class.java)
    }
}
```

### Client Wrapper

Wrap the `@HttpExchange` interface to add domain conversion and error handling.

```kotlin
@Component
class AmadeusClient(
    private val amadeusApi: AmadeusApi,
) {
    fun searchFlights(criteria: FlightSearchCriteria): List<FlightResult> {
        val response = amadeusApi.searchFlights(criteria)
        return response.data.map { FlightResult.of(it) }
    }

    fun getBooking(bookingId: String): BookingResult {
        val response = amadeusApi.getBooking(bookingId)
        return BookingResult.of(response)
    }

    fun createBooking(request: CreateBookingCommand): BookingResult {
        val response = amadeusApi.createBooking(AmadeusBookingRequest.of(request))
        return BookingResult.of(response)
    }
}
```

### @HttpExchange Annotations

| Annotation | HTTP Method |
|---|---|
| `@GetExchange` | GET |
| `@PostExchange` | POST |
| `@PutExchange` | PUT |
| `@PatchExchange` | PATCH |
| `@DeleteExchange` | DELETE |

### Parameter Annotations

| Annotation | Use |
|---|---|
| `@PathVariable` | Path variable |
| `@RequestBody` | Request body |
| `@RequestHeader` | Custom header |
| `@RequestParam` | Query parameter |
| `@CookieValue` | Cookie value |

## Response DTO Location

External API response DTOs live alongside the client. Convert to domain models before returning to upper layers.

```
infrastructure/client/
├── AmadeusProperties.kt           # @ConfigurationProperties
├── AmadeusApi.kt                  # @HttpExchange interface
├── AmadeusClient.kt               # Wrapper with domain conversion
├── dto/
│   ├── AmadeusSearchResponse.kt
│   └── AmadeusBookingResponse.kt
```

## Retry

Use project's `retry`/`retryBlocking`. MUST NOT implement retry logic manually.

```kotlin
import com.myrealtrip.air.common.utils.coroutine.retryBlocking

fun searchFlights(criteria: FlightSearchCriteria): List<FlightResult> =
    retryBlocking(
        maxAttempts = 3,
        delay = 500.milliseconds,
        backoffMultiplier = 2.0,
        retryOn = { it is RestClientException || it is IOException },
    ) {
        amadeusRestClient.post()
            .uri("/v2/shopping/flight-offers")
            .body(criteria)
            .retrieve()
            .body(AmadeusSearchResponse::class.java)
            ?.data?.map { FlightResult.of(it) }
            ?: emptyList()
    }
```

### Retry Policy

| Retry YES | Retry NO |
|---|---|
| `RestClientException` (network error) | 4xx client errors (input error) |
| `IOException` (timeout) | `KnownBusinessException` (business error) |
| 5xx server errors (transient failure) | Auth errors (401, 403) |

## Parallel Calls

Use MDC-preserving coroutine functions for parallel external calls.

```kotlin
import com.myrealtrip.air.common.utils.coroutine.runBlockingOnVirtualThread
import com.myrealtrip.air.common.utils.coroutine.asyncWithMDC

fun searchAllSuppliers(criteria: FlightSearchCriteria): List<FlightResult> =
    runBlockingOnVirtualThread {
        val amadeus = asyncWithMDC { amadeusClient.searchFlights(criteria) }
        val sabre = asyncWithMDC { sabreClient.searchFlights(criteria) }
        amadeus.await() + sabre.await()
    }
```

## Common Mistakes

| Mistake | Description |
|---|---|
| Using `@Value` for client config | MUST use `@ConfigurationProperties` — type-safe, grouped, IDE-supported |
| Manual `RestClient.builder()` | Use injected `RestClient.Builder` — auto-configured with `ObservationRegistry` |
| Manual `ObservationRegistry.create()` | Use injected `ObservationRegistry` — auto-configured with handlers/filters/exporters |
| No timeout | Thread hangs indefinitely on external system failure |
| Call inside transaction | Unnecessarily holds DB connection |
| Expose response DTO to upper layers | Convert to domain model before returning |
| Retry all exceptions | Do NOT retry client errors (4xx) |
