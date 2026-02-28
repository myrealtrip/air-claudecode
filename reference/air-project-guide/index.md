# Air Project Guide — AI Reference Index

> **IMPORTANT**: This guide applies to the following repositories. When you are developing in any of these repos, you MUST read the matched guide document from the lookup table below BEFORE writing or modifying code.

## Target Repositories

| Repository | Description |
|---|---|
| [air-console](https://github.com/myrealtrip/air-console) | Air console application |
| [air-insurance](https://github.com/myrealtrip/air-insurance) | Air insurance service |
| [air-international](https://github.com/myrealtrip/air-international) | Air international flights service |
| [air-navigator](https://github.com/myrealtrip/air-navigator) | Air navigator service |
| [air-notification](https://github.com/myrealtrip/air-notification) | Air notification service |
| [air-pricing](https://github.com/myrealtrip/air-pricing) | Air pricing service |
| [air-reconciliation](https://github.com/myrealtrip/air-reconciliation) | Air reconciliation service |

## How to Use

1. Identify which domain your task touches (e.g., controller, JPA entity, exception handling)
2. Find the matching keywords in the lookup table below
3. Read the referenced guide document **before** writing any code
4. Follow the patterns and conventions described in the guide

## Lookup Table

| Keywords | File | Scope |
|---|---|---|
| package, layer, module, dependency, domain, infrastructure, adapter | `ai/architecture/module-structure.md` | Package structure, layer dependency rules |
| ApiResource, response code, virtual thread, observability, cross-cutting | `ai/architecture/cross-cutting-concerns.md` | ApiResource wrapper, response codes, logging pipeline, observability, Virtual Thread |
| controller, URL, endpoint, REST, pagination, search API, @GetMapping, @PostMapping | `ai/development-guide/api/controller-guide.md` | URL design, controller patterns, pagination, search endpoints |
| request, response, DTO, validation, @Valid, error response, Bean Validation | `ai/development-guide/api/api-guide.md` | Request/Response DTO, Bean Validation, error response format |
| kotlin style, object mapping, configuration, val, data class | `ai/development-guide/common/coding-conventions.md` | Kotlin/Spring coding rules, object conversion, config management |
| @ConfigurationProperties, @Value, properties, YAML, config binding, prefix | `ai/development-guide/common/configuration-properties-guide.md` | ConfigurationProperties pattern, validation, nested config |
| naming, class name, DTO name, entity name, URL path, git branch, git commit | `ai/development-guide/common/naming-conventions.md` | Class, DTO, entity, URL, Git naming rules |
| annotation order, @Service, @Transactional, @Valid, @Column, declaration order | `ai/development-guide/common/annotation-order.md` | Annotation ordering at class/method/field/parameter level |
| exception, error handling, GlobalExceptionHandler, BusinessException, KnownBusinessException, error code | `ai/development-guide/common/exception-guide.md` | Exception hierarchy, handler mapping, exception selection |
| ErrorCode, ResponseCode, SuccessCode, 400 vs 422, error response, custom message | `ai/development-guide/common/error-code-guide.md` | ResponseCode system, ErrorCode selection, error response format |
| logging, log level, kotlin-logging, structured logging, MDC, @Logging | `ai/development-guide/common/logging-guide.md` | kotlin-logging, log levels, logging pipeline, custom annotations |
| tracing, OpenTelemetry, span, trace ID, MDC propagation, ObservationRegistry | `ai/development-guide/common/tracing-guide.md` | Distributed tracing, OpenTelemetry, MDC propagation, ObservationRegistry |
| coroutine, concurrency, async, MDC propagation, dispatcher, retry, structured concurrency | `ai/development-guide/common/concurrency-guide.md` | MDC propagation, dispatcher selection, retry, structured concurrency |
| test, JUnit5, AssertJ, Kotest, MockK, unit test, integration test, @Nested | `ai/development-guide/common/testing-guide.md` | Test format, assertions, mocking, test types, quality checklist |
| RestClient, external API, timeout, retry, @HttpExchange, ObservationRegistry, HTTP client | `ai/development-guide/common/external-client-guide.md` | RestClient setup, @HttpExchange, error handling, retry, parallel calls |
| event, domain event, ApplicationEventPublisher, @EventListener, @TransactionalEventListener, @Async | `ai/development-guide/common/event-guide.md` | Event definition, publishing, listener types, async events |
| JPA, Hibernate, entity, @Entity, association, fetch, lock, enum mapping, converter | `ai/development-guide/persistence/jpa-guide.md` | Entity design, associations, conversion, Enum, Fetch, Lock |
| QueryDSL, QueryRepository, projection, dynamic query, BooleanExpression | `ai/development-guide/persistence/querydsl-guide.md` | QueryRepository structure, Projection, pagination, dynamic conditions |
| transaction, @Transactional, propagation, rollback, external call separation | `ai/development-guide/persistence/transaction-guide.md` | Transaction scope, propagation, external call separation, rollback rules |
