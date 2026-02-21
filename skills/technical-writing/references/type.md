# Document Types (유형)

> Source: [toss/technical-writing - type](https://github.com/toss/technical-writing)

## 4 Types

### 1. Learning (학습형)

- **Reader**: 처음 접하는 기술/도구를 이해하고 싶은 사람
- **Goal**: 전체 흐름을 파악하고 기초를 익힌다
- **Structure**: 사전 요구사항 → 단계별 튜토리얼 → 결과 확인
- **Key points**:
  - 독자는 해당 기술에 대한 사전 지식이 거의 없다고 가정한다
  - 순서대로 따라하면 결과를 얻을 수 있게 구성한다
  - 각 단계는 구체적이고 검증 가능해야 한다
  - 단계마다 예상 결과를 제시한다
- **Example**: "Redis 시작하기", "Docker 입문 가이드"

### 2. Problem-solving (문제 해결형)

- **Reader**: 기본 지식이 있고 구체적인 문제를 해결하려는 사람
- **Goal**: 특정 이슈를 빠르게 해결한다
- **Subtypes**:
  - **How-to**: 구체적인 구현 방법 ("Redis에서 캐시 만료 설정하기")
  - **Troubleshooting**: 오류 진단 및 해결 ("Redis 연결 오류 해결")
- **Structure**: 문제 정의 → 원인 분석 → 해결 단계 → 검증
- **Key points**:
  - 문제 상황을 명확하게 정의한다 (에러 메시지, 증상 포함)
  - 해결 단계는 순서대로 나열한다
  - 각 단계의 결과를 확인할 수 있게 한다
  - 관련 문제에 대한 참조 링크를 제공한다

### 3. Reference (레퍼런스형)

- **Reader**: 기본을 알고 있고 특정 기능/API를 찾아보려는 사람
- **Goal**: 정확한 사양 정보를 빠르게 확인한다
- **Structure**: 함수 시그니처 → 파라미터 → 반환값 → 코드 예시
- **Key points**:
  - 검색과 스캔이 쉽게 일관된 형식을 유지한다
  - 모든 파라미터의 타입, 필수 여부, 기본값을 명시한다
  - 실행 가능한 코드 예시를 포함한다
  - 관련 API/함수에 대한 링크를 제공한다
- **Example**: API 문서, 설정 옵션 목록, CLI 명령어 레퍼런스

### 4. Explanation (설명형)

- **Reader**: 개념, 원리, 배경 지식을 이해하고 싶은 사람
- **Goal**: 기술이 왜 존재하고 어떤 문제를 해결하는지 이해한다
- **Structure**: 배경 → 핵심 개념 → 원리 → 실제 적용
- **Key points**:
  - "왜?"에 집중한다 (기술의 존재 이유, 설계 결정)
  - 비유나 유추를 활용하여 추상적 개념을 설명한다
  - 구체적인 코드 단계보다 개념적 이해에 초점을 맞춘다
  - 다른 유형(학습형, 문제해결형)의 문서로 연결한다
- **Example**: "왜 마이크로서비스인가", "CAP 정리 이해하기"

## Selection Guide

| Reader says... | Type |
|----------------|------|
| "처음인데 어떻게 시작해요?" | Learning |
| "이거 어떻게 해요?" / "에러 나요" | Problem-solving |
| "이 API 파라미터가 뭐예요?" | Reference |
| "이게 왜 필요해요?" / "원리가 뭐예요?" | Explanation |

Documents can combine types, but one must be primary.
