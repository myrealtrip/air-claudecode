# Technical Writing

[toss/technical-writing](https://github.com/toss/technical-writing) 방법론에 따라 기술 문서를 작성합니다.

## 사용법

```
/air-claudecode:technical-writing Write a guide on setting up Redis caching
/air-claudecode:technical-writing API 인증 가이드 작성
```

## 워크플로우

1. **유형(Type)** -- 독자의 목표에 따라 문서 유형 결정 (학습 / 문제 해결 / 참조 / 설명)
2. **구조(Architecture)** -- 구조 설계 (제목, 개요, 정보 흐름)
3. **문장(Sentence)** -- 작성 및 다듬기 (명확한 주어, 간결, 자연스러운 한국어)

## 출력

- 기본: 작업 디렉토리의 `.claudedocs/technical-writing/{문서명}.md`
- 사용자가 커스텀 출력 경로를 지정할 수 있음

## 기능

- 독자의 목표에 따른 문서 유형 분류
- 가치 우선, 예측 가능한 레이아웃의 문서 구조 설계
- 한국어 기술 문서 작성 규칙에 따른 명확한 문장 작성
- 리뷰 가능한 완성된 마크다운 문서 생성

## 연계

- `/air-claudecode:sql-generator` -- 문서에 SQL 예제(DDL/DML)가 포함될 때 직접 SQL을 작성하는 대신 이 스킬에 SQL 생성을 위임
