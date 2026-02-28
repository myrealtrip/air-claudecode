---
description: RestClient 설정, @HttpExchange, 에러 처리, 재시도, 병렬 호출
keywords: [RestClient, external API, timeout, retry, "@HttpExchange", ObservationRegistry]
---

# 외부 API 클라이언트 가이드

이 문서는 외부 API를 호출할 때 사용하는 HTTP 클라이언트의 설정 방법과 사용 패턴을 설명합니다. 프로젝트는 `RestClient`를 표준 HTTP 클라이언트로 사용하며, 모든 설정은 일관된 방식을 따라야 합니다.

## 핵심 원칙

| 원칙 | 규칙 |
|---|---|
| `RestClient` 사용 | `WebClient`보다 `RestClient`를 기본으로 사용해야 합니다 |
| `RestClient.Builder` 주입 | Spring Boot 4가 자동 설정합니다. 빌더를 수동으로 생성하면 안 됩니다 |
| `ObservationRegistry` 주입 | 모든 `RestClient` 빌드 시 `.observationRegistry(observationRegistry)`를 반드시 적용해야 합니다 |
| `@ConfigurationProperties` | 클라이언트 설정에 반드시 사용해야 합니다. `@Value`를 사용하면 안 됩니다 |
| `infrastructure/client/` | 클라이언트 클래스는 infrastructure 레이어에 위치합니다 |
| 트랜잭션 외부 호출 | 외부 API 호출은 트랜잭션 스코프 밖에서 실행해야 합니다 |
| 타임아웃 필수 | 모든 외부 호출에는 연결 타임아웃과 읽기 타임아웃을 설정해야 합니다 |

## RestClient 설정

Spring Boot 4는 `RestClient.Builder`를 자동으로 설정합니다. 빌더를 직접 생성하는 대신 주입받아 사용해야 합니다. `ObservationRegistry`도 주입받아 모든 `RestClient`에 명시적으로 적용해야 합니다. 클라이언트 설정값은 `@ConfigurationProperties`를 통해 타입 안전하게 관리합니다.

### Properties 클래스

설정값을 타입 안전하게 관리하기 위해 `@ConfigurationProperties` 클래스를 정의합니다.

```kotlin
@ConfigurationProperties(prefix = "external.amadeus")
data class AmadeusProperties(
    var baseUrl: String,
    var connectTimeout: Duration = Duration.ofSeconds(5),
    var readTimeout: Duration = Duration.ofSeconds(10),
)
```

### Config Bean

`RestClient` Bean은 주입받은 빌더와 설정을 사용하여 생성합니다.

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

### YAML 설정

```yaml
external:
  amadeus:
    base-url: https://api.amadeus.com
    connect-timeout: 5s
    read-timeout: 10s
```

## 클라이언트 방식 선택

상황에 따라 두 가지 방식 중 하나를 선택합니다.

| 기준 | RestClient (직접 호출) | @HttpExchange (선언형) |
|---|---|---|
| 단순한 1~2개 엔드포인트 | O | - |
| 호출별 커스텀 에러 처리 필요 | O | - |
| 다수의 엔드포인트, 균일한 패턴 | - | O |
| CRUD 스타일의 일관된 API 구조 | - | O |
| 동적 URI / 헤더 조작 필요 | O | - |

## 방식 1: RestClient 직접 호출 (단순 요청)

엔드포인트가 1~2개로 단순하거나, 호출별로 에러 처리 방식이 다른 경우에 사용합니다.

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

### 에러 처리 (RestClient 직접 호출)

HTTP 상태 코드별 에러 처리는 `onStatus`를 사용합니다.

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

## 방식 2: @HttpExchange (다수 엔드포인트 API)

엔드포인트가 많거나 CRUD 패턴이 균일한 API에 사용합니다. 인터페이스를 선언하면 Spring이 구현체를 자동으로 생성합니다.

### 인터페이스 정의

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

### Bean 등록

`HttpServiceProxyFactory`를 사용하여 인터페이스 구현체를 Bean으로 등록합니다.

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

### 클라이언트 래퍼

`@HttpExchange` 인터페이스를 감싸는 클라이언트 클래스를 작성하여 도메인 변환과 에러 처리를 추가합니다.

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

### @HttpExchange 어노테이션 목록

| 어노테이션 | HTTP 메서드 |
|---|---|
| `@GetExchange` | GET |
| `@PostExchange` | POST |
| `@PutExchange` | PUT |
| `@PatchExchange` | PATCH |
| `@DeleteExchange` | DELETE |

### 파라미터 어노테이션 목록

| 어노테이션 | 용도 |
|---|---|
| `@PathVariable` | 경로 변수 |
| `@RequestBody` | 요청 본문 |
| `@RequestHeader` | 커스텀 헤더 |
| `@RequestParam` | 쿼리 파라미터 |
| `@CookieValue` | 쿠키 값 |

## 응답 DTO 위치

외부 API 응답 DTO는 클라이언트 클래스와 같은 위치에 둡니다. 상위 레이어로 반환하기 전에 반드시 도메인 모델로 변환해야 합니다.

```
infrastructure/client/
├── AmadeusProperties.kt           # @ConfigurationProperties
├── AmadeusApi.kt                  # @HttpExchange 인터페이스
├── AmadeusClient.kt               # 도메인 변환이 포함된 래퍼
├── dto/
│   ├── AmadeusSearchResponse.kt
│   └── AmadeusBookingResponse.kt
```

## 재시도

네트워크 오류나 일시적 서버 오류에 대한 재시도가 필요한 경우, 프로젝트 전용 `retry`/`retryBlocking` 함수를 사용해야 합니다. 직접 재시도 로직을 구현하면 안 됩니다.

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

### 재시도 정책

어떤 경우에 재시도해야 하는지, 하지 말아야 하는지를 명확히 구분해야 합니다.

| 재시도 O | 재시도 X |
|---|---|
| `RestClientException` (네트워크 오류) | 4xx 클라이언트 오류 (입력 오류) |
| `IOException` (타임아웃) | `KnownBusinessException` (비즈니스 오류) |
| 5xx 서버 오류 (일시적 장애) | 인증 오류 (401, 403) |

## 병렬 호출

여러 외부 API를 동시에 호출할 때는 MDC를 보존하는 코루틴 함수를 사용합니다.

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

## 자주 하는 실수

| 실수 | 설명 |
|---|---|
| 클라이언트 설정에 `@Value` 사용 | `@ConfigurationProperties`를 사용해야 합니다. 타입 안전하고 IDE 지원이 됩니다 |
| `RestClient.builder()` 수동 생성 | 주입받은 `RestClient.Builder`를 사용해야 합니다. `ObservationRegistry`가 자동 설정됩니다 |
| `ObservationRegistry.create()` 수동 생성 | 주입받은 `ObservationRegistry`를 사용해야 합니다. 핸들러/필터/익스포터가 자동 설정됩니다 |
| 타임아웃 미설정 | 외부 시스템 장애 시 스레드가 무한정 대기합니다 |
| 트랜잭션 내부에서 호출 | DB 커넥션을 불필요하게 점유합니다 |
| 응답 DTO를 상위 레이어에 노출 | 반환 전에 도메인 모델로 변환해야 합니다 |
| 모든 예외에 재시도 | 4xx 클라이언트 오류는 재시도하면 안 됩니다 |
