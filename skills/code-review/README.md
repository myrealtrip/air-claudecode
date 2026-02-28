# Code Review

코드 리뷰를 위해 code-reviewer 에이전트로 라우팅합니다.

## 사용법

```
/air-claudecode:code-review <대상>
```

## 기능

- 코드 품질 리뷰 (KISS, DRY, YAGNI, 클린 코드)
- 보안 취약점 탐지 (OWASP Top 10)
- 성능 병목 식별 (N+1, 리소스 누수)
- 테스트 커버리지 평가
- 문서 완성도 점검
- 심각도 등급별 출력: P0 (차단), P1 (주요), P2 (사소), NIT
- 인라인 코멘트 접두사: `[BLOCKING]`, `[MAJOR]`, `[MINOR]`, `[NIT]`, `[SUGGESTION]`, `[QUESTION]`, `[PRAISE]`
- 모든 리뷰 결과는 한국어로 출력
