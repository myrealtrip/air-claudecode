# API 계층 규칙

## URL 설계

- 모든 경로는 `/api/v1/`로 시작한다
- 모든 URL 세그먼트에 **kebab-case**를 사용한다
- 리소스 이름에 **복수 명사**를 사용한다 (`/users`, `/orders`)
- 동사가 아닌 명사를 사용하며, 최대 3단계까지 중첩한다
- 비CRUD 동작은 하위 경로로 표현한다: `POST /api/v1/orders/{id}/cancel`

## 응답 형식

- 모든 컨트롤러는 `ResponseEntity<ApiResource<T>>`를 반환한다
- `ApiResource.success(data)`: 단건 객체
- `ApiResource.ofPage(page)`: 페이징 결과
- `ApiResource.success()`: DELETE/void 작업
- 기본 페이징: `Pageable.ofSize(100)`

## 컨트롤러 구조

- 메서드당 **7줄 이하** — 컨트롤러는 HTTP 라우팅만 담당한다
- **UseCase만 주입** — 각 컨트롤러는 여러 UseCase를 주입할 수 있다
- 요청 DTO에 `@Valid @RequestBody`를 사용한다
- 요청 DTO의 `toCommand()`로 변환한다
- 파라미터에 제약 어노테이션을 사용할 때 `@Validated`를 추가한다

## 검색 엔드포인트

- 필터 1~2개: `@RequestParam`을 직접 사용한다
- 필터 3개 이상: `{Feature}SearchCondition` 객체로 캡슐화한다
- 날짜 범위 필드에는 `SearchDates`를 사용한다

## 요청 및 응답 DTO

### 패키지 구조

- 표현 계층 DTO는 `request/`와 `response/` 패키지로 분리한다
- 응용 계층 DTO는 `command/`와 `result/` 패키지로 분리한다
- 요청/응답 DTO를 같은 파일에 혼합하지 않는다

### 네이밍 규칙

| 유형 | 네이밍 | 패키지 |
|------|--------|--------|
| 표현 계층 요청 | `{Action}{Feature}Request` | `presentation/{scope}/request/` |
| 표현 계층 응답 | `{Feature}Response` | `presentation/{scope}/response/` |
| 응용 계층 커맨드 | `{Action}{Feature}Command` | `application/dto/command/` |
| 응용 계층 결과 | `{Feature}Result` | `application/dto/result/` |

### JsonFormat 사용 위치 지정

| 대상 | 방향 | 용도 |
|------|------|------|
| `@param:JsonFormat` | 요청 (역직렬화) | 생성자 파라미터 |
| `@get:JsonFormat` | 응답 (직렬화) | Getter 포맷팅 |
| `@field:JsonFormat` | 양방향 | 필드 레벨 적용 |

- `@param`을 응답에, `@get`을 요청에 사용하면 **동작하지 않는다**

## REST Docs

- **`RestDocsSupport`** 베이스 클래스를 상속한다
- **UseCase**를 모킹한다 (Service가 아님)
- **`DocsFieldType`** 사용: `STRING`, `NUMBER`, `BOOLEAN`, `DATE`, `DATETIME`, `ENUM(Class::class)`
- **Field DSL** 사용: `"fieldName" type TYPE means "설명"`
- **필드 설명은 한글**로 작성한다 (프로젝트 규칙)
- 테스트 메서드 이름이 스니펫 디렉토리가 된다 — 명확한 영어 이름을 사용한다
  - 좋은 예: `` `get holidays by year` `` → `get-holidays-by-year/`
  - 나쁜 예: `` `should return holidays` ``

### 응답 패턴

| 유형 | 헬퍼 |
|------|------|
| 단건 객체 | `responseCommonFieldsSubsection()` + `dataResponseFields()` |
| 배열 | `responseArrayCommonFieldsSubsection()` + `dataResponseFields()` |
| 문자열 (DELETE) | `responseStringCommonFields()` |
| 페이징 | `pageRequestFormat()` + `pageCommonFormat()` 추가 |

### 빌드

- 문서 생성: `./gradlew clean :modules:docs:docs`
- 특정 테스트 실행: `./gradlew test --tests "...DocsTest"`
