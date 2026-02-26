# air-scaffold

Kotlin/Spring 프로젝트의 초기 패키지 구조를 자동 생성하는 Claude Code 플러그인.

## 설치

```bash
claude plugin add /path/to/air-claudecode/plugins/air-scaffold
```

## 사용법

```
/air-scaffold:init-package [project-name] [base-package]
```

### 예시

```
/air-scaffold:init-package my-service com.myrealtrip.myservice
```

### 인자

| 인자 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `project-name` | Y | 프로젝트명 (kebab-case) | `my-service` |
| `base-package` | Y | 베이스 패키지 | `com.myrealtrip.myservice` |

인자를 생략하면 대화형으로 입력을 요청합니다.

## 생성되는 구조

air-international layer-first 아키텍처 기반:

```
{project-name}/
├── build.gradle.kts
├── settings.gradle.kts
├── src/main/kotlin/{basePackagePath}/
│   ├── {AppName}Application.kt
│   ├── application/
│   │   ├── dto/command/
│   │   ├── dto/result/
│   │   ├── service/
│   │   └── usecase/
│   ├── domain/
│   ├── infrastructure/
│   │   ├── client/
│   │   ├── event/
│   │   └── persistence/
│   │       ├── entity/
│   │       ├── mapper/
│   │       └── repository/
│   ├── presentation/
│   │   ├── external/
│   │   │   ├── request/
│   │   │   └── response/
│   │   └── internal/
│   │       ├── admin/
│   │       │   ├── request/
│   │       │   └── response/
│   │       └── proxy/
│   │           ├── request/
│   │           └── response/
│   ├── configuration/
│   │   ├── exception/
│   │   └── properties/
│   └── support/
│       ├── enums/
│       ├── model/
│       └── utils/
└── src/main/resources/
    └── application.yml
```

## Generator-Evaluator 루프

1. **입력 수집** — 프로젝트명, 베이스 패키지 파싱
2. **Generate** — conventions 기반 패키지 구조 생성
3. **Evaluate** — 검증 체크리스트 대조 (PASS/NEEDS_IMPROVEMENT/FAIL)
4. **사용자 확인** — 생성할 구조 미리보기
5. **Execute** — 디렉토리, Gradle, Application.kt 생성
6. **Verify** — 최종 트리 출력 및 개수 확인
