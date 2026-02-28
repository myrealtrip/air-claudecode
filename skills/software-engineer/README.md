# Software Engineer

코드 구현 작업을 위해 software-engineer 에이전트로 라우팅합니다.

## 사용법

```
/air-claudecode:software-engineer <작업 설명>
```

## 사용 시점

- 사용자가 기능 구현, 버그 수정, 코드 리팩토링을 요청할 때
- 사용자가 "implement", "feature", "refactor", "구현", "개발", "코드 작성"이라고 말할 때
- 클린 코드 관행에 따른 코드 변경이 필요할 때

## 기능
- 클린 코드 원칙(KISS, DRY, YAGNI)에 따른 기능 구현
- 근본 원인 분석을 통한 버그 수정
- 가독성 높고 일관된 추상화 수준의 리팩토링
- Kotlin/Java/Spring 베스트 프랙티스 (생성자 주입, 레이어 분리, 불변성)
- 복잡한 `if-else`보다 `when` 사용, `var`보다 `val` 사용, `!!`보다 safe call 사용

## 워크플로우

1. **이해** -- 기존 코드를 읽고, 컨텍스트와 요구사항 파악
2. **계획** -- 변경할 파일 식별, 접근 방식 결정 (동작하는 가장 단순한 해결책)
3. **구현** -- 프로젝트 컨벤션에 따라 클린하고 가독성 높은 코드 작성
4. **검증** -- 컴파일 확인, 클린 코드 준수 여부 리뷰
5. **테스트** -- `/air-claudecode:test-engineer`를 호출하여 테스트 생성
6. **리뷰** -- 변경된 파일에 대해 `/air-claudecode:code-review` 호출
