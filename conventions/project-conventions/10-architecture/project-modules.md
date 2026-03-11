# 프로젝트 모듈

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                        bootstrap                            │
│   ┌──────────────────────┐  ┌──────────────────────────┐   │
│   │   {name}-api-app     │  │   {name}-worker-app      │   │
│   │  Controller, Request, │  │  Scheduler, EventHandler │
│   │  Response             │  │                          │   │
│   └──────────┬───────────┘  └───────────┬──────────────┘   │
└──────────────┼──────────────────────────┼───────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    infrastructure                            │
│    JPA Entity, Mapper, Repository, Cache, Redis, HTTP Client, │
│    Export, Slack                                              │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                       domain                                 │
│   Domain Model, Policy, Service, Event, UseCase,             │
│   Application Service, DTO                                    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    common / common-web                       │
│   Codes, Exceptions, Values, Utils, Filters, Handlers        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│   test-support (test classpath only)                         │
│   docs (REST Docs generation, compileOnly)                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 모듈 구조

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

---

## 모듈 네이밍

- `-app` 접미사: Spring Boot 실행 모듈 (bootJar 활성화)
- 접미사 없음: 라이브러리 모듈 (jar만 생성)

---

## 의존성 방향 (단방향만 허용)

```
bootstrap    →  domain, infrastructure, common-web
infrastructure  →  domain, common
domain       →  common (only)
common-web   →  common
common       →  nothing
test-support →  domain, common (test classpath)
docs         →  bootstrap, test-support (compileOnly)
```

의존성 규칙 — 금지 방향:

| 모듈 | 의존 금지 대상 |
|------|----------------|
| `common` | 다른 모든 모듈 |
| `domain` | `infrastructure`, `bootstrap`, `common-web` |
| `infrastructure` | `bootstrap`, `common-web` |
| `common-web` | `domain`, `infrastructure`, `bootstrap` |

`domain` 내부: Application DTO는 Domain Model에 의존한다. Domain Model은 DTO를 참조하지 않는다.

---

## 프로파일별 DataSource 라우팅

`@Transactional(readOnly = true)`은 Slave로 라우팅하고, `@Transactional` (쓰기)은 Master로 라우팅한다. 라우팅 로직은 `infrastructure/persistence/config/RoutingDataSource.kt`에 위치한다.

| 프로파일 | DataSource |
|----------|-----------|
| `embed`, `local` | H2 인메모리 (라우팅 없음) |
| `dev`, `test` | MySQL + `RoutingDataSource` Master/Slave |
| `stage`, `prod` | MySQL Master-Slave 클러스터 + `RoutingDataSource` |

---

## HTTP 클라이언트 패턴

`@HttpExchange` 인터페이스를 `@ImportHttpServices`로 등록한다.

```kotlin
@HttpExchange("/api/flights")
interface FlightClient {
    @GetExchange("/{id}")
    fun getFlight(@PathVariable id: Long): FlightResponse
}

@Configuration
@ImportHttpServices(FlightClient::class)
class FlightClientConfig {
    @Bean
    fun flightClientServiceProxyFactory(properties: FlightClientProperties): HttpServiceProxyFactory =
        HttpServiceProxyFactory.builderFor(RestClientAdapter.create(
            RestClient.builder().baseUrl(properties.baseUrl).build(),
        )).build()
}
```

---

## 새 모듈 생성

### 새 도메인 기능

1. `{projectGroup}.domain.{feature}/` 패키지를 생성하고 하위 패키지를 구성한다: `model/`, `policy/`, `service/`, `event/`, `usecase/`, `dto/`, `exception/`
2. `{Feature}Error.kt` (ResponseCode를 구현하는 Enum) 생성
3. `{Feature}Exception.kt` (기본 + `NotFoundException` 등) 생성
4. Domain Model, Policy, UseCase, Application Service, DTO 클래스 생성

### 새 bootstrap 앱

```
bootstrap/{name}-api-app/
├── src/main/kotlin/{projectGroup}/{appname}/
│   ├── {AppName}Application.kt      # @SpringBootApplication, TimeZone.setDefault(UTC)
│   ├── presentation/external/{Feature}ExternalController.kt
│   ├── presentation/external/request/
│   ├── presentation/external/response/
│   └── config/WebConfig.kt
└── build.gradle.kts                 # bootJar enabled
```

```kotlin
@SpringBootApplication
class {AppName}Application

fun main(args: Array<String>) {
    TimeZone.setDefault(TimeZone.getTimeZone("UTC"))  // 모든 bootstrap 앱에 필수
    runApplication<{AppName}Application>(*args)
}
```

---

## 응답 형식

모든 API는 `ApiResource<T>`로 감싸며 `status`, `meta`, `data` 필드를 사용한다.

```kotlin
ApiResource.success(data)
ApiResource.success(data, "처리가 완료되었습니다.")
```

---

## 예외 유형

| 예외 | 용도 | 로그 레벨 |
|------|------|-----------|
| `KnownException` | 예상 가능한 오류 (유효성 검증, 미존재) | INFO |
| `BizRuntimeException` | 비즈니스 오류 (복구 불가) | ERROR |
| `BizException` | 체크 비즈니스 예외 | ERROR |

---

## 캐시 전략 (2티어)

- L1: Caffeine (로컬, 200개, 30분 TTL)
- L2: Redis (분산, 설정 가능한 TTL)

| 캐시 이름 | TTL |
|-----------|-----|
| `SHORT_LIVED` | 10분 |
| `DEFAULT` | 30분 |
| `MID_LIVED` | 1시간 |
| `LONG_LIVED` | 24시간 |
