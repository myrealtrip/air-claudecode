# Air Project Guide

> Air 프로젝트의 개발 가이드 문서입니다. 코드를 작성하기 전에 관련 문서를 먼저 읽어주세요.

## 아키텍처

| 문서 | 설명 |
|---|---|
| [모듈 구조](architecture/module-structure.ko.md) | 패키지 구조, 레이어 간 의존성 규칙, DTO 흐름 |
| [공통 관심사](architecture/cross-cutting-concerns.ko.md) | ApiResource 응답 형식, 응답 코드 체계, 로깅 파이프라인, 분산 추적, Virtual Thread |

## API

| 문서 | 설명 |
|---|---|
| [컨트롤러 가이드](development-guide/api/controller-guide.ko.md) | URL 설계 규칙, 컨트롤러 패턴, 페이지네이션, 검색 엔드포인트 |
| [API 요청/응답 가이드](development-guide/api/api-guide.ko.md) | Request/Response DTO, Bean Validation, 에러 응답 형식 |

## 공통 규칙

| 문서 | 설명 |
|---|---|
| [코딩 컨벤션](development-guide/common/coding-conventions.ko.md) | Kotlin/Spring 코딩 규칙, 객체 변환, 설정 관리 |
| [네이밍 컨벤션](development-guide/common/naming-conventions.ko.md) | 클래스, DTO, 엔티티, URL, Git 네이밍 규칙 |
| [어노테이션 순서](development-guide/common/annotation-order.ko.md) | 클래스/메서드/필드/파라미터 레벨 어노테이션 선언 순서 |
| [ConfigurationProperties 가이드](development-guide/common/configuration-properties-guide.ko.md) | `@ConfigurationProperties` 패턴, 유효성 검증, 중첩 설정 |

## 예외 처리 & 에러

| 문서 | 설명 |
|---|---|
| [예외 처리 가이드](development-guide/common/exception-guide.ko.md) | 예외 계층 구조, GlobalExceptionHandler 매핑, 예외 선택 기준 |
| [에러 코드 가이드](development-guide/common/error-code-guide.ko.md) | ErrorCode 선택 흐름, 400 vs 422 구분, 에러 메시지 작성 규칙 |

## 로깅 & 추적

| 문서 | 설명 |
|---|---|
| [로깅 가이드](development-guide/common/logging-guide.ko.md) | kotlin-logging 설정, 로그 레벨 선택, 로깅 파이프라인, 커스텀 어노테이션 |
| [분산 추적 가이드](development-guide/common/tracing-guide.ko.md) | OpenTelemetry 설정, MDC 전파, ObservationRegistry 주입 규칙 |

## 동시성 & 외부 연동

| 문서 | 설명 |
|---|---|
| [동시성 & 코루틴 가이드](development-guide/common/concurrency-guide.ko.md) | MDC 전파, 디스패처 선택, 재시도, 구조적 동시성 |
| [외부 API 클라이언트 가이드](development-guide/common/external-client-guide.ko.md) | RestClient 설정, `@HttpExchange`, 에러 처리, 재시도, 병렬 호출 |
| [이벤트 가이드](development-guide/common/event-guide.ko.md) | 도메인 이벤트 정의, 발행, 리스너 유형, 비동기 이벤트 |

## 테스트

| 문서 | 설명 |
|---|---|
| [테스트 가이드](development-guide/common/testing-guide.ko.md) | 테스트 형식, 어설션, 목킹, 테스트 유형, 품질 체크리스트 |

## 영속성 (JPA & DB)

| 문서 | 설명 |
|---|---|
| [JPA & Hibernate 가이드](development-guide/persistence/jpa-guide.ko.md) | 엔티티 설계, 연관관계, 타입 변환, Enum 매핑, Fetch 전략, Lock |
| [QueryDSL 가이드](development-guide/persistence/querydsl-guide.ko.md) | QueryRepository 구조, Projection, 페이지네이션, 동적 조건 |
| [트랜잭션 가이드](development-guide/persistence/transaction-guide.ko.md) | 트랜잭션 범위, 전파 속성, 외부 호출 분리, 롤백 규칙 |
