# Git Issue Master

GitHub 이슈 작업을 위해 git-issue-master 에이전트로 라우팅합니다.

## 사용법

```
/air-claudecode:git-issue-master <이슈 작업>
```

## 기능
- GitHub 이슈 CRUD (생성, 조회, 수정, 닫기)
- 레포지토리에서 레이블, 마일스톤, 담당자를 사전 조회
- 브랜치 이름에서 Jira 티켓을 자동 감지하여 연결
- AskUserQuestion을 통한 대화형 선택
- `gh` CLI 사용, 선택적으로 Atlassian MCP를 통한 Jira 연동
