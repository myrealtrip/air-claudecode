# Log Analyzer

로그 검색 및 분석 작업을 위해 log-analyzer 에이전트로 라우팅합니다.

## 사용법

```
/air-claudecode:log-analyzer <쿼리 또는 설명>
```

## 예시

```
/air-claudecode:log-analyzer 최근 1시간 ERROR 로그 조회
/air-claudecode:log-analyzer OOM 관련 로그 분석
/air-claudecode:log-analyzer --index app-logs-* --from 2h --level ERROR payment 관련 에러
/air-claudecode:log-analyzer 최근 30분간 5xx 에러 트렌드 분석
```

## 기능

- 시간 범위, 로그 레벨, 키워드 필터를 사용한 로그 검색
- 에러 패턴 분석 및 그룹화
- 시계열 트렌드 분석 (에러율 급증, 지연 시간 패턴)
- 스택 트레이스 추출 및 근본 원인 제안
- 모든 타임스탬프를 KST (UTC+9)로 표시
- 현재 OpenSearch를 로그 공급자로 지원 (다른 공급자로 확장 가능)
