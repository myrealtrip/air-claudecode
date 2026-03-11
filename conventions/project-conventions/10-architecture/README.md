# 아키텍처와 모듈 구조

## 모듈 구성

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

- `-app` 접미사: Spring Boot 실행 모듈 (bootJar 활성화)
- 접미사 없음: 라이브러리 모듈 (jar만 생성)

## 의존성 방향 (단방향만 허용)

```
bootstrap → domain, infrastructure, common-web
infrastructure → domain, common
domain → common (only)
common → nothing
```

- domain 내부: Application DTO → Domain Model (Domain Model은 DTO를 참조하지 않는다)

## 4계층 구조

```
Controller (bootstrap) → UseCase (domain)
  → Application Service (domain)
    → Domain Model / Policy / Service (domain)
      ← JPA Entity / Repository / Mapper (infrastructure)
```

상위 계층만 하위 계층에 의존한다. 인프라 계층은 도메인 계층에 의존한다. 역방향 의존은 금지한다.

## 계층별 책임

| 계층 | 클래스 | 어노테이션 | 주입 대상 | 주입 금지 |
|------|--------|------------|-----------|-----------|
| 표현 | Controller | `@RestController` | UseCase만 | Service, Repository, Infrastructure |
| 응용 | UseCase | `@Service`, `@Transactional` | Application Service, Domain Policy/Service, EventPublisher | Repository, 다른 UseCase |
| 응용 | Application Service | `@Service` | Repository, Mapper | 다른 Application Service |
| 도메인 | Policy | `@Component` | 도메인 컴포넌트만 | Repository, Infrastructure |
| 도메인 | Domain Service | `@Component` | 도메인 컴포넌트만 | Repository, Infrastructure |
| 인프라 | Repository | `@Repository` | - | - |
| 인프라 | Mapper | `@Component` | - | - |

## 트랜잭션 소유권

| 계층 | 트랜잭션 |
|------|----------|
| Controller | 없음 |
| UseCase (읽기) | `@Transactional(readOnly = true)` |
| UseCase (쓰기) | `@Transactional` |
| Application Service | 없음 (UseCase에서 전파) |

## DTO 흐름

```
API Request → Controller converts → Command (Application)
  → Application Service creates/queries Domain Model → {Feature}Result (Application)
    → Controller converts → Response (Presentation) → ApiResource.success()
```

## 교차 도메인 오케스트레이션

- **UseCase → 여러 Application Service**: 단일 원자적 트랜잭션 (쓰기 작업)
- **UseCase → Event → Listener**: 최종 일관성 (교차 도메인 부수 효과)

## 패키지 규칙

- Domain: `{projectGroup}.{appname}/{domain/model,domain/policy,domain/service,domain/event,application/usecase,application/service,application/dto}/`
- Presentation: `{projectGroup}.{appname}/{presentation/external,presentation/internal}/`
- Infrastructure: `{projectGroup}.{appname}/{infrastructure/persistence,infrastructure/client,infrastructure/event}/`

## 안티패턴

- Controller에서 Service를 직접 호출 (UseCase를 우회)
- JPA 엔티티를 API 응답으로 반환 (Domain Model → Result → Response를 거쳐 노출)
- UseCase에 비즈니스 로직 작성 (Domain Policy/Service에 작성해야 한다)
- Application Service에 `@Transactional` 선언 (UseCase에서만 관리)
- Domain Model에 JPA 어노테이션 사용 (Domain Model과 JPA Entity를 분리)
- UseCase에서 다른 UseCase를 주입 (Application Service를 주입해야 한다)
