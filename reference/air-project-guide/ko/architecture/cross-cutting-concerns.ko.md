---
description: ApiResource 래퍼, 응답 코드, 로깅, 분산 추적, Virtual Thread
keywords: [ApiResource, response code, virtual thread, observability, cross-cutting]
---

# 횡단 관심사 (Cross-Cutting Concerns)

횡단 관심사란 특정 레이어에 종속되지 않고 시스템 전체에 걸쳐 공통으로 적용되는 기능을 말합니다.
이 문서는 응답 형식 통일, 로깅 파이프라인, 분산 추적, 비동기 처리에 관한 팀 공통 규칙을 설명합니다.

## 통일된 응답 형식 (ApiResource)

모든 API 응답은 반드시 `ApiResource<T>`로 감싸야 합니다.
이를 통해 클라이언트가 일관된 구조로 응답을 처리할 수 있습니다.

```json
{
  "status": { "status": 200, "code": "SUCCESS", "message": "OK" },
  "meta": { "traceId": "...", "spanId": "...", "responseTs": 1709100000000 },
  "data": { ... }
}
```

각 필드의 의미는 다음과 같습니다.

- `status`: HTTP 상태 코드, 응답 코드, 메시지를 포함합니다.
- `meta`: traceId, spanId, 응답 타임스탬프, 컬렉션 크기, 페이지 정보를 포함합니다. null 필드는 JSON에서 제외됩니다.
- `data`: 실제 응답 데이터가 담깁니다.

### 팩토리 메서드

`ApiResource`를 직접 생성하지 않고, 아래 팩토리 메서드를 사용합니다.

| 메서드 | 사용 상황 |
|---|---|
| `success()` / `success(data)` | 일반 성공 응답 |
| `of(code, data)` | 커스텀 응답 코드가 필요한 경우 (타입 자동 감지) |
| `ofPage(page)` | 오프셋 기반 페이징 (meta.pageInfo 포함) |
| `ofNoOffsetPage(page, lastIndex)` | 커서 기반 페이징 (meta.offsetInfo 포함) |

## 응답 코드 시스템

응답 코드는 `ResponseCode` 인터페이스를 기반으로 `SuccessCode`와 `ErrorCode`로 구분됩니다.
모든 응답 코드는 HTTP 상태, 코드명, 사용자 메시지를 함께 제공합니다.

```kotlin
interface ResponseCode {
    val status: Int      // HTTP 상태 코드
    val name: String     // 응답 코드명
    val message: String  // 사용자에게 표시할 메시지
}
```

### SuccessCode

| 코드 | HTTP 상태 | 메시지 |
|---|---|---|
| `SUCCESS` | 200 | OK |
| `CREATED` | 201 | Created |
| `ACCEPTED` | 202 | Accepted |

### ErrorCode

| 코드 | HTTP 상태 | 설명 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 인증 실패 |
| `UNAUTHORIZED_IP` | 401 | IP 인증 실패 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `INVALID_ARGUMENT` | 400 | 요청 파라미터 유효성 오류 |
| `NOT_READABLE` | 400 | 요청 본문 파싱 실패 |
| `ILLEGAL_ARGUMENT` | 422 | 비즈니스 규칙 위반 (잘못된 인자) |
| `ILLEGAL_STATE` | 422 | 비즈니스 규칙 위반 (잘못된 상태) |
| `DATA_NOT_FOUND` | 422 | 요청한 데이터가 존재하지 않음 |
| `UNSUPPORTED_OPERATION` | 422 | 지원하지 않는 연산 |
| `DB_ACCESS_ERROR` | 422 | DB 접근 오류 |
| `CALL_RESPONSE_ERROR` | 422 | 외부 API 호출 오류 |
| `SERVER_ERROR` | 500 | 서버 내부 오류 |

## 로깅 파이프라인

요청/응답 라이프사이클에 따라 4단계 파이프라인이 순서대로 실행됩니다.
각 단계가 담당하는 역할을 이해하면 로그를 효과적으로 활용할 수 있습니다.

```
ContentCachingFilter → LogInterceptor → LogTraceAspect → LogResponseBodyInterceptor
```

| 단계 | 역할 | 비고 |
|---|---|---|
| `ContentCachingFilter` | 요청/응답 본문 캐싱, 처리 시간 측정 | 8000ms 초과 시 경고 로그 출력. multipart 제외. |
| `LogInterceptor` | 요청 정보 로깅 (IP, URI, 헤더, 본문) | 운영 환경에서 `@ExcludeRequestLog`로 제외 가능 |
| `LogTraceAspect` | 메서드 호출 계층을 트리 형태로 시각화 | `*Controller`, `*UseCase`, `*Service`에 자동 적용 |
| `LogResponseBodyInterceptor` | 응답 본문 로깅 | `@LogResponseBody` 어노테이션이 있을 때만 동작 |

### AOP 트레이스 출력 예시

`LogTraceAspect`는 메서드 호출 흐름을 아래처럼 트리 구조로 출력합니다.
이를 통해 어떤 메서드가 얼마나 걸렸는지 한눈에 확인할 수 있습니다.

```
|--> OrderController.createOrder(..)
|    |--> CreateOrderUseCase.execute(..)
|    |    |<-- CreateOrderUseCase.execute(..) elapsed=25ms
|<-- OrderController.createOrder(..) elapsed=28ms
```

### 커스텀 어노테이션

로깅 동작을 세밀하게 제어할 수 있는 어노테이션입니다.

| 어노테이션 | 동작 |
|---|---|
| `@LogTrace` | Controller/UseCase/Service 외의 클래스에 트레이싱 활성화 |
| `@ExcludeLogTrace` | 특정 메서드의 트레이싱 비활성화 |
| `@LogResponseBody` | 응답 본문 로깅 활성화 (maxLength, printAll, logLevel 옵션 제공) |
| `@ExcludeRequestLog` | 운영 환경에서 요청 로깅 제외 |

## 분산 추적 (Observability)

마이크로서비스 환경에서 요청 흐름을 추적하기 위해 분산 추적을 사용합니다.

- `spring-boot-starter-opentelemetry`를 사용하며, W3C Trace Context 표준을 따릅니다. 샘플링 확률은 1.0(모든 요청 추적)입니다.
- `traceId`, `spanId`는 자동으로 MDC에 설정되며, `ApiResource.Meta`에도 포함됩니다.
- `ObservationRegistry`는 Spring Boot 4가 자동 구성합니다. 반드시 주입받아서 사용해야 합니다. `ObservationRegistry.create()`로 직접 생성해서는 안 됩니다.
- `RestClient.Builder`도 `ObservationRegistry`와 함께 자동 구성됩니다. 반드시 주입받아서 사용해야 합니다. `RestClient.builder()`로 직접 생성해서는 안 됩니다.
- 커스텀 관찰이 필요한 컴포넌트는 반드시 `ObservationRegistry`를 주입받아야 합니다.

## 비동기 처리와 Virtual Thread

이 프로젝트는 JDK 21의 Virtual Thread를 활용하여 높은 동시성을 처리합니다.

- `spring.threads.virtual.enabled: true` 설정으로 Tomcat이 Virtual Thread를 사용합니다.
- `@Async` 메서드는 `VirtualThreadTaskExecutor`와 `ContextPropagatingTaskDecorator`를 함께 사용합니다. 이를 통해 MDC의 traceId, spanId가 비동기 스레드로 자동 전파됩니다.
- 비동기 스레드 이름 접두사: `async-vt-`
