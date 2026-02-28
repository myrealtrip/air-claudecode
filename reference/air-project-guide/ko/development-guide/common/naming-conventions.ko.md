---
description: 클래스, DTO, 엔티티, URL, Git 네이밍 규칙
keywords: [naming, class name, DTO name, entity name, URL path, git branch, git commit]
---

# 네이밍 컨벤션

이 문서는 프로젝트 전반에 걸친 이름 규칙을 정리한 가이드입니다. 일관된 이름 규칙을 따르면 코드를 처음 보는 팀원도 빠르게 구조를 파악할 수 있습니다.


## 기본 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 클래스/인터페이스 | `PascalCase` | `UserService`, `OrderRepository` |
| 함수/메서드 | `camelCase` (동사 시작) | `findUserById()`, `calculateTotal()` |
| 변수 | `camelCase` | `userName`, `orderCount` |
| 상수 | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| 패키지 | 소문자, 언더스코어 없음 | `com.myrealtrip.air.order.domain` |
| Boolean | 질문 형태 | `isValid`, `hasPermission`, `canExecute` |
| 약어 (2자) | 전체 대문자 | `IOStream`, `ID` |
| 약어 (3자 이상) | 첫 글자만 대문자 | `XmlParser`, `HttpClient` |


## 레이어별 클래스 이름

각 레이어에서 사용하는 클래스는 정해진 접미사 패턴을 따릅니다. 이 규칙을 보면 클래스 이름만으로도 어느 레이어에 속하는지 바로 알 수 있습니다.

| 레이어 | 패턴 | 예시 |
|---|---|---|
| Application (진입점) | `{Service}Application` | `AirOrderApplication` |
| Controller | `{Domain}Controller` | `OrderController` |
| UseCase | `{동사}{명사}UseCase` | `CreateOrderUseCase` |
| Service | `{명사}Service` | `OrderService` |
| Repository (JPA) | `{명사}Repository` | `OrderRepository` |
| QueryRepository | `{명사}QueryRepository` | `OrderQueryRepository` |
| Entity | `{명사}Entity` | `OrderEntity` |
| Config | `{기능}Config` | `AsyncConfig` |


## DTO 이름 규칙

데이터는 레이어를 거치면서 다음과 같이 변환됩니다.

```
request → command → result → response
```

각 단계에 맞는 이름 패턴과 위치를 사용합니다.

| 단계 | 패턴 | 위치 | 예시 |
|---|---|---|---|
| Request | `{액션}{리소스}Request` | `presentation/{scope}/request/` | `CreateOrderRequest` |
| Response | `{리소스}Response` | `presentation/{scope}/response/` | `OrderResponse` |
| Command | `{액션}{리소스}Command` | `application/dto/command/` | `CreateOrderCommand` |
| Result | `{리소스}Result` | `application/dto/result/` | `OrderResult` |
| SearchCondition | `{기능}SearchCondition` | `application/dto/command/` | `OrderSearchCondition` |

특정 액션에 대한 응답은 `{리소스}{액션}Response` 형식을 사용합니다. 예: `OrderCancelResponse`


## 엔티티 & 도메인 이름 규칙

엔티티와 도메인 객체는 명확하게 구분합니다. 엔티티 클래스에는 반드시 `Entity` 접미사를 붙이고, 도메인 클래스는 접미사 없이 사용합니다.

| 대상 | 패턴 | 예시 |
|---|---|---|
| 엔티티 클래스 | `{명사}Entity` | `OrderEntity`, `PassengerEntity` |
| 도메인 클래스 | `{명사}` (접미사 없음) | `Order`, `Passenger` |
| 테이블 이름 | `snake_case`, 복수형 | `orders`, `payment_methods` |
| 컬럼 이름 | `snake_case` | `created_at`, `order_status` |
| Enum 클래스 | `PascalCase` | `OrderStatus`, `PaymentMethod` |
| Enum 상수 | `SCREAMING_SNAKE_CASE` | `PENDING`, `IN_PROGRESS` |


## 날짜/시간 필드 접미사

날짜와 시간을 나타내는 필드는 타입에 맞는 접미사를 사용합니다. 접미사만 봐도 어떤 타입인지 파악할 수 있습니다.

| 타입 | 접미사 | 예시 |
|---|---|---|
| `LocalDate` | `Date` | `startDate`, `birthDate` |
| `LocalTime` | `Time` | `departureTime`, `checkInTime` |
| `LocalDateTime` | `At` | `createdAt`, `expiredAt` |
| `ZonedDateTime` | `AtZoned` | `scheduledAtZoned`, `publishedAtZoned` |


## 예외 처리 이름 규칙

도메인별 예외 클래스를 별도로 만들면 안 됩니다. 프로젝트에서 제공하는 공통 예외 클래스와 `ErrorCode` enum을 사용합니다.

| 유형 | 패턴 | 예시 |
|---|---|---|
| 예측 가능한 오류 | `KnownBusinessException` + `ErrorCode` | `KnownBusinessException(ErrorCode.DATA_NOT_FOUND, "...")` |
| 예상치 못한 오류 | `BusinessException` + `ErrorCode` | `BusinessException(ErrorCode.ILLEGAL_STATE, "...")` |
| ErrorCode | `SCREAMING_SNAKE_CASE` | `DATA_NOT_FOUND`, `INVALID_ARGUMENT` |


## 이벤트 이름 규칙

이벤트는 sealed class로 정의하고, 내부 클래스로 각 이벤트 유형을 선언합니다.

| 대상 | 패턴 | 예시 |
|---|---|---|
| 이벤트 클래스 | `{도메인}Event.{액션}` (sealed) | `OrderEvent.Created`, `OrderEvent.Cancelled` |
| 이벤트 리스너 | `{도메인}EventListener` | `OrderEventListener` |
| 이벤트 패키지 | `infrastructure/event/` | — |

```kotlin
sealed class OrderEvent {
    data class Created(val orderId: Long) : OrderEvent()
    data class Cancelled(val orderId: Long, val reason: String) : OrderEvent()
}
```


## QueryDSL 메서드 이름 규칙

QueryRepository에서 QueryDSL을 사용할 때는 반환 유형에 따라 메서드 이름의 접두사를 구분합니다.

| 유형 | 접두사 | 예시 |
|---|---|---|
| 단건 조회 | `fetchXxx` | `fetchById`, `fetchByOrderNumber` |
| 목록 조회 | `fetchAllXxx` | `fetchAllByUserId` |
| 페이지 조회 | `fetchPageXxx` | `fetchPageByStatus` |
| 개수 조회 | `fetchCountXxx` | `fetchCountByStatus` |
| 존재 여부 | `existsXxx` | `existsByEmail` |


## URL 이름 규칙

API URL은 kebab-case를 사용하고, 리소스는 복수 명사로 표현합니다.

| 규칙 | 예시 |
|---|---|
| 기본 경로 형식 | `/api/v1/{resource}` |
| kebab-case 사용 | `/api/v1/order-items` |
| 복수 명사 사용 | `/api/v1/users`, `/api/v1/orders` |
| CRUD 외 액션 | `POST /api/v1/orders/{id}/cancel` |
| 최대 3단계 중첩 | `/api/v1/users/{id}/orders` |


## Git 이름 규칙

| 대상 | 패턴 | 예시 |
|---|---|---|
| 브랜치 | `{type}/{description}` | `feat/PROJ-123-add-login` |
| 커밋 | `{type}({scope}): {description}` | `feat(order): add cancel endpoint` |


## 테스트 메서드 이름 규칙

테스트 메서드는 어떤 상황에서 어떤 결과를 기대하는지 명확하게 표현합니다.

| 방식 | 예시 |
|---|---|
| 행동 패턴 | `` `should calculate discount when gold member` `` |
| 메서드 패턴 | `` `findById - existing user - returns user` `` |


## 안티 패턴 (하면 안 되는 것들)

다음은 자주 발생하는 이름 관련 실수입니다. 코드 리뷰 시 특히 주의합니다.

| 실수 | 나쁜 예 | 좋은 예 |
|---|---|---|
| 축약어 사용 | `usr`, `ord`, `calc` | `user`, `order`, `calculate` |
| 헝가리안 표기법 | `strName`, `intCount` | `name`, `count` |
| 모호한 이름 | `data`, `info`, `manager` | `OrderData`, `FlightInfo` |
| Kotlin에서 케이스 혼용 | `userId` vs `user_id` | `userId`로 통일 |
| `Impl` 접미사 | `UserServiceImpl` | 단일 구현이면 인터페이스 불필요 |
| Entity 접미사 누락 | `Order` (엔티티 클래스) | `OrderEntity` |
| 도메인별 예외 클래스 | `OrderNotFoundException` | `KnownBusinessException(ErrorCode.DATA_NOT_FOUND)` |
| `of` 외 팩토리 이름 | `from()`, `create()`, `toXxx()` | `of()` (예외: `toDomain()`) |
