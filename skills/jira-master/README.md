# Jira Master

Jira 티켓 작업을 위해 jira-master 에이전트로 라우팅합니다.

## 사용법

```
/air-claudecode:jira-master <jira 작업>
```

## 기능
- Jira 티켓 CRUD (생성, 조회, 수정, 삭제)
- Jira에서 사용 가능한 프로젝트, 이슈 유형, 우선순위를 사전 조회
- AskUserQuestion을 통한 대화형 선택
- Atlassian MCP 도구 (`mcp__mcp-atlassian__jira_*`) 사용
- 모든 쓰기 작업 전 사용자 확인 필요
