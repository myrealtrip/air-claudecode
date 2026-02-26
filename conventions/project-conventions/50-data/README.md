# 데이터 접근

## JPA와 Hibernate

### 핵심 규칙

- **BaseEntity** (전체 감사) 또는 **BaseTimeEntity** (시간만)를 상속한다
- 항상 `@Enumerated(EnumType.STRING)` — ORDINAL 사용 금지
- 모든 연관관계에 `FetchType.LAZY` 사용
- 항상 `@Table(name = "xxx")` 명시

### 연관관계 정책

| 규칙 | 설명 |
|------|------|
| 기본 | 엔티티 연관관계를 매핑하지 않는다 — FK를 단순 ID로 저장한다 |
| 예외 | 단방향만 허용, 반드시 필요한 경우에만 |
| 금지 | 양방향 연관관계는 엄격히 금지 |
| 조회 | 관련 데이터 조인에 QueryDSL을 사용한다 |

### 엔티티 구조

- `@Entity` + `@Table(name = "xxx")` + `BaseEntity`/`BaseTimeEntity` 상속
- 불변 필드(`id`)는 `val`, 가변 필드는 `var`
- 상태 변경은 `update()` 메서드, 생성은 `create()` companion으로
- **엔티티는 DTO를 참조하지 않는다**

### 설정

- `ddl-auto: none` — 프로덕션에서 DDL 자동 생성 금지
- `open-in-view: false` — OSIV 비활성화 (필수)
- `default_batch_fetch_size: 500`, `batch_size: 500`

### 잠금

| 전략 | 사용 시점 |
|------|-----------|
| 낙관적 잠금 (`@Version`) | 낮은 경합, 읽기 위주 |
| 비관적 잠금 (`@Lock`) | 높은 경합, 임계 영역 |

### 주의사항

- LazyInitializationException은 QueryDSL로 DTO를 조회하여 해결한다
- N+1 문제는 QueryDSL JOIN으로 해결한다
- 더티 체킹: `@Transactional` 내에서 업데이트 시 명시적 `save()` 호출이 불필요하다

## QueryDSL

### 핵심 규칙

- **QuerydslRepositorySupport**를 상속한다
- **`QueryRepository` 접미사** 사용 (`OrderQueryRepository`)
- 모든 조회 메서드에 **`fetch` 접두사** 사용
- DTO 생성자에 **`@QueryProjection`** 사용

### 메서드 네이밍

| 패턴 | 예시 |
|------|------|
| 단건 | `fetchById`, `fetchByCode` |
| 목록 | `fetchAllByUserId` |
| 페이징 | `fetchPageByStatus` |
| 건수 | `fetchCountByStatus` |
| 존재 여부 | `existsByEmail` |

### 페이징

- 항상 **`Pageable`**을 받는다 — 원시 `page`/`size` 파라미터 사용 금지
- 별도의 content 쿼리와 count 쿼리로 `applyPagination`을 사용한다

### 동적 조건

- null 안전 동적 필터링에 **`QuerydslExpressions`**를 사용한다
- 사용 가능: `eq`, `gt/gte/lt/lte`, `contains`, `startsWith`, `in`, `dateBetween`
- 모든 메서드는 값이 null이거나 비어 있으면 `null`을 반환한다 (QueryDSL `where()`에서 무시됨)

### SearchCondition

- 복합 필터를 **`{Feature}SearchCondition`** data class로 캡슐화한다
- 날짜 범위 필드에 **`SearchDates`**를 사용한다

## SQL 스타일

- **ANSI SQL**, **소문자** 키워드와 식별자
- **앞쪽 쉼표(leading commas)**, 주요 절(clause) **우측 정렬**
- 테이블: **snake_case**, **복수** 명사
- 코드/상태 컬럼에 **ENUM 타입 사용 금지** — `varchar` 사용
- **FK 제약이나 인덱스를 기본으로 추가하지 않는다** — 주석으로 제안
- 제약 네이밍: `pk_`, `uk_`, `fk_`, `idx_` + `{table_name}` + `_01`, `_02`
- `select *` 사용 금지, 명시적 `JOIN` 사용, 서브쿼리보다 `CTE` 선호, `in`보다 `exists` 선호
