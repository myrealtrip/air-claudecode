# Spring 패턴

## 어노테이션 순서

> Spring/JPA를 먼저, Lombok을 마지막에 선언한다. 핵심 프레임워크를 설정보다 앞에 둔다.

### 클래스 레벨

| 계층 | 순서 |
|------|------|
| Entity | `@Entity` → `@Table` → `@Builder` → `@AllArgsConstructor` → `@NoArgsConstructor(access = PROTECTED)` → `@Getter` |
| Controller | `@RestController` → `@RequestMapping` → `@RequiredArgsConstructor` |
| UseCase | `@Service` → `@Transactional(readOnly = true)` → `@RequiredArgsConstructor` |
| Configuration | `@Configuration` → `@Enable*` → `@RequiredArgsConstructor` |
| DTO | `@Builder` → `@AllArgsConstructor` → `@Getter` → `@ToString` |

- 엔티티에 `@ToString`과 `@EqualsAndHashCode` **사용 금지** (LazyInitializationException 위험)
- `@Builder` 사용 시 `@AllArgsConstructor` **필수**

### 필드 / 메서드 / 파라미터

| 레벨 | 순서 |
|------|------|
| 필드 (ID) | `@Id` → `@GeneratedValue` |
| 필드 (Column) | `@Column` → `@NotBlank` |
| 필드 (관계) | `@ManyToOne` → `@JoinColumn` |
| 메서드 (Controller) | `@GetMapping` → `@PreAuthorize` → `@Cacheable` |
| 메서드 (Service) | `@Transactional` → `@CacheEvict` |
| 메서드 (Repository) | `@Query` → `@Lock` → `@EntityGraph` |
| 메서드 (Event) | `@Async` → `@TransactionalEventListener` |
| 파라미터 | `@Valid` → `@RequestBody` |

### Lombok 내부 순서

`@Builder` → 생성자 → `@Getter`/`@Setter` → `@ToString` → `@EqualsAndHashCode`

## 트랜잭션 관리

> 트랜잭션은 작고 빠르게 유지한다. 외부 I/O를 포함하지 않는다. 자기 호출(self-invocation)에 주의한다.

### 핵심 규칙

- **작게 유지**: 트랜잭션 안에 필요한 DB 작업만 포함한다
- **외부 I/O 금지**: 트랜잭션 안에서 HTTP 호출, 파일 I/O, 메시징을 수행하지 않는다
- **자기 호출 금지**: 같은 클래스의 `@Transactional` 메서드 호출은 프록시를 우회한다 — 별도 서비스로 추출한다
- **public 메서드만**: 프록시는 public 메서드에만 동작한다
- **빠른 실패**: 트랜잭션 시작 전에 유효성을 검증한다

### Master/Slave 라우팅

- `@Transactional(readOnly = true)` → **Slave** (Reader)
- `@Transactional` (기본) → **Master** (Writer)
- 올바른 라우팅을 위해 `LazyConnectionDataSourceProxy`가 필요하다

### 전파 수준

| 수준 | 사용 시점 |
|------|-----------|
| `REQUIRED` | 기본값, 기존 트랜잭션에 참여하거나 새로 생성 |
| `REQUIRES_NEW` | 감사 로그, 독립 작업 |
| `NESTED` | 기존 트랜잭션 내 세이브포인트 (부분 롤백) |

### 커밋 후 부수 효과

- 외부 호출은 트랜잭션 밖으로 이동한다
- 커밋 후 부수 효과에는 `@TransactionalEventListener(AFTER_COMMIT)`을 사용한다

### 주의사항

- 자기 호출은 프록시를 우회한다 — 별도 서비스로 추출한다
- 체크 예외는 롤백을 발생시키지 않는다 — `rollbackFor`를 사용한다
- 긴 트랜잭션은 락 경합과 커넥션 고갈을 유발한다

## 비동기와 이벤트 처리

> 커밋 후 부수 효과에는 `@Async` + `@TransactionalEventListener(AFTER_COMMIT)`을 사용한다.

### 설정

- 프로젝트는 MDC를 위해 `ContextPropagatingTaskDecorator`가 적용된 `VirtualThreadTaskExecutor`를 사용한다
- 데코레이터 없이 커스텀 `TaskExecutor`를 생성하지 않는다

### @Async 규칙

- **public 메서드만** — 프록시는 private/protected를 가로챌 수 없다
- **자기 호출 금지** — 별도 `@Component`로 추출한다
- 반환값이 필요 없으면 `Unit`을, 호출자가 결과를 필요로 하면 `CompletableFuture<T>`를 반환한다

### 이벤트 리스너 패턴

- `@Async` + `@TransactionalEventListener(phase = AFTER_COMMIT, fallbackExecution = true)`를 사용한다
- 리스너 로직을 반드시 try-catch로 감싸고 명시적으로 에러를 로깅한다

### 이벤트 설계

- 이벤트별 독립 data class를 사용한다: `{Feature}{Action}Event` (예: `OrderCreatedEvent`, `OrderCancelledEvent`)
- ID와 최소한의 컨텍스트만 포함한다 — 엔티티나 DTO를 넣지 않는다
- `domain/event/` 패키지에 위치한다
- 리스너: `{Feature}EventListener`를 `infrastructure/event/`에 위치시킨다

### 트랜잭션 단계

| 단계 | 사용 시점 |
|------|-----------|
| `AFTER_COMMIT` | 부수 효과 (알림, 외부 API) |
| `AFTER_ROLLBACK` | 실패 시 보상 동작 |
| `BEFORE_COMMIT` | 트랜잭션 내 검증 |
